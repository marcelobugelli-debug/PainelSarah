# Mural Orquestra AI

Mural de fotos interativo para o stand: o telão mostra as fotos e um QR Code; o visitante escaneia, tira uma selfie com a moldura laranja da Orquestra AI e a foto aparece no telão na hora.

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

Para ter HTTPS (e funcionar também no 4G dos visitantes, fora do Wi-Fi do stand), use um túnel, por exemplo:

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

- Telão: https://SEU-IP.sslip.io/telao
- Celular (QR Code): https://SEU-IP.sslip.io/foto
- Moderação: https://SEU-IP.sslip.io/admin

O endereço `sslip.io` aponta para o IP da droplet e permite HTTPS grátis (certificado automático do Caddy).

Na droplet:
- Site em `/opt/orquestra-mural` (fotos em `/opt/orquestra-mural/data`), serviço `orquestra-mural` (systemd).
- Configuração e senha de moderação em `/etc/orquestra-mural.env`. Para ver a senha:
  `ssh root@SEU_IP "grep ADMIN_KEY /etc/orquestra-mural.env"`
  Para trocar: edite o arquivo e rode `systemctl restart orquestra-mural`.
- HTTPS pelo Caddy em `/etc/caddy/Caddyfile`.
- Logs: `journalctl -u orquestra-mural -f`

Para publicar alterações feitas aqui: `SERVER=root@SEU_IP ./deploy.sh`
