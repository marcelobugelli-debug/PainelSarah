#!/usr/bin/env bash
# Envia a versão atual do site para a droplet e reinicia o serviço.
set -euo pipefail
SERVER=${SERVER:?Defina SERVER=root@SEU_IP}
cd "$(dirname "$0")"
COPYFILE_DISABLE=1 tar czf - --no-xattrs server.js package.json README.md public 2>/dev/null \
  | ssh "$SERVER" 'tar xzf - -C /opt/orquestra-mural 2>/dev/null && chown -R mural:mural /opt/orquestra-mural && systemctl restart orquestra-mural && systemctl is-active orquestra-mural'
IP=${SERVER#*@}
echo "Publicado em https://${IP//./-}.sslip.io/telao"
