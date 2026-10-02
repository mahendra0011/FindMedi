# ==============================================================================
# DP-B-01 / DP-B-02: DATA-PLATFORM HARDENING
# ==============================================================================
# Certs for OpenSearch and Kafka keystores are operator-provided and mounted
# read-only. Nothing in this directory may be committed.
#
# OpenSearch  (generate once, then keep in the secret store):
#   openssl req -x509 -newkey rsa:2048 -days 3650 -nodes \
#     -keyout node-0-key.pem -out node-0.pem -subj "/CN=findmedi-node1"
#   cp node-0-key.pem root-ca-key.pem   # trust root for inter-node transport TLS
#
# Kafka:
#   keytool -keystore kafka.keystore.jks -alias findmedi -validity 3650 \
#     -genkey -storepass "$KAFKA_KEYSTORE_PASSWORD" -keypass "$KAFKA_KEY_PASSWORD"
#   keytool -keystore kafka.truststore.jks -alias CARoot -import -file root-ca.pem \
#     -storepass "$KAFKA_TRUSTSTORE_PASSWORD"
#
# The application only needs OPENSEARCH_USERNAME / OPENSEARCH_PASSWORD (the
# `findmedi_api` internal user) and KAFKA_SASL_USERNAME / KAFKA_SASL_PASSWORD.
# It never needs the admin credentials — those are for provisioning only.
# ==============================================================================
