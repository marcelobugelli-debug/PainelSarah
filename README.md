# PainelSarah — Mural de fotos

Mural de fotos interativo: o telão mostra as fotos e um QR Code; o convidado escaneia, tira uma selfie com a moldura e a foto aparece no telão na hora.

## Personalizar (nome, textos e cores)

Tudo fica em `public/config.js`. Edite esse arquivo para trocar o tema; não precisa mexer nos outros.

## Como rodar

Precisa só do Node 18+ (sem `npm install`).

```bash
node server.js
```

- **Telão** (abra no computador ligado ao projetor): http://localhost:3000/telao — aperte **F** para tela cheia.
- **Celular**: o endereço aparece no terminal e no QR Code do telão (`/foto`).

As fotos ficam salvas em `data/photos/`.

## Câmera ao vivo precisa de HTTPS

Celulares só liberam a câmera ao vivo (prévia com a moldura e contagem 3-2-1) em sites HTTPS.
Sem HTTPS a página continua funcionando: ela abre a câmera do próprio celular e aplica a moldura depois.

Para ter HTTPS (e funcionar também no 4G dos visitantes, fora do Wi-Fi do local), use um túnel, por exemplo:

```bash
cloudflared tunnel --url http://localhost:3000
```

Depois rode o servidor com o endereço gerado, para o QR Code apontar para ele:

```bash
PUBLIC_URL=https://seu-endereco.trycloudflare.com node server.js
```

## Moderação (remover fotos)

Abra `/admin`, entre com a senha (`ADMIN_KEY`) e clique na lixeira da foto. Ela some do telão na hora.
Para testar localmente: `ADMIN_KEY=minhasenha node server.js`.

## Publicado na DigitalOcean

- Telão: https://178-128-75-74.sslip.io/telao
- Celular (QR Code): https://178-128-75-74.sslip.io/foto
- Moderação: https://178-128-75-74.sslip.io/admin

Na droplet (`servidor-marcelo`):

- Código em `/opt/painelsarah` (fotos em `/opt/painelsarah/data`), serviço `painelsarah` (systemd).
- Configuração e senha de moderação em `/etc/painelsarah.env` (ver: `grep ADMIN_KEY /etc/painelsarah.env`).
- HTTPS pelo Caddy em `/etc/caddy/Caddyfile`.
- Logs: `journalctl -u painelsarah -f`

Para publicar alterações enviadas ao GitHub, no Web Console da droplet:

```
cd /opt/painelsarah && sudo -u mural git pull && systemctl restart painelsarah
```
