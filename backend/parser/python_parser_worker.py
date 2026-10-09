#!/usr/bin/env python3
"""
GrammerGuard - Python Parser Worker
Uses Python's standard ast and tokenize modules to parse Python code deterministically.
Arbitrary code is NEVER executed; only AST parsing and token stream extraction occur.
"""
import sys
import json
import ast
import tokenize
import io

def line_col_to_char_offset(source: str, lineno: int, col_offset: int) -> int:
    if lineno is None or col_offset is None or lineno < 1:
        return None
    lines = source.splitlines(keepends=True)
    if lineno > len(lines):
        return len(source)
    # 1-indexed lineno, 1-indexed col_offset (in Python 3.10 SyntaxError.offset is 1-indexed)
    char_count = sum(len(lines[i]) for i in range(lineno - 1))
    col = max(0, col_offset - 1)
    return min(len(source), char_count + col)

def tokenize_source(source: str):
    tokens = []
    try:
        readline = io.BytesIO(source.encode('utf-8')).readline
        for tok in tokenize.tokenize(readline):
            # Exclude ENCODING and ENDMARKER from core token comparison
            tok_name = tokenize.tok_name.get(tok.type, str(tok.type))
            if tok_name in ('ENCODING', 'ENDMARKER'):
                continue
            tokens.append({
                'type': tok_name,
                'string': tok.string,
                'start': [tok.start[0], tok.start[1]],
                'end': [tok.end[0], tok.end[1]]
            })
    except Exception as e:
        # Tokenizing might fail if there's unclosed string or bad token
        pass
    return tokens

def parse_single(source: str):
    tokens = tokenize_source(source)
    try:
        # ast.parse with mode='exec' compiles the source into an AST without execution
        ast.parse(source, filename="<string>", mode="exec")
        return {
            'parseSuccess': True,
            'message': None,
            'line': None,
            'column': None,
            'startOffset': None,
            'endOffset': None,
            'sourceSnippet': None,
            'tokens': tokens,
        }
    except (SyntaxError, IndentationError, TabError) as err:
        line = err.lineno
        col = err.offset
        start_offset = line_col_to_char_offset(source, line, col)
        
        # End offsets if present (Python 3.10+)
        end_line = getattr(err, 'end_lineno', None)
        end_col = getattr(err, 'end_offset', None)
        end_offset = None
        if end_line is not None and end_col is not None:
            end_offset = line_col_to_char_offset(source, end_line, end_col)
            
        snippet = getattr(err, 'text', None)
        if snippet:
            snippet = snippet.strip()
            
        return {
            'parseSuccess': False,
            'message': str(err.msg) if hasattr(err, 'msg') and err.msg else str(err),
            'line': line,
            'column': col,
            'startOffset': start_offset,
            'endOffset': end_offset,
            'sourceSnippet': snippet,
            'tokens': tokens,
        }
    except Exception as general_err:
        return {
            'parseSuccess': False,
            'message': f"Unexpected parser exception: {str(general_err)}",
            'line': 1,
            'column': 1,
            'startOffset': 0,
            'endOffset': 0,
            'sourceSnippet': None,
            'tokens': tokens,
        }

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            sys.stdout.write(json.dumps({'error': 'No input provided'}))
            return
        data = json.loads(raw_input)
        action = data.get('action', 'parse')
        
        if action == 'parse':
            source = data.get('source', '')
            res = parse_single(source)
            sys.stdout.write(json.dumps(res))
            
        elif action == 'validate_batch':
            candidates = data.get('candidates', [])
            results = []
            for cand in candidates:
                # Fast check for batch
                try:
                    ast.parse(cand, filename="<string>", mode="exec")
                    results.append({'parseSuccess': True, 'message': None})
                except (SyntaxError, IndentationError, TabError) as err:
                    results.append({'parseSuccess': False, 'message': str(getattr(err, 'msg', err)), 'line': err.lineno})
                except Exception as err:
                    results.append({'parseSuccess': False, 'message': str(err), 'line': 1})
            sys.stdout.write(json.dumps({'results': results}))
            
        elif action == 'tokenize':
            source = data.get('source', '')
            tokens = tokenize_source(source)
            sys.stdout.write(json.dumps({'tokens': tokens}))
            
        else:
            sys.stdout.write(json.dumps({'error': f"Unknown action: {action}"}))
    except Exception as e:
        sys.stdout.write(json.dumps({'error': f"Worker failure: {str(e)}"}))

if __name__ == '__main__':
    main()
