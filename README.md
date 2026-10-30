# Aquiraz Self-Healing

Simulador web didático da proteção de sobrecorrente, das funções distribuídas da norma IEC 61850 (mensagens GOOSE) e da recomposição automática (self-healing) da rede de distribuição em 13,8 kV de Aquiraz, no Ceará.

O simulador foi desenvolvido com assistência do Claude (Anthropic) pela Equipe 3 (Douglas, Júlio e Kênio) para o artigo *Desenvolvimento de Simuladores Web de Self-Healing Assistido por Inteligência Artificial: Estudo Comparativo entre Gemini e Claude*, da disciplina THP7244 (REI: Proteção, Controle e Otimização), UFC, 2026.2, sob orientação dos professores Raimundo Furtado Sampaio e Lucas Silveira Melo.

A referência principal é o TCC de Mário Sérgio de Lima Rodrigues (UFC, 2015), *Teste e validação das funções de proteção baseadas na norma IEC 61850 propostas para implantação no projeto piloto da rede de distribuição inteligente de Aquiraz*.

## Como executar

1. Abra o arquivo `index.html` em um navegador (Chrome, Edge ou Firefox). Não há instalação nem servidor: os scripts são carregados direto do disco.
2. Para gerar uma versão em arquivo único (útil para enviar por e-mail), com Node.js 18 ou superior:

   ```bash
   npm run build:standalone
   ```

   O arquivo sai em `dist/aquiraz-self-healing.html`.
3. Para rodar a validação automática contra as tabelas do TCC:

   ```bash
   npm test
   ```

4. Para publicar no GitHub Pages: *Settings → Pages → Deploy from a branch*, pasta raiz. O `index.html` funciona sem alterações.

## O que o simulador faz

**Topologias.** Duas redes selecionáveis na barra superior:

| Opção | Figura no TCC | Origem dos dados elétricos |
|---|---|---|
| Rede atual (padrão) | Fig. 4.2, "Topologia do sistema de distribuição Aquiraz" | Rodrigues (2015), Tabs. 4.1 a 4.13 e Anexos A e B |
| Primeira topologia | Fig. 4.1, "Primeira topologia do sistema de distribuição Aquiraz" | Nobre (2013), Tabs. 3.1 a 3.8, 4.1, 4.2 e 4.13 |

**Contingências.** Falta em qualquer ponto de qualquer trecho (clique no diagrama): trifásica, bifásica, fase-terra franca, fase-terra mínima (Rc = 100 Ω) ou com resistência definida pelo usuário; permanente ou temporária. Também perda de subestação, falta no barramento de 13,8 kV da SE AQZ, falha de abertura de disjuntor e comandos manuais de abrir/fechar com intertravamento contra paralelismo.

**Proteção.** Relés SEL-751 modelados com elementos 50P/51P/50N/51N (curvas IEC), ciclo de religamento por tentativa (notação do TCC, por exemplo `1I+2T`), bloqueio, rearme e grupos de ajuste selecionados automaticamente conforme o sentido de alimentação ou a contingência (função SIAP do projeto Aquiraz).

**IEC 61850.** Seletividade lógica (bloqueio do instantâneo a montante por GOOSE) e falha de disjuntor (50BF) com trip remoto, latência configurável, perda seletiva de mensagens e a solução do TCC com bloqueio do 51 e 51 de retaguarda com somador de 200 ms. Os datasets e nós lógicos seguem a Tabela 5.1 do TCC.

**Self-healing (SRA).** Localização da falta pelos indicadores de partida dos relés, isolamento da zona e restauração pela alternativa que recompõe mais carga sem ultrapassar a ampacidade dos cabos nem o pickup de fase dos relés, inclusive dividindo ilhas quando a transferência completa não cabe.

**Animação e análises.** Fluxo animado com a cor da subestação que alimenta cada trecho, câmera lenta automática nos transitórios de milissegundos e avanço rápido nos tempos mortos, arcos das mensagens GOOSE, contagem regressiva do religamento, linha do tempo e registro de eventos exportável em CSV. Painéis de curto-circuito com comparação ao TCC, carregamento por trecho, coordenograma tempo × corrente do caminho selecionado e edição dos ajustes.

