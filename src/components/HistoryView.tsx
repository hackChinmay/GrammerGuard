import React, { useState } from "react";
import {
  History,
  Search,
  Trash2,
  ArrowRight,
  Shield,
  Lock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Download,
  AlertTriangle,
} from "lucide-react";
import { AnalysisResult, AppSettings } from "../types/grammarGuard.ts";

interface HistoryViewProps {
  history: AnalysisResult[];
  onRestoreAnalysis: (analysis: AnalysisResult) => void;
  onDeleteAnalysis: (id: string) => void;
  onClearAll: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onRestoreAnalysis,
  onDeleteAnalysis,
  onClearAll,
  settings,
  onUpdateSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.diagnostic.message || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.diagnostic.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterCategory === "all" ||
      (filterCategory === "valid" && item.diagnostic.parseSuccess) ||
      (filterCategory === "invalid" && !item.diagnostic.parseSuccess) ||
      (filterCategory === "repaired" && item.candidates.length > 0);

    return matchesSearch && matchesFilter;
  });

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `grammarguard_history_${Date.now()}.json`);
    dlAnchor.click();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0f19] p-6 space-y-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <History className="w-4 h-4" />
            <span>Persistence &bull; Session Records</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">
            Analysis History &amp; Privacy Controls
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed mt-1">
            Review past parsing runs, inspect compiler diagnostics, and restore earlier repair candidates into the workspace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <>
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              <button
                onClick={() => setShowConfirmClear(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Clear History</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete all {history.length} saved session records from local storage? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearAll();
                  setShowConfirmClear(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium"
              >
                Delete All Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Notice Card */}
      <div className="max-w-5xl mx-auto p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-200">Local Source Code Retention Policy</div>
            <div className="text-[11px] text-slate-400">
              {settings.storeRawSourceCode
                ? "Active: Raw source code is stored inside local history records on this device."
                : "Privacy Mode (Default): Only cryptographic source hashes and compiler diagnostics are stored. Raw source code is discarded."}
            </div>
          </div>
        </div>

        <button
          onClick={() =>
            onUpdateSettings({
              ...settings,
              storeRawSourceCode: !settings.storeRawSourceCode,
            })
          }
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors shrink-0 ${
            settings.storeRawSourceCode
              ? "bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/40"
              : "bg-indigo-950/40 border-indigo-800/60 text-indigo-300 hover:bg-indigo-900/40"
          }`}
        >
          {settings.storeRawSourceCode ? "Disable Retention" : "Enable Retention"}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, diagnostic message, or category..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="all">All Records ({history.length})</option>
          <option value="valid">Syntax Valid Only</option>
          <option value="invalid">Syntax Errors Only</option>
          <option value="repaired">With Candidates</option>
        </select>
      </div>

      {/* History List */}
      <div className="max-w-5xl mx-auto space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 space-y-2">
            <History className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-medium text-slate-400">No session history found</p>
            <p className="text-[11px] text-slate-600">
              Run an analysis in the Code Workspace to log session records.
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => {
            const isSuccess = item.diagnostic.parseSuccess;
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-indigo-300 font-semibold">
                      {item.id}
                    </span>
                    <span className="text-slate-600">&bull;</span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </span>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      SHA: {item.sourceHash}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {isSuccess ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Syntax Valid (0 errors)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-400 font-medium text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="truncate max-w-md">
                          {item.diagnostic.message || "SyntaxError"} (Line {item.diagnostic.line})
                        </span>
                      </span>
                    )}

                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                      {item.diagnostic.category}
                    </span>

                    {item.candidates.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950/60 border border-indigo-800/60 text-indigo-300">
                        {item.candidates.length} Candidate{item.candidates.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {item.sourceCode && (
                    <div className="text-[11px] font-mono text-slate-500 truncate max-w-xl">
                      &gt; {item.sourceCode.replace(/\n/g, " ").slice(0, 80)}...
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => onRestoreAnalysis(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                  >
                    <span>Restore</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => onDeleteAnalysis(item.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
