# Quickstart: subir e validar o telão

## 1. Configurar

```bash
cp .env.example .env
# edite: ADMIN_PASSWORD, ANTHROPIC_API_KEY, PUBLIC_URL (IP da máquina na rede da festa)
# WEBHOOK_SECRET vazio = WhatsApp desligado. Para ligar: WEBHOOK_SECRET=$(openssl rand -hex 16)
docker compose up -d --build app
```

- Telão: `http://<ip>:3000/tv` no navegador da TV → clique uma vez (ou tecla `f`) para tela cheia.
- Painel: `http://<ip>:3000/painel`.

## 2. Validar sem WhatsApp (5 min)

1. `node scripts/fotos-exemplo.js 18 21` (com `DATA_DIR` apontando para os dados do app, ou rode dentro do contêiner) → o telão alterna destaque, mural e polaroides.
2. Painel → "Configurações" → "QR code leva para: Página de envio". Leia o QR com o celular, mande uma foto → ela aparece na TV em segundos (com `ANTHROPIC_API_KEY`) ou em "Aguardando" no painel (sem a chave).
3. Mande um print de tela com rigor "Alto" → deve ir para "Reprovadas".
4. Painel → "Tirar da TV" em uma foto → some do telão em até 5 s.
5. `node scripts/fotos-exemplo.js limpar` antes da festa.

## 3. Ligar o WhatsApp (instância Denilson já pareada)

> A partir daqui, **toda foto enviada ao número da instância** passa pelo sistema, e quem mandar mensagem recebe as respostas automáticas. Se o número for pessoal, deixe "Recebimento: Pausado" fora da festa (pausado ignora tudo e não responde ninguém) ou apague o texto "mensagem sem foto".

1. `.env`: `WEBHOOK_SECRET=<aleatório>`, `EVOLUTION_INSTANCE=Denilson` → `docker compose up -d app`.
2. Log deve mostrar `WhatsApp: instância e webhook prontos.`; painel mostra "WhatsApp: conectado".
3. De outro celular, mande uma foto com legenda → aparece na TV com o primeiro nome e o recado; o remetente recebe "Recebemos sua foto!".
4. Mande um texto → recebe a orientação (no máximo 1 vez a cada 5 min).
5. Mande um álbum de 3 fotos → as 3 entram (confirma o formato de álbum, não verificado na pesquisa).
6. Painel → número do WhatsApp (55 + DDD + número) e "QR code leva para: WhatsApp".

## 4. Cartaz

`scripts/cartaz-pdf.sh http://localhost:3000 cartaz.pdf` → imprima em A4. Leia o QR impresso para conferir.

## 5. Instagram (opcional, não testado com conta real)

Conta profissional; app na Meta com "Instagram Login"; gere o token no painel da Meta → `INSTAGRAM_TOKEN` no `.env`. Teste: outra conta pública marca o @ num story com foto → em até ~30 s aparece no painel/TV. Se não aparecer, veja o erro no painel ("Instagram: erro …").

## Testes automáticos

`cd app && npm test` (9 testes: dia do evento, parser do webhook, regra de moderação, parser do Instagram).
