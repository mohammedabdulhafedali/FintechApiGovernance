import React, { useState } from 'react';
import { Copy, Check, Terminal, AlertTriangle } from 'lucide-react';

interface MarkdownDocumentRendererProps {
  content: string;
  className?: string;
}

interface ParsedBlock {
  type: 'heading' | 'paragraph' | 'hr' | 'code' | 'list' | 'table' | 'blockquote';
  level?: number;
  text?: string;
  lang?: string;
  content?: string;
  isOrdered?: boolean;
  items?: Array<{ indent: number; bullet: string; text: string }>;
  headers?: string[];
  rows?: string[][];
  isWarning?: boolean;
}

export const MarkdownDocumentRenderer: React.FC<MarkdownDocumentRendererProps> = ({ content, className }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!content || typeof content !== 'string' || !content.trim()) {
    return (
      <div className={`pdf-doc-renderer empty ${className || ''}`} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>لا توجد بيانات موثقة صالحة لعرضها.</p>
      </div>
    );
  }

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to parse inline markdown (bold, italic, inline code, links)
  const renderInlineFormatted = (text: string): React.ReactNode => {
    if (!text || typeof text !== 'string') return null;

    try {
      const tokens: React.ReactNode[] = [];
      let remaining = text;
      let keyIdx = 0;
      let loopSafety = 0;

      while (remaining.length > 0 && loopSafety++ < 5000) {
      // 1. Inline code: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        tokens.push(
          <code key={keyIdx++} className="pdf-inline-code">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.substring(codeMatch[0].length);
        continue;
      }

      // 2. Bold: **bold** or __bold__
      const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
      if (boldMatch) {
        tokens.push(
          <strong key={keyIdx++} className="pdf-inline-bold">
            {renderInlineFormatted(boldMatch[2])}
          </strong>
        );
        remaining = remaining.substring(boldMatch[0].length);
        continue;
      }

      // 3. Italic: *italic* or _italic_
      const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
      if (italicMatch && !remaining.startsWith('**')) {
        tokens.push(
          <em key={keyIdx++} className="pdf-inline-italic">
            {renderInlineFormatted(italicMatch[2])}
          </em>
        );
        remaining = remaining.substring(italicMatch[0].length);
        continue;
      }

      // 4. Links: [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        tokens.push(
          <a
            key={keyIdx++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="pdf-inline-link"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.substring(linkMatch[0].length);
        continue;
      }

      // 5. Plain text until next special token
      const nextSpecial = remaining.search(/[`*_\[]/);
      if (nextSpecial === -1) {
        tokens.push(<React.Fragment key={keyIdx++}>{remaining}</React.Fragment>);
        break;
      } else if (nextSpecial === 0) {
        tokens.push(<React.Fragment key={keyIdx++}>{remaining[0]}</React.Fragment>);
        remaining = remaining.substring(1);
      } else {
        tokens.push(<React.Fragment key={keyIdx++}>{remaining.substring(0, nextSpecial)}</React.Fragment>);
        remaining = remaining.substring(nextSpecial);
      }
    }

    return tokens;
    } catch {
      return text;
    }
  };

  // Helper to check if line defines an endpoint
  const renderEndpointLine = (text: string) => {
    const epMatch = text.match(/(?:\*\*Endpoint\*\*\s*[:：]\s*|Endpoint\s*[:：]\s*)`?(GET|POST|PUT|DELETE|PATCH)\s+([/][^\s`\n]+)`?/i);
    if (epMatch) {
      const method = epMatch[1].toUpperCase();
      const path = epMatch[2].replace(/[`*]/g, '');
      const methodClass = method === 'GET' ? 'badge-method-get' :
                          method === 'POST' ? 'badge-method-post' :
                          method === 'DELETE' ? 'badge-method-delete' : 'badge-method-put';
      return (
        <div className="pdf-endpoint-badge-row">
          <span className="pdf-endpoint-label">Endpoint:</span>
          <span className={`pdf-method-tag ${methodClass}`}>{method}</span>
          <code className="pdf-endpoint-path" dir="ltr">{path}</code>
        </div>
      );
    }
    return renderInlineFormatted(text);
  };

  // Parser: breaks markdown into blocks
  const parseBlocks = (raw: string): ParsedBlock[] => {
    const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const blocks: ParsedBlock[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Empty line
      if (trimmed === '') {
        i++;
        continue;
      }

      // Fenced code block
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        blocks.push({ type: 'code', lang, content: codeLines.join('\n') });
        continue;
      }

      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        blocks.push({
          type: 'heading',
          level: headingMatch[1].length,
          text: headingMatch[2].trim()
        });
        i++;
        continue;
      }

      // Horizontal rule
      if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
        blocks.push({ type: 'hr' });
        i++;
        continue;
      }

      // Blockquote / Callout
      if (trimmed.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('>') || (lines[i].trim() !== '' && quoteLines.length > 0 && !lines[i].trim().startsWith('#') && !lines[i].trim().startsWith('|')))) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        const rawQuote = quoteLines.join('\n').trim();
        const isWarning = /⚠️|warning|notice|alert|caution|ملاحظة|تنبيه/i.test(rawQuote);
        blocks.push({ type: 'blockquote', text: rawQuote, isWarning });
        continue;
      }

      // Tables (tolerant to blank lines between rows)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length) {
          const curTrim = lines[i].trim();
          if (curTrim.startsWith('|') && curTrim.endsWith('|')) {
            tableLines.push(curTrim);
            i++;
          } else if (curTrim === '') {
            let hasMore = false;
            for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
              if (lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
                hasMore = true;
                break;
              } else if (lines[j].trim() !== '') {
                break;
              }
            }
            if (hasMore) {
              i++;
            } else {
              break;
            }
          } else {
            break;
          }
        }

        const nonSep = tableLines.filter(l => !/^[|\s:-]+$/.test(l));
        if (nonSep.length > 0) {
        const parseRow = (l: string, targetColCount?: number) => {
          const safe = l.replace(/\\\|/g, '__ESCAPED_PIPE__');
          const raw = safe.split('|').map(c => c.trim().replace(/__ESCAPED_PIPE__/g, '|'));
          let cells = raw.filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          if (targetColCount && cells.length > targetColCount) {
            // Merge overflow back into last cell so columns don't shift
            const merged = [...cells.slice(0, targetColCount - 1), cells.slice(targetColCount - 1).join(' \\ ')];
            return merged;
          }
          return cells;
        };

        const headers = parseRow(nonSep[0]);
        const rows = nonSep.slice(1).map(r => parseRow(r, headers.length));
        blocks.push({ type: 'table', headers, rows });
        }
        continue;
      }

      // Lists (numbered or bulleted)
      const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        const isOrdered = /^\d+\./.test(listMatch[2]);
        const listItems: Array<{ indent: number; bullet: string; text: string }> = [];
        while (i < lines.length) {
          const curLine = lines[i];
          const m = curLine.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
          if (m) {
            listItems.push({
              indent: m[1].length,
              bullet: m[2],
              text: m[3].trim()
            });
            i++;
          } else if (curLine.trim() === '') {
            if (i + 1 < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i + 1])) {
              i++;
            } else {
              break;
            }
          } else if (/^\s{2,}\S/.test(curLine)) {
            if (listItems.length > 0) {
              listItems[listItems.length - 1].text += ' ' + curLine.trim();
            }
            i++;
          } else {
            break;
          }
        }
        blocks.push({ type: 'list', isOrdered, items: listItems });
        continue;
      }

      // Normal paragraph
      const paraLines: string[] = [];
      while (i < lines.length) {
        const curTrim = lines[i].trim();
        if (curTrim === '' ||
            curTrim.startsWith('#') ||
            curTrim.startsWith('```') ||
            curTrim.startsWith('|') ||
            curTrim.startsWith('>') ||
            /^(\*{3,}|-{3,}|_{3,})$/.test(curTrim) ||
            /^(\s*)([-*+]|\d+\.)\s+/.test(lines[i])) {
          break;
        }
        paraLines.push(lines[i].trim());
        i++;
      }
      if (paraLines.length > 0) {
        blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
      }
    }

    return blocks;
  };

  let blocks: ParsedBlock[] = [];
  try {
    blocks = parseBlocks(content);
  } catch (err: any) {
    return (
      <div className={`pdf-doc-renderer error ${className || ''}`} style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#f87171' }}>
        <strong>خطأ في معالجة المستند:</strong> {err?.message || 'تعذر تحليل كود الماركداون بشكل آمن.'}
      </div>
    );
  }

  return (
    <div className={`pdf-document-body ${className || ''}`} dir="ltr">
      {blocks.map((block, idx) => {
        try {
          switch (block.type) {
          case 'heading': {
            const hText = block.text || '';
            if (block.level === 1) {
              return (
                <div key={idx} className="pdf-doc-h1-wrap">
                  <h1 className="pdf-doc-h1">{renderInlineFormatted(hText)}</h1>
                </div>
              );
            }
            if (block.level === 2) {
              return (
                <div key={idx} className="pdf-doc-h2-wrap">
                  <h2 className="pdf-doc-h2">{renderInlineFormatted(hText)}</h2>
                </div>
              );
            }
            if (block.level === 3) {
              return (
                <h3 key={idx} className="pdf-doc-h3">
                  {renderInlineFormatted(hText)}
                </h3>
              );
            }
            return (
              <h4 key={idx} className="pdf-doc-h4">
                {renderInlineFormatted(hText)}
              </h4>
            );
          }

          case 'hr':
            return <hr key={idx} className="pdf-doc-hr" />;

          case 'paragraph': {
            const text = block.text || '';
            if (text.includes('Endpoint') && (text.includes('POST') || text.includes('GET') || text.includes('PUT') || text.includes('DELETE'))) {
              return <div key={idx} className="pdf-doc-endpoint-container">{renderEndpointLine(text)}</div>;
            }
            return (
              <p key={idx} className="pdf-doc-paragraph">
                {renderInlineFormatted(text)}
              </p>
            );
          }

          case 'code': {
            const codeStr = block.content || '';
            const lang = (block.lang || 'text').toUpperCase();
            const isJson = lang === 'JSON';
            const isPython = lang === 'PYTHON';

            return (
              <div key={idx} className="pdf-doc-code-block">
                <div className="pdf-doc-code-header">
                  <span className="pdf-code-lang">
                    <Terminal size={12} style={{ marginRight: '4px', display: 'inline-block' }} />
                    {lang || 'CODE'}
                  </span>
                  <button
                    type="button"
                    className="pdf-code-copy-btn"
                    onClick={() => handleCopyCode(codeStr, idx)}
                    title="Copy code"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check size={11} style={{ color: '#10b981' }} />
                        <span style={{ color: '#10b981', marginLeft: '3px' }}>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span style={{ marginLeft: '3px' }}>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="pdf-doc-pre">
                  <code className={`pdf-code-content font-mono ${isJson ? 'is-json' : isPython ? 'is-python' : ''}`}>
                    {codeStr}
                  </code>
                </pre>
              </div>
            );
          }

          case 'table': {
            const headers = block.headers || [];
            const rows = block.rows || [];

            return (
              <div key={idx} className="pdf-doc-table-wrap">
                <table className="pdf-doc-table">
                  <thead>
                    <tr>
                      {headers.map((h, hIdx) => (
                        <th key={hIdx}>{renderInlineFormatted(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx}>{renderInlineFormatted(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          case 'blockquote': {
            return (
              <div
                key={idx}
                className={`pdf-doc-callout ${block.isWarning ? 'is-warning' : 'is-info'}`}
              >
                {block.isWarning && (
                  <AlertTriangle size={16} className="pdf-callout-icon" />
                )}
                <div className="pdf-callout-text">
                  {renderInlineFormatted(block.text || '')}
                </div>
              </div>
            );
          }

          case 'list': {
            const items = block.items || [];
            return (
              <div key={idx} className="pdf-doc-list-group">
                {items.map((item, lIdx) => {
                  const isNum = /^\d+\./.test(item.bullet);
                  const isEndpoint = item.text.includes('Endpoint') && (item.text.includes('POST') || item.text.includes('GET') || item.text.includes('PUT') || item.text.includes('DELETE'));
                  return (
                    <div
                      key={lIdx}
                      className={`pdf-doc-list-item ${isNum ? 'is-numbered' : 'is-bullet'}`}
                      style={{
                        paddingLeft: `${item.indent > 0 ? (item.indent * 14 + 18) : (isNum ? 0 : 18)}px`,
                        marginBottom: '0.35rem'
                      }}
                    >
                      <span className="pdf-list-bullet" style={{ minWidth: isNum ? '18px' : '14px', fontWeight: isNum ? 700 : 400 }}>
                        {isNum ? item.bullet : '•'}
                      </span>
                      <span className="pdf-list-text" style={{ flex: 1 }}>
                        {isEndpoint ? renderEndpointLine(item.text) : renderInlineFormatted(item.text)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          }

          default:
            return null;
        }
      } catch {
        return (
          <div key={idx} style={{ padding: '0.4rem 0.8rem', margin: '0.5rem 0', background: 'rgba(239, 68, 68, 0.1)', border: '1px dashed #ef4444', borderRadius: '4px', fontSize: '0.8rem', color: '#ef4444' }}>
            [تنبيه: تعذر عرض هذا المقطع لوجود خطأ في صياغته]
          </div>
        );
      }
    })}
    </div>
  );
};

export default MarkdownDocumentRenderer;
