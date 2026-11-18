# Implementation Plan: Telão de Fotos do Chá de Casa Nova

**Branch**: `001-telao-fotos` | **Date**: 2026-11-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-telao-fotos/spec.md`

## Summary

Convidados mandam fotos pelo WhatsApp (e, se der tempo de liberar, marcando o @ no
Instagram). Um único serviço Node recebe o webhook, guarda a foto em disco, pede à Claude
(visão) um veredito de moderação e, se aprovada, empurra a foto por SSE para a página do
telão aberta na TV. A mesma aplicação serve o painel do anfitrião e o cartaz A4 com QR
code. Tudo sobe junto do Evolution API que já está no `docker-compose.yml`.

## Technical Context

**Language/Version**: JavaScript (ES modules) em Node.js 24+ (host tem 26); sem TypeScript, sem build.

**Primary Dependencies**: `@anthropic-ai/sdk` + `zod` (moderação com saída estruturada), `qrcode` (QR em SVG). Servidor HTTP, SSE, SQLite, fetch e testes são nativos do Node. Frontend em HTML/CSS/JS puro (Web Animations API), sem framework.

**Storage**: SQLite via `node:sqlite` (um arquivo) + fotos como arquivos em `data/fotos/`. Um volume Docker.

**Testing**: `node --test` para a lógica pura (dia do evento, parsing de webhook, decisão de moderação). Telas validadas rodando o sistema com fotos de exemplo.

**Target Platform**: Linux com Docker Compose; telão em qualquer navegador moderno (TV smart ou notebook via HDMI), 1920×1080.

**Project Type**: web-service único servindo três páginas estáticas (telão, painel, cartaz).

**Performance Goals**: foto na TV em ≤ 30 s após o envio (gargalo: chamada de moderação, ~3–8 s); animações a 60 fps em hardware de TV modesto (só `transform`/`opacity`).

**Constraints**: telão continua rodando sem rede (princípio I); falha de IA ⇒ fila manual, nunca aprovação (princípio II); segredos só em `.env`.

**Scale/Scope**: ~500 fotos/dia, 2 dias, 1 TV, 1 anfitrião no painel. 3 telas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano atende | Status |
|---|---|---|
| I. A festa não para | Telão mantém a lista de fotos em memória e reconecta o SSE sozinho (`EventSource` já faz retry); ao reconectar, ressincroniza a lista. Webhook grava a foto em disco **antes** de moderar; fotos `pendente` são reprocessadas no boot. Falha do Instagram/IA nunca afeta as rotas do telão. | ✅ |
| II. Nada vai para a TV sem moderação | Só `status = 'aprovada'` sai em `/api/fotos` e no SSE. Erro, timeout, recusa ou resposta inválida da IA ⇒ `revisao`. Remoção no painel emite evento SSE imediato. Arquivos de fotos não aprovadas só são servidos com sessão do painel. | ✅ |
| III. Simplicidade | 1 serviço, 3 dependências, sem build, sem ORM, sem framework. | ✅ |
| IV. Fidelidade ao convite | `public/tokens.css` com as variáveis extraídas do convite (cores, fontes, easing), importado pelas 3 telas; monograma e ramos reutilizados de `assets/`. | ✅ |
| V. Respeito aos convidados | Entrada é só "mandar foto no WhatsApp". O telão recebe apenas primeiro nome/@; o telefone fica só no banco. `.env` fora do git. | ✅ |

Reavaliação pós-design: sem violações; Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/001-telao-fotos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── ideias.md            # ideias extras fora do escopo desta versão
├── contracts/http.md
└── tasks.md
```

### Source Code (repository root)

```text
docker-compose.yml        # + serviço `app`
.env.example
app/
├── Dockerfile
├── package.json
├── server.js             # http nativo: rotas, SSE, estáticos, sessão do painel
├── db.js                 # node:sqlite: schema, consultas, configurações
├── dia.js                # momento → dia do evento (21 | 22)
├── ingest.js             # pipeline: salvar → moderar → decidir → avisar TV → responder
├── moderar.js            # chamada à Claude (visão + saída estruturada)
├── whatsapp.js           # Evolution API: instância, webhook, parsing, enviar texto, QR
├── instagram.js          # webhook Meta: verificação, parsing, busca da mídia
├── test.js               # node --test
└── public/
    ├── tokens.css        # design do convite
    ├── tv.html / tv.css / tv.js
    ├── painel.html
    ├── cartaz.html
    ├── enviar.html       # plano B: envio pelo navegador
    └── assets/           # logo.webp, branch_*.webp (do convite)
scripts/
├── cartaz-pdf.sh         # imprime /cartaz em PDF com Chromium headless
└── fotos-exemplo.js      # popula fotos de teste para validar o telão
```

**Structure Decision**: projeto único em `app/`. Um arquivo por responsabilidade externa
(WhatsApp, Instagram, IA), sem camadas `models/services/controllers` — não há volume de
código que justifique.

## Decisões de design

- **Tempo real**: Server-Sent Events (`GET /api/eventos`). Unidirecional, reconexão
  nativa, atravessa proxy. Eventos: `foto` (nova aprovada), `remover`, `config`.
- **Dia do evento**: função pura do momento de recebimento em `America/Sao_Paulo`:
  data ≥ 22/11 ⇒ 22, senão 21. Gravado na foto no recebimento.
- **Moderação**: uma chamada por foto com a imagem + legenda; saída estruturada
  `{decisao: aprovar|reprovar|duvida, motivo, legenda_ok}`. `duvida`, erro, recusa do
  modelo ou timeout ⇒ `revisao`. Rigor (`normal`/`alto`) muda só o texto do prompt.
- **Duplicatas**: `UNIQUE(canal, origem_id)` no banco; `INSERT OR IGNORE`.
- **Sessão do painel**: senha em `ADMIN_PASSWORD`; cookie `HttpOnly` com HMAC da senha.
- **Webhook**: URL com segredo (`/webhook/whatsapp?t=WEBHOOK_SECRET`); o do Instagram
  valida `X-Hub-Signature-256`.
- **Cartaz PDF**: página `/cartaz` com CSS `@page A4`; PDF gerado por
  `scripts/cartaz-pdf.sh` (Chromium headless) ou "Imprimir → Salvar como PDF". Assim o
  QR sempre reflete o número configurado.
- **Download do dia**: `zip` do sistema em stream (`zip -j -0 -`), instalado na imagem.
- **Plano B**: `/enviar` reduz a foto no celular (canvas, 1600 px JPEG) e envia direto; o painel escolhe se o QR aponta para o WhatsApp ou para essa página.
- **Telão**: máquina de cenas em JS puro — Boas-vindas → Destaque (Ken Burns + legenda)
  → Mural (colunas rolando em sentidos opostos) → Polaroides (parede com leve rotação) →
  volta; evento `foto` interrompe com a cena "Chegou foto nova". Fila de exibição
  intercalada por remetente. Cenas de conjunto mostram no máximo ~40 fotos por vez.

## Complexity Tracking

Sem violações.
