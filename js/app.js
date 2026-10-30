/*
 * Controlador da interface: estado da aplicação, reprodução animada da
 * simulação e ligação entre diagrama, painéis e simulador.
 */
(function () {
  'use strict';
  const SH = window.SH;
  const N = SH.network;
  const { el, fmt } = SH.ui;
  const $ = (id) => document.getElementById(id);
  const OPT_KEY = 'aqz-sh-options-v1';

  const app = {
    scnId: null,
    model: null,
    options: null,
    stuck: new Set(),
    sel: null,
    faultCfg: { x: 0.5, type: '3F', rf: 0, temporary: false },
    tab: 'falta',
    result: null,
    cause: null,
    edited: {},
    editRelay: null,
    lastTest: null,
    logMinor: false,
    logHidePick: false,
    chartKind: null,
    showCurrents: false,
    pt: 0,
    diagram: null,
  };

  // ------------------------------------------------------------- opções
  function defaultOptions() {
    return Object.assign({}, SH.simulator.DEFAULTS, { sl: false, bf: false, busInst50: false, sra: true });
  }
  function loadOptions() {
    const saved = SH.ui.storeGet(OPT_KEY, null);
    app.options = Object.assign(defaultOptions(), saved || {});
  }
  app.saveOptions = () => {
    const o = app.options;
    SH.ui.storeSet(OPT_KEY, {
      sl: o.sl, bf: o.bf, busInst50: o.busInst50, slBlocks51: o.slBlocks51, commFail: o.commFail, sra: o.sra,
      breakerTime: o.breakerTime, gooseLatency: o.gooseLatency, bfd: o.bfd, backupAdder: o.backupAdder, Mmax: o.Mmax,
      sraDelay: o.sraDelay, sraStep: o.sraStep, pf: o.pf, vmin: o.vmin, checkVoltage: o.checkVoltage,
    });
  };
  app.scheme = () => {
    const o = app.options;
    if (o.sl && o.bf && o.busInst50) return 'iec';
    if (!o.sl && !o.bf && !o.busInst50) return 'conv';
    return 'custom';
  };
  app.schemeLabel = () => ({ iec: 'IEC 61850 (seletividade lógica + 50BF)', conv: 'convencional', custom: 'personalizado' }[app.scheme()]);
  function setScheme(v) {
    const o = app.options;
    if (v === 'iec') Object.assign(o, { sl: true, bf: true, busInst50: true });
    else Object.assign(o, { sl: false, bf: false, busInst50: false, slBlocks51: false });
    app.optionsChanged();
  }
  app.optionsChanged = () => {
    app.saveOptions();
    syncHeader();
    app.renderPanel();
  };
  function syncHeader() {
    const s = app.scheme();
    document.querySelectorAll('#schemeToggle button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === s ? 'true' : 'false'));
    $('sraToggle').checked = !!app.options.sra;
  }

  // ------------------------------------------------------------- cenário
  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function loadScenario(id, keepPanel) {
    app.scnId = id;
    app.scnData = deepClone(SH.scenarios[id]);
    app.model = N.buildModel(app.scnData);
    app.stuck = new Set();
    app.sel = null;
    app.edited = {};
    app.editRelay = null;
    app.cause = null;
    if (app.lastTest && id !== 'tcc2015') app.lastTest = null;
    $('scnSel').value = id;
    app.diagram = SH.ui.createDiagram($('diagram'), $('tooltip'), app.model, { onSelect: (s) => app.select(s) });
    app.diagram.setShowCurrents(app.showCurrents);
    renderLegend();
    setIdle(N.normalState(app.model));
    if (!keepPanel) app.renderPanel();
    SH.ui.storeSet('aqz-sh-scn', id);
  }

  function rebuildModelKeepState() {
    const st = app.stateFromSnap(app.currentSnap());
    app.model = N.buildModel(app.scnData);
    app.diagram = SH.ui.createDiagram($('diagram'), $('tooltip'), app.model, { onSelect: (s) => app.select(s) });
    app.diagram.setShowCurrents(app.showCurrents);
    setIdle(st);
    app.diagram.setSelection(app.sel);
  }

  app.updateRelay = (relayId, gi, group, cycle, dead) => {
    const cfg = app.scnData.relays[relayId];
    cfg.groups[gi] = group;
    if (cycle) cfg.cycle = cycle;
    if (isFinite(dead) && dead > 0) cfg.deadTime = dead;
    app.edited[relayId] = true;
    rebuildModelKeepState();
    app.renderPanel();
  };
  app.resetSettings = () => {
    app.options = defaultOptions();
    app.saveOptions();
    syncHeader();
    const sel = app.sel;
    loadScenario(app.scnId, true);
    app.sel = sel;
    app.diagram.setSelection(sel);
    app.renderPanel();
  };

  // ------------------------------------------------------------- estado
  app.currentSnap = () => app.result.snaps[player.idx];
  app.stateFromSnap = (snap) => {
    const sw = {};
    Object.entries(snap.sw).forEach(([k, v]) => { sw[k] = { closed: v.closed, stuck: v.stuck, locked: v.locked }; });
    return { sw, srcOn: Object.assign({}, snap.srcOn) };
  };
  app.currentState = () => app.stateFromSnap(app.currentSnap());
  app.siapCtx = () => ({ cause: app.cause });
  app.swLabel = (id) => (app.model.switches[id] ? app.model.switches[id].label || id : id);

  function setIdle(state) {
    const res = SH.simulator.run(app.model, { state, stuck: [...app.stuck], options: app.options, cause: app.cause });
    res.idle = true;
    player.load(res, false);
  }

  function runInput(input, opts = {}) {
    if (!player.atEnd()) player.toEnd();
    const base = app.currentState();
    // a falha de abertura vem sempre da seleção visível do usuário
    Object.entries(base.sw).forEach(([id, sw]) => { sw.stuck = app.stuck.has(id); });
    const full = Object.assign({ state: base, stuck: [...app.stuck], options: app.options, cause: app.cause }, input);
    const res = SH.simulator.run(app.model, full);
    app.cause = res.siapCause;
    player.load(res, true);
    if (!opts.keepTab) app.setTab('eventos'); else app.renderPanel();
    return res;
  }

  app.applyFault = (spec, temporary) => runInput({ script: [{ t: 0, type: 'fault', spec, temporary }] });
  app.manual = (sw, action) => runInput({ script: [{ t: 0, type: action, sw }] }, { keepTab: true });
  app.sourceLoss = (id) => runInput({ script: [{ t: 0, type: 'sourceLoss', source: id }] });
  app.sourceOn = (id) => runInput({ script: [{ t: 0, type: 'sourceOn', source: id }] }, { keepTab: true });
  app.setStuck = (sw, on) => {
    if (on) app.stuck.add(sw); else app.stuck.delete(sw);
    app.result.snaps.forEach((s) => { if (s.sw[sw]) s.sw[sw].stuck = on; });
    if (app.result.finalState.sw[sw]) app.result.finalState.sw[sw].stuck = on;
    app.diagram.render(app.currentSnap());
  };
  app.reset = () => {
    app.cause = null;
    app.stuck = new Set();
    app.lastTest = null;
    setIdle(N.normalState(app.model));
    app.renderPanel();
  };

  app.runExample = (ex) => {
    if (ex.scenario !== app.scnId) loadScenario(ex.scenario, true);
    app.cause = null;
    setIdle(N.normalState(app.model));
    if (ex.fault) {
      app.faultCfg.type = ex.fault.type || '3F';
      if (ex.fault.kind === 'segment') {
        app.faultCfg.x = ex.fault.x;
        app.sel = { type: 'seg', id: ex.fault.seg, x: ex.fault.x };
      } else app.sel = { type: 'bus', id: ex.fault.node };
      app.diagram.setSelection(app.sel);
      app.applyFault(ex.fault, !!ex.temporary);
    } else if (ex.sourceLoss) {
      app.sel = null;
      app.diagram.setSelection(null);
      app.sourceLoss(ex.sourceLoss);
    }
  };

  app.runTest = (t) => {
    if (app.scnId !== 'tcc2015') loadScenario('tcc2015', true);
    app.cause = null;
    app.stuck = new Set(t.setup.stuck || []);
    const input = SH.labs.buildInput(app.model, t);
    input.options = Object.assign({}, defaultOptions(), {
      breakerTime: app.options.breakerTime, gooseLatency: app.options.gooseLatency, Mmax: app.options.Mmax,
    }, t.setup.options || {});
    const res = SH.simulator.run(app.model, input);
    res.test = t;
    app.lastTest = { id: t.id, values: t.measures.map((m) => SH.labs.measure(res, m)) };
    app.sel = t.setup.fault.kind === 'segment' ? { type: 'seg', id: t.setup.fault.seg, x: t.setup.fault.x } : null;
    app.diagram.setSelection(app.sel);
    player.load(res, true);
    app.renderPanel();
    const card = document.getElementById(`test-${t.id}`);
    if (card) card.scrollIntoView({ block: 'nearest' });
  };

  // ------------------------------------------------------------- seleção e abas
  app.select = (sel) => {
    app.sel = sel;
    if (sel && sel.type === 'seg') app.faultCfg.x = sel.x != null ? sel.x : 0.5;
    app.diagram.setSelection(sel);
    app.editRelay = sel && sel.type === 'sw' ? app.model.switches[sel.id].relay || null : app.editRelay;
    if (app.tab !== 'protecao') app.tab = 'falta';
    renderTabs();
    app.renderPanel();
  };
  app.setTab = (id) => { app.tab = id; renderTabs(); app.renderPanel(); };

  function renderTabs() {
    const nav = $('tabs');
    nav.innerHTML = '';
    SH.ui.panels.TABS.forEach((t) => {
      const b = el('button', {
        type: 'button', role: 'tab', id: `tab-${t.id}`, 'aria-selected': app.tab === t.id ? 'true' : 'false', 'aria-controls': 'tabpanel',
        onclick: () => app.setTab(t.id),
      }, t.label);
      if (t.id === 'eventos' && app.result && !app.result.idle) b.append(el('span', { class: 'badge', text: String(app.result.log.filter((e) => !e.minor).length) }));
      nav.append(b);
    });
  }

  let lastPanelTab = null;
  app.renderPanel = () => {
    const box = $('tabpanel');
    const keep = lastPanelTab === app.tab ? box.scrollTop : 0;
    box.innerHTML = '';
    box.setAttribute('aria-labelledby', `tab-${app.tab}`);
    try {
      SH.ui.panels.RENDER[app.tab](app, box);
    } catch (e) {
      box.append(el('p', { class: 'callout warn', text: `Erro ao montar o painel: ${e.message}` }));
      console.error(e);
    }
    box.scrollTop = keep;
    lastPanelTab = app.tab;
    renderTabs();
  };

  app.highlightLog = () => {
    const list = $('eventList');
    if (!list || !app.result) return;
    let nowLi = null;
    list.querySelectorAll('li').forEach((li) => {
      const t = Number(li.dataset.t);
      const fut = t > app.pt + 1e-9;
      li.classList.toggle('future', fut);
      li.classList.remove('now');
      if (!fut) nowLi = li;
    });
    if (nowLi) {
      nowLi.classList.add('now');
      if (player.playing) {
        const box = $('tabpanel');
        const r = nowLi.getBoundingClientRect();
        const b = box.getBoundingClientRect();
        if (r.bottom > b.bottom - 8 || r.top < b.top) box.scrollTop += r.top - b.top - b.height / 2;
      }
    }
  };

  // ------------------------------------------------------------- legenda e status
  function renderLegend() {
    const lg = $('legend');
    lg.innerHTML = '';
    const item = (...c) => el('span', {}, ...c);
    lg.append(
      item(el('span', { class: 'sw-dot', style: { background: 'var(--closed)' } }), 'fechado'),
      item(el('span', { class: 'sw-dot', style: { background: 'var(--open)' } }), 'aberto'),
      ...Object.values(app.model.sources).map((s) => item(el('span', { class: 'ln', style: { background: SH.ui.srcVar(s.color) } }), s.name.replace(/^SE /, ''))),
      item(el('span', { class: 'ln', style: { background: 'var(--fault)' } }), 'corrente de falta'),
      item(el('span', { class: 'ln', style: { background: 'var(--goose-sl)' } }), 'GOOSE bloqueio'),
      item(el('span', { class: 'ln', style: { background: 'var(--goose-bf)' } }), 'GOOSE 50BF'),
      item(el('span', { class: 'chip warn', text: 'BLQ' }), 'bloqueio do 79'),
    );
    const cur = el('input', { type: 'checkbox', id: 'showCur', checked: app.showCurrents ? true : null });
    cur.addEventListener('change', () => { app.showCurrents = cur.checked; app.diagram.setShowCurrents(cur.checked); });
    lg.append(el('label', { class: 'switch', for: 'showCur', style: { marginLeft: 'auto' } }, cur, 'Correntes nos trechos'));
  }

  function renderStatus() {
    const snap = app.currentSnap();
    const res = app.result;
    const sb = $('statusbar');
    sb.innerHTML = '';
    const kv = (k, v, cls) => el('span', { class: 'kv' }, el('span', { class: 'k', text: k }), el('span', { class: `num ${cls || ''}`, text: v }));
    const normal = res.idle && !app.cause && Object.entries(snap.sw).every(([id, s]) => s.closed === (app.model.switches[id].normal !== 'open')) && Object.values(snap.srcOn).every(Boolean);
    sb.append(...[
      normal ? el('span', { class: 'chip ok', text: 'Operação normal' }) : el('span', { class: 'chip warn', text: 'Rede reconfigurada' }),
      snap.fault && snap.fault.active ? el('span', { class: 'chip crit', text: 'Falta presente' }) : null,
      kv('Suprida', fmt.amp(snap.served)),
      kv('Sem suprimento', fmt.amp(snap.unserved), snap.unserved > 0 ? 'err-bad' : ''),
      res.test ? kv('Configuração', `ensaio ${res.test.ref.split(',')[0].replace('Seção ', '')}: ${res.test.title}`) : kv('Esquema', app.schemeLabel()),
      res.test ? null : kv('Self-healing', app.options.sra ? 'ligado' : 'desligado'),
    ].filter(Boolean));
    if (!normal) sb.append(el('button', { type: 'button', class: 'btn', style: { marginLeft: 'auto' }, onclick: () => app.reset() }, 'Voltar à operação normal'));
  }

  // ------------------------------------------------------------- reprodução
  const player = {
    res: null, idx: 0, playing: false, hold: 0, logPtr: 0, goosePtr: 0, tl: null, lastTs: 0,
    load(res, autoplay) {
      app.result = res;
      this.res = res;
      this.idx = 0;
      app.pt = 0;
      this.logPtr = 0;
      this.goosePtr = 0;
      this.hold = autoplay ? 0.6 : 0;
      app.diagram.clearGoose();
      app.diagram.render(res.snaps[0]);
      const evs = res.log.filter((e) => !e.minor && e.cat !== 'partida');
      this.tl = SH.ui.charts.timeline($('timeline'), evs, (t) => app.seek(t));
      $('tlInfo').textContent = res.idle ? 'sem simulação' : `${evs.length} eventos · fim em ${fmt.evt(res.endTime)}`;
      this.playing = !!autoplay && res.snaps.length > 1;
      if (!this.playing && !res.idle) this.toEnd();
      setPlayIcon();
      renderTabs();
      this.frame(true);
    },
    endT() { return Math.max(this.res.snaps[this.res.snaps.length - 1].t, this.res.endTime || 0); },
    atEnd() { return this.idx >= this.res.snaps.length - 1; },
    toEnd() {
      this.idx = this.res.snaps.length - 1;
      app.pt = Math.max(app.pt, this.endT());
      this.logPtr = this.res.log.length;
      this.goosePtr = this.res.goose.length;
      this.playing = false;
      setPlayIcon();
      app.diagram.render(this.res.snaps[this.idx]);
      this.frame(true);
    },
    seek(t) {
      this.playing = false;
      setPlayIcon();
      app.pt = t;
      let i = 0;
      while (i + 1 < this.res.snaps.length && this.res.snaps[i + 1].t <= t + 1e-9) i++;
      this.idx = i;
      this.logPtr = this.res.log.findIndex((e) => e.t > t);
      if (this.logPtr < 0) this.logPtr = this.res.log.length;
      this.goosePtr = this.res.goose.findIndex((g) => g.tSend > t);
      if (this.goosePtr < 0) this.goosePtr = this.res.goose.length;
      app.diagram.clearGoose();
      app.diagram.render(this.res.snaps[i]);
      this.frame(true);
    },
    step(dt) {
      const mode = $('speedSel').value;
      if (this.hold > 0) { this.hold -= dt; return; }
      const snaps = this.res.snaps;
      const next = this.idx + 1 < snaps.length ? snaps[this.idx + 1].t : null;
      let rate = 1;
      let hold = 0;
      if (mode !== 'real' && next != null) {
        const gap = next - app.pt;
        const slow = mode === 'slow' ? 0.08 : 0.25;
        rate = gap > 1.2 ? 6 : slow;
        hold = mode === 'slow' ? 0.7 : 0.45;
      }
      let np = app.pt + dt * rate;
      if (next != null && np >= next) { np = next; this.hold = hold; }
      app.pt = np;
    },
    frame(force) {
      const res = this.res;
      // efeitos dos eventos atravessados
      while (this.logPtr < res.log.length && res.log[this.logPtr].t <= app.pt + 1e-9) {
        const e = res.log[this.logPtr++];
        if (!force && (e.cat === 'trip' || e.cat === 'disjuntor') && e.dev) app.diagram.flash(e.dev);
      }
      while (this.goosePtr < res.goose.length && res.goose[this.goosePtr].tSend <= app.pt + 1e-9) {
        const g = res.goose[this.goosePtr++];
        if (!force) app.diagram.goose(g, $('speedSel').value === 'slow' ? 1500 : 900);
      }
      let changed = false;
      while (this.idx + 1 < res.snaps.length && res.snaps[this.idx + 1].t <= app.pt + 1e-9) { this.idx++; changed = true; }
      if (changed) app.diagram.render(res.snaps[this.idx]);
      if (this.idx >= res.snaps.length - 1 && app.pt >= this.endT()) { if (this.playing) { this.playing = false; setPlayIcon(); } }
      $('clock').textContent = `t = ${app.pt < 10 ? fmt.num(app.pt, 3) : fmt.num(app.pt, 2)} s`;
      app.diagram.updateCountdowns(res.snaps[this.idx], app.pt);
      if (this.tl) this.tl.update(app.pt);
      if (changed || force) {
        renderStatus();
        if (app.tab === 'eventos') app.highlightLog();
        else if (changed && (app.tab === 'analises' || (app.tab === 'falta' && app.sel && app.sel.type !== 'seg'))) app.renderPanel();
      } else if (app.tab === 'eventos' && this.playing) {
        app.highlightLog();
      }
    },
  };
  app.seek = (t) => player.seek(t);

  function setPlayIcon() {
    const b = $('btnPlay');
    b.innerHTML = player.playing
      ? '<svg viewBox="0 0 16 16"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>'
      : '<svg viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z"/></svg>';
  }

  function loop(ts) {
    const dt = player.lastTs ? Math.min(0.1, (ts - player.lastTs) / 1000) : 0;
    player.lastTs = ts;
    if (player.res && player.playing) {
      player.step(dt);
      player.frame(false);
    }
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------- inicialização
  function init() {
    loadOptions();
    const scnSel = $('scnSel');
    Object.values(SH.scenarios).forEach((s) => scnSel.append(el('option', { value: s.id, text: s.name })));
    scnSel.addEventListener('change', () => loadScenario(scnSel.value));
    document.querySelectorAll('#schemeToggle button').forEach((b) => b.addEventListener('click', () => setScheme(b.dataset.v)));
    $('sraToggle').addEventListener('change', (e) => { app.options.sra = e.target.checked; app.optionsChanged(); });
    $('btnReset').addEventListener('click', () => app.reset());
    $('btnPlay').addEventListener('click', () => {
      if (!player.res || player.res.idle) return;
      if (player.playing) { player.playing = false; } else {
        if (app.pt >= player.endT()) player.seek(0);
        player.playing = true;
        player.hold = 0.3;
      }
      setPlayIcon();
    });
    $('btnEnd').addEventListener('click', () => player.toEnd());
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, select, textarea, button')) return;
      if (e.code === 'Space') { e.preventDefault(); $('btnPlay').click(); }
      if (e.key === 'Escape') app.select(null);
    });
    syncHeader();
    const startScn = SH.ui.storeGet('aqz-sh-scn', 'tcc2015');
    loadScenario(SH.scenarios[startScn] ? startScn : 'tcc2015');
    requestAnimationFrame(loop);
    window.AQZ = app; // acesso pelo console do navegador
  }

  init();
})();
