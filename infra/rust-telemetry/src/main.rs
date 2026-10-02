//! FindMedi High-Performance Rust UDP Telemetry Daemon
//! GPS pings + clinical vitals frames → H3 binning → Redis live state.
//! Contract mirrors backend/src/lib/h3Cache.js keys so Node and Rust
//! converge: `geo:h3:<res>:<cell>:<vertical>` SET + `provider:location:<key>`.

mod crypto;
mod dicom_strip;

use h3o::{LatLng, Resolution};
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::UdpSocket;
use tokio::sync::Mutex;
use tracing::{error, info, warn};

#[derive(Debug, Deserialize, Serialize)]
pub struct TelemetryPacket {
    pub provider_id: String,
    pub vertical: String,
    pub lat: f64,
    pub lng: f64,
    #[serde(default)]
    pub bearing: f32,
    #[serde(default)]
    pub speed_kmh: f32,
    #[serde(default)]
    pub timestamp_ms: u64,
    // Clinical vitals (wearable/ICU frames; None for pure GPS pings)
    #[serde(default)]
    pub hr: Option<f64>,
    #[serde(default)]
    pub spo2: Option<f64>,
    #[serde(default)]
    pub temp_c: Option<f64>,
    #[serde(default)]
    pub motion_mag: Option<f64>,
}

fn resolution_for(vertical: &str) -> (Resolution, u8) {
    match vertical {
        "ambulance" | "sos" => (Resolution::Six, 6),
        "rider" => (Resolution::Eight, 8),
        _ => (Resolution::Seven, 7),
    }
}

fn cell_for(lat: f64, lng: f64, res: Resolution) -> Option<String> {
    LatLng::new(lat, lng).ok().map(|ll| ll.to_cell(res).to_string())
}

async fn process_telemetry(
    telemetry: TelemetryPacket,
    _src: SocketAddr,
    redis: &Arc<Mutex<redis::aio::MultiplexedConnection>>,
) {
    let (res, res_n) = resolution_for(&telemetry.vertical);
    let Some(cell) = cell_for(telemetry.lat, telemetry.lng, res) else {
        warn!("bad coords from {}", telemetry.provider_id);
        return;
    };
    let key = format!("{}:{}", telemetry.provider_id, telemetry.vertical);
    let hex_key = format!("geo:h3:{res_n}:{cell}:{}", telemetry.vertical);
    let loc_key = format!("provider:location:{key}");
    let loc = serde_json::json!({
        "lat": telemetry.lat, "lng": telemetry.lng,
        "bearing": telemetry.bearing, "speed": telemetry.speed_kmh,
        "resolution": res_n, "h3Cell": cell,
        "providerType": telemetry.vertical, "providerId": telemetry.provider_id,
        "hr": telemetry.hr, "spo2": telemetry.spo2, "tempC": telemetry.temp_c,
        "updatedAt": chrono_now_ms(),
    });
    let body = loc.to_string();
    // Backpressure: Redis write has a 200ms deadline; on timeout the packet
    // is dropped (next ping supersedes) rather than queueing unboundedly.
    let work = async {
        let mut conn = redis.lock().await;
        let _: () = conn.sadd(&hex_key, &key).await?;
        let _: () = conn.expire(&hex_key, 240).await?;
        let _: () = conn.set_ex(&loc_key, body, 120).await?;
        Ok::<(), redis::RedisError>(())
    };
    match tokio::time::timeout(std::time::Duration::from_millis(200), work).await {
        Ok(Ok(())) => {}
        Ok(Err(e)) => warn!("redis write failed: {e}"),
        Err(_) => warn!("redis write deadline exceeded; packet dropped"),
    }
    // Kafka handoff: the Node outbox/consumer owns broker writes; the daemon
    // stays a Redis hot-path writer (<5MB RAM, 50k conns target). High-volume
    // Kafka fan-out runs via data-platform/flink jobs on telemetry topics.
    tracing::debug!(
        "telemetry {} ({}): cell {cell} vitals hr={:?} spo2={:?}",
        telemetry.provider_id,
        telemetry.vertical,
        telemetry.hr,
        telemetry.spo2
    );
}

fn chrono_now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    info!("Starting FindMedi High-Performance UDP Telemetry Daemon...");

    let redis_url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into());
    let client = redis::Client::open(redis_url)?;
    let conn = client.get_multiplexed_async_connection().await?;
    let shared = Arc::new(Mutex::new(conn));

    let listen_addr = "0.0.0.0:8099";
    let socket = UdpSocket::bind(listen_addr).await?;
    info!("Listening on UDP: {}", listen_addr);

    let mut buf = [0u8; 2048];
    loop {
        match socket.recv_from(&mut buf).await {
            Ok((len, src)) => {
                let slice = &buf[..len];
                if let Ok(telemetry) = serde_json::from_slice::<TelemetryPacket>(slice) {
                    let shared = shared.clone();
                    tokio::spawn(async move {
                        process_telemetry(telemetry, src, &shared).await;
                    });
                }
            }
            Err(e) => {
                error!("UDP socket receive error: {}", e);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn resolution_map_matches_node() {
        assert_eq!(resolution_for("rider").1, 8);
        assert_eq!(resolution_for("lawyer").1, 7);
        assert_eq!(resolution_for("ambulance").1, 6);
    }
    #[test]
    fn h3_cell_stable() {
        let a = cell_for(28.61, 77.2, Resolution::Eight).unwrap();
        let b = cell_for(28.61, 77.2, Resolution::Eight).unwrap();
        assert_eq!(a, b);
    }
    #[test]
    fn vitals_packet_parses() {
        let p: TelemetryPacket = serde_json::from_str(
            r#"{"provider_id":"x","vertical":"assistant","lat":28.6,"lng":77.2,"hr":98.0,"spo2":97.0}"#,
        )
        .unwrap();
        assert_eq!(p.hr, Some(98.0));
    }
}
