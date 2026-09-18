use napi_derive::napi;
use std::io::Cursor;
use std::time::Instant;

use image::imageops::FilterType;
use image::GenericImageView;

mod pdf_gen;

use pdf_gen::{PdfPage, PAGE_WIDTH, PAGE_HEIGHT, MARGIN};
use pdf_gen::{render_pdf, helvetica_text_width, C_PRIMARY, C_PRIMARY_DARK, C_BORDER, C_WHITE, C_SOFT};
use serde::Deserialize;

// ── Hello World (N-API exported) ──────────────────────────────────────────

#[napi]
pub fn hello() -> String {
  "Hello from Rust via napi-rs!".to_string()
}

#[napi]
pub fn add(a: i32, b: i32) -> i32 {
  a + b
}

// ── Benchmark harness ────────────────────────────────────────────────────

/// Run hello() `iterations` times and return the average nanoseconds per call.
#[napi]
pub fn benchmark_hello(iterations: u32) -> f64 {
  let start = Instant::now();
  let mut checksum: u64 = 0;
  for i in 0..iterations {
    let s = hello();
    std::hint::black_box(s);
    checksum = checksum.wrapping_add(i as u64);
  }
  let elapsed = start.elapsed().as_nanos() as f64;
  let _ = checksum; // prevent dead-code elimination
  elapsed / (iterations as f64)
}

/// Run add() `iterations` times and return average nanoseconds per call.
#[napi]
pub fn benchmark_add(iterations: u32) -> f64 {
  let start = Instant::now();
  let mut checksum: i64 = 0;
  for i in 0..iterations {
    let r = add(i as i32, 1);
    std::hint::black_box(r);
    checksum = checksum.wrapping_add(r as i64);
  }
  let elapsed = start.elapsed().as_nanos() as f64;
  let _ = checksum; // prevent dead-code elimination
  elapsed / (iterations as f64)
}

// ── Image processing (Phase 7 migration) ───────────────────────────────────

/// Magic byte signatures for content-based file type verification.
/// Mirrors the logic in server/middleware/upload.js validateFileContent().
const JPEG_SIG: &[u8] = &[0xff, 0xd8, 0xff];
const PNG_SIG: &[u8] = &[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF_SIG: &[u8] = &[0x47, 0x49, 0x46, 0x38];
const RIFF_SIG: &[u8] = &[0x52, 0x49, 0x46, 0x46];

/// Validate that a file's magic bytes match its claimed MIME type.
/// Returns false for SVG (no reliable magic bytes) or content mismatch.
#[napi]
pub fn validate_magic_bytes(buffer: &[u8], mimetype: String) -> bool {
  if buffer.len() < 4 {
    return false;
  }

  let match_sig = |sig: &[u8]| buffer.len() >= sig.len() && &buffer[..sig.len()] == sig;

    match mimetype.as_str() {
    "image/jpeg" => match_sig(JPEG_SIG),
    "image/png" => match_sig(PNG_SIG),
    "image/gif" => match_sig(GIF_SIG),
    "image/webp" => {
      // WebP: RIFF....WEBP (bytes 8-12 must be "WEBP")
      if buffer.len() >= 12 && match_sig(RIFF_SIG) {
        &buffer[8..12] == b"WEBP"
      } else {
        false
      }
    }
    "image/svg+xml" => false, // SVG is XML text — no reliable magic bytes
    _ => true, // Unknown type — allow (MIME filter already checked)
  }
}

pub const MIN_IMAGE_DIMENSION: u32 = 1;
pub const MAX_IMAGE_DIMENSION: u32 = 4096;

/// Resize an image to exact dimensions and re-encode as JPEG.
///
/// `quality` is 1-100 where higher is better (matches Sharp's quality scale).
/// Returns the JPEG-encoded buffer.
#[napi]
pub fn resize_image(
  input: &[u8],
  width: u32,
  height: u32,
  quality: u8,
) -> napi::Result<Vec<u8>> {
  if width < MIN_IMAGE_DIMENSION || width > MAX_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION {
    return Err(napi::Error::new(
      napi::Status::InvalidArg,
      format!(
        "Image dimensions must be between {} and {} pixels (received {}x{})",
        MIN_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, width, height
      ),
    ));
  }

  if quality < 1 || quality > 100 {
    return Err(napi::Error::new(
      napi::Status::InvalidArg,
      format!("Image quality must be between 1 and 100 (received {})", quality),
    ));
  }

  let img = image::load_from_memory(input)
    .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("Failed to decode image: {}", e)))?;

  let resized = img.resize_exact(width, height, FilterType::Triangle);

  // Convert to RGB8 for JPEG output (JPEG doesn't support alpha)
  let rgb = resized.to_rgb8();
  let (w, h) = rgb.dimensions();
  let mut buf: Vec<u8> = Vec::new();
  let mut cursor = Cursor::new(&mut buf);

  {
    use image::codecs::jpeg::JpegEncoder;
    use image::ImageEncoder;
    let encoder = JpegEncoder::new_with_quality(&mut cursor, quality);
    encoder
      .write_image(rgb.as_raw(), w, h, image::ExtendedColorType::Rgb8)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("Failed to encode JPEG: {}", e)))?;
  }

  Ok(buf)
}

