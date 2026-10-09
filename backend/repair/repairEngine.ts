import {
  ParserDiagnostic,
  CandidateRepair,
  EditOperation,
  ScoreComponents,
  TokenInfo,
} from "../../src/types/grammarGuard.ts";
import { pythonParser } from "../parser/pythonParser.ts";

/**
 * Token-level Levenshtein Distance for strict formal distance metric
 */
export function calculateTokenEditDistance(tokensA: string[], tokensB: string[]): number {
  const m = tokensA.length;
  const n = tokensB.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (tokensA[i - 1] === tokensB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],    // deletion
          dp[i][j - 1],    // insertion
          dp[i - 1][j - 1] // substitution
        );
      }
    }
  }

  return dp[m][n];
}

interface RawCandidateDraft {
  id: string;
  repairedCode: string;
  editOperations: EditOperation[];
  repairRuleId: string;
  repairRuleName: string;
  proposedToken: string;
  editOffset: number;
}

export class CandidateRepairEngine {
  /**
   * Main pipeline: generate drafts, validate each with real Python parser,
   * filter out invalid ones, and rank valid candidates deterministically.
   */
  public async generateAndRankCandidates(
    originalSource: string,
    diagnostic: ParserDiagnostic,
    analysisId: string,
    maxCandidates = 5
  ): Promise<{ eligibleCandidates: CandidateRepair[]; rejectedCandidates: CandidateRepair[] }> {
    if (diagnostic.parseSuccess || !diagnostic.automaticRepairEligible) {
      return { eligibleCandidates: [], rejectedCandidates: [] };
    }

    // 1. Generate bounded candidate drafts
    const drafts = this.generateDrafts(originalSource, diagnostic);

    // 2. Extract sources for batch validation
    const candidateCodes = drafts.map((d) => d.repairedCode);
    const validationResults = await pythonParser.validateBatch(candidateCodes);

    const originalTokens = (diagnostic.tokens || []).map((t) => `${t.type}:${t.string}`);
    const originalLines = originalSource.split("\n");

    const eligibleList: CandidateRepair[] = [];
    const rejectedList: CandidateRepair[] = [];

    // Check competing valid candidates for ambiguity calculation
    let validCount = 0;
    for (const v of validationResults) {
      if (v.parseSuccess) validCount++;
    }
    const hasAmbiguity = validCount > 1;

    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i];
      const validation = validationResults[i] || { parseSuccess: false, message: "Validation missing" };

      // Compute token distance
      let tokenDist = 1;
      let candTokens: string[] = [];
      try {
        const parsedCand = await pythonParser.parseSource(draft.repairedCode);
        candTokens = (parsedCand.tokens || []).map((t) => `${t.type}:${t.string}`);
        tokenDist = calculateTokenEditDistance(originalTokens, candTokens);
      } catch {
        tokenDist = 2;
      }

