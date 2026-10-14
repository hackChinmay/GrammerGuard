import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { pythonParser } from "./backend/parser/pythonParser.ts";
import { repairEngine } from "./backend/repair/repairEngine.ts";
import { geminiExplanationService } from "./backend/gemini/geminiService.ts";
import { runBenchmarkEvaluation, BENCHMARK_DATASET } from "./backend/evaluation/benchmarkSuite.ts";
import { ParserDiagnostic, CandidateRepair } from "./src/types/grammarGuard.ts";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security and payload limiting
app.use(express.json({ limit: "500kb" }));

// Hash helper
function computeSourceHash(source: string): string {
  return crypto.createHash("sha256").update(source).digest("hex").slice(0, 16);
}

// ================= API ENDPOINTS =================

/**
 * POST /api/analyze
 * Parses Python source code, extracts diagnostics, and optionally generates bounded candidates.
 */
app.post("/api/analyze", async (req: Request, res: Response) => {
  try {
    const { source } = req.body;
    if (typeof source !== "string") {
      res.status(400).json({ error: "Source code must be provided as a string." });
      return;
    }

    if (source.length > 50000) {
      res.status(413).json({ error: "Source code exceeds the 50KB size threshold." });
      return;
    }

    const sourceHash = computeSourceHash(source);
    const analysisId = `analysis_${Date.now()}_${sourceHash.slice(0, 8)}`;

    const diagnostic = await pythonParser.parseSource(source);

    let eligibleCandidates: CandidateRepair[] = [];
    let rejectedCandidates: CandidateRepair[] = [];

    if (!diagnostic.parseSuccess && diagnostic.automaticRepairEligible) {
      const repairResult = await repairEngine.generateAndRankCandidates(
        source,
        diagnostic,
        analysisId
      );
      eligibleCandidates = repairResult.eligibleCandidates;
      rejectedCandidates = repairResult.rejectedCandidates;
    }

    res.json({
      id: analysisId,
      language: "python",
      createdAt: new Date().toISOString(),
      sourceHash,
      diagnostic,
      candidates: eligibleCandidates,
      eligibleCandidatesCount: eligibleCandidates.length,
      rejectedCandidatesCount: rejectedCandidates.length,
      selectedCandidateId: eligibleCandidates.length > 0 ? eligibleCandidates[0].id : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Analysis failed: ${message}` });
  }
});

/**
 * POST /api/repairs
 * Generates and ranks candidates given an existing diagnostic.
 */
app.post("/api/repairs", async (req: Request, res: Response) => {
  try {
    const { source, diagnostic, analysisId } = req.body;
    if (typeof source !== "string" || !diagnostic) {
      res.status(400).json({ error: "source and diagnostic are required." });
      return;
    }

    const aid = analysisId || `analysis_${Date.now()}`;
    const result = await repairEngine.generateAndRankCandidates(source, diagnostic, aid);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Repair generation failed: ${message}` });
  }
});

/**
 * POST /api/validate
 * Independently validates any candidate source using the Python parser.
 */
app.post("/api/validate", async (req: Request, res: Response) => {
  try {
    const { source } = req.body;
    if (typeof source !== "string") {
      res.status(400).json({ error: "Source code must be provided." });
      return;
    }

    const result = await pythonParser.parseSource(source);
    res.json({
      parseSuccess: result.parseSuccess,
      message: result.message,
      line: result.line,
      column: result.column,
      tokensCount: result.tokens ? result.tokens.length : 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Validation check failed: ${message}` });
  }
});

/**
 * POST /api/explain
 * Requests pedagogical explanation of verified compiler facts using Gemini or rule fallback.
 */
app.post("/api/explain", async (req: Request, res: Response) => {
  try {
    const { diagnostic, candidate } = req.body as {
      diagnostic: ParserDiagnostic;
      candidate?: CandidateRepair;
    };

    if (!diagnostic) {
      res.status(400).json({ error: "Diagnostic payload is required." });
      return;
    }

    const explanation = await geminiExplanationService.explain(diagnostic, candidate);
    res.json(explanation);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Explanation generation failed: ${message}` });
  }
});

/**
 * POST /api/evaluate
 * Runs the reproducible evaluation benchmark suite on actual Python AST parser.
 */
app.post("/api/evaluate", async (_req: Request, res: Response) => {
  try {
    const metrics = await runBenchmarkEvaluation();
    res.json(metrics);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Benchmark execution failed: ${message}` });
  }
});

/**
 * GET /api/benchmark-dataset
 * Returns the benchmark cases metadata
 */
app.get("/api/benchmark-dataset", (_req: Request, res: Response) => {
  res.json(BENCHMARK_DATASET);
});

// ================= FRONTEND MOUNTING =================

async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  const HOST = process.env.HOST || "localhost";
  app.listen(PORT, HOST, () => {
    console.log(`GrammerGuard Server is running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start GrammerGuard server:", err);
  process.exit(1);
});
