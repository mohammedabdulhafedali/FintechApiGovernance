import { IFormatAdapter } from './IFormatAdapter';
import { UastDocument, IUastNode, NodeKind, DataType, SecurityLevel } from '../types';
import { RawJsonAdapter } from './RawJsonAdapter';

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
    // 1. Extract JSON code block if exists
    let extractedJson: any = null;
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        extractedJson = JSON.parse(jsonMatch[1]);
      } catch {
        // Not valid JSON in code block, fallback to table parsing
      }
    }

    // 2. Extract Table definitions
    const tableRows = this.extractTableRows(rawContent);

    let baseDoc: UastDocument;
    if (extractedJson) {
      baseDoc = this.rawJsonAdapter.parseToAst(JSON.stringify(extractedJson), defaultMeta);
    } else {
      // Build AST directly from Markdown table rows
      baseDoc = this.buildAstFromTableRows(tableRows, defaultMeta);
    }

    // 3. Enrich existing AST with descriptions/constraints from table
    if (tableRows.length > 0 && extractedJson) {
      this.enrichNodesFromTable(baseDoc.requestTree, tableRows);
    }

    // Extract title from first H1 or H2
    const titleMatch = rawContent.match(/^#+\s+(.+)$/m);
    if (titleMatch && titleMatch[1]) {
      baseDoc.serviceName = titleMatch[1].trim();
      baseDoc.serviceNameEn = titleMatch[1].trim();
    }

    baseDoc.rawSource = rawContent;
    baseDoc.rawFormat = 'markdown';
    return baseDoc;
  }

  private extractTableRows(md: string): Array<{ name: string; type: string; req: boolean; desc: string }> {
    const lines = md.split('\n');
    const rows: Array<{ name: string; type: string; req: boolean; desc: string }> = [];

    let inTable = false;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        if (line.includes('---')) {
          inTable = true;
          continue;
        }
        if (inTable) {
          const cells = line.split('|').map(c => c.trim()).filter(Boolean);
          if (cells.length >= 2) {
            const name = cells[0].replace(/[`*]/g, '');
            const typeOrReq = cells[1] || 'String';
            const req = cells.some(c => /إجباري|نعم|required|true/i.test(c));
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

  private buildAstFromTableRows(rows: Array<{ name: string; type: string; req: boolean; desc: string }>, defaultMeta?: Partial<UastDocument>): UastDocument {
    const children: IUastNode[] = [];
    let order = 1;

    for (const r of rows) {
      let dataType: DataType = 'STRING';
      const t = r.type.toLowerCase();
      if (t.includes('num') || t.includes('int') || t.includes('رقم')) dataType = 'NUMBER';
      else if (t.includes('dec') || t.includes('مبلغ') || t.includes('float')) dataType = 'DECIMAL';
      else if (t.includes('bool') || t.includes('منطقي')) dataType = 'BOOLEAN';
      else if (t.includes('uuid')) dataType = 'UUID';
      else if (t.includes('date') || t.includes('تاريخ')) dataType = 'DATE';

      let securityLevel: SecurityLevel = 'PUBLIC';
      if (/iban|account|pan|pin|token|auth/i.test(r.name)) {
        securityLevel = 'CONFIDENTIAL_MASKED';
      }

      children.push({
        nodeId: `node_${r.name}_${Math.random().toString(36).substring(2, 6)}`,
        structure: { kind: 'FIELD', path: `$.${r.name}`, order: order++ },
        semantics: {
          name: r.name,
          dataType,
          description: r.desc || `حقل ${r.name}`,
          descriptionEn: `Field: ${r.name}`
        },
        constraints: { required: r.req },
        governance: {
          securityLevel,
          exampleValue: dataType === 'NUMBER' ? 100 : 'SampleValue',
          reviewStatus: 'DRAFT',
          addedInVersion: '1.0.0'
        },
        children: []
      });
    }

    const rootNode: IUastNode = {
      nodeId: 'root_md_payload',
      structure: { kind: 'OBJECT', path: '$', order: 1, isCollapsible: true, isExpanded: true },
      semantics: { name: 'Payload', dataType: 'OBJECT', description: 'Request payload extracted from Markdown table' },
      constraints: { required: true },
      governance: { securityLevel: 'PUBLIC', reviewStatus: 'DRAFT' },
      children
    };

    return {
      documentId: defaultMeta?.documentId || `doc_md_${Date.now()}`,
      serviceCode: defaultMeta?.serviceCode || 'SVC_MARKDOWN_DOC',
      serviceName: defaultMeta?.serviceName || 'خدمة موثقة عبر Markdown',
      serviceNameEn: defaultMeta?.serviceNameEn || 'Markdown Documented Service',
      semver: '1.0.0',
      lifecycleStage: 'ACTIVE',
      channel: {
        protocol: 'REST',
        method: 'POST',
        endpointPath: '/api/v1/documented/service',
        environments: {
          sandbox: 'https://sandbox.api.gov.fintech',
          production: 'https://api.gov.fintech'
        }
      },
      headers: [
        {
          nodeId: 'h_auth_md',
          structure: { kind: 'HEADER', path: '$.headers.Authorization', order: 1 },
          semantics: { name: 'Authorization', dataType: 'STRING', description: 'Bearer Token' },
          constraints: { required: true },
          governance: { securityLevel: 'CONFIDENTIAL_MASKED', exampleValue: 'Bearer eyJhbGci...', reviewStatus: 'APPROVED' },
          children: []
        }
      ],
      requestTree: rootNode,
      errorCodes: [
        { code: 'VALIDATION_FAILED_422', message: 'مواصفة الحقل غير مطابقة للشروط الموثقة في جدول الماركداون', action: 'مراجعة جدول الحقول' }
      ],
      rawSource: '',
      rawFormat: 'markdown',
      updatedAt: new Date().toISOString(),
      status: defaultMeta?.status || 'PRIVATE_DRAFT'
    };
  }

  private enrichNodesFromTable(node: IUastNode, rows: Array<{ name: string; type: string; req: boolean; desc: string }>) {
    const match = rows.find(r => r.name.toLowerCase() === node.semantics.name.toLowerCase());
    if (match) {
      if (match.desc) node.semantics.description = match.desc;
      node.constraints.required = match.req;
    }
    for (const child of node.children) {
      this.enrichNodesFromTable(child, rows);
    }
  }
}
