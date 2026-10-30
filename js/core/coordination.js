/*
 * Verificação dos critérios de coordenação e sensibilidade do TCC
 * (seção 4.7.1, Tabs. 4.9 a 4.12) nas cadeias de alcance máximo da Fig. 4.6.
 *
 * Para cada par montante/jusante, calcula os tempos estáticos de atuação em
 * dois pontos: a barra do relé a jusante (maior corrente da zona dele) e o fim
 * da zona dele (menor corrente, onde ele atua pela curva). É a mesma análise
 * que o TCC faz com os coordenogramas das Figs. 4.9 a 4.13 e que leva aos
 * "pontos críticos" da seção 4.7.3.
 *
 * Critérios:
 *   margem 51-51 >= 0,4 s entre a proteção geral de barra e os alimentadores (Tab. 4.9)
 *   margem >= 0,3 s entre proteções temporizadas ao longo dos alimentadores (4.7.1 b)
 *   seletividade física: o montante não pode atuar antes de o jusante abrir
 *     (tempo do jusante + abertura do disjuntor)
 *   sensibilidade: múltiplo >= 2,4 (fase, curto 2F) e >= 4,0 (neutro, curto FT)
 *     na primeira barra remota (4.7.1 a)
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});

  const TYPES = { phase: { fault: '3F', label: 'trifásico' }, ground: { fault: 'FT', label: 'fase-terra' } };

  function relayTime(group, Iph, Ir, o) {
    const PR = SH.protection;
    const inst = o.inst !== false;
    const a = PR.staticTime(group, Iph, 'phase', { Mmax: o.Mmax, inst });
    const b = Ir > 0 ? PR.staticTime(group, Ir, 'ground', { Mmax: o.Mmax, inst }) : { t: Infinity, el: null };
    let best = a.t <= b.t ? a : b;
    if (o.backupAdder != null && isFinite(best.t)) {
      // seletividade lógica estendida ao 51: só resta a 51 de retaguarda (+ somador)
      const c = PR.staticTime(group, Iph, 'phase', { Mmax: o.Mmax, inst: false });
      const d = Ir > 0 ? PR.staticTime(group, Ir, 'ground', { Mmax: o.Mmax, inst: false }) : { t: Infinity };
      const t = Math.min(c.t, d.t) + o.backupAdder;
      best = { t, el: 'B51' };
    }
    return best;
  }

  /**
   * opts: { sl, slBlocks51, backupAdder, busInst50, breakerTime, Mmax }
   * Devolve { pairs: [...], sensitivity: [...] }.
   */
  function check(model, opts = {}) {
    const N = SH.network;
    const SC = SH.shortcircuit;
    const PR = SH.protection;
    const o = Object.assign({ sl: false, slBlocks51: false, backupAdder: 0.2, busInst50: false, breakerTime: 0.05, Mmax: 30 }, opts);
    const chains = model.scn.coordination || [];
    const pairs = [];
    const sensitivity = [];
    chains.forEach((ch) => {
      const st = N.normalState(model);
      Object.entries(ch.state || {}).forEach(([k, v]) => { st.sw[k].closed = v; });
      const topo = N.analyze(model, st);
      const group = (dev) => PR.selectGroup(model.relays[model.switches[dev].relay], topo.sw[dev].up, null);
      const devs = ch.devices;
      const cur = (segs) => SC.pathFault(model, ch.source, segs);
      // pares: proteção geral de barra x alimentador e cada par ao longo do alimentador
      const list = [];
      if (ch.bus) list.push({ up: ch.bus, down: devs[0], points: [{ where: `barra ${devs[0].label || devs[0].dev}`, segs: devs[0].at }] });
      for (let i = 1; i < devs.length; i++) {
        const end = devs[i + 1] ? devs[i + 1].at : ch.end;
        list.push({ up: devs[i - 1], down: devs[i], points: [
          { where: `barra ${devs[i].dev}`, segs: devs[i].at },
          { where: `fim da zona de ${devs[i].dev}`, segs: end },
        ] });
      }
      list.forEach((p) => {
        const isBus = p.up === ch.bus;
        const gU = group(p.up.dev);
        const gD = group(p.down.dev);
        const cfgU = model.relays[model.switches[p.up.dev].relay];
        p.points.forEach((pt) => {
          const r = cur(pt.segs);
          Object.entries(TYPES).forEach(([kind, tp]) => {
            const Iph = kind === 'phase' ? r.i3f : r.ift;
            const Ir = kind === 'phase' ? 0 : r.ift;
            const tD = relayTime(gD, Iph, Ir, { Mmax: o.Mmax });
            if (!isFinite(tD.t)) return;
            // 50 do montante: bloqueado no esquema convencional da barra (Anexo B) e,
            // com seletividade lógica, bloqueado pelo GOOSE do relé a jusante que partiu
            const up50 = (cfgU.inst50Scheme ? o.busInst50 : true) && !o.sl;
            const tU = relayTime(gU, Iph, Ir, { Mmax: o.Mmax, inst: up50, backupAdder: o.sl && o.slBlocks51 ? o.backupAdder : null });
            const margin = tU.t - tD.t;
            const crit = isBus ? 0.4 : 0.3;
            let status = 'ok';
            if (!(margin > o.breakerTime)) status = 'descoordenado';
            else if (margin < crit) status = 'abaixo do critério';
            pairs.push({
              chain: ch.id, up: p.up.dev, down: p.down.dev, where: pt.where, kind, fault: tp.fault, I: Iph,
              tDown: tD.t, elDown: tD.el, tUp: tU.t, elUp: tU.el, margin, criterion: crit, status,
            });
          });
        });
      });
      // sensibilidade de cada relé do alimentador até a primeira barra remota
      devs.forEach((d, i) => {
        const remote = devs[i + 1] ? devs[i + 1].at : ch.end;
        const r = cur(remote);
        const g = group(d.dev);
        const mP = g.phase && g.phase.pickup ? r.i2f / g.phase.pickup : null;
        const mN = g.ground && g.ground.pickup ? r.ift / g.ground.pickup : null;
        sensitivity.push({
          chain: ch.id, dev: d.dev, remote: devs[i + 1] ? `barra ${devs[i + 1].dev}` : ch.endLabel,
          i2f: r.i2f, ift: r.ift, mPhase: mP, mGround: mN, okPhase: mP == null || mP >= 2.4, okGround: mN == null || mN >= 4.0,
        });
      });
    });
    return { pairs, sensitivity };
  }

  const api = { check };
  SH.coordination = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
