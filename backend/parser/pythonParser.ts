import { spawn } from "child_process";
import path from "path";
import { ParserDiagnostic, ErrorCategory, TokenInfo } from "../../src/types/grammarGuard.ts";

interface RawParserResult {
  parseSuccess: boolean;
  message: string | null;
  line: number | null;
  column: number | null;
  startOffset: number | null;
  endOffset: number | null;
  sourceSnippet: string | null;
  tokens: TokenInfo[];
}

export class PythonParserAdapter {
  private workerPath: string;

  constructor() {
    this.workerPath = path.resolve(process.cwd(), "backend", "parser", "python_parser_worker.py");
  }

  /**
   * Run the worker with given JSON action
   */
  private async runWorker<T>(payload: Record<string, unknown>, timeoutMs = 4000): Promise<T> {
    return new Promise((resolve, reject) => {
      const child = spawn("python3", [this.workerPath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let timer: NodeJS.Timeout | null = setTimeout(() => {
        child.kill();
        reject(new Error(`Python parser worker timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (code !== 0 && !stdout.trim()) {
          reject(new Error(`Parser process exited with code ${code}: ${stderr}`));
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed as T);
        } catch (err) {
          reject(new Error(`Failed to parse worker output: ${stdout || stderr}`));
        }
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    });
  }

  /**
   * Parse Python source code and return normalized diagnostic
   */
  public async parseSource(source: string): Promise<ParserDiagnostic> {
    if (!source || source.trim() === "") {
      return {
        parseSuccess: true,
        message: null,
        line: null,
        column: null,
        startOffset: null,
        endOffset: null,
        category: "none",
        expectedTokens: [],
        automaticRepairEligible: false,
        limitations: ["Empty source provided"],
        tokens: [],
      };
    }

    try {
      const raw = await this.runWorker<RawParserResult>({
        action: "parse",
        source,
      });

      return this.normalizeDiagnostic(source, raw);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        parseSuccess: false,
        message: `Parser system error: ${message}`,
        line: 1,
        column: 1,
        startOffset: 0,
        endOffset: 0,
        category: "unsupported",
        expectedTokens: [],
        automaticRepairEligible: false,
        limitations: ["Parser execution failed to complete within safety threshold"],
        tokens: [],
      };
    }
  }

  /**
   * Batch validate candidate programs for rapid filtering
   */
  public async validateBatch(candidates: string[]): Promise<Array<{ parseSuccess: boolean; message: string | null; line?: number }>> {
    if (candidates.length === 0) return [];
    try {
      const res = await this.runWorker<{ results: Array<{ parseSuccess: boolean; message: string | null; line?: number }> }>({
        action: "validate_batch",
        candidates,
      });
      return res.results;
    } catch {
      // Fallback: sequential check if batch failed
      const seq: Array<{ parseSuccess: boolean; message: string | null }> = [];
      for (const cand of candidates) {
        const single = await this.parseSource(cand);
        seq.push({ parseSuccess: single.parseSuccess, message: single.message });
      }
      return seq;
    }
  }

  /**
   * Classify diagnostic deterministically and extract expected tokens without fabrication
   */
  private normalizeDiagnostic(source: string, raw: RawParserResult): ParserDiagnostic {
    if (raw.parseSuccess) {
      return {
        parseSuccess: true,
        message: null,
        line: null,
        column: null,
        startOffset: null,
        endOffset: null,
        category: "none",
        expectedTokens: [],
        automaticRepairEligible: false,
        limitations: [],
        sourceSnippet: null,
        tokens: raw.tokens || [],
      };
    }

    const msg = (raw.message || "").toLowerCase();
    let category: ErrorCategory = "unsupported";
    const expectedTokens: string[] = [];
    let eligible = false;
    const limitations: string[] = [];

    // Guard 1: Indentation / Tab errors are block-level structural issues, not localized repairs
    if (
      msg.includes("indent") ||
      msg.includes("tab") ||
      msg.includes("unindent") ||
      msg.includes("expected an indented block")
    ) {
      return {
        parseSuccess: false,
        message: raw.message,
        line: raw.line,
        column: raw.column,
        startOffset: raw.startOffset,
        endOffset: raw.endOffset,
        category: "unsupported",
        expectedTokens: [],
        automaticRepairEligible: false,
        limitations: ["Indentation errors require multi-line block restructuring outside single-token repair scope."],
        sourceSnippet: raw.sourceSnippet,
        tokens: raw.tokens || [],
      };
    }

    // Analyze delimiter errors
    if (
      msg.includes("was never closed") ||
      msg.includes("unmatched") ||
      msg.includes("closing parenthesis") ||
      msg.includes("unexpected eof while parsing")
    ) {
      category = "missing_delimiter";
      eligible = true;
      if (msg.includes("'('") || msg.includes("parenthesis")) {
        expectedTokens.push(")");
      } else if (msg.includes("'['") || msg.includes("bracket")) {
        expectedTokens.push("]");
      } else if (msg.includes("'{'") || msg.includes("brace")) {
        expectedTokens.push("}");
      }
    }
    // Check separator errors (explicit parser hint or adjacent literals on error line)
    else if (msg.includes("forgot a comma") || msg.includes("expected ','") || this.isMissingSeparator(source, raw)) {
      category = "missing_separator";
      expectedTokens.push(",");
      eligible = true;
    }
    // Check incomplete expression at end of line/file
    else if (this.isIncompleteExpression(source, raw)) {
      category = "incomplete_expression";
      eligible = true;
      limitations.push("Expression is syntactically incomplete; semantic intent cannot be inferred by compiler.");
    } else {
      category = "unsupported";
      eligible = false;
      limitations.push("Error type is outside the bounded localized syntax categories supported for deterministic repair.");
    }

    return {
      parseSuccess: false,
      message: raw.message,
      line: raw.line,
      column: raw.column,
      startOffset: raw.startOffset,
      endOffset: raw.endOffset,
      category,
      expectedTokens,
      automaticRepairEligible: eligible,
      limitations,
      sourceSnippet: raw.sourceSnippet,
      tokens: raw.tokens || [],
    };
  }

  private isIncompleteExpression(source: string, raw: RawParserResult): boolean {
    if (!raw.line) return false;
    const lines = source.split("\n");
    const targetLine = lines[raw.line - 1] || "";
    const trimmed = targetLine.trim();

    // Check if line ends with a binary operator or hanging expression token
    const binaryOpRegex = /[+\-*/%^&|=<>!]$|(\b(and|or|not|in|is)$)/;
    if (binaryOpRegex.test(trimmed)) {
      return true;
    }
    return false;
  }

  private isMissingSeparator(source: string, raw: RawParserResult): boolean {
    if (!raw.tokens || raw.tokens.length === 0 || !raw.line) return false;
    const errLine = raw.line;
    const rawTokens = raw.tokens;

    for (let i = 0; i < rawTokens.length - 1; i++) {
      const t1 = rawTokens[i];
      const t2 = rawTokens[i + 1];

      // Check if both tokens are on or near the error line
      if (t1.start[0] === errLine || t2.start[0] === errLine) {
        const isLiteral1 = t1.type === "NAME" || t1.type === "NUMBER" || t1.type === "STRING";
        const isLiteral2 = t2.type === "NAME" || t2.type === "NUMBER" || t2.type === "STRING";

        if (isLiteral1 && isLiteral2) {
          return true;
        }
      }
    }
    return false;
  }
}

export const pythonParser = new PythonParserAdapter();
