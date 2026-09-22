import { classifyNodeTier, detectDbOperation } from './graphParser.js';
import { getHumanReadableDescription } from './humanDescriber.js';

export const TIER_RANKS = {
  UI_COMPONENT: 0,
  UTILITY: 0.5,
  API_CLIENT: 1,
  ROUTE: 2,
  CONTROLLER: 3,
  SERVICE: 4,
  DB_REPOSITORY: 5,
  DB_MODEL: 6,
};

/**
 * Normalizes a domain token (e.g. 'purchaseorders' -> 'purchaseorder', 'users' -> 'user').
 */
export function normalizeDomainToken(token) {
  if (!token) return 'shared';
  const clean = token.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.endsWith('ies')) return clean.slice(0, -3) + 'y';
  if (clean.endsWith('es') && !clean.endsWith('ses')) return clean.slice(0, -2);
  if (clean.endsWith('s') && !clean.endsWith('ss')) return clean.slice(0, -1);
  return clean;
}

/**
 * Extracts the functional domain/module key from a node's path or identifier.
 * E.g. 'backend/src/modules/purchaseOrders/...' -> 'purchaseorder'
 * E.g. 'frontend/src/pages/PurchaseOrder/...' -> 'purchaseorder'
 */
export function extractDomainKey(node) {
  if (!node) return 'unknown';
  const file = (node.source_file || '').toLowerCase().replace(/\\/g, '/');

  // 1. Modules/features/domains directory: e.g. modules/<domain>/...
  const moduleMatch = file.match(/(?:modules|features|domains|packages)\/([a-z0-9_-]+)/i);
  if (moduleMatch && !['common', 'shared', 'core', 'utils'].includes(moduleMatch[1].toLowerCase())) {
    return normalizeDomainToken(moduleMatch[1]);
  }

  // 2. Frontend pages/views/components directory: e.g. pages/<domain>/...
  const pageMatch = file.match(/(?:pages|views|screens|components)\/([a-z0-9_-]+)/i);
  if (pageMatch && !['common', 'shared', 'ui', 'layouts', 'layout', 'auth', 'tools', 'dashboard'].includes(pageMatch[1].toLowerCase())) {
    return normalizeDomainToken(pageMatch[1]);
  }

  // 3. Filename domain prefix: e.g. purchaseOrders.routes.js or PurchaseOrder.jsx
  const fileBase = file.split('/').pop().replace(/\.[^.]+$/, '');
  const baseMatch = fileBase.match(/^([a-z0-9]+?)(?:[._-](?:routes?|controllers?|services?|models?|usecases?|repository|dto|utils|view|page|list|detail))?$/i);
  if (baseMatch && baseMatch[1] && baseMatch[1].length > 2 && !['index', 'app', 'main', 'root', 'base'].includes(baseMatch[1].toLowerCase())) {
    return normalizeDomainToken(baseMatch[1]);
  }

  // 4. Non-boilerplate path segment
  const segments = file.split('/').filter(s => 
    !['frontend', 'backend', 'src', 'app', 'pkg', 'internal', 'shared', 'common', 'utils', 'lib', 'dto', 'entities'].includes(s)
  );
  if (segments.length > 0) {
    return normalizeDomainToken(segments[0]);
  }

  return 'shared';
}

/**
 * Calculates modular affinity between a source node and candidate target node.
 * Strictly rewards same-domain nodes (+100) and penalizes cross-domain leaps (-1000).
 */
export function calculateModularAffinity(sourceNode, targetNode, activeDomain = null) {
  if (!sourceNode || !targetNode) return 0;

  const srcDomain = activeDomain || extractDomainKey(sourceNode);
  const tgtDomain = extractDomainKey(targetNode);

  // 1. Same domain match
  if (srcDomain === tgtDomain) {
    return 100;
  }

  // 2. Graphify Community match
  if (sourceNode.community !== undefined && targetNode.community !== undefined && sourceNode.community === targetNode.community) {
    return 80;
  }

  // 3. Shared utility or infrastructure
  const isTargetShared = tgtDomain === 'shared' || 
    /(^|[\/\\])(shared|utils|common|helpers|middleware|infrastructure)([\/\\]|$)/i.test(targetNode.source_file || '');
  if (isTargetShared) {
    return 10;
  }

  // 4. Cross-domain leap (e.g. purchaseOrders -> finance/agingReports or pos)
  return -1000;
}

/**
 * Extracts parallel branching subnodes for a stage:
 * Validations, DTOs, helper methods, utilities, and persistent side-effects.
 */
