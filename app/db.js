import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export const DATA = process.env.DATA_DIR || path.resolve(import.meta.dirname, '../data');
export const FOTOS = path.join(DATA, 'fotos');
mkdirSync(FOTOS, { recursive: true });

const db = new DatabaseSync(path.join(DATA, 'telao.db'));
// Bancos antigos travavam `dia` em 21/22: renomeia e recria abaixo com a regra nova.
if (db.prepare(`SELECT sql FROM sqlite_master WHERE name = 'fotos'`).get()?.sql.includes('dia IN (21,22)'))
  db.exec('ALTER TABLE fotos RENAME TO fotos_antiga');
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS fotos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canal TEXT NOT NULL CHECK (canal IN ('whatsapp','instagram','web')),
    origem_id TEXT NOT NULL,
    remetente TEXT NOT NULL DEFAULT 'Convidado',
    contato TEXT,
    legenda TEXT,
    arquivo TEXT NOT NULL,
    recebida_em TEXT NOT NULL,
    dia INTEGER NOT NULL CHECK (dia BETWEEN 1 AND 31),
    status TEXT NOT NULL DEFAULT 'pendente'
      CHECK (status IN ('pendente','aprovada','revisao','reprovada','removida')),
    motivo TEXT,
    UNIQUE (canal, origem_id)
  );
  CREATE TABLE IF NOT EXISTS config (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
`);
if (db.prepare(`SELECT 1 FROM sqlite_master WHERE name = 'fotos_antiga'`).get())
  db.exec('INSERT INTO fotos SELECT * FROM fotos_antiga; DROP TABLE fotos_antiga;');

export const PADRAO = {
  dia_exibido: 'auto',
  segundos_por_foto: '7',
  rigor: 'normal',
  pausado: '0',
  qr_destino: 'escolha',
  whatsapp_numero: '5555991923790',
  instagram_usuario: 'denilsonbehenck',
  msg_aprovada: 'Recebemos sua foto! Olha pra TV 👀',
  msg_reprovada: 'Essa não vai dar pra mostrar na TV 😅 Manda outra?',
  msg_ajuda: 'Manda uma foto aqui que ela aparece na TV da festa 📸',
  msg_video: 'Vídeo não aparece na TV 🙈 Manda uma foto!',
};

export function config() {
  const c = { ...PADRAO };
  for (const { chave, valor } of db.prepare('SELECT chave, valor FROM config').all()) c[chave] = valor;
  return c;
}

const VALIDO = {
  dia_exibido: (v) => ['auto', '21', '22', 'ambos'].includes(v),
  segundos_por_foto: (v) => /^\d+$/.test(v) && +v >= 3 && +v <= 30,
  rigor: (v) => ['normal', 'alto'].includes(v),
  pausado: (v) => ['0', '1'].includes(v),
  qr_destino: (v) => ['escolha', 'whatsapp', 'web'].includes(v),
  whatsapp_numero: (v) => /^\d{0,15}$/.test(v),
  instagram_usuario: (v) => /^[\w.]{0,30}$/.test(v),
  msg_aprovada: (v) => v.length <= 300,
  msg_reprovada: (v) => v.length <= 300,
  msg_ajuda: (v) => v.length <= 300,
  msg_video: (v) => v.length <= 300,
};

// Grava só chaves conhecidas com valores válidos; devolve as chaves rejeitadas.
export function salvarConfig(mudancas) {
  const rejeitadas = [];
  const up = db.prepare('INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor');
  for (const [chave, bruto] of Object.entries(mudancas)) {
    const valor = String(bruto ?? '').trim();
    if (VALIDO[chave]?.(valor)) up.run(chave, valor);
    else rejeitadas.push(chave);
  }
  return rejeitadas;
}

// Devolve a foto criada, ou null se (canal, origem_id) já existia.
export function criarFoto(f) {
  const r = db.prepare(`INSERT OR IGNORE INTO fotos (canal, origem_id, remetente, contato, legenda, arquivo, recebida_em, dia)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(f.canal, f.origem_id, f.remetente, f.contato ?? null, f.legenda ?? null, f.arquivo, f.recebida_em, f.dia);
  return r.changes ? foto(Number(r.lastInsertRowid)) : null;
}

export const jaExiste = (canal, origem_id) =>
  !!db.prepare('SELECT 1 FROM fotos WHERE canal = ? AND origem_id = ?').get(canal, origem_id);

export const porArquivo = (arquivo) => db.prepare('SELECT * FROM fotos WHERE arquivo = ?').get(arquivo);

export const foto = (id) => db.prepare('SELECT * FROM fotos WHERE id = ?').get(id);

export function decidir(id, status, motivo, legenda) {
  if (legenda === undefined) db.prepare('UPDATE fotos SET status = ?, motivo = ? WHERE id = ?').run(status, motivo, id);
  else db.prepare('UPDATE fotos SET status = ?, motivo = ?, legenda = ? WHERE id = ?').run(status, motivo, legenda, id);
  return foto(id);
}

export const fotos = ({ dia, status } = {}) =>
  db.prepare(`SELECT * FROM fotos WHERE (?1 IS NULL OR dia = ?1) AND (?2 IS NULL OR status = ?2) ORDER BY id DESC`)
    .all(dia ?? null, status ?? null);

export const pendentes = () => db.prepare("SELECT * FROM fotos WHERE status = 'pendente' ORDER BY id").all();
