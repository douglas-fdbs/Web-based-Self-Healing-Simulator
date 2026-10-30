# Validação do simulador

Documento gerado automaticamente por `node tools/validation-report.js` a partir do código do simulador.
Os mesmos casos são verificados pela suíte `npm test` (`tests/validation.test.js`).

## 1. Curto-circuito: Tabela 4.7 do TCC (Rodrigues, 2015)

Barras da configuração de alcance máximo de cada alimentador (Fig. 4.6), alimentadas pela SE AQZ. Correntes em A.

| Alimentador | Barra | Icc3F sim. | Icc3F TCC | Icc2F sim. | Icc2F TCC | IccFT sim. | IccFT TCC | IccFTm sim. | IccFTm TCC | Maior erro |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 21I7 | AQZ | 9.420,3 | 9.419,4 | 8.158,2 | 8.157,4 | 10.175,9 | 10.175,6 | 79,7 | 79,7 | 0,053% |
| 21I7 | RS1 | 2.622,2 | 2.622,2 | 2.270,9 | 2.270,9 | 1.619,8 | 1.619,8 | 78,4 | 78,4 | 0,015% |
| 21I7 | RL1 | 2.231,1 | 2.231,1 | 1.932,2 | 1.932,2 | 1.349,7 | 1.349,7 | 78,1 | 78,1 | 0,009% |
| 21I7 | RS3 | 1.815,7 | 1.815,8 | 1.572,5 | 1.572,5 | 1.075,3 | 1.075,3 | 77,6 | 77,6 | 0,043% |
| 21I7 | ESB | 1.657,6 | 1.657,6 | 1.435,5 | 1.435,6 | 939,8 | 939,8 | 77,1 | 77,1 | 0,061% |
| 21I6 | RS2 | 2.575,0 | 2.574,9 | 2.230,0 | 2.229,9 | 1.586,5 | 1.586,4 | 78,4 | 78,4 | 0,026% |
| 21I6 | RL2 | 2.070,7 | 2.070,7 | 1.793,3 | 1.793,3 | 1.242,3 | 1.242,2 | 77,9 | 77,9 | 0,061% |
| 21I6 | ESB | 1.483,2 | 1.483,2 | 1.284,5 | 1.284,5 | 785,9 | 785,9 | 76,3 | 76,3 | 0,040% |
| 21I6 | RL3 | 1.034,5 | 1.034,5 | 895,9 | 895,9 | 620,2 | 620,2 | 75,3 | 75,3 | 0,026% |
| 21I6 | RS4 | 814,3 | 814,3 | 705,2 | 705,2 | 485,0 | 485,0 | 74,0 | 74,0 | 0,047% |
| 21I5 | RS4 | 4.715,5 | 4.715,1 | 4.083,7 | 4.083,4 | 3.309,3 | 3.309,2 | 79,2 | 79,2 | 0,034% |
| 21I5 | RL3 | 2.146,4 | 2.146,3 | 1.858,8 | 1.858,8 | 1.335,8 | 1.335,8 | 77,9 | 77,9 | 0,023% |
| 21I5 | ESB | 1.122,6 | 1.122,6 | 972,2 | 972,2 | 638,5 | 638,5 | 74,9 | 74,9 | 0,037% |
| 21I5 | RL2 | 1.048,1 | 1.048,1 | 907,7 | 907,7 | 641,5 | 641,5 | 75,3 | 75,3 | 0,029% |
| 21I4 | RS5 | 1.621,0 | 1.621,0 | 1.403,8 | 1.403,8 | 955,7 | 955,7 | 77,4 | 77,4 | 0,005% |
| 21I4 | RS6 | 1.374,9 | 1.374,9 | 1.190,7 | 1.190,7 | 801,8 | 801,8 | 76,9 | 76,9 | 0,013% |
| 21I4 | RL4 | 1.374,6 | 1.374,5 | 1.190,4 | 1.190,4 | 801,6 | 801,6 | 76,9 | 76,9 | 0,012% |
| 21I4 | RS7 | 977,2 | 977,2 | 846,3 | 846,3 | 560,1 | 560,1 | 75,6 | 75,6 | 0,057% |

Maior erro relativo: **0,061%** (arredondamento das impedâncias publicadas).

## 2. Curto-circuito: planilha de cálculos do TCC (fontes AQZ, ESB e AGF)

Aba "Z(pu) Acumulado e curtocircuito" da planilha do autor (pasta ARTIGO_REI). Inclui os caminhos alimentados pelas SEs ESB e AGF, que a Tab. 4.7 não traz. Correntes em A.

