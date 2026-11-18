# Research: Telão de Fotos

Pesquisa feita em 2026-11-18 nas fontes oficiais (código-fonte do Evolution 2.3.7, docs da Meta v27.0, docs da API da Claude).

## WhatsApp — Evolution API v2.3.7 (Baileys)

- **Decisão**: reutilizar a instância **`Denilson`**, já pareada e `open` no Evolution local (porta 8081 no host, `evolution-api:8080` na rede do compose). O app só grava o webhook dela (`POST /webhook/set/Denilson`, corpo aninhado `{webhook:{enabled,url,byEvents:false,base64:true,events:["MESSAGES_UPSERT"]}}`) e o regrava a cada boot, porque o Evolution pode perdê-lo ao reiniciar (issue #2694).
- **Motivo**: a imagem oficial 2.3.7 (e a 2.4.0-rc2) **não consegue parear aparelhos novos** desde ~28/07/2026 (WhatsApp mudou o fluxo de pareamento; correção nos PRs #2727/#2759, abertos e não mesclados). Uma sessão já pareada continua funcionando. **Não desconecte a instância Denilson antes da festa.**
- **Payload**: `event: "messages.upsert"`, `data` é objeto único; foto em `data.message.imageMessage` (legenda `caption`, `mimetype`); base64 cru em `data.message.base64` quando o webhook tem `base64: true`. Se o download falhar, o webhook chega sem base64 → fallback `POST /chat/getBase64FromMediaMessage/{inst}` com `{message: data}`.
- **Filtros**: `key.fromMe` (mensagens enviadas pelo próprio celular também chegam), grupos `@g.us`, `status@broadcast`. Conversas diretas: `@s.whatsapp.net` ou `@lid`.
- **Álbuns**: não confirmado; o parser aceita também `associatedChildMessage.message.imageMessage`. Validar mandando um álbum de teste.
- **Resposta**: `POST /message/sendText/{inst}` com `{number: remoteJid, text}`. Issues #2626/#2629 relatam envio a `@s.whatsapp.net` preso em `PENDING` em contas migradas para LID; as respostas são cortesia, o telão não depende delas.
- **Risco conhecido**: issues #2647/#2778 relatam instâncias `open` que param de emitir `MESSAGES_UPSERT` até reiniciar o contêiner. Mitigação: o painel mostra o estado da conexão; se as fotos pararem de chegar, `docker compose restart evolution-api`.
- **Alternativas**: WhatsApp Cloud API oficial (exige número verificado e app aprovado, inviável em 3 dias); construir a imagem a partir do PR #2759 (código de terceiros não mesclado; só se precisar parear um número novo).

## Instagram

- **Decisão**: só **menções em story**, por **consulta periódica** (a cada 20 s) à API de conversas (`GET graph.instagram.com/v27.0/me/conversations` → mensagens), com app "Instagram Login" e token gerado no painel da Meta (válido por 60 dias, sem App Review para a própria conta).
- **Motivo**: todo webhook do Instagram para pessoas sem papel no app exige App Review e app publicado (docs de Webhooks e Messaging). Menção em legenda de post só chega por webhook; marcação em foto exige outro tipo de app (Facebook Login + Página). Hashtag exige App Review.
- **Limitações**: a conta precisa ser profissional (Business/Creator) com "Permitir acesso às mensagens" ligado; menções de contas privadas só chegam se houver relação de seguir; a Meta proíbe guardar a mídia, então o sistema guarda só a URL (vale até o story expirar, ~24 h). O nome exato do campo do story em `graph.instagram.com` **não está confirmado**: o código aceita `story.mention.link` e `attachments`. **Não testado com uma conta real.**
- **Alternativas**: webhooks (bloqueados sem review), hashtag (bloqueada sem review).

## Moderação — API da Claude

- **Decisão**: `@anthropic-ai/sdk`, `client.messages.parse` com imagem base64 + legenda, saída estruturada via `zodOutputFormat` (`{decisao: aprovar|reprovar|duvida, motivo, legenda_ok}`), modelo `claude-opus-5-5` com `effort: "low"`, timeout de 40 s e 1 nova tentativa.
- **Motivo**: uma chamada por foto, resposta validada por schema; `effort: low` deixa a decisão rápida. Modelo ajustável por `MODERACAO_MODEL` (ex.: `claude-haiku-5-5` para custo menor). Custo estimado: ~1.500 tokens de entrada por foto, ≈ US$ 0,01 por foto no Opus 5.5.
- **Segurança**: qualquer coisa que não seja `aprovar` explícito (dúvida, recusa, erro, timeout, falta de chave) vira `revisao` (princípio II). A legenda vai entre tags e o prompt de sistema diz para tratá-la como conteúdo, não como instrução.
- **Alternativas**: classificadores de nudez locais (não pegam gestos, texto ofensivo nem prints; adicionam dependência pesada).

## Telão

- **Decisão**: HTML/CSS/JS puro com Web Animations API; tempo real por Server-Sent Events.
- **Motivo**: sem build, roda em qualquer navegador de TV; `EventSource` reconecta sozinho; só `transform`/`opacity` animam (60 fps em hardware modesto). Validado com capturas reais em 1920×1080 das 5 cenas.

## Cartaz

- **Decisão**: página `/cartaz` com `@page A4`, convertida em PDF pelo Chromium headless (`scripts/cartaz-pdf.sh`) ou por Imprimir → Salvar como PDF.
- **Motivo**: o QR sempre reflete o número configurado no painel; zero dependência de biblioteca de PDF. Validado: gera 1 página A4.
