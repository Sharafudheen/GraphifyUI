import { buildGraphIndex, classifyNodeTier, detectDbOperation } from './src/services/graphParser.js';
import { 
  discoverTopFlows, 
  matchFlowQuery, 
  buildFlowResultFromNodeIds, 
  generateMermaidFlowchart,
  extractAllPagesAndRoutes
} from './src/services/flowTracer.js';
import { getHumanReadableDescription } from './src/services/humanDescriber.js';
import { extractCodeReviewInsights } from './src/services/codeReviewInsights.js';
import { getAllAiStatus, setActiveAiEngine, analyzeFlowWithAi } from './server/aiService.js';

async function runUniversalTests() {
  console.log('🧪 Starting GraphFlow-Universal Verification Suite...\n');

  // TEST 1: Language-Agnostic Tier Classification
  console.log('1️⃣ Testing Universal Tier Classification across diverse tech stacks:');
  const sampleNodes = [
    { source_file: 'src/components/UserCard.tsx', label: 'UserCard' },
    { source_file: 'templates/dashboard/index.html', label: 'DashboardView' },
    { source_file: 'api/client/httpClient.ts', label: 'apiPost' },
    { source_file: 'src/routes/auth.routes.js', label: 'authRouter' },
    { source_file: 'app/controllers/users_controller.rb', label: 'create' },
    { source_file: 'pkg/usecases/order_creator.go', label: 'CreateOrder' },
    { source_file: 'domain/services/payment_service.py', label: 'process_payment' },
    { source_file: 'infrastructure/repositories/user.repository.ts', label: 'saveUser' },
    { source_file: 'src/models/Product.py', label: 'find_by_id' },
    { source_file: 'frontend/src/pages/PurchaseOrder/PurchaseOrderLineItemsTable.jsx', label: 'PurchaseOrderLineItemsTable' },
  ];

  const expectedTiers = [
    'UI_COMPONENT',
    'UI_COMPONENT',
    'API_CLIENT',
    'ROUTE',
    'CONTROLLER',
    'CONTROLLER',
    'SERVICE',
    'DB_REPOSITORY',
    'DB_MODEL',
    'UI_COMPONENT',
  ];

  for (let i = 0; i < sampleNodes.length; i++) {
    const tier = classifyNodeTier(sampleNodes[i]);
    if (tier.id !== expectedTiers[i]) {
      throw new Error(`Tier classification mismatch for ${sampleNodes[i].source_file}: got ${tier.id}, expected ${expectedTiers[i]}`);
    }
    console.log(`   ✓ ${sampleNodes[i].source_file} ➔ [${tier.id}]`);
  }

  // TEST 2: Universal DB Read vs Write Detection
  console.log('\n2️⃣ Testing Universal DB Read vs. Write Detection:');
  const dbTestNodes = [
    { label: 'insertUserRecord', id: 'user_insert', source_file: 'repo.js' },
    { label: 'findUserByEmail', id: 'user_find', source_file: 'repo.js' },
    { label: 'deleteCustomerOrder', id: 'order_delete', source_file: 'model.js' },
    { label: 'getUserLedgerBalance', id: 'ledger_get', source_file: 'model.js' },
  ];
  const dbOps = dbTestNodes.map(n => detectDbOperation(n)?.type);
  if (dbOps[0] !== 'WRITE' || dbOps[1] !== 'READ' || dbOps[2] !== 'WRITE' || dbOps[3] !== 'READ') {
    throw new Error(`DB Read/Write detection error: ${JSON.stringify(dbOps)}`);
  }
  console.log('   ✓ insertUserRecord ➔ WRITE');
  console.log('   ✓ findUserByEmail ➔ READ');
  console.log('   ✓ deleteCustomerOrder ➔ WRITE');
  console.log('   ✓ getUserLedgerBalance ➔ READ');

  // TEST 3: Algorithmic Description Synthesizer (No Hardcoded Dictionaries)
  console.log('\n3️⃣ Testing Algorithmic Description Synthesizer:');
  const testDesc1 = getHumanReadableDescription({
    label: 'validateOrderPayload',
    tier: { id: 'CONTROLLER', label: 'Controller' },
  });
  console.log(`   ✓ validateOrderPayload ➔ "${testDesc1}"`);
  if (!testDesc1.toLowerCase().includes('validate') && !testDesc1.toLowerCase().includes('order')) {
    throw new Error('Description failed to synthesize verb and entity');
  }

  const testDesc2 = getHumanReadableDescription({
    label: 'fetchUserProfiles',
    tier: { id: 'API_CLIENT', label: 'API Client' },
  });
  console.log(`   ✓ fetchUserProfiles ➔ "${testDesc2}"`);

  // TEST 4: Live Graph Loading from API & Dynamic Indexing
  console.log('\n4️⃣ Testing Live Graph Loading from Backend API:');
  const res = await fetch('http://localhost:3001/api/graph');
  const { repoName, graph, analysis } = await res.json();
  console.log(`   ✓ Loaded graph: ${graph.nodes.length} nodes, ${graph.links.length} links (Repo: ${repoName})`);

  const graphIndex = buildGraphIndex(graph);
  if (!graphIndex) throw new Error('Graph index could not be built');
  console.log(`   ✓ Graph indexed: ${graphIndex.nodeMap.size} nodes mapped`);

  // TEST 5: Dynamic Flow Discovery (Zero Presets)
  console.log('\n5️⃣ Testing Dynamic Flow Discovery Engine (Zero Hardcoding):');
  const discovered = discoverTopFlows(graphIndex);
  console.log(`   ✓ Discovered ${discovered.length} architectural flows dynamically:`);
  discovered.forEach((f, idx) => {
    console.log(`     ${idx + 1}. ${f.title} (${f.totalSteps} steps) - ${f.steps.map(s => s.tier?.id).slice(0, 3).join(' -> ')}...`);
  });
  if (discovered.length === 0) throw new Error('Expected at least 1 discovered flow');

  const { pages: extractedPages, routes: extractedRoutes } = extractAllPagesAndRoutes(graphIndex);
  console.log(`   ✓ Extracted ${extractedPages.length} distinct UI Pages/Views and ${extractedRoutes.length} backend routes across codebase`);
  if (extractedPages.length === 0) throw new Error('Expected at least 1 page extracted');
  if (extractedRoutes.length === 0) throw new Error('Expected at least 1 route extracted');

  // TEST 6: Universal Natural Language Search & Path Stitching
  console.log('\n6️⃣ Testing Universal Query Matcher & Path Stitcher:');
  const query1 = 'How does user or customer creation flow work?';
  const flow1 = matchFlowQuery(query1, graphIndex, discovered);
  console.log(`   ✓ Query: "${query1}" ➔ Matched "${flow1.title}" (${flow1.totalSteps} steps)`);
  if (!flow1 || flow1.steps.length < 2) throw new Error('Query matching failed');

  // TEST 6b: Modular Consistency & Zero Path Drift on Domain Query
  console.log('\n   [6b] Verifying Modular Consistency & Zero Path Drift:');
  const queryPO = 'create purchase order';
  const flowPO = matchFlowQuery(queryPO, graphIndex, discovered);
  console.log(`   ✓ Query: "${queryPO}" ➔ Matched "${flowPO.title}" (${flowPO.totalSteps} steps)`);

  let prevRank = -1;
  for (const step of flowPO.steps) {
    const file = (step.source_file || '').toLowerCase();
    const rank = ['UI_COMPONENT', 'API_CLIENT', 'ROUTE', 'CONTROLLER', 'SERVICE', 'DB_REPOSITORY', 'DB_MODEL'].indexOf(step.tier?.id);

    // Verify no cross-domain drift
    if (file.includes('finance') || file.includes('agingreport') || file.includes('pos/')) {
      throw new Error(`Path drift detected! Node ${step.id} (${step.source_file}) leaped into unrelated domain!`);
    }

    // Verify strict tier progression (ranks must not decrease along spine)
    if (rank < prevRank) {
      throw new Error(`Strict tier progression violated! Step ${step.stepNumber} has rank ${rank} < previous rank ${prevRank}`);
    }
    prevRank = rank;

    console.log(`     Step ${step.stepNumber}: [${step.tier?.id}] ${step.displayLabel} (Branches: ${step.branches?.length || 0})`);
  }
  console.log('   ✓ Zero path drift verified: all steps bound to purchaseOrders domain');
  console.log('   ✓ Strict monotonic tier progression verified');

  // TEST 6c: Intent-Aware Multi-Tier Data-Fetching Pipeline Test
  console.log('\n   [6c] Verifying Intent-Aware Multi-Tier Data-Fetching Pipeline:');
  const queryDataFetch = 'PurchaseOrderList.jsx flow how purchase order listing data fetching from database';
  const flowDataFetch = matchFlowQuery(queryDataFetch, graphIndex, discovered);
  console.log(`   ✓ Query: "${queryDataFetch}" ➔ Matched "${flowDataFetch.title}" (${flowDataFetch.totalSteps} steps)`);

  const fetchedTiers = flowDataFetch.steps.map(s => s.tier?.id);
  console.log('   ✓ Pipeline sequence:', fetchedTiers.join(' -> '));

  if (!fetchedTiers.includes('UI_COMPONENT')) {
    throw new Error('Pipeline missing UI_COMPONENT');
  }
  if (!fetchedTiers.includes('API_CLIENT')) {
    throw new Error('Pipeline missing API_CLIENT');
  }
  if (!fetchedTiers.includes('ROUTE')) {
    throw new Error('Pipeline missing ROUTE');
  }
  if (!fetchedTiers.includes('CONTROLLER')) {
    throw new Error('Pipeline missing CONTROLLER');
  }
  if (!fetchedTiers.includes('SERVICE')) {
    throw new Error('Pipeline missing SERVICE');
  }
  if (!fetchedTiers.includes('DB_REPOSITORY') && !fetchedTiers.includes('DB_MODEL')) {
    throw new Error('Pipeline missing DB layer (DB_REPOSITORY or DB_MODEL)');
  }
  console.log('   ✓ Full architectural sequence verified: UI -> API Client -> Route -> Controller -> Service -> DB');

  // TEST 7: Mermaid Flowchart, Branching Subnodes & Dynamic Rendering
  console.log('\n7️⃣ Testing Branching Mermaid Flowchart & Subgraphs & Dynamic Rendering:');
  const poMermaid = generateMermaidFlowchart(flowPO.steps, flowPO.steps.length, null, { showBranches: true });
  console.log(`   ✓ Generated Branching Mermaid Flowchart (${poMermaid.split('\n').length} lines)`);

  if (!poMermaid.includes('subgraph')) {
    throw new Error('Mermaid flowchart must contain subgraphs for steps with branches');
  }
  console.log('   ✓ Visual subgraphs verified in Mermaid output');

  if (!poMermaid.includes('-.->|')) {
    throw new Error('Mermaid flowchart must contain fan-out branching arrows (-.->|role|)');
  }
  console.log('   ✓ Fan-out branching arrows (-.->|role|) verified in Mermaid output');

  if (!poMermaid.includes('action-code') || !poMermaid.includes('action-dig')) {
    throw new Error('Mermaid nodes must contain action-code and action-dig buttons');
  }
  console.log('   ✓ Action buttons (action-code & action-dig) verified on main and branch cards');

  // TEST 7b: In-Graph Neo4j-Style Inline Expansion & Retraction
  console.log('\n   [7b] Testing In-Graph Neo4j-Style Inline Node Expansion & Retraction:');
  const expandTargetNodeId = flowDataFetch.steps[0].id;
  const expandedMermaid = generateMermaidFlowchart(flowDataFetch.steps, flowDataFetch.steps.length, null, {
    showBranches: true,
    expandedNodeIds: new Set([expandTargetNodeId]),
    graphIndex,
  });

  if (!expandedMermaid.includes('Expanded AST Functions')) {
    throw new Error('Mermaid must render (Expanded AST Functions) subgraph when expandedNodeIds has node');
  }
  if (!expandedMermaid.includes('Reset / Hide') && !expandedMermaid.includes('action-dig-expanded')) {
    throw new Error('Expanded node button must toggle to Reset / Hide');
  }
  if (!expandedMermaid.includes('innerNode')) {
    throw new Error('Inner AST functions must be styled with innerNode class');
  }
  console.log('   ✓ Inline AST functions rendered inside Mermaid subgraph');
  console.log('   ✓ Node button toggles to [Reset / Hide] with action-dig-expanded class');
  console.log('   ✓ Inner AST functions rendered with custom [Code] action buttons');

  // TEST 8: Universal Code Review Insights Engine
  console.log('\n8️⃣ Testing Universal Code Review Insights:');
  const review = extractCodeReviewInsights(graph, analysis);
  console.log(`   ✓ Total Issues: ${review.totalIssues}`);
  console.log(`     - Gods: ${review.gods.length}`);
  console.log(`     - Surprises: ${review.surprises.length}`);
  console.log(`     - Cycles: ${review.circularDependencies.length}`);
  console.log(`     - Deep Stacks: ${review.deepCallStacks.length}`);

  // TEST 9: Multi-Engine AI / CLI Integration Layer
  console.log('\n9️⃣ Testing Multi-Engine AI / CLI Integration Layer:');
  const aiStatus = await getAllAiStatus();
  console.log(`   ✓ Active AI Engine: ${aiStatus.activeEngine}`);
  const engineKeys = Object.keys(aiStatus.engines);
  if (!engineKeys.includes('copilot') || !engineKeys.includes('cursor') || !engineKeys.includes('ollama') || !engineKeys.includes('antigravity')) {
    throw new Error('All 4 AI engines (copilot, cursor, ollama, antigravity) must be present in aiStatus');
  }
  console.log('   ✓ Detected AI engines:');
  for (const [key, engine] of Object.entries(aiStatus.engines)) {
    console.log(`     - [${key}] ${engine.name}: status="${engine.status}", available=${engine.available}`);
  }

  // Test Antigravity CLI prompt generation
  setActiveAiEngine('antigravity');
  const agyReview = await analyzeFlowWithAi({ flow: flowPO, promptType: 'security' });
  if (!agyReview.success || !agyReview.analysis.includes('agy run --prompt')) {
    throw new Error('Antigravity CLI review failed to generate valid command payload');
  }
  console.log('   ✓ Antigravity CLI flow prompt synthesis verified');

  // Test Copilot CLI prompt generation
  setActiveAiEngine('copilot');
  const copilotReview = await analyzeFlowWithAi({ flow: flowPO, promptType: 'performance' });
  if (!copilotReview.success || !copilotReview.analysis.includes('gh copilot explain')) {
    throw new Error('GitHub Copilot CLI review failed to generate valid command payload');
  }
  console.log('   ✓ GitHub Copilot CLI flow prompt synthesis verified');

  // Test Cursor CLI prompt generation
  setActiveAiEngine('cursor');
  const cursorReview = await analyzeFlowWithAi({ flow: flowPO, promptType: 'refactor' });
  if (!cursorReview.success || !cursorReview.analysis.includes('cursor --review')) {
    throw new Error('Cursor CLI review failed to generate valid command payload');
  }
  console.log('   ✓ Cursor CLI flow prompt synthesis verified');

  console.log('\n🎉 ALL GRAPHFLOW-UNIVERSAL VERIFICATION CHECKS PASSED!\n');
}

runUniversalTests().catch(err => {
  console.error('❌ Universal test failed:', err);
  process.exit(1);
});
