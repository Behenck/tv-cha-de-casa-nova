// Evolution API v2.3.x (Baileys). Formatos conferidos no código-fonte da tag 2.3.7;
// ver specs/001-telao-fotos/research.md.
const URL_EVO = process.env.EVOLUTION_URL || 'http://localhost:8081';
export const CHAVE = process.env.EVOLUTION_API_KEY || process.env.AUTHENTICATION_API_KEY || '';
const INSTANCIA = process.env.EVOLUTION_INSTANCE || 'Denilson';

async function evo(metodo, caminho, corpo) {
  const r = await fetch(URL_EVO + caminho, {
    method: metodo,
    headers: { apikey: CHAVE, 'Content-Type': 'application/json' },
    body: corpo && JSON.stringify(corpo),
    signal: AbortSignal.timeout(20_000),
  });
  const json = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, json };
}

const webhook = (url) => ({
  enabled: true, url, byEvents: false, base64: true,
  events: ['MESSAGES_UPSERT'], // sempre enviar `events`: omitir derruba a criação da instância
});

// Cria a instância se faltar e (re)grava o webhook — o Evolution pode perdê-lo ao reiniciar.
export async function prepararWhatsapp(urlWebhook) {
  const estado = await evo('GET', `/instance/connectionState/${INSTANCIA}`);
  if (!estado.json?.instance?.state) {
    await evo('POST', '/instance/create', {
      instanceName: INSTANCIA, integration: 'WHATSAPP-BAILEYS', qrcode: true, webhook: webhook(urlWebhook),
    });
  }
  const r = await evo('POST', `/webhook/set/${INSTANCIA}`, { webhook: webhook(urlWebhook) });
  if (!r.ok) throw new Error(`webhook/set respondeu ${r.status}`);
}

// 'open' | 'connecting' | 'close' | 'indisponivel'
export async function estadoWhatsapp() {
  try {
    return (await evo('GET', `/instance/connectionState/${INSTANCIA}`)).json?.instance?.state || 'indisponivel';
  } catch { return 'indisponivel'; }
}

// Data URL do QR de pareamento, ou null se já conectado / indisponível.
export async function qrWhatsapp() {
  try { return (await evo('GET', `/instance/connect/${INSTANCIA}`)).json?.base64 || null; } catch { return null; }
}

export async function enviarTexto(jid, texto) {
  try { await evo('POST', `/message/sendText/${INSTANCIA}`, { number: jid, text: texto }); }
  catch (e) { console.error('[whatsapp] falha ao responder:', e.message); }
}

// Mídia quando o webhook veio sem base64 (download falhou do lado do Evolution).
export async function baixarMidia(data) {
  const r = await evo('POST', `/chat/getBase64FromMediaMessage/${INSTANCIA}`, { message: data, convertToMp4: false });
  return r.json?.base64 || null;
}

export function primeiroNome(nome) {
  const limpo = String(nome ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().split(/\s+/)[0] || '';
  return limpo.slice(0, 40) || 'Convidado';
}

// Webhook → { tipo: 'foto' | 'outro', ... } ou null para ignorar (grupo, eu mesmo, outro evento).
export function interpretar(corpo) {
  const d = corpo?.data;
  if (corpo?.event !== 'messages.upsert' || !d?.key?.id || d.key.fromMe) return null;
  const jid = d.key.remoteJid || '';
  if (!/@(s\.whatsapp\.net|lid)$/.test(jid)) return null; // grupos, status, broadcast
  const base = {
    origem_id: d.key.id,
    contato: jid,
    remetente: primeiroNome(d.pushName),
    recebida_em: new Date((Number(d.messageTimestamp) || Date.now() / 1000) * 1000).toISOString(),
  };
  // Fotos de álbum podem vir embrulhadas em associatedChildMessage.
  const imagem = d.message?.imageMessage ?? d.message?.associatedChildMessage?.message?.imageMessage;
  if (!imagem) return { ...base, tipo: 'outro' };
  return {
    ...base,
    tipo: 'foto',
    legenda: (imagem.caption || '').trim().slice(0, 200) || null,
    mimetype: (imagem.mimetype || 'image/jpeg').split(';')[0],
    base64: d.message.base64 || null,
    data: d,
  };
}
