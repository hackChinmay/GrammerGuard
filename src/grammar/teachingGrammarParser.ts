/**
 * GrammerGuard - Theory of Computation Teaching Grammar
 * 
 * Formal Context-Free Grammar (CFG):
 *   Expression -> Expression + Term | Expression - Term | Term
 *   Term       -> Term * Factor | Term / Factor | Factor
 *   Factor     -> NUMBER | IDENTIFIER | ( Expression )
 * 
 * Implements:
 * 1. Lexical Tokenizer
 * 2. Recursive-Descent Concrete Syntax Tree (Parse Tree) Builder
 * 3. Leftmost Derivation Generator with Rule Annotations
 * 4. Formal Ambiguity Analysis & Precedence Explanation
 */

export type TeachingTokenType =
  | "NUMBER"
  | "IDENTIFIER"
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "SLASH"
  | "LPAREN"
  | "RPAREN"
  | "INVALID"
  | "EOF";

export interface TeachingToken {
  type: TeachingTokenType;
  value: string;
  position: number;
}

export interface ParseTreeNode {
  id: string;
  name: string; // e.g. "Expression", "Term", "Factor", or terminal token
  rule?: string; // e.g. "Expression -> Expression + Term"
  isTerminal: boolean;
  value?: string;
  children: ParseTreeNode[];
}

export interface DerivationStep {
  stepIndex: number;
  sententialForm: string;
  appliedRule: string;
  targetNonTerminal: string;
  description: string;
}

export interface TeachingParseResult {
  success: boolean;
  tokens: TeachingToken[];
  parseTree: ParseTreeNode | null;
  derivationSteps: DerivationStep[];
  error?: string;
  errorPosition?: number;
  expectedTokens?: string[];
}

export class TeachingGrammarParser {
  // Lexer
  public tokenize(input: string): { tokens: TeachingToken[]; error?: string } {
    const tokens: TeachingToken[] = [];
    let i = 0;

    while (i < input.length) {
      const char = input[i];

      // Whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Numbers
      if (/[0-9]/.test(char)) {
        let numStr = "";
        const start = i;
        while (i < input.length && /[0-9.]/.test(input[i])) {
          numStr += input[i];
          i++;
        }
        tokens.push({ type: "NUMBER", value: numStr, position: start });
        continue;
      }

      // Identifiers
      if (/[a-zA-Z_]/.test(char)) {
        let idStr = "";
        const start = i;
        while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
          idStr += input[i];
          i++;
        }
        tokens.push({ type: "IDENTIFIER", value: idStr, position: start });
        continue;
      }

      // Operators & Delimiters
      if (char === "+") {
        tokens.push({ type: "PLUS", value: "+", position: i++ });
      } else if (char === "-") {
        tokens.push({ type: "MINUS", value: "-", position: i++ });
      } else if (char === "*") {
        tokens.push({ type: "STAR", value: "*", position: i++ });
      } else if (char === "/") {
        tokens.push({ type: "SLASH", value: "/", position: i++ });
      } else if (char === "(") {
        tokens.push({ type: "LPAREN", value: "(", position: i++ });
      } else if (char === ")") {
        tokens.push({ type: "RPAREN", value: ")", position: i++ });
      } else {
        return {
          tokens,
          error: `Lexical error: Character '${char}' at index ${i} is not part of the teaching grammar alphabet Σ = {0-9, a-z, +, -, *, /, (, )}`,
        };
      }
    }

