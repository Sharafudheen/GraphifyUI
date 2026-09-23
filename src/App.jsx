import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import SearchSection from './components/SearchSection';
import FlowDiagram from './components/FlowDiagram';
import StepPagination from './components/StepPagination';
import DbSideEffectsCard from './components/DbSideEffectsCard';
import NodeDetailDrawer from './components/NodeDetailDrawer';
import CodeSnippetModal from './components/CodeSnippetModal';
import CodeReviewPanel from './components/CodeReviewPanel';
import UploadModal from './components/UploadModal';
import MetricsOverview from './components/MetricsOverview';
import EmptyStateWelcome from './components/EmptyStateWelcome';
import AiSetupModal from './components/AiSetupModal';
import AiFlowReviewDrawer from './components/AiFlowReviewDrawer';
import PageBrowserModal from './components/PageBrowserModal';

import { buildGraphIndex } from './services/graphParser.js';
import { 
  discoverTopFlows, 
  matchFlowQuery, 
  buildFlowResultFromNodeIds,
  extractAllPagesAndRoutes,
  traceDomainConstrainedPath
} from './services/flowTracer.js';
import { extractCodeReviewInsights } from './services/codeReviewInsights.js';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [repoName, setRepoName] = useState('');
  const [repoRoot, setRepoRoot] = useState('');
  const [graphData, setGraphData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Flow State
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveredFlows, setDiscoveredFlows] = useState([]);
  const [activeFlowId, setActiveFlowId] = useState(null);
  const [activeFlow, setActiveFlow] = useState(null);
  const [visibleLimit, setVisibleLimit] = useState(25);

  // Modals & Drawers
  const [selectedNode, setSelectedNode] = useState(null);
  const [drillDownNode, setDrillDownNode] = useState(null);
  const [innerCodeFlow, setInnerCodeFlow] = useState(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState(new Set());
  const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAiSetupOpen, setIsAiSetupOpen] = useState(false);
  const [isAiReviewOpen, setIsAiReviewOpen] = useState(false);
  const [isPageBrowserOpen, setIsPageBrowserOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(false);   // AI toggle (lifted from SearchSection)
  const [aiEnriching, setAiEnriching] = useState(false); // true while enrichment is in flight
  const [loopEnabled, setLoopEnabled] = useState(false); // AI iterative re-query loop
  const [maxIterations, setMaxIterations] = useState(3); // 1-5 max loop iterations
  const [iterationCount, setIterationCount] = useState(0); // live progress counter


  const fetchAiStatus = async () => {
    try {
      const res = await fetch('/api/ai/status');
      if (res.ok) {
        const data = await res.json();
        setAiStatus(data);
      }
    } catch (err) {
      console.log('[App] AI status endpoint not reachable:', err);
    }
  };

  useEffect(() => {
    fetchAiStatus();
  }, []);

  // 1. Initial Attempt: Check if server has an auto-detected graph
  useEffect(() => {
    async function checkServerGraph() {
      try {
        setLoading(true);
        const res = await fetch('/api/graph');
        if (res.ok) {
          const data = await res.json();
          if (data.graph && Array.isArray(data.graph.nodes)) {
            setRepoName(data.repoName || 'Detected Repository');
            setRepoRoot(data.repoRoot || '');
            setGraphData(data.graph);
            setAnalysisData(data.analysis || {});
          }
        }
      } catch (err) {
        console.log('[App] No auto-detected graph on server, awaiting user upload.');
      } finally {
        setLoading(false);
      }
    }

    checkServerGraph();
  }, []);

  // 2. Build Universal Graph Index
  const graphIndex = useMemo(() => {
    if (!graphData) return null;
    return buildGraphIndex(graphData);
  }, [graphData]);

  // 3. Extract Universal Code Review Insights
  const reviewInsights = useMemo(() => {
    if (!graphData) return null;
    return extractCodeReviewInsights(graphData, analysisData);
  }, [graphData, analysisData]);

  // 4. Automatically discover top architectural workflows upon index ready
  useEffect(() => {
    if (!graphIndex) {
      setDiscoveredFlows([]);
      setActiveFlow(null);
      return;
    }

    const flows = discoverTopFlows(graphIndex);
    setDiscoveredFlows(flows);

    if (flows.length > 0) {
      setActiveFlow(flows[0]);
      setActiveFlowId(flows[0].id);
      setSearchQuery(flows[0].title);
      setVisibleLimit(5);
    }
  }, [graphIndex]);

  // Dynamically extract all frontend pages/views and backend routes from the indexed graph
  const { pages: allPages, routes: allRoutes } = useMemo(() => {
    return extractAllPagesAndRoutes(graphIndex);
  }, [graphIndex]);

  // ── Tier quality ranking ──────────────────────────────────────────────────
  const TIER_RANKS = { UI_COMPONENT:0, API_CLIENT:1, ROUTE:2, CONTROLLER:3, SERVICE:4, DB_REPOSITORY:5, DB_MODEL:6 };
  const MIN_GOOD_SCORE = 4; // must reach at least SERVICE tier

  const getTierScore = (steps) =>
    steps?.length ? Math.max(...steps.map(s => TIER_RANKS[s.tier?.id] ?? -1)) : -1;

  const getMissingTiers = (steps) => {
    const reached = new Set(steps.map(s => s.tier?.id));
    return ['ROUTE','CONTROLLER','SERVICE','DB_REPOSITORY','DB_MODEL'].filter(t => !reached.has(t));
  };

  // ── AI re-query helper ────────────────────────────────────────────────────
  const refineWithContext = async (query, context) => {
    try {
      const res = await fetch('/api/ai/refine-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, engine: aiStatus?.activeEngine || '', context }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.refinedQuery || query;
      }
    } catch {}
    // Fallback: manually append missing-tier hint to query
    if (context?.missingTiers?.length) {
      return `${query} through ${context.missingTiers.map(t => t.toLowerCase().replace('_',' ')).join(' and ')}`;
    }
    return query;
  };

  // ── Iterative trace with AI loop ──────────────────────────────────────────
  // Runs up to maxIter rounds: trace → quality check → re-refine if shallow → merge
  const iterativeTrace = async (initialQuery) => {
    const maxIter = (aiEnabled && loopEnabled) ? Math.min(maxIterations, 5) : 1;
    let currentQuery = initialQuery;
    let bestFlow = null;
    let bestScore = -1;
    const mergedStepMap = new Map(); // nodeId → step (deduplicated across iterations)
    const iterLog = [];

    setIterationCount(0);

    for (let iter = 0; iter < maxIter; iter++) {
      setIterationCount(iter + 1);

      // 1. Trace current query
      const matched = matchFlowQuery(currentQuery, graphIndex, discoveredFlows);
      if (!matched?.steps?.length) break;

      const score = getTierScore(matched.steps);
      iterLog.push({ iter: iter + 1, query: currentQuery, score, steps: matched.steps.length });

      // 2. Accumulate unique steps (merge by node ID)
      for (const step of matched.steps) {
        if (!mergedStepMap.has(step.id)) mergedStepMap.set(step.id, step);
      }

      // 3. Track the best single result
      if (score > bestScore) { bestScore = score; bestFlow = matched; }

      // 4. Good enough? Stop early
      if (score >= MIN_GOOD_SCORE) break;

      // 5. Build next query targeting missing tiers (only if more iterations remain)
      if (iter < maxIter - 1 && aiEnabled) {
        const missing = getMissingTiers(matched.steps);
        const stoppedAt = matched.steps.at(-1)?.tier?.label || 'API layer';
        currentQuery = await refineWithContext(initialQuery, {
          previousQuery: currentQuery,
          previousStepCount: matched.steps.length,
          missingTiers: missing,
          stoppedAt,
        });
      }
    }

    if (!bestFlow) return null;

    // 6. Build merged flow if multiple iterations added new steps
    const mergedSteps = Array.from(mergedStepMap.values())
      .sort((a, b) => (TIER_RANKS[a.tier?.id] ?? 99) - (TIER_RANKS[b.tier?.id] ?? 99))
      .slice(0, 15);

    const mergedScore = getTierScore(mergedSteps);
    const isBetter = mergedScore > bestScore || mergedSteps.length > bestFlow.steps.length;

    let finalFlow;
    if (isBetter && mergedSteps.length > 0) {
      finalFlow = buildFlowResultFromNodeIds(
        mergedSteps.map(s => s.id),
        bestFlow.title + (iterLog.length > 1 ? ' ✦ AI Merged' : ''),
        bestFlow.description,
        graphIndex,
        `${bestFlow.id}_merged_${Date.now()}`
      );
    } else {
      finalFlow = bestFlow;
    }

    finalFlow.iterationLog = iterLog;
    finalFlow.totalIterationsRan = iterLog.length;
    return finalFlow;
  };

  // Enriches a matched flow's step descriptions using AI (Ollama / agy / rule-based fallback)
  const enrichFlow = async (flow) => {
    if (!flow?.steps?.length) return flow;
    try {
      setAiEnriching(true);
      const res = await fetch('/api/ai/enrich-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps: flow.steps,
          engine: aiStatus?.activeEngine || '',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enrichedSteps?.length) {
          return { ...flow, steps: data.enrichedSteps, aiEnriched: true, aiEngine: data.engine };
        }
      }
    } catch (err) {
      console.warn('[App] Flow enrichment failed, using original:', err.message);
    } finally {
      setAiEnriching(false);
    }
    return flow;
  };

  // Natural Language Search handler
  const handleSearch = async (query) => {
    setSearchQuery(query);
    setActiveFlowId(null);
    setExpandedNodeIds(new Set());
    if (!graphIndex) return;

    // iterativeTrace runs 1 iteration (no loop) or up to maxIterations (loop on)
    const matched = await iterativeTrace(query);
    if (matched) {
      const flow = aiEnabled ? await enrichFlow(matched) : matched;
      setActiveFlow(flow);
      setIterationCount(0); // reset display after done
      setVisibleLimit(Math.max(20, matched.steps.length));
    }
  };


  // Universal Flow, Page or Route Selection Handler
  const handleSelectFlow = async (selectionId) => {
    if (!selectionId) return;

    // 1. Check if it's an existing auto-discovered flow
    const target = discoveredFlows.find(f => f.id === selectionId);
    if (target) {
      const flow = aiEnabled ? await enrichFlow(target) : target;
      setActiveFlow(flow);
      setActiveFlowId(selectionId);
      setSearchQuery(target.title);
      setExpandedNodeIds(new Set());
      setVisibleLimit(Math.max(20, target.steps.length));
      return;
    }

    // 2. Otherwise it's a page or route ID (e.g. `page_${id}` or `route_${id}`)
    const rawNodeId = selectionId.replace(/^(page|route)_/, '');
    const node = graphIndex?.nodeMap?.get(rawNodeId);
    if (node) {
      const pathNodeIds = traceDomainConstrainedPath(node.id, graphIndex, 12, 'read');
      const cleanLabel = (node.displayLabel || node.label || 'Flow').replace(/\(\)$/, '');
      const rawFlow = buildFlowResultFromNodeIds(
        pathNodeIds,
        `${cleanLabel} Flow`,
        `Complete architecture flow for ${cleanLabel} (${node.source_file || ''})`,
        graphIndex,
        `custom_flow_${node.id}`
      );
      const flow = aiEnabled ? await enrichFlow(rawFlow) : rawFlow;
      setActiveFlow(flow);
      setActiveFlowId(selectionId);
      setSearchQuery(`${cleanLabel} flow`);
      setExpandedNodeIds(new Set());
      setVisibleLimit(Math.max(20, flow.steps.length));
    }
  };


  // Pagination controls
  const handleExpandNext = () => setVisibleLimit((prev) => prev + 10);
  const handleCollapse = () => setVisibleLimit(10);
  const handleExpandAll = () => {
    if (activeFlow) setVisibleLimit(activeFlow.steps.length);
  };

  // Single-click on node -> Just select and highlight node in diagram & stepper
  const handleSelectNode = (stepOrNode) => {
    const fullNode = graphIndex?.nodeMap?.get(stepOrNode.id) || stepOrNode;
    setSelectedNode(fullNode);
  };

  // Explicit click on Code icon -> Open code snippet & IDE launcher modal
  const handleOpenCodeModal = (stepOrNode) => {
    const fullNode = graphIndex?.nodeMap?.get(stepOrNode.id) || stepOrNode;
    setSelectedNode(fullNode);
    setIsSnippetModalOpen(true);
  };

  // Toggle inline expansion in FlowDiagram (Neo4j style - no popups)
  const handleToggleExpandNode = (stepOrNode) => {
    const id = typeof stepOrNode === 'string' ? stepOrNode : stepOrNode?.id;
    if (!id) return;
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleResetExpansions = () => {
    setExpandedNodeIds(new Set());
  };

  // Dig Flow Action -> Expands node inline inside the Mermaid flowchart
  const handleDigNode = (stepOrNode) => {
    handleToggleExpandNode(stepOrNode);
  };

  // Load custom graph via upload
  const handleCustomGraphLoaded = ({ repoName: name, graph, analysis }) => {
    setRepoName(name);
    setRepoRoot('');
    setGraphData(graph);
    setAnalysisData(analysis || {});
  };

  // Load from local server directory path
  const handleLoadLocalPath = async (folderPath) => {
    const res = await fetch('/api/set-repo-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: folderPath }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to load repository path.');
    }

    const graphRes = await fetch('/api/graph');
    const data = await graphRes.json();
    setRepoName(data.repoName);
    setRepoRoot(data.repoRoot);
    setGraphData(data.graph);
    setAnalysisData(data.analysis || {});
  };

  // Load demo sample dataset
  const handleLoadDemo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/graph');
      if (res.ok) {
        const data = await res.json();
        setRepoName(data.repoName || 'Demo Repository');
        setRepoRoot(data.repoRoot || '');
        setGraphData(data.graph);
        setAnalysisData(data.analysis || {});
      }
    } catch (err) {
      console.error('Demo loading failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Universal Top Navigation */}
      <Navbar
        repoName={repoName || 'GraphFlow'}
        reviewInsightsCount={reviewInsights?.totalIssues || 0}
        onOpenReviewPanel={() => setIsReviewPanelOpen(true)}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        discoveredFlows={discoveredFlows}
        allPages={allPages}
        allRoutes={allRoutes}
        activeFlowId={activeFlowId}
        onSelectFlow={handleSelectFlow}
        onOpenPageBrowser={() => setIsPageBrowserOpen(true)}
        aiEngineName={aiStatus?.engines?.[aiStatus?.activeEngine]?.name?.split(' ')[0] || 'AI'}
        onOpenAiSetup={() => setIsAiSetupOpen(true)}
        onOpenAiReview={() => setIsAiReviewOpen(true)}
        hasActiveFlow={Boolean(activeFlow)}
      />

      {/* Main Workspace - Full Screen Mode */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
            <p className="text-sm text-slate-300 font-medium">
              Initializing universal architecture engine...
            </p>
          </div>
        )}

        {/* Empty State / Welcome Screen if no graph is loaded */}
        {!loading && !graphIndex && (
          <EmptyStateWelcome
            onLoadGraphFiles={handleCustomGraphLoaded}
            onLoadLocalPath={handleLoadLocalPath}
            onLoadDemo={handleLoadDemo}
          />
        )}

        {/* Active Dashboard when Graph is Loaded */}
        {!loading && graphIndex && (
          <>
            {/* Overview Metrics Cards */}
            <MetricsOverview
              graphIndex={graphIndex}
              reviewInsightsCount={reviewInsights?.totalIssues || 0}
              onOpenReviewPanel={() => setIsReviewPanelOpen(true)}
            />

            {/* Dynamic Natural Language Query Bar & AI Refinement */}
            <SearchSection
              searchQuery={searchQuery}
              onSearch={handleSearch}
              activeFlow={activeFlow}
              aiStatus={aiStatus}
              aiEnabled={aiEnabled}
              onAiToggle={() => setAiEnabled(v => !v)}
              loopEnabled={loopEnabled}
              onLoopToggle={() => setLoopEnabled(v => !v)}
              maxIterations={maxIterations}
              onMaxIterationsChange={setMaxIterations}
              iterationCount={iterationCount}
            />

            {/* Primary Flow Canvas */}
            {activeFlow ? (
              <div className="space-y-4">
                {/* Result quality badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {activeFlow.aiEnriched && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-950/40 border border-violet-500/25 text-xs text-violet-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                      <span>Descriptions enriched by <b>{activeFlow.aiEngine || 'AI'}</b></span>
                    </div>
                  )}
                  {activeFlow.totalIterationsRan > 1 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/25 text-xs text-emerald-300">
                      <span>⟳</span>
                      <span><b>{activeFlow.totalIterationsRan} iterations</b> ran — {activeFlow.title.includes('Merged') ? 'results merged for deeper coverage' : 'best result selected'}</span>
                    </div>
                  )}
                </div>

                {/* Mermaid Multi-Tier Flowchart (with AI enriching overlay) */}
                <div className="relative">
                  {aiEnriching && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-dark-950/80 backdrop-blur-sm">
                      <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-dark-900 border border-violet-500/40 shadow-2xl">
                        <svg className="w-5 h-5 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        <span className="text-sm font-medium text-violet-200">AI is reading the flow and writing better descriptions…</span>
                      </div>
                    </div>
                  )}
                  <FlowDiagram
                  steps={activeFlow.steps}
                  visibleLimit={visibleLimit}
                  onExpandNext={handleExpandNext}
                  onExpandAll={handleExpandAll}
                  onCollapse={handleCollapse}
                  selectedNodeId={selectedNode?.id}
                  onSelectNode={handleSelectNode}
                  onOpenCodeModal={handleOpenCodeModal}
                  onDigNode={handleDigNode}
                  graphIndex={graphIndex}
                  expandedNodeIds={expandedNodeIds}
                  onToggleExpandNode={handleToggleExpandNode}
                  onResetExpansions={handleResetExpansions}
                />
                </div>{/* end relative AI-enriching wrapper */}

                {/* Sequence Stepper */}
                <StepPagination
                  steps={activeFlow.steps}
                  visibleLimit={visibleLimit}
                  selectedNodeId={selectedNode?.id}
                  onSelectStep={handleSelectNode}
                  onOpenCodeModal={handleOpenCodeModal}
                  onDigNode={handleDigNode}
                  onExpandNext={handleExpandNext}
                  onCollapse={handleCollapse}
                  onExpandAll={handleExpandAll}
                />

                {/* Database Reads vs. Writes Side-Effects Card */}
                <DbSideEffectsCard
                  dbSideEffects={activeFlow.dbSideEffects}
                  onSelectStep={handleSelectNode}
                />
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 bg-dark-900 rounded-2xl border border-slate-800">
                <p>No sequence steps matched your search query. Try another query or select a discovered flow.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-dark-900/60 py-4 text-center text-xs text-slate-500">
        <p>GraphFlow-Universal • Generic Graphify Architecture & Flow Reviewer</p>
      </footer>

      {/* Double-Click AST Inner Code Flow Drawer */}
      {drillDownNode && (
        <NodeDetailDrawer
          node={drillDownNode}
          innerCodeFlow={innerCodeFlow}
          repoRoot={repoRoot}
          onClose={() => setDrillDownNode(null)}
          onInspectSnippet={(n) => {
            setSelectedNode(n);
            setIsSnippetModalOpen(true);
          }}
        />
      )}

      {/* Click-to-Code Snippet Modal & IDE Launcher */}
      {isSnippetModalOpen && selectedNode && (
        <CodeSnippetModal
          node={selectedNode}
          repoRoot={repoRoot}
          onClose={() => setIsSnippetModalOpen(false)}
        />
      )}

      {/* Universal Code Review Insights Panel */}
      <CodeReviewPanel
        insights={reviewInsights}
        isOpen={isReviewPanelOpen}
        onClose={() => setIsReviewPanelOpen(false)}
        onSelectNodeById={(id) => {
          const node = graphIndex?.nodeMap?.get(id);
          if (node) handleDigNode(node);
        }}
      />

      {/* Load / Switch Graph Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onCustomGraphLoaded={handleCustomGraphLoaded}
        onLoadLocalPath={handleLoadLocalPath}
        onLoadDemo={handleLoadDemo}
      />

      {/* Multi-Engine AI Setup & Diagnostics Wizard */}
      <AiSetupModal
        isOpen={isAiSetupOpen}
        onClose={() => {
          setIsAiSetupOpen(false);
          fetchAiStatus();
        }}
        onOpenAiReview={() => setIsAiReviewOpen(true)}
        currentFlow={activeFlow}
      />

      {/* AI Architectural Flow Review Drawer */}
      <AiFlowReviewDrawer
        isOpen={isAiReviewOpen}
        onClose={() => setIsAiReviewOpen(false)}
        flow={activeFlow}
        aiStatus={aiStatus}
        onOpenSetup={() => {
          setIsAiReviewOpen(false);
          setIsAiSetupOpen(true);
        }}
      />

      {/* Full Page, View & Route Browser Modal */}
      <PageBrowserModal
        isOpen={isPageBrowserOpen}
        onClose={() => setIsPageBrowserOpen(false)}
        allPages={allPages}
        allRoutes={allRoutes}
        discoveredFlows={discoveredFlows}
        onSelectFlowOrPage={handleSelectFlow}
      />
    </div>
  );
}
