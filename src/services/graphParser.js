/**
 * Architectural Tiers Definition (Universal & Language-Agnostic)
 */
export const ARCH_TIERS = {
  UI_COMPONENT: {
    id: 'UI_COMPONENT',
    label: 'UI Component / View',
    color: '#38bdf8', // Sky / Cyan
    badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },
  API_CLIENT: {
    id: 'API_CLIENT',
    label: 'API / Network Client',
    color: '#a855f7', // Purple
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  ROUTE: {
    id: 'ROUTE',
    label: 'Route / Endpoint',
    color: '#f59e0b', // Amber
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  CONTROLLER: {
    id: 'CONTROLLER',
    label: 'Controller / Use Case',
    color: '#10b981', // Emerald
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  SERVICE: {
    id: 'SERVICE',
    label: 'Domain Service',
    color: '#06b6d4', // Cyan
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  DB_REPOSITORY: {
    id: 'DB_REPOSITORY',
    label: 'DB Repository',
    color: '#0284c7', // Sky
    badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },
  DB_MODEL: {
    id: 'DB_MODEL',
    label: 'DB Model / Entity',
    color: '#ec4899', // Rose / Pink
    badgeClass: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  },
  UTILITY: {
    id: 'UTILITY',
    label: 'Utility / Helper',
    color: '#94a3b8', // Slate
    badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  },
};

/**
 * Universal Language & Framework-Agnostic Tier Classifier
 * Categorizes nodes based on path patterns and symbol semantics across any tech stack.
 */
export function classifyNodeTier(node) {
  if (!node) return ARCH_TIERS.SERVICE;
  const file = (node.source_file || '').toLowerCase().replace(/\\/g, '/');
  const label = (node.label || '').toLowerCase();
  const id = (node.id || '').toLowerCase();

  // 1. Frontend Views, UI Pages, Templates, Layouts (UI_COMPONENT)
  const isUiExt = /\.(jsx|tsx|vue|svelte|html|twig|blade\.php|erb)$/.test(file);
  const isUiPath = /(frontend|src\/pages|src\/components|views?|screens?|templates?|layouts?|components?|ui\/)/.test(file);
  const isUiLabel = /(page|component|view|screen|modal|dialog|form|table|card|header|nav|footer|button)\(?\)?$/.test(label);

  if (isUiExt || isUiPath) {
    // Check if it's a hook or frontend service/api caller
    const isHook = /\buse[A-Z]/.test(node.label || '') || /(^|[\/\\])hooks?([\/\\]|$)/i.test(file);
    if (isHook) {
      return ARCH_TIERS.SERVICE;
    }
    const isFrontendApi = /(shared\/api|api\/client|client\/api|httpclient|network\/api)/.test(file) ||
                          /(apiget|apipost|apiput|apidelete|fetch|axios)/.test(label);
    if (isFrontendApi && !isUiExt) {
      return ARCH_TIERS.API_CLIENT;
    }
    if (isUiExt || isUiLabel) {
      return ARCH_TIERS.UI_COMPONENT;
    }
  }

  // 2. Database Repositories (DB_REPOSITORY) vs Models/Entities (DB_MODEL)
  const isRepo = /(repositor(y|ies)|dao)/.test(file) || /(repository|dao)/.test(id) || /(repository|dao)\(?\)?$/i.test(label);
  if (isRepo) {
    return ARCH_TIERS.DB_REPOSITORY;
  }

  const isDbPath = /(models?|entities|schemas?|db\/|database\/|persistence|prisma|typeorm|sequelize|mongoose|migrations?)/.test(file);
  const isDbId = /(model|entity|schema)/.test(id) || /_table$/.test(id);
  const isDbLabel = /(model|entity|schema)\(?\)?$/i.test(node.label || '');
  if (isDbPath || isDbId || isDbLabel) {
    return ARCH_TIERS.DB_MODEL;
  }

  // 3. API Clients, HTTP callers, Network SDKs (API_CLIENT)
  const isDto = file.includes('dto') || id.includes('dto') || /dto/i.test(label);
  const isApiClient = !isDto && (
    /(shared\/api|api\/client|client\/api|httpclient|network\/api|services\/api)/.test(file) ||
    /(apiget|apipost|apiput|apidelete|httpclient|axiosclient|fetchclient)/.test(label) ||
    id.includes('api_client') ||
    (/(^|[\/\\])api\.(js|ts)$/i.test(file) && !file.includes('routes'))
  );
  if (isApiClient) {
    return ARCH_TIERS.API_CLIENT;
  }

  // 4. Routes, Endpoints, Routers, URL Handlers (ROUTE)
  const isRoute = /(routes?|routers?|endpoints?|handlers?|urls?|api\/routes|web\.php|gin|mux)/.test(file) ||
                  /(route|router)/.test(id) ||
                  label.includes('router');
  if (isRoute) {
    return ARCH_TIERS.ROUTE;
  }

  // 5. Controllers, Use Cases, Interactors, Resolvers (CONTROLLER)
  const isController = /(controllers?|usecases?|interactors?|resolvers?|commands?|actions?|application\/usecases)/.test(file) ||
                       /(controller|usecase|resolver)/.test(id) ||
                       /(controller|usecase)/.test(label);
  if (isController) {
    return ARCH_TIERS.CONTROLLER;
  }

  // 6. Frontend / Shared Utilities & Helpers (not backend domain services)
  const isUtility = /(utils?|helpers?|formatters?|converters?|transformers?)/.test(file) ||
                    /(format|convert|calc|round|sanitize|parse|slugify|unitconversion)/.test(label);
  if (isUtility && (isUiPath || file.includes('frontend') || file.includes('client') || file.includes('utils/'))) {
    return ARCH_TIERS.UTILITY;
  }

  // 7. Default to Domain Service
  return ARCH_TIERS.SERVICE;
}

/**
 * Universal Database Operation Detector (Reads vs. Writes)
 * Detects side-effects and queries based on standard verbs across SQL, NoSQL, ORMs.
 */
export function detectDbOperation(node) {
  if (!node) return null;
  const label = (node.label || '').toLowerCase();
  const file = (node.source_file || '').toLowerCase().replace(/\\/g, '/');
  const id = (node.id || '').toLowerCase();

  const isModelOrRepo = /(models?|repositor(y|ies)|schemas?|entities|db|dao)/.test(file) ||
                        /(model|repository|entity|schema)/.test(id);

  // Common DB Mutation / Write keywords
  const writeKeywords = [
    'create', 'insert', 'save', 'update', 'modify', 'alter', 'delete', 'remove',
    'destroy', 'drop', 'truncate', 'upsert', 'bulkwrite', 'adjust', 'mutate',
    'post', 'put', 'patch', 'write'
  ];

  // Common DB Query / Read keywords
  const readKeywords = [
    'find', 'get', 'fetch', 'select', 'query', 'search', 'load', 'list',
    'read', 'count', 'scan', 'filter', 'retrieve', 'lookup'
  ];

  for (const kw of writeKeywords) {
    const regex = new RegExp(`\\b${kw}|_${kw}|^${kw}`, 'i');
    if (regex.test(label) || regex.test(id)) {
      return {
        type: 'WRITE',
        label: 'DB Mutation (Write)',
        color: '#f43f5e', // Rose
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-glow-rose',
      };
    }
  }

  for (const kw of readKeywords) {
    const regex = new RegExp(`\\b${kw}|_${kw}|^${kw}`, 'i');
    if (regex.test(label) || regex.test(id)) {
      return {
        type: 'READ',
        label: 'DB Query (Read)',
        color: '#06b6d4', // Cyan
        badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-glow-cyan',
      };
    }
  }

  // If node is inside a model or repo file, default to DB Read/Model
  if (isModelOrRepo) {
    return {
      type: 'READ',
      label: 'DB Model/Repo',
      color: '#38bdf8',
      badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    };
  }

  return null;
}

/**
 * Builds universal indexes and relations for fast traversal and sub-graph drilldowns.
 */
export function buildGraphIndex(graphData) {
  if (!graphData || !Array.isArray(graphData.nodes)) {
    return null;
  }

  const nodes = graphData.nodes;
  const links = graphData.links || graphData.edges || [];

  const nodeMap = new Map();
  const outgoingMap = new Map();
  const incomingMap = new Map();
  const fileNodesMap = new Map();

  const enrichedNodes = [];
  for (const node of nodes) {
    const tier = classifyNodeTier(node);
    const dbOp = detectDbOperation(node);

    const enrichedNode = {
      ...node,
      tier,
      dbOp,
      displayLabel: (node.label || node.id).replace(/\(\)$/, ''),
    };

    enrichedNodes.push(enrichedNode);
    nodeMap.set(node.id, enrichedNode);
    outgoingMap.set(node.id, []);
    incomingMap.set(node.id, []);

    if (node.source_file) {
      const normalizedPath = node.source_file.replace(/\\/g, '/');
      if (!fileNodesMap.has(normalizedPath)) {
        fileNodesMap.set(normalizedPath, []);
      }
      fileNodesMap.get(normalizedPath).push(enrichedNode);
    }
  }

  for (const link of links) {
    const src = link.source;
    const tgt = link.target;

    if (outgoingMap.has(src)) {
      outgoingMap.get(src).push(link);
    }
    if (incomingMap.has(tgt)) {
      incomingMap.get(tgt).push(link);
    }
  }

  /**
   * Generic Inner Code Flow extractor:
   * Extracts private functions, utilities, and helper methods contained
   * or called within the same file or immediate module.
   */
  function getInnerCodeFlow(nodeId) {
    const node = nodeMap.get(nodeId);
    if (!node) return { parent: null, helpers: [], subLinks: [] };

    const sourceFile = node.source_file ? node.source_file.replace(/\\/g, '/') : null;
    const sameFileNodes = sourceFile ? fileNodesMap.get(sourceFile) || [] : [];

    const outgoing = outgoingMap.get(nodeId) || [];
    const directTargetIds = new Set(outgoing.map(l => l.target));

    const helperNodes = [];
    const helperIds = new Set();

    // 1. Same-file sibling functions (AST containment)
    for (const sibling of sameFileNodes) {
      if (sibling.id !== nodeId && sibling.id !== sourceFile) {
        helperNodes.push(sibling);
        helperIds.add(sibling.id);
      }
    }

    // 2. Direct internal calls to utilities or helpers
    for (const tgtId of directTargetIds) {
      const tgtNode = nodeMap.get(tgtId);
      if (tgtNode && !helperIds.has(tgtId) && tgtId !== nodeId) {
        if (!tgtId.startsWith('ref_') && tgtNode.tier.id !== 'UI_COMPONENT') {
          helperNodes.push(tgtNode);
          helperIds.add(tgtId);
        }
      }
    }

    // Collect inner sub-links
    const subLinks = [];
    const allInnerIds = new Set([nodeId, ...helperIds]);

    for (const id of allInnerIds) {
      const linksOut = outgoingMap.get(id) || [];
      for (const l of linksOut) {
        if (allInnerIds.has(l.target)) {
          subLinks.push(l);
        }
      }
    }

    return {
      parent: node,
      helpers: helperNodes,
      subLinks,
    };
  }

  return {
    nodes: enrichedNodes,
    links,
    nodeMap,
    outgoingMap,
    incomingMap,
    fileNodesMap,
    getInnerCodeFlow,
  };
}
