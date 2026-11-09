/*
 * Janelas flutuantes: tabelas, gráficos e textos longos abrem fora do painel
 * lateral, em janelas que podem ser arrastadas pelo título, redimensionadas
 * pelo canto e fechadas (botão ou Esc). Em telas estreitas a janela ocupa a
 * parte de baixo da tela.
 *
 *   SH.ui.windows.open(id, { title, sub, render(body), live, width })
 *   SH.ui.windows.refresh(liveOnly)   -> redesenha as janelas abertas
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});
  const { el } = SH.ui;

  const wins = new Map();
  let z = 20;
  let cascade = 0;
  const narrow = () => global.matchMedia && global.matchMedia('(max-width: 720px)').matches;

  function focus(w) {
    w.node.style.zIndex = String(++z);
    wins.forEach((x) => x.node.classList.toggle('top', x === w));
  }

  function paint(w) {
    const keep = w.body.scrollTop;
    w.body.innerHTML = '';
    try {
      w.render(w.body);
    } catch (e) {
      w.body.append(el('p', { class: 'callout warn', text: `Erro ao montar a janela: ${e.message}` }));
      console.error(e);
    }
    w.body.scrollTop = keep;
  }

  function place(w, width) {
    const vw = global.innerWidth;
    const vh = global.innerHeight;
    const wd = Math.min(width, vw - 32);
    const left = Math.max(16, vw - wd - 430 - cascade * 28);
    const top = Math.min(84 + cascade * 28, Math.max(16, vh - 240));
    cascade = (cascade + 1) % 6;
    Object.assign(w.node.style, { left: `${left}px`, top: `${top}px`, width: `${wd}px` });
  }

  function drag(w, head) {
    head.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button') || narrow()) return;
      const r = w.node.getBoundingClientRect();
      const dx = e.clientX - r.left;
      const dy = e.clientY - r.top;
      head.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const x = Math.min(Math.max(ev.clientX - dx, 8 - r.width + 120), global.innerWidth - 120);
        const y = Math.min(Math.max(ev.clientY - dy, 0), global.innerHeight - 40);
        w.node.style.left = `${x}px`;
        w.node.style.top = `${y}px`;
      };
      const up = () => { head.removeEventListener('pointermove', move); head.removeEventListener('pointerup', up); head.removeEventListener('pointercancel', up); };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up);
      head.addEventListener('pointercancel', up);
    });
  }

  function open(id, opts) {
    let w = wins.get(id);
    if (w) {
      Object.assign(w, { render: opts.render, live: !!opts.live });
      w.titleEl.textContent = opts.title;
      w.subEl.textContent = opts.sub || '';
      paint(w);
      focus(w);
      return w;
    }
    const titleId = `win-t-${id}`;
    const titleEl = el('h2', { id: titleId, text: opts.title });
    const subEl = el('span', { class: 'win-sub', text: opts.sub || '' });
    const closeBtn = el('button', { type: 'button', class: 'btn icon win-x', title: 'Fechar (Esc)', 'aria-label': `Fechar ${opts.title}` });
    closeBtn.innerHTML = '<svg viewBox="0 0 16 16"><path d="M3.6 2.2 8 6.6l4.4-4.4 1.4 1.4L9.4 8l4.4 4.4-1.4 1.4L8 9.4l-4.4 4.4-1.4-1.4L6.6 8 2.2 3.6z"/></svg>';
    const head = el('header', { class: 'win-head' }, el('div', { class: 'win-titles' }, titleEl, subEl), closeBtn);
    const body = el('div', { class: 'win-body' });
    const node = el('section', { class: 'win', role: 'dialog', 'aria-labelledby': titleId, tabindex: '-1', 'data-win': id }, head, body);
    w = { id, node, body, titleEl, subEl, render: opts.render, live: !!opts.live, onClose: opts.onClose };
    wins.set(id, w);
    closeBtn.addEventListener('click', () => close(id));
    node.addEventListener('pointerdown', () => focus(w));
    drag(w, head);
    document.body.append(node);
    place(w, opts.width || 620);
    paint(w);
    focus(w);
    node.focus({ preventScroll: true });
    return w;
  }

  function close(id) {
    const w = wins.get(id);
    if (!w) return;
    w.node.remove();
    wins.delete(id);
    if (w.onClose) w.onClose();
    if (!wins.size) cascade = 0;
  }

  function closeTop() {
    let top = null;
    wins.forEach((w) => { if (!top || Number(w.node.style.zIndex) > Number(top.node.style.zIndex)) top = w; });
    if (!top) return false;
    close(top.id);
    return true;
  }

  function refresh(liveOnly) {
    wins.forEach((w) => { if (!liveOnly || w.live) paint(w); });
  }

  SH.ui.windows = { open, close, closeTop, refresh, isOpen: (id) => wins.has(id) };
})(typeof window !== 'undefined' ? window : globalThis);
