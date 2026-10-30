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
  // Calibração com os relatórios da mala CE-6006 (pasta ARTIGO_REI): o GOOSE de
  // trip dos elementos 50/50N sai de 10 a 16 ms depois do atraso ajustado
  // (mediana 13 ms) e o GOOSE do 50BF sai de 8 a 13 ms depois do BFD.
  const LAB_DELAY = 0.013;
  const LAB = (extra) => Object.assign({ relayDelay: LAB_DELAY }, NO_RECLOSE, extra);
  // Ajuste real do RL2 do laboratório (SEL-751, 50P1D = 0,02 s); a Tab. 4.13 dá 0,03 s.
  const RL2_LAB = { RL3: 0.02 };
  const closeIn21I5 = { kind: 'segment', seg: 'T8', x: 0, type: '3F' }; // logo após 21I5: 9419 A
  const afterRS4 = { kind: 'segment', seg: 'T9', x: 0, type: '3F' }; // logo após RS4: 4715 A
  const afterRL3 = { kind: 'segment', seg: 'T10', x: 0, type: '3F' }; // logo após RL3: 2146 A
  const closeIn21I5FT = Object.assign({}, closeIn21I5, { type: 'FT' }); // 10176 A
  const afterRS4FT = Object.assign({}, afterRS4, { type: 'FT' }); // 3309 A
  const maxReach21I5 = { RL3: true, '21S1': false }; // RL3 alimentado por 21I5 (Fig. 4.6c)
  const MONO_NOTE = 'Ensaio registrado nos relatórios da mala, mas não detalhado no texto do TCC. Nos ensaios monofásicos a mala injetou só as fases (I1 a I3 em um relé, I4 a I6 no outro). No SEL-751 os elementos 50N/51N medem o canal IN, que não recebeu corrente: os tempos medidos só são coerentes com os elementos de fase (com neutro, 21I5 abriria pelo 51N em cerca de 200 ms). Por isso o ensaio é simulado com os elementos de neutro fora de serviço.';

  // "lab" = valor medido no relatório da mala (ms após o início da falta, ou intervalo entre GOOSEs).
  const tests = [
    {
      id: 'r1', group: '5.6 Religamento automático', title: 'Religamento de um IED (AQZ = 21I5)',
      ref: 'Seção 5.6.1, Fig. 5.12',
      description: 'Falta permanente logo após 21I5. Configuração do laboratório (arquivo de ajustes do SEL-751): E79 = 3 e torque control "AND (SH0 OR SH1)", isto é, 50 habilitado nas duas primeiras operações e três religamentos.',
      setup: { fault: closeIn21I5, options: { sra: false, relayDelay: LAB_DELAY, cycleOverrides: { '21I5': ['I', 'I', 'T', 'T'] } } },
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
      setup: { fault: afterRS4, options: { sra: false, relayDelay: LAB_DELAY } },
      measures: [
        { label: 'Aberturas de 21I5', tcc: '1 (só na primeira falta)', value: { type: 'count', dev: '21I5' }, unit: '' },
        { label: 'Aberturas de RS4 (RL1)', tcc: 'ciclo completo até bloquear', value: { type: 'count', dev: 'RS4' }, unit: '' },
        { label: 'Estado final de 21I5', tcc: 'fechado, suprindo T8', value: { type: 'finalState', dev: '21I5' }, unit: '' },
      ],
    },
    {
      id: 's1a', group: '5.7.1 AQZ_MT e AQZ', title: 'Seletividade lógica + 50BF (trifásico)',
      ref: 'Seção 5.7.1(a), Fig. 5.14; relatório AQZ_MT-AQZ nº 1',
      description: 'Falta logo após 21I5 com o disjuntor de 21I5 sem abrir. 21I5 bloqueia o instantâneo de AQZ_MT por GOOSE e, 200 ms após o trip, envia trip por 50BF.',
      setup: { fault: closeIn21I5, stuck: ['21I5'], options: LAB({ sl: true, bf: true, busInst50: true }) },
      measures: [
        { label: 'Trip 50P de 21I5 após a falta', tcc: '-', lab: 115.2, value: { type: 'tripN', dev: '21I5', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Trip de 21I5 → trip de AQZ_MT', tcc: '217 ms', lab: 216.5, value: { type: 'delta', a: '21I5', b: '01Z2' }, unit: 'ms' },
        { label: 'Eliminação da falta¹', tcc: '≈ 400 ms', lab: 400.0, value: { type: 'clear' }, unit: 'ms' },
      ],
    },
    {
      id: 's1b', group: '5.7.1 AQZ_MT e AQZ', title: 'Só seletividade lógica, sem 50BF (trifásico)',
      ref: 'Seção 5.7.1(b), Fig. 5.15; relatório AQZ_MT-AQZ nº 2',
      description: 'Sem trip remoto, AQZ_MT (com o instantâneo bloqueado) elimina a falta pela curva NI.',
      setup: { fault: closeIn21I5, stuck: ['21I5'], options: LAB({ sl: true, bf: false, busInst50: true }) },
      measures: [
        { label: 'Trip de 21I5 → trip 51P de AQZ_MT', tcc: '476 ms', lab: 477.1, value: { type: 'delta', a: '21I5', b: '01Z2' }, unit: 'ms' },
        { label: 'Eliminação da falta¹', tcc: '≈ 650 ms', lab: 650.0, value: { type: 'clear' }, unit: 'ms' },
      ],
    },
    {
      id: 's1c', group: '5.7.1 AQZ_MT e AQZ', title: 'Sem seletividade lógica e sem 50BF (trifásico)',
      ref: 'Seção 5.7.1(c), Fig. 5.16; relatório AQZ_MT-AQZ nº 3',
      description: 'Instantâneos habilitados nos dois relés sem bloqueio: ambos abrem e a falta deixa toda a barra desligada.',
      setup: { fault: closeIn21I5, options: LAB({ sl: false, bf: false, busInst50: true }) },
      measures: [
        { label: 'Trip de AQZ_MT', tcc: 'pouco mais de 100 ms', lab: 117.7, value: { type: 'tripN', dev: '01Z2', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Trip de 21I5', tcc: 'pouco mais de 100 ms', lab: 110.1, value: { type: 'tripN', dev: '21I5', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Eliminação da falta¹', tcc: 'pouco menos de 200 ms', lab: 183.3, value: { type: 'clear' }, unit: 'ms' },
      ],
    },
    {
      id: 's1d', group: '5.7.1 AQZ_MT e AQZ', title: 'Seletividade lógica + 50BF (fase-terra)',
      ref: 'Relatório AQZ_MT-AQZ nº 4',
      description: 'Mesmo esquema do ensaio (a) com falta fase-terra: 12,72 A em AQZ_MT (RTC 800) e 20 A em AQZ (RTC 500), cerca de 10,2 kA.',
      note: MONO_NOTE,
      setup: { fault: closeIn21I5FT, stuck: ['21I5'], options: LAB({ sl: true, bf: true, busInst50: true, groundElements: false }) },
      measures: [
        { label: 'Trip 50P de 21I5 após a falta', tcc: '-', lab: 114.4, value: { type: 'tripN', dev: '21I5', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Trip de 21I5 → trip de AQZ_MT', tcc: '-', lab: 214.2, value: { type: 'delta', a: '21I5', b: '01Z2' }, unit: 'ms' },
        { label: 'Eliminação da falta¹', tcc: '-', lab: 400.0, value: { type: 'clear' }, unit: 'ms' },
      ],
    },
    {
      id: 's1e', group: '5.7.1 AQZ_MT e AQZ', title: 'Só seletividade lógica, sem 50BF (fase-terra)',
      ref: 'Relatório AQZ_MT-AQZ nº 5',
      description: 'AQZ_MT elimina a falta pela curva NI de fase (10,2 kA, M = 10,8).',
      note: MONO_NOTE,
      setup: { fault: closeIn21I5FT, stuck: ['21I5'], options: LAB({ sl: true, bf: false, busInst50: true, groundElements: false }) },
      measures: [
        { label: 'Trip de AQZ_MT após a falta', tcc: '-', lab: 574.6, value: { type: 'tripN', dev: '01Z2', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Trip de 21I5 → trip de AQZ_MT', tcc: '-', lab: 463.1, value: { type: 'delta', a: '21I5', b: '01Z2' }, unit: 'ms' },
      ],
    },
    {
      id: 's1f', group: '5.7.1 AQZ_MT e AQZ', title: 'Sem seletividade lógica e sem 50BF (fase-terra)',
      ref: 'Relatório AQZ_MT-AQZ nº 6',
      description: 'Os dois instantâneos de fase atuam juntos.',
      note: MONO_NOTE,
      setup: { fault: closeIn21I5FT, options: LAB({ sl: false, bf: false, busInst50: true, groundElements: false }) },
      measures: [
        { label: 'Trip de AQZ_MT', tcc: '-', lab: 119.3, value: { type: 'tripN', dev: '01Z2', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Trip de 21I5', tcc: '-', lab: 112.5, value: { type: 'tripN', dev: '21I5', n: 0, rel: 'fault' }, unit: 'ms' },
      ],
    },
    {
      id: 's2a', group: '5.7.2 AQZ e RL1', title: 'Seletividade lógica + 50BF (trifásico)',
      ref: 'Seção 5.7.2, Fig. 5.17; relatório AQZ-RL1 trifásico com 50BF',
      description: 'Falta logo após RS4 (RL1) com o disjuntor de RS4 sem abrir.',
      setup: { fault: afterRS4, stuck: ['RS4'], options: LAB({ sl: true, bf: true, busInst50: true }) },
      measures: [
        { label: 'Trip 50P de RS4 após a falta', tcc: '-', lab: 62.7, value: { type: 'tripN', dev: 'RS4', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Trip de RS4 → trip de 21I5', tcc: '217 ms', lab: 217.7, value: { type: 'delta', a: 'RS4', b: '21I5' }, unit: 'ms' },
        { label: 'Eliminação da falta¹', tcc: '≈ 360 ms', lab: 350.0, value: { type: 'clear' }, unit: 'ms' },
      ],
    },
    {
      id: 's2b', group: '5.7.2 AQZ e RL1', title: 'Só seletividade lógica, sem 50BF (trifásico)',
      ref: 'Seção 5.7.2, Fig. 5.18; relatório AQZ-RL1 trifásico sem 50BF',
      description: 'Sem trip remoto, 21I5 elimina a falta pela curva MI.',
      setup: { fault: afterRS4, stuck: ['RS4'], options: LAB({ sl: true, bf: false, busInst50: true }) },
      measures: [
        { label: 'Trip de RS4 → trip 51P de 21I5', tcc: '372 ms', lab: 369.9, value: { type: 'delta', a: 'RS4', b: '21I5' }, unit: 'ms' },
        { label: 'Trip 51P de 21I5 após a falta', tcc: '≈ 430 ms', lab: 430.9, value: { type: 'tripN', dev: '21I5', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Eliminação da falta¹', tcc: '≈ 500 ms', lab: 500.0, value: { type: 'clear' }, unit: 'ms' },
      ],
    },
    {
      id: 's2c', group: '5.7.2 AQZ e RL1', title: 'Sem seletividade lógica e sem 50BF (trifásico)',
      ref: 'Seção 5.7.2, Fig. 5.19; relatório AQZ-RL1 sem seletividade',
      description: 'Os dois religadores atuam pelo instantâneo (falta de seletividade).',
      setup: { fault: afterRS4, options: LAB({ sl: false, bf: false, busInst50: true }) },
      measures: [
        { label: 'Trip de RS4', tcc: 'atua', lab: 61.8, value: { type: 'tripN', dev: 'RS4', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Trip de 21I5', tcc: 'também atua', lab: 116.1, value: { type: 'tripN', dev: '21I5', n: 0, rel: 'fault' }, unit: 'ms' },
      ],
    },
    {
      id: 's2d', group: '5.7.2 AQZ e RL1', title: 'Seletividade lógica + 50BF (fase-terra)',
      ref: 'Relatório AQZ-RL1 monofásico com 50BF',
      description: 'Falta fase-terra logo após RS4: 6,62 A em AQZ (RTC 500) e 11,03 A em RL1 (RTC 300), cerca de 3,3 kA.',
      note: `${MONO_NOTE} O trip de RS4 medido (72 ms) é cerca de 10 ms mais lento que no trifásico porque a corrente fica só 24% acima do pickup do 50P; o simulador não modela essa dependência.`,
      setup: { fault: afterRS4FT, stuck: ['RS4'], options: LAB({ sl: true, bf: true, busInst50: true, groundElements: false }) },
      measures: [
        { label: 'Trip 50P de RS4 após a falta', tcc: '-', lab: 72.4, value: { type: 'tripN', dev: 'RS4', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Trip de RS4 → trip de 21I5', tcc: '-', lab: 218.4, value: { type: 'delta', a: 'RS4', b: '21I5' }, unit: 'ms' },
      ],
    },
    {
      id: 's2e', group: '5.7.2 AQZ e RL1', title: 'Só seletividade lógica, sem 50BF (fase-terra)',
      ref: 'Relatório AQZ-RL1 monofásico sem 50BF',
      description: '21I5 elimina a falta pela curva MI de fase (3,3 kA, M = 5,8). É o ensaio que mostra que o neutro não participou: o 51N de 21I5 (25 A, dial 0,43) atuaria em cerca de 200 ms.',
      note: MONO_NOTE,
      setup: { fault: afterRS4FT, stuck: ['RS4'], options: LAB({ sl: true, bf: false, busInst50: true, groundElements: false }) },
      measures: [
        { label: 'Trip 51P de 21I5 após a falta', tcc: '-', lab: 654.0, value: { type: 'tripN', dev: '21I5', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Trip de RS4 → trip de 21I5', tcc: '-', lab: 582.1, value: { type: 'delta', a: 'RS4', b: '21I5' }, unit: 'ms' },
      ],
    },
    {
      id: 's3a', group: '5.7.3 RL1 e RL2', title: 'SL bloqueando só o 50 + 50BF',
      ref: 'Seção 5.7.3, Fig. 5.20; relatório RL1-RL2 nº 1',
      description: 'RL3 (RL2 do ensaio) alimentado por 21I5, falta logo após RL3 com o disjuntor sem abrir. A curva 51 de RS4 atua antes do trip por 50BF.',
      note: 'Corrente injetada: 7,15 A nos dois relés (RTC 300), isto é, 2145 A, o curto trifásico na barra RL3 da Tab. 4.7. Atraso do 50 de RL2 igual ao do relé ensaiado (0,02 s).',
      setup: { fault: afterRL3, stateMods: maxReach21I5, stuck: ['RL3'], options: LAB({ sl: true, bf: true, busInst50: true, instDelayOverrides: RL2_LAB }) },
      measures: [
        { label: 'Elemento que abriu RS4', tcc: '51 (antes do 50BF)', labText: '51 (GOOSE 7,8 ms antes do 50BF)', value: { type: 'tripElement', dev: 'RS4' }, unit: '' },
        { label: 'Trip de RS4 após a falta', tcc: '-', lab: 238.3, value: { type: 'tripN', dev: 'RS4', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Trip 50P de RL3 → trip de RS4', tcc: '< 50BF', lab: 204.8, value: { type: 'delta', a: 'RL3', b: 'RS4' }, unit: 'ms' },
      ],
    },
    {
      id: 's3b', group: '5.7.3 RL1 e RL2', title: 'SL bloqueando 50 e 51 + retaguarda (+200 ms) + 50BF',
      ref: 'Seção 5.7.3, Fig. 5.21; relatório RL1-RL2 nº 2',
      description: 'Solução proposta no TCC: o bloqueio se estende ao 51 e uma 51 de retaguarda com somador de 0,20 s garante a proteção se o 50BF falhar.',
      note: 'O texto do TCC cita 204 ms; o relatório deste ensaio registra 214 ms (204,8 ms é o valor do ensaio anterior).',
      setup: { fault: afterRL3, stateMods: maxReach21I5, stuck: ['RL3'], options: LAB({ sl: true, bf: true, slBlocks51: true, busInst50: true, instDelayOverrides: RL2_LAB }) },
      measures: [
        { label: 'Trip 50P de RL3 → trip de RS4', tcc: '204 ms', lab: 213.7, value: { type: 'delta', a: 'RL3', b: 'RS4' }, unit: 'ms' },
        { label: 'Eliminação da falta¹', tcc: '≈ 300 ms', lab: 317.0, value: { type: 'clear' }, unit: 'ms' },
      ],
    },
    {
      id: 's3c', group: '5.7.3 RL1 e RL2', title: 'Mesmo esquema sem o trip por 50BF',
      ref: 'Seção 5.7.3, Fig. 5.22; relatório RL1-RL2 nº 3',
      description: 'O trip remoto por 50BF não chega (perda do GOOSE no simulador; 50BF desligado no ensaio): RS4 abre pela 51 de retaguarda, com atraso maior.',
      setup: { fault: afterRL3, stateMods: maxReach21I5, stuck: ['RL3'], options: LAB({ sl: true, bf: true, slBlocks51: true, busInst50: true, commFail: 'BF', instDelayOverrides: RL2_LAB }) },
      measures: [
        { label: 'Elemento que abriu RS4', tcc: '51 de retaguarda (Phase TOC)', labText: '51 de retaguarda', value: { type: 'tripElement', dev: 'RS4' }, unit: '' },
        { label: 'Trip de RS4 após a falta', tcc: '-', lab: 443.4, value: { type: 'tripN', dev: 'RS4', n: 0, rel: 'fault' }, unit: 'ms' },
        { label: 'Eliminação da falta¹', tcc: 'atraso maior que no caso anterior', lab: 500.0, value: { type: 'clear' }, unit: 'ms' },
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

  const CLEAR_NOTE = '¹ No relatório, a eliminação é o início do estado pós-falta da mala, que avança 50 ms (atraso programado) depois de receber o GOOSE de trip; a recepção acrescenta de 7 a 21 ms. No simulador, é o trip mais os 50 ms de abertura do disjuntor.';

  SH.labs = { tests, examples, measure, buildInput, LAB_DELAY, CLEAR_NOTE };
  if (typeof module !== 'undefined' && module.exports) module.exports = SH.labs;
})(typeof window !== 'undefined' ? window : globalThis);
