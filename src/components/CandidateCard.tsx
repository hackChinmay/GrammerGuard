import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Copy,
  Download,
  GitCompare,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { CandidateRepair } from "../types/grammarGuard.ts";

interface CandidateCardProps {
  candidate: CandidateRepair;
  rank: number;
  isSelected: boolean;
  onSelect: () => void;
  onApply: () => void;
  onCompareDiff: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onExplain?: () => void;
  explanationText?: string | null;
  explanationSource?: "gemini" | "rule_based" | null;
  isExplaining?: boolean;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  rank,
  isSelected,
  onSelect,
  onApply,
  onCompareDiff,
  onCopy,
  onDownload,
  onExplain,
  explanationText,
  explanationSource,
  isExplaining,
}) => {
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSyntaxValid = candidate.syntaxStatus === "syntax_valid";

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-4 transition-all cursor-pointer ${
        isSelected
          ? "border-indigo-500 bg-slate-900/90 shadow-lg shadow-indigo-500/10"
          : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
      }`}
    >
      {/* Header with rank, rule name, score */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
              rank === 1
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            #{rank}
          </span>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              {candidate.repairRuleName}
            </h4>
            <span className="text-[10px] font-mono text-slate-500">
              Rule {candidate.repairRuleId} • Token Distance: {candidate.tokenDistance}
            </span>
          </div>
        </div>

        {/* Score pill */}
        <div className="text-right">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 font-mono text-xs font-semibold">
            <span>Score:</span>
            <span>{candidate.totalScore}/100</span>
          </div>
        </div>
      </div>

      {/* Verification Status Badges */}
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        {/* Syntax status */}
        {isSyntaxValid ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Syntax: Valid (Compiler Verified)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-800/60 text-rose-300 font-medium">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Syntax: Invalid (Rejected)
          </span>
        )}

        {/* Test status */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/80 text-slate-400">
          Tests: Not Run (Static Only)
        </span>

        {/* Semantic status */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/40 border border-amber-900/40 text-amber-300/90">
          Semantics: Unproven
        </span>
      </div>

      {/* Edit Operations */}
      <div className="mt-3 space-y-1">
        {candidate.editOperations.map((op, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/60"
          >
            <span
              className={`text-[10px] font-semibold uppercase px-1 rounded ${
                op.type === "insert"
                  ? "bg-emerald-900/60 text-emerald-300"
                  : op.type === "delete"
                  ? "bg-rose-900/60 text-rose-300"
                  : "bg-blue-900/60 text-blue-300"
              }`}
            >
              {op.type}
            </span>
            <span className="text-slate-400 text-[11px] truncate">{op.description}</span>
          </div>
        ))}
      </div>

      {/* Code preview snippet */}
      <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
        <pre className="whitespace-pre">{candidate.repairedCode}</pre>
      </div>

      {/* Score component breakdown toggle */}
      <div className="mt-3 border-t border-slate-800/80 pt-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowScoreDetails(!showScoreDetails);
          }}
          className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ranking Score Factor Breakdown</span>
          </span>
          {showScoreDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showScoreDetails && (
          <div className="mt-2.5 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-2 text-slate-300">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Edit Minimality (45% max):</span>
              <span className="font-mono text-indigo-300">{candidate.scoreComponents.editMinimality} / 45 pts</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full"
                style={{ width: `${(candidate.scoreComponents.editMinimality / 45) * 100}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Diagnostic Proximity (25% max):</span>
              <span className="font-mono text-indigo-300">{candidate.scoreComponents.locationProximity} / 25 pts</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full"
                style={{ width: `${(candidate.scoreComponents.locationProximity / 25) * 100}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Preservation Ratio (20% max):</span>
              <span className="font-mono text-indigo-300">{candidate.scoreComponents.preservationRatio} / 20 pts</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full"
                style={{ width: `${(candidate.scoreComponents.preservationRatio / 20) * 100}%` }}
              />
            </div>

            {candidate.scoreComponents.ambiguityPenalty > 0 && (
              <div className="flex justify-between items-center text-[11px] text-amber-400">
                <span>Ambiguity Penalty (multiple valid candidates):</span>
                <span className="font-mono">-{candidate.scoreComponents.ambiguityPenalty} pts</span>
              </div>
            )}

            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80 leading-relaxed">
              Note: This score is a deterministic heuristic reflecting edit distance and locality. It does not represent a probability or proof of correct semantics.
            </p>
          </div>
        )}
      </div>

      {/* Gemini or Rule Explanation Card */}
      {explanationText && (
        <div className="mt-3 p-3 rounded-lg bg-indigo-950/20 border border-indigo-900/40 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-indigo-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Grounded Compiler Explanation</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-indigo-900/40 border border-indigo-800/40 text-[10px] font-mono">
              {explanationSource === "gemini" ? "Gemini 3.8 Flash" : "Rule Engine Fallback"}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">{explanationText}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCompareDiff();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <GitCompare className="w-3.5 h-3.5 text-indigo-400" />
            <span>Compare Diff</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.py</span>
          </button>

          {onExplain && !explanationText && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExplain();
              }}
              disabled={isExplaining}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-violet-950/60 hover:bg-violet-900/60 border border-violet-800/60 text-violet-300 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>{isExplaining ? "Explaining..." : "Explain"}</span>
            </button>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-colors"
        >
          <span>Apply to Editor</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
