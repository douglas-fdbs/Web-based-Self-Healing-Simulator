# Registro do desenvolvimento assistido por IA (Equipe 3, Claude)

Registro factual das sessões de desenvolvimento, para subsidiar a comparação com o simulador da Equipe 2 (Gemini) no artigo. As seções 1 a 10 tratam da primeira sessão; a seção 11, da revisão feita com a pasta ARTIGO_REI; a seção 12, da auditoria de cobertura contra o TCC; a seção 13, da definição da base; a seção 14, do critério de religamento, dos gráficos do TCC e do guia de uso.

## 1. Contexto

- **Ferramenta:** Claude (Anthropic), usado pelo Claude Code numa sessão em nuvem com acesso ao repositório `douglas-fdbs/Web-based-Self-Healing-Simulator` e ao Google Drive do responsável da equipe.
- **Data:** 30/10/2026.
- **Pedido inicial (resumo):** replicar em JavaScript, de forma didática, a rede de Aquiraz estudada no TCC de Mário Sérgio (2015), com animação do fluxo, simulação de faltas permanentes e outras análises, tendo como objetivo o tema do TCC (teste e validação das funções de proteção IEC 61850 do projeto piloto de Aquiraz).

## 2. Acesso às fontes

Os arquivos indicados estavam no computador do usuário (`C:\Users\dougl\...`), fora do alcance da sessão em nuvem. Cópias foram localizadas no Google Drive pelo conector:

| Arquivo (Drive) | Conteúdo | Uso |
|---|---|---|
| Pasta "Projeto Final - Referências" / TCC_MarioSergio_2015_pós defesa (revisão 3).pdf | TCC de Rodrigues (2015), 155 p. | fonte principal: topologia da Fig. 4.2, Tabs. 4.1 a 4.13, Cap. 5, Anexos A e B |
| FONTES COMPLEMENTARES / Estudo para a Definicao dos Grupos de Ajuste... .pdf | TCC de Nobre (2013) | dados da Fig. 4.1 (primeira topologia) e validação da recomposição |
| FONTES COMPLEMENTARES / TFC_Final_PosDefesa_Rafaella Barboza.pdf | TCC de Vieira (2015), citado no TCC de Rodrigues | confirmação qualitativa da recomposição |
| Pasta "Projeto Final - Referências" / 1-S20-~1.PDF | artigo PowerChain (EPSR, 2027) sobre IA agêntica em redes de distribuição | referência bibliográfica (Equipe 1); sem dados de rede |

A pasta "TCC" mencionada no pedido não foi encontrada no Drive com esse conteúdo (a pasta "TCC" existente é o modelo LaTeX de outro trabalho). Os anexos com "todos os dados da rede" que seriam enviados depois ainda não haviam chegado; os dados usados vieram dos documentos acima.

A extração de texto do Drive para o TCC parou no fim do Cap. 4. O PDF original foi então baixado e lido por inteiro, com as páginas de figuras e tabelas renderizadas como imagem para conferência (as tabelas de Nobre só existem como imagem no PDF).

## 3. Decisão sobre a figura

O pedido citou a "figura 4.1: Sistema de distribuição Aquiraz". No TCC, a Fig. 4.1 é a primeira topologia, apresentada como histórico e sem dados elétricos; a Fig. 4.2 é a topologia usada em todos os cálculos e ensaios. As duas foram implementadas, com a Fig. 4.2 como padrão. Na quarta sessão a equipe confirmou a Fig. 4.2 como base (seção 13).

## 4. Etapas

1. Leitura integral do TCC e extração dos dados (topologia, cabos, impedâncias, cargas, curtos, ajustes, ensaios).
2. Leitura de Nobre (2013) e Vieira (2015).
3. Implementação do núcleo (rede, curto-circuito, fluxo, relés, eventos, SRA) e validação contra as Tabs. 4.7 (TCC) e 3.6 (Nobre) antes de qualquer interface.
4. Reprodução dos ensaios do Cap. 5 e da recomposição da Tab. 4.2 de Nobre.
5. Interface web (diagrama SVG animado, painéis, coordenograma, ensaios) e verificação visual em navegador automatizado, nos temas claro e escuro e em largura de celular.
6. Documentação, relatório de validação gerado por script e testes automatizados.

