import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import QRCode from 'qrcode';
import { FOTOS, config, salvarConfig, foto, fotos, decidir, porArquivo } from './db.js';
import { diasVisiveis } from './dia.js';
import { clientes, emitir, publica, anunciar, receber, retomarPendentes } from './ingest.js';
import { CHAVE as CHAVE_EVOLUTION, prepararWhatsapp, estadoWhatsapp, qrWhatsapp, desconectarWhatsapp, enviarTexto, baixarMidia, interpretar } from './whatsapp.js';
import { iniciarInstagram, estadoInstagram } from './instagram.js';

const PORTA = Number(process.env.PORT || 3000);
const SENHA = process.env.ADMIN_PASSWORD || '';
const SEGREDO = process.env.WEBHOOK_SECRET || '';
const URL_PUBLICA = (process.env.PUBLIC_URL || `http://localhost:${PORTA}`).replace(/\/$/, '');
const URL_INTERNA = (process.env.APP_INTERNAL_URL || `http://localhost:${PORTA}`).replace(/\/$/, '');
const PUBLIC = path.join(import.meta.dirname, 'public');

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
};
const PAGINAS = { '/tv': 'tv.html', '/painel': 'painel.html', '/cartaz': 'cartaz.html', '/enviar': 'enviar.html' };

// ---------- helpers ----------
const json = (res, status, corpo) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(corpo));
};

function arquivo(res, caminho, cache = 'no-cache') {
  if (!existsSync(caminho)) return json(res, 404, { erro: 'não encontrado' });
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(caminho)] || 'application/octet-stream', 'Cache-Control': cache });
  createReadStream(caminho).pipe(res);
}

function corpo(req, limite) {
  return new Promise((ok, erro) => {
    const partes = [];
    let total = 0;
    req.on('data', (p) => {
      total += p.length;
      if (total > limite) { erro(Object.assign(new Error('grande demais'), { status: 413 })); req.destroy(); } else partes.push(p);
    });
    req.on('end', () => ok(Buffer.concat(partes)));
    req.on('error', erro);
  });
}

const igual = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const sessao = () => createHmac('sha256', SENHA).update('painel-telao').digest('hex');
const logado = (req) => !!SENHA && igual(/(?:^|;\s*)s=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1] || '', sessao());

function formatarNumero(n) {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(n);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : n ? `+${n}` : '';
}

// Para onde o QR aponta: conversa do WhatsApp direto, ou a página /enviar (escolha WhatsApp/Instagram + envio web).
function destinoQr(cfg) {
  return cfg.qr_destino === 'whatsapp' && cfg.whatsapp_numero ? `https://wa.me/${cfg.whatsapp_numero}` : `${URL_PUBLICA}/enviar`;
}

function paraTelao() {
  const cfg = config();
  const dias = diasVisiveis(cfg.dia_exibido);
  const viaWhats = cfg.qr_destino !== 'web' && cfg.whatsapp_numero;
  return {
    config: {
      segundos: Number(cfg.segundos_por_foto),
      rotulo: dias.length > 1 ? 'Dias 21 e 22' : `Dia ${dias[0]}`,
      como: cfg.instagram_usuario
        ? `Aponte a câmera para o QR code · ou marque @${cfg.instagram_usuario}`
        : 'Aponte a câmera do celular para o QR code',
      qr: destinoQr(cfg),
      whatsapp: viaWhats ? formatarNumero(cfg.whatsapp_numero) : '',
      wa: viaWhats ? cfg.whatsapp_numero : '',
      instagram: cfg.instagram_usuario,
    },
    fotos: fotos({ status: 'aprovada' }).filter((f) => dias.includes(f.dia)).reverse().map(publica),
  };
}

// ---------- webhook do WhatsApp ----------
const ultimaAjuda = new Map(); // contato → quando orientamos (evita spam)