| Fonte | Alimentador | Barra | Icc3F sim. | Icc3F ref. | IccFT sim. | IccFT ref. | Maior erro (4 tipos) |
|---|---|---|---:|---:|---:|---:|---:|
| ESB | 21S7 | ESB | 8.170,9 | 8.170,9 | 9.069,5 | 9.069,5 | 0,0000% |
| ESB | 21S7 | RS3 | 5.833,1 | 5.832,8 | 4.168,6 | 4.168,5 | 0,0046% |
| ESB | 21S7 | RL1 | 3.692,6 | 3.692,7 | 2.330,8 | 2.330,8 | 0,0018% |
| ESB | 21S7 | RS1 | 2.967,4 | 2.967,5 | 1.809,2 | 1.809,2 | 0,0027% |
| ESB | 21S7 | AQZ | 1.612,3 | 1.612,4 | 928,9 | 928,9 | 0,0039% |
| ESB | 21S1 | T11 | 5.450,7 | 5.450,9 | 2.925,5 | 2.925,5 | 0,0046% |
| ESB | 21S1 | RL3 | 1.877,5 | 1.877,6 | 1.082,2 | 1.082,2 | 0,0033% |
| ESB | 21S1 | RS4 | 1.258,9 | 1.259,0 | 728,5 | 728,6 | 0,0026% |
| ESB | 21S1 | 21I5 | 1.102,3 | 1.102,3 | 633,5 | 633,5 | 0,0016% |
| ESB | 21S1 | RL2 | 3.260,6 | 3.260,8 | 1.741,1 | 1.741,1 | 0,0035% |
| ESB | 21S1 | RS2 | 2.496,6 | 2.496,8 | 1.335,6 | 1.335,6 | 0,0052% |
| ESB | 21S1 | 21I6 | 1.446,9 | 1.446,9 | 778,2 | 778,2 | 0,0022% |
| AGF | 21I2 | AGF | 6.010,5 | 6.010,5 | 6.191,7 | 6.191,7 | 0,0003% |
| AGF | 21I2 | RS7 | 1.727,9 | 1.727,9 | 848,9 | 848,9 | 0,0007% |
| AGF | 21I2 | RL4 | 1.145,6 | 1.145,6 | 583,6 | 583,6 | 0,0019% |
| AGF | 21I2 | RS6 | 1.145,4 | 1.145,4 | 583,5 | 583,5 | 0,0036% |
| AGF | 21I2 | RS5 | 1.017,1 | 1.017,1 | 522,4 | 522,4 | 0,0036% |
| AGF | 21I2 | AQZ | 665,6 | 665,6 | 348,9 | 348,9 | 0,0022% |

Tabela acima: só as 18 barras alimentadas por ESB e AGF. Nas 42 barras da planilha (incluindo as 24 alimentadas pela SE AQZ), o maior erro relativo é **0,0098%**.

## 3. Curto-circuito: Tabela 3.6 de Nobre (2013), primeira topologia

| Trecho | Fonte | Icc3F sim. | Icc3F ref. | Icc2F sim. | Icc2F ref. | IccFT sim. | IccFT ref. | IccFTm sim. | IccFTm ref. | Maior erro |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| T1 | AQZ | 2.321,93 | 2.321,88 | 2.010,85 | 2.010,81 | 1.506,05 | 1.506,03 | 78,25 | 78,25 | 0,0022% |
| T2 | AQZ | 1.557,44 | 1.557,44 | 1.348,78 | 1.348,78 | 946,95 | 946,95 | 77,26 | 77,26 | 0,0002% |
| T3 | JAB | 1.530,78 | 1.530,77 | 1.325,69 | 1.325,69 | 866,53 | 866,53 | 77,07 | 77,07 | 0,0005% |
| T4 | AQZ | 2.305,44 | 2.305,45 | 1.996,57 | 1.996,58 | 1.493,19 | 1.493,20 | 78,24 | 78,24 | 0,0008% |
| T5 | AQZ | 997,77 | 997,76 | 864,09 | 864,09 | 643,77 | 643,77 | 74,88 | 74,88 | 0,0004% |
| T6 | MSJ | 4.032,88 | 4.032,87 | 3.492,58 | 3.492,57 | 1.843,26 | 1.843,25 | 78,98 | 78,98 | 0,0006% |
| T7 | AQZ | 4.184,37 | 4.184,27 | 3.623,77 | 3.623,68 | 3.271,33 | 3.271,27 | 79,13 | 79,13 | 0,0024% |
| T8 | AQZ | 1.998,88 | 1.998,89 | 1.731,08 | 1.731,09 | 1.260,67 | 1.260,67 | 77,93 | 77,93 | 0,0007% |
| T9 | AQZ | 836,58 | 836,59 | 724,50 | 724,51 | 541,60 | 541,60 | 73,79 | 73,79 | 0,0003% |
| T10 | AGF | 1.199,78 | 1.199,79 | 1.039,04 | 1.039,05 | 614,09 | 614,09 | 76,34 | 76,34 | 0,0009% |
| T11 | AQZ | 1.461,72 | 1.461,73 | 1.265,89 | 1.265,89 | 856,08 | 856,08 | 77,09 | 77,09 | 0,0003% |
| T12 | AQZ | 1.900,94 | 1.900,93 | 1.646,26 | 1.646,25 | 1.188,99 | 1.188,99 | 77,81 | 77,81 | 0,0008% |