/// Get image format and dimensions without decoding pixel data.
#[napi]
pub fn get_image_info(input: &[u8]) -> napi::Result<String> {
  let img = image::load_from_memory(input)
    .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("Failed to load image: {}", e)))?;

  let format = image::guess_format(input)
    .map(|f| format!("{:?}", f))
    .unwrap_or_else(|_| "unknown".to_string());

  let dims = img.dimensions();

  Ok(format!(
    "{{\"format\":\"{}\",\"width\":{},\"height\":{}}}",
    format, dims.0, dims.1
  ))
}

// ── PDF generation (Phase 7 migration) ────────────────────────────────────

fn money_str(val: f64) -> String {
  format!("Rs. {:.0}", val)
}

fn text_width_approx(s: &str, font_size: f32) -> f32 {
  // Uses exact Helvetica Adobe Font Metrics (AFM) character widths
  helvetica_text_width(s, font_size)
}

/// Generate a payment invoice PDF.
///
/// Expects a JSON string with invoice data. Returns the PDF as a byte vector.
#[napi]
pub fn generate_invoice_pdf(data_json: String) -> napi::Result<Vec<u8>> {
  #[derive(Deserialize)]
  struct LineItem {
    name: String,
    qty: u32,
    price: f64,
  }

  #[derive(Deserialize)]
  struct InvoiceData {
    patient_name: String,
    patient_phone: Option<String>,
    provider: Option<String>,
    service_type: Option<String>,
    amount: f64,
    invoice_id: Option<String>,
    transaction_id: Option<String>,
    line_items: Vec<LineItem>,
  }

  let mut inv: InvoiceData = serde_json::from_str(&data_json)
    .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("Invalid invoice JSON: {}", e)))?;

  // Cap free-text fields to prevent PDF layout overflow
  let truncate_str = |s: &str, max_len: usize| -> String {
    if s.chars().count() > max_len {
      s.chars().take(max_len).collect()
    } else {
      s.to_string()
    }
  };

  inv.patient_name = truncate_str(&inv.patient_name, 120);
  inv.patient_phone = inv.patient_phone.map(|p| truncate_str(&p, 30));
  inv.provider = inv.provider.map(|p| truncate_str(&p, 120));
  inv.service_type = inv.service_type.map(|s| truncate_str(&s, 120));
  inv.invoice_id = inv.invoice_id.map(|id| truncate_str(&id, 100));
  inv.transaction_id = inv.transaction_id.map(|tx| truncate_str(&tx, 100));

  // Cap line items to prevent unbounded memory growth / off-page drawing
  if inv.line_items.len() > 50 {
    inv.line_items.truncate(50);
  }
  for item in &mut inv.line_items {
    item.name = truncate_str(&item.name, 120);
  }

  let mut page = PdfPage::new(PAGE_WIDTH, PAGE_HEIGHT, MARGIN);

  // ── Header ──
  let left = MARGIN;
  let right = PAGE_WIDTH - MARGIN;
  let top = PAGE_HEIGHT - MARGIN;
  let width = right - left;

  page.rect_fill(left, top - 54.0, width, 54.0, C_PRIMARY.0, C_PRIMARY.1, C_PRIMARY.2);
  page.text(left + 22.0, top - 28.0, 0, 20.0, &inv.provider.as_deref().unwrap_or("FindMedi Hospital"));
  page.text(left + 22.0, top - 42.0, 0, 7.5, "Hospital Management System");

  // Document title on the right
  let title = "Payment Invoice";
  let title_w = text_width_approx(title, 15.0);
  page.text(right - 12.0 - title_w, top - 28.0, 1, 15.0, &title);

  let inv_id = inv.invoice_id.as_deref().unwrap_or("—");
  let id_w = text_width_approx(&format!("# {}", inv_id), 8.5);
  page.text(right - 12.0 - id_w, top - 42.0, 0, 8.5, &format!("# {}", inv_id));

  // ── Info Grid (two columns) ──
  let card_width = (width - 12.0) / 2.0;
  let gap = 12.0;
  let card_height = 96.0;
  let start_y = top - 80.0;

  // Bill To card
  let x1 = left;
  page.rect_fill(x1, start_y - card_height, card_width, card_height, C_WHITE.0, C_WHITE.1, C_WHITE.2);
  page.rect_stroke(x1, start_y - card_height, card_width, card_height, C_BORDER.0, C_BORDER.1, C_BORDER.2);
  page.text(x1 + 12.0, start_y - 20.0, 0, 10.0, "Bill To");
  page.text(x1 + 24.0, start_y - 38.0, 0, 8.0, &format!("Patient: {}", inv.patient_name));
  if let Some(ref phone) = inv.patient_phone {
    page.text(x1 + 24.0, start_y - 52.0, 0, 8.0, &format!("Phone: {}", phone));
  }

  // Provider card
  let x2 = x1 + card_width + gap;
  let provider_name = inv.provider.as_deref().unwrap_or("FindMedi Hospital");
  page.rect_fill(x2, start_y - card_height, card_width, card_height, C_WHITE.0, C_WHITE.1, C_WHITE.2);
  page.rect_stroke(x2, start_y - card_height, card_width, card_height, C_BORDER.0, C_BORDER.1, C_BORDER.2);
  page.text(x2 + 12.0, start_y - 20.0, 0, 10.0, "Provider");
  let prov_w = text_width_approx(&provider_name, 8.0);
  page.text(x2 + 24.0, start_y - 38.0, 0, 8.0, &provider_name);
  page.text(x2 + 24.0, start_y - 52.0, 0, 8.0, &format!("Txn ID: {}", inv.transaction_id.as_deref().unwrap_or("—")));

  // ── Items Table ──
  let tx = left;
  let ty = start_y - card_height - 24.0;
  let table_w = width;

  // Column widths (matching pdfService.js proportions)
  let col1_w = table_w * 0.50; // Item description
  let col2_w = table_w * 0.15; // Qty
  let col3_w = table_w * 0.17; // Price
  let col4_w = table_w * 0.18; // Total

  // Header row
  page.rect_fill(tx, ty, table_w, 24.0, C_PRIMARY_DARK.0, C_PRIMARY_DARK.1, C_PRIMARY_DARK.2);
  page.text(tx + 8.0, ty + 16.0, 1, 8.0, "Item Description");
  page.text(tx + col1_w + 8.0, ty + 16.0, 1, 8.0, "Qty");
  page.text(tx + col1_w + col2_w + 8.0, ty + 16.0, 1, 8.0, "Price");
  page.text(tx + col1_w + col2_w + col3_w + 8.0, ty + 16.0, 1, 8.0, "Total");

  let mut y = ty;
  let row_h = 22.0;

  for (i, item) in inv.line_items.iter().enumerate() {
    y -= row_h;

    // Alternating row background
    if i % 2 == 1 {
      page.rect_fill(tx, y, table_w, row_h, C_SOFT.0, C_SOFT.1, C_SOFT.2);
    }
    // Row border
    page.rect_stroke(tx, y, table_w, row_h, C_BORDER.0, C_BORDER.1, C_BORDER.2);

    page.text(tx + 8.0, y + 14.0, 0, 8.5, &item.name);
    page.text(tx + col1_w + 8.0, y + 14.0, 0, 8.5, &item.qty.to_string());
    page.text(tx + col1_w + col2_w + 8.0, y + 14.0, 0, 8.5, &money_str(item.price));
    let total = item.qty as f64 * item.price;
    page.text(tx + col1_w + col2_w + col3_w + 8.0, y + 14.0, 0, 8.5, &money_str(total));
  }

  // ── Totals Box ──
  let box_w = 220.0;
  let box_h = 80.0;
  let bx = right - box_w;
  let by = y - 16.0;

  page.rect_fill(bx, by, box_w, box_h, C_SOFT.0, C_SOFT.1, C_SOFT.2);
  page.rect_stroke(bx, by, box_w, box_h, C_BORDER.0, C_BORDER.1, C_BORDER.2);

  let subtotal: f64 = inv.line_items.iter().map(|i| i.qty as f64 * i.price).sum();

  page.text(bx + 14.0, by + 52.0, 0, 8.0, "Subtotal");
  page.text(bx + box_w - 14.0 - text_width_approx(&money_str(subtotal), 8.0), by + 52.0, 0, 8.0, &money_str(subtotal));

  page.text(bx + 14.0, by + 32.0, 1, 10.0, "Total");
  page.text(bx + box_w - 14.0 - text_width_approx(&money_str(inv.amount), 10.0), by + 32.0, 1, 10.0, &money_str(inv.amount));

  // ── Footer ──
  let fy = 36.0;
  page.line(left, fy + 20.0, right, fy + 20.0, C_BORDER.0, C_BORDER.1, C_BORDER.2, 0.5);
  page.text(left, fy, 0, 7.0, "Computer-generated document. Please contact FindMedi Hospital for corrections.");
  let page_label = "Page 1 of 1";
  page.text(right - text_width_approx(page_label, 7.0), fy, 0, 7.0, page_label);

  Ok(render_pdf(&page))
}

  // ── CSV import/export parsing (Phase 7 migration) ──────────────────────────

