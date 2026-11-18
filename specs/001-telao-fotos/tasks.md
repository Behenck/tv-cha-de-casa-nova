---
description: "Tarefas do Telão de Fotos"
---

# Tasks: Telão de Fotos do Chá de Casa Nova

**Input**: `specs/001-telao-fotos/` — plan.md, spec.md, data-model.md, contracts/http.md, research.md
**Tests**: só lógica pura (`app/test.js`, `node --test`); telas validadas com capturas reais (quickstart.md).

## Phase 1: Setup

- [x] T001 Criar `app/package.json` (ESM, scripts start/dev/test) e instalar `@anthropic-ai/sdk`, `zod`, `qrcode`
- [x] T002 [P] Copiar monograma e ramos do convite para `app/public/assets/`
- [x] T003 [P] Tokens de design do convite (cores, fontes, easing, `.btn`, `.eyebrow`, `.script`) em `app/public/tokens.css`
- [x] T004 [P] `.env.example`, `.gitignore`, `app/Dockerfile`, `app/.dockerignore`

## Phase 2: Foundational

- [x] T005 Schema SQLite e consultas em `app/db.js` (data-model.md: `Foto.*`, `Configuração.*`, com validação de cada chave)
- [x] T006 [P] Dia do evento e dias visíveis em `app/dia.js` (data-model.md: `Foto.dia`, `Configuração.dia_exibido`)
- [x] T007 Moderação com saída estruturada em `app/moderar.js` (falha ⇒ `revisao`, data-model.md: `Foto.status`, `Foto.motivo`)
- [x] T008 Pipeline salvar → moderar → decidir → SSE → responder, retomada de `pendente` no boot, em `app/ingest.js`
- [x] T009 Servidor HTTP nativo, estáticos, SSE, sessão do painel em `app/server.js`

## Phase 3: US1 — Foto pelo WhatsApp aparece na TV (P1) 🎯 MVP

- [x] T010 [US1] Cliente Evolution (instância, webhook, estado, QR, enviar texto, baixar mídia) e parser do webhook em `app/whatsapp.js`
- [x] T011 [US1] `POST /webhook/whatsapp` com segredo, orientação a mensagens sem foto (1×/5 min), respeito ao "pausado", em `app/server.js`
- [x] T012 [P] [US1] Testes do parser (foto, álbum, grupo, fromMe, @lid) e da regra de moderação em `app/test.js`
- [ ] T013 [US1] Validação real: gravar `WEBHOOK_SECRET` no `.env` e ligar à instância `Denilson` (decisão do anfitrião: o número recebe e responde tudo) — quickstart §3
- [ ] T014 [US1] Validação real: enviar álbum de 3 fotos e confirmar as 3 no telão (formato de álbum não confirmado)
- [ ] T015 [US1] Validação real: moderação com `ANTHROPIC_API_KEY` (foto comum aprova; print com rigor alto reprova)

## Phase 4: US2 — Telão animado por dia (P1)

- [x] T016 [US2] Layout da TV e barra fixa com QR em `app/public/tv.html` e `app/public/tv.css`
- [x] T017 [US2] Cenas boas-vindas, destaque (Ken Burns + recado), mural, polaroides e "chegou foto nova"; fila intercalada por remetente; reconexão SSE e ressincronização em `app/public/tv.js`
- [x] T018 [US2] `scripts/fotos-exemplo.js` para popular e limpar fotos de teste
- [x] T019 [US2] Capturas 1920×1080 de todas as cenas; correções: selo sob polaroides, barra quebrando linha

## Phase 5: US3 — Painel do anfitrião (P2)

- [x] T020 [US3] Login, estado dos canais, QR de pareamento, configurações, fotos por dia/situação, aprovar/remover, ZIP do dia em `app/public/painel.html` e rotas `/api/admin/*`
- [x] T021 [US3] Validação: sem login 401, foto em revisão inacessível publicamente, aprovar a coloca na TV, remover tira, valores inválidos rejeitados, ZIP com 13 arquivos

## Phase 6: US4 — Cartaz A4 (P2)

- [x] T022 [US4] `app/public/cartaz.html` (A4, QR, 3 passos, @ do Instagram opcional) e `scripts/cartaz-pdf.sh`
- [x] T023 [US4] Validação: PDF de 1 página A4
- [ ] T024 [US4] Imprimir e ler o QR impresso a 1 m (SC-007)

## Phase 7: US5 — Instagram (P3)

- [x] T025 [US5] Consulta periódica de menções em story em `app/instagram.js` (guarda só a URL)
- [ ] T026 [US5] Criar app "Instagram Login" na Meta, gerar token, testar com outra conta; ajustar `urlDaMidia` ao formato real

## Phase 8: Polish

- [x] T027 Plano B `/enviar` (redução da foto no celular) e opção "QR code leva para" no painel
- [x] T028 Serviço `app` no `docker-compose.yml`; imagem construída e testes passando dentro do contêiner
- [ ] T029 Antes da festa: `node scripts/fotos-exemplo.js limpar`, conferir dia "Automático", testar TV real por 30 min

## Dependências

Setup → Foundational → US1 e US2 (paralelas) → US3 → US4 → US5. US2, US3 e US4 funcionam sem US1 (plano B `/enviar`).
