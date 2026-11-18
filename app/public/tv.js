// Telão: máquina de cenas. Estado vive em memória; a rede só acrescenta/remove fotos.
const palco = document.querySelector('#palco');
const EASE = 'cubic-bezier(.22, 1, .36, 1)';

let fotos = [];            // aprovadas do(s) dia(s) exibido(s), ordem de chegada
let fila = [];             // recém-chegadas esperando a cena "foto nova"
let cfg = { segundos: 7, rotulo: '' };
const vistos = new Set();  // ids já mostrados no destaque nesta volta
let pular = null;          // interrompe a espera atual (foto nova, remoção, seta →)

// ---------- utilidades ----------
function el(tag, classe, texto) {
  const n = document.createElement(tag);
  if (classe) n.className = classe;
  if (texto != null) n.textContent = texto; // textContent: nome e recado vêm de convidados
  return n;
}
const img = (src, classe) => Object.assign(el('img', classe), { src, alt: '' });
const ramos = (claro) => [
  img(`/assets/branch_tr${claro ? '_light' : ''}.webp`, 'ramo tr'),
  img(`/assets/branch_bl${claro ? '_light' : ''}.webp`, 'ramo bl'),
];

// Espera interrompível: resolve true se alguém chamou pular().
const dorme = (ms) => new Promise((ok) => {
  const t = setTimeout(() => { pular = null; ok(false); }, ms);
  pular = () => { clearTimeout(t); pular = null; ok(true); };
});
const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));

// Carrega a imagem antes de mostrar; null se falhar (sem rede, arquivo removido).
async function carregar(f) {
  const i = img(f.url);
  i.dataset.id = f.id;
  try {
    await Promise.race([i.decode(), new Promise((_, no) => setTimeout(no, 8000))]);
    return i;
  } catch { return null; }
}

// Troca de cena com fusão; a anterior sai do DOM depois.
function entrar(cena) {
  const velhas = [...palco.children];
  palco.append(cena);
  cena.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: 'ease' });
  setTimeout(() => velhas.forEach((v) => v.remove()), 950);
  return cena;
}

const sorteia = (lista, n) => [...lista].sort(() => Math.random() - 0.5).slice(0, n);

// Fila justa: alterna remetentes para ninguém monopolizar a sequência.
export function intercalar(lista) {
  const grupos = new Map();
  for (const f of lista) (grupos.get(f.remetente) ?? grupos.set(f.remetente, []).get(f.remetente)).push(f);
  const filas = [...grupos.values()], saida = [];
  while (saida.length < lista.length) for (const g of filas) if (g.length) saida.push(g.shift());
  return saida;
}

function proxima() {
  let resto = intercalar(fotos).filter((f) => !vistos.has(f.id));
  if (!resto.length) { vistos.clear(); resto = intercalar(fotos); }
  if (resto[0]) vistos.add(resto[0].id);
  return resto[0];
}

// ---------- cenas ----------
async function boasVindas() {
  const c = el('section', 'cena clara boasvindas');
  const esq = el('div', 'lado');
  esq.append(img('/assets/logo.webp', 'logo'), el('p', 'eyebrow', 'Sejam bem-vindos ao'),
    el('h1', 'script', 'Chá de Casa Nova'), el('p', 'nomes', 'Milene & Denilson'));
  const dir = el('div');
  const passos = el('ol', 'passos');
  for (const [n, t, s] of [
    ['1', 'Aponte a câmera para o QR code', 'ali embaixo, no canto da tela'],
    ['2', 'Mande pelo WhatsApp ou Instagram', 'pode escrever um recadinho junto'],
    ['3', 'Olhe para a TV', 'ela aparece aqui em instantes'],
  ]) {
    const li = el('li');
    const txt = el('span', null, t);
    txt.append(el('small', null, s));
    li.append(el('b', null, n), txt);
    passos.append(li);
  }
  dir.append(el('p', 'eyebrow', 'Apareça no telão'), passos);
  c.append(...ramos(false), esq, dir);
  entrar(c);
  await dorme(60_000);
}

