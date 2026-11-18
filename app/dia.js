// Dia do mês (fuso de São Paulo) em que a foto foi recebida.
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', day: 'numeric' });

export function diaDoEvento(momento = new Date()) {
  return Number(fmt.format(momento));
}

// Configuração `dia_exibido` → dias que o telão mostra. 'auto' = dia de hoje.
export function diasVisiveis(diaExibido, agora = new Date()) {
  if (diaExibido === 'ambos') return [21, 22];
  if (diaExibido === '21' || diaExibido === '22') return [Number(diaExibido)];
  return [diaDoEvento(agora)];
}
