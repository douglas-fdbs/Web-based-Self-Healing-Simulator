/*
 * Conteúdo das abas do painel lateral. Cada função recebe o objeto da
 * aplicação (estado + ações, definido em app.js) e o contêiner da aba.
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});
  const { el, fmt } = SH.ui;
  const N = SH.network;
  const SC = SH.shortcircuit;
  const PR = SH.protection;

  const TABS = [
    { id: 'falta', label: 'Falta' },
    { id: 'eventos', label: 'Eventos' },
    { id: 'analises', label: 'Análises' },
    { id: 'protecao', label: 'Proteção' },
    { id: 'iec', label: 'IEC 61850' },
    { id: 'ensaios', label: 'Ensaios' },
    { id: 'fontes', label: 'Fontes' },
  ];

  const CAT_LABEL = {
    falta: 'falta', partida: 'partida', trip: 'trip', disjuntor: 'disj.', goose: 'goose', '50bf': '50BF',
    79: '79', bloqueio: 'bloq.', sra: 'SRA', siap: 'SIAP', alerta: 'alerta', info: 'info',
  };

  const KIND_LABEL = { feeder: 'Saída de alimentador', recloser: 'Religador de linha (normalmente fechado)', tie: 'Religador de interligação (normalmente aberto)', bus: 'Proteção geral de barramento' };

  function relayLine(s, label) {
    if (!s) return null;
    return el('div', { class: 'small' },
      el('b', { text: `${label}: ` }),
      `51 ${fmt.amp(s.pickup, s.pickup % 1 ? 1 : 0)} · dial ${fmt.num(s.dial, 2)} · ${s.curve}`,
      s.inst > 0 ? ` · 50 ${fmt.amp(s.inst, s.inst % 1 ? 1 : 0)} em ${fmt.ms((s.instDelay || 0) * 1000)}` : '');
  }

  // ------------------------------------------------------------------ Falta
  function tabFalta(app, root) {
    const sel = app.sel;
    const model = app.model;
    if (!sel) {
      root.append(
        el('div', { class: 'stack' },
          el('span', { class: 'eyebrow', text: 'Como usar' }),
          el('h2', { text: 'Clique em um trecho do diagrama para aplicar uma falta' }),
          el('p', { class: 'small muted', text: 'O ponto clicado define a posição da falta. Clique em um religador para ver ajustes, comandar ou simular falha de abertura; clique no barramento de uma subestação para simular sua perda. O esquema de proteção (convencional ou IEC 61850) e o self-healing ficam na barra superior.' })),
        el('div', { class: 'stack' },
          el('span', { class: 'eyebrow', text: 'Cenários prontos' }),
          el('div', { class: 'examples' }, SH.labs.examples.map((ex) => el('button', {
            type: 'button', class: 'example', onclick: () => app.runExample(ex),
          }, el('b', { text: ex.title }), el('span', { text: `${ex.scenario === 'nobre2013' ? '[Fig. 4.1] ' : ''}${ex.description}` }))))),
      );
      return;
    }
    if (sel.type === 'seg') return segPanel(app, root, model.segments[sel.id]);
    if (sel.type === 'sw') return swPanel(app, root, model.switches[sel.id]);
    if (sel.type === 'bus') return busPanel(app, root, model.nodes[sel.id]);
  }

  function segPanel(app, root, s) {
    const cfg = app.faultCfg;
    const scn = app.model.scn;
    const cables = (s.cable || []).map(([c, L]) => `${scn.cables[c] ? scn.cables[c].name : c}: ${fmt.num(L / 1000, 3)} km`);
    const st = app.currentState();
    const topo = N.analyze(app.model, st);
    const info = topo.seg[s.id];

    const head = el('div', { class: 'stack' },
      el('span', { class: 'eyebrow', text: 'Trecho selecionado' }),
      el('div', { class: 'row' }, el('h2', { text: `Trecho ${s.label || s.id}` }),
        info.energized ? el('span', { class: 'chip', style: { color: `var(--src-${app.model.sources[info.src].color})` }, text: app.model.sources[info.src].name }) : el('span', { class: 'chip warn', text: 'sem tensão' })),
      el('dl', { class: 'kvlist' },
        el('dt', { text: 'Cabos' }), el('dd', { text: cables.length ? cables.join(' + ') : 'composição não informada na fonte' }),
        el('dt', { text: 'Z1 / Z0 (pu)' }), el('dd', { text: `${SH.complex.fmt(s.z1)} / ${SH.complex.fmt(s.z0)}` }),
        el('dt', { text: 'Carga pesada' }), el('dd', { text: `${fmt.amp(s.load, s.load % 1 ? 1 : 0)}${s.loadNote ? ` (${s.loadNote})` : ''}` }),
        el('dt', { text: 'Ampacidade' }), el('dd', { text: fmt.amp(s.amp) })));
    root.append(head);

    // configuração da falta
    const posVal = el('span', { class: 'num', text: `${fmt.num(cfg.x * 100, 0)}%` });
    const pos = el('input', { type: 'range', id: 'faultPos', min: 0, max: 100, step: 1, value: Math.round(cfg.x * 100) });
    const typeSel = el('select', { id: 'faultType' }, Object.entries(SC.FAULT_TYPES).map(([k, v]) => el('option', { value: k, selected: cfg.type === k ? true : null, text: v.label })));
    const rf = el('input', { type: 'number', id: 'faultRf', min: 0, step: 1, value: cfg.rf, style: { width: '6em' }, disabled: cfg.type === 'FTm' ? true : null });
    const temp = el('input', { type: 'checkbox', id: 'faultTemp', checked: cfg.temporary ? true : null });
    const readout = el('div', { class: 'current-readout' });
    const updatePreview = () => {
      readout.innerHTML = '';
      const fr = SC.analyzeFault(app.model, topo, { kind: 'segment', seg: s.id, x: cfg.x, type: cfg.type, rf: cfg.rf });
      if (!fr.energized) { readout.append(el('div', { style: { gridColumn: '1 / -1' } }, el('span', { class: 'lab', text: 'Trecho sem tensão' }), el('div', { class: 'val', text: 'sem corrente de falta' }))); return; }
      [['3F', fr.std.i3f], ['2F', fr.std.i2f], ['FT', fr.std.ift], ['FTm', fr.std.iftm]].forEach(([k, v]) => {
        readout.append(el('div', { class: k === cfg.type ? 'sel' : '' }, el('div', { class: 'lab', text: `Icc ${k}` }), el('div', { class: 'val', text: fmt.amp(v) })));
      });
      if (cfg.rf > 0 && cfg.type !== 'FTm') readout.append(el('div', { style: { gridColumn: '1 / -1' } }, el('span', { class: 'lab', text: `Com Rf = ${cfg.rf} Ω` }), el('div', { class: 'val', text: fmt.amp(fr.phase) })));
    };
    pos.addEventListener('input', () => {
      cfg.x = Number(pos.value) / 100;
      posVal.textContent = `${pos.value}%`;
      app.diagram.setSelection(Object.assign({}, app.sel, { x: cfg.x }));
      app.sel.x = cfg.x;
      updatePreview();
    });
    typeSel.addEventListener('change', () => { cfg.type = typeSel.value; rf.disabled = cfg.type === 'FTm'; updatePreview(); });
    rf.addEventListener('input', () => { cfg.rf = Math.max(0, Number(rf.value) || 0); updatePreview(); });
    temp.addEventListener('change', () => { cfg.temporary = temp.checked; });
    updatePreview();

    root.append(el('div', { class: 'stack' },
      el('span', { class: 'eyebrow', text: 'Falta' }),
      el('label', { class: 'field', for: 'faultPos' }, el('span', {}, 'Posição ao longo do trecho: ', posVal), pos),
      el('div', { class: 'grid2' },
        el('label', { class: 'field', for: 'faultType' }, el('span', { text: 'Tipo' }), typeSel),
        el('label', { class: 'field', for: 'faultRf' }, el('span', { text: 'Resistência de falta (Ω)' }), rf)),
      el('label', { class: 'switch', for: 'faultTemp' }, temp, 'Falta temporária (extingue no tempo morto)'),
      el('span', { class: 'eyebrow', text: 'Correntes de curto no ponto' }),
      readout,
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn primary', onclick: () => app.applyFault({ kind: 'segment', seg: s.id, x: cfg.x, type: cfg.type, rf: cfg.rf }, cfg.temporary) }, 'Aplicar falta'),
        el('button', { type: 'button', class: 'btn', onclick: () => app.select(null) }, 'Cancelar'))));
    root.append(el('p', { class: 'small muted', text: `Esquema: ${app.schemeLabel()} · self-healing ${app.options.sra ? 'ligado' : 'desligado'}. A simulação parte do estado atual da rede.` }));
  }

  function swPanel(app, root, w) {
    const snap = app.currentSnap();
    const s = snap.sw[w.id];
    const cfg = w.relay ? app.model.relays[w.relay] : null;
    const r = w.relay ? snap.relay[w.relay] : null;
    const g = cfg ? (cfg.groups.find((x) => x.id === (r && r.group)) || cfg.groups[0]) : null;
    root.append(el('div', { class: 'stack' },
      el('span', { class: 'eyebrow', text: 'Equipamento' }),
      el('div', { class: 'row' },
        el('h2', { text: w.label || w.id }),
        el('span', { class: `chip ${s.closed ? 'crit' : 'ok'}`, text: s.closed ? 'fechado' : 'aberto' }),
        s.locked ? el('span', { class: 'chip warn', text: 'bloqueado' }) : null,
        cfg && cfg.assumed ? el('span', { class: 'chip assumed', text: 'ajuste assumido' }) : null),
      el('p', { class: 'small muted', text: w.desc || KIND_LABEL[w.kind] || '' }),
      el('dl', { class: 'kvlist' },
        el('dt', { text: 'Corrente' }), el('dd', { text: s.carrying ? fmt.amp(s.I) : '-' }),
        cfg ? el('dt', { text: 'RTC' }) : null, cfg ? el('dd', { text: String(cfg.rtc) }) : null,
        cfg ? el('dt', { text: 'Ciclo 79' }) : null, cfg ? el('dd', { text: `${typeof cfg.cycle === 'string' ? cfg.cycle : PR.cycleLabel(cfg.cycle)} · tempo morto ${fmt.num(Array.isArray(cfg.deadTime) ? cfg.deadTime[0] : cfg.deadTime, 0)} s` }) : null,
        g ? el('dt', { text: 'Grupo ativo' }) : null, g ? el('dd', { text: g.name }) : null,
        cfg && cfg.ref ? el('dt', { text: 'Origem' }) : null, cfg && cfg.ref ? el('dd', { text: cfg.ref }) : null),
      g ? relayLine(g.phase, 'Fase') : null,
      g ? relayLine(g.ground, 'Neutro') : null,
      cfg && cfg.assumed ? el('div', { class: 'callout warn', text: cfg.assumed }) : null,
      cfg && cfg.inst50Scheme ? el('div', { class: 'callout', text: `50/50N ${app.options.busInst50 ? 'habilitado' : 'bloqueado'} (no esquema convencional o instantâneo da proteção de barra fica bloqueado; com seletividade lógica ele pode ser habilitado).` }) : null));

    const stuck = el('input', { type: 'checkbox', id: 'swStuck', checked: app.stuck.has(w.id) ? true : null });
    stuck.addEventListener('change', () => app.setStuck(w.id, stuck.checked));
    root.append(el('div', { class: 'stack' },
      el('span', { class: 'eyebrow', text: 'Comandos' }),
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn', disabled: !s.closed ? true : null, onclick: () => app.manual(w.id, 'open') }, 'Abrir'),
        el('button', { type: 'button', class: 'btn', disabled: s.closed ? true : null, onclick: () => app.manual(w.id, 'close') }, 'Fechar'),
        el('button', { type: 'button', class: 'btn', onclick: () => { app.setTab('protecao'); } }, 'Ver coordenograma')),
      el('label', { class: 'switch', for: 'swStuck' }, stuck, 'Simular falha de abertura (disjuntor travado)'),
      el('p', { class: 'small muted', text: 'Com o disjuntor travado, o relé dá trip mas a corrente continua: é o caso do 50BF. O fechamento manual é bloqueado se colocar fontes em paralelo ou fechar malha.' })));
  }

  function busPanel(app, root, n) {
    // subestação que alimenta este barramento sem passar por trechos (barramento da própria SE)
    const topoN = N.analyze(app.model, N.normalState(app.model));
    const nInfo = topoN.node[n.id];
    const direct = nInfo && N.pathToSource(topoN, n.id).every((e) => e.type === 'sw');
    const src = direct ? app.model.sources[nInfo.src] : null;
    const snap = app.currentSnap();
    const on = src ? snap.srcOn[src.id] : true;
    const topo = N.analyze(app.model, app.currentState());
    const protectedBus = N.protectiveDevicesUpstream(app.model, topo, n.id).length > 0;
    root.append(el('div', { class: 'stack' },
      el('span', { class: 'eyebrow', text: 'Subestação' }),
      el('div', { class: 'row' }, el('h2', { text: n.label }), el('span', { class: `chip ${on ? 'ok' : 'crit'}`, text: on ? 'em serviço' : 'fora de serviço' })),
      src ? el('dl', { class: 'kvlist' },
        el('dt', { text: 'Z1 equivalente' }), el('dd', { text: `${SH.complex.fmt(src.z1)} pu` }),
        el('dt', { text: 'Z0 equivalente' }), el('dd', { text: `${SH.complex.fmt(src.z0)} pu` }),
        el('dt', { text: 'Icc 3F na barra' }), el('dd', { text: fmt.amp(SC.currents(app.model, src.z1, src.z0).i3f) }),
        el('dt', { text: 'Origem' }), el('dd', { text: src.ref || '' })) : null,
      el('div', { class: 'row' },
        src ? el('button', { type: 'button', class: 'btn danger', disabled: !on ? true : null, onclick: () => app.sourceLoss(src.id) }, 'Simular perda da SE') : null,
        src ? el('button', { type: 'button', class: 'btn', disabled: on ? true : null, onclick: () => app.sourceOn(src.id) }, 'Religar SE') : null,
        protectedBus ? el('button', { type: 'button', class: 'btn', onclick: () => app.applyFault({ kind: 'bus', node: n.id, type: app.faultCfg.type, rf: app.faultCfg.rf }, false) }, `Falta ${app.faultCfg.type} no barramento`) : null),
      el('p', { class: 'small muted', text: 'Na perda da SE, o SRA abre os disjuntores do barramento sem fonte e transfere os trechos para outras subestações, respeitando a ampacidade.' })));
  }

  // ------------------------------------------------------------------ Eventos
  function tabEventos(app, root) {
    const res = app.result;
    if (!res || res.idle) {
      root.append(el('p', { class: 'muted', text: 'Nenhuma simulação ainda. Aplique uma falta ou execute um cenário pronto.' }));
      return;
    }
    const showMinor = el('input', { type: 'checkbox', id: 'logMinor', checked: app.logMinor ? true : null });
    showMinor.addEventListener('change', () => { app.logMinor = showMinor.checked; app.renderPanel(); });
    const hidePickup = el('input', { type: 'checkbox', id: 'logPick', checked: app.logHidePick ? true : null });
    hidePickup.addEventListener('change', () => { app.logHidePick = hidePickup.checked; app.renderPanel(); });
    const ta = el('textarea', { hidden: true, rows: 4, style: { width: '100%' }, 'aria-label': 'CSV dos eventos' });
    const copyBtn = el('button', { type: 'button', class: 'btn' }, 'Copiar CSV');
    copyBtn.addEventListener('click', async () => {
      const csv = ['t_s;categoria;dispositivo;descricao'].concat(res.log.map((e) => `${e.t.toFixed(6).replace('.', ',')};${e.cat};${e.dev || ''};"${e.text.replace(/"/g, "'")}"`)).join('\n');
      const ok = await SH.ui.copyText(csv, ta);
      copyBtn.textContent = ok ? 'CSV copiado' : 'Selecione e copie abaixo';
    });
    root.append(el('div', { class: 'row' },
      el('label', { class: 'switch', for: 'logMinor' }, showMinor, 'Análise do SRA'),
      el('label', { class: 'switch', for: 'logPick' }, hidePickup, 'Ocultar partidas'),
      copyBtn), ta);
    const list = el('ol', { class: 'log', id: 'eventList' });
    res.log.forEach((e, i) => {
      if (e.minor && !app.logMinor) return;
      if (app.logHidePick && e.cat === 'partida') return;
      const li = el('li', { 'data-i': i, 'data-t': e.t, class: e.minor ? 'minor' : '', onclick: () => app.seek(e.t) },
        el('span', { class: 't', text: fmt.evt(e.t) }),
        el('span', { class: `cat cat-${e.cat}`, text: CAT_LABEL[e.cat] || e.cat }),
        el('span', { text: e.text }));
      list.append(li);
    });
    root.append(list);
    app.highlightLog();
  }

  // ------------------------------------------------------------------ Análises
  function tabAnalises(app, root) {
    const model = app.model;
    const scn = model.scn;
    const res = app.result;
    // resumo da última simulação
    if (res && !res.idle) {
      const m = res.metrics;
      const t0 = m.faultAt != null ? m.faultAt : 0;
      root.append(el('div', { class: 'stack' },
        el('span', { class: 'eyebrow', text: 'Última simulação' }),
        el('dl', { class: 'kvlist' },
          el('dt', { text: 'Primeiro trip' }), el('dd', { text: m.firstTrip != null ? fmt.ms((m.firstTrip - t0) * 1000) : '-' }),
          el('dt', { text: 'Primeira eliminação' }), el('dd', { text: m.firstClear != null ? fmt.ms((m.firstClear - t0) * 1000) : '-' }),
          el('dt', { text: 'Eliminação definitiva' }), el('dd', { text: m.clearedAt != null ? fmt.sec(m.clearedAt - t0) : '-' }),
          el('dt', { text: 'Carga interrompida (pico)' }), el('dd', { text: fmt.amp(m.unservedPeak) }),
          el('dt', { text: 'Carga sem suprimento ao final' }), el('dd', { text: fmt.amp(res.snaps[res.snaps.length - 1].unserved) }),
          el('dt', { text: 'SRA' }), el('dd', { text: m.sraStart != null ? `de ${fmt.sec(m.sraStart, 2)} a ${fmt.sec(m.sraEnd, 2)}` : 'não atuou' }))));
    }
    // carregamento
    const snap = app.currentSnap();
    const st = app.stateFromSnap(snap);
    const topo = N.analyze(model, st);
    const flows = N.computeFlows(model, topo, app.options);
    const bars = el('div', { class: 'bars' });
    Object.values(model.segments).forEach((s) => {
      const f = flows.segFlow[s.id];
      const I = f ? f.upper : 0;
      const p = s.amp ? I / s.amp : 0;
      const cls = !f ? 'dead' : p > 1 ? 'crit' : p > 0.8 ? 'warn' : '';
      bars.append(el('div', { class: 'bar-row' },
        el('span', { class: 'mono', text: s.id }),
        el('div', { class: 'track', title: `${fmt.amp(I)} de ${fmt.amp(s.amp)}` }, el('div', { class: `fill ${cls}`, style: { width: `${Math.min(100, p * 100)}%` } })),
        el('span', { class: 'v', text: f ? `${fmt.num(I, 0)}/${s.amp}` : 'sem tensão' })));
    });
    const vmin = Object.entries(flows.volt).reduce((a, b) => (b[1] < a[1] ? b : a), ['', 1]);
    if (SH.coordination && scn.validation && scn.validation.tab48 && app.settingsSet === 'base') {
      const rows = SH.coordination.ctCheck(model);
      root.append(el('div', { class: 'stack' },
        el('span', { class: 'eyebrow', text: 'Conferência com a Tab. 4.8 (curto e carga máximos por relé)' }),
        el('p', { class: 'small muted', text: 'Curto máximo: maior entre 3F e FT na barra do relé, entre todas as fontes que podem alimentá-la. Carga máxima: maior corrente pelo relé nas configurações de alcance máximo (Fig. 4.6). ESB, AGF e RS7 conferidos com a aba "Dimensionamento TC e TP" da planilha.' }),
        el('div', { class: 'table-wrap' }, el('table', {},
          el('thead', {}, el('tr', {}, ['Relé', 'Icc sim.', 'Icc TCC', 'Carga sim.', 'Carga TCC', 'RTC'].map((h, i) => el('th', { class: i ? '' : 'l', text: h })))),
          el('tbody', {}, rows.map((r) => el('tr', {},
            el('td', { class: 'l', text: app.swLabel(r.dev) }),
            el('td', { text: fmt.num(r.icc, 0) }), el('td', { text: fmt.num(r.iccRef, 0) }),
            el('td', { text: fmt.num(r.ic, 0) }), el('td', { text: fmt.num(r.icRef, 0) }),
            el('td', { text: String(r.rtc) }))))))));
    }
    root.append(el('div', { class: 'stack' },
      el('span', { class: 'eyebrow', text: 'Carregamento dos trechos (A / ampacidade)' }),
      el('p', { class: 'small muted', text: `Instante exibido: ${fmt.evt(app.pt)}. Carga suprida ${fmt.amp(flows.served)} · sem suprimento ${fmt.amp(flows.unserved)}.` }),
      bars,
      el('p', { class: 'small muted', text: `Tensão mínima estimada: ${fmt.num(vmin[1], 3)} pu (FP ${fmt.num(app.options.pf, 2)} adotado; barra das SEs em 1,0 pu). A queda de tensão é informativa: o critério de recomposição do TCC e de Nobre é a ampacidade.` })));

    // validação dos curtos
    const tab = scn.validation.tab47 || scn.validation.tab36;
    if (tab) {
      const isTCC = !!scn.validation.tab47;
      const tbl = el('table', {},
        el('thead', {}, el('tr', {}, el('th', { class: 'l', text: isTCC ? 'Alim. / barra' : 'Trecho' }), el('th', { text: 'Icc3F' }), el('th', { text: 'Icc2F' }), el('th', { text: 'IccFT' }), el('th', { text: 'IccFTm' }))),
        el('tbody', {}, tab.map((v) => {
          const r = SC.pathFault(model, v.source || scn.validation.sourceForPath || 'AQZ', v.path);
          const cells = [r.i3f, r.i2f, r.ift, r.iftm].map((x, i) => {
            const ref = v.tcc[4 + i];
            const e = (100 * (x - ref)) / ref;
            return el('td', {}, fmt.num(x, 1), el('span', { class: `ref ${Math.abs(e) < 0.1 ? 'err-ok' : 'err-bad'}`, text: `${isTCC ? 'TCC' : 'ref.'} ${fmt.num(ref, 1)} · ${e >= 0 ? '+' : ''}${fmt.num(e, 2)}%` }));
          });
          return el('tr', {}, el('td', { class: 'l', text: isTCC ? `${v.feeder} · ${v.bus}` : v.seg }), cells);
        })));
      root.append(el('div', { class: 'stack' },
        el('span', { class: 'eyebrow', text: isTCC ? 'Validação: Tabela 4.7 do TCC' : 'Validação: Tabela 3.6 de Nobre (2013)' }),
        el('p', { class: 'small muted', text: isTCC ? 'Curtos nas barras da configuração de alcance máximo (Fig. 4.6), calculados pelo simulador e comparados com o TCC.' : 'Curto no fim de cada trecho, configuração normal.' }),
        el('div', { class: 'table-wrap' }, tbl)));
    }
  }

  // ------------------------------------------------------------------ Proteção
  function pathDevices(app) {
    const model = app.model;
    const st = app.currentState();
    const topo = N.analyze(model, st);
    let node = null;
    let first = null;
    const sel = app.sel;
    if (sel && sel.type === 'seg' && topo.seg[sel.id].energized) node = topo.seg[sel.id].up;
    else if (sel && sel.type === 'sw') {
      const info = topo.sw[sel.id];
      if (info.carrying) node = info.up;
      first = model.switches[sel.id].relay ? sel.id : null;
    } else if (sel && sel.type === 'bus' && topo.node[sel.id]) node = sel.id;
    if (!node && !first) {
      // padrão: caminho mais longo da rede
      let best = null;
      Object.values(model.segments).forEach((s) => {
        const i = topo.seg[s.id];
        if (!i.energized) return;
        const n = N.protectiveDevicesUpstream(model, topo, i.up).length;
        if (!best || n > best.n) best = { n, node: i.up };
      });
      node = best ? best.node : null;
    }
    let list = node ? N.protectiveDevicesUpstream(model, topo, node) : [];
    if (first && !list.includes(first)) list = [first].concat(list);
    return list.reverse().map((sw) => {
      const w = model.switches[sw];
      const cfg = model.relays[w.relay];
      return { sw, label: w.label || sw, cfg, group: PR.selectGroup(cfg, topo.sw[sw].up, app.siapCtx()), inst50: cfg.inst50Scheme ? app.options.busInst50 : true };
    });
  }

  function tabProtecao(app, root) {
    const model = app.model;
    const devs = pathDevices(app);
    // corrente de falta para o marcador
    let faultI = 0;
    let kind = app.chartKind || (['FT', 'FTm'].includes(app.faultCfg.type) ? 'ground' : 'phase');
    if (app.sel && app.sel.type === 'seg') {
      const topo = N.analyze(model, app.currentState());
      const fr = SC.analyzeFault(model, topo, { kind: 'segment', seg: app.sel.id, x: app.faultCfg.x, type: app.faultCfg.type, rf: app.faultCfg.rf });
      if (fr.energized) faultI = kind === 'phase' ? fr.phase : fr.residual;
    } else if (app.result && app.result.faultInfo) {
      faultI = kind === 'phase' ? app.result.faultInfo.phase : app.result.faultInfo.residual;
    }
    const kindToggle = el('div', { class: 'seg-toggle', role: 'group', 'aria-label': 'Grandeza do coordenograma' },
      el('button', { type: 'button', 'aria-pressed': kind === 'phase' ? 'true' : 'false', onclick: () => { app.chartKind = 'phase'; app.renderPanel(); } }, 'Fase'),
      el('button', { type: 'button', 'aria-pressed': kind === 'ground' ? 'true' : 'false', onclick: () => { app.chartKind = 'ground'; app.renderPanel(); } }, 'Neutro'));
    const chart = el('div', { class: 'chart' });
    const legend = el('div', { class: 'row small' });
    root.append(el('div', { class: 'stack' },
      el('span', { class: 'eyebrow', text: 'Coordenograma do caminho selecionado' }),
      el('div', { class: 'row' }, kindToggle,
        el('span', { class: 'small muted', text: faultI > 0 ? `marcador: falta de ${fmt.amp(faultI)}` : 'selecione um trecho para marcar a corrente de falta' })),
      chart, legend));
    if (devs.length) {
      SH.ui.charts.coordinogram(chart, devs, { kind, faultI, Mmax: app.options.Mmax });
      devs.forEach((d, i) => legend.append(el('span', { class: 'chip', style: { color: SH.ui.charts.CURVE_COLORS[i % 6], borderColor: SH.ui.charts.CURVE_COLORS[i % 6] }, text: d.label })));
    } else {
      chart.append(el('p', { class: 'muted small', text: 'Nenhum dispositivo de proteção energizado no caminho.' }));
    }

    // tabela de ajustes
    const snap = app.currentSnap();
    const rows = Object.values(model.switches).filter((w) => w.relay).map((w) => {
      const cfg = model.relays[w.relay];
      const r = snap.relay[w.relay];
      const g = cfg.groups.find((x) => x.id === (r && r.group)) || cfg.groups[0];
      const P = g.phase || {};
      const Ng = g.ground || {};
      const tr = el('tr', { class: `clickable ${app.editRelay === w.relay ? 'active' : ''}`, onclick: () => { app.editRelay = app.editRelay === w.relay ? null : w.relay; app.renderPanel(); } },
        el('td', { class: 'l' }, w.label || w.id, cfg.assumed ? el('span', { class: 'ref', text: 'assumido' }) : null,
          cfg.origin === 'planilha' ? el('span', { class: 'ref', title: cfg.ref || '', text: 'planilha' }) : null,
          app.edited[w.relay] ? el('span', { class: 'ref', text: 'editado' }) : null),
        el('td', { text: String(cfg.rtc) }),
        el('td', { text: ((c) => (typeof c === 'string' ? c : PR.cycleLabel(c)))(PR.cycleOf(cfg, g)) }),
        el('td', { text: `${fmt.num(P.pickup, P.pickup % 1 ? 1 : 0)} / ${fmt.num(P.dial, 2)} ${P.curve || ''}` }),
        el('td', { text: P.inst ? `${fmt.num(P.inst, 0)} / ${fmt.num((P.instDelay || 0) * 1000, 0)}` : '-' }),
        el('td', { text: `${fmt.num(Ng.pickup, Ng.pickup % 1 ? 1 : 0)} / ${fmt.num(Ng.dial, 2)}` }),
        el('td', { text: Ng.inst ? `${fmt.num(Ng.inst, 0)} / ${fmt.num((Ng.instDelay || 0) * 1000, 0)}` : '-' }),
        el('td', { text: cfg.groups.length > 1 ? g.id : '' }));
      return tr;
    });
    const sets = model.scn.settingsSets || {};
    const setIds = Object.keys(sets);
    const setToggle = setIds.length ? el('div', { class: 'seg-toggle', role: 'group', 'aria-label': 'Conjunto de ajustes' },
      el('button', { type: 'button', 'aria-pressed': app.settingsSet === 'base' ? 'true' : 'false', onclick: () => app.setSettingsSet('base') }, 'Tab. 4.13 (base)'),
      ...setIds.map((k) => el('button', { type: 'button', 'aria-pressed': app.settingsSet === k ? 'true' : 'false', onclick: () => app.setSettingsSet(k) }, `${sets[k].name.split(' (')[0]} (extra)`))) : null;
    root.append(el('div', { class: 'stack' },
      el('span', { class: 'eyebrow', text: `Ajustes: ${app.settingsSetLabel()}` }),
      setToggle,
      setIds.length && app.settingsSet !== 'base' && sets[app.settingsSet] ? el('div', { class: 'callout warn', text: `Conjunto extra, para comparação: ${sets[app.settingsSet].note}` }) : null,
      el('p', { class: 'small muted', text: '51: pickup (A) / dial e curva; 50: pickup (A) / atraso (ms). Clique em uma linha para editar o grupo ativo. "planilha": relé fora da Tab. 4.13, com ajustes da planilha de cálculos do autor.' }),
      el('div', { class: 'table-wrap' }, el('table', {},
        el('thead', {}, el('tr', {}, ['Relé', 'RTC', 'Ciclo', '51P', '50P', '51N', '50N', 'Grupo'].map((h, i) => el('th', { class: i === 0 ? 'l' : '', text: h })))),
        el('tbody', {}, rows)))));
    if (app.editRelay) root.append(editForm(app, app.editRelay));
    if (model.scn.coordination && SH.coordination) root.append(criteriaSection(app));

    // parâmetros da simulação
    const o = app.options;
    const num = (id, label, val, step, onv) => {
      const inp = el('input', { type: 'number', id, step, value: val, style: { width: '100%' } });
      inp.addEventListener('change', () => { const v = Number(inp.value); if (isFinite(v)) onv(v); });
      return el('label', { class: 'field', for: id }, el('span', { text: label }), inp);
    };
    const chkV = el('input', { type: 'checkbox', id: 'optVolt', checked: o.checkVoltage ? true : null });
    chkV.addEventListener('change', () => { o.checkVoltage = chkV.checked; app.saveOptions(); });
    root.append(el('div', { class: 'stack' },
      el('span', { class: 'eyebrow', text: 'Parâmetros da simulação' }),
      el('div', { class: 'grid2' },
        num('optBrk', 'Abertura do disjuntor (ms)', o.breakerTime * 1000, 1, (v) => { o.breakerTime = v / 1000; app.saveOptions(); }),
        num('optProc', 'Processamento do relé, 50 e 50BF (ms)', (o.relayDelay || 0) * 1000, 1, (v) => { o.relayDelay = Math.max(0, v) / 1000; app.saveOptions(); }),
        num('optMmax', 'Múltiplo máximo da curva', o.Mmax, 1, (v) => { o.Mmax = v; app.saveOptions(); app.renderPanel(); }),
        num('optSraD', 'Decisão do SRA (s)', o.sraDelay, 0.5, (v) => { o.sraDelay = v; app.saveOptions(); }),
        num('optSraS', 'Intervalo entre manobras (s)', o.sraStep, 0.5, (v) => { o.sraStep = v; app.saveOptions(); }),
        num('optPf', 'Fator de potência da carga', o.pf, 0.01, (v) => { o.pf = v; app.saveOptions(); }),
        num('optVmin', 'Tensão mínima (pu)', o.vmin, 0.01, (v) => { o.vmin = v; app.saveOptions(); })),
      el('label', { class: 'switch', for: 'optVolt' }, chkV, 'Exigir tensão mínima na recomposição'),
      el('button', { type: 'button', class: 'btn', onclick: () => app.resetSettings() }, 'Restaurar ajustes e parâmetros originais')));
  }

  // Verificação dos critérios de coordenação e sensibilidade (seção 4.7.1 do TCC)
  function criteriaSection(app) {
    const o = app.options;
    const res = SH.coordination.check(app.model, { sl: o.sl, slBlocks51: o.sl && o.slBlocks51, backupAdder: o.backupAdder, busInst50: o.busInst50, breakerTime: o.breakerTime, Mmax: o.Mmax });
    const bad = res.pairs.filter((p) => p.status !== 'ok');
    const nDes = bad.filter((p) => p.status === 'descoordenado').length;
    const sensBad = res.sensitivity.filter((x) => !x.okPhase || !x.okGround);
    const showAll = !!app.critAll;
    const list = showAll ? res.pairs : bad;
    const lbl = (d) => app.swLabel(d);
    const elName = (e) => ({ P50: '50P', P51: '51P', N50: '50N', N51: '51N', B51: '51 ret.' }[e] || e);
    return el('div', { class: 'stack' },
      el('span', { class: 'eyebrow', text: 'Critérios de coordenação e sensibilidade (seção 4.7.1)' }),
      el('p', { class: 'small' }, `Cadeias de alcance máximo da Fig. 4.6, esquema ${app.schemeLabel()}. `,
        el('strong', { text: `${nDes} par(es) descoordenado(s)` }), `, ${bad.length - nDes} abaixo do critério de margem e ${sensBad.length} relé(s) abaixo do múltiplo mínimo.`),
      el('p', { class: 'small muted', text: 'Margem = tempo do montante − tempo do jusante, com a falta na barra do relé a jusante e no fim da zona dele. Descoordenado: margem menor que a abertura do disjuntor. Critério: 0,4 s entre a proteção geral de barra e os alimentadores (Tab. 4.9) e 0,3 s ao longo dos alimentadores. Com seletividade lógica, o 50 do montante é considerado bloqueado pelo GOOSE.' }),
      el('div', { class: 'table-wrap' }, el('table', {},
        el('thead', {}, el('tr', {}, ['Par e falta', 'Jus.', 'Mont.', 'Margem'].map((h, i) => el('th', { class: i === 0 ? 'l' : '', text: h })))),
        el('tbody', {}, list.map((p) => el('tr', {},
          el('td', { class: 'l', style: { whiteSpace: 'normal' } }, `${lbl(p.up)} → ${lbl(p.down)}`, el('br'),
            el('span', { class: 'small muted', text: `${p.where}, ${p.fault} ${fmt.num(p.I, 0)} A` })),
          el('td', { style: { whiteSpace: 'normal' }, text: `${fmt.num(p.tDown * 1000, 0)} ${elName(p.elDown)}` }),
          el('td', { style: { whiteSpace: 'normal' }, text: isFinite(p.tUp) ? `${fmt.num(p.tUp * 1000, 0)} ${elName(p.elUp)}` : 'não atua' }),
          el('td', { style: { whiteSpace: 'normal', color: p.status === 'descoordenado' ? 'var(--crit)' : p.status === 'ok' ? 'var(--ok)' : 'var(--warn)' } },
            isFinite(p.margin) ? fmt.num(p.margin * 1000, 0) : '-', el('br'), el('span', { class: 'small', text: { descoordenado: 'descoord.', 'abaixo do critério': 'abaixo', ok: 'ok' }[p.status] }))))))),
      el('p', { class: 'small muted', text: 'Tempos e margens em ms.' }),
      el('button', { type: 'button', class: 'btn', onclick: () => { app.critAll = !showAll; app.renderPanel(); } }, showAll ? 'Mostrar só os pares fora do critério' : 'Mostrar todos os pares'),
      el('div', { class: 'table-wrap' }, el('table', {},
        el('thead', {}, el('tr', {}, ['Relé e barra remota', 'M fase', 'M neutro', '51P na barra'].map((h, i) => el('th', { class: i < 1 ? 'l' : '', text: h })))),
        el('tbody', {}, res.sensitivity.map((x) => el('tr', {},
          el('td', { class: 'l', style: { whiteSpace: 'normal' } }, lbl(x.dev), el('br'), el('span', { class: 'small muted', text: x.remote })),
          el('td', { style: { color: x.okPhase ? null : 'var(--crit)' }, text: x.mPhase != null ? fmt.num(x.mPhase, 2) : '-' }),
          el('td', { style: { color: x.okGround ? null : 'var(--crit)' }, text: x.mGround != null ? fmt.num(x.mGround, 1) : '-' }),
          el('td', { style: { whiteSpace: 'normal' }, text: x.t51P != null ? `${fmt.num(x.t51P * 1000, 0)} (alvo ${fmt.num(x.t51Target * 1000, 0)})` : '-' })))))),
      el('p', { class: 'small muted', text: 'Múltiplo mínimo: 2,4 na fase (curto bifásico) e 4,0 no neutro (curto fase-terra) na primeira barra remota. 51P na barra: tempo da curva com falta trifásica na barra do próprio relé, em ms; o alvo é 200 ms nos religadores da SE (Tab. 4.11) e 100 ms ao longo do alimentador (Tab. 4.12). Os religadores de linha com dial 0,05 já estão no mínimo do relé.' }));
  }

  function editForm(app, relayId) {
    const cfg = app.model.relays[relayId];
    const snap = app.currentSnap();
    const r = snap.relay[relayId];
    const gi = Math.max(0, cfg.groups.findIndex((x) => x.id === (r && r.group)));
    const g = cfg.groups[gi];
    const fields = [];
    const mk = (part, key, label, step) => {
      const id = `ed_${part}_${key}`;
      const s = g[part] || {};
      let input;
      if (key === 'curve') {
        input = el('select', { id }, Object.keys(PR.CURVES).filter((k) => k !== 'VI').map((k) => el('option', { value: k, selected: (s.curve === 'VI' ? 'MI' : s.curve) === k ? true : null, text: k.replace('_', ' ') })));
      } else {
        const v = key === 'instDelay' ? (s[key] || 0) * 1000 : s[key];
        input = el('input', { type: 'number', id, step, value: v == null ? '' : v, style: { width: '100%' } });
      }
      fields.push({ part, key, input });
      return el('label', { class: 'field', for: id }, el('span', { text: label }), input);
    };
    const cycV = PR.cycleOf(cfg, g);
    const deadV = PR.deadOf(cfg, g);
    const cyc = el('input', { type: 'text', id: 'ed_cycle', value: typeof cycV === 'string' ? cycV : PR.cycleLabel(cycV), style: { width: '100%' } });
    const dead = el('input', { type: 'number', id: 'ed_dead', step: 0.5, value: Array.isArray(deadV) ? deadV[0] : deadV, style: { width: '100%' } });
    const box = el('div', { class: 'stack card', style: { padding: '10px' } },
      el('h3', { text: `Editar ${app.model.switches[relayId] ? (app.model.switches[relayId].label || relayId) : relayId} · ${g.name}` }),
      el('div', { class: 'grid2' },
        mk('phase', 'pickup', '51P pickup (A)', 1), mk('phase', 'dial', '51P dial', 0.01),
        mk('phase', 'curve', '51P curva'), mk('phase', 'inst', '50P pickup (A)', 1),
        mk('phase', 'instDelay', '50P atraso (ms)', 1), el('span'),
        mk('ground', 'pickup', '51N pickup (A)', 1), mk('ground', 'dial', '51N dial', 0.01),
        mk('ground', 'curve', '51N curva'), mk('ground', 'inst', '50N pickup (A)', 1),
        mk('ground', 'instDelay', '50N atraso (ms)', 1), el('span'),
        el('label', { class: 'field', for: 'ed_cycle' }, el('span', { text: 'Ciclo (ex.: 1I+2T)' }), cyc),
        el('label', { class: 'field', for: 'ed_dead' }, el('span', { text: 'Tempo morto (s)' }), dead)),
      el('div', { class: 'row' },
        el('button', {
          type: 'button', class: 'btn primary', onclick: () => {
            const ng = JSON.parse(JSON.stringify(g));
            fields.forEach(({ part, key, input }) => {
              ng[part] = ng[part] || {};
              if (key === 'curve') ng[part].curve = input.value;
              else if (input.value !== '') ng[part][key] = key === 'instDelay' ? Number(input.value) / 1000 : Number(input.value);
            });
            app.updateRelay(relayId, gi, ng, cyc.value.trim(), Number(dead.value));
          },
        }, 'Aplicar ajustes'),
        el('button', { type: 'button', class: 'btn', onclick: () => { app.editRelay = null; app.renderPanel(); } }, 'Fechar')));
    return box;
  }

  // ------------------------------------------------------------------ IEC 61850
  function tabIec(app, root) {
    const o = app.options;
    const sw = (id, label, key, desc) => {
      const inp = el('input', { type: 'checkbox', id, checked: o[key] ? true : null });
      inp.addEventListener('change', () => { o[key] = inp.checked; app.optionsChanged(); });
      return el('div', { class: 'stack', style: { gap: '2px' } }, el('label', { class: 'switch', for: id }, inp, label), desc ? el('p', { class: 'small muted', text: desc }) : null);
    };
    const loss = el('select', { id: 'gooseLoss' },
      [['', 'nenhuma'], ['all', 'todas as mensagens'], ['SL', 'só bloqueio (SL)'], ['BF', 'só trip por 50BF']].map(([v, t]) => el('option', { value: v, selected: (o.commFail || '') === v ? true : null, text: t })));
    loss.addEventListener('change', () => { o.commFail = loss.value || false; app.optionsChanged(); });
    const numIn = (id, label, val, step, onv) => {
      const inp = el('input', { type: 'number', id, step, value: val, style: { width: '100%' } });
      inp.addEventListener('change', () => { const v = Number(inp.value); if (isFinite(v)) { onv(v); app.optionsChanged(); } });
      return el('label', { class: 'field', for: id }, el('span', { text: label }), inp);
    };
    root.append(el('div', { class: 'stack' },
      el('span', { class: 'eyebrow', text: 'Funções distribuídas via GOOSE (TCC, Cap. 3 e 5)' }),
      sw('iecSL', 'Seletividade lógica', 'sl', 'O relé sensibilizado envia GOOSE (pick-up de 50P/51P/50N/51N) e bloqueia o instantâneo do relé a montante (torque control "NOT (VB004 OR VB005)").'),
      sw('iecBF', 'Falha de disjuntor (50BF) com trip remoto', 'bf', 'Se a corrente persiste por BFD após o trip, o relé envia GOOSE de trip ao relé a montante (REMTRIP).'),
      sw('iecBus', 'Instantâneo da proteção de barramento habilitado', 'busInst50', 'No esquema convencional o 50/50N de AQZ_MT fica bloqueado; com seletividade lógica pode ser habilitado (Tab. 4.13).'),
      sw('iec51', 'Estender o bloqueio ao 51 com 51 de retaguarda', 'slBlocks51', 'Solução da seção 5.7.3: o 51 também é bloqueado e uma 51 de retaguarda com somador garante a proteção se o 50BF falhar.'),
      sw('iecQual', 'Supervisão da qualidade da mensagem (Fig. 3.8)', 'slQuality', 'Se as mensagens de bloqueio se perdem, o relé que as recebe inibe o próprio 50 e atua pela curva 51. Nos ensaios do Cap. 5 a qualidade não foi verificada.'),
      el('div', { class: 'grid2' },
        numIn('iecBfd', 'BFD (ms)', o.bfd * 1000, 10, (v) => { o.bfd = v / 1000; }),
        numIn('iecLat', 'Latência GOOSE (ms)', o.gooseLatency * 1000, 1, (v) => { o.gooseLatency = v / 1000; }),
        numIn('iecAdd', 'Somador da retaguarda (ms)', o.backupAdder * 1000, 10, (v) => { o.backupAdder = v / 1000; }),
        el('label', { class: 'field', for: 'gooseLoss' }, el('span', { text: 'Perda de mensagens' }), loss))));

    // datasets (Tabela 5.1, generalizada)
    const ds = [
      ['SL_<relé>', 'PRO.P1TPIOC1 / P1TPTOC13', 'Str.general', '50P1P / 51P1P', 'pick-up de fase'],
      ['SL_<relé>', 'PRO.N1TPIOC5 / N1TPTOC15', 'Str.general', '50N1P / 51N1P', 'pick-up de neutro'],
      ['Trip_50BF_<relé>', 'PRO.BFR1RBRF1', 'OpEx.general', 'BFT', 'trip por falha de disjuntor'],
      ['Trip_<relé>', 'PRO.TRIPPTRC1', 'Tr.general', 'TRIP', 'trip do próprio IED'],
      ['Close_<relé>', 'ANN.LTGGIO5', 'Ind05.stVal', 'CLOSE', 'comando de fechamento'],
    ];
    root.append(el('div', { class: 'stack' },
      el('span', { class: 'eyebrow', text: 'Datasets GOOSE (Tab. 5.1 do TCC)' }),
      el('div', { class: 'table-wrap' }, el('table', {},
        el('thead', {}, el('tr', {}, ['Dataset (CFG.LLN0)', 'Nó lógico', 'Atributo', 'Relay Word Bit', 'Uso'].map((h) => el('th', { class: 'l', text: h })))),
        el('tbody', {}, ds.map((r) => el('tr', {}, r.map((c) => el('td', { class: 'l', text: c }))))))),
      el('p', { class: 'small muted', text: 'Nós lógicos: PIOC (sobrecorrente instantânea), PTOC (temporizada), RBRF (falha de disjuntor), PTRC (condicionamento do trip), GGIO (E/S genérica). Max. Time das mensagens no ensaio: 1000 ms.' })));

    const res = app.result;
    if (res && !res.idle && res.goose.length) {
      root.append(el('div', { class: 'stack' },
        el('span', { class: 'eyebrow', text: `Mensagens da última simulação (${res.goose.length})` }),
        el('div', { class: 'table-wrap' }, el('table', {},
          el('thead', {}, el('tr', {}, ['t', 'De → para', 'Dataset', 'Valor', 'Status'].map((h, i) => el('th', { class: i ? 'l' : '', text: h })))),
          el('tbody', {}, res.goose.map((g) => el('tr', { class: 'clickable', onclick: () => app.seek(g.tSend) },
            el('td', { text: fmt.evt(g.tSend) }),
            el('td', { class: 'l', text: `${app.swLabel(g.from)} → ${app.swLabel(g.to)}` }),
            el('td', { class: 'l', text: g.dataset }),
            el('td', { class: 'l', text: g.value ? '1' : '0' }),
            el('td', { class: 'l', text: g.lost ? 'perdida' : `entregue em ${fmt.ms((g.tRecv - g.tSend) * 1000)}` }))))))));
    }
  }

  // ------------------------------------------------------------------ Ensaios
  function tabEnsaios(app, root) {
    root.append(el('div', { class: 'stack' },
      el('span', { class: 'eyebrow', text: 'Reprodução dos ensaios do Capítulo 5' }),
      el('p', { class: 'small muted', text: 'Ajustes do alimentador 21I5 (Tab. 4.13). Nomenclatura do TCC: AQZ_MT = 01Z2, AQZ = 21I5, RL1 = RS4, RL2 = RL3. Cada ensaio usa a sua própria configuração, sem alterar o esquema escolhido na barra superior.' }),
      app.scnId !== 'tcc2015' ? el('div', { class: 'callout warn', text: 'Os ensaios usam a rede da Fig. 4.2; executar um deles troca a topologia exibida.' }) : null));
    // 5.5: curvas dos relés contra os pontos I x t do Apêndice A
    root.append(el('h3', { text: '5.5 Sobrecorrente (Apêndice A)' }));
    const ocOpen = !!app.ocOpen;
    const ocCard = el('div', { class: 'test-card' },
      el('header', {}, el('div', {}, el('h3', { text: 'Pontos I × t dos quatro relés ensaiados' }), el('span', { class: 'ref', text: 'Seção 5.5, Apêndice A' })),
        el('button', { type: 'button', class: 'btn', onclick: () => { app.ocOpen = !ocOpen; app.renderPanel(); } }, ocOpen ? 'Ocultar' : 'Mostrar')),
      el('p', { class: 'small', text: 'Tempos em ms. Falta trifásica injetada com o programa Manual da mala. O simulado usa as mesmas equações do motor (curva IEC e tempo definido com o processamento de 13 ms) e os ajustes secundários do relé ensaiado.' }));
    if (ocOpen) {
      SH.labs.overcurrent.forEach((r) => {
        const st = r.set;
        ocCard.append(el('p', { class: 'small', style: { margin: '10px 0 4px' } }, el('strong', { text: `${r.id} (${app.swLabel(r.dev)})` }),
          ` · ${st.curve === 'NI' ? 'IEC NI' : 'IEC MI'}, dial ${fmt.num(st.dial, 2)}, pickup ${fmt.num(st.pickup, 2)} A; 50 em ${fmt.num(st.inst, 2)} A com ${fmt.ms(st.instDelay * 1000, 0)} · ${r.ref}`));
        ocCard.append(el('div', { class: 'table-wrap' }, el('table', {},
          el('thead', {}, el('tr', {}, ['I (A)', 'El.', 'Medido', 'Simul.', 'Dif.', 'Mala'].map((h) => el('th', { text: h })))),
          el('tbody', {}, r.points.map(([I, t, status]) => {
            const sim = SH.labs.overcurrentTime(st, I);
            return el('tr', {}, el('td', { text: fmt.num(I, 1) }), el('td', { text: sim.el }), el('td', { text: fmt.num(t * 1000, 1) }),
              el('td', { text: fmt.num(sim.t * 1000, 1) }), el('td', { text: `${sim.t - t >= 0 ? '+' : ''}${fmt.num((sim.t - t) * 1000, 1)}` }), el('td', { text: status }));
          })))));
      });
      ocCard.append(el('p', { class: 'small muted', text: SH.labs.OVERCURRENT_NOTE }));
    }
    root.append(ocCard);
    let group = null;
    SH.labs.tests.forEach((t) => {
      if (t.group !== group) { group = t.group; root.append(el('h3', { text: group })); }
      const ran = app.lastTest && app.lastTest.id === t.id ? app.lastTest : null;
      const card = el('div', { class: `test-card ${ran ? 'ran' : ''}`, id: `test-${t.id}` },
        el('header', {}, el('div', {}, el('h3', { text: t.title }), el('span', { class: 'ref', text: t.ref })),
          el('button', { type: 'button', class: 'btn primary', onclick: () => app.runTest(t) }, ran ? 'Repetir' : 'Executar')),
        el('p', { class: 'small', text: t.description }),
        t.note ? el('p', { class: 'small muted', text: t.note }) : null);
      if (ran) {
        card.append(el('div', { class: 'table-wrap' }, el('table', {},
          el('thead', {}, el('tr', {}, el('th', { class: 'l', text: 'Medida' }), el('th', { class: 'l', text: 'TCC' }), el('th', { text: 'Medido' }), el('th', { text: 'Simulado' }))),
          el('tbody', {}, t.measures.map((m, i) => {
            const v = ran.values[i];
            const fv = (x) => (m.unit === 'ms' ? fmt.ms(x, 1) : m.unit === 's' ? fmt.sec(x, 2) : fmt.num(x, 0));
            const txt = typeof v === 'number' ? fv(v) : (v == null ? '-' : String(v));
            const meas = typeof m.lab === 'number' ? fv(m.lab) : (m.labText || '-');
            return el('tr', {}, el('td', { class: 'l', style: { whiteSpace: 'normal' }, text: m.label }), el('td', { class: 'l', text: m.tcc }), el('td', { style: typeof m.lab === 'number' ? null : { whiteSpace: 'normal' }, text: meas }), el('td', { text: txt }));
          })))));
      }
      root.append(card);
    });
    root.append(el('p', { class: 'small muted', text: `"Medido" vem dos relatórios da mala CE-6006 (instantes dos GOOSEs). Os ensaios usam os ajustes do relé ensaiado quando diferem da Tab. 4.13 e um tempo de processamento de ${fmt.num(SH.labs.LAB_DELAY * 1000, 0)} ms nos elementos 50 e no 50BF, calibrado nesses relatórios. ${SH.labs.CLEAR_NOTE}` }));
  }

  // ------------------------------------------------------------------ Fontes
  function tabFontes(app, root) {
    const scn = app.model.scn;
    root.append(el('div', { class: 'stack' },
      el('span', { class: 'eyebrow', text: 'Topologia exibida' }),
      el('h2', { text: scn.longName }),
      el('p', { class: 'small', text: `Dados: ${scn.reference}.` })));
    const prem = scn.notes.filter((n) => n.kind === 'premissa');
    const div = scn.notes.filter((n) => n.kind === 'divergencia');
    root.append(el('div', { class: 'stack' }, el('span', { class: 'eyebrow', text: 'Premissas do simulador' }),
      el('ul', { class: 'small', style: { margin: 0, paddingLeft: '18px' } }, prem.map((n) => el('li', { text: n.text })))));
    root.append(el('div', { class: 'stack' }, el('span', { class: 'eyebrow', text: 'Divergências encontradas nas fontes' }),
      el('ul', { class: 'small', style: { margin: 0, paddingLeft: '18px' } }, div.map((n) => el('li', { text: n.text })))));
    root.append(el('div', { class: 'stack' }, el('span', { class: 'eyebrow', text: 'Modelagem' }),
      el('ul', { class: 'small', style: { margin: 0, paddingLeft: '18px' } },
        el('li', { text: 'Curto-circuito por componentes simétricas com impedâncias série acumuladas (rede radial), base 100 MVA / 13,8 kV, tensão pré-falta 1,0 pu.' }),
        el('li', { text: 'Curvas IEC (NI, MI, EI) com múltiplo limitado a 30; elementos 50 de tempo definido; 51 integrado no tempo (disco de indução) com rearme instantâneo.' }),
        el('li', { text: 'Religamento por tentativa: "I" habilita o 50/50N na operação; o número de religamentos é o número de operações menos um.' }),
        el('li', { text: 'GOOSE com latência fixa (3 ms, classe TT6 da IEC 61850-5); disjuntores com tempo de interrupção fixo (50 ms).' }),
        el('li', { text: 'SRA: localização pelo relé mais a jusante que partiu, isolamento da zona e restauração pela alternativa que recompõe mais carga sem violar ampacidade nem o pickup de fase.' }))));
    root.append(el('div', { class: 'stack' }, el('span', { class: 'eyebrow', text: 'Referências' }),
      el('ul', { class: 'small', style: { margin: 0, paddingLeft: '18px' } },
        el('li', { text: 'RODRIGUES, M. S. de L. Teste e validação das funções de proteção baseadas na norma IEC 61850 propostas para implantação no projeto piloto da rede de distribuição inteligente de Aquiraz. TCC (Eng. Elétrica), UFC, 2015.' }),
        el('li', { text: 'NOBRE, F. W. de M. Estudo para a definição dos grupos de ajuste da proteção da rede de distribuição Aquiraz. TCC (Eng. Elétrica), UFC, 2013.' }),
        el('li', { text: 'VIEIRA, R. B. Estudo das proteções para implantação no projeto piloto de redes inteligentes da Companhia Energética do Ceará em Aquiraz. TCC (Eng. Elétrica), UFC, 2015 (citado no TCC como Vieira, 2015; usado como confirmação qualitativa da recomposição).' }),
        el('li', { text: 'IEC 61850-5 e IEC 61850-8-1 (GOOSE); IEC 60255-151 (curvas de tempo inverso).' }))),
      el('p', { class: 'small muted', text: 'Metodologia e validação detalhadas: pasta docs/ do repositório.' }));
  }

  const RENDER = { falta: tabFalta, eventos: tabEventos, analises: tabAnalises, protecao: tabProtecao, iec: tabIec, ensaios: tabEnsaios, fontes: tabFontes };
  SH.ui.panels = { TABS, RENDER, pathDevices };
})(typeof window !== 'undefined' ? window : globalThis);