## 5. Divergências encontradas nas fontes

- Fig. 4.2 indica T9 = 3.664 m; a Tab. 4.5 soma 4.114 m, valor coerente com a impedância da Tab. 4.6.
- Fig. 4.6(c) indica Icc2F = 972,7 A na barra RL2 (21I5); a Tab. 4.7 dá 907,7 A, igual a √3/2 · Icc3F.
- Ciclo `1I+2T` da Tab. 4.13 contra a lógica do ensaio 5.6.1 ("AND (SH0 OR SH1)" e três religamentos com as duas últimas aberturas temporizadas).
- Tab. 4.13 de Nobre: os grupos listados sob RS2 para "curto em T7" e "curto na SE AQZ" repetem os valores de RP2.
- Tab. 3.8 de Nobre: ajuste instantâneo de neutro de 21I4 impresso como 12,8 (os demais 2,56), com o mesmo valor primário de 256 A.

## 6. Achados que surgiram da simulação

- O valor de Rc = 100 Ω da falta fase-terra mínima não está escrito no TCC; foi obtido reproduzindo a coluna IccFTm da Tab. 4.7.
- Os coordenogramas do TCC são coerentes com a limitação do múltiplo da curva em 30. Sem essa limitação, o 51N dos religadores da SE perderia a coordenação com os religadores de linha em faltas à terra de alta corrente.
- No par RL1/RL2 do ensaio 5.7.3, a curva 51 de RS4 vence o trip remoto por 50BF por menos de 1 ms (232,2 ms contra 233 ms) com a falta na barra RL3. Essa explicação foi revista na segunda sessão (seção 11): com o ajuste real do relé ensaiado, a margem vem do tempo de processamento do IED.
- Com os ajustes de Nobre (instantâneos sem atraso), faltas no início de T8 abrem 21I5 e RS3 juntos; o SRA corrige religando 21I5 após isolar a falta.
- Na rede atual, a SE AGF não comporta T13 e T14 juntos (T16 iria a 454 A, acima de 438 A); o SRA recompõe só T14, resultado qualitativamente igual ao de Vieira (2015).

## 7. Resultado da validação

| Verificação | Resultado |
|---|---|
| Tab. 4.7 do TCC (18 barras × 4 tipos de falta) | maior erro 0,061% |
| Tab. 3.6 de Nobre (12 trechos × 4 tipos) | maior erro 0,0024% |
| Tab. 4.2 de Nobre (12 faltas) | 12 recomposições iguais |
| Fig. 4.3 do TCC | igual |
| Ensaios do Cap. 5 (11 casos) | comportamentos iguais; tempos 0 a 57 ms abaixo dos medidos |

Detalhes em `docs/VALIDACAO.md`; verificação automática com `npm test` (19 testes na primeira sessão, 20 após a segunda).

## 8. Métricas do código nesta versão

- Aproximadamente 4.500 linhas (JavaScript, CSS e HTML), sem dependências externas além de fontes do Google Fonts (opcionais).
- Motor de cálculo separado da interface e executável no Node.js.
- 19 testes automatizados de validação.

## 9. Limitações conhecidas

- Fluxo de carga simplificado (correntes somadas em módulo, sem cálculo iterativo de tensões).
- Relés não direcionais e sem modelagem de saturação de TC, componente contínua ou transitórios eletromagnéticos.
- Tempos fixos de abertura de disjuntor e de transferência GOOSE; sem modelagem de rede Ethernet (switches, VLAN, prioridade).
- Capacidade dos transformadores das subestações não é verificada na recomposição.

## 10. Sugestões para o protocolo comparativo

Para comparar as Equipes 2 e 3 com critérios objetivos:

