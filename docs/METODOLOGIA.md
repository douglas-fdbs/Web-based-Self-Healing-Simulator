# Metodologia do simulador

Este documento descreve os modelos implementados, as equações usadas e as premissas adotadas onde as fontes não trazem o dado. As referências a tabelas e seções sem autor indicado são do TCC de Rodrigues (2015).

## 1. Modelo da rede

A rede é um grafo com dois tipos de ramo:

- **trechos**: impedâncias de sequência positiva e zero em pu (base 100 MVA, 13,8 kV), carga pesada concentrada no ponto médio e ampacidade do cabo limitante;
- **chaves**: religadores e disjuntores, com estado aberto ou fechado e relé associado.

Na topologia da Fig. 4.2 as impedâncias vêm da Tab. 4.6. Elas foram conferidas a partir da composição de cabos (Tab. 4.5) e das impedâncias por quilômetro (Tab. 4.4): a diferença máxima é de 0,0006 pu, atribuível a arredondamento. Na topologia da Fig. 4.1 as impedâncias vêm da Tab. 3.4 de Nobre (2013).

As subestações são fontes ideais atrás de suas impedâncias equivalentes de Thévenin. Para a SE AQZ usa-se o trecho "AQZ" da Tab. 4.6; para as SEs ESB e AGF, o relatório ANAFAS do Anexo A, necessário quando trechos passam a ser alimentados por essas subestações.

**Energização.** A partir de cada fonte em serviço, uma busca em largura percorre trechos e chaves fechadas. Cada nó recebe a fonte que o alimenta, o ramo pai e as impedâncias acumuladas Z1 e Z0. Se uma chave fechada ligar dois nós já energizados, a configuração é marcada como malha ou paralelismo entre fontes; o intertravamento impede esse fechamento e o SRA descarta essas alternativas.

**Zonas.** Removendo todas as chaves, os componentes conexos restantes formam as zonas de proteção. Uma falta numa zona só é isolada abrindo todas as chaves de fronteira da zona. Na Fig. 4.2, os trechos T7, T10 e T11 formam uma única zona, pois não há chave na junção.

## 2. Curto-circuito

Método das componentes simétricas (seção 2.5.2), com Z1 = Z2, tensão pré-falta de 1,0 pu e Ibase = 4183,7 A:

| Falta | Corrente |
|---|---|
| Trifásica | I3F = Ibase / \|Z1 + Rf\| |
| Bifásica | I2F = √3 · Ibase / \|2·Z1 + Rf\| |
| Fase-terra | IFT = 3 · Ibase / \|2·Z1 + Z0 + 3·Rf\| |
| Fase-terra mínima | IFT com Rf = Rc = 100 Ω |

Z1 e Z0 são as impedâncias acumuladas da fonte até o ponto da falta, incluindo a fração do trecho em falta. O valor Rc = 100 Ω não está escrito no TCC; ele foi obtido reproduzindo a coluna IccFTm da Tab. 4.7 (79,7 A na barra de AQZ) e confere também com a Tab. 3.6 de Nobre.

Os relés enxergam a corrente de fase (I3F, I2F ou IFT) e a residual 3I0 (igual a IFT nas faltas à terra). A corrente de carga pré-falta não é somada à corrente de falta, como nos cálculos do TCC.

## 3. Fluxo de carga

Rede radial, cargas como correntes constantes iguais à carga pesada de cada trecho (Tab. 4.2), somadas em módulo, como na seção 2.5.3. A metade a montante de cada trecho conduz a própria carga mais a de jusante; essa é a corrente comparada com a ampacidade. A queda de tensão é aproximada por ΔV ≈ I·(R·cos φ + X·sen φ), com fator de potência de 0,92 e o barramento de cada SE fixo em 1,0 pu. Ela é exibida como informação e só entra no critério de recomposição se o usuário ativar essa opção, porque o critério do TCC e de Nobre é a ampacidade.

**Premissa.** A Tab. 4.2 informa 155 A para o conjunto T7, T10 e T11. O simulador rateia esse valor pelo comprimento dos trechos (39,65 A, 86,78 A e 28,57 A).