Maior erro relativo: **0,0024%**.

## 4. Recomposição automática: Tabela 4.2 de Nobre (2013)

Falta trifásica permanente no meio de cada trecho, configuração normal, esquema convencional, self-healing ligado.

| Falta | Bloqueio (proteção) | Manobras do SRA (simulador) | Esperado (Nobre, Tab. 4.2) | Confere |
|---|---|---|---|:---:|
| T1 | 21I7 | Abrir RS1; Fechar RL1 | abre RS1; fecha RL1 | sim |
| T2 | RS1 | nenhuma | nenhuma | sim |
| T3 | 21F3 | nenhuma | nenhuma | sim |
| T4 | 21I6 | Abrir RS2; Fechar RL2 | abre RS2; fecha RL2 | sim |
| T5 | RS2 | nenhuma | nenhuma | sim |
| T6 | 21M3 | nenhuma | nenhuma | sim |
| T7 | 21I5 | Abrir RS3; Abrir RS4; Fechar RL3; Fechar RP2 | abre RS3, RS4; fecha RP2, RL3 | sim |
| T8 | 21I5, RS3 | Abrir RS4; Fechar RL3; Religar 21I5 | abre RS4; fecha RL3 | sim¹ |
| T9 | RS4 | nenhuma | nenhuma | sim |
| T10 | 21I7 | nenhuma | nenhuma | sim |
| T11 | RS5 | nenhuma | nenhuma | sim |
| T12 | 21I4 | Abrir RS5; Fechar RL4 | abre RS5; fecha RL4 | sim |

¹ Com os ajustes de Nobre (instantâneos sem atraso intencional), uma falta no meio de T8 (3,3 kA) supera o pickup instantâneo de 21I5 (2,5 kA) e de RS3 (1,72 kA): os dois abrem. O SRA isola a falta e religa 21I5, manobra que não aparece na Tab. 4.2 porque aquela tabela supõe atuação seletiva.

## 5. Recomposição na rede atual (TCC, Fig. 4.2)

| Caso | Manobras do SRA | Carga sem suprimento ao final | Observação |
|---|---|---:|---|
| Falta em T1 (Fig. 4.3) | Abrir RS1; Fechar RL1 | 23 A | reproduz a Fig. 4.3 do TCC |
| Falta em T5 | Abrir RS2; Fechar RL2 | 21 A |  |
| Falta em T8 | Abrir RS4; Fechar RL3 | 83 A |  |
| Falta em T12 | Abrir RS5; Abrir RS6; Fechar RL4 | 168 A | T13+T14 levaria T16 a 454 A > 438 A: só T14 é recomposto |
| Falta em T16 | Abrir RS7; Fechar RL4 | 246 A |  |
| Perda da SE ESB | Abrir 21S7; Abrir 21S1; Fechar RL1; Fechar RL2 | 0 A |  |
| Falta no barramento 13,8 kV da SE AQZ | Abrir 21I7; Abrir 21I6; Abrir 21I5; Abrir 21I4; Fechar RL3; Fechar RL2; Fechar RL1; Abrir RS6; Fechar RL4 | 168 A | coerente com Vieira (2015): parte de 21I4 não cabe na SE AGF |

## 6. Ensaios do Capítulo 5 do TCC contra os relatórios da mala de testes

Os valores "Medido" vêm dos relatórios do Sequenc (mala Conprove CE-6006, out/2015) da pasta ARTIGO_REI: instantes das transições GOOSE (GI) menos os 100 ms de pré-falta, ou intervalo entre duas transições. As correntes injetadas confirmam os pontos de falta usados (9.419 A, 10.176 A, 4.715 A, 3.309 A e 2.145 A primários).

Os presets reproduzem o laboratório: ajustes do arquivo do SEL-751 usado nos ensaios quando diferem da Tab. 4.13 (ciclo 2I+2T de AQZ, atraso de 0,02 s no 50 de RL2), disjuntor de 50 ms (atraso programado na mala), GOOSE de 3 ms e tempo de processamento do relé de 13 ms nos elementos 50/50N e no 50BF. Esse valor é a mediana do atraso entre o tempo ajustado e o GOOSE de trip nos ensaios trifásicos (10 a 16 ms; no 50BF, 8 a 13 ms).

