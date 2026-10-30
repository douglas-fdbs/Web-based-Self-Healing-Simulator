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

// Ensaios do Cap. 5: tempos esperados recalculados a partir dos ajustes da Tab. 4.13
// (o simulador não modela atrasos internos da mala de testes, daí as tolerâncias).
const lab = (id) => {
  const t = SH.labs.tests.find((x) => x.id === id);
  const res = SH.simulator.run(tcc, SH.labs.buildInput(tcc, t));
  return { t, res, m: (i) => SH.labs.measure(res, t.measures[i]) };
};

test('Ensaio 5.7.1(a): SL + 50BF, intervalo trip -> trip remoto ≈ BFD + GOOSE (TCC: 217 ms)', () => {
  const { m } = lab('s1a');
  assert.ok(Math.abs(m(0) - 203) < 1, `${m(0)}`);
  assert.ok(m(1) > 300 && m(1) < 420, `${m(1)}`);
});

test('Ensaio 5.7.1(b): sem 50BF, AQZ_MT atua pela curva NI (TCC: ≈ 600 ms)', () => {
  const { m } = lab('s1b');
  assert.ok(Math.abs(m(0) - 494) < 2, `${m(0)}`);
  assert.ok(Math.abs(m(1) - 644) < 2, `${m(1)}`);
});

test('Ensaio 5.7.1(c): sem SL, os dois relés atuam em 100 ms (falta de seletividade)', () => {
  const { m } = lab('s1c');
  assert.ok(Math.abs(m(0) - 100) < 1 && Math.abs(m(1) - 100) < 1);
});

test('Ensaio 5.7.2(b): sem 50BF, 21I5 atua pela curva MI em ≈ 430 ms', () => {
  const { m } = lab('s2b');
  assert.ok(Math.abs(m(1) - 427) < 3, `${m(1)}`);
});

test('Ensaio 5.7.3(a): a 51 de RL1 (RS4) atua antes do trip por 50BF', () => {
  const { res } = lab('s3a');
  const trip = res.log.find((e) => e.cat === 'trip' && e.dev === 'RS4');
  assert.equal(trip.el, 'P51');
});

test('Ensaio 5.7.3(b) e (c): retaguarda +200 ms resolve e cobre a perda do GOOSE de 50BF', () => {
  const b = lab('s3b');
  assert.equal(b.res.log.find((e) => e.cat === 'trip' && e.dev === 'RS4').el, 'REMTRIP');
  const c = lab('s3c');
  assert.equal(c.res.log.find((e) => e.cat === 'trip' && e.dev === 'RS4').el, 'B51');
  assert.ok(c.m(1) > b.m(1) + 150);
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
