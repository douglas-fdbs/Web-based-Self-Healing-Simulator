/*
 * Conteúdo da aba "Guia": versão resumida de docs/GUIA_DE_USO.md.
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});

  const intro = 'O site simula a proteção e a recomposição da rede de Aquiraz do TCC de Rodrigues (2015): topologia da Fig. 4.2 com os ajustes da Tab. 4.13. Os ajustes de campo do Anexo B e os do laboratório são extras identificados. Tabelas e gráficos abrem em janelas que podem ser arrastadas pelo título, redimensionadas pelo canto e fechadas no X ou com Esc.';

  const screen = [
    ['Barra superior', 'Guia, tema claro ou escuro, esquema (Convencional ou IEC 61850), self-healing e reprodução: voltar, play, ir ao fim e velocidade.'],
    ['Diagrama', 'Cor do trecho = subestação que o alimenta (azul AQZ, roxo ESB, laranja AGF, cinza sem tensão). Vermelho = chave fechada, verde = aberta. Selos SL (bloqueio por seletividade lógica) e BLQ (religamento bloqueado), contagem do tempo morto e arcos GOOSE.'],
    ['Barra de status', 'Operação normal ou rede reconfigurada, falta presente, carga suprida e sem suprimento, esquema e conjunto de ajustes.'],
    ['Sequência de eventos', 'Linha do tempo clicável: leva a animação ao instante do evento.'],
    ['Painel lateral', 'Abas Falta, Eventos, Análises, Proteção, IEC 61850 e Ensaios. Os botões com ↗ abrem uma janela.'],
    ['Rodapé', '"Fontes e premissas" abre os dados, as premissas do simulador e as referências.'],
  ];

  const routes = [
    {
      title: '1. Falta permanente em T1 (Fig. 4.3)',
      steps: ['Aba Falta, Cenários prontos: clique em "Fig. 4.3: falta permanente em T1".', 'Acompanhe 21I7 abrir quatro vezes (50, 50, 51, 51) e bloquear.', 'O self-healing abre RS1 e fecha RL1.'],
      result: 'T2 passa a ser suprido pela SE Eusébio, como na Fig. 4.3. Na aba Eventos, "Diagrama de tempos" e depois "Ciclo completo (s)" mostram os religamentos.',
    },
    {
      title: '2. Falta em qualquer ponto',
      steps: ['Clique em um trecho: o ponto clicado é a posição da falta.', 'Escolha o tipo (3F, 2F, FT ou FTm) e, se quiser, a resistência de falta ou "Falta temporária".', 'Clique em "Aplicar falta".'],
      result: 'Correntes de curto no ponto, animação da proteção, registro de eventos e, com falta permanente, a recomposição.',
    },
    {
      title: '3. Convencional x IEC 61850',
      steps: ['Esquema Convencional: falta trifásica no início de T9.', 'RS4 e 21I5 abrem juntos (ponto crítico da seção 4.7.3).', '"Voltar à operação normal", esquema IEC 61850 e repita.'],
      result: 'RS4 bloqueia 21I5 por GOOSE e só RS4 abre. Na aba IEC 61850, "Mensagens GOOSE" lista as mensagens.',
    },
    {
      title: '4. Falha de disjuntor (50BF)',
      steps: ['Esquema IEC 61850.', 'Clique em RS4 e use "Simular falha de abertura (disjuntor travado)".', 'Aplique falta no início de T9.'],
      result: 'RS4 dá trip sem abrir; 200 ms depois o 50BF faz 21I5 abrir por trip remoto (aba Eventos, "Diagrama de tempos").',
    },
    {
      title: '5. Coordenogramas do TCC',
      steps: ['Aba Proteção, "Coordenogramas".', 'No seletor da janela, escolha a Fig. 4.9, 4.10, 4.11, 4.12 ou 4.13.'],
      result: 'Coordenogramas de fase e de neutro da cadeia de alcance máximo da Fig. 4.6, como no TCC. "Caminho selecionado" marca a corrente da falta escolhida.',
    },
    {
      title: '6. Critérios e pontos críticos',
      steps: ['Aba Proteção, "Critérios de coordenação e sensibilidade".', 'Com a janela aberta, troque o esquema e as opções da aba IEC 61850: a janela se atualiza.'],
      result: 'Pares descoordenados ou abaixo do critério (0,4 s barra x alimentador, 0,3 s no alimentador), múltiplos de sensibilidade e tempo do 51 na própria barra.',
    },
    {
      title: '7. Ensaios de laboratório',
      steps: ['Aba Ensaios: clique em "Pontos I × t dos relés ensaiados".', 'Nos demais ensaios, clique em "Executar": o resultado abre em uma janela.'],
      result: 'Gráficos I × t do Apêndice A e, em cada ensaio, valor do TCC, medido na mala, simulado e diagrama de tempos.',
    },
    {
      title: '8. Ajustes de campo (Anexo B)',
      steps: ['Aba Proteção: troque "Tab. 4.13 (base)" por "Anexo B (extra)".', 'Repita os roteiros 3 a 6.'],
      result: 'Comparação entre os ajustes de campo e os propostos no TCC. Executar um ensaio volta para a base.',
    },
    {
      title: '9. Editar ajustes, perda de SE e exportar',
      steps: ['Aba Proteção, "Tabela de ajustes": clique na linha do relé, altere e use "Aplicar ajustes" (ou clique no religador e em "Editar ajustes").', 'Clique no barramento de uma SE e use "Simular perda da SE".', 'Aba Eventos: "Copiar CSV".'],
      result: '"Restaurar ajustes e parâmetros originais" desfaz as edições e volta para a base.',
    },
  ];

  const map = [
    ['Fig. 4.2 e Fig. 4.3', 'diagrama; cenário "Fig. 4.3"'],
    ['Tabs. 4.1, 4.2, 4.4 a 4.6', 'clique no trecho; Análises, Carregamento dos trechos'],
    ['Tab. 4.7 e Fig. 4.6', 'Análises, Curtos-circuitos nas barras; Falta (qualquer ponto)'],
    ['Tab. 4.8', 'Análises, Curto e carga máximos por relé'],
    ['Tabs. 4.9 a 4.12 e seção 4.7.3', 'Proteção, Critérios de coordenação e sensibilidade'],
    ['Tab. 4.13', 'Proteção, Tabela de ajustes'],
    ['Figs. 4.9 a 4.13', 'Proteção, Coordenogramas'],
    ['Fig. 2.3 e Tab. 2.1', 'Proteção, Famílias de curvas'],
    ['Cap. 3 e Tab. 5.1', 'IEC 61850, Datasets GOOSE; coluna 79 da Tabela de ajustes'],
    ['Seção 5.5 e Apêndice A', 'Ensaios, Pontos I × t dos relés ensaiados'],
    ['Seções 5.6 e 5.7, Apêndices B e C', 'Ensaios, resultado de cada ensaio; Eventos, Diagrama de tempos'],
    ['Anexo B', 'Proteção, Conjunto de ajustes (extra)'],
  ];

  const reading = [
    'Tempos em ms na eliminação da falta e em s nos religamentos e na recomposição. No diagrama de tempos, o zero é o início da falta.',
    'Correntes em ampères primários; no Apêndice A, em ampères secundários, como na mala.',
    'Ciclo: na SE, 1I+2T são três religamentos (aberturas 50, 50, 51, 51); nas linhas, 3I são três aberturas pelo instantâneo.',
    'Selos: "planilha" = relé fora da Tab. 4.13, ajustado pela planilha do autor; "editado" = alterado pelo usuário.',
  ];

  SH.guide = { intro, screen, routes, map, reading };
})(typeof window !== 'undefined' ? window : globalThis);
