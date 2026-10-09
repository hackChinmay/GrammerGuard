import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  Scale,
  Percent,
  Check,
  X,
  FileSpreadsheet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BenchmarkMetrics } from "../types/grammarGuard.ts";
import { apiClient } from "../services/apiClient.ts";

export const EvaluationLabView: React.FC = () => {
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrRunBenchmark = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const data = await apiClient.runEvaluation();
      setMetrics(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to execute benchmark: ${msg}`);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    fetchOrRunBenchmark();
  }, []);

  const chartData = metrics
    ? Object.entries(metrics.categoryBreakdown).map(([category, stats]) => ({
        name: category.replace("_", " "),
        successRate: stats.successRate,
        total: stats.total,
        valid: stats.valid,
      }))
    : [];

  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0f19] p-6 space-y-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <FlaskConical className="w-4 h-4" />
            <span>Empirical Methodology • Compiler Benchmark</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">
            Evaluation Lab &amp; Reproducible Benchmark
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed mt-1">
            Empirical measurements of GrammerGuard&apos;s repair accuracy, false-positive resistance, and compiler rejection rates across curated test cases.
          </p>
        </div>

        <button
          onClick={fetchOrRunBenchmark}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer self-start md:self-auto"
        >
          {isRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Running Benchmark...</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rerun Benchmark Suite</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="max-w-6xl mx-auto p-4 rounded-xl border border-rose-900/50 bg-rose-950/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {metrics && (
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Repair Success Rate</span>
              <div className="text-xl font-bold text-emerald-400 font-mono">
                {metrics.repairSuccessRate}%
              </div>
              <span className="text-[10px] text-slate-500">Matched intended repair</span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">False Positive Rate</span>
              <div className="text-xl font-bold text-indigo-300 font-mono">
                {metrics.falsePositiveRate}%
              </div>
              <span className="text-[10px] text-slate-500">Negative control safety</span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Compiler Valid Rate</span>
              <div className="text-xl font-bold text-blue-400 font-mono">
                {metrics.candidateSyntaxValidationRate}%
              </div>
              <span className="text-[10px] text-slate-500">Candidates passing parser</span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Rejection Rate</span>
              <div className="text-xl font-bold text-amber-400 font-mono">
                {metrics.candidateRejectionRate}%
              </div>
              <span className="text-[10px] text-slate-500">Filtered invalid drafts</span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Avg Token Edit Cost</span>
              <div className="text-xl font-bold text-purple-400 font-mono">
                {metrics.averageTokenEditCost}
              </div>
              <span className="text-[10px] text-slate-500">Levenshtein token dist</span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Top-1 Usefulness</span>
              <div className="text-xl font-bold text-teal-400 font-mono">
                {metrics.topKUsefulness}%
              </div>
              <span className="text-[10px] text-slate-500">Ranked #1 candidate match</span>
            </div>
          </div>

          {/* Chart & Category Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Success Rate by Error Category (%)</span>
                <span className="text-[11px] text-slate-500">Python 3.10 AST</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      itemStyle={{ color: "#818cf8" }}
                    />
                    <Bar dataKey="successRate" name="Success Rate (%)" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.successRate >= 80 ? "#10b981" : entry.successRate > 0 ? "#6366f1" : "#64748b"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Benchmark Methodology Notice */}
            <div className="lg:col-span-5 p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3 text-xs text-slate-300">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-indigo-400" />
                <span>Benchmark Methodology &amp; Controls</span>
              </span>

              <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
                <p>
                  <strong>Negative Controls:</strong> Programs that are already syntactically valid or contain multi-line indentation errors are tested to confirm that the repair engine does not propose unwarranted modifications (False-Positive Rate = {metrics.falsePositiveRate}%).
                </p>
                <p>
                  <strong>Independent Validation:</strong> Every generated candidate draft is independently checked via Python&apos;s standard library <code className="text-slate-300 font-mono">ast.parse()</code> before being eligible for ranking.
                </p>
                <p>
                  <strong>Evaluation Policy:</strong> A repair is counted as successful only when the top-ranked candidate code string matches the known canonical repair.
                </p>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-500">
                Timestamp: {new Date(metrics.runTimestamp).toLocaleString()} • Benchmark size: {metrics.totalCases} cases
              </div>
            </div>
          </div>

          {/* Detailed Benchmark Results Table */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span>Dataset Case Breakdown ({metrics.caseResults.length} cases)</span>
              </span>
              <span className="text-[11px] text-slate-500">Curated &amp; Synthetic</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                    <th className="py-2 px-3">Case ID</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Origin</th>
                    <th className="py-2 px-3">Initial AST</th>
                    <th className="py-2 px-3">Drafts</th>
                    <th className="py-2 px-3">Valid</th>
                    <th className="py-2 px-3">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                  {metrics.caseResults.map((c) => (
                    <tr key={c.caseId} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-2 px-3 text-indigo-300 font-semibold">{c.caseId}</td>
                      <td className="py-2 px-3 font-sans text-slate-200 max-w-xs truncate">{c.title}</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                          {c.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[10px]">{c.origin}</td>
                      <td className="py-2 px-3">
                        {c.initialParseSuccess ? (
                          <span className="text-emerald-400">Valid</span>
                        ) : (
                          <span className="text-rose-400">Syntax Error</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-400">{c.generatedCount}</td>
                      <td className="py-2 px-3 text-indigo-300">{c.validCandidateCount}</td>
                      <td className="py-2 px-3">
                        {c.status === "success" && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-sans font-medium text-[10px]">
                            <Check className="w-3 h-3" /> Repaired
                          </span>
                        )}
                        {c.status === "no_repair_needed" && (
                          <span className="inline-flex items-center gap-1 text-indigo-300 font-sans text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Preserved
                          </span>
                        )}
                        {c.status === "unsupported" && (
                          <span className="text-slate-500 font-sans text-[10px]">Properly Ineligible</span>
                        )}
                        {c.status === "failed" && (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-sans text-[10px]">
                            <X className="w-3 h-3" /> Unmatched
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
