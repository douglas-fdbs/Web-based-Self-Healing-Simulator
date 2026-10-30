/*
 * Diagrama unifilar em SVG.
 *
 * Convenções visuais (as mesmas das figuras do TCC):
 *   quadrado vermelho = equipamento fechado; verde = aberto.
 * O traço animado indica o sentido do fluxo e tem a cor da subestação que
 * alimenta o trecho; a velocidade cresce com a corrente. Trechos sem tensão
 * ficam cinza tracejados. O caminho da corrente de falta aparece em vermelho.
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});
  const { svg, fmt } = SH.ui;
  const SW_HALF = 11;

  function createDiagram(svgEl, tooltipEl, model, handlers = {}) {
    const scn = model.scn;
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    const [vx, vy, vw, vh] = scn.viewBox || [0, 0, 1180, 600];
    svgEl.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);

    const srcColorKey = {};
    Object.values(model.sources).forEach((s) => { srcColorKey[s.id] = s.color; });
    const colorOf = (srcId) => SH.ui.srcVar(srcColorKey[srcId]);

    const layer = (cls) => { const g = svg('g', { class: cls }); svgEl.append(g); return g; };
    const gGrid = layer('l-grid');
    const gDecor = layer('l-decor');
    const gSeg = layer('l-seg');
    const gLead = layer('l-lead');
    const gBus = layer('l-bus');
    const gSw = layer('l-sw');
    const gFault = layer('l-fault');
    const gGoose = layer('l-goose');

    // grade leve de papel técnico
    for (let x = 0; x <= vw; x += 40) gGrid.append(svg('line', { class: 'svg-grid', x1: x, y1: 0, x2: x, y2: vh }));
    for (let y = 0; y <= vh; y += 40) gGrid.append(svg('line', { class: 'svg-grid', x1: 0, y1: y, x2: vw, y2: y }));

    const nodePos = (id, ref) => {
      const n = model.nodes[id];
      if (n.bar) return { x: n.bar.x, y: ref ? ref.y : (n.bar.y1 + n.bar.y2) / 2 };
      return { x: n.x, y: n.y };
    };

    // ---------- geometria das polilinhas ----------
    function polyLen(pts) {
      let L = 0;
      for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      return L;
    }
    function pointAt(pts, f) {
      const L = polyLen(pts) * Math.min(1, Math.max(0, f));
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        if (acc + d >= L || i === pts.length - 1) {
          const u = d ? (L - acc) / d : 0;
          return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * u, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * u, horiz: Math.abs(pts[i].y - pts[i - 1].y) < 1 };
        }
        acc += d;
      }
      return pts[0];
    }
    function project(pts, p) {
      let best = { d: Infinity, f: 0 };
      const total = polyLen(pts);
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const L2 = dx * dx + dy * dy || 1;
        let u = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2;
        u = Math.min(1, Math.max(0, u));
        const q = { x: a.x + dx * u, y: a.y + dy * u };
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        const segL = Math.sqrt(L2);
        if (d < best.d) best = { d, f: total ? (acc + segL * u) / total : 0 };
        acc += segL;
      }
      return best.f;
    }
    const toPath = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    function svgPoint(evt) {
      const pt = svgEl.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      const m = svgEl.getScreenCTM();
      return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
    }

    // ---------- tooltip ----------
    function showTip(evt, html) {
      if (!tooltipEl) return;
      tooltipEl.innerHTML = html;
      tooltipEl.style.display = 'block';
      const wrap = tooltipEl.parentElement.getBoundingClientRect();
      let x = evt.clientX - wrap.left + tooltipEl.parentElement.scrollLeft + 14;
      const y = evt.clientY - wrap.top + 12;
      const w = tooltipEl.offsetWidth;
      if (x + w > tooltipEl.parentElement.scrollLeft + wrap.width - 8) x -= w + 28;
      tooltipEl.style.left = `${x}px`;
      tooltipEl.style.top = `${y}px`;
    }
    const hideTip = () => { if (tooltipEl) tooltipEl.style.display = 'none'; };

    // ---------- elementos decorativos ----------
    const decorEls = [];
    (scn.decor || []).forEach((d) => {
      let e = null;
      if (d.type === 'bar') {
        e = svg('line', { class: 'bar', x1: d.x, y1: d.y1, x2: d.x, y2: d.y2 });
        gDecor.append(e);
        if (d.label) {
          const cy = (d.y1 + d.y2) / 2;
          gDecor.append(svg('text', { class: 'dg-text small', x: d.x - 14, y: cy, transform: `rotate(-90 ${d.x - 14} ${cy})`, 'text-anchor': 'middle', text: d.label }));
        }
      } else if (d.type === 'line') {
        e = svg('path', { class: 'decor-line', d: toPath(d.pts.map(([x, y]) => ({ x, y }))) });
        gDecor.append(e);
      } else if (d.type === 'trafo') {
        e = svg('g', { class: 'trafo' },
          svg('circle', { cx: d.x - 6, cy: d.y, r: 10 }),
          svg('circle', { cx: d.x + 6, cy: d.y, r: 10 }));
        gDecor.append(e);
        gDecor.append(svg('text', { class: 'dg-text', x: d.x, y: d.y - 16, 'text-anchor': 'middle', text: d.label }));
        if (d.sub) gDecor.append(svg('text', { class: 'dg-text small', x: d.x, y: d.y + 26, 'text-anchor': 'middle', text: d.sub }));
      } else if (d.type === 'text') {
        gDecor.append(svg('text', { class: `dg-text ${d.cls || ''}`, x: d.x, y: d.y, text: d.text }));
      }
      if (e && d.energizedBy) decorEls.push({ el: e, node: d.energizedBy, kind: d.type });
    });

    // ---------- barramentos ----------
    const busEls = {};
    Object.values(model.nodes).forEach((n) => {
      if (!n.bar) return;
      const g = svg('g', { 'data-bus': n.id });
      const sel = svg('line', { class: 'bus-sel', x1: n.bar.x, y1: n.bar.y1, x2: n.bar.x, y2: n.bar.y2 });
      const line = svg('line', { class: 'bar', x1: n.bar.x, y1: n.bar.y1, x2: n.bar.x, y2: n.bar.y2 });
      const hit = svg('line', { class: 'bus-hit', x1: n.bar.x, y1: n.bar.y1, x2: n.bar.x, y2: n.bar.y2 });
      g.append(sel, line, hit);
      if (n.label && !n.bar.noLabel) {
        const cy = (n.bar.y1 + n.bar.y2) / 2;
        const tx = n.bar.x + 18;
        g.append(svg('text', { class: 'dg-text', x: tx, y: cy, transform: `rotate(90 ${tx} ${cy})`, 'text-anchor': 'middle', text: n.label }));
      }
      hit.addEventListener('click', () => handlers.onSelect && handlers.onSelect({ type: 'bus', id: n.id }));
      hit.addEventListener('mousemove', (evt) => showTip(evt, `<b>${n.label}</b><br>Clique para opções da subestação`));
      hit.addEventListener('mouseleave', hideTip);
      gBus.append(g);
      busEls[n.id] = { g, line, sel };
    });

    // ---------- trechos ----------
    const segEls = {};
    const labelDone = new Set();
    Object.values(model.segments).forEach((s) => {
      const pts = [nodePos(s.a), ...(s.via || []).map(([x, y]) => ({ x, y })), nodePos(s.b)];
      const d = toPath(pts);
      const g = svg('g', { class: 'seg', 'data-seg': s.id });
      const halo = svg('path', { class: 'seg-halo', d });
      const base = svg('path', { class: 'seg-base', d });
      const flow = svg('path', { class: 'seg-flow', d });
      const hit = svg('path', { class: 'seg-hit', d });
      g.append(halo, base, flow, hit);
      const label = s.label || s.id;
      // posição do rótulo: meio do maior trecho reto
      let bi = 1;
      let bl = 0;
      for (let i = 1; i < pts.length; i++) {
        const L = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        if (L > bl) { bl = L; bi = i; }
      }
      const mx = (pts[bi].x + pts[bi - 1].x) / 2;
      const my = (pts[bi].y + pts[bi - 1].y) / 2;
      const horiz = Math.abs(pts[bi].y - pts[bi - 1].y) < 1;
      let curTx = null;
      if (!labelDone.has(label)) {
        labelDone.add(label);
        g.append(svg('text', { class: 'dg-text seglabel', x: horiz ? mx : mx + 10, y: horiz ? my - 9 : my, 'text-anchor': horiz ? 'middle' : 'start', text: label }));
        const lenM = s.lengthM || 0;
        if (lenM > 0) {
          const lenTxt = lenM < 100 ? `${fmt.num(lenM, 0)} m` : `${fmt.num(lenM / 1000, 2)} km`;
          g.append(svg('text', { class: 'dg-text len', x: horiz ? mx : mx + 10, y: horiz ? my + 15 : my + 14, 'text-anchor': horiz ? 'middle' : 'start', text: lenTxt }));
        }
      }
      curTx = svg('text', { class: 'dg-text cur', x: horiz ? mx : mx + 10, y: horiz ? my + 27 : my + 27, 'text-anchor': horiz ? 'middle' : 'start', text: '' });
      g.append(curTx);
      hit.addEventListener('click', (evt) => {
        const f = project(pts, svgPoint(evt));
        if (handlers.onSelect) handlers.onSelect({ type: 'seg', id: s.id, x: Math.round(f * 100) / 100 });
      });
      hit.addEventListener('mousemove', (evt) => showTip(evt, segTip(s)));
      hit.addEventListener('mouseleave', hideTip);
      gSeg.append(g);
      segEls[s.id] = { g, base, flow, pts, curTx };
    });

    // ---------- chaves / religadores ----------
    const swEls = {};
    const leadEls = [];
    Object.values(model.switches).forEach((w) => {
      const draws = w.draw || [{ x: w.x, y: w.y, label: w.label || w.id }];
      const groups = [];
      draws.forEach((dw) => {
        const vert = w.orient === 'v';
        if (!w.draw) {
          const pa = nodePos(w.a, dw);
          const pb = nodePos(w.b, dw);
          const aFirst = vert ? pa.y <= pb.y : pa.x <= pb.x;
          const edge1 = vert ? { x: dw.x, y: dw.y - SW_HALF } : { x: dw.x - SW_HALF, y: dw.y };
          const edge2 = vert ? { x: dw.x, y: dw.y + SW_HALF } : { x: dw.x + SW_HALF, y: dw.y };
          const [ea, eb] = aFirst ? [edge1, edge2] : [edge2, edge1];
          [[pa, ea, w.a], [eb, pb, w.b]].forEach(([p, q, node]) => {
            if (Math.hypot(p.x - q.x, p.y - q.y) < 0.5) return;
            const ln = svg('path', { class: 'lead', d: toPath([p, q]) });
            gLead.append(ln);
            leadEls.push({ el: ln, node, sw: w.id });
          });
        }
        const g = svg('g', { class: 'swg', transform: `translate(${dw.x},${dw.y})`, 'data-sw': w.id, tabindex: 0, role: 'button', 'aria-label': `Equipamento ${dw.label || w.label || w.id}` });
        g.append(
          svg('rect', { class: 'halo', x: -15, y: -15, width: 30, height: 30, rx: 4 }),
          svg('rect', { class: 'box', x: -SW_HALF, y: -SW_HALF, width: 2 * SW_HALF, height: 2 * SW_HALF, rx: 2 }),
          svg('path', { class: 'x', d: 'M-7,-7L7,7M7,-7L-7,7' }),
          svg('circle', { class: 'pick', cx: 12, cy: -12, r: 4 }),
        );
        const lab = dw.label || w.label || w.id;
        if (vert) g.append(svg('text', { class: 'dg-text', x: 17, y: 4, text: lab }));
        else g.append(svg('text', { class: 'dg-text', x: 0, y: -17, 'text-anchor': 'middle', text: lab }));
        const badge = svg('g', { class: 'badge', transform: vert ? 'translate(17,8)' : 'translate(-14,15)' },
          svg('rect', { class: 'badge-bg', x: 0, y: 0, width: 28, height: 12, rx: 2 }),
          svg('text', { class: 'badge-tx', x: 14, y: 9.5, 'text-anchor': 'middle', text: 'BLQ' }));
        const sl = svg('g', { class: 'slb', transform: vert ? 'translate(-36,-6)' : 'translate(-30,-6)' },
          svg('rect', { class: 'sl-bg', x: 0, y: 0, width: 17, height: 12, rx: 2 }),
          svg('text', { class: 'badge-tx', x: 8.5, y: 9.5, 'text-anchor': 'middle', text: 'SL' }));
        const grp = svg('text', { class: 'grp-tx', x: vert ? 17 : 14, y: vert ? 30 : 30, text: '' });
        const cd = svg('text', { class: 'cd-tx', x: vert ? 17 : 0, y: vert ? -10 : -30, 'text-anchor': vert ? 'start' : 'middle', text: '' });
        g.append(badge, sl, grp, cd);
        badge.style.display = 'none';
        sl.style.display = 'none';
        g.addEventListener('click', () => handlers.onSelect && handlers.onSelect({ type: 'sw', id: w.id }));
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (handlers.onSelect) handlers.onSelect({ type: 'sw', id: w.id }); } });
        g.addEventListener('mousemove', (evt) => showTip(evt, swTip(w)));
        g.addEventListener('mouseleave', hideTip);
        gSw.append(g);
        groups.push({ g, badge, sl, grp, cd, x: dw.x, y: dw.y });
      });
      swEls[w.id] = groups;
    });

    // ---------- marcador e raio de falta ----------
    const marker = svg('circle', { class: 'marker', r: 9, cx: -50, cy: -50 });
    const bolt = svg('path', { class: 'bolt', d: 'M3,-26 L-6,-9 L0,-9 L-4,6 L8,-13 L1,-13 L6,-26 Z', transform: 'translate(-100,-100)' });
    gFault.append(marker, bolt);
    marker.style.display = 'none';
    bolt.style.display = 'none';

    let lastSnap = null;
    let showCurrents = false;

    function segTip(s) {
      const snap = lastSnap;
      const st = snap && snap.seg[s.id];
      const cables = (s.cable || []).map(([c, L]) => `${scn.cables[c] ? scn.cables[c].name : c} (${fmt.num(L / 1000, 2)} km)`).join(' + ');
      const I = st ? st.I : 0;
      return `<b>Trecho ${s.label || s.id}</b>${cables ? `<br>${cables}` : ''}`
        + `<br>Carga pesada: ${fmt.amp(s.load, s.load % 1 ? 1 : 0)} · ampacidade ${fmt.amp(s.amp)}`
        + (st ? `<br>Corrente: ${fmt.amp(I)} (${fmt.pct((100 * I) / s.amp, 0)} da ampacidade)<br>Fonte: ${model.sources[st.src].name}` : '<br>Sem tensão')
        + '<br><i>Clique para configurar uma falta neste ponto</i>';
    }
    function swTip(w) {
      const snap = lastSnap;
      const s = snap && snap.sw[w.id];
      const r = snap && w.relay && snap.relay[w.relay];
      const kind = { feeder: 'Religador/disjuntor de saída de alimentador', recloser: 'Religador de linha (NF)', tie: 'Religador de interligação (NA)', bus: 'Proteção geral de barramento' }[w.kind] || 'Chave';
      return `<b>${w.label || w.id}</b><br>${kind}`
        + (s ? `<br>${s.closed ? 'Fechado' : 'Aberto'}${s.stuck ? ' · falha de abertura simulada' : ''}${s.locked ? ' · bloqueado' : ''}` : '')
        + (s && s.carrying ? `<br>Corrente: ${fmt.amp(s.I)}` : '')
        + (r && r.groupName ? `<br>${r.groupName}` : '')
        + '<br><i>Clique para ver ajustes e comandos</i>';
    }

    // ---------- atualização por instantâneo ----------
    function render(snap) {
      lastSnap = snap;
      const fpEdges = new Set(snap.faultPath ? snap.faultPath.edges : []);
      const faultSeg = snap.fault && snap.fault.active && snap.fault.spec.kind === 'segment' ? snap.fault.spec.seg : null;
      Object.entries(segEls).forEach(([id, e]) => {
        const st = snap.seg[id];
        const s = model.segments[id];
        e.g.classList.toggle('on', !!st);
        e.g.classList.toggle('fpath', fpEdges.has(id) || (faultSeg === id && !!snap.faultPath));
        e.g.classList.toggle('faulted', faultSeg === id);
        if (st) {
          e.g.style.setProperty('--src', colorOf(st.src));
          e.g.classList.toggle('rev', st.up !== s.a);
          const I = fpEdges.has(id) || faultSeg === id ? (snap.faultPath ? snap.faultPath.I : st.I) : st.I;
          const dur = Math.max(0.12, 1.6 / Math.sqrt(Math.max(I, 5) / 40));
          e.g.style.setProperty('--dur', `${dur.toFixed(2)}s`);
          e.curTx.textContent = showCurrents ? fmt.amp(st.I) : '';
          e.curTx.style.fill = colorOf(st.src);
        } else {
          e.curTx.textContent = '';
        }
      });
      leadEls.forEach((l) => {
        const src = snap.node[l.node];
        l.el.classList.toggle('on', !!src);
        l.el.classList.toggle('fpath', fpEdges.has(l.sw) && snap.sw[l.sw].closed);
        if (src) l.el.style.setProperty('--src', colorOf(src));
      });
      Object.entries(busEls).forEach(([id, b]) => {
        const src = snap.node[id];
        b.line.classList.toggle('on', !!src);
        if (src) b.line.style.setProperty('--src', colorOf(src));
      });
      decorEls.forEach((d) => {
        const src = snap.node[d.node];
        d.el.classList.toggle('on', !!src);
        if (src) d.el.style.setProperty('--src', colorOf(src));
      });
      Object.entries(swEls).forEach(([id, groups]) => {
        const s = snap.sw[id];
        const w = model.switches[id];
        const r = w.relay ? snap.relay[w.relay] : null;
        groups.forEach((gg) => {
          gg.g.classList.toggle('closed', s.closed);
          gg.g.classList.toggle('stuck', s.stuck);
          gg.g.classList.toggle('pick', !!(r && (r.pick || (r.tripped && s.closed))));
          gg.badge.style.display = s.locked ? '' : 'none';
          gg.sl.style.display = r && r.blocked ? '' : 'none';
          const cfg = w.relay ? model.relays[w.relay] : null;
          gg.grp.textContent = cfg && cfg.groups.length > 1 && r && s.carrying ? r.group : '';
          gg.cd.textContent = '';
        });
      });
      // falta
      if (snap.fault && snap.fault.spec) {
        const sp = snap.fault.spec;
        let p = null;
        if (sp.kind === 'segment') p = pointAt(segEls[sp.seg].pts, sp.x);
        else if (sp.kind === 'bus') { const n = model.nodes[sp.node]; p = n.bar ? { x: n.bar.x, y: n.bar.y1 + 30 } : { x: n.x, y: n.y }; }
        if (p) {
          bolt.setAttribute('transform', `translate(${p.x},${p.y})`);
          bolt.style.display = '';
          bolt.classList.toggle('cleared', !snap.fault.active);
        }
      } else {
        bolt.style.display = 'none';
      }
    }

    /** Contagem regressiva do tempo morto (atualizada a cada quadro). */
    function updateCountdowns(snap, t) {
      Object.entries(swEls).forEach(([id, groups]) => {
        const w = model.switches[id];
        const r = w.relay && snap ? snap.relay[w.relay] : null;
        const txt = r && r.reclosingAt && r.reclosingAt > t ? `79: ${fmt.num(r.reclosingAt - t, 1)} s` : '';
        groups.forEach((gg) => { if (gg.cd.textContent !== txt) gg.cd.textContent = txt; });
      });
    }

    function setSelection(sel) {
      Object.values(segEls).forEach((e) => e.g.classList.remove('selected'));
      Object.values(swEls).forEach((gs) => gs.forEach((gg) => gg.g.classList.remove('selected')));
      Object.values(busEls).forEach((b) => b.sel.classList.remove('on'));
      marker.style.display = 'none';
      if (!sel) return;
      if (sel.type === 'seg' && segEls[sel.id]) {
        segEls[sel.id].g.classList.add('selected');
        const p = pointAt(segEls[sel.id].pts, sel.x != null ? sel.x : 0.5);
        marker.setAttribute('cx', p.x);
        marker.setAttribute('cy', p.y);
        marker.style.display = '';
      } else if (sel.type === 'sw' && swEls[sel.id]) {
        swEls[sel.id].forEach((gg) => gg.g.classList.add('selected'));
      } else if (sel.type === 'bus' && busEls[sel.id]) {
        busEls[sel.id].sel.classList.add('on');
      }
    }

    function flash(swId) {
      (swEls[swId] || []).forEach((gg) => {
        gg.g.classList.remove('flash');
        // reinicia a animação
        void gg.g.getBBox();
        gg.g.classList.add('flash');
        setTimeout(() => gg.g.classList.remove('flash'), 1100);
      });
    }

    let arcSeq = 0;
    function goose(msg, realDur = 900) {
      const A = swEls[msg.from] && swEls[msg.from][0];
      const B = swEls[msg.to] && swEls[msg.to][0];
      if (!A || !B) return;
      const kind = msg.lost ? 'lost' : (msg.kind === 'SL' ? 'sl' : 'bf');
      const mx = (A.x + B.x) / 2;
      const sameRow = Math.abs(A.y - B.y) < 2;
      const cy = sameRow ? Math.min(A.y, B.y) - 62 : (A.y + B.y) / 2;
      const cx = sameRow ? mx : Math.max(A.x, B.x) + 70;
      const id = `garc${arcSeq++}`;
      const d = `M${A.x},${A.y - 12} Q${cx},${cy} ${B.x},${B.y - 12}`;
      const arc = svg('path', { id, class: `goose-arc ${kind}`, d });
      const dot = svg('circle', { class: `goose-dot ${kind}`, r: 5 });
      const motion = svg('animateMotion', { dur: `${realDur / 1000}s`, fill: 'freeze', keyPoints: msg.lost ? '0;0.55' : '0;1', keyTimes: '0;1', calcMode: 'linear' });
      motion.append(svg('mpath', { href: `#${id}` }));
      dot.append(motion);
      const txt = msg.kind === 'SL' ? (msg.value ? 'GOOSE SL = 1 (bloqueio)' : 'GOOSE SL = 0') : 'GOOSE 50BF (trip remoto)';
      const lab = svg('text', { class: `goose-lab ${kind}`, x: sameRow ? mx : cx + 6, y: sameRow ? cy + 24 : cy, 'text-anchor': sameRow ? 'middle' : 'start', text: msg.lost ? `${txt} · perdida` : txt });
      const g = svg('g', {}, arc, dot, lab);
      gGoose.append(g);
      try { motion.beginElement(); } catch (e) { /* SMIL indisponível */ }
      setTimeout(() => { g.style.transition = 'opacity .4s'; g.style.opacity = '0'; }, realDur + 900);
      setTimeout(() => g.remove(), realDur + 1400);
    }

    function clearGoose() { while (gGoose.firstChild) gGoose.removeChild(gGoose.firstChild); }
    function setShowCurrents(v) { showCurrents = v; if (lastSnap) render(lastSnap); }

    return { render, updateCountdowns, setSelection, flash, goose, clearGoose, setShowCurrents, pointAt };
  }

  SH.ui.createDiagram = createDiagram;
})(typeof window !== 'undefined' ? window : globalThis);
