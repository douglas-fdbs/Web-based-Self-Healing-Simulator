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

## 2. Curto-circuito: Tabela 3.6 de Nobre (2013), primeira topologia

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

## 3. Recomposição automática: Tabela 4.2 de Nobre (2013)

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

## 4. Recomposição na rede atual (TCC, Fig. 4.2)

| Caso | Manobras do SRA | Carga sem suprimento ao final | Observação |
|---|---|---:|---|
| Falta em T1 (Fig. 4.3) | Abrir RS1; Fechar RL1 | 23 A | reproduz a Fig. 4.3 do TCC |
| Falta em T5 | Abrir RS2; Fechar RL2 | 21 A |  |
| Falta em T8 | Abrir RS4; Fechar RL3 | 83 A |  |
| Falta em T12 | Abrir RS5; Abrir RS6; Fechar RL4 | 168 A | T13+T14 levaria T16 a 454 A > 438 A: só T14 é recomposto |
| Falta em T16 | Abrir RS7; Fechar RL4 | 246 A |  |
| Perda da SE ESB | Abrir 21S7; Abrir 21S1; Fechar RL1; Fechar RL2 | 0 A |  |
| Falta no barramento 13,8 kV da SE AQZ | Abrir 21I7; Abrir 21I6; Abrir 21I5; Abrir 21I4; Fechar RL3; Fechar RL2; Fechar RL1; Abrir RS6; Fechar RL4 | 168 A | coerente com Vieira (2015): parte de 21I4 não cabe na SE AGF |

## 5. Ensaios do Capítulo 5 do TCC

Ajustes da Tab. 4.13 (alimentador 21I5), disjuntor com 50 ms de interrupção e GOOSE com 3 ms. Os valores do TCC são os medidos com a mala de testes CE-6006, que incluem o processamento interno dos relés e o tempo de abertura simulado pela mala; por isso os totais simulados ficam algumas dezenas de milissegundos abaixo.

| Ensaio | Medida | TCC | Simulador |
|---|---|---|---:|
| Seção 5.6.1: Religamento de um IED (AQZ = 21I5) | Número de aberturas do 21I5 | 4 (três religamentos) | 4 |
|  | 1ª abertura (50P, atraso 100 ms) | ≈ 100 ms | 100,0 ms |
|  | Últimas aberturas, tempo após o religamento (51P) | 200 ms | 200,0 ms |
| Seção 5.6.2: Religamento de dois IEDs (AQZ + RL1) | Aberturas de 21I5 | 1 (só na primeira falta) | 1 |
|  | Aberturas de RS4 (RL1) | ciclo completo até bloquear | 3 |
|  | Estado final de 21I5 | fechado, suprindo T8 | fechado |
| Seção 5.7.1(a): Seletividade lógica + 50BF | Trip 50P de 21I5 → trip de AQZ_MT | 217 ms | 203,0 ms |
|  | Eliminação da falta | ≈ 400 ms | 353,0 ms |
| Seção 5.7.1(b): Só seletividade lógica (sem 50BF) | Trip 50P de 21I5 → trip 51P de AQZ_MT | 476 ms | 493,8 ms |
|  | Eliminação da falta | ≈ 650 ms | 643,8 ms |
| Seção 5.7.1(c): Sem seletividade lógica e sem 50BF | Trip de AQZ_MT | pouco mais de 100 ms | 100,0 ms |
|  | Trip de 21I5 | pouco mais de 100 ms | 100,0 ms |
|  | Eliminação da falta | pouco menos de 200 ms | 150,0 ms |
| Seção 5.7.2: Seletividade lógica + 50BF | Trip 50P de RS4 → trip de 21I5 | 217 ms | 203,0 ms |
|  | Eliminação da falta | ≈ 360 ms | 303,0 ms |
| Seção 5.7.2: Só seletividade lógica (sem 50BF) | Trip 50P de RS4 → trip 51P de 21I5 | 372 ms | 376,9 ms |
|  | Trip 51P de 21I5 após a falta | ≈ 430 ms | 426,9 ms |
|  | Eliminação da falta | ≈ 500 ms | 476,9 ms |
| Seção 5.7.2: Sem seletividade lógica e sem 50BF | Trip de RS4 | atua | 50,0 ms |
|  | Trip de 21I5 | também atua | 100,0 ms |
| Seção 5.7.3: SL bloqueando só o 50 + 50BF | Elemento que abriu RS4 | 51 (antes do 50BF) | 51P (fase, tempo inverso) |
|  | Trip 50P de RL3 → trip de RS4 | < 50BF | 202,2 ms |
| Seção 5.7.3: SL bloqueando 50 e 51 + retaguarda (+200 ms) + 50BF | Trip 50P de RL3 → trip de RS4 | 204 ms | 203,0 ms |
|  | Eliminação da falta | ≈ 300 ms | 283,0 ms |
| Seção 5.7.3: Mesmo esquema com perda do GOOSE de 50BF | Elemento que abriu RS4 | 51 de retaguarda (Phase TOC) | 51 de retaguarda (+ somador) |
|  | Eliminação da falta | atraso maior que no caso anterior | 482,2 ms |

Leitura qualitativa: os três comportamentos relatados no TCC aparecem na simulação. (i) Com seletividade lógica e 50BF, a retaguarda atua cerca de 200 ms após o trip do relé a jusante; (ii) sem 50BF, a retaguarda espera a própria curva (NI ou MI); (iii) sem seletividade lógica, os dois instantâneos atuam juntos. No par RL1/RL2 a curva 51 de RS4 vence o 50BF por menos de 1 ms (232,2 ms contra 233 ms), o problema relatado na seção 5.7.3, e a solução com bloqueio do 51 e retaguarda de +200 ms o corrige.