**Critérios de coordenação.** A aba *Proteção* verifica as margens de coordenação e a sensibilidade das cadeias de alcance máximo (seção 4.7.1 do TCC) no esquema escolhido e mostra os pares fora do critério.

**Ensaios do Capítulo 5.** Os ensaios de laboratório descritos no TCC, os religamentos isolados do Apêndice B, os pontos de sobrecorrente do Apêndice A e cinco ensaios fase-terra que só aparecem nos relatórios da mala de testes (religamento, seletividade lógica e 50BF nos pares AQZ_MT/AQZ, AQZ/RL1 e RL1/RL2) podem ser executados na aba *Ensaios*, com o valor citado no TCC, o valor medido no relatório da mala CE-6006 e o valor simulado.

## Validação

Resumo (detalhes em [`docs/VALIDACAO.md`](docs/VALIDACAO.md), gerado por `node tools/validation-report.js`):

| Verificação | Resultado |
|---|---|
| Curtos 3F, 2F, FT e FTm nas 18 barras da Tab. 4.7 do TCC | maior erro de 0,061% |
| Curtos da planilha de cálculos do TCC (42 barras, fontes AQZ, ESB e AGF) | maior erro de 0,0098% |
| Impedâncias dos trechos a partir dos cabos (Tabs. 4.4 e 4.5 contra Tab. 4.6) | diferença máxima de 0,0006 pu |
| Curtos da Tab. 3.6 de Nobre (2013) | maior erro de 0,0024% |
| Recomposição para falta em cada trecho (Tab. 4.2 de Nobre) | 12 de 12 casos com as mesmas manobras |
| Recomposição da Fig. 4.3 do TCC (falta em T1) | abre RS1 e fecha RL1, como no TCC |
| Ensaios do Cap. 5 contra os relatórios da mala (18 ensaios) | mesmos comportamentos; tempos de trip e intervalos entre GOOSEs a até 12 ms dos medidos, com o processamento do relé calibrado em 13 ms |
| Ensaios de sobrecorrente do Apêndice A (40 pontos I × t, 4 relés) | curvas a até 1,7% e tempo definido a até 10 ms dos medidos |
| Religamentos do Apêndice B (AQZ, RL1, RL2 e AQZ + RL1) | mesmo número e tipo de aberturas e mesmo intervalo trip → religamento |
| Tab. 4.8 (curto e carga máximos de 18 relés, incluindo ESB, AGF e RS7 pela planilha) | iguais; carga com diferença nula e curto com erro máximo de 0,01% |
| Impedâncias dos 16 trechos contra a planilha do autor | diferença máxima de 0,5 × 10⁻⁴ pu |
| Pontos críticos de coordenação da seção 4.7.3 | os três reproduzidos pela verificação de critérios e pela simulação; nenhum par descoordenado com a solução proposta no TCC |

## Base: Fig. 4.2 e Tab. 4.13; extras

A base do simulador é a que o TCC documenta como final:

- **Topologia:** Fig. 4.2, com as SEs Aquiraz II (230/69 kV, a montante da SE AQZ) e Eusébio (69/13,8 kV). Todos os cálculos, ajustes e ensaios do TCC usam essa rede.
- **Ajustes:** Tab. 4.13. Os relés que ficam fora dela (21S7 e 21S1 da SE ESB, 21I2 da SE AGF e RS7) usam os cálculos do autor na planilha do TCC, com o ciclo 1I+2T e tempo morto de 10 s da Tab. 4.11 e das abas "SE ESB" e "SE AGF".
- **Esquema convencional:** 50/50N da proteção geral de barra bloqueado, como descreve a seção 3.3.2.

Extras, para comparação, sem substituir a base:

