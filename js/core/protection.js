/*
 * Modelo dos relés de sobrecorrente (SEL-751 no TCC).
 *
 * Elementos por relé (ANSI):
 *   50P / 51P  sobrecorrente de fase instantânea (tempo definido) e temporizada
 *   50N / 51N  idem para a corrente residual (3I0)
 *   51B        51 de retaguarda opcional com somador de tempo constante
 *              (solução "Phase TOC + 200 ms" do TCC, seção 5.7.3)
 *   79         religamento automático com contagem de tentativas
 *   50BF       falha de disjuntor (tratada no simulador)
 *
 * Curva de tempo inverso (Eq. 2.2 e Tab. 2.1 do TCC, IEC 60255 e IEEE C37.112):
 *   t = TD · (β / (M^α − 1) + L),  M = I / Ipickup  (L = 0 nas curvas IEC)
 * O múltiplo M é limitado a Mmax (30 por padrão). Os coordenogramas do TCC
 * (Figs. 4.9 a 4.13) mostram a curva 51N achatada a partir de M ≈ 30, o que
 * é coerente com essa limitação.
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});

  const CURVES = {
    NI: { name: 'IEC Normalmente Inversa', beta: 0.14, alpha: 0.02 },
    MI: { name: 'IEC Muito Inversa', beta: 13.5, alpha: 1 },
    VI: { name: 'IEC Muito Inversa', beta: 13.5, alpha: 1 },
    EI: { name: 'IEC Extremamente Inversa', beta: 80, alpha: 2 },
    LI: { name: 'IEC Inversa Longa', beta: 120, alpha: 1 },
    // IEEE C37.112 (Tab. 2.1 do TCC). Na tabela do TCC a curva moderadamente
    // inversa aparece com α = 2 e L = 0,18; os valores da norma são 0,02 e 0,114.
    IEEE_MI: { name: 'IEEE Moderadamente Inversa', beta: 0.0515, alpha: 0.02, L: 0.114 },
    IEEE_VI: { name: 'IEEE Muito Inversa', beta: 19.61, alpha: 2, L: 0.491 },
    IEEE_EI: { name: 'IEEE Extremamente Inversa', beta: 28.2, alpha: 2, L: 0.1217 },
  };

  /** Tempo de operação (s): t = TD · (β / (M^α − 1) + L); Infinity se não houver partida. */
  function curveTime(curve, dial, M, Mmax = 30) {
    if (!(M > 1)) return Infinity;
    const c = CURVES[curve] || CURVES.MI;
    const m = Math.min(M, Mmax);
    return dial * (c.beta / (Math.pow(m, c.alpha) - 1) + (c.L || 0));
  }

  /**
   * Converte a notação de ciclo do TCC em sequência de operações.
   * "1I+2T" -> ['I','T','T'] (1 operação com 50 habilitado e 2 temporizadas)
   * "3I"    -> ['I','I','I'];  "Bloqueado" -> ['I'] sem religamento.
   * O número de religamentos é (operações − 1).
   */
  function parseCycle(cycle) {
    if (Array.isArray(cycle)) return cycle.slice();
    if (!cycle || /bloq/i.test(cycle)) return ['I'];
    const ops = [];
    String(cycle).split('+').forEach((part) => {
      const m = part.trim().match(/^(\d+)\s*([IT])$/i);
      if (m) for (let i = 0; i < Number(m[1]); i++) ops.push(m[2].toUpperCase());
    });
    return ops.length ? ops : ['I'];
  }

  function cycleLabel(ops) {
    const out = [];
    let i = 0;
    while (i < ops.length) {
      let j = i;
      while (j < ops.length && ops[j] === ops[i]) j++;
      out.push(`${j - i}${ops[i]}`);
      i = j;
    }
    return out.join('+');
  }

  const ELEMENTS = ['P50', 'P51', 'N50', 'N51', 'B51'];
  const EL_LABEL = {
    P50: '50P (fase, tempo definido)',
    P51: '51P (fase, tempo inverso)',
    N50: '50N (neutro, tempo definido)',
    N51: '51N (neutro, tempo inverso)',
    B51: '51 de retaguarda (+ somador)',
    REMTRIP: 'Trip remoto por 50BF (GOOSE)',
    MANUAL: 'Comando manual',
  };

  /** Estado dinâmico de um relé durante a simulação. */
  function createRelayRuntime(id, cfg, group) {
    const ops = parseCycle(cfg.cycle);
    const dead = Array.isArray(cfg.deadTime) ? cfg.deadTime.slice() : new Array(Math.max(ops.length - 1, 0)).fill(cfg.deadTime || 10);
    return {
      id,
      cfg,
      group,
      ops,
      dead,
      shot: 0,
      acc: { P51: 0, N51: 0, B51: 0 },
      lastTop: { P51: Infinity, N51: Infinity, B51: Infinity },
      t50: { P50: null, N50: null },
      lastT: 0,
      pick: { P50: false, P51: false, N50: false, N51: false },
      blockedBy: {},
      tripped: false,
      lockout: false,
      everPicked: false,
      maxI: 0,
    };
  }

  function isBlocked(rt) {
    return Object.keys(rt.blockedBy).length > 0;
  }

  /**
   * Atualiza o relé no instante t com as correntes vistas (A primários) e
   * devolve o próximo trip previsto { t, el } ou null.
   *
   * opts: { Mmax, sl, slBlocks51, inst50Enabled, backupAdder }
   *  - os elementos de tempo definido ficam inibidos quando o relé recebe
   *    bloqueio por seletividade lógica (torque control "NOT (VB004 OR VB005)");
   *  - com slBlocks51, o 51 também é inibido e o 51B (retaguarda) assume;
   *  - o 50/50N só fica habilitado nas operações marcadas com "I" no ciclo.
   */
  function updateRelay(rt, t, Iph, Ir, opts) {
    const g = rt.group;
    const Mmax = opts.Mmax || 30;
    // integra o progresso das curvas inversas desde a última atualização
    ['P51', 'N51', 'B51'].forEach((el) => {
      if (isFinite(rt.lastTop[el])) rt.acc[el] += (t - rt.lastT) / rt.lastTop[el];
    });
    rt.lastT = t;

    const blocked = opts.sl && isBlocked(rt);
    const opIsInst = rt.ops[Math.min(rt.shot, rt.ops.length - 1)] === 'I';
    const en50 = opIsInst && opts.inst50Enabled !== false;
    rt.maxI = Math.max(rt.maxI, Iph);

    const P = g.phase || {};
    const N = g.ground || {};
    const pickNow = {
      P51: P.pickup > 0 && Iph > P.pickup,
      P50: P.inst > 0 && Iph > P.inst,
      N51: N.pickup > 0 && Ir > N.pickup,
      N50: N.inst > 0 && Ir > N.inst,
    };
    if (pickNow.P51 || pickNow.P50 || pickNow.N51 || pickNow.N50) rt.everPicked = true;
    rt.pick = pickNow;

    const cand = [];
    // Elementos de tempo definido (50P / 50N)
    [['P50', P, Iph], ['N50', N, Ir]].forEach(([el, s, I]) => {
      const active = pickNow[el] && en50 && !blocked && s.inst > 0;
      if (!active) { rt.t50[el] = null; return; }
      if (rt.t50[el] == null) rt.t50[el] = t;
      cand.push({ t: rt.t50[el] + (s.instDelay || 0) + (opts.relayDelay || 0), el });
    });
    // Elementos de tempo inverso (51P / 51N)
    [['P51', P, Iph], ['N51', N, Ir]].forEach(([el, s, I]) => {
      const inhibited = blocked && opts.slBlocks51;
      if (!pickNow[el] || inhibited) { rt.acc[el] = 0; rt.lastTop[el] = Infinity; return; }
      const top = curveTime(s.curve, s.dial, I / s.pickup, Mmax);
      rt.lastTop[el] = top;
      cand.push({ t: t + Math.max(0, 1 - rt.acc[el]) * top, el });
    });
    // 51 de retaguarda (só existe quando o bloqueio se estende ao 51)
    if (opts.slBlocks51 && opts.backupAdder != null && pickNow.P51) {
      const top = curveTime(P.curve, P.dial, Iph / P.pickup, Mmax) + opts.backupAdder;
      rt.lastTop.B51 = top;
      cand.push({ t: t + Math.max(0, 1 - rt.acc.B51) * top, el: 'B51' });
    } else {
      rt.acc.B51 = 0;
      rt.lastTop.B51 = Infinity;
    }
    if (!cand.length) return null;
    cand.sort((a, b) => a.t - b.t);
    return cand[0];
  }

  /** Reinicia acumuladores (disjuntor aberto, corrente nula). */
  function resetElements(rt) {
    rt.acc = { P51: 0, N51: 0, B51: 0 };
    rt.lastTop = { P51: Infinity, N51: Infinity, B51: Infinity };
    rt.t50 = { P50: null, N50: null };
    rt.pick = { P50: false, P51: false, N50: false, N51: false };
  }

  function anyPickup(rt) {
    return rt.pick.P50 || rt.pick.P51 || rt.pick.N50 || rt.pick.N51;
  }

  /**
   * Tempo de atuação estático (sem integração), útil para tabelas e para o
   * coordenograma: devolve o menor tempo entre os elementos habilitados.
   */
  function staticTime(group, I, kind = 'phase', opts = {}) {
    const s = kind === 'phase' ? group.phase : group.ground;
    if (!s) return { t: Infinity, el: null };
    const Mmax = opts.Mmax || 30;
    let best = { t: Infinity, el: null };
    if (s.pickup > 0 && I > s.pickup) {
      const t = curveTime(s.curve, s.dial, I / s.pickup, Mmax);
      if (t < best.t) best = { t, el: kind === 'phase' ? 'P51' : 'N51' };
    }
    if (opts.inst !== false && s.inst > 0 && I > s.inst) {
      const t = s.instDelay || 0;
      if (t < best.t) best = { t, el: kind === 'phase' ? 'P50' : 'N50' };
    }
    return best;
  }

  /**
   * Seleção automática do grupo de ajuste (função do SIAP no projeto Aquiraz).
   * Cada grupo pode ter uma condição "when":
   *   - upstreamNode: o relé está energizado a partir deste terminal
   *     (identifica o sentido de alimentação, ex.: RL3 grupo 1 ou 2 no TCC);
   *   - cause: lista de contingências, ex. ['fault:T7', 'loss:AQZ'] (Nobre, 2013).
   * Sem condição satisfeita, usa o primeiro grupo sem "when" (operação normal)
   * ou, na falta dele, o primeiro grupo da lista.
   */
  function selectGroup(cfg, upNode, ctx) {
    const groups = cfg.groups || [];
    const cause = ctx && ctx.cause;
    for (const g of groups) {
      if (!g.when) continue;
      let ok = true;
      if (g.when.upstreamNode) ok = ok && upNode === g.when.upstreamNode;
      if (g.when.cause) ok = ok && !!cause && g.when.cause.includes(cause);
      if (ok) return g;
    }
    return groups.find((g) => !g.when) || groups[0];
  }

  const api = {
    CURVES, ELEMENTS, EL_LABEL, curveTime, parseCycle, cycleLabel, createRelayRuntime,
    updateRelay, resetElements, anyPickup, isBlocked, staticTime, selectGroup,
  };
  SH.protection = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