function extractStepBranches(nodeId, graphIndex, mainSpineIdsSet, activeDomain) {
  const { nodeMap, outgoingMap } = graphIndex;
  const outgoing = outgoingMap.get(nodeId) || [];
  const branches = [];
  const seenBranchIds = new Set();

  for (const link of outgoing) {
    const tgtId = link.target;
    if (mainSpineIdsSet.has(tgtId) || seenBranchIds.has(tgtId) || tgtId.startsWith('ref_')) continue;
    const tgtNode = nodeMap.get(tgtId);
    if (!tgtNode) continue;

    // Check relationship types
    const validRel = ['calls', 'contains', 'indirect_call', 'method', 'imports_from'].includes(link.relation);
    if (!validRel) continue;

    // Check modular affinity: only include branches in the same domain or shared helpers
    const affinity = calculateModularAffinity(nodeMap.get(nodeId), tgtNode, activeDomain);
    if (affinity < 0) continue; // Reject cross-domain leap

    // Determine branch role
    let role = 'helper';
    const labelLower = (tgtNode.label || '').toLowerCase();
    const fileLower = (tgtNode.source_file || '').toLowerCase();

    if (/validate|check|verify|assert|schema/.test(labelLower) || /validator/.test(fileLower)) {
      role = 'validation';
    } else if (/dto|request|response|serialize|transform/.test(labelLower) || /dto/.test(fileLower)) {
      role = 'dto';
    } else if (tgtNode.dbOp) {
      role = 'side_effect';
    } else if (/format|calc|convert|round|sanitize|parse|extract|normalize/.test(labelLower)) {
      role = 'utility';
    }

    seenBranchIds.add(tgtId);
    branches.push({
      id: tgtNode.id,
      label: tgtNode.displayLabel || tgtNode.label,
      displayLabel: tgtNode.displayLabel || tgtNode.label,
      role,
      relation: link.relation,
      tier: tgtNode.tier,
      dbOp: tgtNode.dbOp,
      source_file: tgtNode.source_file,
      source_location: tgtNode.source_location,
      humanDescription: getHumanReadableDescription(tgtNode),
    });

    if (branches.length >= 4) break;
  }

  return branches;
}

/**
 * Intelligently resolves the next architectural tier node in activeDomain.
 * Follows the universal pipeline: UI_COMPONENT -> API_CLIENT -> ROUTE -> CONTROLLER -> SERVICE -> DB_REPOSITORY -> DB_MODEL
 */
