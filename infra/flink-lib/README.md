# Flink SQL connector jars (NOT committed — download on setup)

Flink 1.18 needs the Kafka SQL connector to read `findmedi.*` topics.
The jar is intentionally git-ignored (5 MB binary); fetch it once:

```powershell
New-Item -ItemType Directory -Path 'infra\flink-lib' -ErrorAction SilentlyContinue | Out-Null
Invoke-WebRequest `
  -Uri 'https://repo1.maven.org/maven2/org/apache/flink/flink-sql-connector-kafka/3.0.2-1.18/flink-sql-connector-kafka-3.0.2-1.18.jar' `
  -OutFile 'infra\flink-lib\flink-sql-connector-kafka-3.0.2-1.18.jar'
docker cp infra/flink-lib/flink-sql-connector-kafka-3.0.2-1.18.jar findmedi-flink-jobmanager:/opt/flink/lib/
docker cp infra/flink-lib/flink-sql-connector-kafka-3.0.2-1.18.jar findmedi-flink-taskmanager:/opt/flink/lib/
docker restart findmedi-flink-jobmanager findmedi-flink-taskmanager
```

Then submit the surge job:

```powershell
docker cp data-platform/flink/surge_live.sql findmedi-flink-jobmanager:/opt/surge_live.sql
docker exec -d findmedi-flink-jobmanager ./bin/sql-client.sh -f /opt/surge_live.sql
```
