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
  const CURVE_COLORS = ['#d32f2f', '#1e63c6', '#8a949a', '#c026d3', '#0f9d6b', '#b7791f'];

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
    const xmin = Math.pow(10, Math.floor(Math.log10(Math.max(1, minPk * 0.6))));
    const xmax = Math.pow(10, Math.ceil(Math.log10(Math.max(opts.faultI || 0, maxInst, minPk * 20) * 1.6)));
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
      root.append(svg('text', { class: 'ax-tx', x: X(I), y: H - m.b + 12, 'text-anchor': 'middle', text: I >= 1000 ? `${I / 1000}k` : `${I}` }));
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
    root.append(svg('text', { class: 'ax-title', x: (W + m.l) / 2, y: H - 6, 'text-anchor': 'middle', text: `Corrente ${kind === 'phase' ? 'de fase' : 'residual (3I0)'} (A)` }));
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

  SH.ui.charts = { coordinogram, timeline, CURVE_COLORS };
})(typeof window !== 'undefined' ? window : globalThis);