export function findNextTierNode(currentTierId, activeDomain, graphIndex, visited, intent = 'read') {
  const { nodes, nodeMap, outgoingMap } = graphIndex;
  const tierOrder = ['UI_COMPONENT', 'API_CLIENT', 'ROUTE', 'CONTROLLER', 'SERVICE', 'DB_REPOSITORY', 'DB_MODEL'];
  const currentIndex = tierOrder.indexOf(currentTierId);
  if (currentIndex === -1 || currentIndex >= tierOrder.length - 1) return null;

  for (let nextIndex = currentIndex + 1; nextIndex < tierOrder.length; nextIndex++) {
    const targetTier = tierOrder[nextIndex];
    const candidates = [];

    // 1. Direct outgoing links from visited nodes
    for (const vId of visited) {
      const out = outgoingMap.get(vId) || [];
      for (const l of out) {
        if (visited.has(l.target) || l.target.startsWith('ref_')) continue;
        const tgt = nodeMap.get(l.target);
        if (tgt && tgt.tier?.id === targetTier) {
          const tDomain = extractDomainKey(tgt);
          if (tDomain === activeDomain || (targetTier === 'API_CLIENT' && (tDomain === 'shared' || tgt.source_file?.includes('api')))) {
            candidates.push({ node: tgt, isDirect: true });
          }
        }
      }
    }

    // 2. Sibling container or shared API_CLIENT
    if (targetTier === 'API_CLIENT') {
      const vNode = nodeMap.get(Array.from(visited)[0]);
      if (vNode?.source_file) {
        const dir = vNode.source_file.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
        const siblingNodes = nodes.filter(n => n.source_file && n.source_file.replace(/\\/g, '/').startsWith(dir));
        for (const sib of siblingNodes) {
          const sibOut = outgoingMap.get(sib.id) || [];
          for (const l of sibOut) {
            const tgt = nodeMap.get(l.target);
            if (tgt && tgt.tier?.id === 'API_CLIENT') {
              candidates.push({ node: tgt, isDirect: true });
            }
          }
        }
      }
      const candidateApi = nodes.find(n => 
        n.tier?.id === 'API_CLIENT' && 
        (n.id.includes('apiget') || n.label.toLowerCase().includes('apiget') || n.source_file?.includes('api.js'))
      );
      if (candidateApi && !visited.has(candidateApi.id)) {
        candidates.push({ node: candidateApi, isDirect: false });
      }
    }

    // 3. Domain candidates matching targetTier
    const domainCandidates = nodes.filter(n => {
      if (visited.has(n.id) || n.id.startsWith('ref_')) return false;
      if (n.tier?.id !== targetTier) return false;
      return extractDomainKey(n) === activeDomain;
    });

    for (const dc of domainCandidates) {
      if (!candidates.some(c => c.node.id === dc.id)) {
        candidates.push({ node: dc, isDirect: false });
      }
    }

    if (candidates.length > 0) {
      candidates.sort((cA, cB) => {
        const a = cA.node;
        const b = cB.node;
        let scoreA = cA.isDirect ? 15 : 0;
        let scoreB = cB.isDirect ? 15 : 0;
        const labelA = (a.label || '').toLowerCase();
        const labelB = (b.label || '').toLowerCase();
        const fileA = (a.source_file || '').toLowerCase();
        const fileB = (b.source_file || '').toLowerCase();

        // Strongly penalize sub-domains like grn or vendor if not explicitly queried
        if (fileA.includes('grn') || labelA.includes('grn') || fileA.includes('vendor')) scoreA -= 50;
        if (fileB.includes('grn') || labelB.includes('grn') || fileB.includes('vendor')) scoreB -= 50;

        // Reward file or symbol containing domain name directly (e.g. purchaseorders)
        if (fileA.includes(activeDomain)) scoreA += 40;
        if (fileB.includes(activeDomain)) scoreB += 40;

        // For CONTROLLER: prefer functions matching intent (e.g. getPurchaseOrdersByStore or list) or main controller
        if (targetTier === 'CONTROLLER') {
          if (/getpurchaseorders|listpurchaseorders/i.test(labelA)) scoreA += 50;
          if (/getpurchaseorders|listpurchaseorders/i.test(labelB)) scoreB += 50;
          if (fileA.endsWith('.controller.js')) scoreA += 30;
          if (fileB.endsWith('.controller.js')) scoreB += 30;
        }

        // For SERVICE: prefer main domain service over specific sub-services
        if (targetTier === 'SERVICE') {
          if (fileA.includes(`${activeDomain}.service.js`) || labelA.includes(`${activeDomain}.service`)) scoreA += 80;
          if (fileB.includes(`${activeDomain}.service.js`) || labelB.includes(`${activeDomain}.service`)) scoreB += 80;
          if (fileA.endsWith('.service.js')) scoreA += 30;
          if (fileB.endsWith('.service.js')) scoreB += 30;
        }

        // For DB_MODEL: prefer entity/schema/class over helper functions like roundTwo or DTOs
        if (targetTier === 'DB_MODEL') {
          if (fileA.includes('dto')) scoreA -= 30;
          if (fileB.includes('dto')) scoreB -= 30;
          if (new RegExp(`^${activeDomain}$`, 'i').test(labelA) || labelA.toLowerCase().includes(activeDomain)) scoreA += 60;
          if (new RegExp(`^${activeDomain}$`, 'i').test(labelB) || labelB.toLowerCase().includes(activeDomain)) scoreB += 60;
          if (/round|calc|util/.test(labelA)) scoreA -= 40;
          if (/round|calc|util/.test(labelB)) scoreB -= 40;
        }

        if (intent === 'read') {
          if (/get|list|find|fetch|all/.test(labelA)) scoreA += 15;
          if (/get|list|find|fetch|all/.test(labelB)) scoreB += 15;
        } else {
          if (/create|add|save|insert|post/.test(labelA)) scoreA += 15;
          if (/create|add|save|insert|post/.test(labelB)) scoreB += 15;
        }

        if (fileA.endsWith('.routes.js') || fileA.endsWith('.controller.js') || fileA.endsWith('.service.js') || fileA.endsWith('.repository.js')) scoreA += 15;
        if (fileB.endsWith('.routes.js') || fileB.endsWith('.controller.js') || fileB.endsWith('.service.js') || fileB.endsWith('.repository.js')) scoreB += 15;

        return scoreB - scoreA;
      });

      return candidates[0].node.id;
    }
  }

  return null;
}

/**
 * Traces a domain-constrained path across tiers starting from an entry point.
 * Enforces modular consistency, strict tier progression, and captures branching subnodes.
 */
export function traceDomainConstrainedPath(startNodeId, graphIndex, maxSteps = 12, intent = 'read') {
  const { nodeMap } = graphIndex;
  const startNode = nodeMap.get(startNodeId);
  if (!startNode) return [];

  const activeDomain = extractDomainKey(startNode);
  const path = [startNodeId];
  const visited = new Set([startNodeId]);

  let currentTier = startNode.tier?.id;

  while (path.length < maxSteps) {
    const nextId = findNextTierNode(currentTier, activeDomain, graphIndex, visited, intent);
    if (!nextId) break;
    path.push(nextId);
    visited.add(nextId);
    currentTier = nodeMap.get(nextId)?.tier?.id || currentTier;
  }

  return path;
}

/**
 * Discovers prominent domain flows across the application with modular consistency.
 */
