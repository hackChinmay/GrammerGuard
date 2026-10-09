import {
  AnalysisResult,
  ParserDiagnostic,
  CandidateRepair,
  BenchmarkMetrics,
  BenchmarkCase,
} from "../types/grammarGuard.ts";

export class ApiClient {
  public async analyzeCode(source: string): Promise<AnalysisResult> {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }

    return res.json();
  }

  public async validateCandidate(source: string): Promise<{
    parseSuccess: boolean;
    message: string | null;
    line: number | null;
    column: number | null;
  }> {
    const res = await fetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });

    if (!res.ok) {
      throw new Error(`Validation API error: ${res.status}`);
    }

    return res.json();
  }

  public async requestExplanation(
    diagnostic: ParserDiagnostic,
    candidate?: CandidateRepair
  ): Promise<{ explanation: string; source: "gemini" | "rule_based" }> {
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnostic, candidate }),
    });

    if (!res.ok) {
      throw new Error(`Explanation API error: ${res.status}`);
    }

    return res.json();
  }

  public async runEvaluation(): Promise<BenchmarkMetrics> {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Evaluation API error: ${res.status}`);
    }

    return res.json();
  }

  public async getBenchmarkDataset(): Promise<BenchmarkCase[]> {
    const res = await fetch("/api/benchmark-dataset");
    if (!res.ok) {
      throw new Error(`Benchmark dataset API error: ${res.status}`);
    }
    return res.json();
  }
}

export const apiClient = new ApiClient();
