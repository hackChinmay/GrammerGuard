import {
  BenchmarkCase,
  BenchmarkMetrics,
  BenchmarkCaseResult,
} from "../../src/types/grammarGuard.ts";
import { pythonParser } from "../parser/pythonParser.ts";
import { repairEngine } from "../repair/repairEngine.ts";

export const BENCHMARK_DATASET: BenchmarkCase[] = [
  {
    id: "BM-01",
    title: "Unclosed Parenthesis in Calculation",
    category: "missing_delimiter",
    source: "total = (price + tax",
    knownIntendedRepair: "total = (price + tax)",
    expectedEligible: true,
    description: "Arithmetic expression enclosed in parenthesis missing closing delimiter",
    origin: "curated_canonical",
  },
  {
    id: "BM-02",
    title: "Unclosed List Bracket",
    category: "missing_delimiter",
    source: "items = [10, 20, 30",
    knownIntendedRepair: "items = [10, 20, 30]",
    expectedEligible: true,
    description: "List literal missing closing bracket",
    origin: "curated_canonical",
  },
  {
    id: "BM-03",
    title: "Unclosed Function Call Arguments",
    category: "missing_delimiter",
    source: "result = math.sqrt(16",
    knownIntendedRepair: "result = math.sqrt(16)",
    expectedEligible: true,
    description: "Standard function invocation missing closing parenthesis",
    origin: "synthetic",
  },
  {
    id: "BM-04",
    title: "Missing Comma in List Literal",
    category: "missing_separator",
    source: "numbers = [1, 2 3, 4]",
    knownIntendedRepair: "numbers = [1, 2, 3, 4]",
    expectedEligible: true,
    description: "Two adjacent numerical values in list without separating comma",
    origin: "curated_canonical",
  },
  {
    id: "BM-05",
    title: "Missing Comma in Tuple Argument",
    category: "missing_separator",
    source: "point = (10 20)",
    knownIntendedRepair: "point = (10, 20)",
    expectedEligible: true,
    description: "Coordinate tuple missing comma delimiter between coordinates",
    origin: "synthetic",
  },
  {
    id: "BM-06",
    title: "Incomplete Binary Expression (+)",
    category: "incomplete_expression",
    source: "total = price +",
    knownIntendedRepair: "total = price",
    expectedEligible: true,
    description: "Assignment statement ending in trailing binary plus operator",
    origin: "curated_canonical",
  },
  {
    id: "BM-07",
    title: "Incomplete Binary Expression (*)",
    category: "incomplete_expression",
    source: "volume = length * width *",
    knownIntendedRepair: "volume = length * width",
    expectedEligible: true,
    description: "Multiplication statement ending abruptly with dangling operator",
    origin: "synthetic",
  },
  {
    id: "BM-08",
    title: "Valid Python Function (Negative Control)",
    category: "none",
    source: "def add(a, b):\n    return a + b\n\nprint(add(2, 3))",
    knownIntendedRepair: undefined,
    expectedEligible: false,
    description: "Clean function definition with zero syntax errors; no repair should be triggered",
    origin: "curated_canonical",
  },
  {
    id: "BM-09",
    title: "Valid List Aggregation (Negative Control)",
    category: "none",
    source: "numbers = [1, 2, 3, 4]\nprint(sum(numbers))",
    knownIntendedRepair: undefined,
    expectedEligible: false,
    description: "Valid list comprehension and print call; must remain unmodified",
    origin: "curated_canonical",
  },
  {
    id: "BM-10",
    title: "Complex Indentation Error (Unsupported Category)",
    category: "unsupported",
    source: "def calculate():\nprint('Invalid indentation')",
    knownIntendedRepair: undefined,
    expectedEligible: false,
    description: "IndentationError outside localized delimiter/separator scope",
    origin: "curated_canonical",
  },
  {
    id: "BM-11",
    title: "Deeply Nested Cascading Syntax Mismatch",
    category: "unsupported",
    source: "for x in [1, 2:\n    if y >>> 2:\n        pass",
    knownIntendedRepair: undefined,
    expectedEligible: false,
    description: "Multiple cascading malformed constructs where single local edit is unjustified",
    origin: "synthetic",
  },
  {
    id: "BM-12",
    title: "Ambiguous Closing Delimiter Scope",
    category: "missing_delimiter",
    source: "matrix = [[1, 2], [3, 4",
    knownIntendedRepair: "matrix = [[1, 2], [3, 4]]",
    expectedEligible: true,
    description: "Nested list missing inner and/or outer closing bracket with competing insertion points",
    origin: "synthetic",
  },
];

