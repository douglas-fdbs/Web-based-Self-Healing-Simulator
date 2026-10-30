/*
 * Gráficos em SVG: coordenograma tempo × corrente (escala log-log, como as
 * Figs. 4.9 a 4.13 do TCC) e linha do tempo da sequência de eventos.
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});
  const { svg, fmt } = SH.ui;
  const PR = SH.protection;

  // cores na ordem usada nos coordenogramas do TCC (vermelho, azul, cinza, magenta)
  const CURVE_COLORS = ['#d32f2f', '#1e63c6', '#8a949a', '#c026d3', '#0f9d6b', '#b7791f', '#0a9fb3'];

  /**
   * devices: [{ label, group, inst50 }] de montante para jusante.
   * opts: { kind: 'phase'|'ground', faultI, Mmax }
   */
  function coordinogram(container, devices, opts) {
    container.innerHTML = '';
    const W = 380;
    const H = 300;
    const m = { l: 44, r: 10, t: 12, b: 34 };
    const kind = opts.kind || 'phase';
    const settings = devices.map((d) => (kind === 'phase' ? d.group.phase : d.group.ground)).filter(Boolean);
    const minPk = Math.min(...settings.map((s) => s.pickup || 1e9));
    const maxInst = Math.max(...settings.map((s) => s.inst || 0));
    const xmin = opts.xmin || Math.pow(10, Math.floor(Math.log10(Math.max(1, minPk * 0.6))));
    const xmax = opts.xmax || Math.pow(10, Math.ceil(Math.log10(Math.max(opts.faultI || 0, maxInst, minPk * 20) * 1.6)));
    const ymin = 0.01;
    const ymax = 100;
    const X = (I) => m.l + ((Math.log10(I) - Math.log10(xmin)) / (Math.log10(xmax) - Math.log10(xmin))) * (W - m.l - m.r);
    const Y = (t) => m.t + (1 - (Math.log10(t) - Math.log10(ymin)) / (Math.log10(ymax) - Math.log10(ymin))) * (H - m.t - m.b);

    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Coordenograma de ${kind === 'phase' ? 'fase' : 'neutro'}` });
    // grade
    for (let e = Math.log10(xmin); e <= Math.log10(xmax) + 1e-9; e++) {
      for (let k = 1; k < 10; k++) {
        const I = k * Math.pow(10, e);
        if (I > xmax * 1.0001) break;
        root.append(svg('line', { class: k === 1 ? 'ax' : 'ax-minor', x1: X(I), y1: m.t, x2: X(I), y2: H - m.b }));
      }
      const I = Math.pow(10, e);
      root.append(svg('text', { class: 'ax-tx', x: X(I), y: H - m.b + 12, 'text-anchor': 'middle', text: I >= 1000 ? `${I / 1000}k` : `${I}`.replace('.', ',') }));
    }
    for (let e = -2; e <= 2; e++) {
      for (let k = 1; k < 10; k++) {
        const t = k * Math.pow(10, e);
        if (t > ymax * 1.0001) break;
        root.append(svg('line', { class: k === 1 ? 'ax' : 'ax-minor', x1: m.l, y1: Y(t), x2: W - m.r, y2: Y(t) }));
      }
      const t = Math.pow(10, e);
      root.append(svg('text', { class: 'ax-tx', x: m.l - 5, y: Y(t) + 3, 'text-anchor': 'end', text: `${t}`.replace('.', ',') }));
    }
    root.append(svg('text', { class: 'ax-title', x: (W + m.l) / 2, y: H - 6, 'text-anchor': 'middle', text: opts.xLabel || `Corrente ${kind === 'phase' ? 'de fase' : 'residual (3I0)'} (A)` }));
    root.append(svg('text', { class: 'ax-title', x: 11, y: (H - m.b) / 2, 'text-anchor': 'middle', transform: `rotate(-90 11 ${(H - m.b) / 2})`, text: 'Tempo (s)' }));

    const ops = [];
    devices.forEach((d, i) => {
      const s = kind === 'phase' ? d.group.phase : d.group.ground;
      if (!s || !(s.pickup > 0)) return;
      const color = CURVE_COLORS[i % CURVE_COLORS.length];
      const pts = [];
      const lo = Math.log10(s.pickup * 1.03);
      const hi = Math.log10(xmax);
      const samples = [];
      for (let k = 0; k <= 220; k++) samples.push(Math.pow(10, lo + ((hi - lo) * k) / 220));
      if (d.inst50 !== false && s.inst > 0) samples.push(s.inst * 0.9999, s.inst * 1.0001);
      samples.sort((a, b) => a - b).forEach((I) => {
        const r = PR.staticTime(d.group, I, kind, { Mmax: opts.Mmax, inst: d.inst50 !== false });
        if (!isFinite(r.t)) return;
        const t = Math.min(ymax, Math.max(ymin, r.t));
        pts.push(`${X(I).toFixed(1)},${Y(t).toFixed(1)}`);
      });
      root.append(svg('polyline', { class: 'curve', points: pts.join(' '), stroke: color }));
      if (opts.faultI > 0) {
        const r = PR.staticTime(d.group, opts.faultI, kind, { Mmax: opts.Mmax, inst: d.inst50 !== false });
        if (isFinite(r.t)) ops.push({ i, t: r.t, el: r.el, color, label: d.label });
      }
    });
    if (opts.faultI > 0 && opts.faultI < xmax) {
      root.append(svg('line', { class: 'fault-line', x1: X(opts.faultI), y1: m.t, x2: X(opts.faultI), y2: H - m.b }));
      root.append(svg('text', { class: 'op-tx', x: X(opts.faultI) + 4, y: m.t + 10, fill: 'var(--fault)', text: `If = ${fmt.amp(opts.faultI)}` }));
      ops.sort((a, b) => a.t - b.t).forEach((o, k) => {
        const y = Y(Math.min(ymax, Math.max(ymin, o.t)));
        root.append(svg('circle', { class: 'op-pt', cx: X(opts.faultI), cy: y, r: 4, fill: o.color }));
        root.append(svg('text', { class: 'op-tx', x: X(opts.faultI) - 6, y: y - 5 - (k % 2) * 9, 'text-anchor': 'end', fill: o.color, text: o.t < 1 ? `${fmt.num(o.t * 1000, 0)} ms` : `${fmt.num(o.t, 2)} s` }));
      });
    }
    container.append(root);
    return ops;
  }

  const CAT_COLOR = {
    falta: 'var(--fault)', trip: 'var(--crit)', disjuntor: 'var(--ink)', goose: 'var(--goose-sl)', '50bf': 'var(--goose-bf)',
    79: 'var(--src-aqz)', bloqueio: 'var(--warn)', sra: 'var(--ok)', siap: 'var(--src-esb)', partida: 'var(--muted)', alerta: 'var(--warn)', info: 'var(--muted)',
  };

  /** Linha do tempo indexada por evento (espaçamento uniforme, legível mesmo com eventos em ms e em s). */
  function timeline(svgEl, events, onSeek) {
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    const W = 1000;
    const H = 46;
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.setAttribute('preserveAspectRatio', 'none');
    const n = events.length;
    const x0 = 10;
    const x1 = W - 10;
    const xs = events.map((e, i) => (n <= 1 ? x0 : x0 + ((x1 - x0) * i) / (n - 1)));
    svgEl.append(svg('line', { x1: x0, y1: 22, x2: x1, y2: 22, stroke: 'var(--line)', 'stroke-width': 2 }));
    events.forEach((e, i) => {
      const tick = svg('rect', { x: xs[i] - 2.5, y: 10, width: 5, height: 24, rx: 1.5, fill: CAT_COLOR[e.cat] || 'var(--muted)', style: 'cursor:pointer' });
      tick.append(svg('title', { text: `${fmt.evt(e.t)} · ${e.text}` }));
      tick.addEventListener('click', () => onSeek && onSeek(e.t, i));
      svgEl.append(tick);
    });
    const head = svg('line', { x1: x0, y1: 4, x2: x0, y2: 42, stroke: 'var(--signal)', 'stroke-width': 3 });
    svgEl.append(head);
    return {
      update(t) {
        if (!n) return;
        let i = 0;
        while (i < n - 1 && events[i + 1].t <= t) i++;
        let x = xs[i];
        if (i < n - 1 && t > events[i].t) {
          const f = (t - events[i].t) / Math.max(1e-9, events[i + 1].t - events[i].t);
          x = xs[i] + (xs[i + 1] - xs[i]) * Math.min(1, f);
        }
        if (t < events[0].t) x = x0;
        head.setAttribute('x1', x);
        head.setAttribute('x2', x);
      },
    };
  }

  /**
   * Gráfico I × t de um ensaio de sobrecorrente (como as Figs. A1 a A4 do TCC):
   * curva do relé (simulada), linhas de pickup do 51 e do 50 e pontos medidos.
   * cfg: { time(I) -> {t}, pickup, inst, points: [[I, t, status]], xLabel }
   */
  function itChart(container, cfg) {
    container.innerHTML = '';
    const W = 380;
    const H = 250;
    const m = { l: 44, r: 10, t: 10, b: 34 };
    const xmin = 0.5;
    const xmax = 20;
    const ymin = 0.01;
    const ymax = 100;
    const X = (I) => m.l + ((Math.log10(I) - Math.log10(xmin)) / (Math.log10(xmax) - Math.log10(xmin))) * (W - m.l - m.r);
    const Y = (t) => m.t + (1 - (Math.log10(t) - Math.log10(ymin)) / (Math.log10(ymax) - Math.log10(ymin))) * (H - m.t - m.b);
    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Gráfico corrente × tempo do ensaio de sobrecorrente' });
    [0.5, 1, 2, 5, 10, 20].forEach((I) => {
      root.append(svg('line', { class: 'ax', x1: X(I), y1: m.t, x2: X(I), y2: H - m.b }));
      root.append(svg('text', { class: 'ax-tx', x: X(I), y: H - m.b + 12, 'text-anchor': 'middle', text: `${I}`.replace('.', ',') }));
    });
    [0.01, 0.1, 1, 10, 100].forEach((t) => {
      root.append(svg('line', { class: 'ax', x1: m.l, y1: Y(t), x2: W - m.r, y2: Y(t) }));
      root.append(svg('text', { class: 'ax-tx', x: m.l - 5, y: Y(t) + 3, 'text-anchor': 'end', text: `${t}`.replace('.', ',') }));
    });
    root.append(svg('text', { class: 'ax-title', x: (W + m.l) / 2, y: H - 6, 'text-anchor': 'middle', text: cfg.xLabel || 'Corrente injetada (A secundários)' }));
    root.append(svg('text', { class: 'ax-title', x: 11, y: (H - m.b) / 2, 'text-anchor': 'middle', transform: `rotate(-90 11 ${(H - m.b) / 2})`, text: 'Tempo (s)' }));
    // pickups (linhas verticais, como na mala)
    [cfg.pickup, cfg.inst].forEach((I) => {
      if (I > xmin && I < xmax) root.append(svg('line', { x1: X(I), y1: m.t, x2: X(I), y2: H - m.b, stroke: 'var(--ok)', 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }));
    });
    const pts = [];
    for (let k = 0; k <= 240; k++) {
      const I = Math.pow(10, Math.log10(cfg.pickup * 1.01) + ((Math.log10(xmax) - Math.log10(cfg.pickup * 1.01)) * k) / 240);
      const r = cfg.time(I);
      if (isFinite(r.t)) pts.push(`${X(I).toFixed(1)},${Y(Math.min(ymax, Math.max(ymin, r.t))).toFixed(1)}`);
    }
    if (cfg.inst) {
      const a = cfg.time(cfg.inst * 0.999);
      const b = cfg.time(cfg.inst * 1.001);
      const ins = pts.findIndex((q) => Number(q.split(',')[0]) > X(cfg.inst));
      if (ins > 0 && isFinite(a.t)) pts.splice(ins, 0, `${X(cfg.inst).toFixed(1)},${Y(a.t).toFixed(1)}`, `${X(cfg.inst).toFixed(1)},${Y(b.t).toFixed(1)}`);
    }
    root.append(svg('polyline', { class: 'curve', points: pts.join(' '), stroke: CURVE_COLORS[1] }));
    cfg.points.forEach(([I, t, status]) => {
      const ok = /aprov/i.test(status);
      root.append(svg('circle', { cx: X(I), cy: Y(t), r: 3.6, fill: ok ? 'var(--ok)' : 'var(--crit)', stroke: 'var(--panel)', 'stroke-width': 1 }));
    });
    container.append(root);
  }

  /**
   * Diagrama de tempos no estilo do Sequenc (Figs. 5.12 a 5.22 do TCC): para cada
   * relé envolvido, partida, bloqueio recebido por GOOSE, estado do disjuntor e
   * marcas de trip, 50BF e fechamento, em ms a partir do início da falta.
   * opts: { mode: 'transitorio' | 'completo', label(dev), relayOfSw }
   */
  function timing(container, res, opts = {}) {
    container.innerHTML = '';
    const snaps = res.snaps || [];
    if (!snaps.length) return;
    const t0 = res.metrics && res.metrics.faultAt != null ? res.metrics.faultAt : 0;
    const full = opts.mode === 'completo';
    const marks = res.log.filter((e) => ['trip', '50bf', 'disjuntor', 'bloqueio'].includes(e.cat));
    let tEnd;
    if (full) {
      tEnd = Math.max(t0 + 1, Math.min(res.endTime || 0, (marks.length ? marks[marks.length - 1].t : t0) + 2));
    } else {
      const early = marks.filter((e) => e.t <= t0 + 2);
      tEnd = Math.max(t0 + 0.3, (early.length ? early[early.length - 1].t : t0) + 0.12);
    }
    const tStart = full ? t0 - 0.5 : t0 - 0.05;
    // relés envolvidos: partiram ou abriram na janela, na ordem da primeira partida
    const first = {};
    snaps.forEach((sn) => {
      if (sn.t > tEnd) return;
      Object.entries(sn.relay).forEach(([id, r]) => { if ((r.pick || r.blocked || r.tripped) && first[id] == null) first[id] = sn.t; });
    });
    res.log.forEach((e) => { if (e.cat === 'trip' && e.t <= tEnd && e.dev) { const id = opts.relayOfSw(e.dev); if (id && first[id] == null) first[id] = e.t; } });
    const ids = Object.keys(first).sort((a, b) => first[a] - first[b]).slice(0, 8);
    const laneH = 30;
    const W = 380;
    const m = { l: 62, r: 10, t: 8, b: 26 };
    const H = m.t + laneH * (ids.length + 1) + m.b + 4;
    const X = (t) => m.l + ((t - tStart) / (tEnd - tStart)) * (W - m.l - m.r);
    const unit = full ? 's' : 'ms';
    const fmtT = (t) => (full ? fmt.num(t - t0, 1) : fmt.num((t - t0) * 1000, 0));
    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Diagrama de tempos da simulação' });
    // grade de tempo
    const span = (tEnd - tStart) * (full ? 1 : 1000);
    const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].find((s) => span / s <= 8) || 5000;
    const st = Math.ceil(((tStart - t0) * (full ? 1 : 1000)) / step) * step;
    for (let v = st; v <= (tEnd - t0) * (full ? 1 : 1000) + 1e-9; v += step) {
      const t = t0 + v / (full ? 1 : 1000);
      root.append(svg('line', { class: v === 0 ? 'ax' : 'ax-minor', x1: X(t), y1: m.t - 4, x2: X(t), y2: H - m.b }));
      root.append(svg('text', { class: 'ax-tx', x: X(t), y: H - m.b + 12, 'text-anchor': 'middle', text: `${v}`.replace('.', ',') }));
    }
    root.append(svg('text', { class: 'ax-title', x: (W + m.l) / 2, y: H - 2, 'text-anchor': 'middle', text: `Tempo desde o início da falta (${unit})` }));
    // intervalos a partir dos instantâneos (cada estado vale até o instantâneo seguinte)
    const spans = (pred) => {
      const out = [];
      let open = null;
      snaps.forEach((sn, i) => {
        const on = pred(sn);
        const tt = Math.max(tStart, sn.t);
        if (on && open == null) open = tt;
        if (!on && open != null) { out.push([open, tt]); open = null; }
        if (i === snaps.length - 1 && open != null) out.push([open, Math.max(tt, tEnd)]);
      });
      return out.filter(([a, b]) => b > tStart && a < tEnd).map(([a, b]) => [Math.max(a, tStart), Math.min(b, tEnd)]);
    };
    const lane = (k, label) => {
      const y = m.t + laneH * k;
      root.append(svg('line', { class: 'ax-minor', x1: m.l, y1: y + laneH, x2: W - m.r, y2: y + laneH }));
      root.append(svg('text', { class: 'ax-tx', x: m.l - 6, y: y + laneH / 2 + 3, 'text-anchor': 'end', text: label }));
      return y;
    };
    // faixa da falta
    const yF = lane(0, 'falta');
    spans((sn) => !!sn.faultPath).forEach(([a, b]) => root.append(svg('rect', { x: X(a), y: yF + 8, width: Math.max(1, X(b) - X(a)), height: laneH - 16, fill: 'var(--fault)', opacity: 0.75, rx: 2 })));
    ids.forEach((id, k) => {
      const sw = opts.swOfRelay(id);
      const y = lane(k + 1, opts.label(sw));
      // disjuntor fechado: linha de base
      spans((sn) => sn.sw[sw] && sn.sw[sw].closed).forEach(([a, b]) => root.append(svg('line', { x1: X(a), y1: y + laneH - 6, x2: X(b), y2: y + laneH - 6, stroke: 'var(--ink)', 'stroke-width': 2 })));
      // partida e bloqueio recebido
      spans((sn) => sn.relay[id] && sn.relay[id].pick).forEach(([a, b]) => root.append(svg('rect', { x: X(a), y: y + 5, width: Math.max(1, X(b) - X(a)), height: 7, fill: 'var(--muted)', opacity: 0.7, rx: 1.5 })));
      spans((sn) => sn.relay[id] && sn.relay[id].blocked).forEach(([a, b]) => root.append(svg('rect', { x: X(a), y: y + 13, width: Math.max(1, X(b) - X(a)), height: 5, fill: 'var(--goose-sl)', rx: 1.5 })));
    });
    // marcas: trip, 50BF, fechamento
    const yOf = (dev) => {
      const id = opts.relayOfSw(dev);
      const k = ids.indexOf(id);
      return k < 0 ? null : m.t + laneH * (k + 1);
    };
    let lastLabelX = {};
    res.log.forEach((e) => {
      if (e.t < tStart || e.t > tEnd || !e.dev) return;
      const y = yOf(e.dev);
      if (y == null) return;
      let color = null;
      let txt = '';
      if (e.cat === 'trip') { color = 'var(--crit)'; txt = fmtT(e.t); }
      else if (e.cat === '50bf') { color = 'var(--goose-bf)'; txt = 'BF'; }
      else if (e.cat === 'disjuntor' && /fechou/.test(e.text)) { color = 'var(--ok)'; txt = 'F'; }
      if (!color) return;
      const x = X(e.t);
      root.append(svg('line', { x1: x, y1: y + 2, x2: x, y2: y + laneH - 2, stroke: color, 'stroke-width': 2 }));
      const key = `${y}`;
      const dy = lastLabelX[key] != null && Math.abs(lastLabelX[key] - x) < 26 ? 9 : 0;
      lastLabelX[key] = x;
      root.append(svg('text', { class: 'op-tx', x: x + 3, y: y + 11 + dy, fill: color, text: txt }));
    });
    container.append(root);
  }

  SH.ui.charts = { coordinogram, timeline, itChart, timing, CURVE_COLORS };
})(typeof window !== 'undefined' ? window : globalThis);