1. **Mesmas entradas:** mesmo pedido inicial e mesmos documentos de referência para as duas ferramentas.
2. **Exatidão numérica:** erro relativo dos curtos da Tab. 4.7 e acerto das recomposições da Fig. 4.3 e da Tab. 4.2 de Nobre.
3. **Fidelidade da proteção:** reprodução dos onze ensaios do Cap. 5 (qualitativa e em tempo).
4. **Funcionalidades:** lista de verificação (topologia correta, tipos de falta, religamento, 50BF, seletividade lógica, self-healing com ampacidade, animação, coordenograma).
5. **Processo:** número de interações e correções humanas necessárias, tempo até a primeira versão funcional, erros introduzidos pela IA e detectados pela equipe.
6. **Qualidade de software:** separação entre cálculo e interface, testes, documentação das premissas e rastreabilidade dos dados até as tabelas de origem.

## 11. Segunda sessão: revisão com a pasta ARTIGO_REI

**Pedido:** revisar a pasta ARTIGO_REI, enviada ao Google Drive porque a primeira sessão não tinha acesso ao disco local, e verificar o que faltava ou precisava ser modificado.

### 11.1 Conteúdo útil encontrado

| Material | Uso |
|---|---|
| Planilha de cálculos do TCC (`Planilha dos Calculos.xlsm`) | ajustes de 21S7, 21S1, 21I2 e RS7; curtos a partir de AQZ, ESB e AGF; confirmação do múltiplo máximo 30 e do comprimento de T9 |
| Arquivo de ajustes do AcSELerator (`SDMT_Aquiraz Settings.rdb`) | ajustes reais dos quatro SEL-751 do laboratório (pickups, curvas, 79, 50BF, torque control) |
| 13 relatórios do Sequenc (mala CE-6006, out/2015) | correntes injetadas e instantes de cada GOOSE nos ensaios |
| OAP 165/2013 da SE AQZ | ciclo de campo de 21I5 (1I-2T, 10-10 s, rearme 45 s) |
| Estudos do ProteCAD (fev/2015) | iteração anterior do estudo, com ajustes de linha diferentes da Tab. 4.13; não usados |
| Documento de critérios (`Critérios de Ajuste de Proteção Rede Smart Grid2.docx`) | rascunho dos critérios; o 51N fixo de 24 A dos alimentadores confere com a planilha |
| 31 artigos em "Projeto Final - Referências" | bibliografia do artigo (Equipe 1); nenhum traz dados da rede |

Arquivos que o conector do Drive não conseguiu baixar (acima de cerca de 6 MB): os relatórios de religamento de 7,2 MB e a versão em PDF de 9,6 MB de um dos artigos. Os relatórios dos ensaios 5.6.1 e 5.6.2 continuam sem conferência numérica.

### 11.2 Achados

- **Ajustes de ESB, AGF e RS7.** Os valores adotados na primeira sessão (cópia de dispositivos equivalentes) foram substituídos pelos da planilha. O 51N de RS7 na planilha (71,1 A) segue um critério anterior e deixaria RS7 menos sensível que 21I2 (24 A); foi usado o critério da Tab. 4.12 (22 A).
- **Ajustes do laboratório diferem da Tab. 4.13 em dois pontos:** ciclo de AQZ (E79 = 3, 50 só em SH0 e SH1, isto é, 2I+2T) e atraso do 50 de RL2 (0,02 s contra 0,03 s). RL2 também tinha E79 = 1 com 12 s, contra "1I" na tabela. (Revisto na seção 14: o ciclo de AQZ é o 1I+2T do TCC lido como religamentos.)
- **Tempo de processamento do relé.** Nos relatórios, o GOOSE de trip sai de 10 a 16 ms depois do atraso ajustado e o de 50BF, de 8 a 13 ms depois do BFD. Sem esse atraso, o simulador ficava 13 a 14 ms abaixo nos intervalos trip → trip remoto. Com 13 ms (mediana), tempos de trip e intervalos ficam a até 12 ms dos medidos.
- **Ensaio 5.7.3(a).** Com o atraso real de RL2 (0,02 s) e relés ideais, o 50BF chegaria a RS4 antes da curva 51, ao contrário do medido. O resultado do laboratório só é reproduzido com o tempo de processamento: o 50BF sai em 246 ms e a 51 atua em 232 ms (medido: 238 ms).
- **Ensaios fase-terra.** Cinco relatórios monofásicos não descritos no texto do TCC foram reproduzidos. A mala injetou só as fases, e os elementos de neutro do SEL-751 medem o canal IN. Os tempos medidos só são coerentes com os elementos de fase: com o 51N ativo, 21I5 abriria em cerca de 200 ms no ensaio AQZ-RL1 sem 50BF, e não em 654 ms. Esses ensaios não validam a proteção de neutro.
- **Texto do TCC x relatório.** O TCC cita 204 ms no ensaio 5.7.3(b); o relatório registra 214 ms (204,8 ms é o valor do ensaio 5.7.3(a)).
- **Correntes injetadas** (11,77/18,84 A, 9,43/15,72 A, 7,15 A, 12,72/20 A e 6,62/11,03 A secundários) conferem com os pontos de falta escolhidos na primeira sessão (9.419 A, 4.715 A, 2.145 A, 10.176 A e 3.309 A primários).

