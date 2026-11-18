import test from 'node:test';
import assert from 'node:assert/strict';
import { diaDoEvento, diasVisiveis } from './dia.js';
import { interpretar, primeiroNome } from './whatsapp.js';
import { statusDoVeredito } from './moderar.js';
import { urlDaMidia } from './instagram.js';

test('dia do evento segue o fuso de São Paulo', () => {
  assert.equal(diaDoEvento(new Date('2026-11-18T12:00:00-03:00')), 21); // testes antes da festa
  assert.equal(diaDoEvento(new Date('2026-11-21T23:59:00-03:00')), 21);
  assert.equal(diaDoEvento(new Date('2026-11-22T00:00:30-03:00')), 22);
  assert.equal(diaDoEvento(new Date('2026-11-22T02:30:00Z')), 21);      // 23h30 do dia 21 em SP
  assert.equal(diaDoEvento(new Date('2026-11-25T10:00:00-03:00')), 22); // atrasadas
});

test('dias visíveis', () => {
  const dia22 = new Date('2026-11-22T15:00:00-03:00');
  assert.deepEqual(diasVisiveis('auto', dia22), [22]);
  assert.deepEqual(diasVisiveis('21', dia22), [21]);
  assert.deepEqual(diasVisiveis('ambos', dia22), [21, 22]);
});

const webhook = (key, message, extra = {}) => ({
  event: 'messages.upsert', instance: 'cha',
  data: { key: { id: 'ABC', fromMe: false, remoteJid: '5555999990000@s.whatsapp.net', ...key }, pushName: 'Maria Clara Souza', messageTimestamp: 1795000000, message, ...extra },
});

test('webhook: foto com legenda', () => {
  const m = interpretar(webhook({}, { imageMessage: { mimetype: 'image/jpeg', caption: '  Parabéns! ' }, base64: 'QUJD' }));
  assert.equal(m.tipo, 'foto');
  assert.equal(m.remetente, 'Maria');
  assert.equal(m.legenda, 'Parabéns!');
  assert.equal(m.base64, 'QUJD');
  assert.equal(m.origem_id, 'ABC');
  assert.equal(m.contato, '5555999990000@s.whatsapp.net');
});

test('webhook: foto de álbum embrulhada e sem base64', () => {
  const m = interpretar(webhook({}, { associatedChildMessage: { message: { imageMessage: { mimetype: 'image/jpeg' } } } }));
  assert.equal(m.tipo, 'foto');
  assert.equal(m.legenda, null);
  assert.equal(m.base64, null);
});

test('webhook: ignora grupo, mensagem própria, status e outros eventos', () => {
  const foto = { imageMessage: { mimetype: 'image/jpeg' } };
  assert.equal(interpretar(webhook({ remoteJid: '120363@g.us' }, foto)), null);
  assert.equal(interpretar(webhook({ fromMe: true }, foto)), null);
  assert.equal(interpretar(webhook({ remoteJid: 'status@broadcast' }, foto)), null);
  assert.equal(interpretar({ event: 'connection.update', data: {} }), null);
  assert.equal(interpretar(null), null);
});

test('webhook: texto, áudio e vídeo viram "outro" (pede foto)', () => {
  assert.equal(interpretar(webhook({}, { conversation: 'oi' })).tipo, 'outro');
  assert.equal(interpretar(webhook({}, { videoMessage: {} })).tipo, 'outro');
  assert.equal(interpretar(webhook({ remoteJid: '123456@lid' }, { audioMessage: {} })).tipo, 'outro');
});

test('nome exibido: só o primeiro, sem lixo', () => {
  assert.equal(primeiroNome('João Pedro'), 'João');
  assert.equal(primeiroNome('  '), 'Convidado');
  assert.equal(primeiroNome(undefined), 'Convidado');
  assert.equal(primeiroNome('<b>x</b>'), 'bx/b');
});

test('moderação: só "aprovar" explícito vai para a TV', () => {
  assert.equal(statusDoVeredito({ decisao: 'aprovar' }), 'aprovada');
  assert.equal(statusDoVeredito({ decisao: 'reprovar' }), 'reprovada');
  assert.equal(statusDoVeredito({ decisao: 'duvida' }), 'revisao');
  assert.equal(statusDoVeredito({ decisao: 'qualquer coisa' }), 'revisao');
  assert.equal(statusDoVeredito(null), 'revisao');
});

test('instagram: acha a URL nos formatos documentados', () => {
  assert.equal(urlDaMidia({ story: { mention: { link: 'https://cdn/a' } } }), 'https://cdn/a');
  assert.equal(urlDaMidia({ attachments: { data: [{ image_data: { url: 'https://cdn/b' } }] } }), 'https://cdn/b');
  assert.equal(urlDaMidia({ attachments: { data: [{ type: 'story_mention', payload: { url: 'https://cdn/c' } }] } }), 'https://cdn/c');
  assert.equal(urlDaMidia({ message: 'oi' }), null);
});
