#!/usr/bin/env bash
set -euo pipefail

BUCKET="cruz-azul-eva4-daniel-590184110257"
FECHA="$(date -u +%Y%m%dT%H%M%SZ)"
CARPETA="/srv/cruz_azul-erp/backups"
ARCHIVO="cruzazul_${FECHA}.dump"

mkdir -p "$CARPETA"

sudo docker exec cruz_azul_postgres \
  pg_dump -U postgres -d cruzazul -Fc > "$CARPETA/$ARCHIVO"

aws s3 cp "$CARPETA/$ARCHIVO" \
  "s3://${BUCKET}/backups/${ARCHIVO}" \
  --region us-east-1 \
  --acl bucket-owner-full-control

echo "Backup subido correctamente: s3://${BUCKET}/backups/${ARCHIVO}"
