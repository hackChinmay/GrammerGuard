import React, { useState } from "react";
import { PythonEditor } from "./PythonEditor.tsx";
import {
  Play,
  RotateCcw,
  Copy,
  Download,
  Trash2,
  Code2,
  FileCode,
  Sparkles,
  Info,
  Check,
} from "lucide-react";
import { AnalysisResult, CandidateRepair, ParserDiagnostic } from "../types/grammarGuard.ts";
import { ErrorInspector } from "./ErrorInspector.tsx";
import { CandidateRepairsList } from "./CandidateRepairsList.tsx";
import { DiffModal } from "./DiffModal.tsx";

interface WorkspaceViewProps {
  sourceCode: string;
  setSourceCode: (code: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analysisResult: AnalysisResult | null;
  onExplainCandidate: (candidate: CandidateRepair) => void;
  explanationMap: Record<string, { text: string; source: "gemini" | "rule_based" }>;
  explainingId: string | null;
}

const EXAMPLES = [
  {
    name: "Example A: Missing Parenthesis",
    code: "total = (price + tax",
    category: "Missing Delimiter",
  },
  {
    name: "Example B: Missing Comma",
    code: "numbers = [1, 2 3, 4]",
    category: "Missing Separator",
  },
  {
    name: "Example C: Incomplete Expression",
    code: "total = price +",
    category: "Incomplete Expression",
  },
  {
    name: "Example D: Valid Python Function",
    code: "def add(a, b):\n    return a + b\n\nprint(add(2, 3))",
    category: "Valid Python",
  },
  {
    name: "Example E: Valid List Aggregation",
    code: "numbers = [1, 2, 3, 4]\nprint(sum(numbers))",
    category: "Valid Python",
  },
  {
    name: "Example F: Unsupported Indentation",
    code: "def calculate():\nprint('Invalid indentation')",
    category: "Unsupported Error",
  },
];

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  sourceCode,
  setSourceCode,
  onAnalyze,
  isAnalyzing,
  analysisResult,
  onExplainCandidate,
  explanationMap,
  explainingId,
}) => {
  const [activeRightTab, setActiveRightTab] = useState<"diagnostics" | "repairs">("repairs");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [diffCandidate, setDiffCandidate] = useState<CandidateRepair | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [initialSource, setInitialSource] = useState(sourceCode);

  const handleLoadExample = (code: string) => {
    setSourceCode(code);
    setInitialSource(code);
  };

  const handleReset = () => {
    setSourceCode(initialSource);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sourceCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadPy = () => {
    const blob = new Blob([sourceCode], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "program.py";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyCandidate = (candidate: CandidateRepair) => {
    setSourceCode(candidate.repairedCode);
  };

  const diagnostic = analysisResult?.diagnostic || null;
  const candidates = analysisResult?.candidates || [];
  const rejectedCount = analysisResult?.rejectedCandidatesCount || 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0b0f19]">
      {/* Workspace Top Toolbar */}
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            <span>Load Example:</span>
          </span>
          <select
            onChange={(e) => {
              const selected = EXAMPLES.find((ex) => ex.name === e.target.value);
              if (selected) handleLoadExample(selected.code);
            }}
            defaultValue=""
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="" disabled>
              Select Benchmark Example...
            </option>
            {EXAMPLES.map((ex, i) => (
              <option key={i} value={ex.name}>
                {ex.name} ({ex.category})
              </option>
            ))}
          </select>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Copy Python Code"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? "Copied" : "Copy"}</span>
          </button>

          <button
            onClick={handleDownloadPy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Download source code as .py"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.py</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Reset to Initial Code"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={() => setSourceCode("")}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
            title="Clear Editor"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-medium shadow-sm transition-all cursor-pointer"
          >
            {isAnalyzing ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Analyze Code</span>
          </button>
        </div>
      </div>

      {/* Editor & Right Panel Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* Monaco Editor Container (Left / Center) */}
        <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#0d1117] min-h-[300px] lg:min-h-0">
          <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400 select-none">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-mono text-slate-300">main.py</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
              <span>Lines: {sourceCode.split("\n").length}</span>
              <span>Chars: {sourceCode.length}</span>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <PythonEditor
              value={sourceCode}
              onChange={(value) => setSourceCode(value)}
              diagnostic={diagnostic}
            />
          </div>

          {/* Bottom Verification Console Strip */}
          <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-mono text-slate-400">
                Compiler Frontend: Python 3.10 ast.parse (Static Only)
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Zero execution runtime • Formal verification only
            </div>
          </div>
        </div>

        {/* Right Inspection & Candidate Panel */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-slate-950/50">
          {/* Right Header Navigation Tabs */}
          <div className="px-3 pt-2 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveRightTab("repairs")}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeRightTab === "repairs"
                    ? "border-indigo-500 text-indigo-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Candidate Repairs</span>
                {candidates.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-600/30 text-indigo-300 font-mono text-[10px]">
                    {candidates.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveRightTab("diagnostics")}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeRightTab === "diagnostics"
                    ? "border-indigo-500 text-indigo-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Error Inspector</span>
                {diagnostic && !diagnostic.parseSuccess && (
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
            </div>

            {diagnostic && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  diagnostic.parseSuccess
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                    : "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                }`}
              >
                {diagnostic.parseSuccess ? "VALID" : "SYNTAX ERROR"}
              </span>
            )}
          </div>

          {/* Right Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeRightTab === "diagnostics" ? (
              <ErrorInspector diagnostic={diagnostic} sourceCode={sourceCode} />
            ) : (
              <CandidateRepairsList
                candidates={candidates}
                selectedCandidateId={selectedCandidateId}
                onSelectCandidate={setSelectedCandidateId}
                onApplyCandidate={handleApplyCandidate}
                onCompareDiff={setDiffCandidate}
                onCopyCandidate={(c) => navigator.clipboard.writeText(c.repairedCode)}
                onDownloadCandidate={(c) => {
                  const blob = new Blob([c.repairedCode], { type: "text/x-python" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `repaired_${c.id}.py`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                onExplainCandidate={onExplainCandidate}
                diagnostic={diagnostic}
                explanationMap={explanationMap}
                explainingId={explainingId}
              />
            )}
          </div>
        </div>
      </div>

      {/* Side-by-side Monaco Diff Modal */}
      <DiffModal
        isOpen={diffCandidate !== null}
        onClose={() => setDiffCandidate(null)}
        originalCode={sourceCode}
        candidate={diffCandidate}
        onApply={() => {
          if (diffCandidate) {
            handleApplyCandidate(diffCandidate);
          }
        }}
      />
    </div>
  );
};
