import { writeFile, readFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { FOTOS, config, criarFoto, decidir, pendentes } from './db.js';
import { diaDoEvento, diasVisiveis } from './dia.js';
import { moderar } from './moderar.js';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

// ---------- eventos para o telão (SSE) ----------
export const clientes = new Set();
export function emitir(evento, dados) {
  const msg = `event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`;
  for (const res of clientes) res.write(msg);
}

const remota = (f) => /^https:\/\//.test(f.arquivo); // Instagram: só a URL, a mídia não é guardada

// O que o telão pode saber de uma foto. Contato (telefone) nunca sai daqui.
export const publica = (f) => ({
  id: f.id, url: remota(f) ? f.arquivo : `/fotos/${f.arquivo}`,
  remetente: f.remetente, legenda: f.legenda, canal: f.canal, dia: f.dia,
});

export function anunciar(f) {
  if (f.status === 'aprovada' && diasVisiveis(config().dia_exibido).includes(f.dia)) emitir('foto', publica(f));
}

// ---------- entrada ----------
// Guarda a foto ANTES de moderar (nada se perde se o servidor cair) e devolve o status final.
// `responder(texto)` é opcional: avisa o convidado no canal de origem.
export async function receber({ canal, origem_id, remetente, contato, legenda, buffer, mimetype, url, recebida_em, responder }) {
  if (config().pausado === '1') return 'pausado';
  let arquivo = url;
  if (!url) {
    if (!EXT[mimetype]) return 'formato';
    arquivo = `${canal}-${randomUUID()}.${EXT[mimetype]}`;
    await writeFile(path.join(FOTOS, arquivo), buffer);
  }
  const quando = recebida_em ? new Date(recebida_em) : new Date();
  const f = criarFoto({
    canal, origem_id, remetente, contato, legenda, arquivo,
    recebida_em: quando.toISOString(), dia: diaDoEvento(quando),
  });
  if (!f) { // duplicata
    if (!url) await unlink(path.join(FOTOS, arquivo)).catch(() => {});
    return 'duplicada';
  }
  return processar(f, responder);
}

async function bytes(f) {
  if (!remota(f)) return { imagem: await readFile(path.join(FOTOS, f.arquivo)), mimetype: MIME[f.arquivo.split('.').pop()] };
  const r = await fetch(f.arquivo, { signal: AbortSignal.timeout(20_000) });
  const mimetype = (r.headers.get('content-type') || '').split(';')[0];
  if (!r.ok || !EXT[mimetype]) throw new Error(`mídia remota indisponível (${r.status} ${mimetype})`);
  return { imagem: Buffer.from(await r.arrayBuffer()), mimetype };
}

async function processar(f, responder) {
  const cfg = config();
  let v;
  try {
    v = await moderar({ ...(await bytes(f)), legenda: f.legenda, rigor: cfg.rigor });
  } catch (e) {
    console.error('[ingest]', e.message);
    v = { status: 'revisao', motivo: 'Não foi possível ler a imagem', legendaOk: false };
  }
  // Legenda só aparece se a IA liberou; em revisão manual ela fica guardada para o anfitrião ver.
  const legenda = v.status === 'aprovada' && !v.legendaOk ? null : f.legenda;
  const final = decidir(f.id, v.status, v.motivo, legenda);
  console.log(`[foto ${f.id}] ${f.canal} de ${f.remetente}: ${v.status} — ${v.motivo}`);
  anunciar(final);
  emitir('painel', {});
  if (v.status === 'aprovada') responder?.(cfg.msg_aprovada);
  if (v.status === 'reprovada') responder?.(cfg.msg_reprovada);
  return v.status;
}

// Servidor caiu no meio de uma moderação: retoma.
export async function retomarPendentes() {
  for (const f of pendentes()) await processar(f);
}
