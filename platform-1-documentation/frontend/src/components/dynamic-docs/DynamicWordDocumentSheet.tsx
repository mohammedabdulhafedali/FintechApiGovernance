import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Scissors,
  Copy,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Columns,
  Table as TableIcon,
  Palette,
  Highlighter,
  ZoomIn,
  ZoomOut,
  PaintBucket,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Minus,
  Move,
  Maximize2,
  Split,
  Combine,
  Type,
  Grid,
  ChevronDown,
  Check
} from 'lucide-react';

export interface DynamicWordDocumentSheetProps {
  content: string;
  onChange: (newContent: string) => void;
  className?: string;
}

// ── UTILITIES: Markdown <-> HTML Conversion ──

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function inlineMarkdownToHtml(text: string): string {
  if (!text) return '';
  return text
    // bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // strikethrough
    .replace(/~~(.*?)~~/g, '<s>$1</s>')
    // inline code
    .replace(/`([^`]+)`/g, '<code class="pdf-inline-code">$1</code>');
}

function markdownToHtml(md: string): string {
  if (!md || typeof md !== 'string') return '<p class="pdf-doc-paragraph"><br></p>';

  const lines = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const htmlParts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      i++;
      continue;
    }

    // Fenced Code Block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      htmlParts.push(
        `<pre class="pdf-doc-code-block" data-lang="${escapeHtml(lang)}"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
      );
      continue;
    }

    // Headings # .. ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      htmlParts.push(
        `<h${level} class="pdf-doc-h${level}">${inlineMarkdownToHtml(title)}</h${level}>`
      );
      i++;
      continue;
    }

    // Horizontal Rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      htmlParts.push('<hr class="pdf-doc-hr" />');
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      htmlParts.push(
        `<blockquote class="pdf-doc-blockquote">${inlineMarkdownToHtml(quoteLines.join(' '))}</blockquote>`
      );
      continue;
    }

    // Tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      const nonSep = tableLines.filter(l => !/^[|\s:-]+$/.test(l));
      if (nonSep.length > 0) {
        const parseRow = (l: string, targetColCount?: number) => {
          const safe = l.replace(/\\\|/g, '__ESCAPED_PIPE__');
          const raw = safe.split('|').map(c => c.trim().replace(/__ESCAPED_PIPE__/g, '|'));
          let cells = raw.filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          if (targetColCount && cells.length > targetColCount) {
            // Merge extra cells back into description column so table doesn't shift
            const merged = [...cells.slice(0, targetColCount - 1), cells.slice(targetColCount - 1).join(' \\ ')];
            return merged;
          }
          return cells;
        };

        const headers = parseRow(nonSep[0]);
        const rows = nonSep.slice(1).map(r => parseRow(r, headers.length));

        let tableHtml = '<table class="pdf-doc-table word-fluid-table" border="1"><thead><tr>';
        headers.forEach(h => {
          tableHtml += `<th class="word-table-header-cell">${inlineMarkdownToHtml(h)}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        rows.forEach(r => {
          tableHtml += '<tr class="word-table-row">';
          r.forEach(c => {
            tableHtml += `<td class="word-table-cell">${inlineMarkdownToHtml(c)}</td>`;
          });
          tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table>';
        htmlParts.push(tableHtml);
      }
      continue;
    }

    // Lists (unordered and ordered)
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const isOrdered = /^\d+\./.test(listMatch[2]);
      const tag = isOrdered ? 'ol' : 'ul';
      let listHtml = `<${tag} class="pdf-doc-list">`;

      while (i < lines.length) {
        const cur = lines[i];
        const m = cur.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
        if (m) {
          listHtml += `<li>${inlineMarkdownToHtml(m[3].trim())}</li>`;
          i++;
        } else if (cur.trim() === '') {
          if (i + 1 < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i + 1])) {
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      listHtml += `</${tag}>`;
      htmlParts.push(listHtml);
      continue;
    }

    // Normal Paragraph
    const paraLines: string[] = [];
    while (i < lines.length) {
      const curTrim = lines[i].trim();
      if (
        curTrim === '' ||
        curTrim.startsWith('#') ||
        curTrim.startsWith('```') ||
        curTrim.startsWith('|') ||
        curTrim.startsWith('>') ||
        /^(\*{3,}|-{3,}|_{3,})$/.test(curTrim) ||
        /^(\s*)([-*+]|\d+\.)\s+/.test(lines[i])
      ) {
        break;
      }
      paraLines.push(lines[i].trim());
      i++;
    }

    if (paraLines.length > 0) {
      htmlParts.push(`<p class="pdf-doc-paragraph">${inlineMarkdownToHtml(paraLines.join(' '))}</p>`);
    }
  }

  return htmlParts.join('\n');
}

function inlineHtmlToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const inner = Array.from(el.childNodes).map(inlineHtmlToMarkdown).join('');

  if (tag === 'strong' || tag === 'b') return `**${inner.trim()}**`;
  if (tag === 'em' || tag === 'i') return `*${inner.trim()}*`;
  if (tag === 's' || tag === 'strike' || tag === 'del') return `~~${inner.trim()}~~`;
  if (tag === 'code') return `\`${inner.trim()}\``;
  if (tag === 'br') return '\n';

  return inner;
}

function htmlToMarkdown(container: HTMLElement): string {
  const parts: string[] = [];
  const children = Array.from(container.children);

  children.forEach(child => {
    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Headings
    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag.replace('h', ''), 10);
      const hashes = '#'.repeat(level);
      const text = inlineHtmlToMarkdown(el).trim();
      if (text) {
        parts.push(`${hashes} ${text}\n`);
      }
      return;
    }

    // Horizontal Rule
    if (tag === 'hr') {
      parts.push('---\n');
      return;
    }

    // Blockquote
    if (tag === 'blockquote') {
      const text = inlineHtmlToMarkdown(el).trim();
      if (text) {
        parts.push(`> ${text}\n`);
      }
      return;
    }

    // Pre / Code
    if (tag === 'pre') {
      const lang = el.getAttribute('data-lang') || '';
      const code = el.innerText || el.textContent || '';
      parts.push(`\`\`\`${lang}\n${code.trim()}\n\`\`\`\n`);
      return;
    }

    // Lists
    if (tag === 'ul') {
      const items = Array.from(el.querySelectorAll('li'));
      items.forEach(li => {
        parts.push(`- ${inlineHtmlToMarkdown(li).trim()}`);
      });
      parts.push('');
      return;
    }

    if (tag === 'ol') {
      const items = Array.from(el.querySelectorAll('li'));
      items.forEach((li, idx) => {
        parts.push(`${idx + 1}. ${inlineHtmlToMarkdown(li).trim()}`);
      });
      parts.push('');
      return;
    }

    // Tables
    if (tag === 'table') {
      const headerThs = Array.from(el.querySelectorAll('thead th, tr:first-child th'));
      const headers = headerThs.map(th => inlineHtmlToMarkdown(th).trim() || '-');

      if (headers.length > 0) {
        parts.push(`| ${headers.join(' | ')} |`);
        parts.push(`| ${headers.map(() => '---').join(' | ')} |`);

        const bodyRows = Array.from(el.querySelectorAll('tbody tr, tr:not(:first-child)'));
        bodyRows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td')).map(td => inlineHtmlToMarkdown(td).trim() || '-');
          if (cells.length > 0) {
            parts.push(`| ${cells.join(' | ')} |`);
          }
        });
        parts.push('');
      }
      return;
    }

    // Paragraphs and Divs
    const text = inlineHtmlToMarkdown(el).trim();
    if (text) {
      parts.push(`${text}\n`);
    }
  });

  return parts.join('\n');
}