// Monta quadro + texto de uma foto. `maxW/maxH` em fração da tela, para caber sem cortar.
function slideDe(f, imagem, eyebrow) {
  const W = innerWidth * 0.56, H = innerHeight * 0.88 * 0.82;
  const k = Math.min(W / imagem.naturalWidth, H / imagem.naturalHeight);
  imagem.width = Math.round(imagem.naturalWidth * k);
  imagem.height = Math.round(imagem.naturalHeight * k);
  const quadro = el('div', 'quadro'), janela = el('div', 'janela');
  quadro.dataset.id = f.id;
  janela.append(imagem);
  quadro.append(janela);
  const texto = el('div', 'texto');
  texto.append(el('p', 'eyebrow', eyebrow), el('h2', 'script nome', f.remetente));
  if (f.legenda) texto.append(el('p', 'recado', `“${f.legenda}”`));
  texto.append(el('div', 'fio'), el('p', 'canal', f.canal === 'instagram' ? 'pelo Instagram' : 'pelo WhatsApp'));
  const slide = el('div', 'slide');
  slide.append(quadro, texto);
  return { slide, quadro, texto, imagem };
}

function animarSlide({ quadro, texto, imagem }, ms, giro) {
  quadro.animate([
    { opacity: 0, transform: `translateY(5vh) rotate(${giro - 4}deg) scale(.94)` },
    { opacity: 1, transform: `rotate(${giro}deg)` },
  ], { duration: 1200, easing: EASE, fill: 'both' });
  imagem.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }], { duration: ms + 2000, fill: 'both' }); // Ken Burns
  [...texto.children].forEach((n, i) => n.animate(
    [{ opacity: 0, transform: 'translateY(2.5vh)' }, { opacity: 1, transform: 'none' }],
    { duration: 900, delay: 350 + i * 140, easing: EASE, fill: 'both' }));
}

async function destaque() {
  const c = entrar(el('section', 'cena clara'));
  c.append(...ramos(false));
  for (let n = 0; n < Math.min(6, fotos.length); n++) {
    const f = proxima();
    const imagem = f && await carregar(f);
    if (!imagem) continue;
    const ms = cfg.segundos * 1000;
    const s = slideDe(f, imagem, `${cfg.rotulo} · enviada por`);
    c.append(s.slide);
    animarSlide(s, ms, n % 2 ? 1.2 : -1.2);
    const interrompido = await dorme(ms);
    await s.slide.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'both' }).finished;
    s.slide.remove();
    if (interrompido) return;
  }
}

async function mural() {
  if (fotos.length < 6) return;
  const escolhidas = (await Promise.all(sorteia(fotos, 40).map(carregar))).filter(Boolean);
  if (escolhidas.length < 6) return;
  const nCol = innerWidth / innerHeight > 1.5 ? 5 : 3;
  const c = el('section', 'cena mural');
  const colunas = Array.from({ length: nCol }, () => el('div', 'coluna'));
  colunas.forEach((col, i) => {
    const trilho = el('div', 'trilho');
    // Cada coluna precisa de altura de sobra para o loop: no mínimo 5 fotos, repetindo se faltar.
    const minhas = [];
    for (let k = 0; minhas.length < 5 || k < escolhidas.length; k++) {
      if (k % nCol === i || escolhidas.length < nCol * 5) minhas.push(escolhidas[(k + i * 3) % escolhidas.length]);
      if (k > 200) break;
    }
    const lote = minhas.slice(0, 9);
    for (const origem of [...lote, ...lote]) { // duplicado: translateY(-50%) fecha o loop sem salto
      const copia = origem.cloneNode();
      copia.dataset.id = origem.dataset.id;
      trilho.append(copia);
    }
    trilho.style.animationDuration = `${lote.length * 9 + i * 4}s`;
    col.append(trilho);
  });
  c.append(...colunas, el('div', 'selo eyebrow', `Todas as fotos · ${cfg.rotulo}`));
  entrar(c);
  await dorme(28_000);
}

async function polaroides() {
  if (fotos.length < 3) return;
  const c = entrar(el('section', 'cena clara'));
  c.append(...ramos(false), el('div', 'selo eyebrow', `Nossa festa · ${cfg.rotulo}`));
  // 10 posições em grade (5×2) com folga, embaralhadas; a partir da 11ª, empilha.
  const vagas = sorteia(Array.from({ length: 10 }, (_, i) => [i % 5, Math.floor(i / 5)]), 10);
  let z = 1;
  for (const [i, f] of sorteia(fotos, 14).entries()) {
    const imagem = await carregar(f);
    if (!imagem) continue;
    const [cx, cy] = vagas[i % vagas.length];
    const p = el('figure', 'polaroide');
    p.dataset.id = f.id;
    p.append(imagem, el('span', 'script', f.remetente));
    p.style.cssText = `left:${3 + cx * 16 + Math.random() * 3}vw; top:${4 + cy * 40 + Math.random() * 6}vh; margin:0; z-index:${z++}`;
    c.append(p);
    const giro = (Math.random() * 14 - 7).toFixed(1);
    p.animate([
      { opacity: 0, transform: `translateY(-12vh) rotate(${giro * 3}deg) scale(1.25)` },
      { opacity: 1, transform: `rotate(${giro}deg) scale(1)` },
    ], { duration: 900, easing: EASE, fill: 'both' });
    if (await dorme(1500)) return;
  }
  await dorme(7000);
}

