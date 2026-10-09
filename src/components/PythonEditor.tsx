import React, { useState, useEffect, useRef, useMemo } from "react";
import { loader } from "@monaco-editor/react";
import Editor from "@monaco-editor/react";
import { AlertCircle, Code2, Sparkles, Check, Copy } from "lucide-react";
import { ParserDiagnostic } from "../types/grammarGuard.ts";

interface PythonEditorProps {
  value: string;
  onChange: (value: string) => void;
  diagnostic: ParserDiagnostic | null;
  readOnly?: boolean;
}

/**
 * Tokenize a Python line into syntax-highlighted segments
 */
function highlightPythonLine(line: string): React.ReactNode[] {
  // Regex token types
  const commentIdx = line.indexOf("#");
  let codePart = line;
  let commentPart = "";

  if (commentIdx !== -1) {
    codePart = line.slice(0, commentIdx);
    commentPart = line.slice(commentIdx);
  }

  // Tokens regex
  const tokenRegex =
    /(\b(?:def|class|return|if|elif|else|while|for|in|try|except|finally|with|as|import|from|lambda|pass|break|continue|yield|True|False|None|and|or|not|is|async|await|assert|raise)\b)|(\b(?:print|len|range|sum|min|max|str|int|float|list|dict|set|tuple|open|type|abs|map|filter|enumerate|zip)\b)|("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')|(\b\d+(?:\.\d+)?\b)|([+\-*/%^&|=<>!]+)|([()\[\]{},:])|([a-zA-Z_][a-zA-Z0-9_]*)|(\s+)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(codePart)) !== null) {
    const [full, keyword, builtin, str, num, op, delim, ident, space] = match;

    if (keyword) {
      nodes.push(
        <span key={match.index} className="text-purple-400 font-semibold">
          {keyword}
        </span>
      );
    } else if (builtin) {
      nodes.push(
        <span key={match.index} className="text-cyan-400 font-medium">
          {builtin}
        </span>
      );
    } else if (str) {
      nodes.push(
        <span key={match.index} className="text-emerald-400">
          {str}
        </span>
      );
    } else if (num) {
      nodes.push(
        <span key={match.index} className="text-amber-400">
          {num}
        </span>
      );
    } else if (op) {
      nodes.push(
        <span key={match.index} className="text-rose-400 font-medium">
          {op}
        </span>
      );
    } else if (delim) {
      nodes.push(
        <span key={match.index} className="text-slate-400">
          {delim}
        </span>
      );
    } else if (ident) {
      nodes.push(
        <span key={match.index} className="text-slate-200">
          {ident}
        </span>
      );
    } else if (space) {
      nodes.push(<span key={match.index}>{space}</span>);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  // Any unmatched trailing part
  if (lastIndex < codePart.length) {
    nodes.push(<span key="tail">{codePart.slice(lastIndex)}</span>);
  }

  // Add comment if present
  if (commentPart) {
    nodes.push(
      <span key="comment" className="text-slate-500 italic">
        {commentPart}
      </span>
    );
  }

  return nodes;
}

export const PythonEditor: React.FC<PythonEditorProps> = ({
  value,
  onChange,
  diagnostic,
  readOnly = false,
}) => {
  const [useMonaco, setUseMonaco] = useState<boolean>(false);
  const [monacoLoaded, setMonacoLoaded] = useState<boolean>(false);
  const [monacoFailed, setMonacoFailed] = useState<boolean>(false);
  const [activeLine, setActiveLine] = useState<number>(1);
  const [cursorCol, setCursorCol] = useState<number>(1);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Attempt non-blocking Monaco loader initialization with a strict 1500ms safety timeout
  useEffect(() => {
    let isCancelled = false;

    const timeout = setTimeout(() => {
      if (!isCancelled && !monacoLoaded) {
        setMonacoFailed(true);
      }
    }, 1500);

    loader
      .init()
      .then(() => {
        if (!isCancelled) {
          clearTimeout(timeout);
          setMonacoLoaded(true);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          clearTimeout(timeout);
          console.warn("Monaco Editor CDN init bypassed:", err?.message || err);
          setMonacoFailed(true);
        }
      });

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [monacoLoaded]);

  // Handle synchronized scrolling for native editor
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  };

  // Handle cursor position updates
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const pos = ta.selectionStart;
    const textBefore = ta.value.substring(0, pos);
    const lines = textBefore.split("\n");
    setActiveLine(lines.length);
    setCursorCol(lines[lines.length - 1].length + 1);
  };

  // Handle Tab key for 4-space indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;

      if (!e.shiftKey) {
        // Insert 4 spaces
        const nextVal = value.substring(0, start) + "    " + value.substring(end);
        onChange(nextVal);
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = start + 4;
        }, 0);
      } else {
        // Shift+Tab dedent current line
        const before = value.substring(0, start);
        const lineStart = before.lastIndexOf("\n") + 1;
        const lineContent = value.substring(lineStart);
        if (lineContent.startsWith("    ")) {
          const nextVal = value.substring(0, lineStart) + lineContent.substring(4);
          onChange(nextVal);
          setTimeout(() => {
            ta.selectionStart = ta.selectionEnd = Math.max(lineStart, start - 4);
          }, 0);
        }
      }
    }
  };

  const lines = useMemo(() => value.split("\n"), [value]);
  const errorLine = diagnostic && !diagnostic.parseSuccess ? diagnostic.line : null;

  // If user explicitly chose Monaco AND Monaco is loaded, render Monaco
  if (useMonaco && monacoLoaded) {
    return (
      <div className="h-full flex flex-col min-h-0 bg-[#0d1117] relative">
        <div className="absolute top-2 right-4 z-20">
          <button
            onClick={() => setUseMonaco(false)}
            className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700"
          >
            Switch to Built-in Editor
          </button>
        </div>
        <Editor
          height="100%"
          language="python"
          theme="vs-dark"
          value={value}
          onChange={(val) => onChange(val || "")}
          options={{
            fontSize: 13,
            fontFamily: "ui-monospace, monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            automaticLayout: true,
            tabSize: 4,
            wordWrap: "on",
            readOnly,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    );
  }

  // First-class Built-in Python Editor with synchronized syntax highlighting and error markers
  return (
    <div className="h-full flex flex-col min-h-0 bg-[#0d1117] font-mono text-xs select-text relative">
      {/* Top Banner if Monaco can be toggled */}
      {monacoLoaded && !useMonaco && (
        <div className="px-3 py-1 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>High-Performance Python Editor</span>
          </div>
          <button
            onClick={() => setUseMonaco(true)}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
          >
            Enable Monaco Mode
          </button>
        </div>
      )}

      {/* Main Editor Gutter + Editing Area */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          className="w-12 bg-slate-950/70 border-r border-slate-800/80 text-slate-600 select-none py-3 text-right pr-3 overflow-hidden shrink-0"
        >
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const isError = errorLine === lineNum;
            const isCurrent = activeLine === lineNum;
            return (
              <div
                key={lineNum}
                className={`h-5 leading-5 flex items-center justify-end gap-1 ${
                  isError
                    ? "text-rose-400 font-bold bg-rose-950/40"
                    : isCurrent
                    ? "text-indigo-400 font-medium"
                    : ""
                }`}
              >
                {isError && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                )}
                <span>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Code Canvas Container */}
        <div className="flex-1 relative min-h-0 overflow-hidden">
          {/* Syntax-Highlighted Background Display */}
          <pre
            ref={preRef}
            aria-hidden="true"
            className="absolute inset-0 p-3 m-0 overflow-hidden pointer-events-none whitespace-pre leading-5 text-slate-200 select-none"
            style={{ tabSize: 4 }}
          >
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const isError = errorLine === lineNum;
              return (
                <div
                  key={idx}
                  className={`h-5 leading-5 ${isError ? "bg-rose-950/25" : ""}`}
                >
                  {line ? highlightPythonLine(line) : <span>&nbsp;</span>}
                </div>
              );
            })}
          </pre>

          {/* Interactive Transparent Textarea Overlay */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onSelect={handleSelect}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="absolute inset-0 w-full h-full p-3 m-0 bg-transparent text-transparent caret-indigo-400 resize-none font-mono text-xs leading-5 border-none outline-none focus:outline-none whitespace-pre overflow-auto"
            style={{
              tabSize: 4,
              WebkitTextFillColor: "transparent",
            }}
            placeholder="# Write Python code here..."
          />
        </div>
      </div>

      {/* Editor Status Bar */}
      <div className="h-6 px-3 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 select-none">
        <div className="flex items-center gap-3">
          <span>
            Ln {activeLine}, Col {cursorCol}
          </span>
          <span>Spaces: 4</span>
          <span>UTF-8</span>
          <span>Python 3.10</span>
        </div>

        {errorLine && (
          <div className="flex items-center gap-1.5 text-rose-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Syntax error on line {errorLine}</span>
          </div>
        )}
      </div>
    </div>
  );
};
