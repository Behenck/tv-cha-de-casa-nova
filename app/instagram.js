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
let uso = 0;

async function ig(caminho, params = {}) {
  const u = new URL(API + caminho);
  for (const [k, v] of Object.entries({ ...params, access_token: TOKEN })) u.searchParams.set(k, v);
  const r = await fetch(u, { signal: AbortSignal.timeout(15_000) });
  // % de cota já gasta na última hora: a do app (x-app-usage) e a da conta (x-business-use-case-usage).
  try {
    const app = Object.values(JSON.parse(r.headers.get('x-app-usage') || '{}'));
    const conta = Object.values(JSON.parse(r.headers.get('x-business-use-case-usage') || '{}')).flat()
      .flatMap((c) => [c.call_count, c.total_cputime, c.total_time]);
    uso = Math.max(0, ...app, ...conta.filter(Number.isFinite));
  } catch {}
  const json = await r.json();
  if (!r.ok) throw Object.assign(new Error(json?.error?.message || `HTTP ${r.status}`), { codigo: json?.error?.code });
  return json;
}

// Só menções em story; fotos e textos mandados na DM são ignorados.
export const urlDaMidia = (m) => m?.story?.mention?.link ?? null;

// Só o que chegou nas últimas 24h (stories antigos não entram no telão).
const recente = (t) => Date.now() - new Date(t).getTime() < 24 * 3600_000;

// UMA chamada por rodada, com as mensagens aninhadas na lista de conversas. Ler conversa por
// conversa (/{conversa}?fields=messages) estourava a cota do app em minutos (erro #4, total_time 125%);
// a chamada aninhada cai na cota da conta e gasta ~1% (medido em 18/11).
async function rodada(eu) {
  const conversas = (await ig(`/${ID}/conversations`, {
    platform: 'instagram', limit: 15, fields: 'updated_time,messages.limit(5){id,created_time,from,story}',
  })).data ?? [];
  for (const c of conversas.filter((c) => recente(c.updated_time))) {
    for (const m of c.messages?.data ?? []) {
      const url = urlDaMidia(m);
      if (!url || !recente(m.created_time) || m.from?.id === eu || jaExiste('instagram', m.id)) continue;
      await receber({
        canal: 'instagram', origem_id: m.id, url,
        remetente: m.from?.username ? `@${m.from.username}`.slice(0, 40) : 'Convidado',
        recebida_em: m.created_time,
      });
    }
  }
}

export async function iniciarInstagram() {
  if (!TOKEN || !ID) return;
  const eu = ID;
  for (;;) {
    let espera;
    try {
      // Uma rodada travada congelava o loop para sempre (visto em 18/11): no máximo 5 min por rodada.
      await Promise.race([rodada(eu), new Promise((_, nao) => setTimeout(() => nao(new Error('rodada travou (5 min)')), 5 * 60_000))]);
      // Freia antes de bater em 100%: cota sobrando → 1 min; apertando → 3 min; quase no fim → 10 min.
      espera = uso < 50 ? 60_000 : uso < 80 ? 3 * 60_000 : 10 * 60_000;
      estadoInstagram = `ativo · cota da Meta usada: ${uso}%`;
    } catch (e) {
      espera = 60_000;
      const limite = [4, 17, 32, 613].includes(e.codigo); // códigos de limite de uso da Meta
      if (limite) espera = 15 * 60_000; // a janela é de 1h corrida: parar de insistir deixa ela esvaziar
      estadoInstagram = `${limite ? 'limite da Meta, tentando de novo em 15 min' : 'erro'}: ${e.message}`.slice(0, 120);
      console.error('[instagram]', e.message);
    }
    await new Promise((ok) => setTimeout(ok, espera));
  }
}
