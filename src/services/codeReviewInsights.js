/**
 * Universal Code Review Insights & Bottleneck Detection Service
 * Analyzes .graphify_analysis.json and call graph topology for any codebase.
 */

export function extractCodeReviewInsights(graphData, analysisData) {
  const nodes = graphData?.nodes || [];
  const links = graphData?.links || graphData?.edges || [];

  // 1. God Objects & Functions (Hubs)
  const gods = [];
  if (analysisData?.gods && Array.isArray(analysisData.gods)) {
    for (const g of analysisData.gods) {
      gods.push({
        id: g.id,
        label: g.label || g.id,
        degree: g.degree,
        severity: g.degree > 100 ? 'HIGH' : 'MEDIUM',
        reason: `Excessive degree (${g.degree} connections). Central hub / tight architectural coupling.`,
      });
    }
  } else {
    // If .graphify_analysis.json is not present, calculate degree dynamically from links
    const degreeMap = new Map();
    for (const l of links) {
      degreeMap.set(l.source, (degreeMap.get(l.source) || 0) + 1);
      degreeMap.set(l.target, (degreeMap.get(l.target) || 0) + 1);
    }

    const sortedByDegree = Array.from(degreeMap.entries())
      .filter(([id]) => !id.startsWith('ref_'))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [nodeId, deg] of sortedByDegree) {
      if (deg >= 15) {
        const found = nodes.find(n => n.id === nodeId);
        gods.push({
          id: nodeId,
          label: found?.label || found?.displayLabel || nodeId,
          degree: deg,
          severity: deg > 50 ? 'HIGH' : 'MEDIUM',
          reason: `High connectivity hub (${deg} connections). High blast-radius if refactored.`,
        });
      }
    }
  }

  // 2. Architectural Boundary Surprises
  const surprises = [];
  if (analysisData?.surprises && Array.isArray(analysisData.surprises)) {
    for (const s of analysisData.surprises) {
      surprises.push({
        source: s.source,
        target: s.target,
        sourceFiles: s.source_files || [],
        confidence: s.confidence,
        reason: s.why || 'Bridges separate community boundaries unexpectedly.',
        severity: 'MEDIUM',
      });
    }
  }

  // 3. Circular Dependency / Cycle Detection in Call Graph
  const callAdj = new Map();
  for (const l of links) {
    if (l.relation === 'calls' || l.relation === 'indirect_call' || l.relation === 'imports_from') {
      if (!callAdj.has(l.source)) callAdj.set(l.source, []);
      callAdj.get(l.source).push(l.target);
    }
  }

  const circularDependencies = detectCycles(callAdj, 8);

  // 4. Deep Service Call Stacks (Depth > 4)
  const deepCallStacks = findDeepCallStacks(callAdj, 4);

  // 5. Unhandled Error Boundary Risks
  const errorBoundaryRisks = findErrorBoundaryRisks(nodes, links);

  return {
    totalIssues: gods.length + surprises.length + circularDependencies.length + deepCallStacks.length + errorBoundaryRisks.length,
    gods,
    surprises,
    circularDependencies,
    deepCallStacks,
    errorBoundaryRisks,
  };
}

/**
 * Detects cycles using standard DFS cycle finding
 */
function detectCycles(adjMap, maxCycles = 8) {
  const visited = new Set();
  const recStack = new Set();
  const cycles = [];

  function dfs(node, path) {
    if (cycles.length >= maxCycles) return;
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = adjMap.get(node) || [];
    for (const neighbor of neighbors) {
      if (cycles.length >= maxCycles) break;

      if (!visited.has(neighbor)) {
        dfs(neighbor, path);
      } else if (recStack.has(neighbor)) {
        const cycleStartIndex = path.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cyclePath = path.slice(cycleStartIndex).concat(neighbor);
          cycles.push({
            cycle: cyclePath.map(cleanNodeId),
            length: cyclePath.length - 1,
            severity: cyclePath.length <= 3 ? 'HIGH' : 'MEDIUM',
            reason: 'Direct or indirect cycle in call/import dependency graph.',
          });
        }
      }
    }

    path.pop();
    recStack.delete(node);
  }

  for (const node of adjMap.keys()) {
    if (!visited.has(node) && cycles.length < maxCycles) {
      dfs(node, []);
    }
  }

  return cycles;
}

/**
 * Finds deep call chains > 4 layers
 */
function findDeepCallStacks(adjMap, minDepth = 4) {
  const deepPaths = [];

  // Pick nodes with highest fan-out
  const candidateStarters = Array.from(adjMap.entries())
    .filter(([_, neighbors]) => neighbors.length > 0)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15)
    .map(([node]) => node);

  for (const startNode of candidateStarters) {
    if (deepPaths.length >= 5) break;
    const queue = [{ node: startNode, path: [startNode] }];

    while (queue.length > 0 && deepPaths.length < 5) {
      const { node, path } = queue.shift();

      if (path.length >= minDepth) {
        deepPaths.push({
          starter: cleanNodeId(startNode),
          depth: path.length,
          path: path.map(cleanNodeId),
          severity: path.length > 6 ? 'HIGH' : 'MEDIUM',
          reason: `Call chain depth of ${path.length} hops increases latency and cognitive debugging overhead.`,
        });
        break;
      }

      const neighbors = (adjMap.get(node) || []).slice(0, 3);
      for (const n of neighbors) {
        if (!path.includes(n)) {
          queue.push({ node: n, path: [...path, n] });
        }
      }
    }
  }

  return deepPaths;
}

/**
 * Identifies UI nodes that trigger API network requests without dedicated error wrappers
 */
function findErrorBoundaryRisks(nodes, links) {
  const risks = [];
  const networkCallers = links.filter(l =>
    l.target &&
    (l.target.includes('api') || l.target.includes('fetch') || l.target.includes('http')) &&
    l.source &&
    (l.source.includes('component') || l.source.includes('page') || l.source.includes('view'))
  );

  for (const l of networkCallers.slice(0, 5)) {
    const cleanSource = cleanNodeId(l.source);
    risks.push({
      component: cleanSource,
      file: l.source_file || 'Unknown source file',
      targetEndpointClient: cleanNodeId(l.target),
      severity: 'MEDIUM',
      reason: `Asynchronous call to ${cleanNodeId(l.target)} at line ${l.source_location || 'L1'} should be guarded with an ErrorBoundary or try/catch.`,
    });
  }

  return risks;
}

function cleanNodeId(id) {
  if (!id) return '';
  return id
    .replace(/^(frontend|backend|src|app|lib|pkg|cmd)_+/g, '')
    .replace(/[_\/]+/g, ' ')
    .trim();
}
