import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Copy, 
  Check, 
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Code2,
  FileCode,
  X,
  ExternalLink,
  GitBranch,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { generateMermaidFlowchart } from '../services/flowTracer.js';

// Initialize Mermaid with custom dark theme settings
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    curve: 'basis',
  },
  themeVariables: {
    darkMode: true,
    background: '#0b0f19',
    primaryColor: '#1e293b',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#38bdf8',
    lineColor: '#64748b',
    secondaryColor: '#334155',
    tertiaryColor: '#1e293b',
  },
});

export default function FlowDiagram({
  steps = [],
  visibleLimit = 20,
  onExpandNext,
  onExpandAll,
  onCollapse,
  selectedNodeId,
  onSelectNode,
  onOpenCodeModal,
  onDigNode,
  graphIndex,
  expandedNodeIds: controlledExpandedNodeIds,
  onToggleExpandNode,
  onResetExpansions,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [renderError, setRenderError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isMermaidViewOpen, setIsMermaidViewOpen] = useState(false);
  const [mermaidModalTab, setMermaidModalTab] = useState('rendered'); // 'rendered' | 'code'
  const [showBranches, setShowBranches] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [internalExpandedNodeIds, setInternalExpandedNodeIds] = useState(new Set());

  // Escape key to exit fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Non-passive wheel listener on the canvas — prevents the browser from zooming
  // or scrolling the page when the cursor is inside the diagram area.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.preventDefault(); // Must be called from a non-passive listener
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+scroll or trackpad pinch → zoom diagram only
        const factor = e.deltaY < 0 ? 1.1 : 0.909;
        setZoom((z) => Math.min(5, Math.max(0.1, z * factor)));
      } else {
        // Bare scroll → pan vertically inside diagram
        setPan((p) => ({ x: p.x, y: p.y - e.deltaY }));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []); // canvasRef.current is stable; zoom/pan use functional updates so no deps needed

  const expandedNodeIds = controlledExpandedNodeIds !== undefined ? controlledExpandedNodeIds : internalExpandedNodeIds;

  const handleToggleExpand = (nodeId) => {
    if (onToggleExpandNode) {
      onToggleExpandNode(nodeId);
    } else {
      setInternalExpandedNodeIds(prev => {
        const next = new Set(prev);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return next;
      });
    }
  };

  const handleResetExp = () => {
    if (onResetExpansions) {
      onResetExpansions();
    } else {
      setInternalExpandedNodeIds(new Set());
    }
  };

  // Reset expanded nodes when steps / active flow changes
  useEffect(() => {
    if (onResetExpansions) {
      onResetExpansions();
    } else {
      setInternalExpandedNodeIds(new Set());
    }
  }, [steps]);

  // Pan & Zoom state (Main Canvas)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Pan & Zoom state (Modal Viewport)
  const [modalZoom, setModalZoom] = useState(1);
  const [modalPan, setModalPan] = useState({ x: 0, y: 0 });
  const [isModalDragging, setIsModalDragging] = useState(false);
  const [modalDragStart, setModalDragStart] = useState({ x: 0, y: 0 });

  const isExpanded = visibleLimit >= steps.length;
  const hasMore = steps.length > visibleLimit;

  // Generate Mermaid code supporting Neo4j-style inline expansion
  const mermaidCode = generateMermaidFlowchart(steps, visibleLimit, selectedNodeId, {
    showBranches,
    expandedNodeIds,
    graphIndex,
  });

  // Render Mermaid Diagram
  useEffect(() => {
    let isCancelled = false;
    const renderId = `mermaid_chart_${Date.now()}`;

    async function renderGraph() {
      try {
        setRenderError(null);
        const { svg } = await mermaid.render(renderId, mermaidCode);
        if (!isCancelled) {
          setSvgContent(svg);
        }
      } catch (err) {
        console.error('[FlowDiagram] Mermaid render error:', err);
        if (!isCancelled) {
          setRenderError('Error rendering flowchart diagram.');
        }
      }
    }

    renderGraph();

    return () => {
      isCancelled = true;
    };
  }, [mermaidCode]);

  // Attach interactive SVG listeners (Click on Action Buttons, Click on Node, Click on Expand)
  useEffect(() => {
    if (!containerRef.current || !svgContent) return;

    const svgEl = containerRef.current.querySelector('svg');
    if (!svgEl) return;

    // Helper to resolve main spine step, branch node, or inner AST function by ID
    const findTargetNode = (targetId) => {
      if (!targetId) return null;
      const main = steps.find(s => s.id === targetId);
      if (main) return main;
      for (const s of steps) {
        if (s.branches) {
          const b = s.branches.find(branch => branch.id === targetId);
          if (b) return b;
        }
      }
      if (graphIndex?.nodeMap?.has(targetId)) {
        return graphIndex.nodeMap.get(targetId);
      }
      return null;
    };

    svgEl.onclick = (e) => {
      // 1. Action Button: Go to Code (</> Code)
      const codeBtn = e.target.closest('.action-code');
      if (codeBtn) {
        e.stopPropagation();
        e.preventDefault();
        const nodeId = codeBtn.getAttribute('data-node-id');
        const target = findTargetNode(nodeId);
        if (target) {
          onOpenCodeModal?.(target);
        }
        return;
      }

      // 2. Action Button: Dig / Inner Code Flow (🔍 Dig Flow) -> Inline diagram expansion (Neo4j style)
      const digBtn = e.target.closest('.action-dig');
      if (digBtn) {
        e.stopPropagation();
        e.preventDefault();
        const nodeId = digBtn.getAttribute('data-node-id');
        if (nodeId) {
          handleToggleExpand(nodeId);
        }
        return;
      }

      // 3. Info (i) Button: Show human-readable description tooltip
      const infoBtn = e.target.closest('.action-info');
      if (infoBtn) {
        e.stopPropagation();
        e.preventDefault();
        const nodeId = infoBtn.getAttribute('data-node-id');
        const target = findTargetNode(nodeId);
        if (target) {
          // Remove any existing info tooltip
          document.querySelectorAll('.graphflow-info-tooltip').forEach(el => el.remove());
          const tooltip = document.createElement('div');
          tooltip.className = 'graphflow-info-tooltip';
          tooltip.style.cssText = `
            position: fixed;
            z-index: 9999;
            max-width: 360px;
            padding: 14px 16px;
            background: #0f172a;
            border: 1px solid rgba(99,102,241,0.5);
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8);
            color: #e2e8f0;
            font-size: 12px;
            line-height: 1.6;
            font-family: sans-serif;
            pointer-events: none;
          `;
          const rect = infoBtn.getBoundingClientRect();
          tooltip.style.left = `${Math.min(rect.left, window.innerWidth - 380)}px`;
          tooltip.style.top = `${rect.bottom + 8}px`;
          const label = target.displayLabel || target.label || '';
          const desc = target.humanDescription || (typeof target.getHumanReadableDescription === 'function' ? target.getHumanReadableDescription() : '');
          tooltip.innerHTML = `
            <div style="font-size:10px;font-weight:700;color:#a5b4fc;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">${target.tier?.label || 'Component'}</div>
            <div style="font-weight:600;font-size:13px;color:#f1f5f9;margin-bottom:8px;">${label}</div>
            <div style="color:#94a3b8;">${desc || 'No description available.'}</div>
            <div style="margin-top:8px;font-size:10px;color:#475569;font-family:monospace;">${(target.source_file || '').split(/[/\\]/).slice(-2).join('/')}</div>
          `;
          document.body.appendChild(tooltip);
          // Auto-dismiss after 5s or on next click
          const dismiss = () => { tooltip.remove(); document.removeEventListener('click', dismiss); };
          setTimeout(() => document.addEventListener('click', dismiss), 50);
          setTimeout(() => tooltip.remove(), 5000);
        }
        return;
      }

      // 4. Expand Next Steps Button
      const expandBtn = e.target.closest('#btn_expand_steps, .btn-expand-steps');
      if (expandBtn || e.target.textContent?.includes('Expand Next')) {
        e.stopPropagation();
        e.preventDefault();
        onExpandNext?.();
        return;
      }

      // 4. Clicking the node card itself (Only highlights/selects without opening code modal)
      const nodeEl = e.target.closest('.graphflow-node');
      if (nodeEl) {
        e.stopPropagation();
        const nodeId = nodeEl.getAttribute('data-node-id');
        const target = findTargetNode(nodeId);
        if (target) {
          onSelectNode?.(target);
        }
      }
    };
  }, [svgContent, steps, onSelectNode, onOpenCodeModal, onExpandNext, graphIndex, handleToggleExpand]);

  // Pan handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(2.5, z + 0.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, z - 0.15));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Copy Mermaid code
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(mermaidCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy markup:', err);
    }
  };

  // Export as SVG file
  const handleExportSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graphflow_diagram_${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export as .mmd file
  const handleExportMmd = () => {
    const blob = new Blob([mermaidCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graphflow_${Date.now()}.mmd`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const containerClasses = isFullscreen
    ? "fixed inset-0 z-50 w-screen h-screen bg-dark-950 flex flex-col overflow-hidden animate-in fade-in duration-200"
    : "relative w-full rounded-2xl bg-dark-900 border border-slate-800 shadow-2xl flex flex-col min-h-[620px] h-[75vh]";

  return (
    <div className={containerClasses}>
      {/* Top Diagram Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-dark-850/90 border-b border-slate-800 z-10">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">
            Multi-Tier Flowchart
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            (Showing {Math.min(visibleLimit, steps.length)} of {steps.length} Steps)
          </span>
        </div>

        {/* Diagram Controls */}
        <div className="flex items-center gap-1.5 text-xs">
          {/* Zoom Controls */}
          <div className="flex items-center rounded-lg bg-dark-800 border border-slate-700/80 p-0.5">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded hover:bg-dark-700 text-slate-300 hover:text-cyan-400 transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-mono text-slate-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded hover:bg-dark-700 text-slate-300 hover:text-cyan-400 transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded hover:bg-dark-700 text-slate-300 hover:text-cyan-400 transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Branching View Toggle */}
          <button
            onClick={() => setShowBranches(!showBranches)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all shadow-sm ${
              showBranches
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/25'
                : 'bg-dark-800 border-slate-700/80 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle multi-branch fan-out and subnodes"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>{showBranches ? 'Branches: ON' : 'Spine Only'}</span>
          </button>

          {/* Reset Expansions Toolbar Button (Neo4j Style) */}
          {expandedNodeIds.size > 0 && (
            <button
              onClick={handleResetExp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-semibold text-xs transition-all shadow-sm group"
              title="Retract/collapse all expanded inner AST functions (Neo4j style)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400 group-hover:-rotate-90 transition-transform" />
              <span>Reset Expansions ({expandedNodeIds.size})</span>
            </button>
          )}

          {/* Mermaid View Toggle */}
          <button
            onClick={() => setIsMermaidViewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-semibold transition-all shadow-sm"
            title="Open Mermaid.js Source Code View"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mermaid View</span>
          </button>

          {/* Copy Mermaid Code */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 border border-slate-700/80 text-slate-300 hover:text-slate-100 transition-colors"
            title="Copy Mermaid.js source markup"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Export SVG */}
          <button
            onClick={handleExportSvg}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 border border-slate-700/80 text-slate-300 hover:text-slate-100 transition-colors"
            title="Download SVG image"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">SVG</span>
          </button>

          {/* Fullscreen Mode Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm ${
              isFullscreen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30'
                : 'bg-dark-800 hover:bg-dark-700 border-slate-700/80 text-slate-300 hover:text-slate-100'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="hidden md:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* Helper Banner */}
      <div className="flex items-center justify-between px-4 py-2 bg-dark-950/70 border-b border-slate-800/60 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span>Click <b>[&lt;/&gt; Code]</b> on any node to view snippet & IDE link, or <b>[🔍 Dig Flow]</b> to expand internal functions.</span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Read
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span> Write
          </span>
          <span>Click node body to select without opening modal.</span>
        </div>
      </div>

      {/* Main Canvas — wheel events handled via non-passive listener in useEffect */}
      <div
        ref={canvasRef}
        className="relative flex-1 w-full overflow-hidden cursor-grab active:cursor-grabbing bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {renderError ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-rose-400">
            <p className="font-semibold">{renderError}</p>
            <p className="text-xs text-slate-400 mt-2">Check Mermaid syntax or step sequence.</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'top center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
            className="mermaid-container flex justify-center items-center min-h-[480px] p-8 select-none"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}

        {/* Bottom Floating Step Expansion Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 bg-dark-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
          {hasMore && (
            <button
              onClick={onExpandNext}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-glow-cyan transition-all"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>[ + Expand Next 5 Steps ]</span>
            </button>
          )}

          {hasMore && (
            <button
              onClick={onExpandAll}
              className="px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-slate-100 text-xs font-medium border border-slate-700/60 transition-all"
            >
              Show All ({steps.length})
            </button>
          )}

          {visibleLimit > 5 && (
            <button
              onClick={onCollapse}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-slate-100 text-xs font-medium border border-slate-700/60 transition-all"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Collapse to 5</span>
            </button>
          )}
        </div>
      </div>

      {/* Mermaid View Modal */}
      {isMermaidViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-5xl h-[88vh] bg-dark-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-dark-850 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Mermaid Architecture View
                  </h3>
                  <p className="text-xs text-slate-400">
                    Interactive visual flowchart diagram & raw Mermaid definition
                  </p>
                </div>
              </div>

              {/* View Mode Tabs */}
              <div className="flex items-center gap-1 bg-dark-950/80 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setMermaidModalTab('rendered')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    mermaidModalTab === 'rendered'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Rendered Diagram View</span>
                </button>
                <button
                  onClick={() => setMermaidModalTab('code')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    mermaidModalTab === 'code'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Raw Markup</span>
                </button>
              </div>

              <button
                onClick={() => setIsMermaidViewOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-2 bg-dark-950/80 border-b border-slate-800 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                {steps.length} flow stages • {mermaidModalTab === 'rendered' ? 'Interactive SVG Graphics' : `${mermaidCode.split('\n').length} markup lines`}
              </span>

              <div className="flex items-center gap-2">
                {mermaidModalTab === 'rendered' ? (
                  <>
                    <div className="flex items-center rounded-lg bg-dark-800 border border-slate-700/80 p-0.5">
                      <button
                        onClick={() => setModalZoom((z) => Math.min(2.5, z + 0.15))}
                        className="p-1 text-slate-300 hover:text-cyan-400"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-1.5 text-[11px] font-mono text-slate-400">
                        {Math.round(modalZoom * 100)}%
                      </span>
                      <button
                        onClick={() => setModalZoom((z) => Math.max(0.4, z - 0.15))}
                        className="p-1 text-slate-300 hover:text-cyan-400"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setModalZoom(1); setModalPan({ x: 0, y: 0 }); }}
                        className="p-1 text-slate-300 hover:text-cyan-400"
                        title="Reset View"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={handleExportSvg}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download SVG</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-200 border border-slate-700 font-medium transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Markup'}</span>
                    </button>

                    <button
                      onClick={handleExportMmd}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .mmd</span>
                    </button>

                    <a
                      href="https://mermaid.live"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mermaid Live Editor</span>
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Modal Body: Rendered View OR Code View */}
            <div className="flex-1 overflow-hidden relative bg-dark-950">
              {mermaidModalTab === 'rendered' ? (
                <div
                  className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center p-6 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"
                  onMouseDown={(e) => {
                    if (e.target.closest('button')) return;
                    setIsModalDragging(true);
                    setModalDragStart({ x: e.clientX - modalPan.x, y: e.clientY - modalPan.y });
                  }}
                  onMouseMove={(e) => {
                    if (!isModalDragging) return;
                    setModalPan({
                      x: e.clientX - modalDragStart.x,
                      y: e.clientY - modalDragStart.y,
                    });
                  }}
                  onMouseUp={() => setIsModalDragging(false)}
                  onMouseLeave={() => setIsModalDragging(false)}
                >
                  <div
                    style={{
                      transform: `translate(${modalPan.x}px, ${modalPan.y}px) scale(${modalZoom})`,
                      transformOrigin: 'center center',
                      transition: isModalDragging ? 'none' : 'transform 0.1s ease-out',
                    }}
                    className="mermaid-container flex justify-center items-center select-none"
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                  />
                </div>
              ) : (
                <div className="w-full h-full overflow-y-auto p-4 font-mono text-xs">
                  <pre className="p-4 rounded-xl bg-dark-900 border border-slate-800/80 text-cyan-200 overflow-x-auto whitespace-pre leading-relaxed select-all">
                    {mermaidCode}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-dark-850 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>{mermaidModalTab === 'rendered' ? 'Pan by dragging anywhere on canvas • Use zoom buttons to inspect details' : 'You can copy this markup into Obsidian, GitHub PRs, or Markdown documentation.'}</span>
              <button
                onClick={() => setIsMermaidViewOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
