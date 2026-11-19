import React from 'react';
import {
  Network,
  Radio,
  Share2,
  ShieldCheck,
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'logic' | 'propagation' | 'containment';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  affectedCount: number;
  totalNodes: number;
  riskCategory?: 'High' | 'Moderate' | 'Lower';
}

interface NavItemConfig {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  essentialIndicator?: string | null;
  indicatorStyle?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  affectedCount,
  totalNodes,
  riskCategory,
}) => {
  const navItems: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'Network & Inputs',
      icon: Network,
      essentialIndicator: `${totalNodes}`,
      indicatorStyle: 'text-slate-600 bg-slate-100 border-slate-200',
    },
    {
      id: 'logic',
      label: 'Logic & Credibility',
      icon: Radio,
      essentialIndicator: riskCategory || null,
      indicatorStyle:
        riskCategory === 'High'
          ? 'text-red-700 bg-red-50 border-red-200'
          : riskCategory === 'Moderate'
          ? 'text-amber-700 bg-amber-50 border-amber-200'
          : 'text-slate-600 bg-slate-100 border-slate-200',
    },
    {
      id: 'propagation',
      label: 'Propagation & Prediction',
      icon: Share2,
      essentialIndicator: affectedCount > 0 ? `${affectedCount}/${totalNodes}` : null,
      indicatorStyle: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      id: 'containment',
      label: 'Influence & Containment',
      icon: ShieldCheck,
      essentialIndicator: null,
    },
  ];

  return (
    <aside className="w-[320px] min-w-[320px] shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between h-screen sticky top-0 overflow-y-auto z-20">
      <div className="flex flex-col">
        {/* Brand / Application Identity */}
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white shadow-xs">
                <Network className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-slate-900 tracking-tight truncate">
                  Misinformation Lab
                </h1>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  Graph Containment System
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500 font-medium">
              v2.4
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-3.5 space-y-1">
          <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group relative flex w-full h-[44px] items-center justify-between rounded-md px-3.5 transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-blue-50/70 text-slate-900 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {/* Subtle Left-Edge Accent Indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-blue-600" />
                  )}

                  <div className="flex items-center gap-[14px] min-w-0">
                    {/* Secondary Slate-Gray Icon */}
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                        isActive
                          ? 'text-slate-600'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span className="text-[15px] font-medium leading-none text-inherit truncate">
                      {item.label}
                    </span>
                  </div>

                  {/* Essential Data Indicator (No decorative formulas) */}
                  {item.essentialIndicator && (
                    <span
                      className={`ml-2 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-medium border ${
                        item.indicatorStyle ||
                        'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      {item.essentialIndicator}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-3">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Simulation Engine</span>
          <span className="flex items-center gap-1.5 text-green-600 font-sans font-medium text-[11px]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
            Ready
          </span>
        </div>
      </div>
    </aside>
  );
};
