# Registro do desenvolvimento assistido por IA (Equipe 3, Claude)

Registro factual da primeira sessão de desenvolvimento, para subsidiar a comparação com o simulador da Equipe 2 (Gemini) no artigo.

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
- No par RL1/RL2 do ensaio 5.7.3, a curva 51 de RS4 vence o trip remoto por 50BF por menos de 1 ms (232,2 ms contra 233 ms) com a falta na barra RL3, o que explica o comportamento relatado no TCC.
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

Detalhes em `docs/VALIDACAO.md`; verificação automática com `npm test` (19 testes).

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