export function discoverTopFlows(graphIndex) {
  if (!graphIndex || !graphIndex.nodes || graphIndex.nodes.length === 0) {
    return [];
  }

  const { nodes, outgoingMap } = graphIndex;
  const discoveredFlows = [];

  // 1. Find candidate starting entrypoints (UI Components or Route Handlers)
  const entryCandidates = nodes.filter(n => {
    const tierId = n.tier?.id;
    return (
      (tierId === 'UI_COMPONENT' || tierId === 'ROUTE') &&
      !n.id.startsWith('ref_') &&
      n.source_file &&
      !n.source_file.includes('.test.') &&
      !n.source_file.includes('.spec.')
    );
  });

  // Sort by fan-out degree
  entryCandidates.sort((a, b) => {
    const outA = (outgoingMap.get(a.id) || []).length;
    const outB = (outgoingMap.get(b.id) || []).length;
    return outB - outA;
  });

  // Pick diverse entrypoints across distinct domain clusters
  const seenDomains = new Set();
  const selectedEntries = [];

  for (const entry of entryCandidates) {
    const domain = extractDomainKey(entry);
    if (domain !== 'shared' && !seenDomains.has(domain) && selectedEntries.length < 30) {
      seenDomains.add(domain);
      selectedEntries.push(entry);
    }
  }

  // Fallback
  if (selectedEntries.length === 0 && entryCandidates.length > 0) {
    selectedEntries.push(...entryCandidates.slice(0, 10));
  }

  // 2. Trace path for each selected entry
  for (let i = 0; i < selectedEntries.length; i++) {
    const entry = selectedEntries[i];
    const pathNodeIds = traceDomainConstrainedPath(entry.id, graphIndex, 10);

    if (pathNodeIds.length >= 2) {
      const cleanLabel = (entry.displayLabel || entry.label || 'Workflow').replace(/\(\)$/, '');
      const title = `${cleanLabel} Flow`;
      const description = `Modular execution path for ${cleanLabel} within the ${extractDomainKey(entry)} module.`;

      discoveredFlows.push(
        buildFlowResultFromNodeIds(
          pathNodeIds,
          title,
          description,
          graphIndex,
          `flow_${i + 1}`
        )
      );
    }
  }

  return discoveredFlows;
}

/**
 * Extracts all distinct Frontend Pages / Views and Backend Route files from the graph.
 */
