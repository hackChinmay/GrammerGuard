import React from "react";
import { X, BookOpen, Shield, Layers, HelpCircle, Scale } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
            <BookOpen className="w-4 h-4" />
            <span>GrammerGuard Documentation &bull; Theory of Computation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed">
          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>What is Grammar-Constrained Program Repair?</span>
            </h4>
            <p className="text-slate-400">
              Traditional automated coding assistants generate code by unconstrained probabilistic token prediction, which often produces hallucinated identifiers, invalid syntax, or cascading compilation errors.
              GrammerGuard constrains repair generation to formal grammar rules (delimiters, separators, incomplete expressions) and strictly re-parses every candidate using a real compiler before ranking.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Context-Free Grammars (CFGs) &amp; Compilers</span>
            </h4>
            <p className="text-slate-400">
              Programming language syntaxes are defined formally by grammars. A compiler frontend lexes code into tokens and attempts to derive the token stream using grammar production rules. When an expression cannot be derived (e.g., an unclosed parenthesis), a syntax diagnostic is triggered.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>Deterministic Ranking (Token Levenshtein)</span>
            </h4>
            <p className="text-slate-400">
              Candidates that pass the compiler check are ranked using a multi-factor transparent formula:
            </p>
            <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
              <li><strong>Edit Minimality (45%):</strong> Token-level Levenshtein distance on token streams.</li>
              <li><strong>Diagnostic Proximity (25%):</strong> Distance from the compiler-reported error site.</li>
              <li><strong>Preservation Ratio (20%):</strong> Percentage of unaffected original lines and tokens.</li>
              <li><strong>Ambiguity Penalty (10%):</strong> Deducted when multiple competing structural interpretations pass validation.</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl border border-indigo-900/60 bg-indigo-950/20 space-y-1 text-[11px]">
            <span className="font-semibold text-indigo-300">Verification Boundary Guarantee</span>
            <p className="text-slate-400">
              Compiler acceptance proves syntax validity ($w \in L(G)$). It does <strong>not</strong> prove semantic correctness. Tests were not run unless explicitly reported.
            </p>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