/// Parse a CSV string into a JSON array of objects.
/// Each row becomes a JSON object with keys from the first row (header).
/// Returns a JSON string to avoid serde_json serialization overhead on the FFI boundary.
#[napi]
pub fn parse_csv(input: String) -> napi::Result<String> {
  let mut reader = csv::Reader::from_reader(input.as_bytes());
  let headers = reader
    .headers()
    .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("CSV parse error: {}", e)))?
    .clone();

  let header_names: Vec<String> = headers.iter().map(|h| h.to_string()).collect();

  let mut rows = Vec::new();
  for result in reader.records() {
    let record = result
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("CSV record error: {}", e)))?;
    let mut obj = serde_json::Map::new();
    for (i, field) in record.iter().enumerate() {
      let key = header_names.get(i).map(|s| s.as_str()).unwrap_or("");
      obj.insert(key.to_string(), serde_json::Value::String(field.to_string()));
    }
    rows.push(serde_json::Value::Object(obj));
  }

  serde_json::to_string(&rows)
    .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("JSON serialize error: {}", e)))
}

/// Serialize an array of objects to a CSV string.
///
/// `rows_json` is a JSON string representing an array of objects.
/// `fields_json` is a JSON string representing an array of field names to use as columns.
/// Returns a CSV string with header row followed by data rows.
#[napi]
pub fn to_csv(rows_json: String, fields_json: String) -> napi::Result<String> {
  let rows: Vec<serde_json::Value> = serde_json::from_str(&rows_json)
    .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("Invalid rows JSON: {}", e)))?;
  let fields: Vec<String> = serde_json::from_str(&fields_json)
    .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("Invalid fields JSON: {}", e)))?;

  let mut buf: Vec<u8> = Vec::new();
  let mut writer = csv::WriterBuilder::new()
    .from_writer(&mut buf);

  // Write header
  writer.write_record(&fields)
    .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("CSV write error: {}", e)))?;

  // Write data rows
  for row in &rows {
    let vals: Vec<String> = fields.iter().map(|f| {
      match row.get(f) {
        Some(v) => match v {
          serde_json::Value::String(s) => s.clone(),
          serde_json::Value::Number(n) => n.to_string(),
          serde_json::Value::Bool(b) => b.to_string(),
          serde_json::Value::Null => String::new(),
          _ => v.to_string(),
        },
        None => String::new(),
      }
    }).collect();
    writer.write_record(&vals)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("CSV write error: {}", e)))?;
  }

  writer.into_inner()
    .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("CSV flush error: {}", e)))?;

  String::from_utf8(buf)
    .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("UTF-8 encode error: {}", e)))
}