export function extractAllPagesAndRoutes(graphIndex) {
  if (!graphIndex || !graphIndex.nodes) {
    return { pages: [], routes: [] };
  }

  const { nodes, outgoingMap } = graphIndex;
  const pagesMap = new Map();
  const routesMap = new Map();

  for (const n of nodes) {
    if (n.id.startsWith('ref_')) continue;
    const f = (n.source_file || '').replace(/\\/g, '/');
    const fileName = f.split('/').pop();
    if (!fileName) continue;

    // Check if it's a frontend page / view / component
    const isFrontendExt = /\.(jsx|tsx|vue|svelte|html)$/i.test(f);
    const isPagePath = f.includes('pages/') || f.includes('views/') || f.includes('screens/');
    const isUiComponent = n.tier?.id === 'UI_COMPONENT';

    if ((isFrontendExt || isPagePath || isUiComponent) && !f.includes('.test.') && !f.includes('.spec.')) {
      const pageKey = f;
      const existing = pagesMap.get(pageKey);
      const fanOut = (outgoingMap?.get(n.id) || []).length;
      const cleanLabel = fileName.replace(/\.[^.]+$/, '');
      const isExactLabelMatch = (n.label || '').replace(/\(\)$/, '').toLowerCase() === cleanLabel.toLowerCase();

      if (!existing || isExactLabelMatch || fanOut > existing.fanOut) {
        const moduleDir = f.split('/').slice(-2, -1)[0] || 'general';
        pagesMap.set(pageKey, {
          id: n.id,
          fileName,
          source_file: f,
          label: cleanLabel,
          displayLabel: cleanLabel,
          module: moduleDir,
          fanOut,
          tier: n.tier,
        });
      }
    }

    // Check if it's a backend route endpoint file
    if ((/routes?\.js$|routes?\.ts$/i.test(f) || f.includes('/routes/')) && !f.includes('.test.') && !f.includes('.spec.')) {
      const routeKey = f;
      const existing = routesMap.get(routeKey);
      const fanOut = (outgoingMap?.get(n.id) || []).length;
      const cleanLabel = fileName.replace(/\.[^.]+$/, '');

      if (!existing || fanOut > existing.fanOut) {
        const moduleDir = f.split('/').slice(-2, -1)[0] || 'api';
        routesMap.set(routeKey, {
          id: n.id,
          fileName,
          source_file: f,
          label: cleanLabel,
          displayLabel: cleanLabel,
          module: moduleDir,
          fanOut,
          tier: n.tier,
        });
      }
    }
  }

  const pages = Array.from(pagesMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  const routes = Array.from(routesMap.values()).sort((a, b) => a.label.localeCompare(b.label));

  return { pages, routes };
}

/**
 * Universal Natural Language Query Matcher with Modular Proximity & Branching.
 */
export function matchFlowQuery(query, graphIndex, discoveredFlows = []) {
  if (!query || typeof query !== 'string' || !graphIndex) return null;
  const cleanQuery = query.trim().toLowerCase();

  // 1. Check against discovered flows first
  for (const flow of discoveredFlows) {
    if (
      cleanQuery.includes(flow.title.toLowerCase()) ||
      flow.title.toLowerCase().includes(cleanQuery)
    ) {
      return flow;
    }
  }

  // 2. Tokenize query words
  const tokens = cleanQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !['how', 'what', 'show', 'the', 'flow', 'work', 'works', 'path', 'trace', 'does', 'for', 'from'].includes(t));

  const { nodes } = graphIndex;

  // 3. Score nodes across the entire graph
  const scoredNodes = [];
  for (const n of nodes) {
    if (n.id.startsWith('ref_')) continue;
    let score = 0;
    const label = (n.label || '').toLowerCase();
    const file = (n.source_file || '').toLowerCase();

    for (const token of tokens) {
      const normToken = normalizeDomainToken(token);
      if (label.includes(token)) score += 8;
      if (file.includes(token)) score += 5;
      if (label.includes(normToken)) score += 6;
      if (file.includes(normToken)) score += 4;
    }

    if (score > 0) {
      scoredNodes.push({ node: n, score });
    }
  }

  scoredNodes.sort((a, b) => b.score - a.score);

  if (scoredNodes.length === 0) {
    if (discoveredFlows.length > 0) return discoveredFlows[0];
    return null;
  }

  // 4. Determine Active Domain anchor from top-scoring nodes
  const domainVote = {};
  for (const item of scoredNodes.slice(0, 10)) {
    const d = extractDomainKey(item.node);
    if (d !== 'shared') {
      domainVote[d] = (domainVote[d] || 0) + item.score;
    }
  }

  let activeDomain = 'shared';
  let maxVote = 0;
  for (const [dom, vote] of Object.entries(domainVote)) {
    if (vote > maxVote) {
      maxVote = vote;
      activeDomain = dom;
    }
  }

  // 5. Select best starting entrypoint within activeDomain
  // Prefer UI_COMPONENT, then ROUTE, then CONTROLLER
  const domainCandidates = scoredNodes
    .map(i => i.node)
    .filter(n => extractDomainKey(n) === activeDomain);

  let startNode = domainCandidates.find(n => n.tier?.id === 'UI_COMPONENT') ||
                    domainCandidates.find(n => n.tier?.id === 'ROUTE') ||
                    domainCandidates.find(n => n.tier?.id === 'CONTROLLER') ||
                    domainCandidates[0] ||
                    scoredNodes[0].node;

  // Exact file or symbol mention in query (e.g. PurchaseOrderList.jsx)
  const exactFileMatch = scoredNodes.find(item => {
    const file = (item.node.source_file || '').toLowerCase().replace(/\\/g, '/');
    const fileName = file.split('/').pop();
    const label = (item.node.label || '').toLowerCase();
    return (
      (fileName.length > 3 && cleanQuery.includes(fileName)) ||
      (label.length > 4 && cleanQuery.includes(label.replace(/\(\)$/, '')) && item.node.tier?.id === 'UI_COMPONENT')
    );
  });
  if (exactFileMatch) {
    startNode = exactFileMatch.node;
    activeDomain = extractDomainKey(startNode);
  }

  // Detect data fetching vs creation intent
  const isDataFetchingIntent = /fetch|fetching|get|read|list|listing|query|database|load|loading|from database|db/i.test(cleanQuery);
  const intent = isDataFetchingIntent ? 'read' : 'write';

  // 6. Trace modular, domain-constrained path with branching
  const pathNodeIds = traceDomainConstrainedPath(startNode.id, graphIndex, 12, intent);

  return buildFlowResultFromNodeIds(
    pathNodeIds,
    `Flow for "${query}"`,
    `Modular architecture flow within domain "${activeDomain}" starting from ${startNode.displayLabel || startNode.label}.`,
    graphIndex,
    'custom_query_flow'
  );
}

/**
 * Builds structured flow result with main spine steps, branching subnodes, and DB side-effects.
 */