| Ensaio | Medida | TCC (texto) | Medido | Simulado | Diferença |
|---|---|---|---:|---:|---:|
| Seção 5.6.1: Religamento de um IED (AQZ = 21I5) | Número de aberturas do 21I5 | 4 (três religamentos) | 4 | 4 |  |
|  | Elemento de cada abertura | 50, 50, 51, 51 | 50, 50, 51, 51 (faltas de 0,18/0,17/0,27/0,27 s) | 50, 50, 51, 51 |  |
|  | Trip → religamento | 10 s | 10,51 s | 10,50 s | -10 ms |
| Apêndice B: Religamento de um IED (RL1 = RS4) | Número de aberturas de RS4 | - | 3 | 3 |  |
|  | Elemento de cada abertura | - | 50, 50, 50 (faltas de 0,133 s) | 50, 50, 50 |  |
|  | Trip → religamento | - | 11,51 s | 11,50 s | -10 ms |
| Apêndice B: Religamento de um IED (RL2 = RL3) | Número de aberturas de RL3 | - | 2 | 2 |  |
|  | Trip → religamento | - | 12,50 s | 12,50 s | +0 ms |
| Seção 5.6.2: Religamento de dois IEDs (AQZ + RL1) | Aberturas de 21I5 | 1 (só na primeira falta) | 2 (1ª e 2ª faltas) | 2 |  |
|  | Aberturas de RS4 (RL1) | ciclo completo até bloquear | 3 | 3 |  |
|  | Estado final de 21I5 | fechado, suprindo T8 | fechado | fechado |  |
| Seção 5.7.1(a): Seletividade lógica + 50BF (trifásico) | Trip 50P de 21I5 após a falta | - | 115,2 ms | 113,0 ms | -2,2 ms |
|  | Trip de 21I5 → trip de AQZ_MT | 217 ms | 216,5 ms | 216,0 ms | -0,5 ms |
|  | Eliminação da falta¹ | ≈ 400 ms | 400,0 ms | 379,0 ms | -21,0 ms |
| Seção 5.7.1(b): Só seletividade lógica, sem 50BF (trifásico) | Trip de 21I5 → trip 51P de AQZ_MT | 476 ms | 477,1 ms | 480,8 ms | +3,7 ms |
|  | Eliminação da falta¹ | ≈ 650 ms | 650,0 ms | 643,8 ms | -6,2 ms |
| Seção 5.7.1(c): Sem seletividade lógica e sem 50BF (trifásico) | Trip de AQZ_MT | pouco mais de 100 ms | 117,7 ms | 113,0 ms | -4,7 ms |
|  | Trip de 21I5 | pouco mais de 100 ms | 110,1 ms | 113,0 ms | +2,9 ms |
|  | Eliminação da falta¹ | pouco menos de 200 ms | 183,3 ms | 163,0 ms | -20,3 ms |
| Relatório AQZ_MT-AQZ nº 4: Seletividade lógica + 50BF (fase-terra) | Trip 50P de 21I5 após a falta | - | 114,4 ms | 113,0 ms | -1,4 ms |
|  | Trip de 21I5 → trip de AQZ_MT | - | 214,2 ms | 216,0 ms | +1,8 ms |
|  | Eliminação da falta¹ | - | 400,0 ms | 379,0 ms | -21,0 ms |
| Relatório AQZ_MT-AQZ nº 5: Só seletividade lógica, sem 50BF (fase-terra) | Trip de AQZ_MT após a falta | - | 574,6 ms | 574,1 ms | -0,5 ms |
|  | Trip de 21I5 → trip de AQZ_MT | - | 463,1 ms | 461,1 ms | -2,0 ms |
| Relatório AQZ_MT-AQZ nº 6: Sem seletividade lógica e sem 50BF (fase-terra) | Trip de AQZ_MT | - | 119,3 ms | 113,0 ms | -6,3 ms |
|  | Trip de 21I5 | - | 112,5 ms | 113,0 ms | +0,5 ms |
| Seção 5.7.2: Seletividade lógica + 50BF (trifásico) | Trip 50P de RS4 após a falta | - | 62,7 ms | 63,0 ms | +0,3 ms |
|  | Trip de RS4 → trip de 21I5 | 217 ms | 217,7 ms | 216,0 ms | -1,7 ms |
|  | Eliminação da falta¹ | ≈ 360 ms | 350,0 ms | 329,0 ms | -21,0 ms |
| Seção 5.7.2: Só seletividade lógica, sem 50BF (trifásico) | Trip de RS4 → trip 51P de 21I5 | 372 ms | 369,9 ms | 363,9 ms | -6,0 ms |
|  | Trip 51P de 21I5 após a falta | ≈ 430 ms | 430,9 ms | 426,9 ms | -4,0 ms |
|  | Eliminação da falta¹ | ≈ 500 ms | 500,0 ms | 476,9 ms | -23,1 ms |
| Seção 5.7.2: Sem seletividade lógica e sem 50BF (trifásico) | Trip de RS4 | atua | 61,8 ms | 63,0 ms | +1,2 ms |
|  | Trip de 21I5 | também atua | 116,1 ms | 113,0 ms | -3,1 ms |
| Relatório AQZ-RL1 monofásico com 50BF: Seletividade lógica + 50BF (fase-terra) | Trip 50P de RS4 após a falta | - | 72,4 ms | 63,0 ms | -9,4 ms |
|  | Trip de RS4 → trip de 21I5 | - | 218,4 ms | 216,0 ms | -2,4 ms |
| Relatório AQZ-RL1 monofásico sem 50BF: Só seletividade lógica, sem 50BF (fase-terra) | Trip 51P de 21I5 após a falta | - | 654,0 ms | 646,1 ms | -7,9 ms |
|  | Trip de RS4 → trip de 21I5 | - | 582,1 ms | 583,1 ms | +1,0 ms |
| Seção 5.7.3: SL bloqueando só o 50 + 50BF | Elemento que abriu RS4 | 51 (antes do 50BF) | 51 (GOOSE 7,8 ms antes do 50BF) | 51P (fase, tempo inverso) |  |
|  | Trip de RS4 após a falta | - | 238,3 ms | 232,2 ms | -6,1 ms |
|  | Trip 50P de RL3 → trip de RS4 | < 50BF | 204,8 ms | 199,2 ms | -5,6 ms |
| Seção 5.7.3: SL bloqueando 50 e 51 + retaguarda (+200 ms) + 50BF | Trip 50P de RL3 → trip de RS4 | 204 ms | 213,7 ms | 216,0 ms | +2,3 ms |
|  | Eliminação da falta¹ | ≈ 300 ms | 317,0 ms | 299,0 ms | -18,0 ms |
| Seção 5.7.3: Mesmo esquema sem o trip por 50BF | Elemento que abriu RS4 | 51 de retaguarda (Phase TOC) | 51 de retaguarda | 51 de retaguarda (+ somador) |  |
|  | Trip de RS4 após a falta | - | 443,4 ms | 432,2 ms | -11,2 ms |
|  | Eliminação da falta¹ | atraso maior que no caso anterior | 500,0 ms | 482,2 ms | -17,8 ms |

