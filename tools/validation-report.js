/*
 * Gera docs/VALIDACAO.md a partir das simulações, para que as tabelas do
 * relatório saiam diretamente do código validado.
 *   node tools/validation-report.js
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'js');
['core/complex', 'core/network', 'core/shortcircuit', 'core/protection', 'core/selfhealing', 'core/simulator', 'core/coordination',
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
p(`Os presets reproduzem o laboratório: ajustes do arquivo do SEL-751 usado nos ensaios quando diferem da Tab. 4.13 (atraso de 0,02 s no 50 de RL2; os ciclos de religamento do laboratório coincidem com os da base, lida pelo critério do autor), disjuntor de 50 ms (atraso programado na mala), GOOSE de 3 ms e tempo de processamento do relé de ${nf(SH.labs.LAB_DELAY * 1000, 0)} ms nos elementos 50/50N e no 50BF. Esse valor é a mediana do atraso entre o tempo ajustado e o GOOSE de trip nos ensaios trifásicos (10 a 16 ms; no 50BF, 8 a 13 ms).`);
p();
p('| Ensaio | Medida | TCC (texto) | Medido | Simulado | Diferença |');
p('|---|---|---|---:|---:|---:|');
SH.labs.tests.forEach((t) => {
  const res = SH.simulator.run(tcc, SH.labs.buildInput(tcc, t));
  t.measures.forEach((m, i) => {
    const v = SH.labs.measure(res, m);
    const fv = (x) => (m.unit === 'ms' ? `${nf(x, 1)} ms` : m.unit === 's' ? `${nf(x, 2)} s` : nf(x, 0));
    const txt = typeof v === 'number' ? fv(v) : String(v);
    const meas = typeof m.lab === 'number' ? fv(m.lab) : (m.labText || '-');
    const d = typeof m.lab === 'number' && typeof v === 'number' ? v - m.lab : null;
    const diff = d == null ? '' : (m.unit === 's' ? `${d >= 0 ? '+' : ''}${nf(d * 1000, 0)} ms` : `${d >= 0 ? '+' : ''}${nf(d, 1)} ms`);
    p(`| ${i === 0 ? `${t.ref.split(';')[0].split(',')[0]}: ${t.title}` : ''} | ${m.label} | ${m.tcc} | ${meas} | ${txt} | ${diff} |`);
  });
});
p();
p(SH.labs.CLEAR_NOTE);
p();
p('### 6.1 Sobrecorrente (seção 5.5 e Apêndice A)');
p();
p(`Pontos I × t dos quatro relés, com os ajustes secundários do relé ensaiado. O simulado usa as equações do motor (curva IEC limitada a M = 30 e tempo definido com ${nf(SH.labs.LAB_DELAY * 1000, 0)} ms de processamento).`);
p();
p('| Relé | I (A sec.) | Elemento | Medido | Simulado | Diferença | Status na mala |');
p('|---|---:|---|---:|---:|---:|---|');
let w51 = 0;
let w50 = 0;
SH.labs.overcurrent.forEach((r) => r.points.forEach(([I, t, st], i) => {
  const sim = SH.labs.overcurrentTime(r.set, I);
  if (sim.el === '51') w51 = Math.max(w51, Math.abs((sim.t - t) / t) * 100); else w50 = Math.max(w50, Math.abs(sim.t - t) * 1000);
  p(`| ${i === 0 ? r.id : ''} | ${nf(I, 1)} | ${sim.el} | ${nf(t * 1000, 1)} ms | ${nf(sim.t * 1000, 1)} ms | ${sim.t - t >= 0 ? '+' : ''}${nf((sim.t - t) * 1000, 1)} ms | ${st} |`);
}));
p();
p(`Maior erro nos pontos de curva: **${nf(w51, 2)}%**. Maior diferença nos pontos de tempo definido: **${nf(w50, 1)} ms**.`);
p();
p(SH.labs.OVERCURRENT_NOTE);
p();
p('Leitura:');
p();
p('- Tempos de trip e intervalos entre GOOSEs ficam a até 12 ms dos medidos. A exceção é o trip de RS4 no ensaio monofásico com 50BF (medido 9 ms acima do simulado), em que a corrente fica só 24% acima do pickup do 50P e a detecção é mais lenta.');
p('- Sem o tempo de processamento, os intervalos trip → trip remoto ficariam 13 a 14 ms abaixo dos medidos (203 ms contra 216 a 218 ms).');
p('- No ensaio 5.7.3(a), com o atraso real de RL2 (0,02 s), o modelo ideal faria o 50BF chegar a RS4 antes da curva 51 (trip remoto em 223 ms contra 232 ms), ao contrário do medido. Com o processamento calibrado o 50BF sai em 246 ms e a 51 vence, como no laboratório (238 ms contra 246 ms).');
p('- Nos ensaios monofásicos a mala injetou só as fases. Os tempos medidos só são reproduzidos com os elementos de neutro fora de serviço: com o 51N de 21I5 (25 A, dial 0,43, MI) ativo, o ensaio AQZ-RL1 sem 50BF terminaria em cerca de 200 ms, e não em 654 ms. Esses relatórios validam os elementos de fase com corrente monofásica, não a proteção de neutro.');
p('- O texto do TCC cita 204 ms para o ensaio 5.7.3(b); o relatório desse ensaio registra 214 ms, e 204,8 ms é o valor do ensaio 5.7.3(a).');
p();
// ---------------------------------------------------------------- Critérios
p('## 7. Critérios de coordenação e sensibilidade (seção 4.7.1) e pontos críticos (seção 4.7.3)');
p();
p('Verificação estática nas cadeias de alcance máximo da Fig. 4.6 (módulo `js/core/coordination.js`), com falta trifásica e fase-terra na barra de cada relé a jusante e no fim da zona dele. "Descoordenado" = margem menor que a abertura do disjuntor (50 ms); critério = 0,4 s entre barra e alimentador (Tab. 4.9) e 0,3 s ao longo do alimentador.');
p();
const schemesC = [
  ['Convencional (50 da barra bloqueado, seção 3.3.2)', {}],
  ['50 da barra habilitado, sem seletividade lógica', { busInst50: true }],
  ['Seletividade lógica (bloqueio do 50)', { sl: true, busInst50: true }],
  ['Seletividade lógica estendida ao 51 + retaguarda de 200 ms (solução do TCC)', { sl: true, busInst50: true, slBlocks51: true }],
];
p('| Esquema | Pares descoordenados | Pares abaixo do critério | Pares verificados |');
p('|---|---:|---:|---:|');
schemesC.forEach(([name, o]) => {
  const r = SH.coordination.check(tcc, o);
  p(`| ${name} | ${r.pairs.filter((x) => x.status === 'descoordenado').length} | ${r.pairs.filter((x) => x.status === 'abaixo do critério').length} | ${r.pairs.length} |`);
});
p();
p('Pontos críticos citados no TCC e o que a verificação encontra:');
p();
const conv = SH.coordination.check(tcc, { busInst50: true });
const find = (u, d, w) => conv.pairs.filter((x) => x.up === u && x.down === d && (!w || x.where.startsWith(w)));
const fmtP = (x) => `${x.fault} ${nf(x.I, 0)} A: jusante ${nf(x.tDown * 1000, 0)} ms, montante ${nf(x.tUp * 1000, 0)} ms (${x.status})`;
p(`1. Barra x alimentador (01Zn e 21In), com o 50 da barra habilitado: ${fmtP(find('01Z2', '21I5')[0])}.`);
p(`2. 21I5 x RS4: ${fmtP(find('21I5', 'RS4', 'barra')[0])}.`);
p(`3. RS1 x RL1: ${fmtP(find('RS1', 'RL1', 'fim')[0])}.`);
p();
p('A maior parte das faltas fase-terra fica descoordenada no esquema convencional porque os 50N dos religadores de linha têm atrasos de 10 a 30 ms uns sobre os outros, menores que a abertura do disjuntor. É a mesma conclusão da seção 4.8 do TCC ("alta sensibilidade das proteções de sobrecorrente de neutro").');
p();
p('Sensibilidade (múltiplo do pickup na primeira barra remota, 2F para fase e FT para neutro):');
p();
p('| Relé | Barra remota | M fase | M neutro |');
p('|---|---|---:|---:|');
conv.sensitivity.forEach((x) => p(`| ${x.dev} | ${x.remote} | ${nf(x.mPhase, 2)}${x.okPhase ? '' : ' (< 2,4)'} | ${nf(x.mGround, 1)}${x.okGround ? '' : ' (< 4,0)'} |`));
p();
p('RS5 e RL4 ficam abaixo do múltiplo 2,4 de fase para o curto bifásico na barra remota. O TCC não informa qual curto usa no critério; com o trifásico, RS5 passa (2,68) e RL4 continua abaixo (2,35).');
p();
// ---------------------------------------------------------------- Fig. 4.2 x TCC e planilha
p('## 8. Conferência da rede base (Fig. 4.2) com o TCC e a planilha do autor');
p();
const zr = Object.entries(SH.scenarios.tcc2015.validation.planilhaZ).map(([t, ref]) => {
  const z = tcc.segments[t];
  return Math.max(...[z.z1.re, z.z1.im, z.z0.re, z.z0.im].map((x, i) => Math.abs(x - ref[i])));
});
p(`- Impedâncias dos 16 trechos (Tab. 4.6 no simulador) contra a aba "Impedâncias dos Trechos" da planilha: maior diferença de ${nf(Math.max(...zr) * 1e4, 2)} × 10⁻⁴ pu.`);
p('- Valores da Fig. 4.6 (curtos e cargas por trecho): iguais aos da Tab. 4.7 e da Tab. 4.2, já conferidos acima, exceto Icc2F = 972,7 A na barra RL2 (Fig. 4.6c; a Tab. 4.7 dá 907,7 A) e IccFTm = 75,3 A na barra RS7 (Fig. 4.6d; a Tab. 4.7 dá 75,6 A).');
p('- As sete configurações de alcance máximo (quatro alimentadores da SE AQZ na Fig. 4.6 e os de ESB e AGF na planilha) não têm fontes em paralelo nem trecho acima da ampacidade.');
p();
p('### 8.1 Tab. 4.8: curto e carga máximos por relé');
p();
p('| Relé | Icc máx. sim. | Icc máx. TCC | Carga máx. sim. | Carga máx. TCC | Icc/FS | Ic/FT | Ipk/FT | RTC |');
p('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
SH.coordination.ctCheck(tcc).forEach((r) => p(`| ${r.dev} | ${nf(r.icc, 1)} | ${nf(r.iccRef, 1)} | ${nf(r.ic, 0)} | ${nf(r.icRef, 0)} | ${nf(r.iccFS, 0)} | ${nf(r.icFT, 0)} | ${nf(r.ipkFT, 0)} | ${r.rtc} |`));
p();
p('Linhas 21S7, 21S1, 21I2 e RS7: aba "Dimensionamento TC e TP" da planilha (não constam da Tab. 4.8). Nos alimentadores da SE AQZ, Icc/FS = 509 A supera em 1,8% o primário do TC escolhido no TCC (500 A).');
p();
p('### 8.2 Tab. 4.13 contra os critérios de tempo (Tabs. 4.11 e 4.12)');
p();
p('| Relé | 51P na própria barra (3F) | 51N na própria barra (FT) | Alvo | Dial de fase |');
p('|---|---:|---:|---:|---:|');
const seen = new Set();
SH.coordination.check(tcc, {}).sensitivity.forEach((x) => {
  const k = `${x.chain}/${x.dev}`;
  if (seen.has(k)) return;
  seen.add(k);
  p(`| ${x.dev} (${x.chain}) | ${nf(x.t51P * 1000, 0)} ms | ${nf(x.t51N * 1000, 0)} ms | ${nf(x.t51Target * 1000, 0)} ms | ${nf(x.dialP, 2)} |`);
});
p();
p('Os religadores da SE atuam em 200 ms na própria barra, como pede a Tab. 4.11, e RS4 em 97 ms (alvo de 100 ms). Os demais religadores de linha estão com o dial no mínimo do SEL-751 para curvas IEC (0,05, faixa citada na OAP) e ficam entre 103 e 342 ms na fase: a planilha do autor calcula dials menores que 0,05, ou tempos negativos, e adota o mínimo. No neutro todos ficam abaixo de 100 ms.');
p();
p('### 8.3 Conjunto extra: ajustes de campo (Anexo B)');
p();
p('Com os ajustes do Anexo B (atrasos do 50/50N: 0,1 s nos alimentadores, pela OAP 165/2013, e os da Tab. 4.13 nos religadores de linha, porque o Anexo B não os informa):');
p();
const scnB = JSON.parse(JSON.stringify(SH.scenarios.tcc2015));
Object.assign(scnB.relays, scnB.settingsSets.anexoB.relays);
const mB = N.buildModel(scnB);
p('| Esquema | Base (Tab. 4.13): descoordenados / abaixo | Anexo B: descoordenados / abaixo |');
p('|---|---:|---:|');
schemesC.forEach(([name, o]) => {
  const a = SH.coordination.check(tcc, o);
  const b = SH.coordination.check(mB, o);
  const c = (r) => `${r.pairs.filter((x) => x.status === 'descoordenado').length} / ${r.pairs.filter((x) => x.status === 'abaixo do critério').length}`;
  p(`| ${name} | ${c(a)} | ${c(b)} |`);
});
p();
p('No Anexo B, RS6 e RL4 têm ajustes idênticos (400 A, dial 0,12, 50 em 1.300 A): a margem entre eles é nula em qualquer falta, o que a Tab. 4.13 corrige.');
p();
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'VALIDACAO.md'), `${out.join('\n')}\n`);
console.log(`docs/VALIDACAO.md gerado (${out.length} linhas).`);