export const DynamicWordDocumentSheet: React.FC<DynamicWordDocumentSheetProps> = ({
  content,
  onChange,
  className
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChangeRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Word Document View Preferences
  const [pageBgColor, setPageBgColor] = useState<string>('#ffffff');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Active Ribbon Tab (Home, Insert, Table Design, Table Layout)
  const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'insert' | 'tableDesign' | 'tableLayout'>('home');
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [fontSize, setFontSize] = useState<string>('11');
  const [tableHandlePos, setTableHandlePos] = useState<{ top: number; left: number; right: number; bottom: number } | null>(null);

  // Active Table State for Contextual Ribbon Buttons
  const [activeCell, setActiveCell] = useState<HTMLTableCellElement | null>(null);
  const [activeTable, setActiveTable] = useState<HTMLTableElement | null>(null);

  // Dropdown Pickers
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState<boolean>(false);
  const [showShadingPicker, setShowShadingPicker] = useState<boolean>(false);

  const textColors = ['#0f172a', '#1e293b', '#0369a1', '#15803d', '#b91c1c', '#b45309', '#6b21a8', '#0f766e'];
  const highlightColors = ['#fef08a', '#bbf7d0', '#bae6fd', '#fbcfe8', '#fed7aa', 'transparent'];
  const cellShadingColors = ['#ffffff', '#f8fafc', '#f1f5f9', '#fef3c7', '#dcfce7', '#e0f2fe', '#f3e8ff', '#fee2e2'];

  // Initialize and Sync from External Markdown (only when not actively typing)
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    if (editorRef.current) {
      const isFocused = document.activeElement && editorRef.current.contains(document.activeElement);
      if (!isFocused) {
        editorRef.current.innerHTML = markdownToHtml(content);
      }
    }
  }, [content]);

  // Track Active Table & Cell on selection change
  const checkActiveElement = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode || !editorRef.current) return;

    let node: Node | null = sel.anchorNode;
    let foundCell: HTMLTableCellElement | null = null;
    let foundTable: HTMLTableElement | null = null;

    while (node && node !== editorRef.current) {
      if (node.nodeName === 'TD' || node.nodeName === 'TH') {
        foundCell = node as HTMLTableCellElement;
      }
      if (node.nodeName === 'TABLE') {
        foundTable = node as HTMLTableElement;
        break;
      }
      node = node.parentNode;
    }

    setActiveCell(foundCell);
    setActiveTable(foundTable);
  }, []);

  // Serialize to Markdown and call parent onChange with debounce
  const syncToMarkdown = useCallback(() => {
    if (!editorRef.current) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!editorRef.current) return;
      isInternalChangeRef.current = true;
      const nextMd = htmlToMarkdown(editorRef.current);
      onChange(nextMd);
    }, 150);
  }, [onChange]);

  // Standard Word execCommand helper (preserves focus and selection)
  const execCmd = (cmd: string, val: string = '') => {
    try {
      document.execCommand(cmd, false, val);
      syncToMarkdown();
      checkActiveElement();
    } catch (e) {
      console.warn('execCommand error:', e);
    }
  };

  // ── KEYBOARD NAVIGATION IN TABLES (Word Behavior: Tab moves cell to cell, auto-adds row on last cell, Alt+Shift reorders) ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Word Shortcut: Alt+Shift+Up / Alt+Shift+Down to move current table row up or down!
    if (e.altKey && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      handleMoveTableRow(e.key === 'ArrowUp' ? 'up' : 'down');
      return;
    }

    if (e.key === 'Tab') {
      const sel = window.getSelection();
      if (!sel || !sel.anchorNode) return;

      let cell: HTMLElement | null = null;
      let node: Node | null = sel.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'TD' || node.nodeName === 'TH') {
          cell = node as HTMLElement;
          break;
        }
        node = node.parentNode;
      }

      if (cell) {
        e.preventDefault();
        const tr = cell.parentElement;
        if (!tr) return;
        const cells = Array.from(tr.children) as HTMLElement[];
        const cellIdx = cells.indexOf(cell);

        if (!e.shiftKey) {
          // Next cell
          if (cellIdx < cells.length - 1) {
            cells[cellIdx + 1].focus();
          } else {
            // Next row first cell
            const nextTr = tr.nextElementSibling as HTMLElement;
            if (nextTr) {
              const nextCells = Array.from(nextTr.children) as HTMLElement[];
              if (nextCells.length > 0) nextCells[0].focus();
            } else {
              // Last cell of last row in table: Auto Add Row (Standard Microsoft Word Behavior!)
              const table = tr.closest('table');
              if (table) {
                const tbody = table.querySelector('tbody') || table;
                const newTr = document.createElement('tr');
                newTr.className = 'word-table-row';
                cells.forEach(() => {
                  const newTd = document.createElement('td');
                  newTd.className = 'word-table-cell';
                  newTd.textContent = '-';
                  newTr.appendChild(newTd);
                });
                tbody.appendChild(newTr);
                syncToMarkdown();
                setTimeout(() => {
                  (newTr.children[0] as HTMLElement)?.focus();
                }, 10);
              }
            }
          }
        } else {
          // Prev cell
          if (cellIdx > 0) {
            cells[cellIdx - 1].focus();
          } else {
            const prevTr = tr.previousElementSibling as HTMLElement;
            if (prevTr) {
              const prevCells = Array.from(prevTr.children) as HTMLElement[];
              if (prevCells.length > 0) prevCells[prevCells.length - 1].focus();
            }
          }
        }
      }
    }
  };

  // ── TABLE MUTATOR ACTIONS (Full Word Table Controls) ──
  const handleInsertTable = () => {
    const tableHtml = `
      <table class="pdf-doc-table word-fluid-table" border="1" style="width: 100%; margin: 1rem 0; border-collapse: collapse;">
        <thead>
          <tr>
            <th class="word-table-header-cell">الحقل (Field)</th>
            <th class="word-table-header-cell">النوع (Type)</th>
            <th class="word-table-header-cell">إلزامي (Required)</th>
            <th class="word-table-header-cell">الوصف (Description)</th>
          </tr>
        </thead>
        <tbody>
          <tr class="word-table-row">
            <td class="word-table-cell">param_name</td>
            <td class="word-table-cell">string</td>
            <td class="word-table-cell">نعم</td>
            <td class="word-table-cell">وصف المعامل واستخدامه</td>
          </tr>
          <tr class="word-table-row">
            <td class="word-table-cell">param_id</td>
            <td class="word-table-cell">number</td>
            <td class="word-table-cell">لا</td>
            <td class="word-table-cell">معرف العملية الاختياري</td>
          </tr>
        </tbody>
      </table>
      <p class="pdf-doc-paragraph"><br></p>
    `;
    execCmd('insertHTML', tableHtml);
  };

  const handleAddTableRow = (position: 'above' | 'below') => {
    if (!activeCell || !activeTable) return;
    const currentTr = activeCell.closest('tr');
    if (!currentTr) return;

    const cellsCount = currentTr.children.length;
    const newTr = document.createElement('tr');
    newTr.className = 'word-table-row';

    for (let c = 0; c < cellsCount; c++) {
      const td = document.createElement('td');
      td.className = 'word-table-cell';
      td.textContent = c === 0 ? `new_param_${Date.now().toString().slice(-3)}` : '-';
      newTr.appendChild(td);
    }

    if (position === 'above') {
      currentTr.parentNode?.insertBefore(newTr, currentTr);
    } else {
      currentTr.parentNode?.insertBefore(newTr, currentTr.nextSibling);
    }

    syncToMarkdown();
    (newTr.children[0] as HTMLElement)?.focus();
  };

  const handleAddTableColumn = (position: 'left' | 'right') => {
    if (!activeCell || !activeTable) return;
    const currentTr = activeCell.closest('tr');
    if (!currentTr) return;

    const cellIdx = Array.from(currentTr.children).indexOf(activeCell);
    const rows = Array.from(activeTable.querySelectorAll('tr'));

    rows.forEach((row, ri) => {
      const isHeaderRow = ri === 0 && row.querySelector('th');
      const newCell = document.createElement(isHeaderRow ? 'th' : 'td');
      newCell.className = isHeaderRow ? 'word-table-header-cell' : 'word-table-cell';
      newCell.textContent = isHeaderRow ? 'عمود جديد' : '-';

      const targetCol = position === 'left' ? row.children[cellIdx] : row.children[cellIdx]?.nextSibling;
      if (targetCol) {
        row.insertBefore(newCell, targetCol);
      } else {
        row.appendChild(newCell);
      }
    });

    syncToMarkdown();
  };

  const handleDeleteTableRow = () => {
    if (!activeCell || !activeTable) return;
    const currentTr = activeCell.closest('tr');
    if (!currentTr) return;

    const tbody = currentTr.parentNode;
    currentTr.remove();

    if (tbody && tbody.children.length === 0) {
      activeTable.remove();
      setActiveTable(null);
      setActiveCell(null);
    }

    syncToMarkdown();
  };

  const handleDeleteTableColumn = () => {
    if (!activeCell || !activeTable) return;
    const currentTr = activeCell.closest('tr');
    if (!currentTr) return;

    const cellIdx = Array.from(currentTr.children).indexOf(activeCell);
    const rows = Array.from(activeTable.querySelectorAll('tr'));

    rows.forEach(row => {
      if (row.children[cellIdx]) {
        row.children[cellIdx].remove();
      }
    });

    syncToMarkdown();
  };

  const handleDeleteTable = () => {
    if (!activeTable) return;
    activeTable.remove();
    setActiveTable(null);
    setActiveCell(null);
    setFloatingBarPos(null);
    setContextMenu(null);
    syncToMarkdown();
  };

  const handleMoveTableRow = (direction: 'up' | 'down') => {
    if (!activeCell || !activeTable) return;
    const currentTr = activeCell.closest('tr');
    if (!currentTr) return;

    if (direction === 'up') {
      const prevTr = currentTr.previousElementSibling as HTMLElement;
      if (prevTr && !prevTr.querySelector('th')) {
        prevTr.parentNode?.insertBefore(currentTr, prevTr);
        syncToMarkdown();
      }
    } else {
      const nextTr = currentTr.nextElementSibling as HTMLElement;
      if (nextTr) {
        currentTr.parentNode?.insertBefore(nextTr, currentTr);
        syncToMarkdown();
      }
    }
  };

  const handleSetCellShading = (color: string) => {
    if (activeCell) {
      activeCell.style.backgroundColor = color === 'transparent' ? '' : color;
      setShowShadingPicker(false);
      syncToMarkdown();
    }
  };

  const handleSetCellAlignment = (align: 'left' | 'center' | 'right') => {
    if (activeCell) {
      activeCell.style.textAlign = align;
      syncToMarkdown();
    }
  };

  const handleSetCellAlignmentFull = (vAlign: 'top' | 'middle' | 'bottom', hAlign: 'right' | 'center' | 'left') => {
    if (!activeCell) return;
    activeCell.style.verticalAlign = vAlign;
    activeCell.style.textAlign = hAlign;
    syncToMarkdown();
  };

  const handleApplyTableStyle = (styleName: string) => {
    if (!activeTable) return;
    const ths = Array.from(activeTable.querySelectorAll('th'));
    const rows = Array.from(activeTable.querySelectorAll('tbody tr, tr:not(:first-child)'));

    if (styleName === 'classic') {
      activeTable.style.border = '1px solid #cbd5e1';
      ths.forEach(th => {
        th.style.backgroundColor = '#f1f5f9';
        th.style.color = '#0f172a';
        th.style.border = '1px solid #cbd5e1';
      });
      rows.forEach(r => {
        Array.from(r.children).forEach((c: any) => {
          c.style.backgroundColor = '#ffffff';
          c.style.color = '#334155';
          c.style.border = '1px solid #cbd5e1';
        });
      });
    } else if (styleName === 'corporate-blue') {
      activeTable.style.border = '1px solid #0284c7';
      ths.forEach(th => {
        th.style.backgroundColor = '#0369a1';
        th.style.color = '#ffffff';
        th.style.border = '1px solid #0284c7';
      });
      rows.forEach((r, idx) => {
        Array.from(r.children).forEach((c: any) => {
          c.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f0f9ff';
          c.style.color = '#1e293b';
          c.style.border = '1px solid #bae6fd';
        });
      });
    } else if (styleName === 'zebra') {
      activeTable.style.border = '1px solid #cbd5e1';
      ths.forEach(th => {
        th.style.backgroundColor = '#334155';
        th.style.color = '#ffffff';
        th.style.border = '1px solid #475569';
      });
      rows.forEach((r, idx) => {
        Array.from(r.children).forEach((c: any) => {
          c.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
          c.style.color = '#334155';
          c.style.border = '1px solid #e2e8f0';
        });
      });
    } else if (styleName === 'emerald') {
      activeTable.style.border = '1px solid #059669';
      ths.forEach(th => {
        th.style.backgroundColor = '#065f46';
        th.style.color = '#ffffff';
        th.style.border = '1px solid #047857';
      });
      rows.forEach((r, idx) => {
        Array.from(r.children).forEach((c: any) => {
          c.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#ecfdf5';
          c.style.color = '#1e293b';
          c.style.border = '1px solid #a7f3d0';
        });
      });
    } else if (styleName === 'minimal') {
      activeTable.style.border = 'none';
      ths.forEach(th => {
        th.style.backgroundColor = 'transparent';
        th.style.color = '#0f172a';
        th.style.borderTop = 'none';
        th.style.borderLeft = 'none';
        th.style.borderRight = 'none';
        th.style.borderBottom = '2px solid #0f172a';
      });
      rows.forEach(r => {
        Array.from(r.children).forEach((c: any) => {
          c.style.backgroundColor = 'transparent';
          c.style.color = '#334155';
          c.style.borderTop = 'none';
          c.style.borderLeft = 'none';
          c.style.borderRight = 'none';
          c.style.borderBottom = '1px solid #e2e8f0';
        });
      });
    }
    syncToMarkdown();
  };

  const handleSetTableBorders = (type: 'all' | 'outside' | 'none' | 'horizontal') => {
    if (!activeTable) return;
    const cells = Array.from(activeTable.querySelectorAll('th, td')) as HTMLElement[];
    if (type === 'all') {
      activeTable.style.border = '1px solid #cbd5e1';
      cells.forEach(c => (c.style.border = '1px solid #cbd5e1'));
    } else if (type === 'outside') {
      activeTable.style.border = '2px solid #0f172a';
      cells.forEach(c => (c.style.border = 'none'));
    } else if (type === 'none') {
      activeTable.style.border = 'none';
      cells.forEach(c => (c.style.border = 'none'));
    } else if (type === 'horizontal') {
      activeTable.style.border = 'none';
      cells.forEach(c => {
        c.style.borderTop = 'none';
        c.style.borderLeft = 'none';
        c.style.borderRight = 'none';
        c.style.borderBottom = '1px solid #cbd5e1';
      });
    }
    syncToMarkdown();
  };

  const handleMergeCell = () => {
    if (!activeCell) return;
    const nextCell = (activeCell.nextElementSibling || activeCell.previousElementSibling) as HTMLTableCellElement;
    if (nextCell) {
      const currentSpan = parseInt(activeCell.getAttribute('colspan') || '1', 10);
      const nextSpan = parseInt(nextCell.getAttribute('colspan') || '1', 10);
      activeCell.setAttribute('colspan', String(currentSpan + nextSpan));
      activeCell.innerHTML += ' ' + nextCell.innerHTML;
      nextCell.remove();
      syncToMarkdown();
    }
  };

  const handleSplitCell = () => {
    if (!activeCell) return;
    const currentSpan = parseInt(activeCell.getAttribute('colspan') || '1', 10);
    if (currentSpan > 1) {
      activeCell.setAttribute('colspan', String(currentSpan - 1));
      const newCell = document.createElement(activeCell.tagName);
      newCell.className = activeCell.className;
      newCell.innerHTML = '-';
      activeCell.parentNode?.insertBefore(newCell, activeCell.nextSibling);
    } else {
      const newCell = document.createElement(activeCell.tagName);
      newCell.className = activeCell.className;
      newCell.innerHTML = '-';
      activeCell.parentNode?.insertBefore(newCell, activeCell.nextSibling);
    }
    syncToMarkdown();
  };

  const handleDistributeColumns = () => {
    if (!activeTable) return;
    const ths = Array.from(activeTable.querySelectorAll('th'));
    if (ths.length > 0) {
      const widthPct = (100 / ths.length).toFixed(1) + '%';
      ths.forEach(th => {
        th.style.width = widthPct;
      });
    }
    syncToMarkdown();
  };

  const handleFontFamilyChange = (font: string) => {
    setFontFamily(font);
    execCmd('fontName', font);
  };

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = `${size}pt`;
      try {
        range.surroundContents(span);
      } catch {
        execCmd('fontSize', '3');
      }
      syncToMarkdown();
    }
  };

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Floating Mini Table Toolbar Position
  const [floatingBarPos, setFloatingBarPos] = useState<{ top: number; left: number } | null>(null);

  // Update Floating Mini Bar position and Table Handle position whenever activeCell / activeTable changes
  useEffect(() => {
    if (activeCell && editorRef.current) {
      const cellRect = activeCell.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      setFloatingBarPos({
        top: Math.max(10, cellRect.top - editorRect.top - 38),
        left: Math.max(10, cellRect.left - editorRect.left)
      });
    } else {
      setFloatingBarPos(null);
    }

    if (activeTable && editorRef.current) {
      const tRect = activeTable.getBoundingClientRect();
      const eRect = editorRef.current.getBoundingClientRect();
      setTableHandlePos({
        top: Math.max(0, tRect.top - eRect.top - 20),
        left: tRect.left - eRect.left,
        right: tRect.right - eRect.left,
        bottom: tRect.bottom - eRect.top
      });
    } else {
      setTableHandlePos(null);
    }
  }, [activeCell, activeTable]);

  // Handle Right Click inside table cells
  const handleContextMenu = (e: React.MouseEvent) => {
    let target = e.target as HTMLElement;
    let cell: HTMLTableCellElement | null = null;
    let table: HTMLTableElement | null = null;

    while (target && target !== editorRef.current) {
      if (target.nodeName === 'TD' || target.nodeName === 'TH') {
        cell = target as HTMLTableCellElement;
      }
      if (target.nodeName === 'TABLE') {
        table = target as HTMLTableElement;
        break;
      }
      target = target.parentElement as HTMLElement;
    }

    if (cell && table) {
      e.preventDefault();
      setActiveCell(cell);
      setActiveTable(table);
      setContextMenu({ x: e.clientX, y: e.clientY });
    } else {
      setContextMenu(null);
    }
  };

  // Close context menu on any global click or Esc
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  return (
    <div
      className="dynamic-word-studio-wrapper"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#0f172a',
        position: 'relative'
      }}
    >
      {/* ══════════════════════════════════════════════════════════════
          MICROSOFT WORD TOP RIBBON BAR
          ══════════════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════════
          MICROSOFT WORD TOP RIBBON BAR (Authentic Word Layout)
          ══════════════════════════════════════════════════════════════ */}
      <div
        className="word-ribbon-bar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#f8fafc',
          borderBottom: '1px solid #cbd5e1',
          userSelect: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          zIndex: 10
        }}
      >
        {/* ROW 1: RIBBON TAB HEADERS */}
        <div
          className="word-ribbon-tabs-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#f1f5f9',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 0.5rem',
            gap: '2px',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          <button
            type="button"
            onClick={() => setActiveRibbonTab('home')}
            className={`word-tab-nav-btn ${activeRibbonTab === 'home' ? 'active' : ''}`}
          >
            الشريط الرئيسي (Home)
          </button>
          <button
            type="button"
            onClick={() => setActiveRibbonTab('insert')}
            className={`word-tab-nav-btn ${activeRibbonTab === 'insert' ? 'active' : ''}`}
          >
            إدراج (Insert)
          </button>

          {/* Contextual Table Tools Tab Group (Lights up in Blue when table is active!) */}
          {activeTable && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#e0f2fe',
                border: '1px solid #7dd3fc',
                borderBottom: 'none',
                borderRadius: '5px 5px 0 0',
                margin: '0 6px',
                padding: '1px 6px',
                gap: '2px'
              }}
            >
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0369a1', marginInlineEnd: '4px' }}>
                أدوات الجدول:
              </span>
              <button
                type="button"
                onClick={() => setActiveRibbonTab('tableDesign')}
                className={`word-tab-nav-btn word-tab-contextual ${activeRibbonTab === 'tableDesign' ? 'active' : ''}`}
              >
                تصميم الجدول (Design)
              </button>
              <button
                type="button"
                onClick={() => setActiveRibbonTab('tableLayout')}
                className={`word-tab-nav-btn word-tab-contextual ${activeRibbonTab === 'tableLayout' ? 'active' : ''}`}
              >
                تخطيط (Layout)
              </button>
            </div>
          )}

          {/* Right utilities: Page background color & Zoom */}
          <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '2px 0' }}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setPageBgColor(pageBgColor === '#ffffff' ? '#fcfbf7' : pageBgColor === '#fcfbf7' ? '#f9f8f5' : '#ffffff');
              }}
              className="word-action-pill"
              style={{ fontSize: '0.72rem' }}
              title="تبديل لون الورقة (ورق دافئ / أبيض ناصع)"
            >
              ورق: {pageBgColor === '#ffffff' ? 'أبيض' : 'دافئ'}
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setZoomLevel(prev => Math.max(75, prev - 10)); }}
              className="word-btn"
              title="تصغير العرض"
            >
              <ZoomOut size={13} />
            </button>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, minWidth: '32px', textAlign: 'center' }}>{zoomLevel}%</span>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setZoomLevel(prev => Math.min(130, prev + 10)); }}
              className="word-btn"
              title="تكبير العرض"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>

        {/* ROW 2: RIBBON CONTENT PANELS */}
        <div
          className="word-ribbon-content-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.8rem',
            overflowX: 'auto',
            minHeight: '44px'
          }}
        >
          {/* TAB 1: HOME (الشريط الرئيسي) */}
          {activeRibbonTab === 'home' && (
            <>
              {/* Clipboard Group */}
              <div className="word-ribbon-group" title="الحافظة">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('undo'); }}
                  className="word-btn"
                  title="تراجع (Ctrl+Z)"
                >
                  <Undo2 size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('redo'); }}
                  className="word-btn"
                  title="إعادة (Ctrl+Y)"
                >
                  <Redo2 size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('cut'); }}
                  className="word-btn"
                  title="قص (Ctrl+X)"
                >
                  <Scissors size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('copy'); }}
                  className="word-btn"
                  title="نسخ (Ctrl+C)"
                >
                  <Copy size={15} />
                </button>
              </div>

              {/* Font Group */}
              <div className="word-ribbon-group" title="خط">
                <select
                  value={fontFamily}
                  onChange={(e) => handleFontFamilyChange(e.target.value)}
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#1e293b',
                    height: '24px'
                  }}
                  title="نوع الخط"
                >
                  <option value="Arial">Arial</option>
                  <option value="Segoe UI">Segoe UI</option>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Amiri">Amiri</option>
                  <option value="Courier New">Courier New (كود)</option>
                </select>

                <select
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(e.target.value)}
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#1e293b',
                    width: '45px',
                    height: '24px'
                  }}
                  title="حجم الخط"
                >
                  <option value="9">9</option>
                  <option value="10">10</option>
                  <option value="11">11</option>
                  <option value="12">12</option>
                  <option value="14">14</option>
                  <option value="16">16</option>
                  <option value="18">18</option>
                  <option value="24">24</option>
                </select>

                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }}
                  className="word-btn"
                  title="خط عريض (Ctrl+B)"
                >
                  <Bold size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }}
                  className="word-btn"
                  title="مائل (Ctrl+I)"
                >
                  <Italic size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }}
                  className="word-btn"
                  title="تسطير (Ctrl+U)"
                >
                  <Underline size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('strikeThrough'); }}
                  className="word-btn"
                  title="شطب النص"
                >
                  <Strikethrough size={15} />
                </button>

                {/* Color Pickers */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowColorPicker(!showColorPicker);
                      setShowHighlightPicker(false);
                      setShowShadingPicker(false);
                    }}
                    className="word-btn"
                    title="لون الخط"
                  >
                    <Palette size={15} color="#0284c7" />
                  </button>
                  {showColorPicker && (
                    <div className="word-dropdown-palette">
                      {textColors.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            execCmd('foreColor', c);
                            setShowColorPicker(false);
                          }}
                          style={{ width: '20px', height: '20px', borderRadius: '3px', background: c, border: '1px solid #cbd5e1', cursor: 'pointer' }}
                          title={c}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowHighlightPicker(!showHighlightPicker);
                      setShowColorPicker(false);
                      setShowShadingPicker(false);
                    }}
                    className="word-btn"
                    title="تمييز النص (Highlight)"
                  >
                    <Highlighter size={15} color="#eab308" />
                  </button>
                  {showHighlightPicker && (
                    <div className="word-dropdown-palette">
                      {highlightColors.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            execCmd('hiliteColor', c);
                            setShowHighlightPicker(false);
                          }}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '3px',
                            background: c === 'transparent' ? '#ffffff' : c,
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                            fontSize: '0.6rem'
                          }}
                          title={c === 'transparent' ? 'إزالة التظليل' : 'تظليل'}
                        >
                          {c === 'transparent' ? '✕' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Paragraph Group */}
              <div className="word-ribbon-group" title="فقرة">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('justifyRight'); }}
                  className="word-btn"
                  title="محاذاة لليمين"
                >
                  <AlignRight size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('justifyCenter'); }}
                  className="word-btn"
                  title="توسيط"
                >
                  <AlignCenter size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('justifyLeft'); }}
                  className="word-btn"
                  title="محاذاة لليسار"
                >
                  <AlignLeft size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('justifyFull'); }}
                  className="word-btn"
                  title="ضبط النص بالكامل (Justify)"
                >
                  <AlignJustify size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }}
                  className="word-btn"
                  title="قائمة نقطية"
                >
                  <List size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('insertOrderedList'); }}
                  className="word-btn"
                  title="قائمة رقمية"
                >
                  <ListOrdered size={15} />
                </button>
              </div>

              {/* Styles Gallery (معرض الأنماط كما في مايكروسوفت وورد) */}
              <div className="word-ribbon-group" style={{ gap: '4px' }} title="معرض أنماط وورد">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', '<p>'); }}
                  className="word-style-card"
                  title="نمط عادي"
                >
                  <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>عادي</span>
                  <span style={{ fontSize: '0.62rem', color: '#64748b' }}>خط أساسي</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', '<h1>'); }}
                  className="word-style-card"
                  title="عنوان رئيسي 1"
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0369a1' }}>العنوان 1</span>
                  <span style={{ fontSize: '0.62rem', color: '#64748b' }}>أقسام رئيسية</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', '<h2>'); }}
                  className="word-style-card"
                  title="عنوان فرعي 2"
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>عنوان 2</span>
                  <span style={{ fontSize: '0.62rem', color: '#64748b' }}>بنود فرعية</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', '<blockquote>'); }}
                  className="word-style-card"
                  title="اقتباس تنبيهي"
                >
                  <span style={{ fontSize: '0.76rem', fontStyle: 'italic', color: '#0284c7' }}>اقتباس</span>
                  <span style={{ fontSize: '0.62rem', color: '#64748b' }}>ملاحظة هامة</span>
                </button>
              </div>
            </>
          )}

          {/* TAB 2: INSERT (إدراج) */}
          {activeRibbonTab === 'insert' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleInsertTable(); }}
                className="word-action-pill"
                style={{ color: '#0369a1', borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }}
                title="إدراج جدول مواصفات جديد"
              >
                <TableIcon size={14} /> + جدول مواصفات (3×4)
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('insertHorizontalRule'); }}
                className="word-action-pill"
                title="إدراج خط فاصل بين الأقسام"
              >
                ― خط فاصل
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', '<h1>'); }}
                className="word-action-pill"
                title="إدراج عنوان رئيسي"
              >
                + عنوان قسم (H1)
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', '<h2>'); }}
                className="word-action-pill"
                title="إدراج عنوان فرعي"
              >
                + عنوان فرعي (H2)
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', '<pre>'); }}
                className="word-action-pill"
                title="إدراج كتلة كود أو JSON"
              >
                &lt;/&gt; كتلة كود
              </button>
            </div>
          )}

          {/* TAB 3: TABLE DESIGN (أدوات الجدول - تصميم الجدول) */}
          {activeRibbonTab === 'tableDesign' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'nowrap' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0369a1', marginInlineEnd: '4px' }}>
                أنماط الجدول الجاهزة:
              </div>

              {/* Word Table Style Previews */}
              <button
                type="button"
                onClick={() => handleApplyTableStyle('classic')}
                className="word-table-preset-btn"
                title="نمط وورد القياسي (Classic Grid)"
              >
                <div style={{ height: '6px', background: '#cbd5e1', borderRadius: '2px 2px 0 0' }} />
                <div style={{ height: '14px', background: '#ffffff', border: '1px solid #cbd5e1', borderTop: 'none', fontSize: '0.6rem', textAlign: 'center' }}>
                  كلاسيكي
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTableStyle('corporate-blue')}
                className="word-table-preset-btn"
                title="نمط أزرق مصرفي رسمي (Corporate Blue)"
              >
                <div style={{ height: '6px', background: '#0284c7', borderRadius: '2px 2px 0 0' }} />
                <div style={{ height: '14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderTop: 'none', fontSize: '0.6rem', textAlign: 'center', color: '#0369a1' }}>
                  أزرق بنكي
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTableStyle('zebra')}
                className="word-table-preset-btn"
                title="نمط مخطط Zebra احترافي"
              >
                <div style={{ height: '6px', background: '#334155', borderRadius: '2px 2px 0 0' }} />
                <div style={{ height: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderTop: 'none', fontSize: '0.6rem', textAlign: 'center' }}>
                  Zebra
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTableStyle('emerald')}
                className="word-table-preset-btn"
                title="نمط زمردي أنيق (Emerald Banking)"
              >
                <div style={{ height: '6px', background: '#059669', borderRadius: '2px 2px 0 0' }} />
                <div style={{ height: '14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderTop: 'none', fontSize: '0.6rem', textAlign: 'center', color: '#047857' }}>
                  زمردي
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTableStyle('minimal')}
                className="word-table-preset-btn"
                title="نمط خطوط أفقية ناعمة بدون حواف عمودية"
              >
                <div style={{ height: '3px', background: '#0f172a', margin: '2px 0' }} />
                <div style={{ height: '3px', background: '#cbd5e1', margin: '4px 0' }} />
                <span style={{ fontSize: '0.58rem', color: '#475569' }}>أفقي ناعم</span>
              </button>

              <div style={{ width: '1px', height: '24px', background: '#cbd5e1', margin: '0 4px' }} />

              {/* Table Borders Dropdown / Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>الحدود:</span>
                <button
                  type="button"
                  onClick={() => handleSetTableBorders('all')}
                  className="word-action-pill"
                  title="كافة الحدود (All Borders)"
                >
                  كاملة
                </button>
                <button
                  type="button"
                  onClick={() => handleSetTableBorders('outside')}
                  className="word-action-pill"
                  title="إطار خارجي فقط"
                >
                  إطار خارجي
                </button>
                <button
                  type="button"
                  onClick={() => handleSetTableBorders('horizontal')}
                  className="word-action-pill"
                  title="خطوط أفقية فقط"
                >
                  أفقية
                </button>
                <button
                  type="button"
                  onClick={() => handleSetTableBorders('none')}
                  className="word-action-pill"
                  title="بلا حدود"
                >
                  بلا حدود
                </button>
              </div>

              {/* Shading Palette */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>تظليل:</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {cellShadingColors.slice(0, 5).map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSetCellShading(c)}
                      style={{ width: '18px', height: '18px', borderRadius: '3px', background: c, border: '1px solid #cbd5e1', cursor: 'pointer' }}
                      title={`تظليل ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TABLE LAYOUT (أدوات الجدول - تخطيط) */}
          {activeRibbonTab === 'tableLayout' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap' }}>
              {/* Rows & Columns Group */}
              <div className="word-ribbon-group" title="صفوف وأعمدة">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleAddTableRow('above'); }}
                  className="word-action-pill"
                  title="إدراج صف لأعلى"
                >
                  <ArrowUp size={12} /> صف أعلى
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleAddTableRow('below'); }}
                  className="word-action-pill"
                  title="إدراج صف لأسفل"
                >
                  <ArrowDown size={12} /> صف أسفل
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleAddTableColumn('right'); }}
                  className="word-action-pill"
                  title="إدراج عمود لليمين"
                >
                  <Columns size={12} /> عمود يمين
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleAddTableColumn('left'); }}
                  className="word-action-pill"
                  title="إدراج عمود لليسار"
                >
                  <Columns size={12} /> عمود يسار
                </button>
              </div>

              {/* Merge & Split */}
              <div className="word-ribbon-group" title="دمج وتقسيم">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleMergeCell(); }}
                  className="word-action-pill"
                  title="دمج الخلية المحددة مع الخلية التالية"
                >
                  <Combine size={13} /> دمج خلايا
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSplitCell(); }}
                  className="word-action-pill"
                  title="تقسيم الخلية الحالية إلى خليتين"
                >
                  <Split size={13} /> تقسيم خلية
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleDistributeColumns(); }}
                  className="word-action-pill"
                  title="توزيع عرض الأعمدة بالتساوي"
                >
                  <Grid size={13} /> توزيع متساوي
                </button>
              </div>

              {/* Cell Alignment 3x3 */}
              <div className="word-ribbon-group" title="محاذاة الخلية">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSetCellAlignmentFull('top', 'right'); }}
                  className="word-btn"
                  style={{ fontSize: '0.65rem' }}
                  title="أعلى يمين"
                >
                  ↗
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSetCellAlignmentFull('middle', 'center'); }}
                  className="word-btn"
                  style={{ fontSize: '0.65rem', fontWeight: 'bold' }}
                  title="وسط وسط"
                >
                  •
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSetCellAlignmentFull('bottom', 'left'); }}
                  className="word-btn"
                  style={{ fontSize: '0.65rem' }}
                  title="أسفل يسار"
                >
                  ↙
                </button>
              </div>

              {/* Move & Delete */}
              <div className="word-ribbon-group" title="تحريك وحذف">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleMoveTableRow('up'); }}
                  className="word-btn"
                  title="تحريك الصف للأعلى (Alt+Shift+Up)"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleMoveTableRow('down'); }}
                  className="word-btn"
                  title="تحريك الصف للأسفل (Alt+Shift+Down)"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleDeleteTableRow(); }}
                  className="word-btn"
                  style={{ color: '#ef4444' }}
                  title="حذف هذا الصف"
                >
                  <Trash2 size={14} /> صف
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleDeleteTableColumn(); }}
                  className="word-btn"
                  style={{ color: '#ef4444' }}
                  title="حذف هذا العمود"
                >
                  <Trash2 size={14} /> عمود
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleDeleteTable(); }}
                  className="word-btn"
                  style={{ color: '#dc2626', fontWeight: 700 }}
                  title="حذف الجدول بالكامل"
                >
                  حذف الجدول
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          A4 PAPER CANVAS WITH FLUID MICROSOFT WORD EDITING
          ══════════════════════════════════════════════════════════════ */}
      <div
        className="word-scroll-viewport"
        style={{
          padding: '1rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          overflowY: 'auto',
          overflowX: 'auto',
          flex: 1,
          background: '#0b1329',
          position: 'relative'
        }}
        onClick={() => {
          setShowColorPicker(false);
          setShowHighlightPicker(false);
          setShowShadingPicker(false);
          setContextMenu(null);
        }}
      >
        {/* ── FLOATING MINI TABLE TOOLBAR (Appears directly above the active cell) ── */}
        {floatingBarPos && activeCell && (
          <div
            className="table-floating-quick-bar"
            style={{
              position: 'absolute',
              top: `${floatingBarPos.top}px`,
              left: `${floatingBarPos.left}px`,
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              zIndex: 40,
              fontSize: '0.74rem',
              userSelect: 'none'
            }}
          >
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleAddTableRow('above'); }}
              className="quick-bar-btn"
              title="إدراج صف لأعلى"
            >
              + صف أعلى
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleAddTableRow('below'); }}
              className="quick-bar-btn"
              title="إدراج صف لأسفل"
            >
              + صف أسفل
            </button>
            <span style={{ color: '#475569' }}>|</span>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleAddTableColumn('right'); }}
              className="quick-bar-btn"
              title="إدراج عمود يمين"
            >
              + عمود يمين
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleAddTableColumn('left'); }}
              className="quick-bar-btn"
              title="إدراج عمود يسار"
            >
              + عمود يسار
            </button>
            <span style={{ color: '#475569' }}>|</span>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleMoveTableRow('up'); }}
              className="quick-bar-btn"
              title="تحريك الصف للأعلى (Alt+Shift+Up)"
            >
              <ArrowUp size={13} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleMoveTableRow('down'); }}
              className="quick-bar-btn"
              title="تحريك الصف للأسفل (Alt+Shift+Down)"
            >
              <ArrowDown size={13} />
            </button>
            <span style={{ color: '#475569' }}>|</span>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleDeleteTableRow(); }}
              className="quick-bar-btn"
              style={{ color: '#f87171' }}
              title="حذف هذا الصف"
            >
              <Trash2 size={13} /> صف
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleDeleteTableColumn(); }}
              className="quick-bar-btn"
              style={{ color: '#f87171' }}
              title="حذف هذا العمود"
            >
              <Trash2 size={13} /> عمود
            </button>
          </div>
        )}

        {/* ── RIGHT-CLICK CONTEXT MENU (Microsoft Word Style) ── */}
        {contextMenu && (
          <div
            className="word-context-menu"
            style={{
              position: 'fixed',
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '4px 0',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              zIndex: 9999,
              minWidth: '190px',
              color: '#1e293b',
              fontSize: '0.8rem',
              direction: 'rtl',
              userSelect: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '5px 12px', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
              خيارات الجدول (Table Options)
            </div>
            
            <div className="ctx-item" onClick={() => { handleAddTableRow('above'); setContextMenu(null); }}>
              <span>إدراج صف لأعلى</span>
            </div>
            <div className="ctx-item" onClick={() => { handleAddTableRow('below'); setContextMenu(null); }}>
              <span>إدراج صف لأسفل</span>
            </div>
            <div className="ctx-item" onClick={() => { handleAddTableColumn('right'); setContextMenu(null); }}>
              <span>إدراج عمود لليمين</span>
            </div>
            <div className="ctx-item" onClick={() => { handleAddTableColumn('left'); setContextMenu(null); }}>
              <span>إدراج عمود لليسار</span>
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
            <div className="ctx-item" onClick={() => { handleMoveTableRow('up'); setContextMenu(null); }}>
              <span>تحريك الصف للأعلى ⬆️</span>
            </div>
            <div className="ctx-item" onClick={() => { handleMoveTableRow('down'); setContextMenu(null); }}>
              <span>تحريك الصف للأسفل ⬇️</span>
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
            <div style={{ padding: '6px 12px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '5px' }}>تظليل خلفية الخلية:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 22px)', gap: '4px' }}>
                {cellShadingColors.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { handleSetCellShading(c); setContextMenu(null); }}
                    style={{ width: '22px', height: '22px', borderRadius: '3px', background: c, border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    title={c}
                  />
                ))}
              </div>
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
            <div className="ctx-item ctx-danger" onClick={() => { handleDeleteTableRow(); setContextMenu(null); }}>
              <span>حذف الصف الحالي</span>
            </div>
            <div className="ctx-item ctx-danger" onClick={() => { handleDeleteTableColumn(); setContextMenu(null); }}>
              <span>حذف العمود الحالي</span>
            </div>
            <div className="ctx-item ctx-danger" onClick={() => { handleDeleteTable(); setContextMenu(null); }}>
              <span>حذف الجدول بالكامل</span>
            </div>
          </div>
        )}

        {/* ── ON-TABLE MOVE & RESIZE HANDLES (Microsoft Word Table Handles) ── */}
        {tableHandlePos && activeTable && (
          <>
            {/* Top Move Handle [+] (Word Table Selector) */}
            <button
              type="button"
              className="word-table-move-handle"
              style={{
                position: 'absolute',
                top: `${tableHandlePos.top}px`,
                right: `${Math.max(10, tableHandlePos.right - 24)}px`,
                width: '22px',
                height: '22px',
                background: '#0284c7',
                color: '#ffffff',
                border: '1px solid #0369a1',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'move',
                zIndex: 45,
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                if (activeTable) {
                  const range = document.createRange();
                  range.selectNode(activeTable);
                  const sel = window.getSelection();
                  sel?.removeAllRanges();
                  sel?.addRange(range);
                }
              }}
              title="تحديد أو نسخ الجدول بالكامل (Word Table Selector)"
            >
              <Move size={13} />
            </button>

            {/* Bottom-left Resize Handle [▫] */}
            <div
              className="word-table-resize-handle"
              style={{
                position: 'absolute',
                top: `${tableHandlePos.bottom - 4}px`,
                left: `${tableHandlePos.left - 4}px`,
                width: '10px',
                height: '10px',
                background: '#ffffff',
                border: '2px solid #0284c7',
                borderRadius: '2px',
                cursor: 'nwse-resize',
                zIndex: 45
              }}
              title="سحب لتغيير عرض الجدول"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startW = activeTable.offsetWidth;
                const onMouseMove = (moveEv: MouseEvent) => {
                  const delta = moveEv.clientX - startX;
                  const newW = Math.max(260, startW - delta);
                  activeTable.style.width = `${newW}px`;
                };
                const onMouseUp = () => {
                  window.removeEventListener('mousemove', onMouseMove);
                  window.removeEventListener('mouseup', onMouseUp);
                  syncToMarkdown();
                };
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
              }}
            />
          </>
        )}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onInput={syncToMarkdown}
          onKeyUp={checkActiveElement}
          onMouseUp={checkActiveElement}
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            const th = target.closest('th');
            if (th) {
              const rect = th.getBoundingClientRect();
              const isNearLeft = Math.abs(e.clientX - rect.left) <= 8;
              const isNearRight = Math.abs(e.clientX - rect.right) <= 8;
              if (isNearLeft || isNearRight) {
                e.preventDefault();
                const startX = e.clientX;
                const startW = th.offsetWidth;
                const onMouseMove = (mv: MouseEvent) => {
                  const delta = mv.clientX - startX;
                  const newW = Math.max(45, startW - delta);
                  th.style.width = `${newW}px`;
                  th.style.minWidth = `${newW}px`;
                };
                const onMouseUp = () => {
                  window.removeEventListener('mousemove', onMouseMove);
                  window.removeEventListener('mouseup', onMouseUp);
                  syncToMarkdown();
                };
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
              }
            }
          }}
          onKeyDown={handleKeyDown}
          onContextMenu={handleContextMenu}
          dir="auto"
          className={`pdf-document-body dynamic-word-canvas fluid-word-sheet ${className || ''}`}
          style={{
            background: pageBgColor,
            minHeight: '1050px',
            width: '100%',
            maxWidth: '850px',
            margin: '0 auto',
            padding: '2.5rem 2.5rem',
            boxSizing: 'border-box',
            boxShadow: '0 4px 25px rgba(0,0,0,0.3)',
            borderRadius: '4px',
            zoom: zoomLevel !== 100 ? `${zoomLevel}%` : undefined,
            color: '#1e293b',
            outline: 'none',
            fontSize: '0.96rem',
            lineHeight: 1.7,
            wordBreak: 'break-word',
            textAlign: 'start'
          }}
        />

        <style>{`
          /* ── WORD RIBBON TABS ── */
          .word-tab-nav-btn {
            background: transparent;
            border: none;
            border-bottom: 2px solid transparent;
            padding: 0.35rem 0.75rem;
            font-size: 0.76rem;
            color: #475569;
            cursor: pointer;
            transition: all 0.12s ease;
          }
          .word-tab-nav-btn:hover {
            color: #0f172a;
            background: rgba(0, 0, 0, 0.03);
          }
          .word-tab-nav-btn.active {
            color: #0284c7;
            font-weight: 700;
            border-bottom: 2px solid #0284c7;
            background: #ffffff;
          }
          .word-tab-contextual {
            color: #0369a1 !important;
            font-weight: 700;
            border-radius: 3px 3px 0 0;
          }
          .word-tab-contextual.active {
            background: #ffffff !important;
            border-bottom: 2px solid #0284c7 !important;
          }
          .word-ribbon-group {
            display: flex;
            align-items: center;
            gap: 0.2rem;
            border-inline-end: 1px solid #cbd5e1;
            padding-inline-end: 0.5rem;
          }
          .word-style-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3px 8px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            cursor: pointer;
            min-width: 60px;
            height: 38px;
            transition: all 0.15s ease;
          }
          .word-style-card:hover {
            border-color: #0284c7;
            box-shadow: 0 2px 6px rgba(2, 132, 199, 0.15);
            background: #f0f9ff;
          }
          .word-table-preset-btn {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 2px 4px;
            cursor: pointer;
            width: 58px;
            height: 34px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            transition: all 0.15s ease;
          }
          .word-table-preset-btn:hover {
            border-color: #0284c7;
            transform: scale(1.03);
          }
          .word-dropdown-palette {
            position: absolute;
            top: 100%;
            left: 0;
            margin-top: 4px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px;
            display: grid;
            grid-template-columns: repeat(4, 20px);
            gap: 4px;
            z-index: 50;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .word-table-move-handle:hover {
            transform: scale(1.1);
          }
          .word-table-resize-handle:hover {
            background: #0284c7 !important;
          }
          .word-btn {
            background: transparent;
            border: 1px solid transparent;
            border-radius: 4px;
            padding: 0.3rem 0.45rem;
            cursor: pointer;
            color: #475569;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
          }
          .word-btn:hover {
            background: #e2e8f0;
            color: #0f172a;
            border-color: #cbd5e1;
          }
          .word-action-pill {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 0.25rem 0.55rem;
            font-size: 0.74rem;
            font-weight: 700;
            color: #334155;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            transition: all 0.15s ease;
          }
          .word-action-pill:hover {
            background: #f1f5f9;
            border-color: #94a3b8;
            color: #0f172a;
          }
          /* ── TABLE FLOATING QUICK BAR ── */
          .table-floating-quick-bar {
            animation: fadeInQuickBar 0.15s ease-out;
          }
          @keyframes fadeInQuickBar {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .quick-bar-btn {
            background: transparent;
            border: 1px solid transparent;
            border-radius: 3px;
            padding: 3px 6px;
            font-size: 0.72rem;
            font-weight: 600;
            color: #f1f5f9;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 3px;
            transition: all 0.12s ease;
            white-space: nowrap;
          }
          .quick-bar-btn:hover {
            background: #334155;
            color: #ffffff;
            border-color: #475569;
          }
          /* ── WORD CONTEXT MENU ── */
          .word-context-menu {
            animation: fadeInMenu 0.12s ease-out;
            font-family: inherit;
          }
          @keyframes fadeInMenu {
            from { opacity: 0; transform: scale(0.96); }
            to { opacity: 1; transform: scale(1); }
          }
          .ctx-item {
            padding: 7px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            transition: background 0.1s ease;
            font-size: 0.8rem;
            color: #334155;
          }
          .ctx-item:hover {
            background: #f1f5f9;
            color: #0f172a;
          }
          .ctx-item.ctx-danger {
            color: #dc2626;
          }
          .ctx-item.ctx-danger:hover {
            background: #fef2f2;
            color: #b91c1c;
          }
          .fluid-word-sheet h1 {
            font-size: 1.7rem;
            font-weight: 800;
            color: #0f172a;
            margin: 1.2rem 0 0.8rem 0;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 0.4rem;
          }
          .fluid-word-sheet h2 {
            font-size: 1.35rem;
            font-weight: 700;
            color: #1e293b;
            margin: 1.2rem 0 0.6rem 0;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 0.3rem;
          }
          .fluid-word-sheet h3 {
            font-size: 1.1rem;
            font-weight: 700;
            color: #334155;
            margin: 1rem 0 0.4rem 0;
          }
          .fluid-word-sheet p {
            margin: 0.6rem 0;
            color: #334155;
          }
          .fluid-word-sheet blockquote {
            border-left: 4px solid #0284c7;
            padding: 0.5rem 1rem;
            margin: 0.8rem 0;
            background: #f0f9ff;
            border-radius: 0 4px 4px 0;
            color: #0369a1;
          }
          .fluid-word-sheet hr {
            border: none;
            border-top: 1px solid #cbd5e1;
            margin: 1.5rem 0;
          }
          .fluid-word-sheet pre {
            background: #1e293b;
            color: #e2e8f0;
            padding: 0.8rem 1rem;
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.85rem;
            overflow-x: auto;
            margin: 0.8rem 0;
          }
          /* ── PRISTINE CORPORATE MICROSOFT WORD TABLE STYLES ── */
          .fluid-word-sheet table {
            width: 100%;
            border-collapse: collapse !important;
            margin: 1.25rem 0;
            font-size: 0.88rem;
            border: 1px solid #cbd5e1;
            table-layout: auto;
            border-spacing: 0 !important;
          }
          .fluid-word-sheet thead {
            border-bottom: 2px solid #94a3b8;
          }
          .fluid-word-sheet th {
            background: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 700;
            padding: 0.65rem 0.85rem;
            border: 1px solid #cbd5e1 !important;
            text-align: inherit;
            vertical-align: middle;
          }
          .fluid-word-sheet tr {
            background: #ffffff;
            border: none !important;
          }
          .fluid-word-sheet td {
            padding: 0.6rem 0.85rem;
            border: 1px solid #cbd5e1 !important;
            color: #334155;
            vertical-align: top;
            line-height: 1.6;
          }
          .fluid-word-sheet tbody tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          .fluid-word-sheet tbody tr:hover td {
            background-color: #f1f5f9;
          }
          .fluid-word-sheet td:focus,
          .fluid-word-sheet th:focus {
            outline: 2px solid #0284c7 !important;
            background-color: rgba(2, 132, 199, 0.08) !important;
          }
          .fluid-word-sheet ul, .fluid-word-sheet ol {
            padding-left: 1.5rem;
            margin: 0.6rem 0;
          }
          .fluid-word-sheet li {
            margin: 0.25rem 0;
          }
        `}</style>
      </div>
    </div>
  );
};
