import React from "react";
import {
  Settings,
  Shield,
  Lock,
  Sparkles,
  Sliders,
  Server,
  Terminal,
  CheckCircle2,
} from "lucide-react";
import { AppSettings } from "../types/grammarGuard.ts";

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0f19] p-6 space-y-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <Settings className="w-4 h-4" />
          <span>Configuration &bull; System Controls</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">
          Settings &amp; Environment
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed mt-1">
          Configure privacy boundaries, candidate bounds, and pedagogical explanation features.
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-4">
        {/* Privacy Settings Card */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4">
          <div className="flex items-center gap-2.5 text-slate-200 font-semibold text-sm">
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>Privacy &amp; Data Retention</span>
          </div>

          <div className="flex items-start justify-between gap-4 pt-2 border-t border-slate-800">
            <div>
              <div className="text-xs font-medium text-slate-300">
                Store Raw Source Code in Local History
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                When disabled, history entries only record cryptographic SHA-256 hashes and compiler diagnostics. Raw code strings are discarded immediately.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.storeRawSourceCode}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, storeRawSourceCode: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Explanations Settings Card */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4">
          <div className="flex items-center gap-2.5 text-slate-200 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>Pedagogical Compiler Explanations</span>
          </div>

          <div className="flex items-start justify-between gap-4 pt-2 border-t border-slate-800">
            <div>
              <div className="text-xs font-medium text-slate-300">
                Enable Grounded Gemini 3.8 Flash Explanations
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                Generates pedagogical explanations strictly grounded in verified compiler facts. If disabled or unavailable, GrammerGuard seamlessly falls back to the deterministic rule-based explainer.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.enableGeminiExplanation}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, enableGeminiExplanation: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Candidate Generation Bounds */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4">
          <div className="flex items-center gap-2.5 text-slate-200 font-semibold text-sm">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Candidate Search Space Bounds</span>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Maximum Ranked Candidates:</span>
              <span className="font-mono text-indigo-300 font-bold">{settings.maxCandidates}</span>
            </div>

            <input
              type="range"
              min="1"
              max="10"
              value={settings.maxCandidates}
              onChange={(e) =>
                onUpdateSettings({ ...settings, maxCandidates: parseInt(e.target.value, 10) })
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-[11px] text-slate-500">
              Restricts generated candidates to prevent combinatorial explosion.
            </p>
          </div>
        </div>

        {/* Architecture & Verification Specs */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <Server className="w-4 h-4 text-indigo-400" />
            <span>Architecture &amp; Safety Proof</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800 font-mono text-[11px]">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-400">Parser Frontend</div>
              <div className="text-emerald-400 font-semibold">Python 3.10 ast.parse &amp; tokenize</div>
              <div className="text-[10px] text-slate-500">Standard library PEG compiler</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-400">Runtime Safety</div>
              <div className="text-emerald-400 font-semibold">Zero Execution Sandbox</div>
              <div className="text-[10px] text-slate-500">Only AST compilation is performed</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-400">Explanation Architecture</div>
              <div className="text-indigo-300 font-semibold">Gemini 3.8 Flash (Server-Side)</div>
              <div className="text-[10px] text-slate-500">Strictly grounded in verified facts</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-400">Distance Metric</div>
              <div className="text-indigo-300 font-semibold">Token-Level Levenshtein</div>
              <div className="text-[10px] text-slate-500">Deterministic dynamic programming</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