¹ No relatório, a eliminação é o início do estado pós-falta da mala, que avança 50 ms (atraso programado) depois de receber o GOOSE de trip; a recepção acrescenta de 7 a 21 ms. No simulador, é o trip mais os 50 ms de abertura do disjuntor.

### 6.1 Sobrecorrente (seção 5.5 e Apêndice A)

Pontos I × t dos quatro relés, com os ajustes secundários do relé ensaiado. O simulado usa as equações do motor (curva IEC limitada a M = 30 e tempo definido com 13 ms de processamento).

| Relé | I (A sec.) | Elemento | Medido | Simulado | Diferença | Status na mala |
|---|---:|---|---:|---:|---:|---|
| AQZ_MT | 2,0 | 51 | 2.650,0 ms | 2.639,4 ms | -10,6 ms | Aprov. |
|  | 2,5 | 51 | 1.850,0 ms | 1.850,8 ms | +0,8 ms | Aprov. |
|  | 3,0 | 51 | 1.490,0 ms | 1.486,4 ms | -3,6 ms | Aprov. |
|  | 4,0 | 51 | 1.130,0 ms | 1.132,9 ms | +2,9 ms | Aprov. |
|  | 5,0 | 51 | 960,0 ms | 955,6 ms | -4,4 ms | Aprov. |
|  | 6,0 | 50 | 123,0 ms | 113,0 ms | -10,0 ms | Aprov. |
|  | 7,0 | 50 | 121,0 ms | 113,0 ms | -8,0 ms | Aprov. |
|  | 8,0 | 50 | 119,0 ms | 113,0 ms | -6,0 ms | Aprov. |
|  | 9,0 | 50 | 116,0 ms | 113,0 ms | -3,0 ms | Aprov. |
|  | 10,0 | 50 | 116,0 ms | 113,0 ms | -3,0 ms | Aprov. |
| AQZ | 2,0 | 51 | 4.120,0 ms | 4.115,9 ms | -4,1 ms | Aprov. |
|  | 2,5 | 51 | 2.610,0 ms | 2.602,7 ms | -7,3 ms | Aprov. |
|  | 3,0 | 51 | 1.910,0 ms | 1.903,1 ms | -6,9 ms | Aprov. |
|  | 4,0 | 51 | 1.240,0 ms | 1.237,7 ms | -2,3 ms | Aprov. |
|  | 5,0 | 51 | 922,0 ms | 917,0 ms | -5,0 ms | Aprov. |
|  | 6,0 | 50 | 123,0 ms | 113,0 ms | -10,0 ms | Aprov. |
|  | 7,0 | 50 | 122,0 ms | 113,0 ms | -9,0 ms | Aprov. |
|  | 8,0 | 50 | 119,0 ms | 113,0 ms | -6,0 ms | Aprov. |
|  | 9,0 | 50 | 117,0 ms | 113,0 ms | -4,0 ms | Aprov. |
|  | 10,0 | 50 | 118,0 ms | 113,0 ms | -5,0 ms | Aprov. |
| RL1 | 2,0 | 51 | 1.500,0 ms | 1.492,1 ms | -7,9 ms | Aprov. |
|  | 2,5 | 51 | 980,0 ms | 977,6 ms | -2,4 ms | Aprov. |
|  | 3,0 | 51 | 730,0 ms | 726,9 ms | -3,1 ms | Aprov. |
|  | 4,0 | 51 | 489,0 ms | 480,5 ms | -8,5 ms | Aprov. |
|  | 5,0 | 51 | 361,0 ms | 358,9 ms | -2,1 ms | Aprov. |
|  | 9,5 | 50 | 69,0 ms | 63,0 ms | -6,0 ms | Aprov. |
|  | 11,0 | 50 | 68,4 ms | 63,0 ms | -5,4 ms | Reprov. |
|  | 12,0 | 50 | 66,2 ms | 63,0 ms | -3,2 ms | Reprov. |
|  | 13,0 | 50 | 62,8 ms | 63,0 ms | +0,2 ms | Reprov. |
|  | 14,0 | 50 | 64,6 ms | 63,0 ms | -1,6 ms | Reprov. |
| RL2 | 2,0 | 51 | 614,0 ms | 610,7 ms | -3,3 ms | Aprov. |
|  | 2,5 | 51 | 417,0 ms | 413,7 ms | -3,3 ms | Aprov. |
|  | 3,0 | 51 | 312,0 ms | 312,8 ms | +0,8 ms | Aprov. |
|  | 3,5 | 51 | 255,0 ms | 251,5 ms | -3,5 ms | Aprov. |
|  | 4,0 | 51 | 212,0 ms | 210,2 ms | -1,8 ms | Aprov. |
|  | 5,0 | 50 | 40,5 ms | 33,0 ms | -7,5 ms | Reprov. |
|  | 6,0 | 50 | 36,0 ms | 33,0 ms | -3,0 ms | Reprov. |
|  | 7,0 | 50 | 35,2 ms | 33,0 ms | -2,2 ms | Reprov. |
|  | 8,0 | 50 | 34,3 ms | 33,0 ms | -1,3 ms | Reprov. |
|  | 9,0 | 50 | 32,7 ms | 33,0 ms | +0,3 ms | Reprov. |

