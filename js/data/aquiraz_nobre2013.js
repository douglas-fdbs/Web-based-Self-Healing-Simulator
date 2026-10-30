/*
 * Rede de distribuição de Aquiraz: primeira topologia (Figura 4.1 do TCC de
 * Rodrigues, 2015, reproduzida de Nobre, 2013).
 *
 * Fonte dos dados elétricos:
 *   NOBRE, F. W. de M. Estudo para a definição dos grupos de ajuste da proteção
 *   da rede de distribuição Aquiraz. Monografia (Graduação em Eng. Elétrica),
 *   UFC, Fortaleza, 2013. Tabelas 3.1 a 3.8, 4.1, 4.2 e 4.13.
 *
 * O TCC de Rodrigues (2015) mostra esta topologia (Fig. 4.1) sem os dados
 * elétricos; eles foram obtidos em Nobre (2013).
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});
  SH.scenarios = SH.scenarios || {};

  const P = (pickup, dial, inst, curve = 'MI') => ({ pickup, dial, inst, instDelay: 0, curve });
  // Divide um trecho em duas metades (ponto de conexão de RP1/RP2)
  const half = (z) => [z[0] / 2, z[1] / 2];

  const Z = {
    // Tabela 3.4 (pu, base 100 MVA / 13,8 kV): [Z1, Z0]
    T1: [[0.6581, 1.0432], [1.1475, 4.2827]],
    T2: [[0.4745, 0.7521], [0.8273, 3.0875]],
    T3: [[1.2477, 1.9751], [2.1946, 8.4957]],
    T4: [[0.6650, 1.0542], [1.1596, 4.3277]],
    T5: [[1.9819, 1.5216], [2.5455, 6.1819]],
    T6: [[0.2846, 0.5407], [0.6474, 4.3433]],
    T7: [[0.2239, 0.3548], [0.3903, 1.4567]],
    T8: [[0.5907, 0.9364], [1.0300, 3.8440]],
    T9: [[2.4871, 1.7822], [3.1229, 7.2302]],
    T10: [[1.5013, 2.7186], [2.6856, 12.9752]],
    T11: [[0.3199, 0.5794], [0.5723, 2.7651]],
    T12: [[0.8725, 1.3829], [1.5212, 5.6774]],
  };
  // Tabela 3.1 (corrente de carga do trecho, A) e Tabela 4.1 (menor ampacidade, A)
  const LOAD = { T1: 12, T2: 232, T3: 165, T4: 33, T5: 150, T6: 263, T7: 54, T8: 13, T9: 87, T10: 343, T11: 39, T12: 164 };
  const AMP = { T1: 475, T2: 475, T3: 475, T4: 475, T5: 242, T6: 438, T7: 475, T8: 475, T9: 242, T10: 438, T11: 438, T12: 475 };

  const seg = (id, a, b, extra = {}) => Object.assign({
    id, label: id, a, b, z1: Z[id][0], z0: Z[id][1], load: LOAD[id], amp: AMP[id], cable: [],
  }, extra);
  const halfSeg = (id, part, a, b) => ({
    id: `${id}${part}`, label: id, a, b, z1: half(Z[id][0]), z0: half(Z[id][1]), load: LOAD[id] / 2, amp: AMP[id], cable: [],
    note: 'metade do trecho (ponto de conexão do religador de interligação adotado no meio do trecho)',
  });

  const feeder = (dial, assumed) => ({
    rtc: 100, cycle: '1I', deadTime: 10,
    groups: [{ id: 'G1', name: 'Ajuste da concessionária (Tab. 3.8)', phase: P(500, dial, 2500), ground: P(25.6, 0.42, 256) }],
    ref: assumed ? undefined : 'Tab. 3.8', assumed,
  });
  const ASSUMED_EXT = 'Ajuste não informado em Nobre (2013); adotado igual ao dos alimentadores da SE AQZ (Tab. 3.8).';

  const scn = {
    id: 'nobre2013',
    name: 'Primeira topologia (Fig. 4.1)',
    longName: 'Sistema de distribuição Aquiraz, primeira topologia da Fig. 4.1 (dados de Nobre, 2013)',
    reference: 'NOBRE (2013), Cap. 3 e 4; RODRIGUES (2015), Fig. 4.1',
    base: { mva: 100, kv: 13.8 },
    ftMinOhms: 100,
    viewBox: [0, 0, 1180, 600],

    // Tabela 3.5
    sources: [
      { id: 'AQZ', name: 'SE Aquiraz (AQZ)', bus: 'AQZ', z1: [0.1021, 0.5904], z0: [0, 0.3453], color: 'aqz', ref: 'Tab. 3.5' },
      { id: 'JAB', name: 'SE Jabuti (JAB)', bus: 'JAB', z1: [0.0283, 0.4418], z0: [0, 0.3549], color: 'esb', ref: 'Tab. 3.5' },
      { id: 'MSJ', name: 'SE Messejana (MSJ)', bus: 'MSJ', z1: [0.0163, 0.4521], z0: [0, 0.3647], color: 'msj', ref: 'Tab. 3.5' },
      { id: 'AGF', name: 'SE Água Fria (AGF)', bus: 'AGF', z1: [0.0088, 0.4245], z0: [0, 0.3647], color: 'agf', ref: 'Tab. 3.5' },
    ],

    // Tabela 3.3 (Ω/km e ampacidade)
    cables: {
      CAA10: { name: 'CAA 1/0 AWG', r1: 0.6955, x1: 0.4984, r0: 0.8733, x0: 2.0219, amp: 242 },
      CAA266: { name: 'CAA 266,8 MCM', r1: 0.2391, x1: 0.3790, r0: 0.4169, x0: 1.5559, amp: 475 },
      CU95: { name: 'Cobre 95 mm²', r1: 0.2231, x1: 0.4040, r0: 0.3991, x0: 1.9282, amp: 438 },
      SP185: { name: 'Spacer 185 mm²', r1: 0.1640, x1: 0.2522, r0: 0.3418, x0: 2.1701, amp: 525 },
      SP240: { name: 'Spacer 240 mm²', r1: 0.1250, x1: 0.2409, r0: 0.3028, x0: 2.1587, amp: 572 },
    },

    nodes: {
      AQZ: { kind: 'bus', label: 'SE AQZ 13,8 kV', bar: { x: 200, y1: 60, y2: 560 } },
      JAB: { kind: 'bus', label: 'SE JAB', bar: { x: 1110, y1: 70, y2: 150 } },
      MSJ: { kind: 'bus', label: 'SE MSJ', bar: { x: 1110, y1: 210, y2: 290 } },
      AGF: { kind: 'bus', label: 'SE AGF', bar: { x: 1110, y1: 350, y2: 560 } },
      F7b: { x: 261, y: 110 }, JA: { x: 400, y: 110, kind: 'junction' }, RS1a: { x: 509, y: 110 }, RS1b: { x: 531, y: 110 },
      RL1a: { x: 649, y: 110 }, RL1b: { x: 671, y: 110 }, F3a: { x: 1049, y: 110 },
      F6b: { x: 261, y: 250 }, JB: { x: 400, y: 250, kind: 'junction' }, RS2a: { x: 509, y: 250 }, RS2b: { x: 531, y: 250 },
      RL2a: { x: 649, y: 250 }, RL2b: { x: 671, y: 250 }, M3a: { x: 1049, y: 250 },
      F5b: { x: 261, y: 390 }, RS3a: { x: 309, y: 390 }, RS3b: { x: 331, y: 390 }, JD: { x: 400, y: 390, kind: 'junction' },
      RS4a: { x: 509, y: 390 }, RS4b: { x: 531, y: 390 }, RL3a: { x: 649, y: 390 }, JE: { x: 720, y: 390, kind: 'junction' },
      G7a: { x: 1049, y: 390 },
      F4b: { x: 261, y: 510 }, RS5a: { x: 509, y: 510 }, RS5b: { x: 531, y: 510 }, RL4a: { x: 720, y: 510 },
    },

    segments: [
      halfSeg('T1', 'a', 'F7b', 'JA'), halfSeg('T1', 'b', 'JA', 'RS1a'),
      seg('T2', 'RS1b', 'RL1a'),
      seg('T3', 'RL1b', 'F3a'),
      halfSeg('T4', 'a', 'F6b', 'JB'), halfSeg('T4', 'b', 'JB', 'RS2a'),
      seg('T5', 'RS2b', 'RL2a'),
      seg('T6', 'RL2b', 'M3a'),
      seg('T7', 'F5b', 'RS3a'),
      halfSeg('T8', 'a', 'RS3b', 'JD'), halfSeg('T8', 'b', 'JD', 'RS4a'),
      seg('T9', 'RS4b', 'RL3a'),
      seg('T10', 'JE', 'G7a'),
      seg('T12', 'F4b', 'RS5a'),
      seg('T11', 'RS5b', 'RL4a'),
    ],

    switches: [
      { id: 'AQZ21I7', label: '21I7', a: 'AQZ', b: 'F7b', x: 250, y: 110, normal: 'closed', kind: 'feeder', relay: 'AQZ21I7' },
      { id: 'RS1', a: 'RS1a', b: 'RS1b', x: 520, y: 110, normal: 'closed', kind: 'recloser', relay: 'RS1' },
      { id: 'RL1', a: 'RL1a', b: 'RL1b', x: 660, y: 110, normal: 'open', kind: 'tie', relay: 'RL1' },
      { id: '21F3', a: 'F3a', b: 'JAB', x: 1060, y: 110, normal: 'closed', kind: 'feeder', relay: '21F3' },
      { id: 'AQZ21I6', label: '21I6', a: 'AQZ', b: 'F6b', x: 250, y: 250, normal: 'closed', kind: 'feeder', relay: 'AQZ21I6' },
      { id: 'RS2', a: 'RS2a', b: 'RS2b', x: 520, y: 250, normal: 'closed', kind: 'recloser', relay: 'RS2' },
      { id: 'RL2', a: 'RL2a', b: 'RL2b', x: 660, y: 250, normal: 'open', kind: 'tie', relay: 'RL2' },
      { id: '21M3', a: 'M3a', b: 'MSJ', x: 1060, y: 250, normal: 'closed', kind: 'feeder', relay: '21M3' },
      { id: 'AQZ21I5', label: '21I5', a: 'AQZ', b: 'F5b', x: 250, y: 390, normal: 'closed', kind: 'feeder', relay: 'AQZ21I5' },
      { id: 'RS3', a: 'RS3a', b: 'RS3b', x: 320, y: 390, normal: 'closed', kind: 'recloser', relay: 'RS3' },
      { id: 'RS4', a: 'RS4a', b: 'RS4b', x: 520, y: 390, normal: 'closed', kind: 'recloser', relay: 'RS4' },
      { id: 'RL3', a: 'RL3a', b: 'JE', x: 660, y: 390, normal: 'open', kind: 'tie', relay: 'RL3' },
      { id: 'AGF21I7', label: '21I7', a: 'G7a', b: 'AGF', x: 1060, y: 390, normal: 'closed', kind: 'feeder', relay: 'AGF21I7' },
      { id: 'AQZ21I4', label: '21I4', a: 'AQZ', b: 'F4b', x: 250, y: 510, normal: 'closed', kind: 'feeder', relay: 'AQZ21I4' },
      { id: 'RS5', a: 'RS5a', b: 'RS5b', x: 520, y: 510, normal: 'closed', kind: 'recloser', relay: 'RS5' },
      { id: 'RL4', a: 'RL4a', b: 'JE', x: 720, y: 450, orient: 'v', normal: 'open', kind: 'tie', relay: 'RL4' },
      { id: 'RP1', a: 'JA', b: 'JB', x: 400, y: 180, orient: 'v', normal: 'open', kind: 'tie', relay: 'RP1' },
      { id: 'RP2', a: 'JB', b: 'JD', x: 400, y: 320, orient: 'v', normal: 'open', kind: 'tie', relay: 'RP2' },
    ],

    relays: {
      AQZ21I7: feeder(0.29),
      AQZ21I6: feeder(0.19),
      AQZ21I5: feeder(0.19),
      AQZ21I4: feeder(0.19),
      '21F3': feeder(0.19, ASSUMED_EXT),
      '21M3': feeder(0.19, ASSUMED_EXT),
      AGF21I7: feeder(0.19, ASSUMED_EXT),
      RS1: {
        rtc: 40, cycle: '1I', deadTime: 11, ref: 'Tab. 4.13',
        groups: [
          { id: 'G1', name: 'Grupo 1, operação normal', phase: P(360, 0.15, 1320), ground: P(24, 0.10, 76) },
          { id: 'G2', name: 'Grupo 2, curto na SE AQZ', when: { cause: ['loss:AQZ', 'fault:SE AQZ 13,8 kV'] }, phase: P(88, 0.55, 720), ground: P(20, 0.20, 68) },
          { id: 'G3', name: 'Grupo 3, curto na SE JAB', when: { cause: ['loss:JAB'] }, phase: P(480, 0.10, 1320), ground: P(24, 0.15, 76) },
        ],
      },
      RS2: { rtc: 40, cycle: '1I', deadTime: 11, ref: 'Tab. 3.8 / 4.13', groups: [{ id: 'G1', name: 'Grupo 1, operação normal', phase: P(240, 0.15, 840), ground: P(24, 0.15, 72) }] },
      RS3: { rtc: 40, cycle: '1I', deadTime: 11, ref: 'Tab. 3.8 / 4.13', groups: [{ id: 'G1', name: 'Grupo 1, operação normal', phase: P(160, 0.35, 1720), ground: P(24, 0.18, 76) }] },
      RS4: { rtc: 40, cycle: '1I', deadTime: 12, ref: 'Tab. 3.8 / 4.13', groups: [{ id: 'G1', name: 'Grupo 1, operação normal', phase: P(132, 0.15, 720), ground: P(20, 0.10, 68) }] },
      RS5: { rtc: 40, cycle: '1I', deadTime: 11, ref: 'Tab. 3.8 / 4.13', groups: [{ id: 'G1', name: 'Grupo 1, operação normal', phase: P(60, 0.55, 1240), ground: P(24, 0.15, 76) }] },
      RL1: {
        rtc: 40, cycle: '1I', deadTime: 12, ref: 'Tab. 4.13',
        groups: [
          { id: 'G1', name: 'Grupo 1, curto em T1 / perda de trafo da SE AQZ', when: { cause: ['fault:T1'] }, phase: P(360, 0.10, 1000), ground: P(23.6, 0.25, 72) },
          { id: 'G2', name: 'Grupo 2, curto na SE AQZ', when: { cause: ['loss:AQZ', 'fault:SE AQZ 13,8 kV'] }, phase: P(440, 0.10, 1000), ground: P(24, 0.20, 72) },
          { id: 'G3', name: 'Grupo 3, curto na SE JAB', when: { cause: ['loss:JAB'] }, phase: P(248, 0.10, 720), ground: P(20, 0.10, 72) },
        ],
      },
      RL2: { rtc: 40, cycle: '1I', deadTime: 12, ref: 'Tab. 4.13', groups: [{ id: 'G1', name: 'Grupo 1, curto em T4 / SE AQZ', phase: P(240, 0.25, 1040, 'VI'), ground: P(20, 0.15, 72, 'VI') }] },
      RL3: { rtc: 40, cycle: '1I', deadTime: 13, ref: 'Tab. 4.13', groups: [{ id: 'G1', name: 'Grupo 1, curto em T7, T8 ou SE AQZ', phase: P(132, 0.35, 560, 'VI'), ground: P(20, 0.15, 72, 'VI') }] },
      RL4: { rtc: 40, cycle: '1I', deadTime: 12, ref: 'Tab. 4.13', groups: [{ id: 'G1', name: 'Grupo 1, curto em T12', phase: P(60, 1.0, 840, 'VI'), ground: P(20, 0.15, 72, 'VI') }] },
      RP1: { rtc: 40, cycle: '1I', deadTime: 12, ref: 'Tab. 4.13', groups: [{ id: 'G1', name: 'Grupo 1, curto na SE AQZ', phase: P(70, 0.35, 560), ground: P(20, 0.12, 64) }] },
      RP2: {
        rtc: 40, cycle: '1I', deadTime: 12, ref: 'Tab. 4.13',
        groups: [
          { id: 'G1', name: 'Grupo 1, curto em T7', when: { cause: ['fault:T7'] }, phase: P(24, 1.0, 1400), ground: P(20, 0.25, 76) },
          { id: 'G2', name: 'Grupo 2, curto na SE AQZ', when: { cause: ['loss:AQZ', 'fault:SE AQZ 13,8 kV'] }, phase: P(20, 0.35, 480), ground: P(20, 0.05, 60) },
        ],
      },
    },

    decor: [
      { type: 'bar', x: 40, y1: 60, y2: 560, energizedBy: 'AQZ', label: 'BARRA 69 kV', labelRotate: true },
      { type: 'line', pts: [[40, 170], [84, 170]], energizedBy: 'AQZ' },
      { type: 'trafo', x: 100, y: 170, label: '11T1', energizedBy: 'AQZ' },
      { type: 'line', pts: [[116, 170], [200, 170]], energizedBy: 'AQZ' },
      { type: 'line', pts: [[40, 430], [84, 430]], energizedBy: 'AQZ' },
      { type: 'trafo', x: 100, y: 430, label: '11T2', energizedBy: 'AQZ' },
      { type: 'line', pts: [[116, 430], [200, 430]], energizedBy: 'AQZ' },
      { type: 'text', x: 205, y: 44, text: 'SE AQZ 69/13,8 kV', cls: 'title' },
    ],

    // Tabela 3.6: curto no fim de cada trecho, configuração normal
    validation: {
      tab36: [
        { seg: 'T1', source: 'AQZ', path: ['T1a', 'T1b'], tcc: [0.7602, 1.6336, 1.1475, 4.6280, 2321.88, 2010.806, 1506.0297, 78.2524] },
        { seg: 'T2', source: 'AQZ', path: ['T1a', 'T1b', 'T2'], tcc: [1.2347, 2.3857, 1.9748, 7.7155, 1557.44, 1348.783, 946.9542, 77.259] },
        { seg: 'T3', source: 'JAB', path: ['T3'], tcc: [1.2760, 2.4169, 2.1946, 8.8506, 1530.77, 1325.686, 866.5348, 77.0703] },
        { seg: 'T4', source: 'AQZ', path: ['T4a', 'T4b'], tcc: [0.7671, 1.6446, 1.1596, 4.6730, 2305.4523, 1996.58, 1493.2035, 78.2382] },
        { seg: 'T5', source: 'AQZ', path: ['T4a', 'T4b', 'T5'], tcc: [2.7490, 3.1662, 3.7051, 10.8549, 997.7613, 864.0866, 643.7725, 74.8798] },
        { seg: 'T6', source: 'MSJ', path: ['T6'], tcc: [0.3009, 0.9928, 0.6474, 4.7080, 4032.8694, 3492.567, 1843.2533, 78.9774] },
        { seg: 'T7', source: 'AQZ', path: ['T7'], tcc: [0.3260, 0.9452, 0.3903, 1.8020, 4184.2687, 3623.683, 3271.2672, 79.1292] },
        { seg: 'T8', source: 'AQZ', path: ['T7', 'T8a', 'T8b'], tcc: [0.9167, 1.8816, 1.4203, 5.6460, 1998.8889, 1731.089, 1260.6718, 77.9287] },
        { seg: 'T9', source: 'AQZ', path: ['T7', 'T8a', 'T8b', 'T9'], tcc: [3.4037, 3.6638, 4.5432, 12.8762, 836.5868, 724.5054, 541.6029, 73.7931] },
        { seg: 'T10', source: 'AGF', path: ['T10'], tcc: [1.5101, 3.1431, 2.6856, 13.3399, 1199.7939, 1039.052, 614.0881, 76.3396] },
        { seg: 'T11', source: 'AQZ', path: ['T12', 'T11'], tcc: [1.2945, 2.5527, 2.0936, 8.7878, 1461.7271, 1265.893, 856.084, 77.0922] },
        { seg: 'T12', source: 'AQZ', path: ['T12'], tcc: [0.9746, 1.9733, 1.5212, 6.0227, 1900.9286, 1646.252, 1188.9915, 77.8079] },
      ],
      // Tabela 4.2: recomposição esperada para falta em cada trecho
      tab42: [
        { fault: 'T1', open: ['RS1'], close: ['RL1'], restoredLoad: 232 },
        { fault: 'T2', open: [], close: [], restoredLoad: 0 },
        { fault: 'T3', open: [], close: [], restoredLoad: 0 },
        { fault: 'T4', open: ['RS2'], close: ['RL2'], restoredLoad: 150 },
        { fault: 'T5', open: [], close: [], restoredLoad: 0 },
        { fault: 'T6', open: [], close: [], restoredLoad: 0 },
        { fault: 'T7', open: ['RS3', 'RS4'], close: ['RP2', 'RL3'], restoredLoad: 100 },
        { fault: 'T8', open: ['RS4'], close: ['RL3'], restoredLoad: 87 },
        { fault: 'T9', open: [], close: [], restoredLoad: 0 },
        { fault: 'T10', open: [], close: [], restoredLoad: 0 },
        { fault: 'T11', open: [], close: [], restoredLoad: 0 },
        { fault: 'T12', open: ['RS5'], close: ['RL4'], restoredLoad: 39 },
      ],
    },

    notes: [
      { kind: 'premissa', text: 'Pontos de conexão de RP1 (em T1 e T4) e RP2 (em T4 e T8): o diagrama de impedâncias (Apêndice A de Nobre) não está no PDF disponível; adotou-se o meio de cada trecho, com metade da impedância e da carga de cada lado.' },
      { kind: 'premissa', text: 'Nobre (2013) não especifica ciclos de religamento nem atrasos intencionais: os elementos 50/50N atuam sem atraso e o religamento está desabilitado (editável na aba Proteção).' },
      { kind: 'premissa', text: 'Ajustes dos alimentadores 21F3 (JAB), 21M3 (MSJ) e 21I7 (AGF) não informados; adotados os da SE AQZ (Tab. 3.8).' },
      { kind: 'premissa', text: 'Comprimentos e composição de cabos por trecho (Anexo C de Nobre) não estão disponíveis; usam-se diretamente as impedâncias da Tab. 3.4.' },
      { kind: 'divergencia', text: 'Na Tab. 4.13 de Nobre, os grupos listados sob RS2 para "curto em T7" e "curto na SE AQZ" repetem exatamente os valores de RP2; foram desconsiderados para RS2.' },
      { kind: 'divergencia', text: 'Tab. 3.8 de Nobre: o "ajuste inst" do neutro de 21I4 aparece como 12,8 (os demais 2,56), mas o valor primário é 256 A como nos outros; usado 256 A.' },
    ],
  };

  SH.scenarios[scn.id] = scn;
  if (typeof module !== 'undefined' && module.exports) module.exports = scn;
})(typeof window !== 'undefined' ? window : globalThis);
