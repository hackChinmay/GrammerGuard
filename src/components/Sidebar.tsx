import React from "react";
import {
  LayoutDashboard,
  Code2,
  BookOpen,
  FlaskConical,
  History,
  Settings,
  ChevronRight,
} from "lucide-react";

export type NavView = "overview" | "workspace" | "grammar" | "evaluation" | "history" | "settings";

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  historyCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, historyCount }) => {
  const navItems = [
    {
      id: "overview" as NavView,
      label: "Overview",
      icon: LayoutDashboard,
      badge: null,
      desc: "Dashboard & primer",
    },
    {
      id: "workspace" as NavView,
      label: "Code Workspace",
      icon: Code2,
      badge: "Python",
      desc: "Editor & repair engine",
    },
    {
      id: "grammar" as NavView,
      label: "Grammar Explorer",
      icon: BookOpen,
      badge: "CFG",
      desc: "Theory of Computation",
    },
    {
      id: "evaluation" as NavView,
      label: "Evaluation Lab",
      icon: FlaskConical,
      badge: "Bench",
      desc: "Benchmark metrics",
    },
    {
      id: "history" as NavView,
      label: "Analysis History",
      icon: History,
      badge: historyCount > 0 ? String(historyCount) : null,
      desc: "Past sessions",
    },
    {
      id: "settings" as NavView,
      label: "Settings",
      icon: Settings,
      badge: null,
      desc: "Privacy & preferences",
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/60 flex flex-col justify-between shrink-0 select-none">
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? "bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                <div className="text-left truncate">
                  <div className="leading-tight truncate">{item.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal leading-tight truncate">
                    {item.desc}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                    isActive
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="p-3 m-3 rounded-lg border border-slate-800/80 bg-slate-900/40 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between text-slate-300 font-medium">
          <span>Grammar-Constrained</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Repairs are strictly filtered through Python&apos;s real AST compiler.
        </p>
      </div>
    </aside>
  );
};
