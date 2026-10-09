import { describe, it, expect } from "vitest";
import { pythonParser } from "../backend/parser/pythonParser.ts";
import { repairEngine, calculateTokenEditDistance } from "../backend/repair/repairEngine.ts";
import { teachingGrammarParser } from "../src/grammar/teachingGrammarParser.ts";

describe("Python Parser Adapter & Diagnostics", () => {
  it("successfully parses valid Python code", async () => {
    const code = "def add(a, b):\n    return a + b\n\nprint(add(2, 3))";
    const diag = await pythonParser.parseSource(code);
    expect(diag.parseSuccess).toBe(true);
    expect(diag.category).toBe("none");
    expect(diag.automaticRepairEligible).toBe(false);
  });

  it("detects missing delimiter (unclosed parenthesis)", async () => {
    const code = "total = (price + tax";
    const diag = await pythonParser.parseSource(code);
    expect(diag.parseSuccess).toBe(false);
    expect(diag.category).toBe("missing_delimiter");
    expect(diag.automaticRepairEligible).toBe(true);
    expect(diag.expectedTokens).toContain(")");
  });

  it("detects missing delimiter (unclosed bracket)", async () => {
    const code = "items = [1, 2, 3";
    const diag = await pythonParser.parseSource(code);
    expect(diag.parseSuccess).toBe(false);
    expect(diag.category).toBe("missing_delimiter");
    expect(diag.automaticRepairEligible).toBe(true);
    expect(diag.expectedTokens).toContain("]");
  });

  it("detects missing separator between adjacent literals", async () => {
    const code = "numbers = [1, 2 3, 4]";
    const diag = await pythonParser.parseSource(code);
    expect(diag.parseSuccess).toBe(false);
    expect(diag.category).toBe("missing_separator");
    expect(diag.automaticRepairEligible).toBe(true);
  });

  it("detects incomplete expression with trailing binary operator", async () => {
    const code = "total = price +";
    const diag = await pythonParser.parseSource(code);
    expect(diag.parseSuccess).toBe(false);
    expect(diag.category).toBe("incomplete_expression");
    expect(diag.automaticRepairEligible).toBe(true);
  });

  it("classifies unsupported complex error properly", async () => {
    const code = "def calculate():\nprint('bad indent')";
    const diag = await pythonParser.parseSource(code);
    expect(diag.parseSuccess).toBe(false);
    expect(diag.category).toBe("unsupported");
    expect(diag.automaticRepairEligible).toBe(false);
  });
});

describe("Deterministic Candidate Repair Engine", () => {
  it("repairs missing parenthesis and validates candidate via real compiler", async () => {
    const code = "total = (price + tax";
    const diag = await pythonParser.parseSource(code);
    const { eligibleCandidates, rejectedCandidates } = await repairEngine.generateAndRankCandidates(
      code,
      diag,
      "test_analysis_1"
    );

    expect(eligibleCandidates.length).toBeGreaterThan(0);
    const top = eligibleCandidates[0];
    expect(top.syntaxStatus).toBe("syntax_valid");
    expect(top.totalScore).toBeGreaterThan(60);
    expect(top.repairedCode.trim()).toBe("total = (price + tax)");
  });

  it("repairs missing comma in list literal", async () => {
    const code = "numbers = [1, 2 3, 4]";
    const diag = await pythonParser.parseSource(code);
    const { eligibleCandidates } = await repairEngine.generateAndRankCandidates(
      code,
      diag,
      "test_analysis_2"
    );

    expect(eligibleCandidates.length).toBeGreaterThan(0);
    const repairedMatches = eligibleCandidates.some(
      (c) => c.repairedCode.replace(/\s+/g, "") === "numbers=[1,2,3,4]"
    );
    expect(repairedMatches).toBe(true);
  });

  it("handles incomplete expression by trimming dangling operator without guessing variables", async () => {
    const code = "total = price +";
    const diag = await pythonParser.parseSource(code);
    const { eligibleCandidates } = await repairEngine.generateAndRankCandidates(
      code,
      diag,
      "test_analysis_3"
    );

    expect(eligibleCandidates.length).toBeGreaterThan(0);
    const trimCandidate = eligibleCandidates.find((c) => c.repairedCode.trim() === "total = price");
    expect(trimCandidate).toBeDefined();
    expect(trimCandidate?.syntaxStatus).toBe("syntax_valid");
  });
});

describe("Token Levenshtein Edit Distance", () => {
  it("computes 0 for identical token streams", () => {
    const a = ["NAME:x", "OP:+", "NUMBER:1"];
    const b = ["NAME:x", "OP:+", "NUMBER:1"];
    expect(calculateTokenEditDistance(a, b)).toBe(0);
  });

  it("computes 1 for single token insertion", () => {
    const a = ["NAME:x", "OP:+"];
    const b = ["NAME:x", "OP:+", "NUMBER:1"];
    expect(calculateTokenEditDistance(a, b)).toBe(1);
  });

  it("computes 1 for single token deletion", () => {
    const a = ["NAME:x", "OP:+", "NUMBER:1"];
    const b = ["NAME:x", "NUMBER:1"];
    expect(calculateTokenEditDistance(a, b)).toBe(1);
  });

  it("computes 1 for single token substitution", () => {
    const a = ["NAME:x", "OP:+", "NUMBER:1"];
    const b = ["NAME:x", "OP:-", "NUMBER:1"];
    expect(calculateTokenEditDistance(a, b)).toBe(1);
  });
});

describe("Theory of Computation Teaching Grammar Parser", () => {
  it("parses valid expression with operator precedence and generates derivations", () => {
    const res = teachingGrammarParser.parse("3 + 5 * 2");
    expect(res.success).toBe(true);
    expect(res.parseTree).not.toBeNull();
    expect(res.derivationSteps.length).toBeGreaterThan(3);
    expect(res.derivationSteps[0].sententialForm).toBe("Expression");
  });

  it("parses parenthesized expression correctly", () => {
    const res = teachingGrammarParser.parse("(a + b) * c");
    expect(res.success).toBe(true);
    expect(res.parseTree?.name).toBe("Term");
  });

  it("rejects invalid syntax with descriptive error", () => {
    const res = teachingGrammarParser.parse("3 + * 5");
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("rejects non-alphabet tokens with lexical error", () => {
    const res = teachingGrammarParser.parse("x & y");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Lexical error");
  });
});
