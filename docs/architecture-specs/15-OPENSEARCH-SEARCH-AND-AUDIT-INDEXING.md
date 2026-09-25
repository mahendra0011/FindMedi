# 15 - OpenSearch Distributed Search & Audit Indexing Specification

## 1. Architectural Distinction: OpenSearch vs. MongoDB vs. Pinot
- **MongoDB**: Authoritative transactional system of record. Not optimized for multi-field typo-tolerant fuzzy text search.
- **Apache Pinot**: Real-time OLAP for numerical aggregations (rates, averages, sums, counts per minute). Not designed for full-text inverted index searches.
- **OpenSearch**: Distributed JSON search engine used for fuzzy text queries, autocomplete, compliance audit trail search, and cross-vertical provider search.

---

## 2. Ingestion Architecture

```
  MongoDB (Primary) ──► Outbox / Kafka ──► OpenSearch Indexer Worker ──► OpenSearch Cluster
```
The indexing pipeline runs asynchronously via Kafka consumers. MongoDB writes are never blocked by OpenSearch indexing latency.

---

## 3. Core OpenSearch Indices & Mappings

### Index 1: `findmedi_providers_v1`
Used for customer search across Doctors, Lawyers, Nurses, and Drivers.
```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        "autocomplete_analyzer": {
          "type": "custom",
          "tokenizer": "edge_ngram_tokenizer",
          "filter": ["lowercase", "asciifolding"]
        }
      },
      "tokenizer": {
        "edge_ngram_tokenizer": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 15,
          "token_chars": ["letter", "digit"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "providerId": { "type": "keyword" },
      "vertical": { "type": "keyword" },
      "fullName": { 
        "type": "text", 
        "analyzer": "autocomplete_analyzer", 
        "search_analyzer": "standard" 
      },
      "specialization": { "type": "keyword" },
      "qualifications": { "type": "text" },
      "city": { "type": "keyword" },
      "rating": { "type": "float" },
      "isVerified": { "type": "boolean" },
      "geoPoint": { "type": "geo_point" },
      "h3_res7": { "type": "keyword" }
    }
  }
}
```

### Index 2: `findmedi_audit_logs_v1`
Stores immutable, searchable forensic records for legal compliance (Bar Council, Medical Council, Police inquiries).
```json
{
  "mappings": {
    "properties": {
      "logId": { "type": "keyword" },
      "traceId": { "type": "keyword" },
      "actorId": { "type": "keyword" },
      "actorRole": { "type": "keyword" },
      "action": { "type": "keyword" },
      "resourceType": { "type": "keyword" },
      "resourceId": { "type": "keyword" },
      "ipAddress": { "type": "ip" },
      "details": { "type": "text" },
      "timestamp": { "type": "date" }
    }
  }
}
```

---

## 4. Multi-Faceted Fuzzy Search Query Example
Search for an on-duty emergency doctor or lawyer with typo tolerance:
```json
POST /findmedi_providers_v1/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "carrdiologist noida",
            "fields": ["fullName^2", "specialization^3", "qualifications"],
            "fuzziness": "AUTO"
          }
        }
      ],
      "filter": [
        { "term": { "isVerified": true } },
        { "term": { "vertical": "doctor" } },
        {
          "geo_distance": {
            "distance": "15km",
            "geoPoint": {
              "lat": 28.5355,
              "lon": 77.3910
            }
          }
        }
      ]
    }
  }
}
```
OpenSearch returns results with exact scoring within $10\text{ ms}$.