- **Fig. 4.1** (primeira topologia, com os dados de Nobre, 2013), no seletor de topologia;
- **Anexo B** (ajustes de campo), no seletor da aba *Proteção*. O Anexo B não informa os atrasos do 50/50N: usam-se 0,1 s nos alimentadores (OAP 165/2013) e os atrasos da Tab. 4.13 nos religadores de linha;
- **ajustes do laboratório** (arquivo do SEL-751), só nos presets da aba *Ensaios*.

## Estrutura

```
index.html                 interface (abre direto no navegador)
css/style.css              estilos com tema claro e escuro
js/core/                   motor de cálculo, sem dependência de interface
  complex.js               aritmética complexa
  network.js               grafo da rede, energização, zonas, fluxo de carga
  shortcircuit.js          curto-circuito por componentes simétricas
  protection.js            curvas IEC, elementos 50/51, ciclo 79, grupos de ajuste
  simulator.js             simulador de eventos discretos (proteção, GOOSE, 50BF, 79, SRA)
  selfhealing.js           localização, isolamento e restauração
js/data/                   dados das redes e ensaios, com a origem de cada valor
js/ui/                     diagrama SVG, gráficos e painéis
js/app.js                  controlador da interface e reprodução animada
tests/validation.test.js   validação automática (node --test)
tools/                     relatório de validação e gerador de arquivo único
docs/                      metodologia, validação e registro do desenvolvimento
```

Os arquivos de `js/core` e `js/data` funcionam tanto no navegador quanto no Node.js, o que permite testar o motor sem a interface.

## Premissas e limitações

As premissas adotadas onde as fontes não informam o dado aparecem na aba *Fontes* e em [`docs/METODOLOGIA.md`](docs/METODOLOGIA.md). As principais:

- carga dos trechos T7, T10 e T11 (a Tab. 4.2 informa só o total de 155 A) rateada pelo comprimento;
- ajustes dos alimentadores das SEs ESB e AGF e do religador RS7 (fora da Tab. 4.13) tirados da planilha de cálculos do autor e dos critérios das Tabs. 4.11 e 4.12;
- rede radial, correntes de carga somadas em módulo e queda de tensão aproximada (informativa);
- tempos fixos de interrupção do disjuntor (50 ms) e de transferência GOOSE (3 ms); processamento do relé de 0 ms na simulação livre (cálculo ideal, como no TCC) e de 13 ms nos ensaios, ajustável na aba *Proteção*;
- relés não direcionais, como o SEL-751 nos ensaios do TCC.

Divergências encontradas nas próprias fontes (por exemplo, o comprimento de T9 na Fig. 4.2 e na Tab. 4.5) também estão listadas na aba *Fontes*.

## Referências

- RODRIGUES, M. S. de L. *Teste e validação das funções de proteção baseadas na norma IEC 61850 propostas para implantação no projeto piloto da rede de distribuição inteligente de Aquiraz*. Monografia (Graduação em Engenharia Elétrica), Universidade Federal do Ceará, Fortaleza, 2015.
- NOBRE, F. W. de M. *Estudo para a definição dos grupos de ajuste da proteção da rede de distribuição Aquiraz*. Monografia (Graduação em Engenharia Elétrica), Universidade Federal do Ceará, Fortaleza, 2013.
- VIEIRA, R. B. *Estudo das proteções para implantação no projeto piloto de redes inteligentes da Companhia Energética do Ceará em Aquiraz*. Monografia (Graduação em Engenharia Elétrica), Universidade Federal do Ceará, Fortaleza, 2015. (Citado no TCC como Vieira, 2015.)
- Pasta ARTIGO_REI (Google Drive da equipe): planilha de cálculos do TCC, arquivo de ajustes dos relés SEL-751 dos ensaios, relatórios da mala Conprove CE-6006, OAP 165/2013 da SE AQZ e estudos do ProteCAD.
- IEC 61850-5 e IEC 61850-8-1 (requisitos de comunicação e mapeamento GOOSE); IEC 60255-151 (curvas de tempo inverso).

## Licença

MIT.
