import React, { useState } from "react";
import { Sparkles, ShieldAlert, CheckCircle2, AlertOctagon, HelpCircle } from "lucide-react";
import { CandidateRepair, ParserDiagnostic } from "../types/grammarGuard.ts";
import { CandidateCard } from "./CandidateCard.tsx";

interface CandidateRepairsListProps {
  candidates: CandidateRepair[];
  rejectedCandidates?: CandidateRepair[];
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
  onApplyCandidate: (candidate: CandidateRepair) => void;
  onCompareDiff: (candidate: CandidateRepair) => void;
  onCopyCandidate: (candidate: CandidateRepair) => void;
  onDownloadCandidate: (candidate: CandidateRepair) => void;
  onExplainCandidate: (candidate: CandidateRepair) => void;
  diagnostic: ParserDiagnostic | null;
  explanationMap: Record<string, { text: string; source: "gemini" | "rule_based" }>;
  explainingId: string | null;
}

export const CandidateRepairsList: React.FC<CandidateRepairsListProps> = ({
  candidates,
  rejectedCandidates = [],
  selectedCandidateId,
  onSelectCandidate,
  onApplyCandidate,
  onCompareDiff,
  onCopyCandidate,
  onDownloadCandidate,
  onExplainCandidate,
  diagnostic,
  explanationMap,
  explainingId,
}) => {
  const [showRejected, setShowRejected] = useState(false);

  if (!diagnostic) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
        <Sparkles className="w-8 h-8 text-slate-700 mb-2" />
        <p className="text-xs font-medium text-slate-400">Repairs will appear here</p>
        <p className="text-[11px] text-slate-600 mt-1">
          When syntax errors are detected, candidate repairs are generated and verified.
        </p>
      </div>
    );
  }

  if (diagnostic.parseSuccess) {
    return (
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
        <h4 className="text-sm font-semibold text-slate-200">No Repairs Required</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          The code already conforms to the formal grammar of Python 3. No candidate repairs were generated.
        </p>
      </div>
    );
  }

  if (!diagnostic.automaticRepairEligible) {
    return (
      <div className="p-5 rounded-xl border border-amber-900/40 bg-amber-950/10 text-slate-300 space-y-3">
        <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Automatic Repair Ineligible</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          GrammerGuard operates on localized grammar boundaries (delimiters, separators, incomplete expressions). The reported diagnostic is either ambiguous or outside these bounded scopes:
        </p>
        <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-1">
          {diagnostic.limitations.map((lim, idx) => (
            <li key={idx}>{lim}</li>
          ))}
        </ul>
        <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            To avoid speculative edits or hallucinations, automatic candidate generation is withheld when compiler diagnostic evidence is insufficient.
          </span>
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="p-5 rounded-xl border border-rose-900/40 bg-rose-950/10 text-slate-300 space-y-2 text-center">
        <AlertOctagon className="w-8 h-8 text-rose-400 mx-auto" />
        <h4 className="text-sm font-semibold text-rose-200">No Valid Candidates Found</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          All generated candidate edits failed independent Python syntax validation and were safely rejected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
          <span>Eligible Candidates ({candidates.length})</span>
          <span className="text-[10px] text-slate-500 font-normal">
            Deterministic token-distance ranking
          </span>
        </div>
        {rejectedCandidates.length > 0 && (
          <button
            onClick={() => setShowRejected(!showRejected)}
            className="text-[11px] text-slate-400 hover:text-slate-200 underline transition-colors"
          >
            {showRejected ? "Hide" : "Show"} Rejected Candidates ({rejectedCandidates.length})
          </button>
        )}
      </div>

      <div className="space-y-3">
        {candidates.map((cand, index) => {
          const exp = explanationMap[cand.id];
          return (
            <CandidateCard
              key={cand.id}
              candidate={cand}
              rank={index + 1}
              isSelected={selectedCandidateId === cand.id}
              onSelect={() => onSelectCandidate(cand.id)}
              onApply={() => onApplyCandidate(cand)}
              onCompareDiff={() => onCompareDiff(cand)}
              onCopy={() => onCopyCandidate(cand)}
              onDownload={() => onDownloadCandidate(cand)}
              onExplain={() => onExplainCandidate(cand)}
              explanationText={exp?.text}
              explanationSource={exp?.source}
              isExplaining={explainingId === cand.id}
            />
          );
        })}
      </div>

      {/* Rejected candidates section */}
      {showRejected && rejectedCandidates.length > 0 && (
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-rose-400 flex items-center gap-2">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Filtered &amp; Rejected Candidates ({rejectedCandidates.length})</span>
          </div>
          <p className="text-[11px] text-slate-500">
            These candidates were generated by speculative heuristics but failed independent re-parsing by the Python compiler.
          </p>
          <div className="space-y-2">
            {rejectedCandidates.map((rej, i) => (
              <div
                key={rej.id}
                className="p-3 rounded-lg border border-rose-950 bg-slate-950/40 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-300">Draft #{i + 1} ({rej.repairRuleId})</span>
                  <span className="text-rose-400 font-semibold text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60">
                    REJECTED: Compiler Check Failed
                  </span>
                </div>
                <pre className="text-[11px] text-slate-400 font-mono bg-slate-950 p-1.5 rounded overflow-x-auto">
                  {rej.repairedCode}
                </pre>
                <div className="text-[10px] text-rose-400">
                  Reason: {rej.rejectionReasons[0] || "Invalid syntax"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
