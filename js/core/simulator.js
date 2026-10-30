/*
 * Simulador de eventos discretos da proteção e do self-healing.
 *
 * O tempo avança de evento em evento (trip de relé, abertura de disjuntor,
 * chegada de mensagem GOOSE, fim de tempo morto etc.). A cada mudança
 * elétrica, a rede é reanalisada: correntes de falta e de carga são
 * recalculadas e cada relé reprograma seu próximo trip.
 *
 * Convenção de desempate: eventos no mesmo instante são processados na ordem
 * FALTA → TRIP → GOOSE → 50BF → DISJUNTOR → 79 → BLOQUEIO → SRA. Assim, se o
 * temporizador de um relé a montante vence no mesmo instante em que o
 * disjuntor a jusante interrompe a corrente, o relé a montante também atua
 * (margem nula é tratada como descoordenação).
 *
 * O resultado (log, instantâneos e mensagens GOOSE) é consumido pela interface
 * para a animação, e pelos testes automatizados para a validação.
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});
  const N = SH.network || require('./network.js');
  const SC = SH.shortcircuit || require('./shortcircuit.js');
  const PR = SH.protection || require('./protection.js');
  const SR = SH.selfhealing || require('./selfhealing.js');

  const DEFAULTS = {
    breakerTime: 0.05, // tempo de interrupção do disjuntor/religador (3 ciclos)
    gooseLatency: 0.003, // tempo de transferência GOOSE (classe TT6 da IEC 61850-5: ≤ 3 ms)
    sl: false, // seletividade lógica via GOOSE
    bf: false, // falha de disjuntor (50BF) com trip remoto via GOOSE
    bfd: 0.2, // temporizador BFD (TCC, Fig. 5.5)
    bfPickupSec: 0.02, // 50BFP em A secundários (TCC, Fig. 5.5)
    slBlocks51: false, // estende o bloqueio ao 51 (TCC, seção 5.7.3)
    backupAdder: 0.2, // somador do 51 de retaguarda (51ACT = 0,20 s)
    commFail: false, // perda de mensagens GOOSE: false | 'all' | 'SL' | 'BF'
    busInst50: false, // 50/50N da proteção geral de barramento habilitado
    Mmax: 30,
    reclose: true,
    resetTime: 45, // tempo de rearme do 79 (79RSD = 45 s na OAP 165/2013 e no relé AQZ do laboratório)
    relayDelay: 0, // atraso de detecção e processamento do IED nos elementos 50/50N e no 50BF (0 = ideal; ensaios: 13 ms)
    groundElements: true, // false: os relés não medem corrente de neutro (ensaios em que o canal IN não foi injetado)
    instDelayOverrides: {}, // { relé: atraso 50/50N em s }, para reproduzir ajustes de laboratório
    relaysOff: [], // relés fora de serviço (ensaios de um relé isolado na mala)
    slQuality: true, // supervisão da qualidade da mensagem (Fig. 3.8): sem GOOSE de bloqueio, o 50 a montante fica bloqueado
    sra: true,
    sraDelay: 2, // tempo de decisão do SRA após o último bloqueio
    sraStep: 1, // intervalo entre manobras telecomandadas
    pf: 0.92,
    vmin: 0.93,
    checkVoltage: false,
    tmax: 300,
    cycleOverrides: {}, // { relé: ['I','T','T'] }
    deadOverrides: {}, // { relé: segundos ou lista }
  };

  const PRIO = { fault: 0, script: 0, trip: 1, goose: 2, bf: 3, breaker: 4, reclose: 5, reset: 5, lockout: 6, sra: 7, end: 9 };

  function round6(t) { return Math.round(t * 1e6) / 1e6; }

  /**
   * Executa uma simulação.
   * input = {
   *   state: estado inicial das chaves/fontes (opcional; padrão = operação normal),
   *   stuck: [chaves com falha de abertura],
   *   script: [{ t, type: 'fault'|'faultOff'|'sourceLoss'|'sourceOn'|'open'|'close', ... }],
   *   options: substitui DEFAULTS,
   *   cause: contexto SIAP inicial
   * }
   */
  function run(model, input = {}) {
    const opt = Object.assign({}, DEFAULTS, input.options || {});
    const st = input.state ? N.cloneState(input.state) : N.normalState(model);
    (input.stuck || []).forEach((sw) => { if (st.sw[sw]) st.sw[sw].stuck = true; });

    const log = [];
    const snaps = [];
    const goose = [];
    const queue = [];
    let seq = 0;
    let now = 0;
    let fault = null; // { spec, active, temporary, everEnergized }
    let siapCtx = { cause: input.cause || null };
    let sraPending = null;
    let sraRunning = false;
    let sraCtx = null;
    let indicatorPath = null;
    let lastFaultInfo = null;
    const metrics = { faultAt: null, clearedAt: null, firstClear: null, firstTrip: null, sraStart: null, sraEnd: null, unservedPeak: 0, timeline: [] };

    // ----- relés -----
    const relays = {};
    const topo0 = N.analyze(model, st);
    Object.values(model.switches).forEach((w) => {
      if (!w.relay) return;
      const cfg = Object.assign({}, model.relays[w.relay]);
      if (opt.cycleOverrides[w.relay]) cfg.cycle = opt.cycleOverrides[w.relay];
      if (opt.deadOverrides[w.relay] != null) cfg.deadTime = opt.deadOverrides[w.relay];
      if (opt.instDelayOverrides[w.relay] != null) {
        const d = opt.instDelayOverrides[w.relay];
        cfg.groups = cfg.groups.map((g) => Object.assign({}, g, {
          phase: g.phase && Object.assign({}, g.phase, { instDelay: d }),
          ground: g.ground && Object.assign({}, g.ground, { instDelay: d }),
        }));
      }
      const g = PR.selectGroup(cfg, topo0.sw[w.id].up, siapCtx);
      const rt = PR.createRelayRuntime(w.relay, cfg, g);
      rt.sw = w.id;
      rt.pending = null; // { t, el, token }
      rt.slTarget = null;
      rt.bfToken = null;
      rt.resetToken = null;
      rt.trips = 0;
      relays[w.relay] = rt;
    });
    const relayOfSw = (sw) => model.switches[sw].relay;
    const swLabel = (sw) => model.switches[sw].label || sw;

    function push(t, type, data = {}) {
      queue.push({ t: round6(t), type, data, prio: PRIO[data.prioKey || type] != null ? PRIO[data.prioKey || type] : 5, seq: seq++ });
    }
    function addLog(cat, text, extra = {}) {
      log.push(Object.assign({ t: now, cat, text }, extra));
    }
    // Fig. 3.8: com a mensagem de bloqueio indisponível (qualidade = 1), o relé que a
    // recebe inibe o próprio 50 para não perder a seletividade.
    const slQualityFail = opt.sl && opt.slQuality !== false && (opt.commFail === true || opt.commFail === 'all' || opt.commFail === 'SL');
    let slSubscribers = new Set();
    const relaysOff = new Set(opt.relaysOff || []);
    function relayOpts(rt) {
      const base50 = rt.cfg.inst50Scheme ? opt.busInst50 : true;
      return {
        Mmax: opt.Mmax,
        sl: opt.sl,
        slBlocks51: opt.sl && opt.slBlocks51,
        backupAdder: opt.slBlocks51 ? opt.backupAdder : null,
        inst50Enabled: base50 && !(slQualityFail && slSubscribers.has(rt.id)),
        relayDelay: opt.relayDelay || 0,
      };
    }

    // ----- análise elétrica e atualização dos relés -----
    let lastTopo = null;
    let lastFlows = null;
    let lastFault = null;
    function evaluate() {
      const topo = N.analyze(model, st);
      const flows = N.computeFlows(model, topo, opt);
      let fr = null;
      let pathDevs = [];
      if (fault && fault.active) {
        fr = SC.analyzeFault(model, topo, fault.spec);
        if (fr.energized) {
          fault.everEnergized = true;
          pathDevs = N.protectiveDevicesUpstream(model, topo, fr.upNode);
        } else if (fault.temporary && fault.everEnergized) {
          fault.active = false;
          addLog('falta', 'Falta temporária extinta: o trecho ficou desenergizado durante o tempo morto.');
          fr = null;
        }
      }
      if (fault && fault.active && fr && fr.energized) {
        lastFaultInfo = { phase: fr.phase, residual: fr.residual, std: fr.std, src: fr.src };
      }
      const inPath = new Set(pathDevs);
      if (slQualityFail) {
        slSubscribers = new Set();
        Object.values(relays).forEach((r) => {
          if (!st.sw[r.sw].closed || !topo.sw[r.sw].carrying) return;
          const up = N.upstreamDeviceOf(model, topo, r.sw);
          if (up && relayOfSw(up)) slSubscribers.add(relayOfSw(up));
        });
      }

      Object.values(relays).forEach((rt) => {
        const sw = rt.sw;
        const s = st.sw[sw];
        const info = topo.sw[sw];
        // seleção automática de grupo de ajuste (SIAP)
        const g = PR.selectGroup(rt.cfg, info.up, siapCtx);
        if (g && g !== rt.group) {
          const wasUsed = rt.group && rt.cfg.groups.length > 1;
          rt.group = g;
          PR.resetElements(rt);
          if (wasUsed && info.carrying) addLog('siap', `${swLabel(sw)}: grupo de ajuste "${g.name}" ativado.`, { dev: sw });
        }
        let Iph = 0;
        let Ir = 0;
        if (s.closed && info.carrying) {
          if (inPath.has(sw)) { Iph = fr.phase; Ir = fr.residual; } else { Iph = flows.swFlow[sw] || 0; }
        }
        if (opt.groundElements === false) Ir = 0;
        if (relaysOff.has(rt.id)) { Iph = 0; Ir = 0; }
        const prevPick = PR.anyPickup(rt);
        let next = null;
        if (Iph > 0 || Ir > 0) next = PR.updateRelay(rt, now, Iph, Ir, relayOpts(rt));
        else { PR.resetElements(rt); rt.lastT = now; }
        rt.I = Iph;
        rt.Ir = Ir;
        const newPick = PR.anyPickup(rt);
        if (newPick && !prevPick) {
          const els = Object.entries(rt.pick).filter(([, v]) => v).map(([k]) => k).join(', ');
          addLog('partida', `${swLabel(sw)}: partida (${els}) com I = ${Iph.toFixed(0)} A${Ir > 0 ? `, 3I0 = ${Ir.toFixed(0)} A` : ''}.`, { dev: sw });
        }
        // seletividade lógica: o relé sensibilizado bloqueia o relé a montante
        if (opt.sl && newPick !== prevPick) {
          if (newPick) {
            const up = N.upstreamDeviceOf(model, topo, sw);
            if (up) {
              rt.slTarget = relayOfSw(up);
              sendGoose(rt.id, rt.slTarget, 'SL', true);
            }
          } else if (rt.slTarget) {
            sendGoose(rt.id, rt.slTarget, 'SL', false);
            rt.slTarget = null;
          }
        }
        // (re)programação do trip
        if (rt.tripped || rt.lockout && !s.closed) {
          rt.pending = null;
        } else if (next) {
          const tt = round6(Math.max(next.t, now));
          if (!rt.pending || rt.pending.t !== tt || rt.pending.el !== next.el) {
            rt.pending = { t: tt, el: next.el, token: seq };
            push(tt, 'trip', { relay: rt.id, el: next.el, token: rt.pending.token });
          }
        } else {
          rt.pending = null;
        }
      });

      // indicadores de passagem de falta (para a localização pelo SRA)
      if (fault && fault.active && fr && fr.energized) {
        const path = pathDevs.map((sw) => ({ id: sw, picked: relays[relayOfSw(sw)].everPicked, downNode: topo.sw[sw].down }));
        if (!indicatorPath || path.length >= indicatorPath.length) indicatorPath = path;
        else path.forEach((p) => { const o = indicatorPath.find((x) => x.id === p.id); if (o) o.picked = o.picked || p.picked; });
      }
      lastTopo = topo;
      lastFlows = flows;
      lastFault = fr;
      metrics.unservedPeak = Math.max(metrics.unservedPeak, flows.unserved);
      const tl = metrics.timeline;
      if (!tl.length || tl[tl.length - 1].unserved !== flows.unserved) tl.push({ t: now, unserved: flows.unserved, served: flows.served });
      const faultCurrentNow = !!(fault && fault.active && fr && fr.energized);
      if (fault && metrics.faultAt != null) {
        if (faultCurrentNow) metrics.clearedAt = null;
        else if (metrics.clearedAt == null) {
          metrics.clearedAt = now;
          if (metrics.firstClear == null) metrics.firstClear = now;
        }
      }
    }

    function sendGoose(fromRelay, toRelay, kind, value) {
      const fromSw = relays[fromRelay].sw;
      const toSw = relays[toRelay].sw;
      // commFail: false | true/'all' (todas as mensagens) | 'SL' | 'BF'
      const lost = opt.commFail === true || opt.commFail === 'all' || opt.commFail === kind;
      const ds = kind === 'SL' ? `CFG.LLN0.SL_${swLabel(fromSw)}` : `CFG.LLN0.Trip_50BF_${swLabel(fromSw)}`;
      const ln = kind === 'SL' ? 'PRO.P1TPIOC1/P1TPTOC13/N1TPIOC5/N1TPTOC15.Str.general' : 'PRO.BFR1RBRF1.OpEx.general';
      const msg = { tSend: now, tRecv: now + opt.gooseLatency, from: fromSw, to: toSw, kind, value, dataset: ds, ln, lost };
      goose.push(msg);
      const txt = kind === 'SL'
        ? `GOOSE ${ds} = ${value ? 1 : 0}: ${swLabel(fromSw)} ${value ? 'bloqueia' : 'libera'} ${swLabel(toSw)} (seletividade lógica).`
        : `GOOSE ${ds} = 1: ${swLabel(fromSw)} envia trip por falha de disjuntor para ${swLabel(toSw)}.`;
      addLog('goose', lost ? `${txt} Mensagem perdida (falha de comunicação simulada).` : txt, { dev: fromSw, to: toSw });
      if (!lost) push(now + opt.gooseLatency, 'goose', { msg });
    }

    function snapshot(note) {
      const topo = lastTopo;
      const flows = lastFlows;
      const segs = {};
      Object.values(model.segments).forEach((s) => {
        const info = topo.seg[s.id];
        segs[s.id] = info.energized
          ? { src: info.src, up: info.up, I: flows.segFlow[s.id] ? flows.segFlow[s.id].upper : 0 }
          : null;
      });
      const sws = {};
      Object.values(model.switches).forEach((w) => {
        const s = st.sw[w.id];
        const info = topo.sw[w.id];
        sws[w.id] = { closed: s.closed, stuck: s.stuck, locked: s.locked, carrying: info.carrying, up: info.up, srcA: info.srcA, srcB: info.srcB, I: flows.swFlow[w.id] || 0 };
      });
      const rel = {};
      Object.values(relays).forEach((rt) => {
        rel[rt.id] = {
          pick: PR.anyPickup(rt), tripped: rt.tripped, lockout: rt.lockout, blocked: PR.isBlocked(rt) && opt.sl,
          shot: rt.shot, ops: rt.ops.length, group: rt.group ? rt.group.id : null, groupName: rt.group ? rt.group.name : '',
          reclosingAt: rt.reclosingAt || null, I: rt.I || 0, Ir: rt.Ir || 0,
        };
      });
      const busSrc = {};
      Object.keys(model.nodes).forEach((n) => { if (topo.node[n]) busSrc[n] = topo.node[n].src; });
      let faultPath = null;
      if (fault && fault.active && lastFault && lastFault.energized) {
        const path = N.pathToSource(topo, lastFault.upNode);
        faultPath = { edges: path.map((e) => e.id), I: lastFault.phase, Ir: lastFault.residual };
      }
      snaps.push({
        t: now, sw: sws, seg: segs, relay: rel, node: busSrc, srcOn: Object.assign({}, st.srcOn),
        fault: fault ? { spec: fault.spec, active: fault.active } : null, faultPath,
        served: flows.served, unserved: flows.unserved, logIndex: log.length, note,
      });
    }

    function scheduleSra(ctx) {
      if (!opt.sra) return;
      if (ctx) sraCtx = ctx;
      sraPending = round6(now + opt.sraDelay);
      push(sraPending, 'sra', { kind: 'start', at: sraPending });
    }

    function tripRelay(rt, el) {
      const sw = rt.sw;
      rt.tripped = true;
      rt.pending = null;
      rt.trips++;
      if (metrics.firstTrip == null) metrics.firstTrip = now;
      const elTxt = PR.EL_LABEL[el] || el;
      addLog('trip', `${swLabel(sw)}: TRIP por ${elTxt}${rt.I ? ` (I = ${rt.I.toFixed(0)} A${rt.Ir ? `, 3I0 = ${rt.Ir.toFixed(0)} A` : ''})` : ''}.`, { dev: sw, el });
      rt.lastTripEl = el;
      if (st.sw[sw].stuck) {
        addLog('alerta', `${swLabel(sw)}: o disjuntor não abriu (falha de disjuntor simulada).`, { dev: sw });
      } else {
        push(now + opt.breakerTime, 'breaker', { sw, action: 'open', relay: rt.id, el });
      }
      if (opt.bf && el !== 'MANUAL') {
        rt.bfToken = seq;
        push(now + opt.bfd + (opt.relayDelay || 0), 'bf', { relay: rt.id, token: rt.bfToken });
      }
      if (st.sw[sw].stuck) {
        rt.lockout = true;
        st.sw[sw].locked = true;
        addLog('bloqueio', `${swLabel(sw)}: religamento bloqueado (disjuntor não abriu).`, { dev: sw });
      }
    }

    function doBreaker(sw, action, cause) {
      const s = st.sw[sw];
      if (action === 'open') {
        if (!s.closed) return;
        s.closed = false;
        addLog('disjuntor', `${swLabel(sw)} abriu${cause ? ` (${cause})` : ''}.`, { dev: sw });
      } else {
        if (s.closed) return;
        // intertravamento: não fechar em paralelo entre fontes ou em malha
        const test = N.cloneState(st);
        test.sw[sw].closed = true;
        const tp = N.analyze(model, test);
        if (tp.conflicts.length) {
          addLog('alerta', `Fechamento de ${swLabel(sw)} bloqueado por intertravamento: fecharia malha ou paralelismo entre fontes.`, { dev: sw });
          return false;
        }
        s.closed = true;
        addLog('disjuntor', `${swLabel(sw)} fechou${cause ? ` (${cause})` : ''}.`, { dev: sw });
      }
      return true;
    }

    // ----- roteiro inicial -----
    (input.script || []).forEach((ev) => push(ev.t || 0, 'script', Object.assign({}, ev)));
    evaluate();
    if (relaysOff.size) addLog('info', `Relés fora de serviço neste ensaio: ${[...relaysOff].map((r) => swLabel(relays[r] ? relays[r].sw : r)).join(', ')}.`);
    if (slQualityFail) addLog('info', 'Mensagens de seletividade lógica indisponíveis: pela supervisão da qualidade da mensagem (Fig. 3.8), os relés que as recebem ficam com o 50 bloqueado e atuam pela curva 51.');
    snapshot('Estado inicial');

    // ----- laço principal -----
    let guard = 0;
    while (queue.length && guard++ < 20000) {
      queue.sort((a, b) => a.t - b.t || a.prio - b.prio || a.seq - b.seq);
      const ev = queue.shift();
      if (ev.t > opt.tmax) break;
      now = ev.t;
      const d = ev.data;
      let changed = false;

      if (ev.type === 'script') {
        if (d.type === 'fault') {
          fault = { spec: d.spec, active: true, temporary: !!d.temporary, everEnergized: false };
          Object.values(relays).forEach((rt) => { rt.everPicked = false; rt.maxI = 0; });
          indicatorPath = null;
          metrics.faultAt = now;
          metrics.clearedAt = null;
          const topo = N.analyze(model, st);
          const fr = SC.analyzeFault(model, topo, d.spec);
          const where = d.spec.kind === 'bus'
            ? `no barramento ${model.nodes[d.spec.node].label || d.spec.node}`
            : `no trecho ${model.segments[d.spec.seg].label || d.spec.seg} (${(d.spec.x * 100).toFixed(0)}% do comprimento)`;
          const tipo = SC.FAULT_TYPES[d.spec.type] ? SC.FAULT_TYPES[d.spec.type].label : d.spec.type;
          if (fr.energized) {
            addLog('falta', `Falta ${d.temporary ? 'temporária' : 'permanente'} ${tipo} ${where}: I = ${fr.phase.toFixed(0)} A${fr.residual ? ` (3I0 = ${fr.residual.toFixed(0)} A)` : ''}, alimentada pela ${model.sources[fr.src].name}.`, { seg: d.spec.seg });
          } else {
            addLog('falta', `Falta ${tipo} ${where}: trecho desenergizado, sem corrente de falta.`, { seg: d.spec.seg });
          }
          changed = true;
        } else if (d.type === 'faultOff') {
          if (fault) { fault.active = false; addLog('falta', 'Falta removida.'); changed = true; }
        } else if (d.type === 'sourceLoss') {
          st.srcOn[d.source] = false;
          addLog('falta', `Perda da ${model.sources[d.source].name}: barramento desenergizado.`);
          siapCtx = { cause: `loss:${d.source}` };
          changed = true;
          scheduleSra({ type: 'sourceLoss', source: d.source, cause: `loss:${d.source}` });
        } else if (d.type === 'sourceOn') {
          st.srcOn[d.source] = true;
          addLog('info', `${model.sources[d.source].name} restabelecida.`);
          changed = true;
        } else if (d.type === 'open' || d.type === 'close') {
          const rt = relays[relayOfSw(d.sw)];
          if (d.type === 'close' && rt) {
            rt.tripped = false; rt.lockout = false; st.sw[d.sw].locked = false; rt.shot = 0; PR.resetElements(rt);
          }
          if (doBreaker(d.sw, d.type, 'comando manual')) changed = true;
        }
      } else if (ev.type === 'trip') {
        const rt = relays[d.relay];
        if (!rt.pending || rt.pending.token !== d.token || rt.tripped) continue;
        if (!st.sw[rt.sw].closed) continue;
        tripRelay(rt, d.el);
        changed = true;
      } else if (ev.type === 'goose') {
        const m = d.msg;
        const target = relays[relayOfSw(m.to)];
        if (m.kind === 'SL') {
          if (m.value) target.blockedBy[relayOfSw(m.from)] = true; else delete target.blockedBy[relayOfSw(m.from)];
          changed = true;
        } else if (m.kind === 'BF') {
          if (!target.tripped && st.sw[target.sw].closed) {
            tripRelay(target, 'REMTRIP');
            target.remoteTripped = true;
            changed = true;
          }
        }
      } else if (ev.type === 'bf') {
        const rt = relays[d.relay];
        if (rt.bfToken !== d.token) continue;
        const sw = rt.sw;
        const thr = opt.bfPickupSec * (rt.cfg.rtc || 1);
        const topo = N.analyze(model, st);
        const carrying = st.sw[sw].closed && topo.sw[sw].carrying;
        const Inow = carrying ? (rt.I || 0) : 0;
        if (st.sw[sw].closed && Inow > thr) {
          addLog('50bf', `${swLabel(sw)}: 50BF atuou (corrente de ${Inow.toFixed(0)} A persiste ${(opt.bfd * 1000).toFixed(0)} ms após o trip).`, { dev: sw });
          const up = N.upstreamDeviceOf(model, topo, sw);
          if (up) sendGoose(rt.id, relayOfSw(up), 'BF', true);
          else addLog('alerta', `${swLabel(sw)}: não há proteção a montante modelada para receber o trip remoto.`, { dev: sw });
          changed = true;
        }
      } else if (ev.type === 'breaker') {
        if (d.action === 'open') {
          if (doBreaker(d.sw, 'open', d.el ? 'trip' : undefined)) changed = true;
          const rt = relays[d.relay];
          if (rt) {
            const noReclose = !opt.reclose || d.el === 'REMTRIP' || /bloq/i.test(String(rt.cfg.cycle)) || rt.shot >= rt.ops.length - 1;
            if (noReclose) {
              push(now, 'lockout', { relay: rt.id, why: d.el === 'REMTRIP' ? 'trip remoto por 50BF' : (!opt.reclose || /bloq/i.test(String(rt.cfg.cycle)) ? 'religamento desabilitado' : 'tentativas esgotadas') });
            } else {
              const dt = rt.dead[Math.min(rt.shot, rt.dead.length - 1)] || 10;
              rt.reclosingAt = round6(now + dt);
              addLog('79', `${swLabel(rt.sw)}: tempo morto de ${dt.toFixed(1)} s até o religamento ${rt.shot + 1} de ${rt.ops.length - 1}.`, { dev: rt.sw });
              push(now + dt, 'reclose', { relay: rt.id });
            }
          }
        }
      } else if (ev.type === 'reclose') {
        const rt = relays[d.relay];
        rt.reclosingAt = null;
        if (rt.lockout) continue;
        rt.shot++;
        rt.tripped = false;
        PR.resetElements(rt);
        const nextOp = rt.ops[Math.min(rt.shot, rt.ops.length - 1)];
        if (doBreaker(rt.sw, 'close', `religamento ${rt.shot}`)) {
          addLog('79', `${swLabel(rt.sw)}: religamento ${rt.shot}; próxima operação ${nextOp === 'I' ? 'com 50 habilitado' : 'temporizada (50 bloqueado)'}.`, { dev: rt.sw });
          rt.resetToken = seq;
          push(now + opt.resetTime, 'reset', { relay: rt.id, token: rt.resetToken });
          changed = true;
        }
      } else if (ev.type === 'reset') {
        const rt = relays[d.relay];
        if (rt.resetToken !== d.token || rt.tripped || rt.lockout || !st.sw[rt.sw].closed) continue;
        if (rt.shot > 0) addLog('79', `${swLabel(rt.sw)}: religamento bem-sucedido; contador de tentativas rearmado.`, { dev: rt.sw });
        rt.shot = 0;
        changed = true;
      } else if (ev.type === 'lockout') {
        const rt = relays[d.relay];
        if (rt.lockout && st.sw[rt.sw].locked && d.why !== 'trip remoto por 50BF') { /* já bloqueado */ }
        rt.lockout = true;
        st.sw[rt.sw].locked = true;
        addLog('bloqueio', `${swLabel(rt.sw)}: BLOQUEIO (${d.why}). Disjuntor permanece aberto.`, { dev: rt.sw });
        changed = true;
        if (fault) scheduleSra({ type: 'fault' });
      } else if (ev.type === 'sra') {
        if (d.kind === 'start') {
          if (sraRunning || d.at !== sraPending) continue;
          // espera a proteção terminar (trips, religamentos e 50BF pendentes)
          const busy = Object.values(relays).some((rt) => rt.pending || rt.reclosingAt) || queue.some((q) => ['trip', 'breaker', 'reclose', 'bf', 'goose'].includes(q.type));
          if (busy) { sraPending = round6(now + 0.5); push(sraPending, 'sra', { kind: 'start', at: sraPending }); continue; }
          sraRunning = true;
          metrics.sraStart = now;
          let ctx = sraCtx || { type: 'fault' };
          if (ctx.type === 'fault') {
            const loc = indicatorPath ? SR.locateFault(model, indicatorPath) : null;
            if (!loc) {
              addLog('sra', 'SRA: nenhum indicador de passagem de falta; recomposição não executada.');
              sraRunning = false;
              continue;
            }
            const cause = `fault:${model.zones.byId[loc.zoneId].label}`;
            ctx = { type: 'fault', faultZone: loc.zoneId, relay: swLabel(loc.relay), cause };
          }
          const p = SR.plan(model, st, ctx, opt);
          siapCtx = { cause: ctx.cause };
          addLog('sra', 'SRA iniciado: localização, isolamento e restauração.', { stage: 'inicio' });
          p.notes.filter((n) => n.stage === 'localizacao').forEach((n) => addLog('sra', n.text, { stage: 'localizacao' }));
          p.notes.filter((n) => n.stage === 'isolamento').forEach((n) => addLog('sra', n.text, { stage: 'isolamento' }));
          p.explanations.forEach((x) => addLog('sra', x, { stage: 'analise', minor: true }));
          let tt = now;
          p.steps.forEach((s) => {
            tt += opt.sraStep;
            push(tt, 'sra', { kind: 'action', step: s });
          });
          push(tt + 0.001, 'sra', { kind: 'end', notes: p.notes.filter((n) => n.stage === 'restauracao') });
          if (!p.steps.length) addLog('sra', 'SRA: nenhuma manobra necessária.');
        } else if (d.kind === 'action') {
          const s = d.step;
          const ok = doBreaker(s.sw, s.action, 'SRA');
          if (s.action === 'close' && ok) {
            const rt = relays[relayOfSw(s.sw)];
            if (rt) { rt.tripped = false; rt.lockout = false; st.sw[s.sw].locked = false; rt.shot = 0; }
          }
          addLog('sra', s.text, { stage: s.stage, dev: s.sw });
          changed = true;
        } else if (d.kind === 'end') {
          (d.notes || []).forEach((n) => addLog('sra', n.text, { stage: 'restauracao' }));
          addLog('sra', 'SRA concluído.', { stage: 'fim' });
          metrics.sraEnd = now;
          sraRunning = false;
        }
      }

      if (changed) {
        evaluate();
        snapshot();
      }
    }

    // estado final
    const result = {
      log, snaps, goose, metrics, options: opt,
      finalState: N.cloneState(st),
      faultInfo: lastFaultInfo,
      siapCause: siapCtx.cause,
      relays,
      // instante do último evento relevante (eventos descartados, como rearmes
      // de religadores já bloqueados, não contam)
      endTime: Math.max(log.length ? log[log.length - 1].t : 0, snaps.length ? snaps[snaps.length - 1].t : 0),
    };
    return result;
  }

  const api = { DEFAULTS, run };
  SH.simulator = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