// ── OTP/2FA hashing (Phase 7 migration) ─────────────────────────────────────

use sha2::{Sha256, Digest};
use rand::RngCore;

/// Constant-time byte slice comparison to prevent timing attacks.
///
/// Compares two byte slices in constant time by XORing all bytes and
/// checking the result. This prevents attackers from using timing
/// differences to discover valid OTP hashes.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
  if a.len() != b.len() {
    return false;
  }
  let mut result: u8 = 0;
  for (x, y) in a.iter().zip(b.iter()) {
    result |= x ^ y;
  }
  result == 0
}

/// Generate a cryptographically secure random salt and hash an OTP.
///
/// Returns a string in the format `salt_hex:hash_hex` where:
/// - `salt_hex` is a 16-byte random salt (hex-encoded, 32 chars)
/// - `hash_hex` is `SHA256(salt ++ otp)` (hex-encoded, 64 chars)
///
/// This replaces bcrypt for OTP storage — OTPs are short-lived (10 min)
/// and single-use, so SHA-256 with a random salt provides adequate security
/// while being ~100x faster than bcrypt for verification.
///
/// Mirrors `OTP.hashOTP()` in server/models/OTP.js.
#[napi]
pub fn hash_otp(otp: String) -> String {
  let mut salt = [0u8; 16];
  rand::thread_rng().fill_bytes(&mut salt);
  let mut hasher = Sha256::new();
  hasher.update(&salt);
  hasher.update(otp.as_bytes());
  let hash = hasher.finalize();

  format!(
    "{}:{}",
    hex_encode(&salt),
    hex_encode(&hash)
  )
}