## 4. Relés

### 4.1 Elementos de sobrecorrente

- **51P e 51N**: curva IEC, t = TD · β / (M^α − 1), com M = I / Ipickup (Eq. 2.2 e Tab. 2.1). O múltiplo é limitado a M ≤ 30. Os coordenogramas do TCC (Figs. 4.9 a 4.13) mostram a curva 51N achatada em cerca de 0,2 s a partir de M ≈ 30, o que indica essa limitação. Sem ela, o 51N dos religadores da SE (pickup de 26 A) atuaria em menos de 100 ms para faltas à terra de 1,6 kA e perderia a coordenação com os religadores de linha.
- **50P e 50N**: tempo definido igual ao atraso da Tab. 4.13. Nos ajustes de Nobre (2013), que não têm atraso intencional, o tempo é zero.
- **Integração no tempo**: o 51 acumula o progresso ∫dt/t(I) entre eventos (disco de indução) e rearma instantaneamente quando a corrente cai abaixo do pickup.

### 4.2 Religamento (79)

A notação do TCC é lida como sequência de operações até o bloqueio: `1I+2T` significa três operações, a primeira com o 50/50N habilitado e as duas seguintes temporizadas; `3I` são três operações instantâneas. O número de religamentos é o número de operações menos um. O tempo morto é o da Tab. 4.11/4.12 (10 s nos religadores da SE, mais 1 s a cada nível a jusante). Depois de um religamento bem-sucedido, o contador rearma após 30 s. Trip remoto por 50BF leva direto ao bloqueio.

**Divergência na fonte.** A configuração usada no ensaio da seção 5.6.1 (torque control "AND (SH0 OR SH1)" e relato de três religamentos com as duas últimas aberturas temporizadas) indica duas operações instantâneas e duas temporizadas, diferente do `1I+2T` da Tab. 4.13. O simulador usa a Tab. 4.13 por padrão e o preset do ensaio usa a configuração do laboratório.

### 4.3 Grupos de ajuste (SIAP)

Cada grupo pode ter uma condição de ativação: o terminal pelo qual o relé está sendo alimentado (caso do RL3 no TCC, com grupo 1 quando alimentado por 21I6 e grupo 2 quando alimentado por 21I5) ou a contingência que levou à recomposição (Nobre, 2013, por exemplo "curto em T7" ou "curto na SE AQZ"). A seleção é refeita a cada mudança topológica.

### 4.4 Proteção geral de barramento

Os disjuntores secundários 01Z1 e 01Z2 são modelados como um equivalente único (AQZ_MT) que enxerga toda a corrente de falta da SE AQZ, como nos cálculos do TCC. O 50/50N desse relé fica bloqueado no esquema convencional (Anexo B) e pode ser habilitado no esquema com seletividade lógica (Tab. 4.13).

## 5. Funções IEC 61850

- **Seletividade lógica.** Quando um relé registra partida de qualquer elemento (50P1P, 51P1P, 50N1P, 51N1P), envia GOOSE ao primeiro relé a montante na topologia vigente, que fica com os elementos de tempo definido inibidos enquanto a mensagem estiver ativa (torque control "NOT (VB004 OR VB005)", seção 5.3.2). A opção de estender o bloqueio ao 51 cria uma 51 de retaguarda, idêntica à principal com somador de 0,20 s (51ACT, Fig. 5.6c).
- **Falha de disjuntor (50BF).** No trip, um temporizador BFD de 0,20 s é iniciado (Fig. 5.5). Se, ao final, o disjuntor continua fechado e a corrente supera 50BFP = 0,02 A secundários (multiplicado pela RTC), o relé envia GOOSE de trip ao relé a montante, que abre sem religar.
- **Mensagens.** Latência fixa de 3 ms (classe TT6 da IEC 61850-5 para mensagens de trip). É possível simular perda de todas as mensagens, só das de bloqueio ou só das de 50BF.
- **Assinantes.** Num IED real, as assinaturas GOOSE são configuradas de forma estática no arquivo SCD. No simulador, o relé de destino é o primeiro dispositivo a montante na topologia em vigor, o que equivale a supor assinaturas configuradas para cada topologia prevista.

