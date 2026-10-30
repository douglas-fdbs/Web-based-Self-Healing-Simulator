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
  // Nos ensaios a qualidade da mensagem GOOSE não foi verificada (seção 5.3.1).
  const LAB = (extra) => Object.assign({ relayDelay: LAB_DELAY, slQuality: false }, NO_RECLOSE, extra);
  // Ajuste real do RL2 do laboratório (SEL-751, 50P1D = 0,02 s); a Tab. 4.13 dá 0,03 s.
  const RL2_LAB = { RL3: 0.02 };
  const closeIn21I5 = { kind: 'segment', seg: 'T8', x: 0, type: '3F' }; // logo após 21I5: 9419 A
  const afterRS4 = { kind: 'segment', seg: 'T9', x: 0, type: '3F' }; // logo após RS4: 4715 A
  const afterRL3 = { kind: 'segment', seg: 'T10', x: 0, type: '3F' }; // logo após RL3: 2146 A
  const closeIn21I5FT = Object.assign({}, closeIn21I5, { type: 'FT' }); // 10176 A
  const afterRS4FT = Object.assign({}, afterRS4, { type: 'FT' }); // 3309 A
  const maxReach21I5 = { RL3: true, '21S1': false }; // RL3 alimentado por 21I5 (Fig. 4.6c)
  // Nos ensaios de religamento o 52A não estava ligado ("52A = 0") e o tempo morto
  // (79OI) só começou a contar no fim do pulso de trip (TDURD = 0,5 s): o religamento
  // saiu 10,51 s, 11,51 s e 12,5 s depois do trip. O preset desconta a abertura de 50 ms.
  const LAB_DEAD = (oi) => oi + 0.5 - 0.05;
  const RECLOSE_NOTE = 'No laboratório o contato 52A não estava ligado (52A = 0) e o tempo morto só começou a contar no fim do pulso de trip (TDURD = 0,5 s); por isso o religamento saiu cerca de 0,5 s depois do ajuste. Em campo, com o 52A ligado, o tempo morto conta a partir da abertura do disjuntor.';
  const MONO_NOTE = 'Ensaio registrado nos relatórios da mala, mas não detalhado no texto do TCC. Nos ensaios monofásicos a mala injetou só as fases (I1 a I3 em um relé, I4 a I6 no outro). No SEL-751 os elementos 50N/51N medem o canal IN, que não recebeu corrente: os tempos medidos só são coerentes com os elementos de fase (com neutro, 21I5 abriria pelo 51N em cerca de 200 ms). Por isso o ensaio é simulado com os elementos de neutro fora de serviço.';

  // "lab" = valor medido no relatório da mala (ms após o início da falta, ou intervalo entre GOOSEs).
  const tests = [
    {
      id: 'r1', group: '5.6 Religamento automático', title: 'Religamento de um IED (AQZ = 21I5)',
      ref: 'Seção 5.6.1, Fig. 5.12; Apêndice B, Tabs. B1 a B3',
      description: 'Falta permanente logo após 21I5. Ciclo 1I+2T do TCC (um religamento instantâneo e dois temporizados, Tab. 4.11), implementado no SEL-751 com E79 = 3 e torque control "AND (SH0 OR SH1)": 50 habilitado nas duas primeiras aberturas e três religamentos.',
      note: RECLOSE_NOTE,
      setup: { fault: closeIn21I5, options: { sra: false, relayDelay: LAB_DELAY, relaysOff: ['01Z2'], cycleOverrides: { '21I5': ['I', 'I', 'T', 'T'] }, deadOverrides: { '21I5': LAB_DEAD(10) } } },
      measures: [
        { label: 'Número de aberturas do 21I5', tcc: '4 (três religamentos)', labText: '4', value: { type: 'count', dev: '21I5' }, unit: '' },
        { label: 'Elemento de cada abertura', tcc: '50, 50, 51, 51', labText: '50, 50, 51, 51 (faltas de 0,18/0,17/0,27/0,27 s)', value: { type: 'tripElements', dev: '21I5' }, unit: '' },
        { label: 'Trip → religamento', tcc: '10 s', lab: 10.51, value: { type: 'tripToClose', dev: '21I5', n: 0 }, unit: 's' },
      ],
    },
    {
      id: 'r3', group: '5.6 Religamento automático', title: 'Religamento de um IED (RL1 = RS4)',
      ref: 'Apêndice B, Tabs. B4 a B6',
      description: 'Falta permanente logo após RS4, com os demais relés fora de serviço, como no ensaio isolado da mala. RL1 tem E79 = 2 (três operações instantâneas) e tempo morto de 11 s.',
      note: RECLOSE_NOTE,
      setup: { fault: afterRS4, options: { sra: false, relayDelay: LAB_DELAY, relaysOff: ['21I5', '01Z2'], deadOverrides: { RS4: LAB_DEAD(11) } } },
      measures: [
        { label: 'Número de aberturas de RS4', tcc: '-', labText: '3', value: { type: 'count', dev: 'RS4' }, unit: '' },
        { label: 'Elemento de cada abertura', tcc: '-', labText: '50, 50, 50 (faltas de 0,133 s)', value: { type: 'tripElements', dev: 'RS4' }, unit: '' },
        { label: 'Trip → religamento', tcc: '-', lab: 11.51, value: { type: 'tripToClose', dev: 'RS4', n: 0 }, unit: 's' },
      ],
    },
    {
      id: 'r4', group: '5.6 Religamento automático', title: 'Religamento de um IED (RL2 = RL3)',
      ref: 'Apêndice B, Tabs. B7 a B9',
      description: 'Falta permanente logo após RL3 (alimentado por 21I5), com os demais relés fora de serviço. RL2 do ensaio (RL3 do campo, grupo 2) tem E79 = 1: duas aberturas e tempo morto de 12 s, como pede o critério da Tab. 4.12. A Tab. 4.13 imprime "1I" para esse grupo.',
      note: RECLOSE_NOTE,
      setup: { fault: afterRL3, stateMods: maxReach21I5, options: { sra: false, relayDelay: LAB_DELAY, relaysOff: ['21I5', 'RS4', '01Z2'], instDelayOverrides: RL2_LAB, cycleOverrides: { RL3: ['I', 'I'] }, deadOverrides: { RL3: LAB_DEAD(12) } } },
      measures: [
        { label: 'Número de aberturas de RL3', tcc: '-', labText: '2', value: { type: 'count', dev: 'RL3' }, unit: '' },
        { label: 'Trip → religamento', tcc: '-', lab: 12.50, value: { type: 'tripToClose', dev: 'RL3', n: 0 }, unit: 's' },
      ],
    },
    {
      id: 'r2', group: '5.6 Religamento automático', title: 'Religamento de dois IEDs (AQZ + RL1)',
      ref: 'Seção 5.6.2, Fig. 5.13; Apêndice B, tabela de GOOSEs AQZ-RL1',
      description: 'Falta permanente logo após RS4, com AQZ em 1I+2T (aberturas 50, 50, 51, 51) e RL1 em 3I. Pelo Apêndice B, os dois abrem na primeira e na segunda falta; na terceira AQZ já está com o 50 bloqueado e só RL1 abre, até bloquear.',
      note: 'O texto da seção 5.6.2 diz que AQZ "não mais atuou durante as faltas subsequentes", mas a tabela de GOOSEs do Apêndice B registra trip de AQZ também na segunda falta (GI1 em 12,28 s), coerente com o 50 habilitado em SH0 e SH1. ' + RECLOSE_NOTE,
      setup: { fault: afterRS4, options: { sra: false, relayDelay: LAB_DELAY, relaysOff: ['01Z2'], cycleOverrides: { '21I5': ['I', 'I', 'T', 'T'] }, deadOverrides: { '21I5': LAB_DEAD(10), RS4: LAB_DEAD(11) } } },
      measures: [
        { label: 'Aberturas de 21I5', tcc: '1 (só na primeira falta)', labText: '2 (1ª e 2ª faltas)', value: { type: 'count', dev: '21I5' }, unit: '' },
        { label: 'Aberturas de RS4 (RL1)', tcc: 'ciclo completo até bloquear', labText: '3', value: { type: 'count', dev: 'RS4' }, unit: '' },
        { label: 'Estado final de 21I5', tcc: 'fechado, suprindo T8', labText: 'fechado', value: { type: 'finalState', dev: '21I5' }, unit: '' },
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

  // Seção 5.5 e Apêndice A: ensaios de sobrecorrente (programa Manual da mala),
  // falta ABC, ajustes secundários do relé ensaiado. [I (A sec), t medido (s), status]
  const overcurrent = [
    { id: 'AQZ_MT', dev: '01Z2', ref: 'Tabs. A1 a A3', set: { curve: 'NI', dial: 0.20, pickup: 1.18, inst: 5.10, instDelay: 0.10 },
      pickupTest: { p51: [1.18, 1.43, 'Aprov.'], p50: [5.10, 5.11, 'Aprov.'] },
      points: [[2, 2.65, 'Aprov.'], [2.5, 1.85, 'Aprov.'], [3, 1.49, 'Aprov.'], [4, 1.13, 'Aprov.'], [5, 0.960, 'Aprov.'], [6, 0.123, 'Aprov.'], [7, 0.121, 'Aprov.'], [8, 0.119, 'Aprov.'], [9, 0.116, 'Aprov.'], [10, 0.116, 'Aprov.']] },
    { id: 'AQZ', dev: '21I5', ref: 'Tabs. A4 a A6', set: { curve: 'MI', dial: 0.23, pickup: 1.14, inst: 5.70, instDelay: 0.10 },
      pickupTest: { p51: [1.14, 1.64, 'Aprov.'], p50: [5.70, 5.72, 'Aprov.'] },
      points: [[2, 4.12, 'Aprov.'], [2.5, 2.61, 'Aprov.'], [3, 1.91, 'Aprov.'], [4, 1.24, 'Aprov.'], [5, 0.922, 'Aprov.'], [6, 0.123, 'Aprov.'], [7, 0.122, 'Aprov.'], [8, 0.119, 'Aprov.'], [9, 0.117, 'Aprov.'], [10, 0.118, 'Aprov.']] },
    { id: 'RL1', dev: 'RS4', ref: 'Tabs. A7 a A9', set: { curve: 'MI', dial: 0.10, pickup: 1.05, inst: 8.87, instDelay: 0.05 },
      pickupTest: { p51: [1.05, 1.48, 'Reprov.'], p50: [8.87, 8.89, 'Aprov.'] },
      points: [[2, 1.50, 'Aprov.'], [2.5, 0.980, 'Aprov.'], [3, 0.730, 'Aprov.'], [4, 0.489, 'Aprov.'], [5, 0.361, 'Aprov.'], [9.5, 0.0690, 'Aprov.'], [11, 0.0684, 'Reprov.'], [12, 0.0662, 'Reprov.'], [13, 0.0628, 'Reprov.'], [14, 0.0646, 'Reprov.']] },
    { id: 'RL2', dev: 'RL3', ref: 'Tabs. A10 a A12', set: { curve: 'MI', dial: 0.05, pickup: 0.95, inst: 4.23, instDelay: 0.02 },
      pickupTest: { p51: [0.95, 1.41, 'Reprov.'], p50: [4.23, 4.24, 'Aprov.'] },
      points: [[2, 0.614, 'Aprov.'], [2.5, 0.417, 'Aprov.'], [3, 0.312, 'Aprov.'], [3.5, 0.255, 'Aprov.'], [4, 0.212, 'Aprov.'], [5, 0.0405, 'Reprov.'], [6, 0.0360, 'Reprov.'], [7, 0.0352, 'Reprov.'], [8, 0.0343, 'Reprov.'], [9, 0.0327, 'Reprov.']] },
  ];
  const OVERCURRENT_NOTE = 'Os pontos "Reprov." de tempo definido (RL1 e RL2) ficaram fora da janela de ±10% configurada na mala porque ela não considera o processamento do relé (13 a 20 ms além do ajuste, o mesmo efeito medido nos ensaios com GOOSE). O pickup do 51 medido com rampa ficou 21% a 48% acima do ajuste em todos os relés, e "Reprov." em RL1 e RL2: com corrente crescente, a rampa registra o instante do trip temporizado, e não o da partida. O texto do TCC afirma que todas as atuações ficaram dentro da margem; as tabelas do Apêndice A não confirmam isso.';

  /** Tempo simulado de um ponto do Apêndice A (mesmas equações do motor, com o processamento calibrado). */
  function overcurrentTime(set, I, opts = {}) {
    const PR = SH.protection;
    const delay = opts.relayDelay != null ? opts.relayDelay : LAB_DELAY;
    const t51 = PR.curveTime(set.curve, set.dial, I / set.pickup, opts.Mmax || 30);
    const t50 = I > set.inst ? set.instDelay + delay : Infinity;
    return t50 < t51 ? { t: t50, el: '50' } : { t: t51, el: '51' };
  }

  const examples = [
    { id: 'ex-fig43', scenario: 'tcc2015', title: 'Fig. 4.3: falta permanente em T1', description: '21I7 religa três vezes e bloqueia; o SRA abre RS1 e fecha RL1, e T2 passa a ser suprido pela SE ESB.', fault: { kind: 'segment', seg: 'T1', x: 0.5, type: '3F' } },
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
    if (v.type === 'tripElements') {
      const lab = { P50: '50', N50: '50N', P51: '51', N51: '51N', B51: '51 ret.', REMTRIP: 'REMTRIP' };
      return trips(v.dev).map((t) => lab[t.el] || t.el).join(', ') || 'não abriu';
    }
    if (v.type === 'tripToClose') {
      const t = trips(v.dev)[v.n];
      if (!t) return null;
      const c = res.log.find((e) => e.cat === 'disjuntor' && e.dev === v.dev && /fechou/.test(e.text) && e.t > t.t);
      return c ? c.t - t.t : null;
    }
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

  SH.labs = { tests, examples, measure, buildInput, LAB_DELAY, CLEAR_NOTE, overcurrent, overcurrentTime, OVERCURRENT_NOTE };
  if (typeof module !== 'undefined' && module.exports) module.exports = SH.labs;
})(typeof window !== 'undefined' ? window : globalThis);
