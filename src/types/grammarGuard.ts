/**
 * GrammerGuard - Core Domain Models and Contracts
 * Theory of Computation-grounded Program Repair and Verification
 */

export type ErrorCategory =
  | "missing_delimiter"
  | "missing_separator"
  | "incomplete_expression"
  | "unsupported"
  | "none";

export interface TokenInfo {
  type: string;
  string: string;
  start: [number, number]; // [line, col]
  end: [number, number];
}

export interface ParserDiagnostic {
  parseSuccess: boolean;
  message: string | null;
  line: number | null;
  column: number | null;
  startOffset: number | null;
  endOffset: number | null;
  category: ErrorCategory;
  expectedTokens: string[];
  automaticRepairEligible: boolean;
  limitations: string[];
  sourceSnippet?: string | null;
  tokens?: TokenInfo[];
}

export type SyntaxStatus = "syntax_valid" | "syntax_invalid" | "not_checked";
export type TestStatus = "tests_passed" | "tests_failed" | "not_run" | "not_available";
export type SemanticStatus = "unknown" | "partially_tested" | "not_established";

export interface EditOperation {
  type: "insert" | "delete" | "replace";
  position: number;
  line: number;
  column: number;
  token?: string;
  originalText?: string;
  insertedText?: string;
  description: string;
}

export interface ScoreComponents {
  editMinimality: number;    // 0 - 45 (token-level edit minimality)
  locationProximity: number; // 0 - 25 (proximity to reported parser error offset)
  preservationRatio: number; // 0 - 20 (fraction of original token stream preserved)
  ambiguityPenalty: number;  // 0 - 10 (penalty when competing structural interpretations exist)
  normalizedTotal: number;   // 0 - 100
}

export interface CandidateRepair {
  id: string;
  analysisId: string;
  repairedCode: string;
  editOperations: EditOperation[];
  repairRuleId: string;
  repairRuleName: string;
  syntaxStatus: SyntaxStatus;
  testStatus: TestStatus;
  semanticStatus: SemanticStatus;
  parserMessage: string | null;
  scoreComponents: ScoreComponents;
  totalScore: number;
  rejectionReasons: string[];
  limitations: string[];
  tokenDistance: number;
}

export interface AnalysisResult {
  id: string;
  language: "python";
  createdAt: string;
  sourceCode?: string;
  sourceHash: string;
  diagnostic: ParserDiagnostic;
  candidates: CandidateRepair[];
  eligibleCandidatesCount: number;
  rejectedCandidatesCount: number;
  selectedCandidateId: string | null;
  explanation?: string | null;
  explanationSource?: "gemini" | "rule_based" | null;
}

export interface BenchmarkCase {
  id: string;
  title: string;
  category: ErrorCategory;
  source: string;
  knownIntendedRepair?: string;
  expectedEligible: boolean;
  description: string;
  origin: "synthetic" | "curated_canonical";
}

export interface BenchmarkCaseResult {
  caseId: string;
  title: string;
  category: ErrorCategory;
  origin: string;
  initialParseSuccess: boolean;
  eligible: boolean;
  generatedCount: number;
  validCandidateCount: number;
  topCandidateScore: number | null;
  topCandidateMatchesIntended: boolean | null;
  averageTokenDistance: number;
  status: "success" | "no_repair_needed" | "rejected_properly" | "failed" | "unsupported";
}

export interface BenchmarkMetrics {
  totalCases: number;
  eligibleCases: number;
  repairSuccessRate: number; // percentage (0 - 100)
  falsePositiveRate: number; // percentage (0 - 100)
  candidateRejectionRate: number; // percentage (0 - 100)
  candidateSyntaxValidationRate: number; // percentage (0 - 100)
  averageTokenEditCost: number;
  topKUsefulness: number; // percentage (0 - 100)
  runTimestamp: string;
  categoryBreakdown: Record<string, { total: number; valid: number; successRate: number }>;
  caseResults: BenchmarkCaseResult[];
}

export interface UserFeedback {
  id: string;
  candidateId: string;
  accepted: boolean;
  optionalReason?: string;
  createdAt: string;
}

export interface AppSettings {
  storeRawSourceCode: boolean;
  enableGeminiExplanation: boolean;
  maxCandidates: number;
  theme: "dark" | "light";
}
