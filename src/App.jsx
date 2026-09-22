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

  // Natural Language Search handler
  const handleSearch = (query) => {
    setSearchQuery(query);
    setActiveFlowId(null);
    setExpandedNodeIds(new Set());
    if (!graphIndex) return;

    const matched = matchFlowQuery(query, graphIndex, discoveredFlows);
    if (matched) {
      setActiveFlow(matched);
      setVisibleLimit(Math.max(20, matched.steps.length));
    }
  };

  // Universal Flow, Page or Route Selection Handler
  const handleSelectFlow = (selectionId) => {
    if (!selectionId) return;

    // 1. Check if it's an existing auto-discovered flow
    const target = discoveredFlows.find(f => f.id === selectionId);
    if (target) {
      setActiveFlow(target);
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
      const flow = buildFlowResultFromNodeIds(
        pathNodeIds,
        `${cleanLabel} Flow`,
        `Complete architecture flow for ${cleanLabel} (${node.source_file || ''})`,
        graphIndex,
        `custom_flow_${node.id}`
      );
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

            {/* Dynamic Natural Language Query Bar & Discovered Flows */}
            <SearchSection
              searchQuery={searchQuery}
              onSearch={handleSearch}
              discoveredFlows={discoveredFlows}
              onSelectFlow={handleSelectFlow}
              activeFlow={activeFlow}
            />

            {/* Primary Flow Canvas */}
            {activeFlow ? (
              <div className="space-y-4">
                {/* Mermaid Multi-Tier Flowchart */}
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
