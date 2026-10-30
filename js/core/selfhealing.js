/*
 * Sistema de Recomposição Automática (SRA), também chamado de self-healing ou
 * FLISR (Fault Location, Isolation and Service Restoration).
 *
 * Etapas, na ordem em que o SRA as executa:
 *   1. Localização: a zona sob falta é a zona logo a jusante do relé mais a
 *      jusante que registrou partida (indicador de passagem de falta).
 *   2. Isolamento: abrem-se todas as chaves de fronteira da zona sob falta.
 *      Se uma chave de fronteira estiver travada (falha de disjuntor), a zona
 *      vizinha passa a fazer parte da área isolada. Barramentos de SE sem
 *      fonte também são isolados e nunca são reenergizados pela rede.
 *   3. Restauração: para cada ilha sã desenergizada, testam-se as chaves
 *      normalmente abertas (encontros) que a ligam a uma parte energizada,
 *      combinadas com a abertura de chaves internas (divisão da ilha).
 *      Critério de escolha (Nobre, 2013; Rodrigues, 2015): restabelecer a maior
 *      carga possível sem ultrapassar a ampacidade dos trechos. Também se exige
 *      que a corrente de carga fique abaixo do pickup de fase dos relés, para que
 *      a proteção não atue na recomposição. Empates: menos manobras, depois maior
 *      folga de ampacidade.
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});
  const N = SH.network || require('./network.js');
  const PR = SH.protection || require('./protection.js');

  function zoneEnergized(zone, topo) {
    return zone.nodes.some((n) => !!topo.node[n]);
  }

  /** Avalia uma configuração candidata (viabilidade e folgas). */
  function evaluateConfig(model, st, ctx, opts = {}, baseFlows = null) {
    const topo = N.analyze(model, st);
    const reasons = [];
    if (topo.conflicts.length) {
      reasons.push('a manobra fecharia malha ou colocaria fontes em paralelo');
      return { ok: false, reasons, topo };
    }
    const flows = N.computeFlows(model, topo, opts);
    let minMargin = Infinity;
    Object.values(model.segments).forEach((s) => {
      const f = flows.segFlow[s.id];
      if (!f || !s.amp) return;
      const margin = s.amp - f.upper;
      // folga avaliada só nos trechos cuja corrente aumentou com a manobra
      const before = baseFlows && baseFlows.segFlow[s.id] ? baseFlows.segFlow[s.id].upper : 0;
      if (!baseFlows || f.upper > before + 1e-6) minMargin = Math.min(minMargin, margin);
      if (margin < -1e-9) reasons.push(`${s.label || s.id} com ${f.upper.toFixed(0)} A > ampacidade de ${s.amp} A`);
    });
    Object.values(model.switches).forEach((w) => {
      if (!w.relay || !topo.sw[w.id].carrying) return;
      const cfg = model.relays[w.relay];
      if (!cfg) return;
      const g = PR.selectGroup(cfg, topo.sw[w.id].up, ctx);
      const I = flows.swFlow[w.id] || 0;
      if (g && g.phase && g.phase.pickup > 0 && I >= g.phase.pickup) {
        reasons.push(`carga de ${I.toFixed(0)} A em ${w.label || w.id} acima do pickup de fase (${g.phase.pickup} A)`);
      }
    });
    if (opts.checkVoltage) {
      const vmin = opts.vmin || 0.93;
      const low = Object.entries(flows.volt).filter(([, v]) => v < vmin);
      if (low.length) {
        const worst = low.reduce((a, b) => (a[1] < b[1] ? a : b));
        reasons.push(`tensão mínima de ${worst[1].toFixed(3)} pu abaixo de ${vmin} pu`);
      }
    }
    return { ok: reasons.length === 0, reasons, topo, flows, served: flows.served, minMargin };
  }

  function subsetsOf(arr, maxSize) {
    const out = [[]];
    if (arr.length > 10) {
      arr.forEach((x) => out.push([x]));
      return out;
    }
    const n = arr.length;
    for (let mask = 1; mask < 1 << n; mask++) {
      const s = [];
      for (let i = 0; i < n; i++) if (mask & (1 << i)) s.push(arr[i]);
      if (s.length <= maxSize) out.push(s);
    }
    return out;
  }

  /**
   * Localiza a zona sob falta a partir dos indicadores de partida.
   * indicatorPath: dispositivos no caminho da corrente de falta, de jusante
   * para montante, com a informação de partida de cada um.
   */
  function locateFault(model, indicatorPath) {
    const picked = indicatorPath.filter((d) => d.picked);
    if (!picked.length) return null;
    const deepest = picked[0];
    const zoneId = model.zones.nodeZone[deepest.downNode];
    return { zoneId, relay: deepest.id };
  }

  /**
   * Monta o plano de manobras do SRA.
   * ctx = { type: 'fault' | 'sourceLoss', faultZone, source, cause, relay }
   */
  function plan(model, netState, ctx, opts = {}) {
    const st = N.cloneState(netState);
    const zones = model.zones.byId;
    const nodeZone = model.zones.nodeZone;
    const steps = [];
    const notes = [];
    const siapCtx = { cause: ctx.cause };

    // 1) Localização e área isolada
    const faulted = new Set();
    if (ctx.type === 'fault' && ctx.faultZone) {
      faulted.add(ctx.faultZone);
      const z = zones[ctx.faultZone];
      notes.push({ stage: 'localizacao', text: `Falta localizada na zona ${z.label} (último indicador de partida: ${ctx.relay}).` });
      // expansão por chaves travadas (falha de disjuntor)
      let grew = true;
      while (grew) {
        grew = false;
        [...faulted].forEach((zid) => {
          zones[zid].switches.forEach((sw) => {
            if (!st.sw[sw].stuck || !st.sw[sw].closed) return;
            const w = model.switches[sw];
            [nodeZone[w.a], nodeZone[w.b]].forEach((oz) => {
              if (!faulted.has(oz)) {
                faulted.add(oz);
                grew = true;
                notes.push({ stage: 'localizacao', text: `${w.label || w.id} não abre (falha de disjuntor): a zona ${zones[oz].label} fica junto da área sob falta.` });
              }
            });
          });
        });
      }
    } else if (ctx.type === 'sourceLoss') {
      notes.push({ stage: 'localizacao', text: `Perda da ${model.sources[ctx.source].name}.` });
    }

    // 2) Isolamento
    let topo = N.analyze(model, st);
    const toOpen = new Set();
    faulted.forEach((zid) => {
      zones[zid].switches.forEach((sw) => {
        if (st.sw[sw].closed && !st.sw[sw].stuck) toOpen.add(sw);
      });
    });
    // barramentos de SE desenergizados não são reenergizados pela rede
    Object.values(zones).forEach((z) => {
      if (!z.isBus || faulted.has(z.id)) return;
      const hasLiveSource = z.sourceIds.some((s) => st.srcOn[s]);
      if (hasLiveSource || zoneEnergized(z, topo)) return;
      z.switches.forEach((sw) => {
        if (st.sw[sw].closed && !st.sw[sw].stuck) toOpen.add(sw);
      });
      if (z.switches.some((sw) => st.sw[sw].closed)) {
        notes.push({ stage: 'isolamento', text: `Barramento ${z.label} sem fonte: seus disjuntores são abertos para não ser reenergizado pela rede.` });
      }
    });
    toOpen.forEach((sw) => {
      st.sw[sw].closed = false;
      steps.push({ action: 'open', sw, stage: 'isolamento', text: `Abrir ${model.switches[sw].label || sw} (isolamento)` });
    });
    topo = N.analyze(model, st);

    const isRestorableZone = (z) => !faulted.has(z.id) && !z.isBus && z.segments.length > 0;

    // 3) Restauração iterativa
    const explanations = [];
    const explain = (txt) => { if (!explanations.includes(txt)) explanations.push(txt); };
    for (let iter = 0; iter < 12; iter++) {
      topo = N.analyze(model, st);
      const dead = Object.values(zones).filter((z) => isRestorableZone(z) && !zoneEnergized(z, topo));
      if (!dead.length) break;
      const deadSet = new Set(dead.map((z) => z.id));
      // ilhas: zonas mortas ligadas por chaves fechadas
      const seen = new Set();
      const islands = [];
      dead.forEach((z) => {
        if (seen.has(z.id)) return;
        const isl = [];
        const q = [z.id];
        seen.add(z.id);
        while (q.length) {
          const zid = q.shift();
          isl.push(zid);
          zones[zid].switches.forEach((sw) => {
            if (!st.sw[sw].closed) return;
            const w = model.switches[sw];
            [nodeZone[w.a], nodeZone[w.b]].forEach((oz) => {
              if (deadSet.has(oz) && !seen.has(oz)) { seen.add(oz); q.push(oz); }
            });
          });
        }
        islands.push(isl);
      });

      const baseFlows = N.computeFlows(model, topo, opts);
      const base = baseFlows.served;
      let best = null;
      islands.forEach((isl) => {
        const islSet = new Set(isl);
        const internal = [];
        const ties = [];
        isl.forEach((zid) => {
          zones[zid].switches.forEach((sw) => {
            const w = model.switches[sw];
            const za = nodeZone[w.a];
            const zb = nodeZone[w.b];
            const s = st.sw[sw];
            if (islSet.has(za) && islSet.has(zb)) {
              if (s.closed && !s.stuck && !internal.includes(sw)) internal.push(sw);
              return;
            }
            if (s.closed || s.stuck) return;
            const other = islSet.has(za) ? w.b : w.a;
            const otherZone = islSet.has(za) ? zb : za;
            if (faulted.has(otherZone)) return;
            // Chave bloqueada pela proteção só é fechada se não faz fronteira com
            // a área sob falta (atuação não seletiva; a falta já está isolada).
            if (!topo.node[other]) return;
            if (!ties.includes(sw)) ties.push(sw);
          });
        });
        const islLabel = isl.map((z) => zones[z].label).join(', ');
        const islLoad = isl.reduce((a, z) => a + zones[z].load, 0);
        if (!ties.length) {
          explain(`Ilha ${islLabel} (${islLoad.toFixed(0)} A): nenhuma chave de encontro disponível.`);
          return;
        }
        const subsets = subsetsOf(internal, 4);
        ties.forEach((tie) => {
          subsets.forEach((sub) => {
            const st2 = N.cloneState(st);
            st2.sw[tie].closed = true;
            sub.forEach((sw) => { st2.sw[sw].closed = false; });
            const ev = evaluateConfig(model, st2, siapCtx, opts, baseFlows);
            const gain = ev.ok ? ev.served - base : 0;
            if (sub.length === 0) {
              const tl = model.switches[tie].label || tie;
              explain(ev.ok
                ? `Fechar ${tl}: ilha ${islLabel} (${islLoad.toFixed(0)} A) viável, menor folga de ampacidade ${ev.minMargin.toFixed(0)} A.`
                : `Fechar ${tl}: ilha ${islLabel} (${islLoad.toFixed(0)} A) inviável: ${ev.reasons.join('; ')}.`);
            }
            if (!ev.ok || gain <= 1e-6) return;
            const cand = { tie, sub, gain, ops: sub.length + 1, margin: ev.minMargin, island: islLabel };
            if (!best
              || cand.gain > best.gain + 1e-6
              || (Math.abs(cand.gain - best.gain) <= 1e-6 && (cand.ops < best.ops
                || (cand.ops === best.ops && cand.margin > best.margin)))) best = cand;
          });
        });
      });
      if (!best) break;
      best.sub.forEach((sw) => {
        st.sw[sw].closed = false;
        steps.push({ action: 'open', sw, stage: 'restauracao', text: `Abrir ${model.switches[sw].label || sw} para dividir a ilha` });
      });
      const wasLocked = st.sw[best.tie].locked;
      st.sw[best.tie].closed = true;
      st.sw[best.tie].locked = false;
      steps.push({
        action: 'close', sw: best.tie, stage: 'restauracao',
        text: `${wasLocked ? 'Religar' : 'Fechar'} ${model.switches[best.tie].label || best.tie}${wasLocked ? ' (atuou sem seletividade; a falta já está isolada)' : ''}: restabelece ${best.gain.toFixed(0)} A (folga mínima ${best.margin.toFixed(0)} A)`,
      });
    }

    const finalTopo = N.analyze(model, st);
    const unrestored = Object.values(zones).filter((z) => isRestorableZone(z) && !zoneEnergized(z, finalTopo));
    unrestored.forEach((z) => {
      notes.push({ stage: 'restauracao', text: `Zona ${z.label} (${z.load.toFixed(0)} A) permanece desligada: nenhuma alternativa viável sem violar limites.` });
    });
    return { steps, notes, explanations, faulted: [...faulted], finalState: st, unrestored: unrestored.map((z) => z.id) };
  }

  const api = { evaluateConfig, plan, locateFault };
  SH.selfhealing = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
