import React from "react";
import { Shield, Play, Terminal, Lock, HelpCircle, Sparkles } from "lucide-react";
import { AppSettings } from "../types/grammarGuard.ts";

interface HeaderProps {
  currentView: string;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  settings: AppSettings;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onAnalyze,
  isAnalyzing,
  settings,
  onOpenHelp,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-semibold text-slate-100 tracking-tight">
          <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-base font-bold bg-gradient-to-r from-slate-100 via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            GrammerGuard
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <Terminal className="w-3 h-3 text-emerald-400" />
            <span>Python 3.10 AST</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="capitalize text-slate-400">{currentView.replace("-", " ")}</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Privacy Indicator */}
        <div
          title={
            settings.storeRawSourceCode
              ? "Raw source retention: ENABLED (Code saved in local history)"
              : "Privacy Mode: Raw source retention is DISABLED"
          }
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-800 bg-slate-900/60 text-slate-400"
        >
          <Lock className="w-3 h-3 text-indigo-400" />
          <span>Privacy: {settings.storeRawSourceCode ? "Retention ON" : "No Code Stored"}</span>
        </div>

        {/* Gemini status */}
        {settings.enableGeminiExplanation && (
          <div
            title="Grounded Gemini 3.8 Flash compiler explainer active"
            className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-violet-900/50 bg-violet-950/30 text-violet-300"
          >
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span>Gemini Grounded</span>
          </div>
        )}

        {/* Analyze Code Button */}
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Parsing AST...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Analyze Code</span>
            </>
          )}
        </button>

        {/* Help button */}
        <button
          onClick={onOpenHelp}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition-colors"
          title="About GrammerGuard & Theory of Computation"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