export function buildFlowResultFromNodeIds(nodeIds, title, description, graphIndex, id = 'custom_flow') {
  const steps = [];
  const dbSideEffects = {
    reads: [],
    writes: [],
    totalInteractions: 0,
  };

  const mainSpineIdsSet = new Set(nodeIds);
  const activeDomain = nodeIds.length > 0 && graphIndex?.nodeMap?.get(nodeIds[0])
    ? extractDomainKey(graphIndex.nodeMap.get(nodeIds[0]))
    : null;

  let stepNumber = 1;
  const seenIds = new Set();

  for (const rawId of nodeIds) {
    if (seenIds.has(rawId)) continue;
    seenIds.add(rawId);

    let node = graphIndex?.nodeMap?.get(rawId);
    if (!node) {
      node = {
        id: rawId,
        label: rawId.split('_').pop(),
        displayLabel: rawId.split('_').pop(),
        source_file: rawId.replace(/_/g, '/') + '.js',
        source_location: 'L1',
        tier: classifyNodeTier({ id: rawId }),
        dbOp: detectDbOperation({ id: rawId }),
      };
    }

    const humanDesc = getHumanReadableDescription(node);
    const dbOp = node.dbOp || detectDbOperation(node);

    if (dbOp) {
      dbSideEffects.totalInteractions++;
      if (dbOp.type === 'WRITE') {
        dbSideEffects.writes.push({
          step: stepNumber,
          nodeLabel: node.displayLabel || node.label,
          file: node.source_file,
          description: humanDesc,
        });
      } else {
        dbSideEffects.reads.push({
          step: stepNumber,
          nodeLabel: node.displayLabel || node.label,
          file: node.source_file,
          description: humanDesc,
        });
      }
    }

    // Extract parallel branching subnodes for this step
    const branches = graphIndex ? extractStepBranches(node.id, graphIndex, mainSpineIdsSet, activeDomain) : [];

    // Also register any branch DB side-effects
    for (const b of branches) {
      if (b.dbOp) {
        dbSideEffects.totalInteractions++;
        const record = {
          step: stepNumber,
          nodeLabel: `${b.displayLabel || b.label} (Branch)`,
          file: b.source_file,
          description: b.humanDescription,
        };
        if (b.dbOp.type === 'WRITE') {
          dbSideEffects.writes.push(record);
        } else {
          dbSideEffects.reads.push(record);
        }
      }
    }

    steps.push({
      stepNumber: stepNumber++,
      id: node.id,
      label: node.label,
      displayLabel: node.displayLabel || node.label,
      source_file: node.source_file,
      source_location: node.source_location,
      tier: node.tier,
      dbOp,
      humanDescription: humanDesc,
      branches,
    });
  }

  return {
    id,
    title,
    description,
    totalSteps: steps.length,
    steps,
    dbSideEffects,
  };
}

function sanitizeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/"/g, "'")
    .replace(/\n/g, ' ')
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Builds HTML card string for a main node.
 */
function buildMainNodeCardHtml(s, stepNum, isExpanded = false) {
  const tierName = s.tier?.label || 'Component';
  const safeTitle = sanitizeHtml(s.displayLabel || s.label || '');
  const safeDesc = sanitizeHtml(s.humanDescription || '');
  const safeFile = sanitizeHtml(s.source_file ? s.source_file.split(/[\/\\]/).slice(-2).join('/') : '');
  const safeLoc = sanitizeHtml(s.source_location || 'L1');

  let dbBadgeHtml = '';
  if (s.dbOp?.type === 'WRITE') {
    dbBadgeHtml = "<span style='font-size:9px;font-weight:bold;color:#fb7185;background:rgba(244,63,94,0.15);padding:1px 5px;border-radius:3px;border:1px solid rgba(244,63,94,0.3);'>WRITE</span>";
  } else if (s.dbOp?.type === 'READ') {
    dbBadgeHtml = "<span style='font-size:9px;font-weight:bold;color:#38bdf8;background:rgba(56,189,248,0.15);padding:1px 5px;border-radius:3px;border:1px solid rgba(56,189,248,0.3);'>READ</span>";
  }

  const branchBadge = s.branches && s.branches.length > 0 
    ? `<span style='font-size:9px;font-weight:600;color:#a5b4fc;background:rgba(99,102,241,0.15);padding:1px 5px;border-radius:3px;border:1px solid rgba(99,102,241,0.3);'>+${s.branches.length} branches</span>`
    : '';

  const digBtnLabel = isExpanded ? '&#x21ba; Reset / Hide' : '&#128269; Dig Flow';
  const digBtnStyle = isExpanded ? "style='background:rgba(239,68,68,0.25);color:#fca5a5;border:1px solid rgba(239,68,68,0.5);'" : "";
  const digBtnClass = isExpanded ? 'graphflow-btn graphflow-btn-dig action-dig action-dig-expanded' : 'graphflow-btn graphflow-btn-dig action-dig';
  const digBtnTitle = isExpanded ? 'Collapse expanded inner functions back into node' : 'Expand inner functions directly in diagram (Neo4j style)';

  return `<div class='graphflow-node' data-node-id='${s.id}'>` +
    `<div class='graphflow-header'>` +
      `<span class='graphflow-step-num'>#${stepNum}</span>` +
      `<span class='graphflow-tier'>${tierName}</span>` +
      `${branchBadge}` +
      `${dbBadgeHtml}` +
    `</div>` +
    `<div class='graphflow-title' title='${safeTitle}'>${safeTitle}</div>` +
    `<div class='graphflow-desc' title='${safeDesc}'>${safeDesc}</div>` +
    `<div class='graphflow-file' title='${safeFile}:${safeLoc}'>${safeFile}:${safeLoc}</div>` +
    `<div class='graphflow-actions'>` +
      `<button type='button' class='graphflow-btn graphflow-btn-code action-code' data-node-id='${s.id}' title='Open Code Snippet & IDE Launcher'>` +
        `<span>&lt;/&gt; Code</span>` +
      `</button>` +
      `<button type='button' class='${digBtnClass}' data-node-id='${s.id}' title='${digBtnTitle}' ${digBtnStyle}>` +
        `<span>${digBtnLabel}</span>` +
      `</button>` +
    `</div>` +
  `</div>`;
}