### 11.3 Alterações

1. `js/data/aquiraz_tcc2015.js`: ajustes de 21S7, 21S1, 21I2 e RS7; 42 curtos da planilha para validação; novas notas na aba *Fontes*.
2. `js/core/simulator.js` e `protection.js`: parâmetros `relayDelay`, `groundElements` e `instDelayOverrides`; rearme do 79 em 45 s.
3. `js/data/lab_tests.js`: valores medidos nos relatórios, ajustes do laboratório e cinco ensaios fase-terra (16 ensaios no total).
4. Interface: coluna "Medido" na aba *Ensaios*; campo do tempo de processamento na aba *Proteção*.
5. Testes: 20 verificações automáticas, incluindo os 42 curtos da planilha e a comparação com os 16 ensaios.

| Verificação nova | Resultado |
|---|---|
| Curtos da planilha (42 barras, AQZ, ESB e AGF) | maior erro 0,0098% |
| Tempos de trip e intervalos entre GOOSEs (16 ensaios) | a até 12 ms dos medidos (exceto um trip 50P perto do pickup, 9 ms acima) |
| Eliminação da falta | 6 a 23 ms antes do pós-falta da mala, diferença atribuída à recepção do GOOSE pela mala |

## 12. Terceira sessão: auditoria de cobertura contra o TCC

**Pedido:** verificar se o simulador reproduz tudo o que o TCC defende, o que falta e se a simulação é satisfatória.

### 12.1 Método

1. Leitura do sumário, das listas de figuras e tabelas, dos capítulos 3 a 6 e dos Apêndices A a E e Anexos A e B, item por item contra o simulador.
2. Varredura de faltas: 16 trechos × 3 posições × 4 tipos × 2 esquemas na configuração normal (384 casos), nas quatro configurações de alcance máximo da Fig. 4.6 (3 esquemas) e na topologia de Nobre (360 casos), verificando eliminação da falta, paralelismo entre fontes, sobrecarga e seletividade da primeira atuação.

### 12.2 Resultado da varredura

- Nenhum caso terminou com falta alimentada, fontes em paralelo ou trecho sobrecarregado.
- Na configuração normal, só dois pares atuam sem seletividade no esquema convencional: 21I5 com RS4 (faltas no início de T9) e RS5 com RS6 (faltas fase-terra em T14). Nas configurações de alcance máximo aparecem também RS1 com RL1, RL2 com RS2 e RL3 com RS4. São os pontos críticos da seção 4.7.3 do TCC e a "alta sensibilidade das proteções de neutro" da seção 4.8.
- Com o 50 da barra habilitado sem seletividade lógica, AQZ_MT abre junto com o alimentador em faltas próximas da SE (primeiro ponto crítico do TCC).
- Com a solução final do TCC (seletividade lógica no 50 e no 51, retaguarda de 200 ms e 50BF), todas as faltas na configuração normal são eliminadas só pelo relé mais próximo. A única exceção nas configurações de alcance máximo é RS7 alimentado no sentido inverso por 21I4 (faltas em T16), fora do estudo do TCC, porque RS7 só tem ajuste para o sentido AGF → AQZ.

