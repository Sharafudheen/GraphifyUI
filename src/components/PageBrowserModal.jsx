import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Layers, 
  ArrowRight, 
  FolderGit2, 
  Monitor, 
  Server, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function PageBrowserModal({
  isOpen,
  onClose,
  allPages = [],
  allRoutes = [],
  discoveredFlows = [],
  onSelectFlowOrPage,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pages'); // 'pages' | 'routes' | 'flows'

  // Filter items based on query and active tab
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return allPages;
    const q = searchQuery.toLowerCase();
    return allPages.filter(p => 
      p.label.toLowerCase().includes(q) ||
      p.module.toLowerCase().includes(q) ||
      (p.source_file || '').toLowerCase().includes(q)
    );
  }, [allPages, searchQuery]);

  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return allRoutes;
    const q = searchQuery.toLowerCase();
    return allRoutes.filter(r => 
      r.label.toLowerCase().includes(q) ||
      r.module.toLowerCase().includes(q) ||
      (r.source_file || '').toLowerCase().includes(q)
    );
  }, [allRoutes, searchQuery]);

  const filteredFlows = useMemo(() => {
    if (!searchQuery.trim()) return discoveredFlows;
    const q = searchQuery.toLowerCase();
    return discoveredFlows.filter(f => 
      f.title.toLowerCase().includes(q) ||
      (f.description || '').toLowerCase().includes(q)
    );
  }, [discoveredFlows, searchQuery]);

  if (!isOpen) return null;

  const handleItemSelect = (id) => {
    onSelectFlowOrPage(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[85vh] bg-dark-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-dark-850/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Browse All Pages, Views & Workflows</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30">
                  {allPages.length + allRoutes.length} Total Endpoints
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Select any frontend page or route to instantly compute and visualize its multi-tier flow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-800 bg-dark-950/40 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all 150+ pages, routes, or modules (e.g. PurchaseOrder, Sell, Bill, Auth)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-850 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 p-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveTab('pages')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'pages'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-dark-800 hover:bg-dark-700 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Frontend Pages ({filteredPages.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('routes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'routes'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-dark-800 hover:bg-dark-700 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Backend Routes ({filteredRoutes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('flows')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'flows'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'bg-dark-800 hover:bg-dark-700 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Discovered Workflows ({filteredFlows.length})</span>
            </button>
          </div>
        </div>

        {/* List of Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[55vh]">
          {/* TAB: Pages */}
          {activeTab === 'pages' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredPages.map((page) => (
                <div
                  key={page.id}
                  onClick={() => handleItemSelect(`page_${page.id}`)}
                  className="group flex items-center justify-between p-3 rounded-xl bg-dark-850/80 hover:bg-dark-800 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 transition-colors flex-shrink-0">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-slate-200 group-hover:text-cyan-300 transition-colors truncate">
                          {page.label}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                          {page.module}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        {page.source_file}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 group-hover:text-cyan-400 transition-colors pl-2 flex-shrink-0">
                    <span className="text-xs font-semibold hidden sm:inline">Trace Flow</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
              {filteredPages.length === 0 && (
                <div className="col-span-2 text-center py-12 text-slate-400 text-xs">
                  No frontend pages matched "{searchQuery}".
                </div>
              )}
            </div>
          )}

          {/* TAB: Routes */}
          {activeTab === 'routes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredRoutes.map((route) => (
                <div
                  key={route.id}
                  onClick={() => handleItemSelect(`route_${route.id}`)}
                  className="group flex items-center justify-between p-3 rounded-xl bg-dark-850/80 hover:bg-dark-800 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 group-hover:text-amber-300 transition-colors flex-shrink-0">
                      <Server className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-slate-200 group-hover:text-amber-300 transition-colors truncate">
                          {route.label}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex-shrink-0">
                          {route.module}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        {route.source_file}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 group-hover:text-amber-400 transition-colors pl-2 flex-shrink-0">
                    <span className="text-xs font-semibold hidden sm:inline">Trace Flow</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
              {filteredRoutes.length === 0 && (
                <div className="col-span-2 text-center py-12 text-slate-400 text-xs">
                  No backend routes matched "{searchQuery}".
                </div>
              )}
            </div>
          )}

          {/* TAB: Flows */}
          {activeTab === 'flows' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredFlows.map((flow) => (
                <div
                  key={flow.id}
                  onClick={() => handleItemSelect(flow.id)}
                  className="group flex items-center justify-between p-3 rounded-xl bg-dark-850/80 hover:bg-dark-800 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors flex-shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                          {flow.title}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                          {flow.totalSteps} steps
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {flow.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 group-hover:text-indigo-400 transition-colors pl-2 flex-shrink-0">
                    <span className="text-xs font-semibold hidden sm:inline">Open Flow</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
              {filteredFlows.length === 0 && (
                <div className="col-span-2 text-center py-12 text-slate-400 text-xs">
                  No workflows matched "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-dark-900 flex items-center justify-between text-xs text-slate-500">
          <span>Click any card to load its complete architecture sequence</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-slate-100 transition-colors"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
