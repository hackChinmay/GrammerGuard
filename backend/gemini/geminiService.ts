import { GoogleGenAI } from "@google/genai";
import { ParserDiagnostic, CandidateRepair } from "../../src/types/grammarGuard.ts";

export interface ExplanationPayload {
  language: "python";
  parseSuccess: boolean;
  errorCategory: string;
  errorLine: number | null;
  errorColumn: number | null;
  parserMessage: string | null;
  expectedTokens: string[];
  candidate?: {
    repairRuleName: string;
    editOperations: Array<{ type: string; description: string }>;
    syntaxStatus: string;
    testStatus: string;
    semanticStatus: string;
    totalScore: number;
  };
}

export class GeminiExplanationService {
  private geminiClient: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      this.geminiClient = new GoogleGenAI({
        apiKey,
      });
    }
  }

  /**
   * Explain verified facts. Fallbacks to rule-based explanation if Gemini is unavailable or fails.
   */
  public async explain(
    diagnostic: ParserDiagnostic,
    candidate?: CandidateRepair
  ): Promise<{ explanation: string; source: "gemini" | "rule_based" }> {
    // If Gemini is not configured, return rule-based explanation immediately
    if (!this.geminiClient || !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      return {
        explanation: this.generateRuleBasedExplanation(diagnostic, candidate),
        source: "rule_based",
      };
    }

    const payload: ExplanationPayload = {
      language: "python",
      parseSuccess: diagnostic.parseSuccess,
      errorCategory: diagnostic.category,
      errorLine: diagnostic.line,
      errorColumn: diagnostic.column,
      parserMessage: diagnostic.message,
      expectedTokens: diagnostic.expectedTokens,
      candidate: candidate
        ? {
            repairRuleName: candidate.repairRuleName,
            editOperations: candidate.editOperations.map((e) => ({
              type: e.type,
              description: e.description,
            })),
            syntaxStatus: candidate.syntaxStatus,
            testStatus: candidate.testStatus,
            semanticStatus: candidate.semanticStatus,
            totalScore: candidate.totalScore,
          }
        : undefined,
    };

    const prompt = `
You are GrammerGuard's pedagogical compiler explainer.
Explain the following verified compiler facts to an engineering student in 2-3 concise paragraphs.

STRICT CONSTRAINTS:
1. Base your explanation strictly on the facts provided in the JSON payload below.
2. DO NOT state or imply that the code is semantically correct or that dynamic tests were run (testStatus is explicitly '${candidate?.testStatus || "not_run"}').
3. Explain the Context-Free Grammar (CFG) / production rule violation (e.g., unmatched delimiter, missing separator in a list/dict production, or incomplete expression).
4. Explain the localized edit applied and confirm that the Python AST parser accepted the syntax.
5. Emphasize that passing the compiler check proves syntax validity, NOT program correctness.

VERIFIED FACTS PAYLOAD:
${JSON.stringify(payload, null, 2)}
`;

    try {
      const generatePromise = this.geminiClient.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          temperature: 0.2, // deterministic and factual
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini explanation request timed out")), 4000)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);

      const text = response.text?.trim();
      if (text) {
        return { explanation: text, source: "gemini" };
      }
    } catch (err) {
      console.warn("Gemini explanation API request failed, falling back to rule-based:", err);
    }

    return {
      explanation: this.generateRuleBasedExplanation(diagnostic, candidate),
      source: "rule_based",
    };
  }

  /**
   * Deterministic rule-based fallback explanation
   */
  public generateRuleBasedExplanation(
    diagnostic: ParserDiagnostic,
    candidate?: CandidateRepair
  ): string {
    if (diagnostic.parseSuccess) {
      return "The Python compiler parsed the source code into an Abstract Syntax Tree (AST) with 0 syntax errors. All formal grammar productions were satisfied according to Python 3 specification.";
    }

    let categoryExplanation = "";
    switch (diagnostic.category) {
      case "missing_delimiter":
        categoryExplanation = `The compiler encountered an unmatched or unclosed delimiter ('${diagnostic.expectedTokens.join(
          "', '"
        ) || "bracket/parenthesis"}') at line ${diagnostic.line || 1}. In formal grammar terms, the delimiter production rule opened a balanced scope that was never closed before the line or file boundary.`;
        break;
      case "missing_separator":
        categoryExplanation = `The compiler encountered two adjacent expressions without a required delimiter/separator token (such as a comma ',') at line ${diagnostic.line || 1}. Sequence productions in Python grammar require explicit separation between consecutive elements.`;
        break;
      case "incomplete_expression":
        categoryExplanation = `The expression at line ${diagnostic.line || 1} ends abruptly with a binary operator or incomplete token, leaving an unsatisfied right-hand operand production in the grammar.`;
        break;
      default:
        categoryExplanation = `The compiler reported a syntax diagnostic: "${diagnostic.message || "Invalid syntax"}" at line ${
          diagnostic.line || 1
        }, col ${diagnostic.column || 1}.`;
        break;
    }

    if (!candidate) {
      return categoryExplanation;
    }

    const editDesc = candidate.editOperations.map((e) => e.description).join("; ");
    const verificationNote =
      candidate.syntaxStatus === "syntax_valid"
        ? "The proposed candidate was independently compiled through Python's ast.parse and verified as syntactically valid."
        : "The proposed candidate was rejected during compiler validation.";

    return `${categoryExplanation}

Repair Applied: ${candidate.repairRuleName} (${editDesc}). ${verificationNote}

Formal Verification Notice: Passing the syntax parser confirms grammatical membership in Python's formal language, but does not prove semantic correctness. Tests were ${
      candidate.testStatus === "not_run" ? "not executed" : candidate.testStatus
    }.`;
  }
}

export const geminiExplanationService = new GeminiExplanationService();