async function webhookWhatsapp(payload) {
  const m = interpretar(payload);
  if (!m || config().pausado === '1') return; // pausado: nem recebe nem responde ninguém
  const responder = (texto) => texto && enviarTexto(m.contato, texto);
  if (m.tipo === 'video') return responder(config().msg_video);
  if (m.tipo === 'outro') {
    if (Date.now() - (ultimaAjuda.get(m.contato) || 0) > 5 * 60_000) {
      ultimaAjuda.set(m.contato, Date.now());
      responder(config().msg_ajuda);
    }
    return;
  }
  const base64 = m.base64 || await baixarMidia(m.data).catch(() => null);
  if (!base64) return console.error(`[whatsapp] mídia indisponível para ${m.origem_id}`);
  await receber({ canal: 'whatsapp', ...m, buffer: Buffer.from(base64, 'base64'), responder });
}

// ---------- rotas ----------
async function rota(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  const GET = req.method === 'GET', POST = req.method === 'POST';

  if (GET && p === '/') return res.writeHead(302, { Location: '/tv' }).end();
  if (GET && PAGINAS[p]) return arquivo(res, path.join(PUBLIC, PAGINAS[p]));
  if (GET && /^\/(tokens\.css|tv\.css|tv\.js|assets\/[\w.-]+)$/.test(p)) return arquivo(res, path.join(PUBLIC, p), 'max-age=300');

  if (GET && p === '/api/fotos') return json(res, 200, paraTelao());

  if (GET && p === '/api/eventos') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
    res.write('retry: 3000\n\n');
    clientes.add(res);
    req.on('close', () => clientes.delete(res));
    return;
  }

  if (GET && p === '/qr.svg') {
    const svg = await QRCode.toString(destinoQr(config()), { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#24170F', light: '#0000' } });
    res.writeHead(200, { 'Content-Type': TIPOS['.svg'], 'Cache-Control': 'no-cache' });
    return res.end(svg);
  }

  // Foto em disco: pública só se aprovada; o resto só para o painel.
  const mFoto = GET && /^\/fotos\/([\w-]+\.(?:jpg|png|webp))$/.exec(p);
  if (mFoto) {
    const f = porArquivo(mFoto[1]);
    if (!f || (f.status !== 'aprovada' && !logado(req))) return json(res, 404, { erro: 'não encontrado' });
    return arquivo(res, path.join(FOTOS, f.arquivo), 'private, max-age=86400');
  }

  if (POST && p === '/webhook/whatsapp') {
    if (!SEGREDO || !igual(url.searchParams.get('t') || '', SEGREDO)) return json(res, 401, { erro: 'não autorizado' });
    const payload = JSON.parse(await corpo(req, 30e6));
    json(res, 200, { ok: true }); // responde já; o Evolution reenvia se demorar
    webhookWhatsapp(payload).catch((e) => console.error('[whatsapp]', e));
    return;
  }

  // Plano B: envio pelo navegador (corpo = a imagem, já reduzida no celular).
  if (POST && p === '/api/enviar') {
    const buffer = await corpo(req, 8e6);
    const limpa = (v, n) => (v || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
    const status = await receber({
      canal: 'web', origem_id: randomUUID(), buffer, mimetype: (req.headers['content-type'] || '').split(';')[0],
      remetente: limpa(url.searchParams.get('nome'), 40).split(/\s+/)[0] || 'Convidado',
      legenda: limpa(url.searchParams.get('legenda'), 200) || null,
    });
    return json(res, status === 'formato' ? 415 : 200, { status });
  }

  // ---------- painel ----------
  if (POST && p === '/api/login') {
    const { senha = '' } = JSON.parse(await corpo(req, 1e4));
    if (!SENHA) return json(res, 503, { erro: 'Defina ADMIN_PASSWORD no .env para usar o painel.' });
    if (!igual(createHmac('sha256', SENHA).update(String(senha)).digest('hex'), createHmac('sha256', SENHA).update(SENHA).digest('hex'))) {
      await new Promise((ok) => setTimeout(ok, 800)); // freia tentativa e erro
      return json(res, 401, { erro: 'Senha incorreta.' });
    }
    res.setHeader('Set-Cookie', `s=${sessao()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`);
    return json(res, 200, { ok: true });
  }

  if (p.startsWith('/api/admin/')) {
    if (!logado(req)) return json(res, 401, { erro: 'Entre com a senha.' });

    if (GET && p === '/api/admin/estado') {
      return json(res, 200, {
        config: config(),
        whatsapp: await estadoWhatsapp(),
        instagram: estadoInstagram,
        telas: clientes.size,
        fotos: fotos().map((f) => ({ ...publica(f), status: f.status, motivo: f.motivo, recebida_em: f.recebida_em })),
      });
    }

    if (GET && p === '/api/admin/whatsapp/qr') return json(res, 200, { qr: await qrWhatsapp(), estado: await estadoWhatsapp() });
    if (POST && p === '/api/admin/whatsapp/desconectar') {
      await desconectarWhatsapp();
      return json(res, 200, { estado: await estadoWhatsapp() });
    }

    if (POST && p === '/api/admin/config') {
      const rejeitadas = salvarConfig(JSON.parse(await corpo(req, 1e5)));
      emitir('config', {});
      return json(res, rejeitadas.length ? 400 : 200, { rejeitadas, config: config() });
    }

    const mAcao = POST && /^\/api\/admin\/fotos\/(\d+)\/(aprovar|remover)$/.exec(p);
    if (mAcao) {
      const id = Number(mAcao[1]);
      if (!foto(id)) return json(res, 404, { erro: 'foto não existe' });
      const f = decidir(id, mAcao[2] === 'aprovar' ? 'aprovada' : 'removida', 'manual');
      if (f.status === 'aprovada') anunciar(f); else emitir('remover', { id });
      emitir('painel', {});
      return json(res, 200, { ok: true });
    }

    if (GET && p === '/api/admin/zip') {
      const dia = Number(url.searchParams.get('dia'));
      const lista = fotos({ dia, status: 'aprovada' }).filter((f) => !f.arquivo.startsWith('https://')).map((f) => path.join(FOTOS, f.arquivo));
      if (!lista.length) return json(res, 404, { erro: 'Nenhuma foto guardada nesse dia.' });
      res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="cha-de-casa-nova-dia-${dia}.zip"` });
      const zip = spawn('zip', ['-j', '-0', '-q', '-', ...lista]);
      zip.on('error', () => res.destroy());
      return zip.stdout.pipe(res);
    }
  }

  json(res, 404, { erro: 'não encontrado' });
}

const servidor = http.createServer((req, res) => {
  rota(req, res).catch((e) => {
    if (!e.status) console.error('[http]', req.method, req.url, e);
    if (!res.headersSent) json(res, e.status || (e instanceof SyntaxError ? 400 : 500), { erro: e.message });
    else res.end();
  });
});

// Só sobe o servidor quando executado diretamente (os testes importam este arquivo).
if (import.meta.main) {
  servidor.listen(PORTA, () => console.log(`Telão em ${URL_PUBLICA}/tv · painel em ${URL_PUBLICA}/painel`));
  setInterval(() => { for (const c of clientes) c.write(': ping\n\n'); }, 25_000); // mantém o SSE vivo atrás de proxy

  if (!SENHA) console.warn('AVISO: ADMIN_PASSWORD vazio — painel desativado.');
  if (!process.env.ANTHROPIC_API_KEY) console.warn('AVISO: ANTHROPIC_API_KEY ausente — toda foto vai para revisão manual.');

  retomarPendentes().catch((e) => console.error('[pendentes]', e));
  iniciarInstagram();
  if (CHAVE_EVOLUTION && SEGREDO) {
    // O Evolution pode demorar a subir: tenta até conseguir, sem travar o resto.
    (async () => {
      for (;;) {
        try { await prepararWhatsapp(`${URL_INTERNA}/webhook/whatsapp?t=${SEGREDO}`); console.log('WhatsApp: instância e webhook prontos.'); break; }
        catch (e) { console.error('[whatsapp] ainda não disponível:', e.message); await new Promise((ok) => setTimeout(ok, 10_000)); }
      }
    })();
  } else console.warn('AVISO: WEBHOOK_SECRET vazio — WhatsApp desligado (use a página /enviar).');
}

export { servidor, formatarNumero };