### 12.3 Lacunas encontradas e corrigidas

| Item do TCC | Antes | Agora |
|---|---|---|
| Seção 5.5 e Apêndice A (ensaios de sobrecorrente) | não reproduzidos | 40 pontos I × t: curvas a até 1,7%, tempo definido a até 10 ms |
| Apêndice B (religamentos) | só comparação qualitativa; RL1 e RL2 isolados ausentes | AQZ, RL1, RL2 e AQZ + RL1 com número e tipo de aberturas e intervalo trip → religamento iguais aos medidos |
| Fig. 3.8 (qualidade da mensagem) | perda do GOOSE de bloqueio fazia o 50 a montante atuar | opção `slQuality`: o 50 a montante fica bloqueado, como na lógica do TCC |
| Seções 4.7.1 e 4.7.3 (critérios e pontos críticos) | só o coordenograma visual | verificação automática de margens e sensibilidade nas cadeias da Fig. 4.6 |
| Tab. 2.1 (curvas IEEE) | só curvas IEC | curvas IEEE MI, VI e EI |

### 12.4 Divergências do próprio TCC encontradas nesta sessão

- **Seção 5.6.2 x Apêndice B.** O texto diz que AQZ "não mais atuou durante as faltas subsequentes"; a tabela de GOOSEs registra trip de AQZ também na segunda falta (12,28 s), coerente com o 50 habilitado em SH0 e SH1.
- **Seção 5.5 x Apêndice A.** O texto diz que todas as atuações ficaram dentro da margem; as tabelas marcam "Reprov." em quatro pontos de tempo definido de RL1, cinco de RL2 e no pickup do 51 de RL1 e RL2. Nos pontos de tempo definido, a causa é o processamento do relé (13 a 20 ms), que a janela de ±10% da mala não comporta. No pickup do 51, a rampa registra o instante do trip temporizado em vez da partida.
- **Tab. 2.1.** A curva IEEE moderadamente inversa aparece com α = 2 e L = 0,18; a IEEE C37.112 dá α = 0,02 e L = 0,114.
- **Sensibilidade.** Pelo critério da seção 4.7.1(a), RS5 (2,32) e RL4 (2,03) ficam abaixo do múltiplo 2,4 de fase com o curto bifásico na barra remota.
- **Texto x arquivo de ajustes.** A seção 5.3.2 cita 52ABF = Y e REMTRIP = VB002; o arquivo `SDMT_Aquiraz Settings.rdb` (salvo em 27/09/2015, antes dos ensaios) tem 52ABF = N e REMTRIP = VB001 AND NOT VB002.

### 12.5 O que continua fora do simulador

| Item | Motivo |
|---|---|
| Ajustes de campo do Anexo B como conjunto alternativo | o Anexo B não informa os atrasos dos elementos 50; seria preciso adotá-los |
| Dimensionamento dos TCs (Tab. 4.8) | verificação de projeto, não muda a simulação |
| Proteções diferencial (87) e de linha (R3 a R5) da SE AQZ, funções 51NS, 46 e condutor partido | fora da Tab. 4.13 e dos ensaios |
| Coordenação de sequência (79SEQ), rearme após bloqueio (79RSLD) e supervisão de religamento (79CLS) | não usados nos ensaios; o bloqueio só termina por comando ou pelo SRA |
| Rede Ethernet redundante (Fig. 3.4b) | a perda de mensagens é simulada como total ou nula |
| Capacidade dos transformadores na recomposição | o TCC não usa esse critério e faltam dados de ESB e AGF e dos três alimentadores de AQZ fora da rede inteligente |
| Detecção mais lenta do 50 perto do pickup e recepção do GOOSE pela mala | diferenças de 6 a 23 ms nos tempos de eliminação e de 9 ms em um trip |

## 13. Quarta sessão: base do simulador

**Pedido:** usar como base o que o TCC documenta (Fig. 4.2 e seus ajustes), deixando o restante como extra; conferir os resultados com o TCC e os arquivos do autor; verificar o ciclo de religamento dos alimentadores de ESB e AGF.

