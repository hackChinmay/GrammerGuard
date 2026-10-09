import React from "react";
import {
  Shield,
  Code2,
  BookOpen,
  FlaskConical,
  ArrowRight,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Activity,
  Sparkles,
} from "lucide-react";
import { AnalysisResult } from "../types/grammarGuard.ts";
import { NavView } from "./Sidebar.tsx";

interface OverviewViewProps {
  onNavigate: (view: NavView) => void;
  history: AnalysisResult[];
  onLoadExampleInWorkspace: (code: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigate,
  history,
  onLoadExampleInWorkspace,
}) => {
  const totalRuns = history.length;
  const validRuns = history.filter((h) => h.diagnostic.parseSuccess).length;
  const repairedRuns = history.filter((h) => h.candidates.length > 0).length;

  const sampleCards = [
    {
      title: "Missing Delimiter",
      snippet: "total = (price + tax",
      fix: "total = (price + tax)",
      desc: "Balancing open parenthesis '(' with closing ')'",
    },
    {
      title: "Missing Separator",
      snippet: "numbers = [1, 2 3, 4]",
      fix: "numbers = [1, 2, 3, 4]",
      desc: "Inserting comma ',' between adjacent list literals",
    },
    {
      title: "Incomplete Expression",
      snippet: "total = price +",
      fix: "total = price",
      desc: "Trimming dangling operator '+' to restore valid grammar",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0f19] p-6 space-y-8">
      {/* Hero Banner */}
      <div className="max-w-5xl mx-auto rounded-2xl border border-indigo-900/40 bg-gradient-to-b from-slate-900/90 via-slate-900/50 to-slate-950/80 p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 border border-indigo-800/80 text-indigo-300">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Theory of Computation &bull; Grammar-Constrained Program Repair</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
            GrammerGuard
          </h1>
          <p className="text-base text-slate-300 max-w-2xl leading-relaxed">
            A developer platform combining deterministic formal syntax analysis, bounded candidate repair generation, independent Python compiler validation, and pedagogical explanations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 pt-2">
          <button
            onClick={() => onNavigate("workspace")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Code2 className="w-4 h-4" />
            <span>Open Code Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate("grammar")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Theory &bull; Grammar Explorer</span>
          </button>

          <button
            onClick={() => onNavigate("evaluation")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors"
          >
            <FlaskConical className="w-4 h-4 text-emerald-400" />
            <span>Evaluation Lab</span>
          </button>
        </div>
      </div>

      {/* Live System Statistics (from real state) */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Total Analyses</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-200">{totalRuns}</div>
          <div className="text-[10px] text-slate-500">Stored local sessions</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Valid Python Runs</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{validRuns}</div>
          <div className="text-[10px] text-slate-500">0 syntax error runs</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Repaired Sessions</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300">{repairedRuns}</div>
          <div className="text-[10px] text-slate-500">Candidates validated</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Compiler Engine</span>
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold font-mono text-slate-200 truncate mt-1">Python 3.10 AST</div>
          <div className="text-[10px] text-emerald-400">PEG Standard Parser</div>
        </div>
      </div>

      {/* Crucial Theory Callout: Syntax Validity vs Semantic Correctness */}
      <div className="max-w-5xl mx-auto p-5 rounded-xl border border-indigo-900/50 bg-indigo-950/20 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
          <AlertTriangle className="w-4 h-4 text-indigo-400" />
          <span>Core Principle: Syntax Validity &ne; Semantic Correctness</span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          In Theory of Computation, syntax recognition determines whether a token string belongs to the formal language recognized by the grammar: $w \in L(G)$.
          Passing the Python parser proves that an edited program is grammatically valid Python. It does <strong>not</strong> prove that the program computes what the programmer intended.
          GrammerGuard transparently reports verification statuses to ensure users understand the distinction.
        </p>
      </div>

      {/* Supported Error Categories Matrix */}
      <div className="max-w-5xl mx-auto space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">
          Supported Bounded Repair Scope
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sampleCards.map((card, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-200">{card.title}</div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-rose-300">
                  {card.snippet}
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300">
                  {card.fix}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{card.desc}</p>
              </div>

              <button
                onClick={() => {
                  onLoadExampleInWorkspace(card.snippet);
                  onNavigate("workspace");
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                <span>Try in Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
