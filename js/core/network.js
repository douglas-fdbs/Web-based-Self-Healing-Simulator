/*
 * Modelo de rede e processamento topológico.
 *
 * A rede é um grafo de nós ligados por dois tipos de ramo:
 *   - trechos (segments): têm impedância de sequência positiva e zero (pu),
 *     carga concentrada no ponto médio e ampacidade;
 *   - chaves (switches): impedância nula, estado aberto/fechado e, quando são
 *     religadores/disjuntores, um relé associado.
 *
 * A partir do estado das chaves e das fontes disponíveis, analyze() percorre a
 * rede a partir de cada subestação (busca em largura) e determina, para cada nó,
 * a fonte que o alimenta, o ramo pai e a impedância acumulada desde a fonte.
 * Como a operação é radial, isso basta para o cálculo de curto-circuito
 * (soma das impedâncias série, como no TCC, seção 4.5) e do fluxo de carga
 * (soma das correntes a jusante, como na seção 2.5.3 do TCC).
 */
(function (global) {
  'use strict';
  const SH = global.SH || (global.SH = {});
  const C = SH.complex || require('./complex.js');

  /** Constrói o modelo imutável a partir dos dados de um cenário. */
  function buildModel(scn) {
    const base = scn.base;
    const ibase = (base.mva * 1e6) / (Math.sqrt(3) * base.kv * 1e3); // A
    const zbase = (base.kv * base.kv) / base.mva; // ohm
    const nodes = {};
    Object.entries(scn.nodes).forEach(([id, n]) => { nodes[id] = Object.assign({ id }, n); });

    const segments = {};
    scn.segments.forEach((s) => {
      if (!nodes[s.a] || !nodes[s.b]) throw new Error(`Trecho ${s.id}: nó inexistente`);
      segments[s.id] = Object.assign({}, s, {
        z1: C.fromArr(s.z1),
        z0: C.fromArr(s.z0),
        lengthM: (s.cable || []).reduce((acc, p) => acc + p[1], 0),
      });
    });

    const switches = {};
    scn.switches.forEach((w) => {
      if (!nodes[w.a] || !nodes[w.b]) throw new Error(`Chave ${w.id}: nó inexistente`);
      switches[w.id] = Object.assign({}, w);
    });

    Object.keys(switches).forEach((id) => {
      if (segments[id]) throw new Error(`Identificador repetido entre trecho e chave: ${id}`);
    });

    const sources = {};
    scn.sources.forEach((s) => {
      sources[s.id] = Object.assign({}, s, { z1: C.fromArr(s.z1), z0: C.fromArr(s.z0) });
    });

    // Lista de adjacência: nó -> ramos incidentes
    const adj = {};
    Object.keys(nodes).forEach((id) => { adj[id] = []; });
    Object.values(segments).forEach((s) => {
      adj[s.a].push({ type: 'seg', id: s.id, other: s.b });
      adj[s.b].push({ type: 'seg', id: s.id, other: s.a });
    });
    Object.values(switches).forEach((w) => {
      adj[w.a].push({ type: 'sw', id: w.id, other: w.b });
      adj[w.b].push({ type: 'sw', id: w.id, other: w.a });
    });

    const model = { scn, ibase, zbase, nodes, segments, switches, sources, adj, relays: scn.relays };
    model.zones = computeZones(model);
    return model;
  }

  /**
   * Zonas = componentes conexos da rede quando todas as chaves são removidas.
   * Uma falta em qualquer trecho da zona só pode ser isolada abrindo todas as
   * chaves de fronteira da zona.
   */
  function computeZones(model) {
    const parent = {};
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const union = (a, b) => { parent[find(a)] = find(b); };
    Object.keys(model.nodes).forEach((id) => { parent[id] = id; });
    Object.values(model.segments).forEach((s) => union(s.a, s.b));

    const zones = {};
    const nodeZone = {};
    Object.keys(model.nodes).forEach((id) => {
      const r = find(id);
      if (!zones[r]) zones[r] = { id: r, nodes: [], segments: [], switches: [], sourceIds: [] };
      zones[r].nodes.push(id);
      nodeZone[id] = r;
    });
    Object.values(model.segments).forEach((s) => zones[nodeZone[s.a]].segments.push(s.id));
    Object.values(model.switches).forEach((w) => {
      zones[nodeZone[w.a]].switches.push(w.id);
      if (nodeZone[w.b] !== nodeZone[w.a]) zones[nodeZone[w.b]].switches.push(w.id);
    });
    Object.values(model.sources).forEach((src) => zones[nodeZone[src.bus]].sourceIds.push(src.id));

    // Rótulo legível: rótulos dos trechos (ex.: "T7+T10+T11") ou nome do barramento
    Object.values(zones).forEach((z) => {
      const labels = [];
      z.segments.forEach((sid) => {
        const l = model.segments[sid].label || sid;
        if (!labels.includes(l)) labels.push(l);
      });
      if (labels.length) z.label = labels.join('+');
      else {
        const busNode = z.nodes.map((n) => model.nodes[n]).find((n) => n.label);
        z.label = busNode ? busNode.label : z.nodes[0];
      }
      z.isBus = z.segments.length === 0;
      z.load = z.segments.reduce((acc, sid) => acc + (model.segments[sid].load || 0), 0);
    });
    return { byId: zones, nodeZone };
  }

  /** Estado inicial (operação normal) das chaves e fontes. */
  function normalState(model) {
    const sw = {};
    Object.values(model.switches).forEach((w) => {
      sw[w.id] = { closed: w.normal !== 'open', stuck: false, locked: false };
    });
    const srcOn = {};
    Object.keys(model.sources).forEach((id) => { srcOn[id] = true; });
    return { sw, srcOn };
  }

  function cloneState(st) {
    const sw = {};
    Object.entries(st.sw).forEach(([k, v]) => { sw[k] = Object.assign({}, v); });
    return { sw, srcOn: Object.assign({}, st.srcOn) };
  }

  /**
   * Percorre a rede a partir das fontes ligadas, por chaves fechadas.
   * Retorna informações por nó, trecho e chave, além de conflitos
   * (malha ou paralelismo entre fontes), que a operação radial não admite.
   */
  function analyze(model, st) {
    const node = {};
    const order = [];
    const conflicts = [];
    Object.values(model.sources).forEach((src) => {
      if (!st.srcOn[src.id]) return;
      if (node[src.bus]) {
        conflicts.push({ kind: 'paralelo', at: src.bus, sources: [node[src.bus].src, src.id] });
        return;
      }
      node[src.bus] = { src: src.id, parent: null, parentNode: null, z1: src.z1, z0: src.z0, depth: 0 };
      order.push(src.bus);
      const queue = [src.bus];
      while (queue.length) {
        const n = queue.shift();
        model.adj[n].forEach((e) => {
          if (e.type === 'sw' && !st.sw[e.id].closed) return;
          if (node[n].parent && node[n].parent.id === e.id) return;
          const m = e.other;
          if (node[m]) {
            // nó já energizado por outro caminho: malha ou paralelo entre fontes
            const key = e.id;
            if (!conflicts.some((c) => c.edge === key)) {
              conflicts.push({ kind: node[m].src === src.id ? 'malha' : 'paralelo', edge: key, sources: [node[m].src, src.id] });
            }
            return;
          }
          let z1 = node[n].z1;
          let z0 = node[n].z0;
          if (e.type === 'seg') {
            const s = model.segments[e.id];
            z1 = C.add(z1, s.z1);
            z0 = C.add(z0, s.z0);
          }
          node[m] = { src: src.id, parent: e, parentNode: n, z1, z0, depth: node[n].depth + 1 };
          order.push(m);
          queue.push(m);
        });
      }
    });

    const seg = {};
    Object.values(model.segments).forEach((s) => {
      const na = node[s.a];
      const nb = node[s.b];
      if (na && nb) {
        const up = nb.parent && nb.parent.id === s.id ? s.a : s.b;
        seg[s.id] = { energized: true, src: na.src, up, down: up === s.a ? s.b : s.a };
      } else {
        seg[s.id] = { energized: false };
      }
    });

    const sw = {};
    Object.values(model.switches).forEach((w) => {
      const na = node[w.a];
      const nb = node[w.b];
      const closed = st.sw[w.id].closed;
      let up = null;
      if (closed && na && nb) up = nb.parent && nb.parent.id === w.id ? w.a : w.b;
      sw[w.id] = {
        closed,
        energizedA: !!na,
        energizedB: !!nb,
        srcA: na ? na.src : null,
        srcB: nb ? nb.src : null,
        up,
        down: up ? (up === w.a ? w.b : w.a) : null,
        carrying: !!up,
      };
    });
    return { node, order, seg, sw, conflicts };
  }

  /** Ramos do caminho entre um nó e sua fonte (do nó para a fonte). */
  function pathToSource(topo, nodeId) {
    const path = [];
    let n = nodeId;
    while (topo.node[n] && topo.node[n].parent) {
      path.push(topo.node[n].parent);
      n = topo.node[n].parentNode;
    }
    return path;
  }

  /** Chaves com relé no caminho, ordenadas de jusante para montante. */
  function protectiveDevicesUpstream(model, topo, nodeId) {
    return pathToSource(topo, nodeId)
      .filter((e) => e.type === 'sw' && model.switches[e.id].relay)
      .map((e) => e.id);
  }

  /** Primeiro dispositivo de proteção a montante de uma chave (para GOOSE). */
  function upstreamDeviceOf(model, topo, swId) {
    const info = topo.sw[swId];
    if (!info || !info.up) return null;
    const list = protectiveDevicesUpstream(model, topo, info.up);
    return list.length ? list[0] : null;
  }

  /**
   * Fluxo de carga simplificado (radial, correntes somadas em módulo).
   * Carga de cada trecho concentrada no ponto médio: a metade a montante conduz
   * a carga própria mais a de jusante; a metade a jusante conduz só a de jusante.
   * A queda de tensão é aproximada por ΔV ≈ I·(R·cosφ + X·sinφ), com o
   * barramento de 13,8 kV de cada SE fixo em 1,0 pu (regulado pelo comutador).
   */
  function computeFlows(model, topo, opts = {}) {
    const pf = opts.pf || 0.92;
    const sinphi = Math.sqrt(1 - pf * pf);
    const down = {};
    Object.keys(topo.node).forEach((n) => { down[n] = 0; });
    const segFlow = {};
    const swFlow = {};
    for (let i = topo.order.length - 1; i >= 0; i--) {
      const n = topo.order[i];
      const info = topo.node[n];
      if (!info.parent) continue;
      const e = info.parent;
      let i0 = down[n];
      if (e.type === 'seg') {
        const s = model.segments[e.id];
        const upper = i0 + (s.load || 0);
        segFlow[e.id] = { upper, lower: i0, up: info.parentNode };
        i0 = upper;
      } else {
        swFlow[e.id] = i0;
      }
      down[info.parentNode] += i0;
    }

    // Tensões (pu) a partir do barramento de cada fonte
    const volt = {};
    const segV = {};
    topo.order.forEach((n) => {
      const info = topo.node[n];
      if (!info.parent) { volt[n] = 1.0; return; }
      const e = info.parent;
      const vUp = volt[info.parentNode];
      if (e.type === 'seg') {
        const s = model.segments[e.id];
        const f = segFlow[e.id];
        const k = (s.z1.re * pf + s.z1.im * sinphi) / 2;
        const vMid = vUp - (f.upper / model.ibase) * k;
        const vDown = vMid - (f.lower / model.ibase) * k;
        volt[n] = vDown;
        segV[e.id] = { up: vUp, mid: vMid, down: vDown };
      } else {
        volt[n] = vUp;
      }
    });

    const srcLoad = {};
    Object.values(model.sources).forEach((s) => { srcLoad[s.id] = topo.node[s.bus] ? down[s.bus] : 0; });
    let served = 0;
    let unserved = 0;
    Object.values(model.segments).forEach((s) => {
      if (topo.seg[s.id].energized) served += s.load || 0; else unserved += s.load || 0;
    });
    return { segFlow, swFlow, volt, segV, srcLoad, served, unserved };
  }

  /** Verifica limites operativos (ampacidade e tensão mínima). */
  function checkLimits(model, topo, flows, opts = {}) {
    const vmin = opts.vmin || 0.93;
    const overloads = [];
    Object.values(model.segments).forEach((s) => {
      const f = flows.segFlow[s.id];
      if (f && s.amp && f.upper > s.amp + 1e-9) overloads.push({ seg: s.id, current: f.upper, amp: s.amp });
    });
    const undervoltage = [];
    Object.entries(flows.volt).forEach(([n, v]) => { if (v < vmin) undervoltage.push({ node: n, v }); });
    return { overloads, undervoltage };
  }

  const api = {
    buildModel, normalState, cloneState, analyze, pathToSource, protectiveDevicesUpstream,
    upstreamDeviceOf, computeFlows, checkLimits,
  };
  SH.network = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
