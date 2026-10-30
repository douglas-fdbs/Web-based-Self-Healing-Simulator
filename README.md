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

**Ensaios do Capítulo 5.** Os onze ensaios de laboratório do TCC (religamento, seletividade lógica e 50BF nos pares AQZ_MT/AQZ, AQZ/RL1 e RL1/RL2) podem ser executados na aba *Ensaios*, com o valor medido no TCC ao lado do valor simulado.

## Validação

Resumo (detalhes em [`docs/VALIDACAO.md`](docs/VALIDACAO.md), gerado por `node tools/validation-report.js`):

| Verificação | Resultado |
|---|---|
| Curtos 3F, 2F, FT e FTm nas 18 barras da Tab. 4.7 do TCC | maior erro de 0,061% |
| Impedâncias dos trechos a partir dos cabos (Tabs. 4.4 e 4.5 contra Tab. 4.6) | diferença máxima de 0,0006 pu |
| Curtos da Tab. 3.6 de Nobre (2013) | maior erro de 0,0024% |
| Recomposição para falta em cada trecho (Tab. 4.2 de Nobre) | 12 de 12 casos com as mesmas manobras |
| Recomposição da Fig. 4.3 do TCC (falta em T1) | abre RS1 e fecha RL1, como no TCC |
| Ensaios do Cap. 5 | mesmos comportamentos; tempos dezenas de ms abaixo dos medidos, pois o simulador não modela o processamento interno dos relés e da mala de testes |

## Figura 4.1 ou Figura 4.2

O pedido inicial citou a "figura 4.1: Sistema de distribuição Aquiraz". No TCC, a Fig. 4.1 é a *primeira* topologia (de Nobre, 2013), mostrada apenas como histórico e sem dados elétricos; todos os cálculos, ajustes e ensaios IEC 61850 do TCC usam a topologia da Fig. 4.2. Por isso a rede da Fig. 4.2 é a padrão, e a da Fig. 4.1 foi incluída com os dados de Nobre (2013). As duas usam o mesmo motor de simulação.

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
- ajustes dos alimentadores das SEs ESB e AGF e do religador RS7 (fora do estudo do TCC) adotados iguais aos de dispositivos equivalentes, com destaque na interface;
- rede radial, correntes de carga somadas em módulo e queda de tensão aproximada (informativa);
- tempos fixos de interrupção do disjuntor (50 ms) e de transferência GOOSE (3 ms);
- relés não direcionais, como o SEL-751 nos ensaios do TCC.

Divergências encontradas nas próprias fontes (por exemplo, o comprimento de T9 na Fig. 4.2 e na Tab. 4.5) também estão listadas na aba *Fontes*.

## Referências

- RODRIGUES, M. S. de L. *Teste e validação das funções de proteção baseadas na norma IEC 61850 propostas para implantação no projeto piloto da rede de distribuição inteligente de Aquiraz*. Monografia (Graduação em Engenharia Elétrica), Universidade Federal do Ceará, Fortaleza, 2015.
- NOBRE, F. W. de M. *Estudo para a definição dos grupos de ajuste da proteção da rede de distribuição Aquiraz*. Monografia (Graduação em Engenharia Elétrica), Universidade Federal do Ceará, Fortaleza, 2013.
- VIEIRA, R. B. *Estudo das proteções para implantação no projeto piloto de redes inteligentes da Companhia Energética do Ceará em Aquiraz*. Monografia (Graduação em Engenharia Elétrica), Universidade Federal do Ceará, Fortaleza, 2015. (Citado no TCC como Vieira, 2015.)
- IEC 61850-5 e IEC 61850-8-1 (requisitos de comunicação e mapeamento GOOSE); IEC 60255-151 (curvas de tempo inverso).

## Licença

MIT.