Maior erro nos pontos de curva: **1,74%**. Maior diferença nos pontos de tempo definido: **10,0 ms**.

Os pontos "Reprov." de tempo definido (RL1 e RL2) ficaram fora da janela de ±10% configurada na mala porque ela não considera o processamento do relé (13 a 20 ms além do ajuste, o mesmo efeito medido nos ensaios com GOOSE). O pickup do 51 medido com rampa ficou 21% a 48% acima do ajuste em todos os relés, e "Reprov." em RL1 e RL2: com corrente crescente, a rampa registra o instante do trip temporizado, e não o da partida. O texto do TCC afirma que todas as atuações ficaram dentro da margem; as tabelas do Apêndice A não confirmam isso.

Leitura:

- Tempos de trip e intervalos entre GOOSEs ficam a até 12 ms dos medidos. A exceção é o trip de RS4 no ensaio monofásico com 50BF (medido 9 ms acima do simulado), em que a corrente fica só 24% acima do pickup do 50P e a detecção é mais lenta.
- Sem o tempo de processamento, os intervalos trip → trip remoto ficariam 13 a 14 ms abaixo dos medidos (203 ms contra 216 a 218 ms).
- No ensaio 5.7.3(a), com o atraso real de RL2 (0,02 s), o modelo ideal faria o 50BF chegar a RS4 antes da curva 51 (trip remoto em 223 ms contra 232 ms), ao contrário do medido. Com o processamento calibrado o 50BF sai em 246 ms e a 51 vence, como no laboratório (238 ms contra 246 ms).
- Nos ensaios monofásicos a mala injetou só as fases. Os tempos medidos só são reproduzidos com os elementos de neutro fora de serviço: com o 51N de 21I5 (25 A, dial 0,43, MI) ativo, o ensaio AQZ-RL1 sem 50BF terminaria em cerca de 200 ms, e não em 654 ms. Esses relatórios validam os elementos de fase com corrente monofásica, não a proteção de neutro.
- O texto do TCC cita 204 ms para o ensaio 5.7.3(b); o relatório desse ensaio registra 214 ms, e 204,8 ms é o valor do ensaio 5.7.3(a).

## 7. Critérios de coordenação e sensibilidade (seção 4.7.1) e pontos críticos (seção 4.7.3)

