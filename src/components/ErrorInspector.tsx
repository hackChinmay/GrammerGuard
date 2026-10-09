import React from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, ShieldCheck, Terminal, Layers } from "lucide-react";
import { ParserDiagnostic } from "../types/grammarGuard.ts";

interface ErrorInspectorProps {
  diagnostic: ParserDiagnostic | null;
  sourceCode: string;
}

export const ErrorInspector: React.FC<ErrorInspectorProps> = ({ diagnostic, sourceCode }) => {
  if (!diagnostic) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
        <Terminal className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-xs font-medium text-slate-400">No analysis performed yet</p>
        <p className="text-[11px] text-slate-600 mt-1">Click &quot;Analyze Code&quot; to parse Python source code.</p>
      </div>
    );
  }

  if (diagnostic.parseSuccess) {
    return (
      <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-emerald-200">Syntax Valid (0 Syntax Errors)</h4>
            <p className="text-xs text-emerald-400/80">
              Source code successfully parsed by Python AST compiler.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/40 text-xs space-y-1.5 text-slate-300 font-mono">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Tokens parsed:</span>
            <span className="text-emerald-300">{diagnostic.tokens?.length || 0}</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Grammar productions:</span>
            <span className="text-emerald-300">Python 3 PEG grammar satisfied</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          <strong className="text-emerald-300">Notice:</strong> Syntax validity verifies grammatical membership in the Python language. It does not guarantee runtime semantic correctness or test passage.
        </p>
      </div>
    );
  }

  const categoryLabels: Record<string, { label: string; color: string }> = {
    missing_delimiter: { label: "Missing Delimiter", color: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
    missing_separator: { label: "Missing Separator", color: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
    incomplete_expression: { label: "Incomplete Expression", color: "bg-orange-500/10 text-orange-300 border-orange-500/30" },
    unsupported: { label: "Unsupported Category", color: "bg-rose-500/10 text-rose-300 border-rose-500/30" },
    none: { label: "None", color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  };

  const catInfo = categoryLabels[diagnostic.category] || categoryLabels.unsupported;

  // Extract snippet line
  const lines = sourceCode.split("\n");
  const errorLineNum = diagnostic.line || 1;
  const lineText = lines[errorLineNum - 1] || diagnostic.sourceSnippet || "";

  return (
    <div className="p-4 rounded-xl border border-rose-900/40 bg-slate-900/60 space-y-4">
      {/* Header status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-rose-200">Syntax Diagnostic</h4>
            <p className="text-xs text-slate-400">
              Reported by Python AST parser (line {diagnostic.line ?? "?"}, col {diagnostic.column ?? "?"})
            </p>
          </div>
        </div>

        <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${catInfo.color}`}>
          {catInfo.label}
        </span>
      </div>

      {/* Raw message */}
      <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-rose-300">
        <span className="text-slate-500 mr-2">SyntaxError:</span>
        {diagnostic.message || "Invalid syntax"}
      </div>

      {/* Code Snippet highlight */}
      {lineText && (
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-400">Source Location:</div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs overflow-x-auto text-slate-300">
            <div className="flex items-center gap-2 text-slate-500 select-none text-[10px]">
              <span>Line {errorLineNum}:</span>
            </div>
            <div className="mt-1 text-slate-200 whitespace-pre">{lineText}</div>
            {diagnostic.column && (
              <div className="text-rose-400 select-none whitespace-pre text-[11px] leading-none">
                {" ".repeat(Math.max(0, diagnostic.column - 1)) + "^"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expected tokens */}
      {diagnostic.expectedTokens.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-400">Expected Delimiter / Separator:</div>
          <div className="flex flex-wrap gap-1.5">
            {diagnostic.expectedTokens.map((tok, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-mono text-xs"
              >
                &apos;{tok}&apos;
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Formal Grammar Violated Rule */}
      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
          <Layers className="w-3.5 h-3.5" />
          <span>Formal Grammar Constraint</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          {diagnostic.category === "missing_delimiter" &&
            "A delimiter bracket or parenthesis opened a sub-tree context that was not matched before EOF or statement termination."}
          {diagnostic.category === "missing_separator" &&
            "Elements in sequence or mapping productions (list, tuple, dict) must be explicitly delimited by comma ',' separators."}
          {diagnostic.category === "incomplete_expression" &&
            "The production for binary or unary expressions requires a valid right-hand term before termination."}
          {diagnostic.category === "unsupported" &&
            "The error involves complex block indentation, multi-line cascading mismatches, or unsupported syntax."}
        </p>
      </div>

      {/* Repair Eligibility */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
        <span className="text-slate-400">Automatic Repair:</span>
        {diagnostic.automaticRepairEligible ? (
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Eligible for Grammar-Constrained Repair
          </span>
        ) : (
          <span className="flex items-center gap-1 text-slate-500 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Repair Ineligible (Manual Fix Required)
          </span>
        )}
      </div>

      {diagnostic.limitations.length > 0 && (
        <ul className="text-[11px] text-slate-500 list-disc list-inside space-y-0.5">
          {diagnostic.limitations.map((lim, i) => (
            <li key={i}>{lim}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
