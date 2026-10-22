type Edge = [number, number];

/** Construct a regular (or, for odd total degree, almost regular) simple graph. */
export function balancedTeamMatchups(teamCount: number, target: number): Edge[] {
  const remaining = Array<number>(teamCount).fill(target);
  if ((teamCount * target) % 2 !== 0) remaining[teamCount - 1] -= 1;
  const edges: Edge[] = [];
  // Havel-Hakimi: satisfy the largest remaining degree using the other largest degrees.
  // These regular/almost-regular degree sequences are graphical for target < teamCount.
  for (;;) {
    const order = remaining.map((degree, team) => ({ degree, team }))
      .sort((a, b) => b.degree - a.degree || a.team - b.team);
    const { degree, team } = order[0];
    if (degree === 0) return edges;
    remaining[team] = 0;
    for (const opponent of order.slice(1, degree + 1)) {
      remaining[opponent.team] -= 1;
      edges.push([team, opponent.team]);
    }
  }
}

/**
 * Maximum number of unused matchups subject to each team's remaining game allowance.
 * Reduce capacitated matching to ordinary matching: give each team one vertex per free
 * game, and each candidate matchup two endpoint vertices initially matched together.
 * An augmentation connects both endpoints to team slots, selecting that matchup.
 * Starting with every endpoint matched ensures no half-selected matchups can remain.
 */
export function remainingTeamMatchups(available: Edge[], allowances: number[]): Edge[] {
  const graph: number[][] = [];
  const mate: number[] = [];
  const vertex = () => {
    graph.push([]);
    mate.push(-1);
    return graph.length - 1;
  };
  const connect = (a: number, b: number) => {
    graph[a].push(b);
    graph[b].push(a);
  };
  const degree = allowances.map(() => 0);
  const candidates = available.filter(([a, b]) => allowances[a] > 0 && allowances[b] > 0);
  for (const [a, b] of candidates) { degree[a] += 1; degree[b] += 1; }
  const slots = allowances.map((limit, team) =>
    Array.from({ length: Math.min(limit, degree[team]) }, vertex)
  );
  const endpoints = candidates.map(([a, b]) => {
    const left = vertex(), right = vertex();
    connect(left, right);
    mate[left] = right;
    mate[right] = left;
    for (const slot of slots[a]) connect(left, slot);
    for (const slot of slots[b]) connect(right, slot);
    return [left, right];
  });
  maximumMatching(graph, mate);
  return candidates.filter((_, index) => mate[endpoints[index][0]] !== endpoints[index][1]);
}

/** Edmonds' augmenting-path matching with blossom contraction for odd cycles. */
function maximumMatching(graph: number[][], mate: number[]): void {
  const size = graph.length;
  const parent = new Int32Array(size);
  const base = new Int32Array(size);
  const visited = new Uint8Array(size);
  const blossom = new Uint8Array(size);
  const queue = new Int32Array(size);

  const commonBase = (left: number, right: number): number => {
    const path = new Uint8Array(size);
    for (;;) {
      left = base[left];
      path[left] = 1;
      if (mate[left] === -1) break;
      left = parent[mate[left]];
    }
    for (;;) {
      right = base[right];
      if (path[right]) return right;
      right = parent[mate[right]];
    }
  };
  const markPath = (node: number, root: number, child: number) => {
    while (base[node] !== root) {
      blossom[base[node]] = 1;
      blossom[base[mate[node]]] = 1;
      parent[node] = child;
      child = mate[node];
      node = parent[mate[node]];
    }
  };
  const augment = (root: number) => {
    parent.fill(-1);
    visited.fill(0);
    for (let i = 0; i < size; i += 1) base[i] = i;
    let head = 0, tail = 0;
    queue[tail++] = root;
    visited[root] = 1;
    while (head < tail) {
      const node = queue[head++];
      for (const neighbor of graph[node]) {
        if (base[node] === base[neighbor] || mate[node] === neighbor) continue;
        if (neighbor === root || (mate[neighbor] !== -1 && parent[mate[neighbor]] !== -1)) {
          const rootBase = commonBase(node, neighbor);
          blossom.fill(0);
          markPath(node, rootBase, neighbor);
          markPath(neighbor, rootBase, node);
          for (let i = 0; i < size; i += 1) {
            if (!blossom[base[i]]) continue;
            base[i] = rootBase;
            if (!visited[i]) { visited[i] = 1; queue[tail++] = i; }
          }
        } else if (parent[neighbor] === -1) {
          parent[neighbor] = node;
          if (mate[neighbor] === -1) {
            let end = neighbor;
            while (end !== -1) {
              const previous = parent[end];
              const next = previous === -1 ? -1 : mate[previous];
              mate[end] = previous;
              if (previous !== -1) mate[previous] = end;
              end = next;
            }
            return;
          }
          const paired = mate[neighbor];
          visited[paired] = 1;
          queue[tail++] = paired;
        }
      }
    }
  };
  for (let node = 0; node < size; node += 1) {
    if (mate[node] === -1) augment(node);
  }
}
