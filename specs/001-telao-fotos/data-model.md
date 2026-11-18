# Data Model: Telão de Fotos

SQLite, um arquivo (`data/telao.db`). Duas tabelas.

## Foto (`fotos`)

| Campo | Tipo | Regras |
|---|---|---|
| `id` | INTEGER PK | autoincremento |
| `canal` | TEXT | `whatsapp` \| `instagram` \| `web` — obrigatório |
| `origem_id` | TEXT | id da mensagem/mídia no canal — obrigatório; `UNIQUE(canal, origem_id)` |
| `remetente` | TEXT | nome de exibição (primeiro nome ou `@usuario`), máx. 40 caracteres; padrão `Convidado` |
| `contato` | TEXT | JID/ID para responder; nunca enviado ao telão; pode ser nulo |
| `legenda` | TEXT | recadinho, máx. 200 caracteres; nulo se ausente ou reprovado pela moderação |
| `arquivo` | TEXT | nome do arquivo em `data/fotos/`, ou URL `https://` (Instagram: a mídia não pode ser guardada) — obrigatório |
| `recebida_em` | TEXT | ISO 8601 UTC — obrigatório |
| `dia` | INTEGER | `21` \| `22` — obrigatório; derivado de `recebida_em` |
| `status` | TEXT | `pendente` \| `aprovada` \| `revisao` \| `reprovada` \| `removida` |
| `motivo` | TEXT | explicação curta da decisão (IA ou `manual`) |

### Transições de `status`

```text
pendente ──IA aprova──▶ aprovada ──anfitrião remove──▶ removida
    │                       ▲                              │
    ├──IA reprova──▶ reprovada ──anfitrião aprova──────────┤
    └──IA falha/dúvida──▶ revisao ──anfitrião aprova──▶ aprovada
                                 └──anfitrião remove──▶ removida
```

- Só `aprovada` é visível para o telão.
- `pendente` encontrado no boot é reprocessado (servidor caiu no meio da moderação).
- Decisão manual sempre prevalece e grava `motivo = 'manual'`.

## Configuração (`config`)

Chave/valor (`chave TEXT PK`, `valor TEXT`). Chaves e padrões:

| Chave | Padrão | Valores |
|---|---|---|
| `dia_exibido` | `auto` | `auto` \| `21` \| `22` \| `ambos` |
| `segundos_por_foto` | `7` | inteiro 3–30 |
| `rigor` | `normal` | `normal` \| `alto` |
| `pausado` | `0` | `0` \| `1` (pausado: ignora mensagens e não responde) |
| `qr_destino` | `whatsapp` | `whatsapp` \| `web` (para onde o QR code aponta) |
| `whatsapp_numero` | `` | só dígitos com DDI (ex.: `5555999999999`) |
| `instagram_usuario` | `` | sem `@`; vazio = canal oculto no telão e no cartaz |
| `msg_aprovada` | "Recebemos sua foto! Olha pra TV 👀" | texto |
| `msg_reprovada` | "Essa não vai dar pra mostrar na TV 😅 Manda outra?" | texto |
| `msg_ajuda` | "Manda uma foto aqui que ela aparece na TV da festa 📸" | texto |
