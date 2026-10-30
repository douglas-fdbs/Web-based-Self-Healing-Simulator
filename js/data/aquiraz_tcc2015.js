/*
 * Rede de distribuição de Aquiraz: topologia atual (Figura 4.2 do TCC).
 *
 * Fonte principal:
 *   RODRIGUES, M. S. de L. Teste e validação das funções de proteção baseadas
 *   na norma IEC 61850 propostas para implantação no projeto piloto da rede de
 *   distribuição inteligente de Aquiraz. Monografia (Graduação em Eng. Elétrica),
 *   UFC, Fortaleza, 2015.
 *
 * Cada valor indica a tabela de origem. Valores que NÃO constam no TCC e foram
 * adotados para permitir a simulação estão marcados com "assumed" e aparecem
 * destacados na interface.
 *
 * Unidades: impedâncias em pu (base 100 MVA, 13,8 kV), correntes em A primários,
 * comprimentos em metros, tempos em segundos.
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});
  SH.scenarios = SH.scenarios || {};

  // ---------------------------------------------------------------------------
  // Ajustes (Tabela 4.13). P(...) = fase, N(...) = neutro.
  // pickup = ajuste 51/51N (A), dial, inst = ajuste 50/50N (A), instDelay = atraso 50/50N (s)
  const P = (pickup, dial, inst, instDelay, curve = 'MI') => ({ pickup, dial, inst, instDelay, curve });
  const one = (phase, ground, name = 'Grupo único (Tab. 4.13)') => [{ id: 'G1', name, phase, ground }];

  // Carga pesada dos trechos T7, T10 e T11 (Tab. 4.2 informa só o total: 155 A).
  // Rateio proporcional ao comprimento (Tab. 4.5): premissa deste simulador.
  const J_TOTAL = 155;
  const J_LEN = { T7: 2250, T10: 4924, T11: 1621 };
  const J_SUM = J_LEN.T7 + J_LEN.T10 + J_LEN.T11;
  const jLoad = (id) => Math.round((J_TOTAL * J_LEN[id] / J_SUM) * 100) / 100;

  const feederSettings = (assumed) => ({
    rtc: 500,
    cycle: '1I+2T',
    deadTime: 10,
    groups: one(P(570, 0.23, 2850, 0.10), P(26, 0.43, 2850, 0.10)),
    ref: assumed ? undefined : 'Tab. 4.13',
    assumed,
  });

  const scn = {
    id: 'tcc2015',
    name: 'Rede atual (Fig. 4.2)',
    longName: 'Sistema de distribuição Aquiraz, topologia da Fig. 4.2 (Rodrigues, 2015)',
    reference: 'RODRIGUES (2015), Cap. 4 e 5',
    base: { mva: 100, kv: 13.8 },
    ftMinOhms: 100, // resistência de contato que reproduz a coluna IccFTm da Tab. 4.7
    viewBox: [0, 0, 1180, 600],

    sources: [
      { id: 'AQZ', name: 'SE Aquiraz (AQZ)', bus: 'AQZ_SRC', z1: [0.0138, 0.4439], z0: [0, 0.3453], color: 'aqz', ref: 'Tab. 4.6 (trecho "AQZ") / Anexo A' },
      { id: 'ESB', name: 'SE Eusébio (ESB)', bus: 'ESB', z1: [0.03887, 0.510545], z0: [0, 0.3606], color: 'esb', ref: 'Anexo A (ANAFAS, barra 9731)' },
      { id: 'AGF', name: 'SE Água Fria (AGF)', bus: 'AGF', z1: [0.009412, 0.695998], z0: [0, 0.635], color: 'agf', ref: 'Anexo A (ANAFAS, barra 9032)' },
    ],

    // Tabelas 4.1 e 4.4 (impedância em Ω/km a 50 °C, ampacidade em A)
    cables: {
      CAA266: { name: 'CAA 266,8 MCM (Partridge)', r1: 0.2354, x1: 0.3850, r0: 0.4130, x0: 1.5520, amp: 475 },
      SP240: { name: 'Spacer 240 mm²', r1: 0.1410, x1: 0.2762, r0: 2.1310, x0: 2.2615, amp: 617 },
      CAA10: { name: 'CAA 1/0 AWG (Poppy)', r1: 0.5877, x1: 0.4374, r0: 0.7653, x0: 1.6043, amp: 242 },
      CU95: { name: 'Cobre nu 95 mm²', r1: 0.2213, x1: 0.4101, r0: 0.3990, x0: 1.5771, amp: 438 },
    },

    nodes: {
      AQZ_SRC: { x: 120, y: 300, kind: 'source', label: 'Transformadores da SE AQZ' },
      AQZ: { kind: 'bus', label: 'SE AQZ 13,8 kV', bar: { x: 200, y1: 60, y2: 560, noLabel: true } },
      ESB: { kind: 'bus', label: 'SE ESB', bar: { x: 1110, y1: 70, y2: 390 } },
      AGF: { kind: 'bus', label: 'SE AGF', bar: { x: 1110, y1: 450, y2: 560 } },
      '21I7b': { x: 261, y: 110 }, RS1a: { x: 409, y: 110 }, RS1b: { x: 431, y: 110 },
      RL1a: { x: 549, y: 110 }, RL1b: { x: 571, y: 110 }, RS3a: { x: 689, y: 110 },
      RS3b: { x: 711, y: 110 }, '21S7a': { x: 1049, y: 110 },
      '21I6b': { x: 261, y: 230 }, RS2a: { x: 409, y: 230 }, RS2b: { x: 431, y: 230 },
      RL2a: { x: 549, y: 230 }, RL2b: { x: 571, y: 230 },
      J: { x: 880, y: 350, kind: 'junction' },
      '21I5b': { x: 261, y: 350 }, RS4a: { x: 409, y: 350 }, RS4b: { x: 431, y: 350 },
      RL3a: { x: 589, y: 350 }, RL3b: { x: 611, y: 350 }, '21S1a': { x: 1049, y: 350 },
      '21I4b': { x: 261, y: 490 }, RS5a: { x: 409, y: 490 }, RS5b: { x: 431, y: 490 },
      RS6a: { x: 589, y: 490 }, RS6b: { x: 611, y: 490 }, RL4a: { x: 689, y: 490 },
      RL4b: { x: 711, y: 490 }, RS7a: { x: 869, y: 490 }, RS7b: { x: 891, y: 490 },
      '21I2a': { x: 1049, y: 490 },
    },

    // Trechos: Z em pu (Tab. 4.6), composição de cabos (Tab. 4.5),
    // carga pesada e ampacidade do cabo limitante (Tab. 4.2)
    segments: [
      { id: 'T1', a: '21I7b', b: 'RS1a', z1: [0.6230, 1.0190], z0: [1.0931, 4.1073], cable: [['CAA266', 5040]], load: 23, amp: 475 },
      { id: 'T2', a: 'RS1b', b: 'RL1a', z1: [0.1471, 0.2406], z0: [0.2581, 0.9698], cable: [['CAA266', 1190]], load: 57, amp: 475 },
      { id: 'T3', a: 'RL1b', b: 'RS3a', z1: [0.2250, 0.3680], z0: [0.3947, 1.4832], cable: [['CAA266', 1820]], load: 75, amp: 475 },
      { id: 'T4', a: 'RS3b', b: '21S7a', z1: [0.1094, 0.1912], z0: [0.6965, 1.0783], cable: [['CAA266', 580], ['SP240', 510]], load: 105, amp: 475 },
      { id: 'T5', a: '21I6b', b: 'RS2a', z1: [0.6384, 1.0442], z0: [1.1202, 4.2092], cable: [['CAA266', 5165]], load: 21, amp: 475 },
      { id: 'T6', a: 'RS2b', b: 'RL2a', z1: [0.2079, 0.3401], z0: [0.3648, 1.3707], cable: [['CAA266', 1682]], load: 106, amp: 475 },
      { id: 'T7', a: 'RL2b', b: 'J', via: [[880, 230]], z1: [0.2781, 0.4549], z0: [0.4880, 1.8336], cable: [['CAA266', 2250]], load: jLoad('T7'), amp: 475, loadNote: 'rateio de 155 A (T7+T10+T11) por comprimento' },
      { id: 'T8', a: '21I5b', b: 'RS4a', z1: [0.2471, 0.4041], z0: [0.4336, 1.6291], cable: [['CAA266', 1999]], load: 83, amp: 475 },
      { id: 'T9', a: 'RS4b', b: 'RL3a', z1: [0.6826, 0.8576], z0: [1.0664, 3.3786], cable: [['CAA266', 3173], ['CAA10', 941]], load: 62, amp: 242 },
      { id: 'T10', a: 'RL3b', b: 'J', z1: [1.1207, 1.0716], z0: [1.5800, 4.0889], cable: [['CAA266', 2156], ['CAA10', 2768]], load: jLoad('T10'), amp: 242, loadNote: 'rateio de 155 A (T7+T10+T11) por comprimento' },
      { id: 'T11', a: 'J', b: '21S1a', z1: [0.1237, 0.2396], z0: [1.7452, 1.8968], cable: [['CAA266', 66], ['SP240', 1545], ['CU95', 10]], load: jLoad('T11'), amp: 475, loadNote: 'rateio de 155 A (T7+T10+T11) por comprimento' },
      { id: 'T12', a: '21I4b', b: 'RS5a', z1: [1.0920, 1.8882], z0: [1.9387, 7.4497], cable: [['CAA266', 5039], ['CU95', 4037]], load: 126, amp: 438 },
      { id: 'T13', a: 'RS5b', b: 'RS6a', z1: [0.2197, 0.4070], z0: [0.3960, 1.5652], cable: [['CU95', 1890]], load: 42, amp: 438 },
      { id: 'T14', a: 'RS6b', b: 'RL4a', z1: [0.0003, 0.0006], z0: [0.0006, 0.0025], cable: [['CU95', 3]], load: 77, amp: 438 },
      { id: 'T15', a: 'RL4b', b: 'RS7a', z1: [0.5882, 1.0899], z0: [1.0604, 4.1912], cable: [['CU95', 5061]], load: 89, amp: 438 },
      { id: 'T16', a: 'RS7b', b: '21I2a', z1: [0.8350, 1.5732], z0: [4.7614, 8.1305], cable: [['SP240', 3304], ['CU95', 5080]], load: 246, amp: 438 },
    ],

    // Chaves: normal = estado na operação normal (Fig. 4.2: verde = aberto)
    switches: [
      { id: '01Z2', label: 'AQZ_MT', a: 'AQZ_SRC', b: 'AQZ', normal: 'closed', kind: 'bus', relay: '01Z2',
        draw: [{ x: 160, y: 170, label: '01Z2' }, { x: 160, y: 430, label: '01Z1' }], desc: 'Proteção geral de barramento (disjuntores secundários 01Z1/01Z2)' },
      { id: '21I7', a: 'AQZ', b: '21I7b', x: 250, y: 110, normal: 'closed', kind: 'feeder', relay: '21I7' },
      { id: 'RS1', a: 'RS1a', b: 'RS1b', x: 420, y: 110, normal: 'closed', kind: 'recloser', relay: 'RS1' },
      { id: 'RL1', a: 'RL1a', b: 'RL1b', x: 560, y: 110, normal: 'open', kind: 'tie', relay: 'RL1' },
      { id: 'RS3', a: 'RS3a', b: 'RS3b', x: 700, y: 110, normal: 'closed', kind: 'recloser', relay: 'RS3' },
      { id: '21S7', a: '21S7a', b: 'ESB', x: 1060, y: 110, normal: 'closed', kind: 'feeder', relay: '21S7' },
      { id: '21I6', a: 'AQZ', b: '21I6b', x: 250, y: 230, normal: 'closed', kind: 'feeder', relay: '21I6' },
      { id: 'RS2', a: 'RS2a', b: 'RS2b', x: 420, y: 230, normal: 'closed', kind: 'recloser', relay: 'RS2' },
      { id: 'RL2', a: 'RL2a', b: 'RL2b', x: 560, y: 230, normal: 'open', kind: 'tie', relay: 'RL2' },
      { id: '21I5', a: 'AQZ', b: '21I5b', x: 250, y: 350, normal: 'closed', kind: 'feeder', relay: '21I5' },
      { id: 'RS4', a: 'RS4a', b: 'RS4b', x: 420, y: 350, normal: 'closed', kind: 'recloser', relay: 'RS4' },
      { id: 'RL3', a: 'RL3a', b: 'RL3b', x: 600, y: 350, normal: 'open', kind: 'tie', relay: 'RL3' },
      { id: '21S1', a: '21S1a', b: 'ESB', x: 1060, y: 350, normal: 'closed', kind: 'feeder', relay: '21S1' },
      { id: '21I4', a: 'AQZ', b: '21I4b', x: 250, y: 490, normal: 'closed', kind: 'feeder', relay: '21I4' },
      { id: 'RS5', a: 'RS5a', b: 'RS5b', x: 420, y: 490, normal: 'closed', kind: 'recloser', relay: 'RS5' },
      { id: 'RS6', a: 'RS6a', b: 'RS6b', x: 600, y: 490, normal: 'closed', kind: 'recloser', relay: 'RS6' },
      { id: 'RL4', a: 'RL4a', b: 'RL4b', x: 700, y: 490, normal: 'open', kind: 'tie', relay: 'RL4' },
      { id: 'RS7', a: 'RS7a', b: 'RS7b', x: 880, y: 490, normal: 'closed', kind: 'recloser', relay: 'RS7' },
      { id: '21I2', a: '21I2a', b: 'AGF', x: 1060, y: 490, normal: 'closed', kind: 'feeder', relay: '21I2' },
    ],

    relays: {
      '21I7': feederSettings(),
      '21I6': feederSettings(),
      '21I5': feederSettings(),
      '21I4': feederSettings(),
      RS1: { rtc: 300, cycle: '3I', deadTime: 11, groups: one(P(513, 0.05, 2309, 0.05), P(24, 0.21, 480, 0.05)), ref: 'Tab. 4.13' },
      RS2: { rtc: 300, cycle: '3I', deadTime: 11, groups: one(P(513, 0.05, 2172, 0.05), P(24, 0.21, 480, 0.05)), ref: 'Tab. 4.13' },
      RS3: { rtc: 300, cycle: '1I', deadTime: 13, groups: one(P(416, 0.05, 1618, 0.01), P(22, 0.05, 120, 0.01)), ref: 'Tab. 4.13' },
      RS4: { rtc: 300, cycle: '3I', deadTime: 11, groups: one(P(315, 0.10, 2660.1, 0.05), P(24, 0.21, 480, 0.05)), ref: 'Tab. 4.13; E79 = 2 e 79OI = 11 s (Fig. 5.8)' },
      RS5: { rtc: 300, cycle: '3I', deadTime: 11, groups: one(P(513, 0.05, 1424.1, 0.05), P(24, 0.21, 480, 0.05)), ref: 'Tab. 4.13' },
      RS6: { rtc: 300, cycle: '2I', deadTime: 12, groups: one(P(462, 0.05, 1374.6, 0.02), P(22, 0.15, 240, 0.02)), ref: 'Tab. 4.13' },
      RL1: { rtc: 300, cycle: '2I', deadTime: 12, groups: one(P(461.7, 0.05, 1899, 0.03), P(22, 0.15, 240, 0.03)), ref: 'Tab. 4.13' },
      RL2: { rtc: 300, cycle: '2I', deadTime: 12, groups: one(P(315, 0.05, 1241.7, 0.03), P(22, 0.15, 240, 0.03)), ref: 'Tab. 4.13' },
      RL3: {
        rtc: 300, cycle: '1I', deadTime: 13, ref: 'Tab. 4.13 (dois grupos)',
        groups: [
          // grupo 1: alimentado por 21I6, isto é, energizado pelo lado de T10 (terminal RL3b)
          { id: 'G1', name: 'Grupo 1, alimentado por 21I6 (lado T10)', when: { upstreamNode: 'RL3b' }, phase: P(284, 0.05, 858.3, 0.02), ground: P(20, 0.05, 120, 0.02) },
          // grupo 2: alimentado por 21I5, energizado pelo lado de T9 (terminal RL3a)
          { id: 'G2', name: 'Grupo 2, alimentado por 21I5 (lado T9)', when: { upstreamNode: 'RL3a' }, phase: P(284, 0.05, 1267.8, 0.03), ground: P(22, 0.05, 240, 0.03) },
        ],
      },
      RL4: { rtc: 300, cycle: '1I', deadTime: 13, groups: one(P(416, 0.05, 1057, 0.02), P(20, 0.05, 120, 0.02)), ref: 'Tab. 4.13' },
      '01Z2': { rtc: 800, cycle: 'Bloqueado', deadTime: 10, groups: one(P(941, 0.20, 4079, 0.10, 'NI'), P(188, 0.30, 4079, 0.10, 'NI')), ref: 'Tab. 4.13 (geral de barramento)', inst50Scheme: true },
      // Dispositivos fora da Tab. 4.13: ajustes calculados pelo autor do TCC na
      // planilha de cálculos (pasta ARTIGO_REI, abas ESB21S7, ESB21S1 e AGF01I2).
      // O ciclo de religamento dessas SEs não é informado: adotado o dos
      // alimentadores da SE AQZ (OAP 165/2013).
      '21S7': {
        rtc: 120, cycle: '1I+2T', deadTime: 10,
        groups: one(P(570, 0.20, 2850, 0.10), P(24, 0.43, 2850, 0.10), 'Grupo único (planilha do autor)'),
        ref: 'Planilha de cálculos do TCC, aba ESB21S7',
        assumed: 'Ajustes da planilha de cálculos do autor (não constam na Tab. 4.13); ciclo de religamento adotado igual ao dos alimentadores da SE AQZ.',
      },
      '21S1': {
        rtc: 100, cycle: '1I+2T', deadTime: 10,
        groups: one(P(570, 0.20, 2850, 0.10), P(24, 0.43, 2850, 0.10), 'Grupo único (planilha do autor)'),
        ref: 'Planilha de cálculos do TCC, aba ESB21S1',
        assumed: 'Ajustes da planilha de cálculos do autor (não constam na Tab. 4.13); ciclo de religamento adotado igual ao dos alimentadores da SE AQZ.',
      },
      '21I2': {
        rtc: 160, cycle: '1I+2T', deadTime: 10,
        groups: one(P(570, 0.14, 2850, 0.10), P(24, 0.43, 2850, 0.10), 'Grupo único (planilha do autor)'),
        ref: 'Planilha de cálculos do TCC, aba AGF01I2',
        assumed: 'Ajustes da planilha de cálculos do autor (não constam na Tab. 4.13); ciclo de religamento adotado igual ao dos alimentadores da SE AQZ.',
      },
      // Fase: planilha (aba AGF01I2). Neutro e religamento: critérios da Tab. 4.12
      // (51N = 51N da retaguarda - 2 A; 50N = 480 A no primeiro religador; 3I; +1 s).
      RS7: {
        rtc: 300, cycle: '3I', deadTime: 11,
        groups: one(P(513, 0.05, 1262.1, 0.05), P(22, 0.21, 480, 0.05), 'Grupo único (planilha + Tab. 4.12)'),
        ref: 'Planilha de cálculos do TCC (fase) e critérios da Tab. 4.12 (neutro e 79)',
        assumed: 'RS7 não consta na Tab. 4.13. Fase pela planilha do autor; o 51N da planilha (71,1 A) usa o critério antigo e ficaria menos sensível que o de 21I2 (24 A), por isso o neutro e o religamento seguem os critérios da Tab. 4.12.',
      },
    },

    // Elementos gráficos sem papel elétrico (barra de 69 kV e transformadores)
    decor: [
      { type: 'bar', x: 40, y1: 60, y2: 560, energizedBy: 'AQZ_SRC', label: 'REGIONAL AQUIRAZ II (CHESF) 69 kV', labelRotate: true },
      { type: 'line', pts: [[40, 170], [84, 170]], energizedBy: 'AQZ_SRC' },
      { type: 'trafo', x: 100, y: 170, label: 'T1', sub: '15 MVA · 6,84%', energizedBy: 'AQZ_SRC' },
      { type: 'line', pts: [[116, 170], [149, 170]], energizedBy: 'AQZ_SRC' },
      { type: 'line', pts: [[171, 170], [200, 170]], energizedBy: 'AQZ' },
      { type: 'line', pts: [[40, 430], [84, 430]], energizedBy: 'AQZ_SRC' },
      { type: 'trafo', x: 100, y: 430, label: 'T2', sub: '15 MVA · 6,84%', energizedBy: 'AQZ_SRC' },
      { type: 'line', pts: [[116, 430], [149, 430]], energizedBy: 'AQZ_SRC' },
      { type: 'line', pts: [[171, 430], [200, 430]], energizedBy: 'AQZ' },
      { type: 'text', x: 205, y: 44, text: 'SE AQZ 69/13,8 kV', cls: 'title' },
    ],

    // Tabela 4.7: impedâncias acumuladas e curtos nas barras (alcance máximo)
    validation: {
      tab47: [
        { feeder: '21I7', bus: 'AQZ', path: [], tcc: [0.0138, 0.4439, 0.0000, 0.3453, 9419.4, 8157.4, 10175.6, 79.7] },
        { feeder: '21I7', bus: 'RS1', path: ['T1'], tcc: [0.6368, 1.4629, 1.0931, 4.4526, 2622.2, 2270.9, 1619.8, 78.4] },
        { feeder: '21I7', bus: 'RL1', path: ['T1', 'T2'], tcc: [0.7838, 1.7035, 1.3512, 5.4224, 2231.1, 1932.2, 1349.7, 78.1] },
        { feeder: '21I7', bus: 'RS3', path: ['T1', 'T2', 'T3'], tcc: [1.0088, 2.0714, 1.7460, 6.9056, 1815.8, 1572.5, 1075.3, 77.6] },
        { feeder: '21I7', bus: 'ESB', path: ['T1', 'T2', 'T3', 'T4'], tcc: [1.1182, 2.2627, 2.4425, 7.9839, 1657.6, 1435.6, 939.8, 77.1] },
        { feeder: '21I6', bus: 'RS2', path: ['T5'], tcc: [0.6522, 1.4882, 1.1202, 4.5544, 2574.9, 2229.9, 1586.4, 78.4] },
        { feeder: '21I6', bus: 'RL2', path: ['T5', 'T6'], tcc: [0.8601, 1.8282, 1.4851, 5.9252, 2070.7, 1793.3, 1242.2, 77.9] },
        { feeder: '21I6', bus: 'ESB', path: ['T5', 'T6', 'T7', 'T11'], tcc: [1.2619, 2.5227, 3.7183, 9.6556, 1483.2, 1284.5, 785.9, 76.3] },
        { feeder: '21I6', bus: 'RL3', path: ['T5', 'T6', 'T7', 'T10'], tcc: [2.2589, 3.3547, 3.5531, 11.8477, 1034.5, 895.9, 620.2, 75.3] },
        { feeder: '21I6', bus: 'RS4', path: ['T5', 'T6', 'T7', 'T10', 'T9'], tcc: [2.9415, 4.2123, 4.6195, 15.2262, 814.3, 705.2, 485.0, 74.0] },
        { feeder: '21I5', bus: 'RS4', path: ['T8'], tcc: [0.2609, 0.8481, 0.4336, 1.9743, 4715.1, 4083.4, 3309.2, 79.2] },
        { feeder: '21I5', bus: 'RL3', path: ['T8', 'T9'], tcc: [0.9435, 1.7057, 1.4999, 5.3529, 2146.3, 1858.8, 1335.8, 77.9] },
        { feeder: '21I5', bus: 'ESB', path: ['T8', 'T9', 'T10', 'T11'], tcc: [2.1878, 3.0168, 4.8252, 11.3385, 1122.6, 972.2, 638.5, 74.9] },
        { feeder: '21I5', bus: 'RL2', path: ['T8', 'T9', 'T10', 'T7'], tcc: [2.3422, 3.2321, 3.5680, 11.2754, 1048.1, 907.7, 641.5, 75.3] },
        { feeder: '21I4', bus: 'RS5', path: ['T12'], tcc: [1.1058, 2.3321, 1.9387, 7.7949, 1621.0, 1403.8, 955.7, 77.4] },
        { feeder: '21I4', bus: 'RS6', path: ['T12', 'T13'], tcc: [1.3255, 2.7391, 2.3347, 9.3601, 1374.9, 1190.7, 801.8, 76.9] },
        { feeder: '21I4', bus: 'RL4', path: ['T12', 'T13', 'T14'], tcc: [1.3259, 2.7398, 2.3354, 9.3626, 1374.5, 1190.4, 801.6, 76.9] },
        { feeder: '21I4', bus: 'RS7', path: ['T12', 'T13', 'T14', 'T15'], tcc: [1.9141, 3.8297, 3.3957, 13.5538, 977.2, 846.3, 560.1, 75.6] },
      ],
      sourceForPath: 'AQZ',
      // Planilha de cálculos do TCC, aba "Z(pu) Acumulado e curtocircuito":
      // [fonte, alimentador, barra, trechos a partir da fonte, Icc3F, Icc2F, IccFT, IccFTm]
      planilha: [
        ['AQZ', '21I7', 'AQZ', [], 9419.390, 8157.431, 10175.632, 79.658],
        ['AQZ', '21I7', 'RS1', ['T1'], 2622.240, 2270.926, 1619.782, 78.412],
        ['AQZ', '21I7', 'RL1', ['T1', 'T2'], 2231.107, 1932.195, 1349.681, 78.107],
        ['AQZ', '21I7', 'RS3', ['T1', 'T2', 'T3'], 1815.824, 1572.550, 1075.329, 77.633],
        ['AQZ', '21I7', 'ESB', ['T1', 'T2', 'T3', 'T4'], 1657.630, 1435.550, 939.762, 77.147],
        ['AQZ', '21I6', 'RS2', ['T5'], 2574.884, 2229.915, 1586.440, 78.380],
        ['AQZ', '21I6', 'RL2', ['T5', 'T6'], 2070.689, 1793.269, 1242.248, 77.947],
        ['AQZ', '21I6', 'T7', ['T5', 'T6', 'T7'], 1639.958, 1420.246, 962.725, 77.357],
        ['AQZ', '21I6', '21S1', ['T5', 'T6', 'T7', 'T11'], 1483.220, 1284.506, 785.854, 76.331],
        ['AQZ', '21I6', 'RL3', ['T5', 'T6', 'T7', 'T10'], 1034.464, 895.872, 620.230, 75.320],
        ['AQZ', '21I6', 'RS4', ['T5', 'T6', 'T7', 'T10', 'T9'], 814.320, 705.222, 485.014, 73.965],
        ['AQZ', '21I6', '21I5', ['T5', 'T6', 'T7', 'T10', 'T9', 'T8'], 745.685, 645.782, 440.663, 73.414],
        ['AQZ', '21I5', 'RS4', ['T8'], 4715.065, 4083.366, 3309.202, 79.173],
        ['AQZ', '21I5', 'RL3', ['T8', 'T9'], 2146.338, 1858.783, 1335.805, 77.882],
        ['AQZ', '21I5', 'T10', ['T8', 'T9', 'T10'], 1209.049, 1047.067, 754.331, 75.874],
        ['AQZ', '21I5', '21S1', ['T8', 'T9', 'T10', 'T11'], 1122.649, 972.242, 638.463, 74.872],
        ['AQZ', '21I5', 'RL2', ['T8', 'T9', 'T10', 'T7'], 1048.125, 907.703, 641.499, 75.278],
        ['AQZ', '21I5', 'RS2', ['T8', 'T9', 'T10', 'T7', 'T6'], 953.210, 825.504, 576.941, 74.827],
        ['AQZ', '21I5', '21I6', ['T8', 'T9', 'T10', 'T7', 'T6', 'T5'], 745.685, 645.782, 440.663, 73.414],
        ['AQZ', '21I4', 'RS5', ['T12'], 1620.953, 1403.787, 955.744, 77.400],
        ['AQZ', '21I4', 'RS6', ['T12', 'T13'], 1374.857, 1190.661, 801.801, 76.910],
        ['AQZ', '21I4', 'RL4', ['T12', 'T13', 'T14'], 1374.526, 1190.374, 801.596, 76.909],
        ['AQZ', '21I4', 'RS7', ['T12', 'T13', 'T14', 'T15'], 977.174, 846.257, 560.078, 75.557],
        ['AQZ', '21I4', 'AGF', ['T12', 'T13', 'T14', 'T15', 'T16'], 690.137, 597.676, 356.128, 72.033],
        ['ESB', '21S7', 'ESB', [], 8170.925, 7076.228, 9069.526, 79.632],
        ['ESB', '21S7', 'RS3', ['T4'], 5832.799, 5051.352, 4168.501, 79.162],
        ['ESB', '21S7', 'RL1', ['T4', 'T3'], 3692.656, 3197.934, 2330.812, 78.716],
        ['ESB', '21S7', 'RS1', ['T4', 'T3', 'T2'], 2967.474, 2569.908, 1809.238, 78.419],
        ['ESB', '21S7', 'AQZ', ['T4', 'T3', 'T2', 'T1'], 1612.383, 1396.365, 928.863, 77.118],
        ['ESB', '21S1', 'T11', ['T11'], 5450.902, 4720.620, 2925.517, 78.619],
        ['ESB', '21S1', 'RL3', ['T11', 'T10'], 1877.550, 1626.006, 1082.212, 76.659],
        ['ESB', '21S1', 'RS4', ['T11', 'T10', 'T9'], 1258.976, 1090.305, 728.552, 75.365],
        ['ESB', '21S1', '21I5', ['T11', 'T10', 'T9', 'T8'], 1102.332, 954.648, 633.476, 74.843],
        ['ESB', '21S1', 'RL2', ['T11', 'T7'], 3260.754, 2823.896, 1741.131, 78.066],
        ['ESB', '21S1', 'RS2', ['T11', 'T7', 'T6'], 2496.752, 2162.250, 1335.625, 77.643],
        ['ESB', '21S1', '21I6', ['T11', 'T7', 'T6', 'T5'], 1446.907, 1253.058, 778.236, 76.301],
        ['AGF', '21I2', 'AGF', [], 6010.527, 5205.269, 6191.700, 79.658],
        ['AGF', '21I2', 'RS7', ['T16'], 1727.921, 1496.423, 848.899, 76.290],
        ['AGF', '21I2', 'RL4', ['T16', 'T15'], 1145.620, 992.136, 583.569, 74.987],
        ['AGF', '21I2', 'RS6', ['T16', 'T15', 'T14'], 1145.391, 991.938, 583.460, 74.986],
        ['AGF', '21I2', 'RS5', ['T16', 'T15', 'T14', 'T13'], 1017.081, 880.818, 522.392, 74.486],
        ['AGF', '21I2', 'AQZ', ['T16', 'T15', 'T14', 'T13', 'T12'], 665.569, 576.400, 348.903, 71.975],
      ],
    },

    // Cadeias de alcance máximo da Fig. 4.6, usadas na verificação dos critérios
    // de coordenação (seção 4.7.1) e nos coordenogramas das Figs. 4.9 a 4.13.
    // "at" = trechos da fonte até a barra do relé; "end" = barra remota do último relé.
    coordination: [
      { id: '21I7', source: 'AQZ', state: { RL1: true, '21S7': false }, bus: { dev: '01Z2' },
        devices: [{ dev: '21I7', at: [] }, { dev: 'RS1', at: ['T1'] }, { dev: 'RL1', at: ['T1', 'T2'] }, { dev: 'RS3', at: ['T1', 'T2', 'T3'] }],
        end: ['T1', 'T2', 'T3', 'T4'], endLabel: 'barra ESB' },
      { id: '21I6', source: 'AQZ', state: { RL2: true, '21S1': false, RL3: true, RS4: false }, bus: { dev: '01Z2' },
        devices: [{ dev: '21I6', at: [] }, { dev: 'RS2', at: ['T5'] }, { dev: 'RL2', at: ['T5', 'T6'] }, { dev: 'RL3', at: ['T5', 'T6', 'T7', 'T10'] }],
        end: ['T5', 'T6', 'T7', 'T10', 'T9'], endLabel: 'barra RS4' },
      { id: '21I5', source: 'AQZ', state: { RL3: true, '21S1': false }, bus: { dev: '01Z2' },
        devices: [{ dev: '21I5', at: [] }, { dev: 'RS4', at: ['T8'] }, { dev: 'RL3', at: ['T8', 'T9'] }],
        end: ['T8', 'T9', 'T10', 'T7'], endLabel: 'barra RL2' },
      { id: '21I4', source: 'AQZ', state: { RL4: true, '21I2': false }, bus: { dev: '01Z2' },
        devices: [{ dev: '21I4', at: [] }, { dev: 'RS5', at: ['T12'] }, { dev: 'RS6', at: ['T12', 'T13'] }, { dev: 'RL4', at: ['T12', 'T13', 'T14'] }],
        end: ['T12', 'T13', 'T14', 'T15'], endLabel: 'barra RS7' },
    ],

    // Premissas e divergências encontradas na fonte (exibidas na aba "Fontes")
    notes: [
      { kind: 'premissa', text: 'Carga de T7, T10 e T11: a Tab. 4.2 informa apenas o total (155 A); o rateio foi feito proporcionalmente ao comprimento.' },
      { kind: 'premissa', text: 'Ajustes de 21S7, 21S1 (SE ESB), 21I2 (SE AGF) e RS7 não constam na Tab. 4.13. Foram usados os valores calculados pelo autor na planilha de cálculos do TCC; o neutro e o religamento de RS7 seguem os critérios da Tab. 4.12. O ciclo de religamento dos alimentadores de ESB e AGF não é informado e foi adotado igual ao dos alimentadores da SE AQZ.' },
      { kind: 'premissa', text: 'Os arquivos do ProteCAD da pasta do TCC (fev/2015) trazem uma iteração anterior do estudo, com ajustes de linha diferentes da Tab. 4.13 (por exemplo RS4 com 513 A e RL3 com 462 A). O simulador usa a Tab. 4.13 e a planilha, que concordam entre si.' },
      { kind: 'premissa', text: 'Impedâncias equivalentes das SEs ESB e AGF retiradas do relatório ANAFAS (Anexo A) para os cálculos com recomposição.' },
      { kind: 'premissa', text: 'Proteção geral de barramento (01Z1/01Z2) modelada como um único equivalente que enxerga toda a corrente de falta da SE AQZ, como nos cálculos do TCC.' },
      { kind: 'divergencia', text: 'Fig. 4.2 indica T9 = 3.664 m, mas a Tab. 4.5 soma 4.114 m (3.173 + 941), valor coerente com a impedância da Tab. 4.6. O simulador usa a Tab. 4.5.' },
      { kind: 'divergencia', text: 'Fig. 4.6(c) indica Icc2F = 972,7 A na barra RL2 (21I5); a Tab. 4.7 e a relação √3/2·Icc3F dão 907,7 A.' },
      { kind: 'divergencia', text: 'Ciclo "1I+2T" (Tab. 4.13 e OAP 165/2013 de campo, com tempo morto 10-10 s e rearme de 45 s) versus o laboratório: o arquivo de ajustes do SEL-751 usado nos ensaios tem E79 = 3 e 50P1TC com "AND (SH0 OR SH1)", isto é, 2 operações instantâneas e 2 temporizadas. O preset do ensaio 5.6.1 reproduz a versão do laboratório.' },
      { kind: 'divergencia', text: 'RL2 do laboratório (RL3 no campo) foi ensaiado com 50P1D = 0,02 s e E79 = 1 (tempo morto 12 s), contra 0,03 s e "1I" (sem religamento) na Tab. 4.13. Os presets dos ensaios 5.7.3 usam o valor do laboratório.' },
      { kind: 'divergencia', text: 'Planilha de cálculos: os pickups de neutro dos religadores de linha (65,1 A, 71,1 A, 54 A) seguem um critério anterior; a Tab. 4.13 e os relés ensaiados usam 20 a 24 A. Os dials de neutro da planilha coincidem com a Tab. 4.13.' },
      { kind: 'divergencia', text: 'Os ajustes de RL3 (Tab. 4.13) e a maioria das tabelas referem-se à topologia de alcance máximo (Fig. 4.6), em que os religadores de linha são alimentados pela SE AQZ.' },
    ],
  };

  SH.scenarios[scn.id] = scn;
  if (typeof module !== 'undefined' && module.exports) module.exports = scn;
})(typeof window !== 'undefined' ? window : globalThis);
