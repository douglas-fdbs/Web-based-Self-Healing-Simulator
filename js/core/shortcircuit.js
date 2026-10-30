/*
 * Cálculo de curto-circuito pelo método das componentes simétricas,
 * seguindo as Equações 2.18 a 2.20 do TCC (Rodrigues, 2015):
 *
 *   Icc3F  = V / |Z1|
 *   Icc2F  = √3·V / |2·Z1 + Rf|          (= √3/2 · Icc3F quando Rf = 0)
 *   IccFT  = 3·V / |2·Z1 + Z0 + 3·Rf|
 *   IccFTm = IccFT com resistência de contato Rc (100 Ω no TCC e em Nobre, 2013)
 *
 * Z1 e Z0 são as impedâncias acumuladas da fonte até o ponto da falta (rede
 * radial: soma das impedâncias série). Tensão pré-falta de 1,0 pu e base de
 * 100 MVA / 13,8 kV (Ibase = 4183,7 A).
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});
  const C = SH.complex || require('./complex.js');

  const FAULT_TYPES = {
    '3F': { label: 'Trifásica (3F)', phases: 3, ground: false },
    '2F': { label: 'Bifásica (2F)', phases: 2, ground: false },
    FT: { label: 'Fase-terra franca (FT)', phases: 1, ground: true },
    FTm: { label: 'Fase-terra mínima (FTm, Rc = 100 Ω)', phases: 1, ground: true },
  };

  /** Correntes de curto (A) para impedâncias acumuladas z1, z0 (pu). */
  function currents(model, z1, z0, rfOhm = 0) {
    const ib = model.ibase;
    const rf = rfOhm / model.zbase;
    const rcMin = (model.scn.ftMinOhms != null ? model.scn.ftMinOhms : 100) / model.zbase;
    const z1rf = C.add(z1, C.c(rf, 0));
    const twoZ1 = C.scale(z1, 2);
    const i3f = ib / C.abs(z1rf);
    const i2f = (Math.sqrt(3) * ib) / C.abs(C.add(twoZ1, C.c(rf, 0)));
    const sumFT = C.add(twoZ1, z0);
    const ift = (3 * ib) / C.abs(C.add(sumFT, C.c(3 * rf, 0)));
    const iftm = (3 * ib) / C.abs(C.add(sumFT, C.c(3 * rcMin, 0)));
    return { i3f, i2f, ift, iftm };
  }

  /**
   * Impedância acumulada no ponto da falta.
   * fault = { kind: 'segment', seg, x } (x ∈ [0,1] medido a partir do nó "a")
   *       ou { kind: 'bus', node }.
   */
  function faultImpedance(model, topo, fault) {
    if (fault.kind === 'bus') {
      const n = topo.node[fault.node];
      if (!n) return null;
      return { z1: n.z1, z0: n.z0, src: n.src, upNode: fault.node };
    }
    const s = model.segments[fault.seg];
    const info = topo.seg[fault.seg];
    if (!info || !info.energized) return null;
    const frac = info.up === s.a ? fault.x : 1 - fault.x;
    const up = topo.node[info.up];
    return {
      z1: C.add(up.z1, C.scale(s.z1, frac)),
      z0: C.add(up.z0, C.scale(s.z0, frac)),
      src: up.src,
      upNode: info.up,
    };
  }

  /**
   * Resultado completo de uma falta: correntes padronizadas e as correntes
   * vistas pelos relés (fase e residual 3I0) para o tipo de falta escolhido.
   */
  function analyzeFault(model, topo, fault) {
    const zf = faultImpedance(model, topo, fault);
    if (!zf) return { energized: false };
    const type = fault.type || '3F';
    const rf = type === 'FTm' ? (model.scn.ftMinOhms != null ? model.scn.ftMinOhms : 100) : (fault.rf || 0);
    const std = currents(model, zf.z1, zf.z0, 0);
    const sel = currents(model, zf.z1, zf.z0, rf);
    let phase = 0;
    let residual = 0;
    if (type === '3F') phase = sel.i3f;
    else if (type === '2F') phase = sel.i2f;
    else { phase = sel.ift; residual = sel.ift; }
    return {
      energized: true,
      src: zf.src,
      upNode: zf.upNode,
      z1: zf.z1,
      z0: zf.z0,
      std,
      phase,
      residual,
      type,
      rf,
    };
  }

  /** Curto ao final de uma sequência de trechos a partir de uma fonte (Tab. 4.7). */
  function pathFault(model, sourceId, segIds) {
    const src = model.sources[sourceId];
    let z1 = src.z1;
    let z0 = src.z0;
    segIds.forEach((id) => {
      const s = model.segments[id];
      z1 = C.add(z1, s.z1);
      z0 = C.add(z0, s.z0);
    });
    return Object.assign({ z1, z0 }, currents(model, z1, z0, 0));
  }

  const api = { FAULT_TYPES, currents, faultImpedance, analyzeFault, pathFault };
  SH.shortcircuit = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