### 13.1 Conferência da base

- Os 15 relés do simulador foram comparados valor a valor com a Tab. 4.13 (RTC, pickups, dials, 50/50N, atrasos, curvas e ciclos): todos iguais. A base já era a Tab. 4.13; o Anexo B não estava implementado.
- O bloqueio do 50/50N da proteção de barra no esquema convencional tinha como referência o Anexo B. A referência passou a ser a seção 3.3.2 do TCC, que descreve esse bloqueio no esquema tradicional; na Tab. 4.13 o 50 aparece com 4.079 A e 100 ms, valor usado com seletividade lógica.
- A Tab. 4.13 não lista tempos mortos. Os valores vêm do critério das Tabs. 4.11 e 4.12 (10 s na SE e +1 s por nível). O RL3 passou a ter 13 s no grupo 1 e 12 s no grupo 2, como o relé ensaiado.

### 13.2 Alterações

| Item | Antes | Agora |
|---|---|---|
| Anexo B | não implementado | conjunto extra selecionável na aba *Proteção*, com aviso; atrasos do 50/50N: 0,1 s nos alimentadores (OAP) e os da Tab. 4.13 nos religadores de linha |
| Ciclo e tempo morto | por relé | por relé ou por grupo de ajuste |
| RTC de 21S7, 21S1 e 21I2 | 120, 100 e 160 (valores provisórios das abas por alimentador) | 500, 500 e 300 (aba "Dimensionamento TC e TP") |
| Ciclo de ESB e AGF | marcado como adotado | documentado: critério da Tab. 4.11 e abas "SE ESB" e "SE AGF" da planilha (1I+2T, 10 s) |
| Alcance máximo de 21I4 | até a SE AGF (RS7 fechado, 21I2 aberto) | até RS7 aberto, como na Fig. 4.6(d); com T16 a corrente iria a 580 A, acima dos 438 A do cabo |
| Rótulos | "Rede atual" e "Primeira topologia" | "Fig. 4.2: rede do TCC (base)" e "Fig. 4.1: primeira topologia (extra)" |

A correção do alcance de 21I4 elimina a exceção relatada na seção 12.2: com a solução do TCC, todas as faltas das configurações de alcance máximo passam a ser seletivas.

### 13.3 Novas conferências com o TCC e a planilha

| Verificação | Resultado |
|---|---|
| Tab. 4.8: curto e carga máximos de 18 relés (14 da tabela e 4 da aba de TCs) | carga igual em todos; curto com erro máximo de 0,01% |
| Impedâncias dos 16 trechos contra a aba "Impedâncias dos Trechos" | diferença máxima de 0,5 × 10⁻⁴ pu |
| Sete configurações de alcance máximo | sem paralelismo e sem sobrecarga |
| Tempo do 51 na própria barra (Tabs. 4.11 e 4.12) | 200 ms nos quatro religadores da SE e 97 ms em RS4; demais religadores de linha no dial mínimo (0,05) |

### 13.4 Divergências registradas nesta sessão

- RL3 alimentado por 21I5: "1I" na Tab. 4.13, contra "2I" pelo critério da Tab. 4.12, no Anexo B e no relé ensaiado.
- Aba "SE AQZ" da planilha: 50/50N da barra em 4.707 A e 5.090 A e dial do 51N em 0,356, contra 4.079 A e 0,30 na Tab. 4.13 e no relé ensaiado.
- Fig. 4.6(d): IccFTm de 75,3 A na barra RS7, contra 75,6 A na Tab. 4.7.
- Anexo B: a coluna "Ajuste 50/50N (s)" traz correntes, e os atrasos não são informados.
- Tab. 4.8: Icc/FS = 509 A nos alimentadores da SE AQZ, acima do primário de 500 A escolhido.

## 14. Quinta sessão: critério de religamento, gráficos do TCC e guia de uso

**Pedido:** verificar o critério do autor para o ciclo do RL3 e se o "1I" foi usado nos resultados; verificar o que o TCC faz e o site não; verificar se há guia de uso passo a passo.

### 14.1 Critério de religamento do autor