      if (validation.parseSuccess) {
        // Calculate deterministic score components (0 - 100)
        const scoreComp = this.calculateScore(
          originalSource,
          draft,
          diagnostic,
          tokenDist,
          originalTokens.length,
          originalLines.length,
          hasAmbiguity
        );

        const candidate: CandidateRepair = {
          id: draft.id,
          analysisId,
          repairedCode: draft.repairedCode,
          editOperations: draft.editOperations,
          repairRuleId: draft.repairRuleId,
          repairRuleName: draft.repairRuleName,
          syntaxStatus: "syntax_valid",
          testStatus: "not_run",
          semanticStatus: "unknown",
          parserMessage: null,
          scoreComponents: scoreComp,
          totalScore: scoreComp.normalizedTotal,
          rejectionReasons: [],
          limitations: [
            "Syntax validity confirmed by Python compiler. Semantic correctness is not proven.",
            "Dynamic behavior and program semantics remain unverified without full execution tests."
          ],
          tokenDistance: tokenDist,
        };
        eligibleList.push(candidate);
      } else {
        const candidate: CandidateRepair = {
          id: draft.id,
          analysisId,
          repairedCode: draft.repairedCode,
          editOperations: draft.editOperations,
          repairRuleId: draft.repairRuleId,
          repairRuleName: draft.repairRuleName,
          syntaxStatus: "syntax_invalid",
          testStatus: "not_run",
          semanticStatus: "unknown",
          parserMessage: validation.message,
          scoreComponents: {
            editMinimality: 0,
            locationProximity: 0,
            preservationRatio: 0,
            ambiguityPenalty: 0,
            normalizedTotal: 0,
          },
          totalScore: 0,
          rejectionReasons: [
            `Failed independent Python syntax check: ${validation.message || "Invalid syntax"}`
          ],
          limitations: ["Rejected during syntax filtering"],
          tokenDistance: tokenDist,
        };
        rejectedList.push(candidate);
      }
    }

    // Sort eligible deterministically by score descending, then by tokenDistance ascending
    eligibleList.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.tokenDistance - b.tokenDistance;
    });

    return {
      eligibleCandidates: eligibleList.slice(0, maxCandidates),
      rejectedCandidates: rejectedList,
    };
  }

  /**
   * Deterministic draft generation bounded by error category & error location
   */
  private generateDrafts(source: string, diagnostic: ParserDiagnostic): RawCandidateDraft[] {
    const drafts: RawCandidateDraft[] = [];
    const lines = source.split("\n");
    const errorLineIdx = Math.max(0, (diagnostic.line || 1) - 1);
    const errorCol = diagnostic.column || 1;
    const errorOffset = diagnostic.startOffset ?? this.getCharOffset(lines, errorLineIdx, errorCol);

    if (diagnostic.category === "missing_delimiter") {
      this.generateDelimiterDrafts(source, lines, errorLineIdx, errorOffset, diagnostic, drafts);
    } else if (diagnostic.category === "missing_separator") {
      this.generateSeparatorDrafts(source, lines, errorLineIdx, diagnostic, drafts);
    } else if (diagnostic.category === "incomplete_expression") {
      this.generateIncompleteExprDrafts(source, lines, errorLineIdx, errorOffset, diagnostic, drafts);
    }

    return drafts;
  }

  private generateDelimiterDrafts(
    source: string,
    lines: string[],
    lineIdx: number,
    offset: number,
    diagnostic: ParserDiagnostic,
    drafts: RawCandidateDraft[]
  ) {
    const tokensNeeded = diagnostic.expectedTokens.length > 0 ? diagnostic.expectedTokens : [")", "]", "}"];

    for (const delimiter of tokensNeeded) {
      // Position 1: Append at end of error line
      const lineText = lines[lineIdx] || "";
      const lineEndOffset = this.getLineEndOffset(lines, lineIdx);
      const repaired1 = source.slice(0, lineEndOffset) + delimiter + source.slice(lineEndOffset);

      drafts.push({
        id: `cand_delim_line_end_${delimiter}_${drafts.length + 1}`,
        repairedCode: repaired1,
        editOperations: [
          {
            type: "insert",
            position: lineEndOffset,
            line: lineIdx + 1,
            column: lineText.length + 1,
            token: delimiter,
            insertedText: delimiter,
            description: `Insert closing delimiter '${delimiter}' at end of line ${lineIdx + 1}`,
          },
        ],
        repairRuleId: "R-DELIM-01",
        repairRuleName: `Insert Missing Delimiter '${delimiter}' at Line Boundary`,
        proposedToken: delimiter,
        editOffset: lineEndOffset,
      });

      // Position 2: Append at end of entire source if multi-line
      if (lineEndOffset !== source.length) {
        const repairedEOF = source + delimiter;
        drafts.push({
          id: `cand_delim_eof_${delimiter}_${drafts.length + 1}`,
          repairedCode: repairedEOF,
          editOperations: [
            {
              type: "insert",
              position: source.length,
              line: lines.length,
              column: (lines[lines.length - 1] || "").length + 1,
              token: delimiter,
              insertedText: delimiter,
              description: `Insert closing delimiter '${delimiter}' at end of file`,
            },
          ],
          repairRuleId: "R-DELIM-02",
          repairRuleName: `Insert Closing Delimiter '${delimiter}' at EOF`,
          proposedToken: delimiter,
          editOffset: source.length,
        });
      }

      // Position 3: If offset is known and inside line, test inserting after current token
      if (offset >= 0 && offset < source.length) {
        const nextWordMatch = source.slice(offset).match(/^[a-zA-Z0-9_]+/);
        const insertPos = nextWordMatch ? offset + nextWordMatch[0].length : offset;
        if (insertPos !== lineEndOffset && insertPos !== source.length) {
          const repairedLocal = source.slice(0, insertPos) + delimiter + source.slice(insertPos);
          drafts.push({
            id: `cand_delim_expr_${delimiter}_${drafts.length + 1}`,
            repairedCode: repairedLocal,
            editOperations: [
              {
                type: "insert",
                position: insertPos,
                line: lineIdx + 1,
                column: insertPos - this.getLineStartOffset(lines, lineIdx) + 1,
                token: delimiter,
                insertedText: delimiter,
                description: `Insert closing delimiter '${delimiter}' immediately after target sub-expression`,
              },
            ],
            repairRuleId: "R-DELIM-03",
            repairRuleName: `Insert Delimiter '${delimiter}' at Token Boundary`,
            proposedToken: delimiter,
            editOffset: insertPos,
          });
        }
      }
    }
  }

  private generateSeparatorDrafts(
    source: string,
    lines: string[],
    lineIdx: number,
    diagnostic: ParserDiagnostic,
    drafts: RawCandidateDraft[]
  ) {
    const rawTokens = diagnostic.tokens || [];
    // Scan adjacent literals or names without comma
    for (let i = 0; i < rawTokens.length - 1; i++) {
      const t1 = rawTokens[i];
      const t2 = rawTokens[i + 1];
      const isLiteral1 = t1.type === "NAME" || t1.type === "NUMBER" || t1.type === "STRING";
      const isLiteral2 = t2.type === "NAME" || t2.type === "NUMBER" || t2.type === "STRING";

      if (isLiteral1 && isLiteral2) {
        // Compute offset between t1 and t2
        const posLine = t1.end[0] - 1;
        const posCol = t1.end[1];
        const charPos = this.getCharOffset(lines, posLine, posCol);

        const repaired = source.slice(0, charPos) + "," + source.slice(charPos);
        drafts.push({
          id: `cand_sep_comma_${drafts.length + 1}`,
          repairedCode: repaired,
          editOperations: [
            {
              type: "insert",
              position: charPos,
              line: posLine + 1,
              column: posCol + 1,
              token: ",",
              insertedText: ",",
              description: `Insert missing comma separator between '${t1.string}' and '${t2.string}'`,
            },
          ],
          repairRuleId: "R-SEP-01",
          repairRuleName: "Insert Missing Comma Separator",
          proposedToken: ",",
          editOffset: charPos,
        });
      }
    }

    // Also try insertion right before diagnostic column if not covered
    if (drafts.length === 0 && diagnostic.startOffset !== null) {
      const pos = Math.max(0, diagnostic.startOffset - 1);
      const repaired = source.slice(0, pos) + ", " + source.slice(pos);
      drafts.push({
        id: `cand_sep_diagnostic_col_${drafts.length + 1}`,
        repairedCode: repaired,
        editOperations: [
          {
            type: "insert",
            position: pos,
            line: (diagnostic.line || 1),
            column: (diagnostic.column || 1),
            token: ",",
            insertedText: ", ",
            description: `Insert separator comma at diagnostic offset`,
          },
        ],
        repairRuleId: "R-SEP-02",
        repairRuleName: "Insert Comma at Diagnostic Site",
        proposedToken: ",",
        editOffset: pos,
      });
    }
  }

  private generateIncompleteExprDrafts(
    source: string,
    lines: string[],
    lineIdx: number,
    offset: number,
    diagnostic: ParserDiagnostic,
    drafts: RawCandidateDraft[]
  ) {
    const targetLine = lines[lineIdx] || "";
    // If line ends with trailing binary operator (e.g. `total = price +`)
    const trailingOpMatch = targetLine.match(/\s*([+\-*/%^&|=<>!]+)\s*$/);
    if (trailingOpMatch) {
      const op = trailingOpMatch[1];
      const matchIndex = targetLine.lastIndexOf(op);
      const lineStart = this.getLineStartOffset(lines, lineIdx);
      const deleteStart = lineStart + matchIndex;
      const deleteEnd = lineStart + targetLine.length;

      // Draft A: Delete trailing dangling operator
      const repairedTrim = source.slice(0, deleteStart).trimEnd() + source.slice(deleteEnd);
      drafts.push({
        id: `cand_expr_trim_op_${drafts.length + 1}`,
        repairedCode: repairedTrim,
        editOperations: [
          {
            type: "delete",
            position: deleteStart,
            line: lineIdx + 1,
            column: matchIndex + 1,
            token: op,
            originalText: op,
            description: `Remove trailing dangling operator '${op}' to close incomplete expression`,
          },
        ],
        repairRuleId: "R-EXPR-01",
        repairRuleName: "Trim Dangling Binary Operator",
        proposedToken: "",
        editOffset: deleteStart,
      });

      // Draft B: Complete with safe numeric identity (e.g. 0 for +, 1 for *)
      const identityToken = (op === "+" || op === "-") ? " 0" : (op === "*" || op === "/") ? " 1" : " None";
      const repairedComplete = source.slice(0, deleteStart + op.length) + identityToken + source.slice(deleteEnd);
      drafts.push({
        id: `cand_expr_identity_${drafts.length + 1}`,
        repairedCode: repairedComplete,
        editOperations: [
          {
            type: "insert",
            position: deleteStart + op.length,
            line: lineIdx + 1,
            column: matchIndex + op.length + 1,
            token: identityToken.trim(),
            insertedText: identityToken,
            description: `Complete expression with default identity value '${identityToken.trim()}'`,
          },
        ],
        repairRuleId: "R-EXPR-02",
        repairRuleName: "Complete Incomplete Binary Operation with Identity",
        proposedToken: identityToken.trim(),
        editOffset: deleteStart + op.length,
      });
    }
  }

  /**
   * Deterministic transparent score calculation
   * Weights:
   * - Edit Minimality: 45% (lower token distance = higher score)
   * - Proximity to Diagnostic Site: 25% (closer edit = higher score)
   * - Preservation Ratio: 20% (unmodified lines & tokens ratio)
   * - Ambiguity Penalty: 10% (deducted if multiple competing repairs are syntactically valid)
   */
  private calculateScore(
    originalSource: string,
    draft: RawCandidateDraft,
    diagnostic: ParserDiagnostic,
    tokenDist: number,
    originalTokenCount: number,
    originalLineCount: number,
    hasAmbiguity: boolean
  ): ScoreComponents {
    // 1. Edit Minimality (0 to 45 pts)
    let editMinimality = Math.max(5, Math.round(45 - (tokenDist - 1) * 10));
    if (editMinimality > 45) editMinimality = 45;

    // 2. Location Proximity (0 to 25 pts)
    let locationProximity = 25;
    if (diagnostic.category === "missing_delimiter") {
      // For missing delimiters, line-end or EOF insertion is the canonical repair site
      locationProximity = 25;
    } else {
      const diagOffset = diagnostic.startOffset || 0;
      const charDiff = Math.abs(draft.editOffset - diagOffset);
      if (charDiff > 5) {
        locationProximity = Math.max(5, Math.round(25 - Math.min(20, (charDiff / (originalSource.length || 1)) * 40)));
      }
    }

    // 3. Preservation Ratio (0 to 20 pts)
    const baseCount = Math.max(1, originalTokenCount);
    const untouchedTokens = Math.max(0, baseCount - tokenDist);
    const preservationRatio = Math.round((untouchedTokens / baseCount) * 20);

    // 4. Ambiguity Penalty (0 to 10 pts deducted)
    const ambiguityPenalty = hasAmbiguity ? 5 : 0;

    const rawTotal = editMinimality + locationProximity + preservationRatio - ambiguityPenalty;
    const normalizedTotal = Math.max(0, Math.min(100, rawTotal));

    return {
      editMinimality,
      locationProximity,
      preservationRatio,
      ambiguityPenalty,
      normalizedTotal,
    };
  }

  private getLineStartOffset(lines: string[], lineIdx: number): number {
    let offset = 0;
    for (let i = 0; i < lineIdx && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }
    return offset;
  }

  private getLineEndOffset(lines: string[], lineIdx: number): number {
    const start = this.getLineStartOffset(lines, lineIdx);
    const lineText = lines[lineIdx] || "";
    return start + lineText.length;
  }

  private getCharOffset(lines: string[], lineIdx: number, col: number): number {
    const lineStart = this.getLineStartOffset(lines, lineIdx);
    return Math.min(this.getLineEndOffset(lines, lineIdx), lineStart + Math.max(0, col));
  }
}

export const repairEngine = new CandidateRepairEngine();
