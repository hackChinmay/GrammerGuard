import React, { useState } from "react";
import {
  BookOpen,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TreePine,
  Sparkles,
} from "lucide-react";
import {
  teachingGrammarParser,
  TeachingParseResult,
  ParseTreeNode,
} from "../grammar/teachingGrammarParser.ts";

const DEMO_EXPRESSIONS = [
  { label: "Valid: Precedence (3 + 5 * 2)", value: "3 + 5 * 2" },
  { label: "Valid: Grouping ((a + b) * c)", value: "(a + b) * c" },
  { label: "Valid: Subtraction (x - y / 4)", value: "x - y / 4" },
  { label: "Invalid: Consecutive Operators (3 + * 5)", value: "3 + * 5" },
  { label: "Invalid: Unclosed Parenthesis ((a + b)", value: "(a + b" },
  { label: "Invalid: Alphabet Violation (3 & 4)", value: "3 & 4" },
];

export const GrammarExplorerView: React.FC = () => {
  const [inputExpression, setInputExpression] = useState("3 + 5 * 2");
  const [parseResult, setParseResult] = useState<TeachingParseResult>(() =>
    teachingGrammarParser.parse("3 + 5 * 2")
  );
  const [activeTab, setActiveTab] = useState<"tree" | "derivation" | "tokens">("tree");

  const handleParse = (expr: string) => {
    setInputExpression(expr);
    const res = teachingGrammarParser.parse(expr);
    setParseResult(res);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0f19] p-6 space-y-6">
      {/* Hero Header */}
      <div className="max-w-5xl mx-auto space-y-2">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <BookOpen className="w-4 h-4" />
          <span>Theory of Computation • Formal Grammars</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
          Context-Free Grammars, Derivations &amp; Parse Trees
        </h2>
        <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
          Explore how formal language constraints govern program structure. Test real expressions against our simplified teaching grammar, inspect leftmost derivations, and visualize Concrete Syntax Trees (CST).
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Grammar Definition & Live Input */}
        <div className="lg:col-span-5 space-y-4">
          {/* Formal Grammar Card */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Teaching Grammar $G = (V, \Sigma, R, S)$</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/60 border border-indigo-800/60 text-indigo-300">
                CFG (Type 2)
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
              <div>
                <span className="text-indigo-400 font-semibold">Expression</span> &rarr;{" "}
                <span className="text-slate-200">Expression + Term</span> |{" "}
                <span className="text-slate-200">Expression - Term</span> |{" "}
                <span className="text-slate-200">Term</span>
              </div>
              <div>
                <span className="text-indigo-400 font-semibold">Term</span> &rarr;{" "}
                <span className="text-slate-200">Term * Factor</span> |{" "}
                <span className="text-slate-200">Term / Factor</span> |{" "}
                <span className="text-slate-200">Factor</span>
              </div>
              <div>
                <span className="text-indigo-400 font-semibold">Factor</span> &rarr;{" "}
                <span className="text-emerald-400">NUMBER</span> |{" "}
                <span className="text-emerald-400">IDENTIFIER</span> |{" "}
                <span className="text-slate-200">( Expression )</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              This simplified grammar encodes operator precedence without ambiguity: multiplication and division bind tightly in <code className="text-slate-400 font-mono">Term</code> before addition and subtraction in <code className="text-slate-400 font-mono">Expression</code>.
            </p>
          </div>

          {/* Interactive Tester */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <span className="text-xs font-semibold text-slate-300">Test Expression:</span>

            <div className="flex gap-2">
              <input
                type="text"
                value={inputExpression}
                onChange={(e) => handleParse(e.target.value)}
                placeholder="Enter arithmetic expression..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleParse(inputExpression)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors"
              >
                Parse
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500">Preset Demonstrations:</span>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_EXPRESSIONS.map((demo, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleParse(demo.value)}
                    className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors"
                  >
                    {demo.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Result Status */}
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                parseResult.success
                  ? "bg-emerald-950/20 border-emerald-800/50 text-emerald-300"
                  : "bg-rose-950/20 border-rose-800/50 text-rose-300"
              }`}
            >
              {parseResult.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-emerald-200">Grammar Membership Accepted</div>
                    <div className="text-[11px] text-emerald-400/80">
                      Input string derives from start symbol S = Expression with 0 syntax errors.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-rose-200">Grammar Rejection</div>
                    <div className="text-[11px] text-rose-300/80">{parseResult.error}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Visualization Tabs (Parse Tree, Derivation, Tokens) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex-1 flex flex-col min-h-[480px]">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("tree")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "tree"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <TreePine className="w-3.5 h-3.5" />
                  <span>Parse Tree (CST)</span>
                </button>

                <button
                  onClick={() => setActiveTab("derivation")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "derivation"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Leftmost Derivation</span>
                </button>

                <button
                  onClick={() => setActiveTab("tokens")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "tokens"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Lexical Tokens ({parseResult.tokens.length})</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-500 font-mono">
                {parseResult.success ? "Parse Successful" : "Parse Failed"}
              </span>
            </div>

            {/* Content Views */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "tree" && (
                <div className="space-y-3">
                  {parseResult.parseTree ? (
                    <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs overflow-x-auto">
                      <ParseTreeNodeView node={parseResult.parseTree} depth={0} />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      No parse tree available for syntactically invalid input.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "derivation" && (
                <div className="space-y-2">
                  {parseResult.derivationSteps.length > 0 ? (
                    parseResult.derivationSteps.map((step) => (
                      <div
                        key={step.stepIndex}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono flex items-start gap-3"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800/50 text-indigo-300 text-[10px] shrink-0">
                          Step {step.stepIndex}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-100 font-semibold truncate">
                            {step.sententialForm}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {step.appliedRule} &bull; {step.description}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      No derivation steps available.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "tokens" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[11px] text-slate-500 font-mono px-2">
                    <span className="col-span-2">Index</span>
                    <span className="col-span-4">Token Type</span>
                    <span className="col-span-3">Value</span>
                    <span className="col-span-3">Position</span>
                  </div>
                  {parseResult.tokens.map((tok, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-12 gap-2 p-2 rounded bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300"
                    >
                      <span className="col-span-2 text-slate-500">#{i + 1}</span>
                      <span className="col-span-4 text-indigo-300">{tok.type}</span>
                      <span className="col-span-3 font-semibold text-slate-100">&apos;{tok.value}&apos;</span>
                      <span className="col-span-3 text-slate-500">{tok.position}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pedagogical Deep Dive Section */}
      <div className="max-w-5xl mx-auto p-5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-4 text-xs text-slate-300">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Theory of Computation &bull; How Grammar-Constrained Repair Works</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-400">
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
            <h4 className="font-semibold text-slate-200">1. Formal Language Membership</h4>
            <p className="text-[11px] leading-relaxed">
              A program $P$ is syntactically valid if and only if $P \in L(G)$, where $L(G)$ is the formal language recognized by the grammar. Compilers reject anything outside this language.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
            <h4 className="font-semibold text-slate-200">2. Localized Search Space</h4>
            <p className="text-[11px] leading-relaxed">
              Rather than guessing arbitrary edits, GrammerGuard generates bounded edits near the syntax violation (delimiter matching or comma insertions) and re-evaluates membership.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
            <h4 className="font-semibold text-slate-200">3. Syntax vs Semantics</h4>
            <p className="text-[11px] leading-relaxed">
              A repair that achieves $P&apos; \in L(G)$ resolves the syntax error, but whether $P&apos;$ performs the programmer&apos;s intended calculation remains unproven without execution tests.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Recursive Tree Node Visualizer
 */
const ParseTreeNodeView: React.FC<{ node: ParseTreeNode; depth: number }> = ({ node, depth }) => {
  const isTerminal = node.isTerminal;

  return (
    <div className="space-y-1">
      <div
        className="flex items-center gap-2 py-0.5 hover:bg-slate-900/60 rounded px-1 transition-colors"
        style={{ paddingLeft: `${depth * 20}px` }}
      >
        <span className="text-slate-600 select-none">
          {depth > 0 ? "└──" : "•"}
        </span>

        {isTerminal ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-bold text-[11px]">
            <span>{node.name}</span>
            <span className="text-slate-400 font-normal">=&gt; &apos;{node.value}&apos;</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 font-semibold text-[11px]">
            <span>{node.name}</span>
            {node.rule && (
              <span className="text-slate-500 font-normal text-[10px]">[{node.rule}]</span>
            )}
          </span>
        )}
      </div>

      {node.children.map((child) => (
        <ParseTreeNodeView key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
};
