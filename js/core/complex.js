/*
 * Aritmética de números complexos usada nos cálculos de impedância e curto-circuito.
 * Um complexo é representado como objeto { re, im }.
 *
 * Padrão de módulo: o arquivo funciona tanto no navegador (registra em window.SH)
 * quanto no Node.js (module.exports), sem etapa de build.
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});

  const c = (re, im = 0) => ({ re, im });
  const fromArr = (a) => c(a[0], a[1] || 0);
  const add = (a, b) => c(a.re + b.re, a.im + b.im);
  const sub = (a, b) => c(a.re - b.re, a.im - b.im);
  const scale = (a, k) => c(a.re * k, a.im * k);
  const mul = (a, b) => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const abs = (a) => Math.hypot(a.re, a.im);
  const zero = () => c(0, 0);
  const fmt = (a, d = 4) => `${a.re.toFixed(d)} ${a.im >= 0 ? '+' : '−'} j${Math.abs(a.im).toFixed(d)}`;

  const api = { c, fromArr, add, sub, scale, mul, abs, zero, fmt };
  SH.complex = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
