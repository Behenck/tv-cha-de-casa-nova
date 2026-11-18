#!/usr/bin/env sh
# Gera o cartaz A4 em PDF a partir do servidor rodando. Uso: scripts/cartaz-pdf.sh [url-base] [saida.pdf]
BASE=${1:-http://localhost:3000}
SAIDA=${2:-cartaz.pdf}
CHROME=$(command -v chromium || command -v chromium-browser || command -v google-chrome-stable || command -v google-chrome)
[ -z "$CHROME" ] && { echo "Instale Chromium/Chrome, ou abra $BASE/cartaz e use Imprimir → Salvar como PDF."; exit 1; }
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --run-all-compositor-stages-before-draw \
  --virtual-time-budget=8000 --print-to-pdf="$SAIDA" "$BASE/cartaz" 2>/dev/null
echo "PDF salvo em $SAIDA"
