# Guia de uso do simulador Aquiraz Self-Healing

Este guia explica, passo a passo, como usar o site, o que cada parte da tela mostra e onde encontrar cada resultado do TCC de Rodrigues (2015). O mesmo conteúdo, resumido, está na aba **Guia** do próprio site.

## 1. Como abrir

| Forma | Como fazer |
|---|---|
| Link publicado | Abra o link do artefato no navegador. Não precisa instalar nada. |
| Arquivo local | Abra `index.html` (pasta do repositório) no Chrome, Edge ou Firefox. Funciona sem servidor e sem internet (só as fontes tipográficas vêm da internet). |
| Arquivo único | Rode `npm run build:standalone` e envie `dist/aquiraz-self-healing.html`. |

O site guarda no navegador a topologia, o conjunto de ajustes e as opções da última visita. O botão **Restaurar ajustes e parâmetros originais** (aba Proteção) volta tudo ao padrão.

## 2. Mapa da tela

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Barra superior: Topologia · Esquema (Convencional | IEC 61850) ·          │
│ Self-healing · reprodução (voltar, play, ir ao fim, velocidade, tempo)    │
├───────────────────────────────────────────────┬──────────────────────────┤
│ Diagrama unifilar animado (Fig. 4.2)          │ Painel lateral com abas: │
│  legenda e chave "Correntes nos trechos"      │ Falta · Eventos ·        │
├───────────────────────────────────────────────┤ Análises · Proteção ·    │
│ Barra de status (operação normal ou           │ IEC 61850 · Ensaios ·    │
│ reconfigurada, carga suprida e sem suprimento)│ Fontes · Guia            │
├───────────────────────────────────────────────┤                          │
│ Sequência de eventos (linha do tempo)         │                          │
└───────────────────────────────────────────────┴──────────────────────────┘
```

**Diagrama.** Cada trecho tem a cor da subestação que o alimenta: azul (Aquiraz), roxo (Eusébio) e laranja (Água Fria); cinza é trecho sem tensão. Quadrado vermelho é chave fechada e verde, aberta, como na Fig. 4.3 do TCC. Durante a simulação aparecem o raio no ponto da falta, a corrente de falta em vermelho, os selos **SL** (relé bloqueado por seletividade lógica) e **BLQ** (religamento bloqueado), a contagem regressiva do tempo morto e os arcos das mensagens GOOSE (azul-claro para bloqueio, rosa para 50BF). A chave **Correntes nos trechos** mostra a corrente de carga de cada trecho.

**Reprodução.** O tempo corre em câmera lenta automática nos transitórios de milissegundos e acelera nos tempos mortos. Use **Câmera lenta** ou **Tempo real** no seletor de velocidade, **voltar** para o início, **ir ao fim** para o estado final. Clique em qualquer evento da linha do tempo ou do registro para ir até aquele instante.

**Barra de status.** Indica se a rede está na operação normal ou reconfigurada, se há falta presente, a carga suprida e a sem suprimento (em ampères), o esquema e o self-healing. Quando o conjunto de ajustes não é o da base, aparece o campo **Ajustes**. O botão **Voltar à operação normal** reinicia a rede.

## 3. O que cada aba faz

| Aba | Conteúdo |
|---|---|
| **Falta** | Sem seleção: instruções e cenários prontos. Com um trecho selecionado: posição, tipo e resistência da falta, opção de falta temporária e correntes de curto no ponto. Com uma chave selecionada: ajustes do relé, comandos de abrir e fechar e simulação de disjuntor travado. Com o barramento de uma SE selecionado: perda e religamento da SE. |
| **Eventos** | Diagrama de tempos no estilo do Sequenc (como as Figs. 5.12 a 5.22) e registro completo de eventos, exportável em CSV. |
| **Análises** | Resumo da última simulação, conferência com a Tab. 4.8 (curto e carga máximos por relé), carregamento de cada trecho e comparação dos curtos com a Tab. 4.7. |
| **Proteção** | Coordenogramas (caminho selecionado ou Figs. 4.9 a 4.13), escolha do conjunto de ajustes (Tab. 4.13 ou Anexo B), tabela de ajustes editável com o estado do religamento, parâmetros da simulação, verificação dos critérios de coordenação e sensibilidade e famílias de curvas (Fig. 2.3). |
| **IEC 61850** | Liga e desliga seletividade lógica, 50BF, instantâneo da barra, bloqueio estendido ao 51 e supervisão da qualidade da mensagem; latência, BFD, somador e perda de mensagens; datasets da Tab. 5.1 e lista de GOOSEs da última simulação. |
| **Ensaios** | Ensaios de sobrecorrente do Apêndice A (gráficos I × t) e os ensaios de religamento, seletividade lógica e 50BF do Cap. 5 e dos Apêndices B e C, com o valor citado no TCC, o medido no relatório da mala e o simulado. |
| **Fontes** | Topologia, premissas, divergências encontradas nas fontes, modelagem e referências. |
| **Guia** | Resumo deste documento. |

## 4. Roteiros passo a passo

### Roteiro 1. Primeira simulação: falta permanente em T1 (Fig. 4.3)

1. Na aba **Falta**, em **Cenários prontos**, clique em **Fig. 4.3: falta permanente em T1**.
2. Acompanhe no diagrama: 21I7 abre pelo instantâneo, religa, abre de novo e, depois de três religamentos, bloqueia.
3. Dois segundos depois do bloqueio, o self-healing (SRA) localiza a falta em T1, abre RS1 e fecha RL1.
4. **O que você obtém:** o trecho T2 volta a ser alimentado pela SE Eusébio (cor roxa), como na Fig. 4.3 do TCC. A barra de status mostra a carga que ficou sem suprimento (só a de T1).
5. Na aba **Eventos**, use **Ciclo completo (s)** no diagrama de tempos para ver as quatro aberturas de 21I7 (50, 50, 51, 51) e os tempos mortos de 10 s.

### Roteiro 2. Falta em qualquer ponto

1. Clique em um trecho do diagrama. O ponto clicado vira a posição da falta (ajuste fino em **Posição ao longo do trecho**).
2. Escolha o **Tipo**: trifásica, bifásica, fase-terra franca ou fase-terra mínima (Rc = 100 Ω). Se quiser, informe uma **Resistência de falta**.
3. Marque **Falta temporária** para uma falta que se extingue no tempo morto.
4. Clique em **Aplicar falta**.
5. **O que você obtém:** as correntes de curto no ponto (antes de aplicar), a animação da atuação, o registro de eventos e, com falta permanente e self-healing ligado, a recomposição.

### Roteiro 3. Convencional x IEC 61850

1. Clique no início do trecho T9 (logo depois de RS4) e aplique uma falta trifásica com o esquema **Convencional**.
2. Veja que RS4 e 21I5 abrem juntos: é o segundo ponto crítico da seção 4.7.3 do TCC.
3. Clique em **Voltar à operação normal**, mude o esquema para **IEC 61850** e repita.
4. **O que você obtém:** RS4 envia GOOSE de bloqueio (arco azul-claro), 21I5 fica com o selo SL e só RS4 abre. Na aba **IEC 61850** aparece a lista das mensagens trocadas.

### Roteiro 4. Falha de disjuntor (50BF)

1. Selecione o esquema **IEC 61850**.
2. Clique na chave RS4 e, na aba **Falta**, use **Simular falha de abertura (disjuntor travado)**.
3. Aplique uma falta no início de T9.
4. **O que você obtém:** RS4 dá trip, mas a corrente continua; 200 ms depois o 50BF envia GOOSE de trip (arco rosa) e 21I5 abre por trip remoto. O diagrama de tempos (aba **Eventos**) mostra o intervalo entre os dois trips.

### Roteiro 5. Coordenogramas do TCC (Figs. 4.9 a 4.13)

1. Abra a aba **Proteção**.
2. No seletor **Coordenograma**, escolha uma das figuras: 4.9 (21I7), 4.10 (21I6), 4.11 (21I5), 4.12 (21I4) ou 4.13 (alimentador e barra).
3. **O que você obtém:** os coordenogramas de fase e de neutro da cadeia de alcance máximo da Fig. 4.6, com os ajustes do conjunto ativo, no mesmo formato do TCC.
4. A opção **Caminho selecionado** desenha os relés entre a falta selecionada e a fonte na topologia atual e marca a corrente de falta e o tempo de cada relé.

### Roteiro 6. Critérios de coordenação e pontos críticos

1. Na aba **Proteção**, desça até **Critérios de coordenação e sensibilidade**.
2. A tabela lista os pares fora do critério no esquema escolhido. **Descoordenado** significa que o relé a montante atua antes de o disjuntor a jusante abrir; **abaixo** significa margem menor que o critério do TCC (0,4 s entre barra e alimentador; 0,3 s ao longo do alimentador).
3. Troque o esquema e as opções da aba **IEC 61850** e veja a contagem mudar. Com seletividade lógica estendida ao 51 não resta par descoordenado.
4. A segunda tabela mostra a sensibilidade (múltiplo mínimo de 2,4 na fase e 4,0 no neutro) e o tempo do 51 na própria barra comparado com o critério das Tabs. 4.11 e 4.12.

### Roteiro 7. Ensaios de laboratório (Cap. 5 e apêndices)

1. Abra a aba **Ensaios**.
2. Em **5.5 Sobrecorrente (Apêndice A)**, clique em **Mostrar**: aparecem os gráficos I × t dos quatro relés (como as Figs. A1 a A4) e as tabelas com o tempo medido e o simulado.
3. Em cada ensaio de religamento, seletividade lógica ou 50BF, clique em **Executar**.
4. **O que você obtém:** a animação no diagrama, a tabela com o valor citado no TCC, o medido no relatório da mala CE-6006 e o simulado, e o diagrama de tempos do ensaio. Os ensaios usam a base (Tab. 4.13) com os ajustes do relé ensaiado quando diferem dela e 13 ms de processamento do relé.

### Roteiro 8. Conferir os números do TCC

1. Aba **Análises**: compare os curtos de cada barra com a Tab. 4.7 e o curto e a carga máximos de cada relé com a Tab. 4.8.
2. Clique em uma barra ou trecho para ver as correntes de curto no ponto (aba **Falta**).
3. O relatório completo está em `docs/VALIDACAO.md`.

### Roteiro 9. Ajustes de campo (Anexo B)

1. Na aba **Proteção**, troque **Tab. 4.13 (base)** por **Anexo B (extra)**.
2. Um aviso explica os valores adotados onde o Anexo B é omisso, e a barra de status passa a mostrar **Ajustes: Anexo B**.
3. Repita os roteiros 3 a 6 para comparar. Volte para a base pelo mesmo seletor; executar um ensaio também volta para a base.

### Roteiro 10. Editar o ajuste de um relé

1. Na aba **Proteção**, clique na linha do relé na tabela de ajustes.
2. Altere pickup, dial, curva, instantâneo, atraso, ciclo ou tempo morto e clique em **Aplicar ajustes**.
3. O relé recebe o selo **editado**. Use **Restaurar ajustes e parâmetros originais** para desfazer.

### Roteiro 11. Perda de subestação e falta no barramento

1. Clique no barramento de uma SE no diagrama e use **Simular perda da SE**, ou escolha os cenários prontos **Perda da SE Eusébio** e **Falta no barramento 13,8 kV da SE AQZ**.
2. **O que você obtém:** o SRA isola o barramento sem fonte e transfere os trechos para outras SEs até onde a ampacidade permite. **Religar SE** devolve a fonte.

### Roteiro 12. Exportar resultados

1. Aba **Eventos**, botão **Copiar CSV**: copia o registro (tempo em s, categoria, dispositivo e descrição) para colar numa planilha.
2. Para figuras, use a captura de tela do navegador; os gráficos são vetoriais e ficam nítidos em qualquer zoom.

## 5. Onde está cada item do TCC

| Item do TCC | Onde ver no site |
|---|---|
| Fig. 4.2 (topologia) e Fig. 4.3 (recomposição) | diagrama; cenário pronto "Fig. 4.3" |
| Fig. 4.1 (primeira topologia) | seletor **Topologia** (extra, dados de Nobre, 2013) |
| Tabs. 4.1, 4.2, 4.4 a 4.6 (cabos, cargas, impedâncias) | clique em um trecho (aba Falta); carregamento na aba Análises |
| Tab. 4.7 e Fig. 4.6 (curtos) | aba Análises; aba Falta para qualquer ponto |
| Tab. 4.8 (TCs, curto e carga máximos) | aba Análises |
| Tabs. 4.9 a 4.12 (critérios) | aba Proteção, Critérios de coordenação e sensibilidade |
| Tab. 4.13 (ajustes) | aba Proteção, tabela de ajustes (base) |
| Figs. 4.9 a 4.13 (coordenogramas) | aba Proteção, seletor Coordenograma |
| Seção 4.7.3 (pontos críticos) | aba Proteção, critérios; roteiro 3 |
| Fig. 2.3 e Tab. 2.1 (curvas) | aba Proteção, Famílias de curvas |
| Cap. 3 (50BF, seletividade lógica, trip, religamento) | aba IEC 61850; roteiros 3 e 4; coluna 79 da tabela de ajustes |
| Tab. 5.1 (datasets GOOSE) | aba IEC 61850 |
| Seção 5.5 e Apêndice A | aba Ensaios, 5.5 Sobrecorrente |
| Seções 5.6 e 5.7, Apêndices B e C | aba Ensaios; diagrama de tempos |
| Anexo A (ANAFAS) | impedâncias das SEs ESB e AGF (premissas da aba Fontes; correntes de curto na aba Falta) |
| Anexo B (ajustes de campo) | aba Proteção, seletor de ajustes (extra) |

## 6. Como ler os resultados

- **Tempos:** "ms" para a eliminação da falta, "s" para religamentos e recomposição. No diagrama de tempos, o zero é o início da falta.
- **Correntes:** ampères primários, salvo os ensaios do Apêndice A (ampères secundários, como na mala).
- **Ciclo de religamento:** nos religadores da SE, `1I+2T` são três religamentos (aberturas 50, 50, 51, 51); nos de linha, `3I` são três aberturas pelo instantâneo. A coluna **79** da tabela de ajustes mostra o estado: repouso, ciclo ou bloqueio.
- **Selos:** **planilha** marca relé fora da Tab. 4.13 com ajustes da planilha do autor; **editado**, relé alterado pelo usuário.
- **Base e extras:** a base é a Fig. 4.2 com a Tab. 4.13. A Fig. 4.1, o Anexo B e os ajustes do laboratório são extras e aparecem identificados.

## 7. Limitações

Fluxo de carga simplificado, relés não direcionais, sem saturação de TC nem transitórios eletromagnéticos, tempos fixos de abertura do disjuntor (50 ms) e de GOOSE (3 ms), sem modelar a rede Ethernet. A lista completa está em `docs/METODOLOGIA.md` e na aba Fontes.
