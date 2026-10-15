import { IFormatAdapter } from './IFormatAdapter';
import { UastDocument, IUastNode, HttpMethod, AllEndpointEntry } from '../types';
import { RawJsonAdapter } from './RawJsonAdapter';

export class PostmanJsonAdapter implements IFormatAdapter {
  readonly adapterName = 'PostmanJsonAdapter';
  readonly supportedFormats = ['postman', 'postman-collection'];
  private rawJsonAdapter = new RawJsonAdapter();

  canHandle(formatHint: string, rawContent: string): boolean {
    const hint = formatHint.toLowerCase();
    if (hint === 'postman' || hint === 'postman-collection') return true;
    return rawContent.includes('_postman_id') || 
           rawContent.includes('schema.getpostman.com') ||
           (rawContent.includes('"item"') && rawContent.includes('"request"'));
  }

  parseToAst(rawContent: string, defaultMeta?: Partial<UastDocument>): UastDocument {
    let postmanObj: any;
    try {
      postmanObj = JSON.parse(rawContent);
    } catch (err: any) {
      throw new Error(`Invalid Postman JSON: ${err.message}`);
    }

    const title = postmanObj.info?.name || defaultMeta?.serviceName || 'Postman Imported API';

    // Find first request in items (recursive search)
    const firstReqItem = this.findFirstRequest(postmanObj.item || []);
    if (!firstReqItem) {
      throw new Error('No valid HTTP requests found in the Postman collection.');
    }

    const req = firstReqItem.request;
    const method: HttpMethod = (req.method || 'POST').toUpperCase() as HttpMethod;
    
    let path = '/api/v1/resource';
    if (typeof req.url === 'string') {
      try {
        const urlObj = new URL(req.url);
        path = urlObj.pathname;
      } catch {
        path = req.url.startsWith('/') ? req.url : `/${req.url}`;
      }
    } else if (req.url?.path && Array.isArray(req.url.path)) {
      path = '/' + req.url.path.join('/');
    }

    // Extract headers
    const headers: IUastNode[] = [];
    if (Array.isArray(req.header)) {
      let hIndex = 1;
      for (const h of req.header) {
        if (h.key && !h.disabled) {
          headers.push({
            nodeId: `h_${h.key}_${Math.random().toString(36).substring(2, 6)}`,
            structure: { kind: 'HEADER', path: `$.headers.${h.key}`, order: hIndex++ },
            semantics: { name: h.key, dataType: 'STRING', description: h.description || `Header ${h.key}` },
            constraints: { required: true },
            governance: {
              securityLevel: /auth|key|secret/i.test(h.key) ? 'CONFIDENTIAL_MASKED' : 'PUBLIC',
              exampleValue: h.value || 'ExampleValue',
              reviewStatus: 'APPROVED'
            },
            children: []
          });
        }
      }
    }

    // Extract body
    let requestTree: IUastNode;
    const rawBody = req.body?.raw;
    if (rawBody) {
      try {
        requestTree = this.rawJsonAdapter.parseToAst(rawBody).requestTree;
      } catch {
        requestTree = this.rawJsonAdapter.parseToAst(JSON.stringify({ rawData: rawBody })).requestTree;
      }
    } else if (Array.isArray(req.body?.urlencoded) && req.body.urlencoded.length > 0) {
      const urlencodedObj: Record<string, any> = {};
      for (const item of req.body.urlencoded) {
        if (item.key && !item.disabled) {
          urlencodedObj[item.key] = item.value || '';
        }
      }
      requestTree = this.rawJsonAdapter.parseToAst(JSON.stringify(urlencodedObj, null, 2)).requestTree;
    } else if (Array.isArray(req.body?.formdata) && req.body.formdata.length > 0) {
      const formdataObj: Record<string, any> = {};
      for (const item of req.body.formdata) {
        if (item.key && !item.disabled) {
          formdataObj[item.key] = item.value || item.src || '';
        }
      }
      requestTree = this.rawJsonAdapter.parseToAst(JSON.stringify(formdataObj, null, 2)).requestTree;
    } else {
      requestTree = this.rawJsonAdapter.parseToAst(JSON.stringify({
        status: "ACTIVE",
        serviceName: firstReqItem.name || title
      })).requestTree;
    }

    // Build allEndpoints from all requests in collection
    const allRequests = this.findAllRequests(postmanObj.item || []);
    const allEndpoints: AllEndpointEntry[] = allRequests.map(item => {
      const r = item.request;
      let epPath = '/api/v1/resource';
      if (typeof r.url === 'string') {
        try { epPath = new URL(r.url).pathname; } catch { epPath = r.url.startsWith('/') ? r.url : `/${r.url}`; }
      } else if (r.url?.path && Array.isArray(r.url.path)) {
        epPath = '/' + r.url.path.join('/');
      }
      return {
        method: ((r.method || 'POST').toUpperCase()) as HttpMethod,
        path: epPath,
        summary: item.name || epPath,
        description: item.description || undefined
      };
    });

    return {
      documentId: defaultMeta?.documentId || `doc_pm_${Date.now()}`,
      serviceCode: defaultMeta?.serviceCode || title.toUpperCase().replace(/[^A-Z0-9_]/g, '_').substring(0, 30) || 'SVC_POSTMAN',
      serviceName: title,
      serviceNameEn: title,
      semver: '1.0.0',
      lifecycleStage: 'ACTIVE',
      channel: {
        protocol: 'REST',
        method,
        endpointPath: path,
        environments: {
          sandbox: 'https://sandbox.api.gov.fintech',
          production: 'https://api.gov.fintech'
        }
      },
      headers,
      requestTree,
      errorCodes: [
        { code: 'POSTMAN_MOCK_200', message: 'استجابة تجريبية معتمدة من Postman Collection', action: 'مطابقة القيم مع السيرفر' }
      ],
      rawSource: rawContent,
      rawFormat: 'postman',
      updatedAt: new Date().toISOString(),
      status: defaultMeta?.status || 'PRIVATE_DRAFT',
      allEndpoints
    };
  }

  private findFirstRequest(items: any[]): any {
    for (const item of items) {
      if (item.request) return item;
      if (item.item && Array.isArray(item.item)) {
        const found = this.findFirstRequest(item.item);
        if (found) return found;
      }
    }
    return null;
  }

  private findAllRequests(items: any[]): any[] {
    const results: any[] = [];
    for (const item of items) {
      if (item.request) results.push(item);
      if (item.item && Array.isArray(item.item)) {
        results.push(...this.findAllRequests(item.item));
      }
    }
    return results;
  }
}
