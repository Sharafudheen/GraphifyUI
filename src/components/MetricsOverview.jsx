import React from 'react';
import { 
  Layers, 
  GitFork, 
  Monitor, 
  Server, 
  Database, 
  ShieldAlert 
} from 'lucide-react';

export default function MetricsOverview({
  graphIndex,
  reviewInsightsCount = 0,
  onOpenReviewPanel,
}) {
  if (!graphIndex) return null;

  const totalNodes = graphIndex.nodes?.length || 0;
  const totalLinks = graphIndex.links?.length || 0;

  // Count tiers
  let uiCount = 0;
  let controllerCount = 0;
  let dbCount = 0;

  for (const n of graphIndex.nodes || []) {
    const tierId = n.tier?.id;
    if (tierId === 'UI_COMPONENT') uiCount++;
    else if (tierId === 'CONTROLLER') controllerCount++;
    else if (tierId === 'DB_MODEL') dbCount++;
  }

  const cards = [
    { label: 'Total AST Nodes', value: totalNodes.toLocaleString(), icon: Layers, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    { label: 'Dependency Links', value: totalLinks.toLocaleString(), icon: GitFork, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
    { label: 'Frontend UI Pages', value: uiCount.toLocaleString(), icon: Monitor, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    { label: 'Controllers & Use Cases', value: controllerCount.toLocaleString(), icon: Server, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Database Models', value: dbCount.toLocaleString(), icon: Database, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
    { 
      label: 'Review Bottlenecks', 
      value: reviewInsightsCount.toString(), 
      icon: ShieldAlert, 
      color: 'text-rose-400', 
      bg: 'bg-rose-500/10 border-rose-500/30 cursor-pointer hover:border-rose-500/60',
      onClick: onOpenReviewPanel 
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            onClick={c.onClick}
            className={`p-3 rounded-xl border ${c.bg} transition-all flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="truncate">{c.label}</span>
              <Icon className={`w-3.5 h-3.5 ${c.color}`} />
            </div>
            <div className="text-lg font-extrabold text-slate-100 font-mono">
              {c.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