export async function runBenchmarkEvaluation(): Promise<BenchmarkMetrics> {
  const caseResults: BenchmarkCaseResult[] = [];
  let totalGenerated = 0;
  let totalRejected = 0;
  let totalValidCandidates = 0;
  let falsePositives = 0;
  let negativeControlCount = 0;
  let eligibleWithKnown = 0;
  let matchedKnown = 0;
  let top1Matched = 0;
  let totalTokenDistSum = 0;
  let validCandidatesCountForDist = 0;

  const categoryBreakdown: Record<string, { total: number; valid: number; successRate: number }> = {};

  for (const bCase of BENCHMARK_DATASET) {
    if (!categoryBreakdown[bCase.category]) {
      categoryBreakdown[bCase.category] = { total: 0, valid: 0, successRate: 0 };
    }
    categoryBreakdown[bCase.category].total++;

    const diag = await pythonParser.parseSource(bCase.source);

    if (bCase.category === "none") {
      negativeControlCount++;
      // If code was already valid
      if (diag.parseSuccess) {
        caseResults.push({
          caseId: bCase.id,
          title: bCase.title,
          category: bCase.category,
          origin: bCase.origin,
          initialParseSuccess: true,
          eligible: false,
          generatedCount: 0,
          validCandidateCount: 0,
          topCandidateScore: null,
          topCandidateMatchesIntended: null,
          averageTokenDistance: 0,
          status: "no_repair_needed",
        });
        categoryBreakdown[bCase.category].valid++;
        continue;
      } else {
        // Unexpectedly reported syntax error on valid code
        falsePositives++;
        caseResults.push({
          caseId: bCase.id,
          title: bCase.title,
          category: bCase.category,
          origin: bCase.origin,
          initialParseSuccess: false,
          eligible: true,
          generatedCount: 0,
          validCandidateCount: 0,
          topCandidateScore: null,
          topCandidateMatchesIntended: false,
          averageTokenDistance: 0,
          status: "failed",
        });
        continue;
      }
    }

    if (!diag.automaticRepairEligible) {
      // Correctly identified as unsupported
      caseResults.push({
        caseId: bCase.id,
        title: bCase.title,
        category: bCase.category,
        origin: bCase.origin,
        initialParseSuccess: diag.parseSuccess,
        eligible: false,
        generatedCount: 0,
        validCandidateCount: 0,
        topCandidateScore: null,
        topCandidateMatchesIntended: null,
        averageTokenDistance: 0,
        status: "unsupported",
      });
      continue;
    }

    // Run repair engine
    const { eligibleCandidates, rejectedCandidates } = await repairEngine.generateAndRankCandidates(
      bCase.source,
      diag,
      `bm_eval_${bCase.id}`
    );

    totalGenerated += eligibleCandidates.length + rejectedCandidates.length;
    totalRejected += rejectedCandidates.length;
    totalValidCandidates += eligibleCandidates.length;

    let matched = false;
    let topScore: number | null = null;
    let topMatched = false;

    if (eligibleCandidates.length > 0) {
      topScore = eligibleCandidates[0].totalScore;
      categoryBreakdown[bCase.category].valid++;

      for (const cand of eligibleCandidates) {
        totalTokenDistSum += cand.tokenDistance;
        validCandidatesCountForDist++;
      }

      if (bCase.knownIntendedRepair) {
        eligibleWithKnown++;
        const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
        const intendedNorm = normalize(bCase.knownIntendedRepair);

        const matchIdx = eligibleCandidates.findIndex(
          (c) => normalize(c.repairedCode) === intendedNorm
        );

        if (matchIdx !== -1) {
          matched = true;
          matchedKnown++;
          if (matchIdx === 0) {
            top1Matched++;
            topMatched = true;
          }
        }
      }
    }

    caseResults.push({
      caseId: bCase.id,
      title: bCase.title,
      category: bCase.category,
      origin: bCase.origin,
      initialParseSuccess: diag.parseSuccess,
      eligible: true,
      generatedCount: eligibleCandidates.length + rejectedCandidates.length,
      validCandidateCount: eligibleCandidates.length,
      topCandidateScore: topScore,
      topCandidateMatchesIntended: bCase.knownIntendedRepair ? topMatched : null,
      averageTokenDistance:
        eligibleCandidates.length > 0
          ? Number(
              (
                eligibleCandidates.reduce((acc, c) => acc + c.tokenDistance, 0) /
                eligibleCandidates.length
              ).toFixed(2)
            )
          : 0,
      status: matched || (!bCase.knownIntendedRepair && eligibleCandidates.length > 0) ? "success" : "failed",
    });
  }

  // Calculate percentage success rates for categories
  for (const cat of Object.keys(categoryBreakdown)) {
    const item = categoryBreakdown[cat];
    item.successRate = item.total > 0 ? Number(((item.valid / item.total) * 100).toFixed(1)) : 0;
  }

  const repairSuccessRate =
    eligibleWithKnown > 0 ? Number(((matchedKnown / eligibleWithKnown) * 100).toFixed(1)) : 0;

  const falsePositiveRate =
    negativeControlCount > 0 ? Number(((falsePositives / negativeControlCount) * 100).toFixed(1)) : 0;

  const candidateRejectionRate =
    totalGenerated > 0 ? Number(((totalRejected / totalGenerated) * 100).toFixed(1)) : 0;

  const candidateSyntaxValidationRate =
    totalGenerated > 0 ? Number(((totalValidCandidates / totalGenerated) * 100).toFixed(1)) : 0;

  const averageTokenEditCost =
    validCandidatesCountForDist > 0
      ? Number((totalTokenDistSum / validCandidatesCountForDist).toFixed(2))
      : 1.0;

  const topKUsefulness =
    eligibleWithKnown > 0 ? Number(((top1Matched / eligibleWithKnown) * 100).toFixed(1)) : 0;

  return {
    totalCases: BENCHMARK_DATASET.length,
    eligibleCases: BENCHMARK_DATASET.filter((c) => c.expectedEligible).length,
    repairSuccessRate,
    falsePositiveRate,
    candidateRejectionRate,
    candidateSyntaxValidationRate,
    averageTokenEditCost,
    topKUsefulness,
    runTimestamp: new Date().toISOString(),
    categoryBreakdown,
    caseResults,
  };
}