## 6. Simulador de eventos discretos

O tempo avança de evento em evento. Tipos de evento: falta, trip de relé, chegada de GOOSE, verificação de 50BF, abertura e fechamento de disjuntor, fim de tempo morto, rearme do 79, bloqueio e etapas do SRA. Após cada mudança elétrica, a rede é reanalisada e cada relé reprograma seu próximo trip.

**Desempate.** Eventos no mesmo instante são processados na ordem falta, trip, GOOSE, 50BF, disjuntor, religamento, bloqueio, SRA. Se o temporizador de um relé a montante vencer exatamente quando o disjuntor a jusante interrompe a corrente, o relé a montante também atua: margem nula é tratada como descoordenação. Esse caso aparece no ensaio 5.6.2, em que 21I5 (50 em 100 ms) e RS4 (50 em 50 ms + 50 ms de abertura) atuam juntos na primeira falta, como relatado no TCC.

**Parâmetros padrão** (editáveis na aba Proteção): interrupção do disjuntor 50 ms; GOOSE 3 ms; BFD 200 ms; decisão do SRA 2 s após o último bloqueio; 1 s entre manobras telecomandadas.

## 7. Recomposição automática (SRA)

1. **Localização.** Entre os relés no caminho da corrente de falta, o mais a jusante que registrou partida indica a zona sob falta (a zona imediatamente a jusante dele). Se a corrente de falta não sensibilizar esse relé, a localização fica mais a montante, como aconteceria em campo.
2. **Isolamento.** Abrem-se as chaves de fronteira da zona sob falta. Se uma delas estiver travada (falha de disjuntor), a zona vizinha passa a fazer parte da área isolada. Barramentos de subestação sem fonte são isolados e nunca reenergizados pela rede.
3. **Restauração.** Para cada ilha sã desenergizada, testam-se as chaves de encontro que a ligam a uma parte energizada, combinadas com a abertura de chaves internas da ilha (divisão da ilha). Cada alternativa passa por fluxo de carga e é aceita se nenhum trecho ultrapassar a ampacidade e nenhum relé ficar com corrente de carga acima do seu pickup de fase (o grupo de ajuste ativo é recalculado para a nova topologia). Escolhe-se a alternativa que restabelece mais carga, critério de Nobre (2013); empates favorecem menos manobras e depois maior folga de ampacidade. O processo se repete até não haver ganho.
4. **Religamento de atuações não seletivas.** Um disjuntor bloqueado pela proteção pode ser religado pelo SRA quando não faz fronteira com a área sob falta, o que corrige atuações sem seletividade depois que a falta foi isolada.

## 8. Premissas consolidadas

| Item | Premissa | Motivo |
|---|---|---|
| Carga de T7, T10 e T11 | rateio de 155 A pelo comprimento | a Tab. 4.2 só dá o total |
| Ajustes de 21S7, 21S1, 21I2 e RS7 | iguais a dispositivos equivalentes da Tab. 4.13 | fora do estudo do TCC |
| Ajustes de 21F3, 21M3 e 21I7 (AGF) em Nobre | iguais aos alimentadores da SE AQZ | não informados |
| Conexão de RP1 e RP2 (Fig. 4.1) | meio dos trechos T1, T4 e T8 | diagrama de impedâncias não disponível |
| Religamento na topologia de Nobre | desabilitado | não especificado na fonte |
| Rc da falta fase-terra mínima | 100 Ω | reproduz as Tabs. 4.7 e 3.6 |
| Múltiplo máximo das curvas | 30 | coerente com os coordenogramas do TCC |
| Interrupção do disjuntor | 50 ms | valor típico de 3 ciclos |
| Latência GOOSE | 3 ms | classe TT6 da IEC 61850-5 |
| Fator de potência | 0,92 | só para a queda de tensão informativa |
