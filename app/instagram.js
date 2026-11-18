// Instagram: menções em STORY, lidas por consulta periódica à API de conversas
// (app "Instagram Login", token gerado no painel da Meta, conta profissional).
//
// ponytail: NÃO TESTADO contra uma conta real — escrito a partir da documentação da Meta
// (research.md). O nome exato do campo do story em graph.instagram.com não está confirmado;
// por isso `urlDaMidia` aceita os dois formatos documentados. Validar com uma segunda conta
// antes da festa. Webhooks exigiriam App Review, que não cabe no prazo.
//
// A Meta proíbe guardar a mídia de menções: gravamos só a URL (válida até o story expirar).
import { jaExiste } from './db.js';
import { receber } from './ingest.js';

const TOKEN = process.env.INSTAGRAM_TOKEN || '';
const ID = process.env.INSTAGRAM_ID || ''; // ID da conta profissional (token de usuário do sistema, Graph do Facebook)
const API = 'https://graph.facebook.com/v21.0';
export let estadoInstagram = TOKEN && ID ? 'iniciando' : 'desligado';

async function ig(caminho, params = {}) {
  const u = new URL(API + caminho);
  for (const [k, v] of Object.entries({ ...params, access_token: TOKEN })) u.searchParams.set(k, v);
  const r = await fetch(u, { signal: AbortSignal.timeout(15_000) });
  const json = await r.json();
  if (!r.ok) throw new Error(json?.error?.message || `HTTP ${r.status}`);
  return json;
}

export function urlDaMidia(m) {
  if (m?.story?.mention?.link) return m.story.mention.link;
  for (const a of m?.attachments?.data ?? []) {
    const u = a.image_data?.url ?? (a.type === 'story_mention' || a.type === 'image' ? a.payload?.url : null);
    if (u) return u;
  }
  return null;
}

const vistas = new Map(); // conversa → updated_time já processado

async function rodada(eu) {
  const conversas = (await ig(`/${ID}/conversations`, { platform: 'instagram', fields: 'id,updated_time' })).data ?? [];
  for (const c of conversas.slice(0, 15)) {
    if (vistas.get(c.id) === c.updated_time) continue;
    const msgs = (await ig(`/${c.id}`, { fields: 'messages{id,created_time,from,story,attachments}' })).messages?.data ?? [];
    for (const m of msgs) {
      const url = urlDaMidia(m);
      if (!url || m.from?.id === eu || jaExiste('instagram', m.id)) continue;
      await receber({
        canal: 'instagram', origem_id: m.id, url,
        remetente: m.from?.username ? `@${m.from.username}`.slice(0, 40) : 'Convidado',
        recebida_em: m.created_time,
      });
    }
    vistas.set(c.id, c.updated_time);
  }
}

export async function iniciarInstagram() {
  if (!TOKEN || !ID) return;
  const eu = ID;
  for (;;) {
    try {
      await rodada(eu);
      estadoInstagram = 'ativo';
    } catch (e) {
      estadoInstagram = `erro: ${e.message}`.slice(0, 120);
      console.error('[instagram]', e.message);
    }
    await new Promise((ok) => setTimeout(ok, 20_000)); // limite da API: 2 chamadas/s por conta
  }
}
