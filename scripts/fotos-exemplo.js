// Popula o telão com fotos de exemplo já aprovadas, para ver as cenas antes da festa.
// Uso: node scripts/fotos-exemplo.js [quantidade=18] [dia=21]
// Apagar depois: node scripts/fotos-exemplo.js limpar
import { writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { FOTOS, criarFoto, decidir, fotos } from '../app/db.js';

if (process.argv[2] === 'limpar') {
  for (const f of fotos()) if (f.origem_id.startsWith('exemplo-')) {
    await unlink(path.join(FOTOS, f.arquivo)).catch(() => {});
    decidir(f.id, 'removida', 'exemplo apagado');
  }
  console.log('Exemplos removidos do telão.');
  process.exit();
}

const n = Number(process.argv[2] || 18), dia = Number(process.argv[3] || 21);
const nomes = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Vó Lúcia', 'Tio Marcos'];
const recados = ['Que casa linda! Muitas felicidades 🏡', null, 'Parabéns, Milene e Denilson!', null, 'O churrasco tá aprovado', 'Amei a cozinha nova', null];
const tamanhos = [[1600, 1067], [1067, 1600], [1600, 1200], [1200, 1600], [1600, 900]];

for (let i = 0; i < n; i++) {
  const [w, h] = tamanhos[i % tamanhos.length];
  const semente = `cha-${Date.now()}-${i}`;
  const r = await fetch(`https://picsum.photos/seed/${semente}/${w}/${h}.jpg`);
  if (!r.ok) { console.error('falhou', r.status); continue; }
  const arquivo = `exemplo-${semente}.jpg`;
  await writeFile(path.join(FOTOS, arquivo), Buffer.from(await r.arrayBuffer()));
  const f = criarFoto({
    canal: 'whatsapp', origem_id: `exemplo-${semente}`, remetente: nomes[i % nomes.length],
    legenda: recados[i % recados.length], arquivo, recebida_em: new Date().toISOString(), dia,
  });
  decidir(f.id, 'aprovada', 'exemplo');
  process.stdout.write('.');
}
console.log(`\n${n} fotos de exemplo no dia ${dia}. Recarregue o telão.`);
