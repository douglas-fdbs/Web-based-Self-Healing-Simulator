/*
 * Ensaios do Capítulo 5 do TCC (Rodrigues, 2015) e exemplos didáticos.
 *
 * Os ensaios de laboratório usaram os ajustes do alimentador 21I5 com a
 * nomenclatura genérica da Tabela 5.2 do TCC:
 *   AQZ_MT = proteção geral de barramento (01Z2)
 *   AQZ    = religador da SE (21I5)
 *   RL1    = primeiro religador de linha (RS4)
 *   RL2    = segundo religador de linha (RL3 alimentado por 21I5, grupo 2)
 *
 * A mala de testes mantinha a corrente de falta após o trip do relé a jusante
 * ("propositalmente não parou a geração de falta"); aqui isso equivale a
 * simular falha de abertura do disjuntor a jusante.
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});

  const NO_RECLOSE = { reclose: false, sra: false };
  const closeIn21I5 = { kind: 'segment', seg: 'T8', x: 0, type: '3F' }; // logo após 21I5: 9419 A
  const afterRS4 = { kind: 'segment', seg: 'T9', x: 0, type: '3F' }; // logo após RS4: 4715 A
  const afterRL3 = { kind: 'segment', seg: 'T10', x: 0, type: '3F' }; // logo após RL3: 2146 A
  const maxReach21I5 = { RL3: true, '21S1': false }; // RL3 alimentado por 21I5 (Fig. 4.6c)

  const tests = [
    {
      id: 'r1', group: '5.6 Religamento automático', title: 'Religamento de um IED (AQZ = 21I5)',
      ref: 'Seção 5.6.1, Fig. 5.12',
      description: 'Falta permanente logo após 21I5. Configuração do laboratório: torque control "AND (SH0 OR SH1)", isto é, 50 habilitado nas duas primeiras operações e três religamentos.',
      setup: { fault: closeIn21I5, options: { sra: false, cycleOverrides: { '21I5': ['I', 'I', 'T', 'T'] } } },
      measures: [
        { label: 'Número de aberturas do 21I5', tcc: '4 (três religamentos)', value: { type: 'count', dev: '21I5' }, unit: '' },
        { label: '1ª abertura (50P, atraso 100 ms)', tcc: '≈ 100 ms', value: { type: 'tripN', dev: '21I5', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Últimas aberturas, tempo após o religamento (51P)', tcc: '200 ms', value: { type: 'tripAfterClose', dev: '21I5', n: 3 }, unit: 'ms' },
      ],
    },
    {
      id: 'r2', group: '5.6 Religamento automático', title: 'Religamento de dois IEDs (AQZ + RL1)',
      ref: 'Seção 5.6.2, Fig. 5.13',
      description: 'Falta permanente logo após RS4. Os dois religadores atuam na primeira falta; a partir do 2º ciclo o 50 de 21I5 fica bloqueado e só RS4 abre, até bloquear.',
      setup: { fault: afterRS4, options: { sra: false } },
      measures: [
        { label: 'Aberturas de 21I5', tcc: '1 (só na primeira falta)', value: { type: 'count', dev: '21I5' }, unit: '' },
        { label: 'Aberturas de RS4 (RL1)', tcc: 'ciclo completo até bloquear', value: { type: 'count', dev: 'RS4' }, unit: '' },
        { label: 'Estado final de 21I5', tcc: 'fechado, suprindo T8', value: { type: 'finalState', dev: '21I5' }, unit: '' },
      ],
    },
    {
      id: 's1a', group: '5.7.1 AQZ_MT e AQZ', title: 'Seletividade lógica + 50BF',
      ref: 'Seção 5.7.1(a), Fig. 5.14',
      description: 'Falta logo após 21I5 com o disjuntor de 21I5 sem abrir. 21I5 bloqueia o instantâneo de AQZ_MT por GOOSE e, 200 ms após o trip, envia trip por 50BF.',
      setup: { fault: closeIn21I5, stuck: ['21I5'], options: Object.assign({ sl: true, bf: true, busInst50: true }, NO_RECLOSE) },
      measures: [
        { label: 'Trip 50P de 21I5 → trip de AQZ_MT', tcc: '217 ms', value: { type: 'delta', a: '21I5', b: '01Z2' }, unit: 'ms' },
        { label: 'Eliminação da falta', tcc: '≈ 400 ms', value: { type: 'clear' }, unit: 'ms' },
      ],
    },
    {
      id: 's1b', group: '5.7.1 AQZ_MT e AQZ', title: 'Só seletividade lógica (sem 50BF)',
      ref: 'Seção 5.7.1(b), Fig. 5.15',
      description: 'Sem trip remoto, AQZ_MT (com o instantâneo bloqueado) elimina a falta pela curva NI.',
      setup: { fault: closeIn21I5, stuck: ['21I5'], options: Object.assign({ sl: true, bf: false, busInst50: true }, NO_RECLOSE) },
      measures: [
        { label: 'Trip 50P de 21I5 → trip 51P de AQZ_MT', tcc: '476 ms', value: { type: 'delta', a: '21I5', b: '01Z2' }, unit: 'ms' },
        { label: 'Eliminação da falta', tcc: '≈ 650 ms', value: { type: 'clear' }, unit: 'ms' },
      ],
    },
    {
      id: 's1c', group: '5.7.1 AQZ_MT e AQZ', title: 'Sem seletividade lógica e sem 50BF',
      ref: 'Seção 5.7.1(c), Fig. 5.16',
      description: 'Instantâneos habilitados nos dois relés sem bloqueio: ambos abrem e a falta deixa toda a barra desligada.',
      setup: { fault: closeIn21I5, options: Object.assign({ sl: false, bf: false, busInst50: true }, NO_RECLOSE) },
      measures: [
        { label: 'Trip de AQZ_MT', tcc: 'pouco mais de 100 ms', value: { type: 'tripN', dev: '01Z2', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Trip de 21I5', tcc: 'pouco mais de 100 ms', value: { type: 'tripN', dev: '21I5', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Eliminação da falta', tcc: 'pouco menos de 200 ms', value: { type: 'clear' }, unit: 'ms' },
      ],
    },
    {
      id: 's2a', group: '5.7.2 AQZ e RL1', title: 'Seletividade lógica + 50BF',
      ref: 'Seção 5.7.2, Fig. 5.17',
      description: 'Falta logo após RS4 (RL1) com o disjuntor de RS4 sem abrir.',
      setup: { fault: afterRS4, stuck: ['RS4'], options: Object.assign({ sl: true, bf: true, busInst50: true }, NO_RECLOSE) },
      measures: [
        { label: 'Trip 50P de RS4 → trip de 21I5', tcc: '217 ms', value: { type: 'delta', a: 'RS4', b: '21I5' }, unit: 'ms' },
        { label: 'Eliminação da falta', tcc: '≈ 360 ms', value: { type: 'clear' }, unit: 'ms' },
      ],
    },
    {
      id: 's2b', group: '5.7.2 AQZ e RL1', title: 'Só seletividade lógica (sem 50BF)',
      ref: 'Seção 5.7.2, Fig. 5.18',
      description: 'Sem trip remoto, 21I5 elimina a falta pela curva MI.',
      setup: { fault: afterRS4, stuck: ['RS4'], options: Object.assign({ sl: true, bf: false, busInst50: true }, NO_RECLOSE) },
      measures: [
        { label: 'Trip 50P de RS4 → trip 51P de 21I5', tcc: '372 ms', value: { type: 'delta', a: 'RS4', b: '21I5' }, unit: 'ms' },
        { label: 'Trip 51P de 21I5 após a falta', tcc: '≈ 430 ms', value: { type: 'tripN', dev: '21I5', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Eliminação da falta', tcc: '≈ 500 ms', value: { type: 'clear' }, unit: 'ms' },
      ],
    },
    {
      id: 's2c', group: '5.7.2 AQZ e RL1', title: 'Sem seletividade lógica e sem 50BF',
      ref: 'Seção 5.7.2, Fig. 5.19',
      description: 'Os dois religadores atuam pelo instantâneo (falta de seletividade).',
      setup: { fault: afterRS4, options: Object.assign({ sl: false, bf: false, busInst50: true }, NO_RECLOSE) },
      measures: [
        { label: 'Trip de RS4', tcc: 'atua', value: { type: 'tripN', dev: 'RS4', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Trip de 21I5', tcc: 'também atua', value: { type: 'tripN', dev: '21I5', n: 0, rel: 'fault' }, unit: 'ms' },
      ],
    },
    {
      id: 's3a', group: '5.7.3 RL1 e RL2', title: 'SL bloqueando só o 50 + 50BF',
      ref: 'Seção 5.7.3, Fig. 5.20',
      description: 'RL3 (RL2 do ensaio) alimentado por 21I5, falta logo após RL3 com o disjuntor sem abrir. A curva 51 de RS4 atua antes do trip por 50BF.',
      note: 'O TCC não informa a corrente injetada; usa-se o curto trifásico na barra RL3 da Tab. 4.7 (2146 A).',
      setup: { fault: afterRL3, stateMods: maxReach21I5, stuck: ['RL3'], options: Object.assign({ sl: true, bf: true, busInst50: true }, NO_RECLOSE) },
      measures: [
        { label: 'Elemento que abriu RS4', tcc: '51 (antes do 50BF)', value: { type: 'tripElement', dev: 'RS4' }, unit: '' },
        { label: 'Trip 50P de RL3 → trip de RS4', tcc: '< 50BF', value: { type: 'delta', a: 'RL3', b: 'RS4' }, unit: 'ms' },
      ],
    },
    {
      id: 's3b', group: '5.7.3 RL1 e RL2', title: 'SL bloqueando 50 e 51 + retaguarda (+200 ms) + 50BF',
      ref: 'Seção 5.7.3, Fig. 5.21',
      description: 'Solução proposta no TCC: o bloqueio se estende ao 51 e uma 51 de retaguarda com somador de 0,20 s garante a proteção se o 50BF falhar.',
      note: 'Corrente de falta adotada: 2146 A (barra RL3, Tab. 4.7).',
      setup: { fault: afterRL3, stateMods: maxReach21I5, stuck: ['RL3'], options: Object.assign({ sl: true, bf: true, slBlocks51: true, busInst50: true }, NO_RECLOSE) },
      measures: [
        { label: 'Trip 50P de RL3 → trip de RS4', tcc: '204 ms', value: { type: 'delta', a: 'RL3', b: 'RS4' }, unit: 'ms' },
        { label: 'Eliminação da falta', tcc: '≈ 300 ms', value: { type: 'clear' }, unit: 'ms' },
      ],
    },
    {
      id: 's3c', group: '5.7.3 RL1 e RL2', title: 'Mesmo esquema com perda do GOOSE de 50BF',
      ref: 'Seção 5.7.3, Fig. 5.22',
      description: 'A mensagem de trip por 50BF não chega: RS4 abre pela 51 de retaguarda, com atraso maior.',
      note: 'Corrente de falta adotada: 2146 A (barra RL3, Tab. 4.7).',
      setup: { fault: afterRL3, stateMods: maxReach21I5, stuck: ['RL3'], options: Object.assign({ sl: true, bf: true, slBlocks51: true, busInst50: true, commFail: 'BF' }, NO_RECLOSE) },
      measures: [
        { label: 'Elemento que abriu RS4', tcc: '51 de retaguarda (Phase TOC)', value: { type: 'tripElement', dev: 'RS4' }, unit: '' },
        { label: 'Eliminação da falta', tcc: 'atraso maior que no caso anterior', value: { type: 'clear' }, unit: 'ms' },
      ],
    },
  ];

  const examples = [
    { id: 'ex-fig43', scenario: 'tcc2015', title: 'Fig. 4.3: falta permanente em T1', description: '21I7 religa duas vezes e bloqueia; o SRA abre RS1 e fecha RL1, e T2 passa a ser suprido pela SE ESB.', fault: { kind: 'segment', seg: 'T1', x: 0.5, type: '3F' } },
    { id: 'ex-temp', scenario: 'tcc2015', title: 'Falta temporária em T2', description: 'RS1 abre pelo instantâneo, a falta se extingue no tempo morto e o religamento é bem-sucedido.', fault: { kind: 'segment', seg: 'T2', x: 0.3, type: 'FT' }, temporary: true },
    { id: 'ex-t12', scenario: 'tcc2015', title: 'Falta em T12: recomposição parcial', description: 'A SE AGF não comporta T13+T14 (T16 iria a 454 A > 438 A). O SRA abre RS6 e recompõe só T14.', fault: { kind: 'segment', seg: 'T12', x: 0.5, type: '3F' } },
    { id: 'ex-ftm', scenario: 'tcc2015', title: 'Falta fase-terra mínima em T5', description: 'Falta com resistência de contato de 100 Ω: só os elementos de neutro enxergam a corrente.', fault: { kind: 'segment', seg: 'T5', x: 0.6, type: 'FTm' } },
    { id: 'ex-esb', scenario: 'tcc2015', title: 'Perda da SE Eusébio', description: 'O SRA isola o barramento sem fonte e transfere T3/T4 e T7/T10/T11 para a SE AQZ.', sourceLoss: 'ESB' },
    { id: 'ex-bus', scenario: 'tcc2015', title: 'Falta no barramento 13,8 kV da SE AQZ', description: 'AQZ_MT elimina a falta; o SRA abre os quatro alimentadores e recompõe o que a ampacidade permite.', fault: { kind: 'bus', node: 'AQZ', type: '3F' } },
    { id: 'ex-n-t7', scenario: 'nobre2013', title: 'Nobre: falta em T7', description: 'Recomposição da Tab. 4.2 de Nobre: abre RS3 e RS4, fecha RL3 (T9 pela SE AGF) e RP2 (T8 por 21I6).', fault: { kind: 'segment', seg: 'T7', x: 0.5, type: '3F' } },
  ];

  /** Avalia uma medida de um ensaio sobre o resultado da simulação. */
  function measure(res, def) {
    const v = def.value;
    const trips = (dev) => res.log.filter((e) => e.cat === 'trip' && e.dev === dev);
    const fault0 = res.metrics.faultAt || 0;
    if (v.type === 'count') return trips(v.dev).length;
    if (v.type === 'tripN') { const t = trips(v.dev)[v.n]; return t ? (t.t - fault0) * 1000 : null; }
    if (v.type === 'tripElement') { const t = trips(v.dev)[0]; return t ? (SH.protection.EL_LABEL[t.el] || t.el) : 'não abriu'; }
    if (v.type === 'delta') {
      const a = trips(v.a)[0];
      const b = trips(v.b)[0];
      return a && b ? (b.t - a.t) * 1000 : null;
    }
    if (v.type === 'clear') return res.metrics.firstClear != null ? (res.metrics.firstClear - fault0) * 1000 : null;
    if (v.type === 'finalState') return res.finalState.sw[v.dev].closed ? 'fechado' : 'aberto';
    if (v.type === 'tripAfterClose') {
      const t = trips(v.dev)[v.n];
      if (!t) return null;
      const closes = res.log.filter((e) => e.cat === 'disjuntor' && e.dev === v.dev && /fechou/.test(e.text) && e.t <= t.t);
      const last = closes[closes.length - 1];
      return last ? (t.t - last.t) * 1000 : null;
    }
    return null;
  }

  /** Monta a entrada do simulador para um ensaio. */
  function buildInput(model, test) {
    const N = SH.network;
    const st = N.normalState(model);
    Object.entries(test.setup.stateMods || {}).forEach(([k, v]) => { st.sw[k].closed = v; });
    return {
      state: st,
      stuck: test.setup.stuck || [],
      script: [{ t: 0, type: 'fault', spec: test.setup.fault, temporary: !!test.setup.temporary }],
      options: test.setup.options || {},
    };
  }

  SH.labs = { tests, examples, measure, buildInput };
  if (typeof module !== 'undefined' && module.exports) module.exports = SH.labs;
})(typeof window !== 'undefined' ? window : globalThis);