async function novidade(f) {
  if (!fotos.some((x) => x.id === f.id)) return; // removida enquanto esperava
  const imagem = await carregar(f);
  if (!imagem) return;
  vistos.add(f.id);
  const c = el('section', 'cena escura');
  c.append(...ramos(true));
  const s = slideDe(f, imagem, 'Chegou foto nova');
  s.texto.firstChild.style.color = 'var(--latte)';
  c.append(s.slide);
  entrar(c);
  s.quadro.animate([
    { opacity: 0, transform: 'scale(.55) rotate(-9deg)' },
    { opacity: 1, transform: 'scale(1.04) rotate(1.5deg)', offset: 0.7 },
    { opacity: 1, transform: 'scale(1) rotate(-1deg)' },
  ], { duration: 1500, easing: EASE, fill: 'both' });
  s.imagem.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }], { duration: 11_000, fill: 'both' });
  [...s.texto.children].forEach((n, i) => n.animate(
    [{ opacity: 0, transform: 'translateX(4vw)' }, { opacity: 1, transform: 'none' }],
    { duration: 900, delay: 700 + i * 150, easing: EASE, fill: 'both' }));
  await pausa(Math.max(8000, cfg.segundos * 1000)); // não interrompível: cada foto nova tem seu momento
}

async function principal() {
  const cenas = [destaque, mural, destaque, polaroides];
  // /tv?cena=mural ou ?cena=polaroides começa por essa cena (para conferir o visual).
  const inicio = { mural: 1, polaroides: 3 }[new URLSearchParams(location.search).get('cena')] ?? 0;
  for (let i = inicio; ;) {
    try {
      if (fila.length) await novidade(fila.shift());
      else if (!fotos.length) await boasVindas();
      else await cenas[i++ % cenas.length]();
    } catch (e) {
      console.error(e);
      await pausa(2000); // nunca deixa o telão em loop apertado nem parado
    }
  }
}

// ---------- rede ----------
async function sincronizar() {
  try {
    const r = await fetch('/api/fotos');
    if (!r.ok) return;
    const d = await r.json();
    const estavaVazio = !fotos.length;
    cfg = d.config;
    fotos = d.fotos;
    fila = fila.filter((f) => fotos.some((x) => x.id === f.id));
    document.querySelector('#info').textContent =
      `${cfg.rotulo} · ${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'}`;
    document.querySelector('#como').textContent = cfg.como;
    document.querySelector('#qr').src = `/qr.svg?v=${encodeURIComponent(cfg.qr)}`;
    if (estavaVazio && fotos.length) pular?.();
  } catch { /* sem rede: segue com o que tem */ }
}

function ligarEventos() {
  const es = new EventSource('/api/eventos'); // reconecta sozinho
  es.onopen = sincronizar;
  es.addEventListener('foto', (e) => {
    const f = JSON.parse(e.data);
    if (fotos.some((x) => x.id === f.id)) return;
    fotos.push(f);
    fila.push(f);
    document.querySelector('#info').textContent = `${cfg.rotulo} · ${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'}`;
    pular?.();
  });
  es.addEventListener('remover', (e) => {
    const { id } = JSON.parse(e.data);
    fotos = fotos.filter((f) => f.id !== id);
    fila = fila.filter((f) => f.id !== id);
    document.querySelectorAll(`[data-id="${id}"]`).forEach((n) => n.remove());
    sincronizar();
    pular?.();
  });
  es.addEventListener('config', sincronizar);
}

if (typeof document !== 'undefined' && palco) {
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') pular?.();
    if (e.key === 'f') document.documentElement.requestFullscreen?.();
  });
  addEventListener('click', () => document.documentElement.requestFullscreen?.());
  navigator.wakeLock?.request('screen').catch(() => {});
  setInterval(sincronizar, 5 * 60_000); // rede de segurança: eventos perdidos, virada do dia
  await sincronizar();
  ligarEventos();
  principal();
}