/// Classification of stored OTP hash format.
#[napi(string_enum)]
#[derive(Debug, PartialEq, Eq)]
pub enum OtpHashKind {
  Sha256,
  Bcrypt,
  Unknown,
}

/// Classify a stored OTP hash format into Sha256, Bcrypt, or Unknown.
///
/// Bcrypt hashes start with $2a$, $2b$, or $2y$.
/// Sha256 hashes are formatted as `salt_hex:hash_hex` (32 hex chars + ':' + 64 hex chars).
#[napi]
pub fn classify_otp_hash(stored: String) -> OtpHashKind {
  if stored.starts_with("$2a$") || stored.starts_with("$2b$") || stored.starts_with("$2y$") {
    OtpHashKind::Bcrypt
  } else {
    let parts: Vec<&str> = stored.splitn(2, ':').collect();
    if parts.len() == 2 && parts[0].len() == 32 && parts[1].len() == 64 {
      OtpHashKind::Sha256
    } else {
      OtpHashKind::Unknown
    }
  }
}

/// Verify an OTP against a stored hash using constant-time comparison.
///
/// Supports two hash formats:
/// - New format: `salt_hex:hash_hex` (produced by `hash_otp`)
/// - Legacy bcrypt format: `$2a$...` or `$2b$...` (falls through to JS bcrypt)
///
/// Returns `false` for non-Sha256 hashes (caller should check classify_otp_hash and fall back to JS bcrypt).
/// Mirrors `OTP.compareOTP()` in server/models/OTP.js.
#[napi]
pub fn verify_otp_hash(otp: String, stored: String) -> bool {
  if classify_otp_hash(stored.clone()) != OtpHashKind::Sha256 {
    return false;
  }

  let parts: Vec<&str> = stored.splitn(2, ':').collect();
  if parts.len() != 2 {
    return false;
  }

  let salt = match hex_decode(parts[0]) {
    Some(s) => s,
    None => return false,
  };
  let expected_hash = match hex_decode(parts[1]) {
    Some(h) => h,
    None => return false,
  };

  // Recompute hash
  let mut hasher = Sha256::new();
  hasher.update(&salt);
  hasher.update(otp.as_bytes());
  let computed = hasher.finalize();

  // Constant-time comparison to prevent timing attacks
  constant_time_eq(&computed, &expected_hash)
}

/// Generic constant-time comparison of two strings.
///
/// Returns true if the strings are equal, using a constant-time algorithm
/// to prevent timing side-channel attacks.
#[napi]
pub fn constant_time_compare(a: String, b: String) -> bool {
  constant_time_eq(a.as_bytes(), b.as_bytes())
}

// ── Hex encoding/decoding helpers ────────────────────────────────────────

fn hex_encode(bytes: &[u8]) -> String {
  bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

fn hex_decode(s: &str) -> Option<Vec<u8>> {
  if s.len() % 2 != 0 {
    return None;
  }
  let mut result = Vec::with_capacity(s.len() / 2);
  let chars: Vec<char> = s.chars().collect();
  for i in (0..chars.len()).step_by(2) {
    let high = chars[i].to_digit(16)?;
    let low = chars[i + 1].to_digit(16)?;
    result.push((high * 16 + low) as u8);
  }
  Some(result)
}