Verificação estática nas cadeias de alcance máximo da Fig. 4.6 (módulo `js/core/coordination.js`), com falta trifásica e fase-terra na barra de cada relé a jusante e no fim da zona dele. "Descoordenado" = margem menor que a abertura do disjuntor (50 ms); critério = 0,4 s entre barra e alimentador (Tab. 4.9) e 0,3 s ao longo do alimentador.

| Esquema | Pares descoordenados | Pares abaixo do critério | Pares verificados |
|---|---:|---:|---:|
| Convencional (50 da barra bloqueado, seção 3.3.2) | 17 | 16 | 52 |
| 50 da barra habilitado, sem seletividade lógica | 25 | 16 | 52 |
| Seletividade lógica (bloqueio do 50) | 2 | 30 | 52 |
| Seletividade lógica estendida ao 51 + retaguarda de 200 ms (solução do TCC) | 0 | 17 | 52 |

Pontos críticos citados no TCC e o que a verificação encontra:

1. Barra x alimentador (01Zn e 21In), com o 50 da barra habilitado: 3F 9.420 A: jusante 100 ms, montante 100 ms (descoordenado).
2. 21I5 x RS4: 3F 4.715 A: jusante 50 ms, montante 100 ms (descoordenado).
3. RS1 x RL1: 3F 1.816 A: jusante 230 ms, montante 266 ms (descoordenado).

A maior parte das faltas fase-terra fica descoordenada no esquema convencional porque os 50N dos religadores de linha têm atrasos de 10 a 30 ms uns sobre os outros, menores que a abertura do disjuntor. É a mesma conclusão da seção 4.8 do TCC ("alta sensibilidade das proteções de sobrecorrente de neutro").

Sensibilidade (múltiplo do pickup na primeira barra remota, 2F para fase e FT para neutro):

| Relé | Barra remota | M fase | M neutro |
|---|---|---:|---:|
| 21I7 | barra RS1 | 3,98 | 62,3 |
| RS1 | barra RL1 | 3,77 | 56,2 |
| RL1 | barra RS3 | 3,41 | 48,9 |
| RS3 | barra ESB | 3,45 | 42,7 |
| 21I6 | barra RS2 | 3,91 | 61,0 |
| RS2 | barra RL2 | 3,50 | 51,8 |
| RL2 | barra RL3 | 2,84 | 28,2 |
| RL3 | barra RS4 | 2,48 | 24,3 |
| 21I5 | barra RS4 | 7,16 | 127,3 |
| RS4 | barra RL3 | 5,90 | 55,7 |
| RL3 | barra RL2 | 3,20 | 29,2 |
| 21I4 | barra RS5 | 2,46 | 36,8 |
| RS5 | barra RS6 | 2,32 (< 2,4) | 33,4 |
| RS6 | barra RL4 | 2,58 | 36,4 |
| RL4 | barra RS7 | 2,03 (< 2,4) | 28,0 |

RS5 e RL4 ficam abaixo do múltiplo 2,4 de fase para o curto bifásico na barra remota. O TCC não informa qual curto usa no critério; com o trifásico, RS5 passa (2,68) e RL4 continua abaixo (2,35).

## 8. Conferência da rede base (Fig. 4.2) com o TCC e a planilha do autor

- Impedâncias dos 16 trechos (Tab. 4.6 no simulador) contra a aba "Impedâncias dos Trechos" da planilha: maior diferença de 0,49 × 10⁻⁴ pu.
- Valores da Fig. 4.6 (curtos e cargas por trecho): iguais aos da Tab. 4.7 e da Tab. 4.2, já conferidos acima, exceto Icc2F = 972,7 A na barra RL2 (Fig. 4.6c; a Tab. 4.7 dá 907,7 A) e IccFTm = 75,3 A na barra RS7 (Fig. 4.6d; a Tab. 4.7 dá 75,6 A).
- As sete configurações de alcance máximo (quatro alimentadores da SE AQZ na Fig. 4.6 e os de ESB e AGF na planilha) não têm fontes em paralelo nem trecho acima da ampacidade.

### 8.1 Tab. 4.8: curto e carga máximos por relé

