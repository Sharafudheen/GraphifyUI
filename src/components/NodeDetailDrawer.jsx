import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { 
  X, 
  ExternalLink, 
  Code2, 
  Database, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Sparkles, 
  GitBranch, 
  Terminal 
} from 'lucide-react';

export default function NodeDetailDrawer({
  node,
  innerCodeFlow,
  repoRoot = '',
  onClose,
  onInspectSnippet,
}) {
  const [svgContent, setSvgContent] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!node) return null;

  const parent = innerCodeFlow?.parent || node;
  const helpers = innerCodeFlow?.helpers || [];

  // Generate Subgraph Mermaid Markup
  useEffect(() => {
    let isCancelled = false;
    const renderId = `subgraph_chart_${Date.now()}`;

    let code = 'flowchart TD\n';
    code += '  classDef parentNode fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#e0e7ff,rx:8,ry:8;\n';
    code += '  classDef helperNode fill:#0f172a,stroke:#38bdf8,stroke-width:1px,color:#f1f5f9,rx:6,ry:6;\n';
    code += '  classDef dbWrite fill:#881337,stroke:#fb7185,stroke-width:2px,color:#ffe4e6,rx:6,ry:6;\n';
    code += '  classDef dbRead fill:#0c4a6e,stroke:#38bdf8,stroke-width:2px,color:#bae6fd,rx:6,ry:6;\n\n';

    const safeParentId = `parent_${parent.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    code += `  ${safeParentId}["<b>${parent.displayLabel || parent.label}</b>\\n(Target Module)"]\n`;
    code += `  class ${safeParentId} parentNode;\n`;

    // Render helpers
    helpers.forEach((h, idx) => {
      const safeHId = `helper_${idx}_${h.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const title = (h.displayLabel || h.label || '').replace(/"/g, "'");
      const loc = h.source_location || '';
      code += `  ${safeHId}["${title}\\n<small>${loc}</small>"]\n`;

      if (h.dbOp?.type === 'WRITE') {
        code += `  class ${safeHId} dbWrite;\n`;
      } else if (h.dbOp?.type === 'READ') {
        code += `  class ${safeHId} dbRead;\n`;
      } else {
        code += `  class ${safeHId} helperNode;\n`;
      }

      code += `  ${safeParentId} -->|calls / contains| ${safeHId}\n`;
    });

    if (helpers.length === 0) {
      code += `  no_helpers["No private helper AST nodes extracted"]\n`;
      code += `  ${safeParentId} --> no_helpers\n`;
    }

    async function renderSub() {
      try {
        const { svg } = await mermaid.render(renderId, code);
        if (!isCancelled) {
          setSvgContent(svg);
        }
      } catch (err) {
        console.error('Failed to render subgraph:', err);
      }
    }

    renderSub();

    return () => {
      isCancelled = true;
    };
  }, [node, innerCodeFlow]);

  // Pan handlers
  const handleMouseDown = (e) => {
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

  const handleMouseUp = () => setIsDragging(false);

  // Dynamic IDE Link
  const lineNum = node.source_location?.replace(/[^\d]/g, '') || 1;
  const absPath = repoRoot ? `${repoRoot.replace(/\\/g, '/').replace(/\/+$/, '')}/${node.source_file}` : node.source_file;
  const vsCodeLink = `vscode://file/${absPath}:${lineNum}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div 
        className="w-full max-w-2xl h-full bg-dark-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-dark-850 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  {node.displayLabel || node.label}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-400 border border-slate-700">
                  {node.source_location || 'L1'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono truncate max-w-md">
                {node.source_file}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-2.5 bg-dark-950/70 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-md border text-[11px] font-medium ${node.tier?.badgeClass || 'bg-slate-800 text-slate-300'}`}>
              {node.tier?.label}
            </span>
            {node.dbOp && (
              <span className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 ${node.dbOp.badgeClass}`}>
                <Database className="w-3.5 h-3.5" />
                <span>{node.dbOp.label}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onInspectSnippet(node)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold transition-all"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Inspect Snippet</span>
            </button>

            <a
              href={vsCodeLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-sm"
              title="Open in IDE at exact line"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in IDE</span>
            </a>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Human Readable Explanation */}
          <div className="p-4 rounded-xl bg-dark-850 border border-slate-800 space-y-1">
            <h3 className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Architectural Purpose
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {node.humanDescription}
            </p>
          </div>

          {/* Sub-Graph Canvas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Inner Code Flow & AST Sub-Graph
                </h3>
              </div>

              <div className="flex items-center rounded-lg bg-dark-800 border border-slate-700/80 p-0.5">
                <button
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
                  className="p-1 text-slate-400 hover:text-slate-200"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                  className="p-1 text-slate-400 hover:text-slate-200"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <button
                  onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                  className="p-1 text-slate-400 hover:text-slate-200"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div 
              className="relative w-full h-64 rounded-xl bg-dark-950 border border-slate-800 overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center p-4"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                }}
                className="mermaid-container select-none"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </div>
          </div>

          {/* Helpers List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Parsed AST Internal Methods & Helpers ({helpers.length})
            </h3>

            {helpers.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No inner helper functions or AST siblings identified.</p>
            ) : (
              <div className="space-y-2">
                {helpers.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => onInspectSnippet(h)}
                    className="flex items-center justify-between p-3 rounded-lg bg-dark-850/80 hover:bg-dark-800 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Terminal className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                          {h.displayLabel || h.label}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-sm">
                          {h.humanDescription}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500 bg-dark-900 px-2 py-0.5 rounded border border-slate-800">
                        {h.source_location || 'L1'}
                      </span>
                      <Code2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
