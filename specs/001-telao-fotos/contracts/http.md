# Contrato HTTP (app, porta 3000)

## Páginas

| Rota | Quem usa | Acesso |
|---|---|---|
| `GET /tv` | TV (tela cheia). `?cena=mural\|polaroides` começa por essa cena. Teclas: `→` pula, `f` tela cheia | público |
| `GET /painel` | anfitrião | senha |
| `GET /cartaz` | impressão A4 | público |
| `GET /enviar` | convidado (plano B sem WhatsApp) | público |
| `GET /qr.svg` | QR para o destino configurado (`wa.me/<número>` ou `/enviar`) | público |

## Telão

- `GET /api/fotos` → `{ config: {segundos, rotulo, como, qr, whatsapp, instagram}, fotos: [FotoPublica] }`, só `aprovada` dos dias visíveis, em ordem de chegada.
- `FotoPublica` = `{id, url, remetente, legenda, canal, dia}`. Nunca contém o contato.
- `GET /api/eventos` (SSE): `foto` (FotoPublica nova aprovada), `remover` (`{id}`), `config` (`{}`), `painel` (`{}`, só para o painel atualizar).
- `GET /fotos/<arquivo>`: imagem; 404 se não aprovada e sem sessão do painel.

## Entrada

- `POST /webhook/whatsapp?t=<WEBHOOK_SECRET>`: payload do Evolution (`messages.upsert`). 401 sem o segredo. Responde 200 na hora e processa depois.
- `POST /api/enviar?nome=&legenda=`: corpo é a imagem (`image/jpeg|png|webp`, ≤ 8 MB) → `{status}` ∈ `aprovada | revisao | reprovada | pausado`; 415 para outro formato.

## Painel (cookie `s`, obtido em `POST /api/login {senha}`)

- `GET /api/admin/estado` → `{config, whatsapp: open|connecting|close|indisponivel, instagram, telas, fotos: [FotoPublica + status, motivo, recebida_em]}`
- `GET /api/admin/whatsapp/qr` → `{qr: dataURL|null, estado}`
- `POST /api/admin/config {chave: valor}` → 400 com `rejeitadas` se algum valor for inválido (ver `data-model.md` → Configuração)
- `POST /api/admin/fotos/:id/aprovar|remover`
- `GET /api/admin/zip?dia=21|22` → ZIP das fotos aprovadas guardadas do dia
