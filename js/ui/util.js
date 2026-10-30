/* Utilitários de interface: formatação em pt-BR e criação de elementos DOM/SVG. */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});

  const nf = (d) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const NF = [0, 1, 2, 3, 4].map(nf);
  const num = (v, d = 0) => (v == null || !isFinite(v) ? '-' : NF[d].format(v));
  const amp = (v, d = 0) => (v == null || !isFinite(v) ? '-' : `${NF[d].format(v)} A`);
  const sec = (t, d = 3) => (t == null || !isFinite(t) ? '-' : `${NF[d].format(t)} s`);
  const ms = (t, d = 0) => (t == null || !isFinite(t) ? '-' : `${NF[d].format(t)} ms`);
  const pct = (v, d = 1) => (v == null || !isFinite(v) ? '-' : `${NF[d].format(v)}%`);
  /** Tempo de evento: ms quando < 10 s, senão segundos. */
  const evt = (t) => (t < 10 ? `${NF[3].format(t)} s` : `${NF[2].format(t)} s`);

  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    children.flat().forEach((c) => { if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c))); });
    return e;
  }

  const SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs = {}, ...children) {
    const e = document.createElementNS(SVGNS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'text') e.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    children.flat().forEach((c) => { if (c != null) e.append(c instanceof Node ? c : document.createTextNode(String(c))); });
    return e;
  }

  const srcVar = (key) => `var(--src-${key || 'aqz'})`;

  /** Copia texto para a área de transferência, com alternativa por seleção. */
  async function copyText(text, fallbackEl) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      if (fallbackEl) {
        fallbackEl.hidden = false;
        fallbackEl.value = text;
        fallbackEl.select();
      }
      return false;
    }
  }

  function storeGet(key, def) {
    try { const v = localStorage.getItem(key); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
  }
  function storeSet(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* armazenamento indisponível */ }
  }

  SH.ui = Object.assign(SH.ui || {}, { fmt: { num, amp, sec, ms, pct, evt }, el, svg, srcVar, copyText, storeGet, storeSet });
})(typeof window !== 'undefined' ? window : globalThis);
