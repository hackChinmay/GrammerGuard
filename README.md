# GrammerGuard: Grammar-Constrained Program Repair and Verification

GrammerGuard is a developer platform and academic Theory of Computation system for Python syntax repair. Rather than relying on unconstrained, speculative language model generation, GrammerGuard frames automated program repair as a **grammar-constrained search** over formal language productions, validated by a real compiler frontend.

---

## 1. Core Architecture & Workflow

```
[ Python Source Code ]
          │
          ▼
┌───────────────────────────────────────┐
│ 1. Deterministic Syntax Analysis       │ ──► Python 3.10 ast.parse & tokenize
│    (Dedicated Parser Adapter)         │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ 2. Normalized Diagnostic Extraction   │ ──► Line, column, offsets, category,
│    (Classifier & Safety Guards)       │     expected tokens, eligibility
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ 3. Bounded Candidate Generation       │ ──► Delimiters, separators, or dangling
│    (Localized Production Rules)       │     operators (R-DELIM, R-SEP, R-EXPR)
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ 4. Independent Compiler Validation    │ ──► Every candidate re-parsed by
│    (Hard Syntax Filtering)            │     ast.parse; invalid drafts REJECTED
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ 5. Transparent Deterministic Ranking  │ ──► Token Levenshtein edit distance,
│    (0-100 Multi-Factor Score)         │     proximity, preservation, ambiguity
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ 6. Grounded Gemini / Rule Explainer   │ ──► Pedagogical explanation based
│    (Verified Facts Contract)          │     STRICTLY on compiler facts
└───────────────────────────────────────┘
```

---

## 2. Theory of Computation Foundations

- **Context-Free Grammars (CFGs):** A program $P$ is syntactically valid if and only if $P \in L(G)$, where $L(G)$ is the language defined by grammar $G$.
- **Teaching Grammar Module:** Demonstrates non-terminals, terminals, and production rules:
  $$\begin{aligned}
  \text{Expression} &\to \text{Expression} + \text{Term} \mid \text{Expression} - \text{Term} \mid \text{Term} \\
  \text{Term} &\to \text{Term} * \text{Factor} \mid \text{Term} / \text{Factor} \mid \text{Factor} \\
  \text{Factor} &\to \text{NUMBER} \mid \text{IDENTIFIER} \mid ( \text{Expression} )
  \end{aligned}$$
- **Precedence Hierarchy:** Elimination of ambiguity by ordering operations into grammar layers ($T$ binds tighter than $E$).
- **Leftmost Derivations & Parse Trees:** Concrete visual derivations proving membership step by step.
- **Syntax vs. Semantics:** Syntax acceptance verifies grammatical membership in the formal language; it does **not** prove semantic correctness or test passage.

---

## 3. Supported Repair Categories & Boundaries

| Category | Typical Syntax Error | Repair Strategy |
|---|---|---|
| **Missing Delimiter** | `'(' was never closed`, unclosed `[` or `{` | Insert matching delimiter at line boundary or token boundary |
| **Missing Separator** | Adjacent literals in list/tuple/dict | Insert comma `,` at token boundary |
| **Incomplete Expression** | Dangling binary operator (`+`, `-`, `*`) | Trim trailing dangling operator without guessing variables |
| **Unsupported / Ambiguous** | IndentationError, cascading errors | Automatic repair withheld; diagnostic explained with limitations |

---

## 4. Deterministic Ranking Formula

Eligible candidates that pass independent compilation are scored on a scale of **0 to 100**:

$$\text{Score} = \text{EditMinimality}\,(45\%) + \text{LocationProximity}\,(25\%) + \text{PreservationRatio}\,(20\%) - \text{AmbiguityPenalty}\,(10\%)$$

1. **Edit Minimality (45%):** Token-level Levenshtein distance dynamic programming.
2. **Diagnostic Proximity (25%):** Proximity of the edit offset to the diagnostic location.
3. **Preservation Ratio (20%):** Fraction of original tokens left unmodified.
4. **Ambiguity Penalty (10%):** Deducted if multiple distinct valid candidates exist.

*Note:* Ranking score is an edit minimality heuristic, not a guarantee or probability of semantic correctness.

---

## 5. Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Monaco Editor, Monaco Diff Editor, Recharts, Lucide React.
- **Backend:** Node.js, Express, tsx.
- **Parser Engine:** Python 3.10 standard library (`ast.parse`, `tokenize.tokenize`, `compile`).
- **Pedagogical Explanations:** Gemini 3.8 Flash (`@google/genai`) with automatic rule-based fallback.
- **Persistence:** LocalStorage with privacy-first source retention abstraction.
- **Test Runner:** Vitest (automated unit tests).

---

## 6. Local Setup & Commands

### Prerequisites
- Node.js >= 18
- Python >= 3.10

### Installation & Run
```bash
# Install dependencies
npm install

# Run full-stack dev server (starts Express + Vite on port 3000)
npm run dev

# Run automated tests
npm test

# Type-check and lint
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

---

## 7. Security & Privacy Model

- **Zero Arbitrary Execution:** The Python parser worker *only* runs `ast.parse` and `tokenize`. User-submitted code is never executed.
- **Server-Side Secrets:** `GEMINI_API_KEY` is loaded exclusively on the Express backend; never exposed to browser bundles.
- **Privacy Mode (Default):** Raw source code is not retained in history storage unless explicitly opted in via Settings.
