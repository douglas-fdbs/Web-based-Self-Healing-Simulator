/*
 * Gera docs/VALIDACAO.md a partir das simulações, para que as tabelas do
 * relatório saiam diretamente do código validado.
 *   node tools/validation-report.js
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'js');
['core/complex', 'core/network', 'core/shortcircuit', 'core/protection', 'core/selfhealing', 'core/simulator',
  'data/aquiraz_tcc2015', 'data/aquiraz_nobre2013', 'data/lab_tests'].forEach((f) => require(path.join(root, `${f}.js`)));
const SH = globalThis.SH;
const N = SH.network;
const SC = SH.shortcircuit;

const nf = (v, d = 1) => (v == null || !isFinite(v) ? '-' : v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const out = [];
const p = (s = '') => out.push(s);

p('# Validação do simulador');
p();
p('Documento gerado automaticamente por `node tools/validation-report.js` a partir do código do simulador.');
p('Os mesmos casos são verificados pela suíte `npm test` (`tests/validation.test.js`).');
p();

// ---------------------------------------------------------------- Tab 4.7
const tcc = N.buildModel(SH.scenarios.tcc2015);
p('## 1. Curto-circuito: Tabela 4.7 do TCC (Rodrigues, 2015)');
p();
p('Barras da configuração de alcance máximo de cada alimentador (Fig. 4.6), alimentadas pela SE AQZ. Correntes em A.');
p();
p('| Alimentador | Barra | Icc3F sim. | Icc3F TCC | Icc2F sim. | Icc2F TCC | IccFT sim. | IccFT TCC | IccFTm sim. | IccFTm TCC | Maior erro |');
p('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
let worst47 = 0;
SH.scenarios.tcc2015.validation.tab47.forEach((v) => {
  const r = SC.pathFault(tcc, 'AQZ', v.path);
  const sim = [r.i3f, r.i2f, r.ift, r.iftm];
  const errs = sim.map((x, i) => Math.abs((x - v.tcc[4 + i]) / v.tcc[4 + i]) * 100);
  const e = Math.max(...errs);
  worst47 = Math.max(worst47, e);
  p(`| ${v.feeder} | ${v.bus} | ${sim.map((x, i) => `${nf(x)} | ${nf(v.tcc[4 + i])}`).join(' | ')} | ${nf(e, 3)}% |`);
});
p();
p(`Maior erro relativo: **${nf(worst47, 3)}%** (arredondamento das impedâncias publicadas).`);
p();

// ---------------------------------------------------------------- Planilha do TCC
p('## 2. Curto-circuito: planilha de cálculos do TCC (fontes AQZ, ESB e AGF)');
p();
p('Aba "Z(pu) Acumulado e curtocircuito" da planilha do autor (pasta ARTIGO_REI). Inclui os caminhos alimentados pelas SEs ESB e AGF, que a Tab. 4.7 não traz. Correntes em A.');
p();
p('| Fonte | Alimentador | Barra | Icc3F sim. | Icc3F ref. | IccFT sim. | IccFT ref. | Maior erro (4 tipos) |');
p('|---|---|---|---:|---:|---:|---:|---:|');
let worstPl = 0;
SH.scenarios.tcc2015.validation.planilha.forEach(([src, feeder, bus, segs, ...ref]) => {
  const r = SC.pathFault(tcc, src, segs);
  const sim = [r.i3f, r.i2f, r.ift, r.iftm];
  const e = Math.max(...sim.map((x, i) => Math.abs((x - ref[i]) / ref[i]) * 100));
  worstPl = Math.max(worstPl, e);
  if (src !== 'AQZ') p(`| ${src} | ${feeder} | ${bus} | ${nf(sim[0])} | ${nf(ref[0])} | ${nf(sim[2])} | ${nf(ref[2])} | ${nf(e, 4)}% |`);
});
p();
p(`Tabela acima: só as 18 barras alimentadas por ESB e AGF. Nas ${SH.scenarios.tcc2015.validation.planilha.length} barras da planilha (incluindo as 24 alimentadas pela SE AQZ), o maior erro relativo é **${nf(worstPl, 4)}%**.`);
p();

// ---------------------------------------------------------------- Tab 3.6 Nobre
const nob = N.buildModel(SH.scenarios.nobre2013);
p('## 3. Curto-circuito: Tabela 3.6 de Nobre (2013), primeira topologia');
p();
p('| Trecho | Fonte | Icc3F sim. | Icc3F ref. | Icc2F sim. | Icc2F ref. | IccFT sim. | IccFT ref. | IccFTm sim. | IccFTm ref. | Maior erro |');
p('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
let worst36 = 0;
SH.scenarios.nobre2013.validation.tab36.forEach((v) => {
  const r = SC.pathFault(nob, v.source, v.path);
  const sim = [r.i3f, r.i2f, r.ift, r.iftm];
  const e = Math.max(...sim.map((x, i) => Math.abs((x - v.tcc[4 + i]) / v.tcc[4 + i]) * 100));
  worst36 = Math.max(worst36, e);
  p(`| ${v.seg} | ${v.source} | ${sim.map((x, i) => `${nf(x, 2)} | ${nf(v.tcc[4 + i], 2)}`).join(' | ')} | ${nf(e, 4)}% |`);
});
p();
p(`Maior erro relativo: **${nf(worst36, 4)}%**.`);
p();

// ---------------------------------------------------------------- Recomposição
// manobras do SRA como "Verbo DISPOSITIVO" (dispositivo lido do evento, não do texto)
const sraActs = (res, model = tcc) => res.log.filter((e) => e.cat === 'sra' && e.dev && /^(Abrir|Fechar|Religar)/.test(e.text))
  .map((e) => `${e.text.split(' ')[0]} ${model.switches[e.dev].label || e.dev}`);
p('## 4. Recomposição automática: Tabela 4.2 de Nobre (2013)');
p();
p('Falta trifásica permanente no meio de cada trecho, configuração normal, esquema convencional, self-healing ligado.');
p();
p('| Falta | Bloqueio (proteção) | Manobras do SRA (simulador) | Esperado (Nobre, Tab. 4.2) | Confere |');
p('|---|---|---|---|:---:|');
SH.scenarios.nobre2013.validation.tab42.forEach((v) => {
  const seg = nob.segments[v.fault] ? v.fault : `${v.fault}a`;
  const res = SH.simulator.run(nob, { script: [{ t: 0, type: 'fault', spec: { kind: 'segment', seg, x: 0.5, type: '3F' } }] });
  const blk = res.log.filter((e) => e.cat === 'bloqueio').map((e) => nob.switches[e.dev].label || e.dev).join(', ');
  const acts = sraActs(res, nob);
  const opened = acts.filter((a) => a.startsWith('Abrir')).map((a) => a.slice(6));
  const closed = acts.filter((a) => a.startsWith('Fechar')).map((a) => a.slice(7));
  const reclosed = acts.filter((a) => a.startsWith('Religar')).map((a) => a.slice(8));
  const okOpen = JSON.stringify(opened.slice().sort()) === JSON.stringify(v.open.slice().sort());
  const okClose = JSON.stringify(closed.slice().sort()) === JSON.stringify(v.close.slice().sort());
  const exp = v.open.length || v.close.length ? `abre ${v.open.join(', ') || '-'}; fecha ${v.close.join(', ') || '-'}` : 'nenhuma';
  const sim = acts.length ? acts.join('; ') : 'nenhuma';
  p(`| ${v.fault} | ${blk} | ${sim} | ${exp} | ${okOpen && okClose ? 'sim' : 'não'}${reclosed.length ? '¹' : ''} |`);
});
p();
p('¹ Com os ajustes de Nobre (instantâneos sem atraso intencional), uma falta no meio de T8 (3,3 kA) supera o pickup instantâneo de 21I5 (2,5 kA) e de RS3 (1,72 kA): os dois abrem. O SRA isola a falta e religa 21I5, manobra que não aparece na Tab. 4.2 porque aquela tabela supõe atuação seletiva.');
p();

p('## 5. Recomposição na rede atual (TCC, Fig. 4.2)');
p();
p('| Caso | Manobras do SRA | Carga sem suprimento ao final | Observação |');
p('|---|---|---:|---|');
const tccCases = [
  ['Falta em T1 (Fig. 4.3)', { script: [{ t: 0, type: 'fault', spec: { kind: 'segment', seg: 'T1', x: 0.5, type: '3F' } }] }, 'reproduz a Fig. 4.3 do TCC'],
  ['Falta em T5', { script: [{ t: 0, type: 'fault', spec: { kind: 'segment', seg: 'T5', x: 0.5, type: '3F' } }] }, ''],
  ['Falta em T8', { script: [{ t: 0, type: 'fault', spec: { kind: 'segment', seg: 'T8', x: 0.5, type: '3F' } }] }, ''],
  ['Falta em T12', { script: [{ t: 0, type: 'fault', spec: { kind: 'segment', seg: 'T12', x: 0.5, type: '3F' } }] }, 'T13+T14 levaria T16 a 454 A > 438 A: só T14 é recomposto'],
  ['Falta em T16', { script: [{ t: 0, type: 'fault', spec: { kind: 'segment', seg: 'T16', x: 0.5, type: '3F' } }] }, ''],
  ['Perda da SE ESB', { script: [{ t: 0, type: 'sourceLoss', source: 'ESB' }] }, ''],
  ['Falta no barramento 13,8 kV da SE AQZ', { script: [{ t: 0, type: 'fault', spec: { kind: 'bus', node: 'AQZ', type: '3F' } }] }, 'coerente com Vieira (2015): parte de 21I4 não cabe na SE AGF'],
];
tccCases.forEach(([name, input, obs]) => {
  const res = SH.simulator.run(tcc, input);
  const acts = sraActs(res);
  const last = res.snaps[res.snaps.length - 1];
  p(`| ${name} | ${acts.join('; ') || 'nenhuma'} | ${nf(last.unserved, 0)} A | ${obs} |`);
});
p();

// ---------------------------------------------------------------- Ensaios
p('## 6. Ensaios do Capítulo 5 do TCC contra os relatórios da mala de testes');
p();
p('Os valores "Medido" vêm dos relatórios do Sequenc (mala Conprove CE-6006, out/2015) da pasta ARTIGO_REI: instantes das transições GOOSE (GI) menos os 100 ms de pré-falta, ou intervalo entre duas transições. As correntes injetadas confirmam os pontos de falta usados (9.419 A, 10.176 A, 4.715 A, 3.309 A e 2.145 A primários).');
p();
p(`Os presets reproduzem o laboratório: ajustes do arquivo do SEL-751 usado nos ensaios quando diferem da Tab. 4.13 (ciclo 2I+2T de AQZ, atraso de 0,02 s no 50 de RL2), disjuntor de 50 ms (atraso programado na mala), GOOSE de 3 ms e tempo de processamento do relé de ${nf(SH.labs.LAB_DELAY * 1000, 0)} ms nos elementos 50/50N e no 50BF. Esse valor é a mediana do atraso entre o tempo ajustado e o GOOSE de trip nos ensaios trifásicos (10 a 16 ms; no 50BF, 8 a 13 ms).`);
p();
p('| Ensaio | Medida | TCC (texto) | Medido | Simulado | Diferença |');
p('|---|---|---|---:|---:|---:|');
SH.labs.tests.forEach((t) => {
  const res = SH.simulator.run(tcc, SH.labs.buildInput(tcc, t));
  t.measures.forEach((m, i) => {
    const v = SH.labs.measure(res, m);
    const txt = typeof v === 'number' ? (m.unit === 'ms' ? `${nf(v, 1)} ms` : nf(v, 0)) : String(v);
    const meas = typeof m.lab === 'number' ? `${nf(m.lab, 1)} ms` : (m.labText || '-');
    const diff = typeof m.lab === 'number' && typeof v === 'number' ? `${v - m.lab >= 0 ? '+' : ''}${nf(v - m.lab, 1)} ms` : '';
    p(`| ${i === 0 ? `${t.ref.split(';')[0].split(',')[0]}: ${t.title}` : ''} | ${m.label} | ${m.tcc} | ${meas} | ${txt} | ${diff} |`);
  });
});
p();
p(SH.labs.CLEAR_NOTE);
p();
p('Leitura:');
p();
p('- Tempos de trip e intervalos entre GOOSEs ficam a até 12 ms dos medidos. A exceção é o trip de RS4 no ensaio monofásico com 50BF (medido 9 ms acima do simulado), em que a corrente fica só 24% acima do pickup do 50P e a detecção é mais lenta.');
p('- Sem o tempo de processamento, os intervalos trip → trip remoto ficariam 13 a 14 ms abaixo dos medidos (203 ms contra 216 a 218 ms).');
p('- No ensaio 5.7.3(a), com o atraso real de RL2 (0,02 s), o modelo ideal faria o 50BF chegar a RS4 antes da curva 51 (trip remoto em 223 ms contra 232 ms), ao contrário do medido. Com o processamento calibrado o 50BF sai em 246 ms e a 51 vence, como no laboratório (238 ms contra 246 ms).');
p('- Nos ensaios monofásicos a mala injetou só as fases. Os tempos medidos só são reproduzidos com os elementos de neutro fora de serviço: com o 51N de 21I5 (25 A, dial 0,43, MI) ativo, o ensaio AQZ-RL1 sem 50BF terminaria em cerca de 200 ms, e não em 654 ms. Esses relatórios validam os elementos de fase com corrente monofásica, não a proteção de neutro.');
p('- O texto do TCC cita 204 ms para o ensaio 5.7.3(b); o relatório desse ensaio registra 214 ms, e 204,8 ms é o valor do ensaio 5.7.3(a).');
p();
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'VALIDACAO.md'), `${out.join('\n')}\n`);
console.log(`docs/VALIDACAO.md gerado (${out.length} linhas).`);