    tokens.push({ type: "EOF", value: "$", position: input.length });
    return { tokens };
  }

  /**
   * Parse input into a concrete parse tree and generate derivation steps
   */
  public parse(input: string): TeachingParseResult {
    const lexResult = this.tokenize(input);
    if (lexResult.error) {
      return {
        success: false,
        tokens: lexResult.tokens,
        parseTree: null,
        derivationSteps: [],
        error: lexResult.error,
      };
    }

    const tokens = lexResult.tokens;
    let pos = 0;
    let nodeCounter = 0;

    function nextId(): string {
      return `node_${++nodeCounter}`;
    }

    function currentToken(): TeachingToken {
      return tokens[pos] || { type: "EOF", value: "$", position: input.length };
    }

    // Helper functions for grammar productions
    function parseExpression(): ParseTreeNode {
      let left = parseTerm();

      while (currentToken().type === "PLUS" || currentToken().type === "MINUS") {
        const opTok = currentToken();
        pos++;
        const right = parseTerm();

        const rule = opTok.type === "PLUS" ? "Expression -> Expression + Term" : "Expression -> Expression - Term";
        const opNode: ParseTreeNode = {
          id: nextId(),
          name: opTok.type,
          value: opTok.value,
          isTerminal: true,
          children: [],
        };

        const exprNode: ParseTreeNode = {
          id: nextId(),
          name: "Expression",
          rule,
          isTerminal: false,
          children: [left, opNode, right],
        };
        left = exprNode;
      }

      return left;
    }

    function parseTerm(): ParseTreeNode {
      let left = parseFactor();

      while (currentToken().type === "STAR" || currentToken().type === "SLASH") {
        const opTok = currentToken();
        pos++;
        const right = parseFactor();

        const rule = opTok.type === "STAR" ? "Term -> Term * Factor" : "Term -> Term / Factor";
        const opNode: ParseTreeNode = {
          id: nextId(),
          name: opTok.type,
          value: opTok.value,
          isTerminal: true,
          children: [],
        };

        const termNode: ParseTreeNode = {
          id: nextId(),
          name: "Term",
          rule,
          isTerminal: false,
          children: [left, opNode, right],
        };
        left = termNode;
      }

      return left;
    }

    function parseFactor(): ParseTreeNode {
      const tok = currentToken();

      if (tok.type === "NUMBER") {
        pos++;
        const numLeaf: ParseTreeNode = {
          id: nextId(),
          name: "NUMBER",
          value: tok.value,
          isTerminal: true,
          children: [],
        };
        return {
          id: nextId(),
          name: "Factor",
          rule: "Factor -> NUMBER",
          isTerminal: false,
          children: [numLeaf],
        };
      }

      if (tok.type === "IDENTIFIER") {
        pos++;
        const idLeaf: ParseTreeNode = {
          id: nextId(),
          name: "IDENTIFIER",
          value: tok.value,
          isTerminal: true,
          children: [],
        };
        return {
          id: nextId(),
          name: "Factor",
          rule: "Factor -> IDENTIFIER",
          isTerminal: false,
          children: [idLeaf],
        };
      }

      if (tok.type === "LPAREN") {
        pos++; // consume '('
        const lparenLeaf: ParseTreeNode = {
          id: nextId(),
          name: "LPAREN",
          value: "(",
          isTerminal: true,
          children: [],
        };

        const innerExpr = parseExpression();

        if (currentToken().type !== "RPAREN") {
          throw new Error(
            `Syntax error at position ${currentToken().position}: Expected closing delimiter ')' to match '(' opened earlier, found '${currentToken().value}'`
          );
        }

        const rparenLeaf: ParseTreeNode = {
          id: nextId(),
          name: "RPAREN",
          value: ")",
          isTerminal: true,
          children: [],
        };
        pos++; // consume ')'

        return {
          id: nextId(),
          name: "Factor",
          rule: "Factor -> ( Expression )",
          isTerminal: false,
          children: [lparenLeaf, innerExpr, rparenLeaf],
        };
      }

      throw new Error(
        `Syntax error at position ${tok.position}: Expected Factor (NUMBER, IDENTIFIER, or '('), but found '${tok.value}' (${tok.type})`
      );
    }

    try {
      const tree = parseExpression();

      if (currentToken().type !== "EOF") {
        const remaining = currentToken();
        throw new Error(
          `Syntax error: Unconsumed token '${remaining.value}' at position ${remaining.position}. Expression is incomplete or malformed.`
        );
      }

      const derivationSteps = this.generateDerivation(tree);

      return {
        success: true,
        tokens,
        parseTree: tree,
        derivationSteps,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        tokens,
        parseTree: null,
        derivationSteps: [],
        error: msg,
        errorPosition: currentToken().position,
        expectedTokens: ["NUMBER", "IDENTIFIER", "(", "+", "-", "*", "/"],
      };
    }
  }

  /**
   * Generates a step-by-step Leftmost Derivation from the CST
   */
  private generateDerivation(root: ParseTreeNode): DerivationStep[] {
    const steps: DerivationStep[] = [];

    // Step 0: Start symbol
    steps.push({
      stepIndex: 1,
      sententialForm: "Expression",
      appliedRule: "Start Symbol",
      targetNonTerminal: "Expression",
      description: "Initialize derivation from grammar start symbol S = Expression",
    });

    let currentForm = ["Expression"];
    let stepCount = 1;

    function expand(node: ParseTreeNode) {
      if (node.isTerminal) return;

      const rule = node.rule || `${node.name} -> ...`;
      const nonTerminalIndex = currentForm.indexOf(node.name);

      if (nonTerminalIndex !== -1) {
        stepCount++;
        // Replace non-terminal with children names or values
        const replacement = node.children.map((c) => (c.isTerminal ? c.value || c.name : c.name));
        currentForm.splice(nonTerminalIndex, 1, ...replacement);

        steps.push({
          stepIndex: stepCount,
          sententialForm: currentForm.join(" "),
          appliedRule: rule,
          targetNonTerminal: node.name,
          description: `Apply production [${rule}] on leftmost variable '${node.name}'`,
        });
      }

      for (const child of node.children) {
        expand(child);
      }
    }

    expand(root);
    return steps;
  }
}

export const teachingGrammarParser = new TeachingGrammarParser();
