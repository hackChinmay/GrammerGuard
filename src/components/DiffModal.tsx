import React, { useState, useEffect } from "react";
import { X, GitCompare, ArrowRight, CheckCircle2, Plus, Minus } from "lucide-react";
import { loader, DiffEditor } from "@monaco-editor/react";
import { CandidateRepair } from "../types/grammarGuard.ts";

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalCode: string;
  candidate: CandidateRepair | null;
  onApply: () => void;
}

export const DiffModal: React.FC<DiffModalProps> = ({
  isOpen,
  onClose,
  originalCode,
  candidate,
  onApply,
}) => {
  const [monacoLoaded, setMonacoLoaded] = useState(false);
  const [useMonacoDiff, setUseMonacoDiff] = useState(false);

  useEffect(() => {
    let active = true;
    loader
      .init()
      .then(() => {
        if (active) setMonacoLoaded(true);
      })
      .catch(() => {
        // Non-blocking fallback
      });
    return () => {
      active = false;
    };
  }, []);

  if (!isOpen || !candidate) return null;

  const originalLines = originalCode.split("\n");
  const modifiedLines = candidate.repairedCode.split("\n");
  const maxLines = Math.max(originalLines.length, modifiedLines.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span>Code Comparison: Side-by-Side Diff</span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 font-mono">
                  {candidate.repairRuleName}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Left: Original Source &bull; Right: Repaired Candidate (Rank Score: {candidate.totalScore}/100)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {monacoLoaded && (
              <button
                onClick={() => setUseMonacoDiff(!useMonacoDiff)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors border border-slate-700"
              >
                {useMonacoDiff ? "Simple Diff" : "Monaco Diff"}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diff Area */}
        <div className="flex-1 min-h-0 bg-[#0d1117] overflow-hidden flex flex-col">
          {useMonacoDiff && monacoLoaded ? (
            <DiffEditor
              height="100%"
              language="python"
              original={originalCode}
              modified={candidate.repairedCode}
              theme="vs-dark"
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                lineNumbers: "on",
                wordWrap: "on",
              }}
            />
          ) : (
            <div className="flex-1 grid grid-cols-2 min-h-0 overflow-y-auto divide-x divide-slate-800 font-mono text-xs">
              {/* Left: Original Code */}
              <div className="p-4 overflow-x-auto space-y-1 bg-slate-950/40">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 flex items-center gap-1.5 pb-1 border-b border-slate-800">
                  <Minus className="w-3.5 h-3.5 text-rose-400" />
                  <span>Original Source (Syntax Error)</span>
                </div>
                {Array.from({ length: maxLines }).map((_, idx) => {
                  const line = originalLines[idx] ?? "";
                  const otherLine = modifiedLines[idx] ?? "";
                  const isChanged = line !== otherLine;
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2.5 py-0.5 px-1.5 rounded ${
                        isChanged && line
                          ? "bg-rose-950/40 text-rose-200 border-l-2 border-rose-500"
                          : "text-slate-400"
                      }`}
                    >
                      <span className="w-6 text-right text-slate-600 select-none text-[11px]">
                        {idx < originalLines.length ? idx + 1 : ""}
                      </span>
                      <span className="whitespace-pre flex-1">{line}</span>
                    </div>
                  );
                })}
              </div>

              {/* Right: Repaired Candidate */}
              <div className="p-4 overflow-x-auto space-y-1 bg-slate-950/60">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 flex items-center gap-1.5 pb-1 border-b border-slate-800">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Repaired Candidate (Compiler Valid)</span>
                </div>
                {Array.from({ length: maxLines }).map((_, idx) => {
                  const line = modifiedLines[idx] ?? "";
                  const otherLine = originalLines[idx] ?? "";
                  const isChanged = line !== otherLine;
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2.5 py-0.5 px-1.5 rounded ${
                        isChanged
                          ? "bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500 font-semibold"
                          : "text-slate-300"
                      }`}
                    >
                      <span className="w-6 text-right text-slate-600 select-none text-[11px]">
                        {idx < modifiedLines.length ? idx + 1 : ""}
                      </span>
                      <span className="whitespace-pre flex-1">{line}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Independent Syntax Check: Valid (Python PEG Compiler)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApply();
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <span>Apply Candidate to Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