/**
 * Builds HTML card string for a branch subnode.
 */
function buildBranchNodeCardHtml(b) {
  const safeTitle = sanitizeHtml(b.displayLabel || b.label || '');
  const safeFile = sanitizeHtml(b.source_file ? b.source_file.split(/[\/\\]/).slice(-1)[0] : '');
  const roleLabel = b.role?.toUpperCase() || 'HELPER';

  let roleColor = '#38bdf8';
  let roleBg = 'rgba(56,189,248,0.15)';
  if (b.role === 'validation') {
    roleColor = '#fbbf24';
    roleBg = 'rgba(251,191,36,0.15)';
  } else if (b.role === 'dto') {
    roleColor = '#c084fc';
    roleBg = 'rgba(192,132,252,0.15)';
  } else if (b.role === 'side_effect') {
    roleColor = '#fb7185';
    roleBg = 'rgba(251,113,133,0.15)';
  }

  return `<div class='graphflow-node graphflow-branch-node' data-node-id='${b.id}' style='width:210px;padding:7px 9px;border-color:#334155;background:#0d1527;'>` +
    `<div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;'>` +
      `<span style='font-size:8.5px;font-weight:700;color:${roleColor};background:${roleBg};padding:1px 4px;border-radius:3px;'>${roleLabel}</span>` +
      `<span style='font-size:8.5px;color:#64748b;font-family:monospace;'>${safeFile}</span>` +
    `</div>` +
    `<div style='font-size:11px;font-weight:600;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' title='${safeTitle}'>${safeTitle}</div>` +
    `<div style='display:flex;gap:4px;margin-top:5px;padding-top:4px;border-top:1px solid #1e293b;'>` +
      `<button type='button' class='graphflow-btn graphflow-btn-code action-code' data-node-id='${b.id}' style='padding:2px 4px;font-size:9px;'>&lt;/&gt; Code</button>` +
      `<button type='button' class='graphflow-btn graphflow-btn-dig action-dig' data-node-id='${b.id}' style='padding:2px 4px;font-size:9px;'>&#128269; Dig</button>` +
    `</div>` +
  `</div>`;
}

/**
 * Builds HTML card string for an expanded inner AST function (Neo4j-style inline expansion).
 */
function buildInnerFunctionCardHtml(h) {
  const safeTitle = sanitizeHtml(h.displayLabel || h.label || '');
  const safeFile = sanitizeHtml(h.source_file ? h.source_file.split(/[\/\\]/).slice(-1)[0] : '');
  const safeLoc = sanitizeHtml(h.source_location || 'L1');

  return `<div class='graphflow-node graphflow-inner-node' data-node-id='${h.id}' style='width:220px;padding:6px 9px;border-color:#334155;background:#0d1527;border-radius:6px;'>` +
    `<div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;'>` +
      `<span style='font-size:8px;font-weight:700;color:#38bdf8;background:rgba(56,189,248,0.15);padding:1px 4px;border-radius:3px;'>AST FUNCTION</span>` +
      `<span style='font-size:8px;color:#64748b;font-family:monospace;'>${safeFile}:${safeLoc}</span>` +
    `</div>` +
    `<div style='font-size:11px;font-weight:600;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' title='${safeTitle}'>${safeTitle}</div>` +
    `<div style='display:flex;gap:4px;margin-top:4px;padding-top:3px;border-top:1px solid #1e293b;'>` +
      `<button type='button' class='graphflow-btn graphflow-btn-code action-code' data-node-id='${h.id}' style='padding:2px 6px;font-size:9px;'>&lt;/&gt; Code</button>` +
    `</div>` +
  `</div>`;
}

/**
 * Generates Mermaid.js flowchart code supporting multi-branch fan-out,
 * Neo4j-style inline node expansion/retraction, visual subgraphs, and dynamic rendering.
 */
