import { IFormatAdapter } from './IFormatAdapter';
import { UastDocument, IUastNode, DataType, SecurityLevel, AllEndpointEntry, ImportedHeader } from '../types';
import { RawJsonAdapter } from './RawJsonAdapter';
import { HttpMethod } from '../../../types/schema';

export class MarkdownAdapter implements IFormatAdapter {
  readonly adapterName = 'MarkdownAdapter';
  readonly supportedFormats = ['markdown', 'md'];
  private rawJsonAdapter = new RawJsonAdapter();

  canHandle(formatHint: string, rawContent: string): boolean {
    const hint = formatHint.toLowerCase();
    if (hint === 'markdown' || hint === 'md') return true;
    const trimmed = rawContent.trim();
    return trimmed.includes('##') ||
           trimmed.includes('|---') ||
           trimmed.includes('| ---') ||
           trimmed.includes('```');
  }

  parseToAst(rawContent: string, defaultMeta?: Partial<UastDocument>): UastDocument {
    // 1. Extract metadata
    const titleMatch = rawContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : (defaultMeta?.serviceName || 'API Documentation');

    const baseUrlMatch = rawContent.match(/```(?:http|text|url)?\s*\n(https?:\/\/[^\n]+)/m);
    const baseUrl = baseUrlMatch ? baseUrlMatch[1].trim() : undefined;

    // 2. Extract all endpoints (sections with endpoint info)
    const allEndpoints = this.extractAllEndpoints(rawContent);

    // 3. Extract imported headers from the dedicated headers table
    const importedHeaders = this.extractHeaders(rawContent);

    // 4. Extract error codes from error tables
    const errorCodes = this.extractErrorCodes(rawContent);

    // 5. Extract overview
    const overviewMatch = rawContent.match(/##\s+Overview[\s\S]*?\n([\s\S]+?)(?=\n##|\n---)/);
    const overviewText = overviewMatch ? overviewMatch[1].replace(/\n+/g, ' ').trim() : undefined;

    // 6. Build primary endpoint (first one found)
    const primary = allEndpoints[0] || null;

    // 7. Build requestTree from primary endpoint fields
    let requestTree: IUastNode;
    if (primary && primary.requestFields && primary.requestFields.length > 0) {
      requestTree = this.buildTreeFromFields(primary.requestFields);
    } else {
      // Fallback: extract from first generic markdown table
      const tableRows = this.extractTableRows(rawContent);
      requestTree = this.buildTreeFromTableRows(tableRows);
    }

    // 8. Build header nodes from importedHeaders
    const headerNodes: IUastNode[] = importedHeaders.map((h, i) => ({
      nodeId: `h_${h.name}_${i}`,
      structure: { kind: 'HEADER' as const, path: `$.headers.${h.name}`, order: i + 1 },
      semantics: {
        name: h.name,
        dataType: 'STRING' as DataType,
        description: h.description,
        descriptionEn: h.description
      },
      constraints: { required: h.required },
      governance: {
        securityLevel: /sign|secret|key|auth|nonce/i.test(h.name) ? 'CONFIDENTIAL_MASKED' as SecurityLevel : 'PUBLIC' as SecurityLevel,
        exampleValue: h.example || undefined,
        reviewStatus: 'APPROVED' as const
      },
      children: []
    }));

    // Fallback header if none extracted
    if (headerNodes.length === 0) {
      headerNodes.push({
        nodeId: 'h_auth_md',
        structure: { kind: 'HEADER', path: '$.headers.Authorization', order: 1 },
        semantics: { name: 'Authorization', dataType: 'STRING', description: 'Bearer Token' },
        constraints: { required: true },
        governance: { securityLevel: 'CONFIDENTIAL_MASKED', exampleValue: 'Bearer eyJhbGci...', reviewStatus: 'APPROVED' },
        children: []
      });
    }

    const serviceCode = defaultMeta?.serviceCode ||
      (title.toUpperCase().replace(/[^A-Z0-9_]/g, '_').replace(/^_+|_+$/g, '').substring(0, 30)) ||
      'SVC_MARKDOWN_DOC';

    const endpointPath = primary?.path || '/api/v1/service';
    const method = primary?.method || 'POST';

    return {
      documentId: defaultMeta?.documentId || `doc_md_${Date.now()}`,
      serviceCode,
      serviceName: title,
      serviceNameEn: title,
      semver: '1.0.0',
      lifecycleStage: 'ACTIVE',
      channel: {
        protocol: 'REST',
        method,
        endpointPath,
        environments: {
          sandbox: baseUrl ? baseUrl.replace('test.', 'sandbox.') : 'https://sandbox.api.gov.fintech',
          production: baseUrl || 'https://api.gov.fintech'
        }
      },
      headers: headerNodes,
      requestTree,
      errorCodes,
      rawSource: rawContent,
      rawFormat: 'markdown',
      updatedAt: new Date().toISOString(),
      status: defaultMeta?.status || 'PRIVATE_DRAFT',
      // Extended fields
      allEndpoints,
      importedHeaders,
      baseUrl,
      overviewText
    };
  }

  // ── Helper: Robust table parser handling blank lines and pipes ──
  private parseTableLines(lines: string[]): { headers: string[]; rows: string[][] } {
    const nonSep = lines.filter(l => !/^[|\s:-]+$/.test(l));
    if (nonSep.length === 0) return { headers: [], rows: [] };
    const parseRow = (line: string) => 
      line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    const headers = parseRow(nonSep[0]);
    const rows = nonSep.slice(1).map(parseRow);
    return { headers, rows };
  }

  private extractTables(text: string): Array<{ headers: string[]; rows: string[][] }> {
    const lines = text.split('\n').map(l => l.trim());
    const tables: Array<{ headers: string[]; rows: string[][] }> = [];
    let currentTableLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('|') && line.endsWith('|')) {
        currentTableLines.push(line);
      } else if (line === '' && currentTableLines.length > 0) {
        // Look ahead to check if the table continues after blank line
        let hasMore = false;
        for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
          if (lines[j].startsWith('|') && lines[j].endsWith('|')) {
            hasMore = true;
            break;
          } else if (lines[j] !== '') {
            break;
          }
        }
        if (!hasMore) {
          if (currentTableLines.length >= 2) tables.push(this.parseTableLines(currentTableLines));
          currentTableLines = [];
        }
      } else {
        if (currentTableLines.length >= 2) tables.push(this.parseTableLines(currentTableLines));
        currentTableLines = [];
      }
    }
    if (currentTableLines.length >= 2) tables.push(this.parseTableLines(currentTableLines));
    return tables;
  }

  // ── Extract all API endpoints from Markdown sections ──
  private extractAllEndpoints(md: string): AllEndpointEntry[] {
    const endpoints: AllEndpointEntry[] = [];
    const endpointRegex = /(?:\*\*Endpoint\*\*\s*[:：]\s*)?`?(GET|POST|PUT|DELETE|PATCH)\s+([/][^\s`\n]+)`?/i;

    // Split into sections by H2/H3 headings (keeping H4 subheadings like Request/Response tables inside)
    const sections = md.split(/\n(?=#{2,3}\s)/);

    for (const section of sections) {
      const headingMatch = section.match(/^#{2,3}\s+(.+)$/m);
      const heading = headingMatch ? headingMatch[1].trim() : '';
      const epMatch = section.match(endpointRegex);

      if (epMatch && epMatch[1] && epMatch[2]) {
        const method = epMatch[1].toUpperCase() as HttpMethod;
        const path = epMatch[2].replace(/[`*]/g, '');

        const tables = this.extractTables(section);
        let requestFields: AllEndpointEntry['requestFields'] = [];
        let responseFields: AllEndpointEntry['responseFields'] = [];

        for (const t of tables) {
          const headerStr = t.headers.join(' ').toLowerCase();
          if (/field|param|name/i.test(headerStr)) {
            if (requestFields.length === 0) {
              requestFields = t.rows.map(r => {
                const name = (r[0] || '').replace(/[`*]/g, '').trim();
                const type = (r[1] || 'string').replace(/[`*]/g, '').trim();
                const length = r.length >= 3 ? (r[2] || '').replace(/[`*]/g, '').trim() : undefined;
                const req = r.some(c => /mandatory|required|إجباري|must/i.test(c));
                const desc = (r[r.length - 1] || '').replace(/[`*]/g, '').trim();
                const exampleMatch = desc.match(/`([^`]+)`/) || desc.match(/"([^"]+)"/);
                const example = exampleMatch ? exampleMatch[1] : undefined;
                return { name, type, length, required: req, description: desc, example };
              }).filter(f => f.name && f.name !== 'Field Name' && !f.name.startsWith('---'));
            } else if (responseFields.length === 0) {
              responseFields = t.rows.map(r => {
                const name = (r[0] || '').replace(/[`*]/g, '').trim();
                const type = (r[1] || 'string').replace(/[`*]/g, '').trim();
                const desc = (r[r.length - 1] || '').replace(/[`*]/g, '').trim();
                return { name, type, description: desc };
              }).filter(f => f.name && f.name !== 'Field Name' && !f.name.startsWith('---'));
            }
          }
        }

        // Code examples extraction
        const codeBlocks = [...section.matchAll(/```([a-zA-Z0-9_-]*)\s*\n([\s\S]*?)\n```/g)];
        let requestExample: string | undefined;
        let responseExample: string | undefined;

        for (const block of codeBlocks) {
          const lang = block[1].toLowerCase();
          const code = block[2].trim();
          if ((lang === 'json' || code.startsWith('{')) && code.includes('"status"')) {
            try {
              JSON.parse(code);
              responseExample = code;
            } catch { /* ignore */ }
          }
          if (code.includes('payload') && code.includes('{')) {
            const jsonMatch = code.match(/\{[\s\S]+\}/);
            if (jsonMatch) {
              try {
                const cleaned = jsonMatch[0]
                  .replace(/'/g, '"')
                  .replace(/True/g, 'true')
                  .replace(/False/g, 'false')
                  .replace(/None/g, 'null');
                JSON.parse(cleaned);
                requestExample = cleaned;
              } catch { /* ignore */ }
            }
          }
        }

        const summary = heading.replace(/^[\d.]+\s*/, '') || path;

        endpoints.push({
          method,
          path,
          summary,
          description: heading,
          requestFields,
          responseFields,
          requestExample,
          responseExample
        });
      }
    }

    return endpoints;
  }

  // ── Extract Required Headers from dedicated header table ──
  private extractHeaders(md: string): ImportedHeader[] {
    const allTables = this.extractTables(md);
    let importedHeaders: ImportedHeader[] = [];

    for (const t of allTables) {
      if (t.headers.some(h => /header/i.test(h))) {
        importedHeaders = t.rows.map(r => ({
          name: (r[0] || '').replace(/[`*]/g, '').trim(),
          description: (r[1] || '').replace(/[`*]/g, '').trim(),
          example: (r[2] || '').replace(/[`*]/g, '').trim() || undefined,
          required: true
        })).filter(h => h.name && !h.name.startsWith('---') && h.name !== 'Header Name');
        break;
      }
    }

    return importedHeaders;
  }

  // ── Extract error codes from error tables ──
  private extractErrorCodes(md: string): Array<{ code: string; message: string; action: string }> {
    const allTables = this.extractTables(md);
    const errors: Array<{ code: string; message: string; action: string }> = [];

    for (const t of allTables) {
      const headerStr = t.headers.join(' ').toLowerCase();
      if (headerStr.includes('error') && (headerStr.includes('code') || headerStr.includes('status'))) {
        for (const r of t.rows) {
          const httpStatus = (r[0] || '').replace(/[`*]/g, '').trim();
          const code = (r[1] || '').replace(/[`*]/g, '').trim();
          const msg = (r[2] || '').replace(/[`*]/g, '').trim();

          if (msg && !code.includes('---')) {
            errors.push({
              code: `HTTP_${httpStatus}_ERR_${code}`,
              message: msg,
              action: httpStatus === '401' ? 'التحقق من مفاتيح التوثيق والتوقيع' :
                      httpStatus === '400' ? 'مراجعة بيانات الطلب والحقول المطلوبة' :
                      httpStatus === '404' ? 'التحقق من صحة المعرفات والمسارات' :
                      'مراجعة سجلات الخادم وإعادة المحاولة'
            });
          }
        }
        break;
      }
    }

    // Fallback if none found
    if (errors.length === 0) {
      errors.push({
        code: 'VALIDATION_FAILED_422',
        message: 'مواصفة الحقل غير مطابقة للشروط الموثقة',
        action: 'مراجعة جدول الحقول'
      });
    }

    return errors;
  }

  // ── Build UAST tree from request fields ──
  private buildTreeFromFields(fields: Array<{ name: string; type: string; required: boolean; description?: string; example?: string; length?: string }>): IUastNode {
    const children: IUastNode[] = fields.map((f, i) => {
      let dataType: DataType = 'STRING';
      const t = f.type.toLowerCase();
      if (t.includes('int') || t.includes('num')) dataType = 'NUMBER';
      else if (t.includes('double') || t.includes('float') || t.includes('dec')) dataType = 'DECIMAL';
      else if (t.includes('bool')) dataType = 'BOOLEAN';
      else if (t.includes('uuid')) dataType = 'UUID';
      else if (t.includes('date')) dataType = 'DATE';

      const isConfidential = /iban|account|pan|pin|token|auth|sign|nonce|secret/i.test(f.name);

      return {
        nodeId: `node_${f.name}_${i}`,
        structure: {
          kind: 'FIELD' as const,
          path: `$.${f.name}`,
          order: i + 1,
          isLeaf: true
        },
        semantics: {
          name: f.name,
          dataType,
          description: f.description || `حقل ${f.name}`,
          descriptionEn: f.description || `Field: ${f.name}`
        },
        constraints: {
          required: f.required,
          maxLength: f.length ? parseInt(f.length.replace(/\D/g, '')) || undefined : undefined
        },
        governance: {
          securityLevel: isConfidential ? 'CONFIDENTIAL_MASKED' as SecurityLevel : 'PUBLIC' as SecurityLevel,
          exampleValue: f.example || (dataType === 'NUMBER' ? 100 : dataType === 'DECIMAL' ? 550.00 : undefined),
          reviewStatus: 'DRAFT' as const,
          addedInVersion: '1.0.0'
        },
        children: []
      };
    });

    return {
      nodeId: 'root_md_payload',
      structure: { kind: 'OBJECT', path: '$', order: 1, isCollapsible: true, isExpanded: true },
      semantics: { name: 'Payload', dataType: 'OBJECT', description: 'Request payload' },
      constraints: { required: true },
      governance: { securityLevel: 'PUBLIC', reviewStatus: 'DRAFT' },
      children
    };
  }

  // ── Fallback: build tree from generic markdown table rows ──
  private buildTreeFromTableRows(rows: Array<{ name: string; type: string; req: boolean; desc: string }>): IUastNode {
    const children: IUastNode[] = rows.map((r, i) => {
      let dataType: DataType = 'STRING';
      const t = r.type.toLowerCase();
      if (t.includes('num') || t.includes('int') || t.includes('رقم')) dataType = 'NUMBER';
      else if (t.includes('dec') || t.includes('double') || t.includes('float')) dataType = 'DECIMAL';
      else if (t.includes('bool') || t.includes('منطقي')) dataType = 'BOOLEAN';
      else if (t.includes('uuid')) dataType = 'UUID';
      else if (t.includes('date') || t.includes('تاريخ')) dataType = 'DATE';

      const isConfidential = /iban|account|pan|pin|token|auth/i.test(r.name);

      return {
        nodeId: `node_${r.name}_${Math.random().toString(36).substring(2, 6)}`,
        structure: { kind: 'FIELD' as const, path: `$.${r.name}`, order: i + 1 },
        semantics: { name: r.name, dataType, description: r.desc || `حقل ${r.name}`, descriptionEn: `Field: ${r.name}` },
        constraints: { required: r.req },
        governance: {
          securityLevel: isConfidential ? 'CONFIDENTIAL_MASKED' as SecurityLevel : 'PUBLIC' as SecurityLevel,
          exampleValue: dataType === 'NUMBER' ? 100 : undefined,
          reviewStatus: 'DRAFT' as const,
          addedInVersion: '1.0.0'
        },
        children: []
      };
    });

    return {
      nodeId: 'root_md_payload',
      structure: { kind: 'OBJECT', path: '$', order: 1, isCollapsible: true, isExpanded: true },
      semantics: { name: 'Payload', dataType: 'OBJECT', description: 'Request payload extracted from Markdown table' },
      constraints: { required: true },
      governance: { securityLevel: 'PUBLIC', reviewStatus: 'DRAFT' },
      children
    };
  }

  // ── Generic table row extractor (fallback) ──
  private extractTableRows(md: string): Array<{ name: string; type: string; req: boolean; desc: string }> {
    const lines = md.split('\n');
    const rows: Array<{ name: string; type: string; req: boolean; desc: string }> = [];
    let inTable = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        if (line.includes('---')) { inTable = true; continue; }
        if (inTable) {
          const cells = line.split('|').map(c => c.trim()).filter(Boolean);
          if (cells.length >= 2) {
            const name = cells[0].replace(/[`*]/g, '');
            const typeOrReq = cells[1] || 'String';
            const req = cells.some(c => /إجباري|must|required|true/i.test(c));
            const desc = cells[cells.length - 1] || '';
            rows.push({ name, type: typeOrReq, req, desc });
          }
        }
      } else {
        inTable = false;
      }
    }
    return rows;
  }
}
