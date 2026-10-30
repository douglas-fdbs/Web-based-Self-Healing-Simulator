/*
 * Validação do simulador contra os valores publicados no TCC (Rodrigues, 2015)
 * e em Nobre (2013). Executar com:  node --test tests/
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..', 'js');
['core/complex', 'core/network', 'core/shortcircuit', 'core/protection', 'core/selfhealing', 'core/simulator',
  'data/aquiraz_tcc2015', 'data/aquiraz_nobre2013', 'data/lab_tests'].forEach((f) => require(path.join(root, `${f}.js`)));
const SH = globalThis.SH;
const N = SH.network;
const SC = SH.shortcircuit;
const tcc = N.buildModel(SH.scenarios.tcc2015);
const nobre = N.buildModel(SH.scenarios.nobre2013);

const relErr = (a, b) => Math.abs(a - b) / Math.abs(b);
const faultScript = (seg, x = 0.5, type = '3F', temporary = false) => [{ t: 0, type: 'fault', spec: { kind: 'segment', seg, x, type }, temporary }];
const sraActions = (res) => res.log.filter((e) => e.cat === 'disjuntor' && /SRA/.test(e.text))
  .map((e) => `${/abriu/.test(e.text) ? 'abre' : 'fecha'} ${e.dev}`);

test('curva IEC: valores de referência da IEC 60255', () => {
  const PR = SH.protection;
  assert.ok(Math.abs(PR.curveTime('NI', 1, 10) - 2.971) < 0.001);
  assert.ok(Math.abs(PR.curveTime('MI', 1, 10) - 1.5) < 1e-9);
  assert.ok(Math.abs(PR.curveTime('EI', 1, 10) - 0.808) < 0.001);
  assert.equal(PR.curveTime('MI', 1, 0.9), Infinity);
  // limitação do múltiplo em 30: 51N de 21I7 (26 A, dial 0,43) fica em 0,2 s
  assert.ok(Math.abs(PR.curveTime('MI', 0.43, 1620 / 26) - 0.43 * 13.5 / 29) < 1e-9);
});

test('ciclo de religamento: notação do TCC', () => {
  const PR = SH.protection;
  assert.deepEqual(PR.parseCycle('1I+2T'), ['I', 'T', 'T']);
  assert.deepEqual(PR.parseCycle('3I'), ['I', 'I', 'I']);
  assert.deepEqual(PR.parseCycle('Bloqueado'), ['I']);
});

test('TCC Tab. 4.6: impedância dos trechos a partir dos cabos (Tab. 4.4 x Tab. 4.5)', () => {
  const scn = SH.scenarios.tcc2015;
  Object.values(tcc.segments).forEach((s) => {
    const sum = [0, 0, 0, 0];
    s.cable.forEach(([c, L]) => {
      const k = scn.cables[c];
      [k.r1, k.x1, k.r0, k.x0].forEach((v, i) => { sum[i] += (v * L) / 1000 / tcc.zbase; });
    });
    [s.z1.re, s.z1.im, s.z0.re, s.z0.im].forEach((ref, i) => {
      assert.ok(Math.abs(sum[i] - ref) <= 6e-4, `${s.id}: ${sum[i].toFixed(4)} x ${ref}`);
    });
  });
});

test('Planilha de cálculos do TCC: curtos a partir de AQZ, ESB e AGF (42 barras, erro < 0,05%)', () => {
  SH.scenarios.tcc2015.validation.planilha.forEach(([src, feeder, bus, segs, ...ref]) => {
    const r = SC.pathFault(tcc, src, segs);
    [r.i3f, r.i2f, r.ift, r.iftm].forEach((x, i) => {
      assert.ok(relErr(x, ref[i]) < 5e-4, `${src} ${feeder}/${bus} coluna ${i}: ${x.toFixed(1)} x ${ref[i]}`);
    });
  });
});

test('TCC Tab. 4.7: curtos 3F, 2F, FT e FTm nas barras (erro < 0,1%)', () => {
  SH.scenarios.tcc2015.validation.tab47.forEach((v) => {
    const r = SC.pathFault(tcc, 'AQZ', v.path);
    [r.i3f, r.i2f, r.ift, r.iftm].forEach((x, i) => {
      assert.ok(relErr(x, v.tcc[4 + i]) < 1e-3, `${v.feeder}/${v.bus} coluna ${i}: ${x.toFixed(1)} x ${v.tcc[4 + i]}`);
    });
  });
});

test('Nobre Tab. 3.6: curtos no fim de cada trecho (erro < 0,01%)', () => {
  SH.scenarios.nobre2013.validation.tab36.forEach((v) => {
    const r = SC.pathFault(nobre, v.source, v.path);
    [r.i3f, r.i2f, r.ift, r.iftm].forEach((x, i) => {
      assert.ok(relErr(x, v.tcc[4 + i]) < 1e-4, `${v.seg} coluna ${i}: ${x.toFixed(2)} x ${v.tcc[4 + i]}`);
    });
  });
});

test('operação normal sem sobrecarga e sem malha (as duas topologias)', () => {
  [tcc, nobre].forEach((m) => {
    const topo = N.analyze(m, N.normalState(m));
    assert.equal(topo.conflicts.length, 0);
    const flows = N.computeFlows(m, topo);
    assert.equal(N.checkLimits(m, topo, flows).overloads.length, 0);
    assert.equal(flows.unserved, 0);
  });
});

test('TCC Fig. 4.3: falta permanente em T1 -> 21I7 bloqueia, SRA abre RS1 e fecha RL1', () => {
  const res = SH.simulator.run(tcc, { script: faultScript('T1') });
  assert.equal(res.log.filter((e) => e.cat === 'trip' && e.dev === '21I7').length, 3); // 1I+2T
  assert.ok(res.log.some((e) => e.cat === 'bloqueio' && e.dev === '21I7'));
  assert.deepEqual(sraActions(res), ['abre RS1', 'fecha RL1']);
  assert.equal(res.finalState.sw.RL1.closed, true);
});

test('TCC: recomposição parcial por ampacidade (falta em T12 abre RS6 e fecha RL4)', () => {
  const res = SH.simulator.run(tcc, { script: faultScript('T12') });
  assert.deepEqual(sraActions(res), ['abre RS5', 'abre RS6', 'fecha RL4']);
  const topo = N.analyze(tcc, res.finalState);
  const flows = N.computeFlows(tcc, topo);
  assert.ok(flows.segFlow.T16.upper <= 438);
  assert.equal(topo.seg.T13.energized, false);
});

test('TCC: falta temporária -> religamento bem-sucedido, sem SRA', () => {
  const res = SH.simulator.run(tcc, { script: faultScript('T2', 0.3, 'FT', true) });
  assert.ok(res.log.some((e) => /temporária extinta/.test(e.text)));
  assert.equal(res.finalState.sw.RS1.closed, true);
  assert.equal(sraActions(res).length, 0);
});

test('TCC: intertravamento impede fechar RL1 em paralelo entre SE AQZ e SE ESB', () => {
  const res = SH.simulator.run(tcc, { script: [{ t: 0, type: 'close', sw: 'RL1' }] });
  assert.equal(res.finalState.sw.RL1.closed, false);
  assert.ok(res.log.some((e) => /intertravamento/.test(e.text)));
});

test('Nobre Tab. 4.2: recomposição para falta em cada trecho', () => {
  SH.scenarios.nobre2013.validation.tab42.forEach((v) => {
    const seg = nobre.segments[v.fault] ? v.fault : `${v.fault}a`;
    const res = SH.simulator.run(nobre, { script: faultScript(seg) });
    // Religamentos de disjuntores que atuaram sem seletividade não constam na
    // Tab. 4.2 (que supõe proteção seletiva) e são verificados à parte.
    const reclosed = res.log.filter((e) => e.cat === 'sra' && /^Religar/.test(e.text)).map((e) => e.dev);
    const acts = sraActions(res).filter((a) => !reclosed.includes(a.split(' ')[1]));
    const opened = acts.filter((a) => a.startsWith('abre')).map((a) => a.slice(5)).sort();
    const closed = acts.filter((a) => a.startsWith('fecha')).map((a) => a.slice(6)).sort();
    assert.deepEqual(opened, v.open.slice().sort(), `${v.fault}: abertura`);
    assert.deepEqual(closed, v.close.slice().sort(), `${v.fault}: fechamento`);
  });
});

// Ensaios do Cap. 5 contra os relatórios da mala CE-6006 (pasta ARTIGO_REI).
// Os presets usam o tempo de processamento calibrado (13 ms nos elementos 50 e no 50BF)
// e os ajustes do relé ensaiado quando diferem da Tab. 4.13.
const lab = (id, extra) => {
  const t = SH.labs.tests.find((x) => x.id === id);
  const input = SH.labs.buildInput(tcc, t);
  if (extra) input.options = Object.assign({}, input.options, extra);
  const res = SH.simulator.run(tcc, input);
  return { t, res, m: (i) => SH.labs.measure(res, t.measures[i]) };
};

test('Ensaios: tempos de trip e intervalos entre GOOSEs dentro de 12 ms dos medidos', () => {
  SH.labs.tests.forEach((t) => {
    const { m } = lab(t.id);
    t.measures.forEach((me, i) => {
      if (typeof me.lab !== 'number' || me.value.type === 'clear') return;
      if (t.id === 's2d' && i === 0) return; // 50P perto do pickup: detecção mais lenta, não modelada
      const v = m(i);
      assert.ok(Math.abs(v - me.lab) <= 12, `${t.id} "${me.label}": simulado ${v.toFixed(1)} x medido ${me.lab}`);
    });
  });
});

test('Ensaios: eliminação simulada 0 a 25 ms antes do pós-falta da mala (recepção do GOOSE pela mala)', () => {
  SH.labs.tests.forEach((t) => {
    const { m } = lab(t.id);
    t.measures.forEach((me, i) => {
      if (me.value.type !== 'clear' || typeof me.lab !== 'number') return;
      const d = me.lab - m(i);
      assert.ok(d >= 0 && d <= 25, `${t.id}: simulado ${m(i).toFixed(1)} x medido ${me.lab}`);
    });
  });
});

test('Ensaio 5.7.3(a): com o atraso real de RL2 (0,02 s), a 51 de RS4 só vence o 50BF com o processamento do relé', () => {
  assert.equal(lab('s3a').res.log.find((e) => e.cat === 'trip' && e.dev === 'RS4').el, 'P51');
  // modelo ideal (sem processamento): o 50BF chegaria antes, ao contrário do medido
  assert.equal(lab('s3a', { relayDelay: 0 }).res.log.find((e) => e.cat === 'trip' && e.dev === 'RS4').el, 'REMTRIP');
});

test('Ensaio 5.7.3(b) e (c): retaguarda +200 ms resolve e cobre a perda do 50BF', () => {
  const b = lab('s3b');
  assert.equal(b.res.log.find((e) => e.cat === 'trip' && e.dev === 'RS4').el, 'REMTRIP');
  const c = lab('s3c');
  assert.equal(c.res.log.find((e) => e.cat === 'trip' && e.dev === 'RS4').el, 'B51');
});

test('Ensaio monofásico AQZ-RL1 sem 50BF: o tempo medido (654 ms) só é reproduzido sem os elementos de neutro', () => {
  const sem = lab('s2e');
  assert.equal(sem.res.log.find((e) => e.cat === 'trip' && e.dev === '21I5').el, 'P51');
  const com = lab('s2e', { groundElements: true });
  const tr = com.res.log.find((e) => e.cat === 'trip' && e.dev === '21I5');
  assert.equal(tr.el, 'N51');
  assert.ok(Math.abs((tr.t - com.res.metrics.faultAt) * 1000 - 200) < 2);
});

test('Ensaio 5.6.1: religamento de 21I5 com a configuração do laboratório (2I + 2T)', () => {
  const { m } = lab('r1');
  assert.equal(m(0), 4);
  assert.ok(Math.abs(m(2) - 200) < 1, `${m(2)}`);
});

test('Ensaio 5.6.2: religamento AQZ + RL1 -> RL1 bloqueia e AQZ termina fechado', () => {
  const { m } = lab('r2');
  assert.equal(m(0), 1);
  assert.equal(m(1), 3);
  assert.equal(m(2), 'fechado');
});

test('Nobre: falta no início de T8 abre 21I5 e RS3 juntos (instantâneos sem atraso); o SRA religa 21I5', () => {
  const res = SH.simulator.run(nobre, { script: faultScript('T8a', 0.5) });
  const tripped = res.log.filter((e) => e.cat === 'trip').map((e) => e.dev).sort();
  assert.deepEqual(tripped, ['AQZ21I5', 'RS3']);
  assert.equal(res.finalState.sw.AQZ21I5.closed, true);
  assert.equal(res.finalState.sw.RL3.closed, true);
});