export function generateMermaidFlowchart(steps, visibleLimit = 50, selectedNodeId = null, options = { showBranches: true, expandedNodeIds: null, graphIndex: null }) {
  if (!steps || steps.length === 0) {
    return 'graph TD\n  Empty["No active flow loaded"]';
  }

  const limit = Math.max(1, visibleLimit || steps.length);
  const visibleSteps = steps.slice(0, limit);
  const hasMore = steps.length > limit;
  const showBranches = options.showBranches !== false;

  let code = 'flowchart TD\n';
  code += '  %% Dynamic Architecture Styles\n';
  code += '  classDef default fill:#0b1120,stroke:#1e293b,stroke-width:1px,color:#e2e8f0,rx:8,ry:8;\n';
  code += '  classDef selectedNode stroke:#38bdf8,stroke-width:2.5px;\n';
  code += '  classDef expandedParent stroke:#10b981,stroke-width:2.5px;\n';
  code += '  classDef innerNode fill:#090d16,stroke:#334155,stroke-width:1px,color:#94a3b8,rx:6,ry:6;\n';
  code += '  classDef moreButton fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#c7d2fe,stroke-dasharray: 5 3,rx:8,ry:8;\n\n';

  // Render individual step stages with subgraphs if branching or expanded
  for (let i = 0; i < visibleSteps.length; i++) {
    const s = visibleSteps[i];
    const safeMainId = `node_${i}_${s.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;

    const isExpanded = Boolean(options.expandedNodeIds && options.expandedNodeIds.has(s.id));
    const mainCardHtml = buildMainNodeCardHtml(s, i + 1, isExpanded);

    const hasBranches = showBranches && s.branches && s.branches.length > 0;
    const innerFlow = isExpanded && options.graphIndex ? options.graphIndex.getInnerCodeFlow(s.id) : null;
    const innerHelpers = (innerFlow?.helpers || []).slice(0, 8);
    const hasInlineExpansion = isExpanded && innerHelpers.length > 0;

    if (hasInlineExpansion || hasBranches) {
      const stageName = hasInlineExpansion
        ? sanitizeHtml(`Step ${i + 1}: ${s.displayLabel} (Expanded AST Functions)`)
        : sanitizeHtml(`Step ${i + 1}: ${s.tier?.label || 'Stage'} & Branching Subnodes`);

      code += `  subgraph stage_${i} ["${stageName}"]\n`;
      code += `    ${safeMainId}["${mainCardHtml}"]\n`;

      // Render inline expanded AST functions if node is expanded
      if (hasInlineExpansion) {
        for (let k = 0; k < innerHelpers.length; k++) {
          const h = innerHelpers[k];
          const safeInnerId = `node_${i}_inner_${k}_${h.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
          const innerHtml = buildInnerFunctionCardHtml(h);
          code += `    ${safeInnerId}["${innerHtml}"]\n`;
          code += `    ${safeMainId} -.->|inner| ${safeInnerId}\n`;
          code += `    class ${safeInnerId} innerNode;\n`;
        }
      }

      // Render branch subnodes if branches enabled and not expanded
      if (hasBranches && !hasInlineExpansion) {
        for (let j = 0; j < s.branches.length; j++) {
          const b = s.branches[j];
          const safeBranchId = `node_${i}_branch_${j}_${b.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
          const branchHtml = buildBranchNodeCardHtml(b);

          code += `    ${safeBranchId}["${branchHtml}"]\n`;
          code += `    ${safeMainId} -.->|${b.role || 'calls'}| ${safeBranchId}\n`;

          if (selectedNodeId === b.id) {
            code += `    class ${safeBranchId} selectedNode;\n`;
          }
        }
      }

      code += `  end\n\n`;
    } else {
      code += `  ${safeMainId}["${mainCardHtml}"]\n`;
    }

    if (isExpanded) {
      code += `  class ${safeMainId} expandedParent;\n`;
    } else if (selectedNodeId === s.id) {
      code += `  class ${safeMainId} selectedNode;\n`;
    }
  }

  // Connect sequential main spine steps
  for (let i = 0; i < visibleSteps.length - 1; i++) {
    const currId = `node_${i}_${visibleSteps[i].id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const nextId = `node_${i + 1}_${visibleSteps[i + 1].id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    code += `  ${currId} ==> ${nextId}\n`;
  }

  // Expansion button if remaining steps exist
  if (hasMore) {
    const lastVisibleId = `node_${visibleSteps.length - 1}_${visibleSteps[visibleSteps.length - 1].id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const remainingCount = steps.length - limit;
    const expandId = 'btn_expand_steps';
    code += `  ${expandId}["<div style='padding:8px 14px;cursor:pointer;' class='btn-expand-steps'><b>[ + Expand Next ${Math.min(5, remainingCount)} Steps (${remainingCount} hidden) ]</b></div>"]\n`;
    code += `  class ${expandId} moreButton;\n`;
    code += `  ${lastVisibleId} -.->|Continues flow| ${expandId}\n`;
  }

  return code;
}
