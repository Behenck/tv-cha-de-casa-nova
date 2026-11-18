// Dia do evento (21 ou 22) a partir do momento em que a foto foi recebida.
// Antes do dia 22 (inclusive testes antes da festa) conta como 21; do dia 22 em diante, 22.
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD

export function diaDoEvento(momento = new Date()) {
  return fmt.format(momento) >= '2026-11-22' ? 22 : 21;
}

// Configuração `dia_exibido` → dias que o telão mostra.
export function diasVisiveis(diaExibido, agora = new Date()) {
  if (diaExibido === 'ambos') return [21, 22];
  if (diaExibido === '21' || diaExibido === '22') return [Number(diaExibido)];
  return [diaDoEvento(agora)];
}