| Fonte | O que diz |
|---|---|
| Tab. 4.11 e seção 4.7.1(d) (religadores da SE) | "um religamento instantâneo e dois temporizados", 50/50N "bloqueadas a partir do segundo religamento", tempo morto de 10 s |
| Seção 5.3.2 | "AND (SH0 OR SH1)" no religador da SE, para bloquear o instantâneo "no segundo religamento" |
| Tab. 4.12 e seção 4.7.1(e) (religadores de linha) | "3 instantâneos para o primeiro e 1 a menos para os próximos"; "uma atuação a menos que o religador protegido"; +1 s no tempo morto |
| Seção 5.6.1 e Apêndice B | AQZ com "três religamentos", aberturas de 0,18, 0,17, 0,27 e 0,27 s (50, 50, 51, 51); RL1 com três aberturas e 11,5 s; RL2 com duas aberturas e 12,5 s |
| Arquivo de ajustes do laboratório | E79 = 3 (AQZ), 2 (RL1), 1 (RL2) |
| Seção 5.8 | "diminuição do número de religamentos para religadores em série" |
| Planilha de cálculos | a coluna "Ciclo de Religamento" da tabela de ajustes está vazia; as abas "SE ESB" e "SE AGF" repetem 1I+2T e 10 s |
| OAP 165/2013 e Anexo B (campo) | "1I-2T" com tempos mortos 10-10 s (três aberturas); RL3 grupo 2 com 2I |

Conclusão: na Tab. 4.13 o ciclo dos religadores da SE conta religamentos (1I+2T = quatro aberturas, 50, 50, 51, 51) e o dos religadores de linha conta aberturas (3I = três aberturas). Com essa leitura, cada nível tem um religamento a menos que o anterior, como pedem o texto e a seção 5.8, e todos os ensaios conferem. A primeira versão do simulador lia 1I+2T como três aberturas; isso foi corrigido. O "1I" do RL3 alimentado por 21I5 é a única entrada que contraria o critério; nenhum resultado do TCC o usa (o ensaio de RL2 tem duas aberturas), e o simulador passou a usar 2I.

### 14.2 Gráficos e funções do TCC que faltavam no site

| Item do TCC | Antes | Agora |
|---|---|---|
| Figs. 4.9 a 4.13 (coordenogramas por alimentador) | só o caminho selecionado, uma grandeza por vez | seletor com as cinco figuras, fase e neutro juntos, nas cadeias da Fig. 4.6 |
| Figs. A1 a A4 (resultado gráfico do ensaio de sobrecorrente) | só tabelas | gráfico I × t com a curva simulada e os pontos medidos |
| Figs. 5.12 a 5.22 e 3.12 (telas do Sequenc e sequência de religamento) | registro de eventos e linha do tempo sem escala | diagrama de tempos em ms (eliminação) ou em s (ciclo completo), na aba Eventos e em cada ensaio |
| Fig. 2.3 e Tab. 2.1 (famílias de curvas) | não havia | curvas IEC e IEEE com dial ajustável |
| Fig. 3.13 (estados do religamento) | só os selos no diagrama | coluna 79 na tabela de ajustes (repouso, ciclo, bloqueio) |

Itens do TCC que continuam fora: diagramas de lógica copiados do manual do SEL-751 (Figs. 3.5 e 3.8 a 3.11), cuja lógica o simulador executa sem desenhá-la; telas de configuração dos relés e da mala (Figs. 5.3 a 5.10, Apêndices D e E); formas de onda das correntes da mala; dimensionamento dos TCs como cálculo de projeto (a Tab. 4.8 é conferida, mas o tipo de TC não é escolhido pelo simulador).

### 14.3 Guia de uso

Não havia guia passo a passo: o README explicava como executar e o que o site faz, e a aba Falta tinha um parágrafo de instruções. Foram criados `docs/GUIA_DE_USO.md` (mapa da tela, função de cada aba, doze roteiros com o resultado esperado, mapa item do TCC → local no site e leitura dos resultados) e a aba **Guia** no site, com o mesmo conteúdo resumido.
