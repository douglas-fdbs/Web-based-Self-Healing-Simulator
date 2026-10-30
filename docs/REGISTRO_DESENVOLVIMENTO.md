# Registro do desenvolvimento assistido por IA (Equipe 3, Claude)

Registro factual das sessões de desenvolvimento, para subsidiar a comparação com o simulador da Equipe 2 (Gemini) no artigo. As seções 1 a 10 tratam da primeira sessão; a seção 11, da revisão feita com a pasta ARTIGO_REI.

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

O pedido citou a "figura 4.1: Sistema de distribuição Aquiraz". No TCC, a Fig. 4.1 é a primeira topologia, apresentada como histórico e sem dados elétricos; a Fig. 4.2 é a topologia usada em todos os cálculos e ensaios. As duas foram implementadas, com a Fig. 4.2 como padrão. A escolha precisa ser confirmada pela equipe.

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
- **Ajustes do laboratório diferem da Tab. 4.13 em dois pontos:** ciclo de AQZ (E79 = 3, 50 só em SH0 e SH1, isto é, 2I+2T) e atraso do 50 de RL2 (0,02 s contra 0,03 s). RL2 também tinha E79 = 1 com 12 s, contra "1I" na tabela.
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