| Relé | Icc máx. sim. | Icc máx. TCC | Carga máx. sim. | Carga máx. TCC | Icc/FS | Ic/FT | Ipk/FT | RTC |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 21I7 | 10.175,9 | 10.175,6 | 260 | 260 | 509 | 200 | 438 | 500 |
| 21I6 | 10.175,9 | 10.175,6 | 344 | 344 | 509 | 265 | 438 | 500 |
| 21I5 | 10.175,9 | 10.175,6 | 300 | 300 | 509 | 231 | 438 | 500 |
| 21I4 | 10.175,9 | 10.175,6 | 334 | 334 | 509 | 257 | 438 | 500 |
| RS1 | 2.967,4 | 2.967,5 | 237 | 237 | 148 | 182 | 395 | 300 |
| RS2 | 2.575,0 | 2.574,9 | 323 | 323 | 129 | 248 | 395 | 300 |
| RS3 | 5.833,1 | 5.832,8 | 155 | 155 | 292 | 119 | 395 | 300 |
| RS4 | 4.715,5 | 4.715,1 | 217 | 217 | 236 | 167 | 242 | 300 |
| RS5 | 1.621,0 | 1.621,0 | 208 | 208 | 81 | 160 | 395 | 300 |
| RS6 | 1.374,9 | 1.374,9 | 166 | 166 | 69 | 128 | 355 | 300 |
| RL1 | 3.692,6 | 3.692,7 | 180 | 180 | 185 | 138 | 355 | 300 |
| RL2 | 3.260,6 | 3.260,8 | 217 | 217 | 163 | 167 | 395 | 300 |
| RL3 | 2.146,4 | 2.146,3 | 155 | 155 | 107 | 119 | 242 | 300 |
| RL4 | 1.374,6 | 1.374,5 | 89 | 89 | 69 | 68 | 355 | 300 |
| 21S7 | 9.069,5 | 9.069,5 | 260 | 260 | 453 | 200 | 438 | 500 |
| 21S1 | 9.069,5 | 9.069,5 | 344 | 344 | 453 | 265 | 438 | 500 |
| 21I2 | 6.191,7 | 6.191,7 | 412 | 412 | 310 | 317 | 438 | 300 |
| RS7 | 1.727,9 | 1.727,9 | 166 | 166 | 86 | 128 | 395 | 300 |

Linhas 21S7, 21S1, 21I2 e RS7: aba "Dimensionamento TC e TP" da planilha (não constam da Tab. 4.8). Nos alimentadores da SE AQZ, Icc/FS = 509 A supera em 1,8% o primário do TC escolhido no TCC (500 A).

### 8.2 Tab. 4.13 contra os critérios de tempo (Tabs. 4.11 e 4.12)

| Relé | 51P na própria barra (3F) | 51N na própria barra (FT) | Alvo | Dial de fase |
|---|---:|---:|---:|---:|
| 21I7 (21I7) | 200 ms | 200 ms | 200 ms | 0,23 |
| RS1 (21I7) | 164 ms | 98 ms | 100 ms | 0,05 |
| RL1 (21I7) | 176 ms | 70 ms | 100 ms | 0,05 |
| RS3 (21I7) | 201 ms | 23 ms | 100 ms | 0,05 |
| 21I6 (21I6) | 200 ms | 200 ms | 200 ms | 0,23 |
| RS2 (21I6) | 168 ms | 98 ms | 100 ms | 0,05 |
| RL2 (21I6) | 121 ms | 70 ms | 100 ms | 0,05 |
| RL3 (21I6) | 255 ms | 23 ms | 100 ms | 0,05 |
| 21I5 (21I5) | 200 ms | 200 ms | 200 ms | 0,23 |
| RS4 (21I5) | 97 ms | 98 ms | 100 ms | 0,10 |
| RL3 (21I5) | 103 ms | 23 ms | 100 ms | 0,05 |
| 21I4 (21I4) | 200 ms | 200 ms | 200 ms | 0,23 |
| RS5 (21I4) | 313 ms | 98 ms | 100 ms | 0,05 |
| RS6 (21I4) | 342 ms | 70 ms | 100 ms | 0,05 |
| RL4 (21I4) | 293 ms | 23 ms | 100 ms | 0,05 |

Os religadores da SE atuam em 200 ms na própria barra, como pede a Tab. 4.11, e RS4 em 97 ms (alvo de 100 ms). Os demais religadores de linha estão com o dial no mínimo do SEL-751 para curvas IEC (0,05, faixa citada na OAP) e ficam entre 103 e 342 ms na fase: a planilha do autor calcula dials menores que 0,05, ou tempos negativos, e adota o mínimo. No neutro todos ficam abaixo de 100 ms.

### 8.3 Conjunto extra: ajustes de campo (Anexo B)

Com os ajustes do Anexo B (atrasos do 50/50N: 0,1 s nos alimentadores, pela OAP 165/2013, e os da Tab. 4.13 nos religadores de linha, porque o Anexo B não os informa):

| Esquema | Base (Tab. 4.13): descoordenados / abaixo | Anexo B: descoordenados / abaixo |
|---|---:|---:|
| Convencional (50 da barra bloqueado, seção 3.3.2) | 17 / 16 | 16 / 8 |
| 50 da barra habilitado, sem seletividade lógica | 25 / 16 | 16 / 8 |
| Seletividade lógica (bloqueio do 50) | 2 / 30 | 4 / 19 |
| Seletividade lógica estendida ao 51 + retaguarda de 200 ms (solução do TCC) | 0 / 17 | 0 / 11 |

No Anexo B, RS6 e RL4 têm ajustes idênticos (400 A, dial 0,12, 50 em 1.300 A): a margem entre eles é nula em qualquer falta, o que a Tab. 4.13 corrige.

