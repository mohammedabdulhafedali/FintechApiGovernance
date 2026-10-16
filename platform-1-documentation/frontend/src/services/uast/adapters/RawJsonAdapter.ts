import { IFormatAdapter } from './IFormatAdapter';
import { UastDocument, IUastNode, NodeKind, DataType, SecurityLevel } from '../types';

export class RawJsonAdapter implements IFormatAdapter {
  readonly adapterName = 'RawJsonAdapter';
  readonly supportedFormats = ['json', 'raw-json'];

  canHandle(formatHint: string, rawContent: string): boolean {
    const trimmed = rawContent.trim();
    if (formatHint === 'json' || formatHint === 'raw-json') return true;
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) || 
           (trimmed.startsWith('[') && trimmed.endsWith(']'));
  }

  parseToAst(rawContent: string, defaultMeta?: Partial<UastDocument>): UastDocument {
    let parsedData: any;
    try {
      parsedData = JSON.parse(rawContent);
    } catch (err: any) {
      throw new Error(`صيغة JSON غير صالحة: ${err.message}`);
    }

    if (parsedData === null || parsedData === undefined || typeof parsedData !== 'object') {
      throw new Error('محتوى JSON غير صالح: يجب أن يكون كائن (Object) أو مصفوفة (Array).');
    }

    // Dynamic metadata extraction from the JSON content if provided
    const serviceCode = (typeof parsedData?.serviceCode === 'string' && parsedData.serviceCode) || defaultMeta?.serviceCode || 'CUSTOM_API';
    const serviceName = (typeof parsedData?.serviceName === 'string' && parsedData.serviceName) || defaultMeta?.serviceName || 'Custom API Service';
    const serviceNameEn = (typeof parsedData?.serviceNameEn === 'string' && parsedData.serviceNameEn) || defaultMeta?.serviceNameEn || 'Custom API Service';
    const semver = (typeof parsedData?.version === 'string' && parsedData.version) || (typeof parsedData?.semver === 'string' && parsedData.semver) || defaultMeta?.semver || '1.0.0';
    
    // Channel resolution
    const endpointPath = parsedData?.channel?.endpointPath || parsedData?.endpointPath || parsedData?.path || defaultMeta?.channel?.endpointPath || '/api/v1/endpoint';
    const method = ((parsedData?.channel?.method || parsedData?.method || defaultMeta?.channel?.method || 'POST')).toUpperCase() as any;
    const protocol = ((parsedData?.channel?.protocol || parsedData?.protocol || defaultMeta?.channel?.protocol || 'REST')).toUpperCase() as any;

    // Overview & BaseUrl
    const overviewText = parsedData?.overview || parsedData?.overviewText || defaultMeta?.overviewText;
    const baseUrl = parsedData?.baseUrl || defaultMeta?.baseUrl;

    // Parse Endpoints (Canonical Array)
    const rawEndpoints = parsedData?.endpoints || parsedData?.allEndpoints;
    let allEndpoints: any[] = [];
    if (Array.isArray(rawEndpoints) && rawEndpoints.length > 0) {
      allEndpoints = rawEndpoints.map((ep: any) => ({
        method: (ep.method || method || 'POST').toUpperCase(),
        path: ep.path || endpointPath || '/api/v1/endpoint',
        summary: ep.summary || ep.description || '',
        description: ep.description || '',
        requestFields: Array.isArray(ep.parameters || ep.requestFields) 
          ? (ep.parameters || ep.requestFields).map((p: any) => ({
              name: p.name || 'param',
              type: (p.type || 'STRING').toUpperCase(),
              required: p.required !== false,
              description: p.description || '',
              example: p.example !== undefined ? String(p.example) : ''
            }))
          : [],
        responseFields: Array.isArray(ep.responseFields)
          ? ep.responseFields.map((rf: any) => ({
              name: rf.name || 'status',
              type: (rf.type || 'STRING').toUpperCase(),
              description: rf.description || '',
              example: rf.example !== undefined ? String(rf.example) : ''
            }))
          : []
      }));
    } else if (defaultMeta?.allEndpoints && defaultMeta.allEndpoints.length > 0) {
      allEndpoints = defaultMeta.allEndpoints;
    } else {
      allEndpoints = [{
        method,
        path: endpointPath,
        summary: serviceName,
        requestFields: [],
        responseFields: []
      }];
    }

    // Parse Headers
    let importedHeaders: any[] = defaultMeta?.importedHeaders || [];
    if (Array.isArray(parsedData?.headers)) {
      importedHeaders = parsedData.headers.map((h: any) => ({
        name: h.name || h.key || 'X-Header',
        description: h.description || '',
        example: h.example !== undefined ? String(h.example) : '',
        required: h.required !== false
      }));
    }

    // Parse Error Codes
    let errorCodes: any[] = defaultMeta?.errorCodes || [];
    if (Array.isArray(parsedData?.errorCodes)) {
      errorCodes = parsedData.errorCodes.map((err: any) => ({
        code: String(err.code || 'ERR_UNKNOWN'),
        message: err.message || 'Error occurred',
        action: err.action || 'Check request payload and credentials',
        httpStatus: typeof err.httpStatus === 'number' ? err.httpStatus : 400
      }));
    }

    // Detect if JSON is wrapped in a request/payload object
    let payloadData = parsedData;
    if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
      if (parsedData.request && typeof parsedData.request === 'object') {
        payloadData = parsedData.request;
      } else if (parsedData.payload && typeof parsedData.payload === 'object') {
        payloadData = parsedData.payload;
      } else if (allEndpoints.length > 0 && allEndpoints[0].requestFields && allEndpoints[0].requestFields.length > 0) {
        // Synthesize request object from endpoint parameters if no explicit request object
        const syntheticObj: Record<string, any> = {};
        allEndpoints[0].requestFields.forEach((f: any) => {
          syntheticObj[f.name] = f.example || (f.type === 'NUMBER' ? 100 : f.type === 'BOOLEAN' ? true : `sample_${f.name}`);
        });
        payloadData = syntheticObj;
      }
    }

    const rootNode = this.buildNodeRecursively('root_payload', '$', 'Payload', payloadData, 1);

    return {
      documentId: defaultMeta?.documentId || `doc_${Date.now()}`,
      serviceCode,
      serviceName,
      serviceNameEn,
      semver,
      lifecycleStage: 'ACTIVE',
      channel: {
        protocol,
        method: allEndpoints[0]?.method || method,
        endpointPath: allEndpoints[0]?.path || endpointPath,
        environments: defaultMeta?.channel?.environments || {}
      },
      headers: defaultMeta?.headers || [],
      importedHeaders,
      allEndpoints,
      overviewText,
      baseUrl,
      requestTree: rootNode,
      response200Tree: defaultMeta?.response200Tree,
      response422Tree: defaultMeta?.response422Tree,
      errorCodes,
      rawSource: rawContent,
      rawFormat: 'json',
      updatedAt: new Date().toISOString(),
      status: defaultMeta?.status || 'PRIVATE_DRAFT'
    };
  }

  private buildNodeRecursively(id: string, path: string, keyName: string, value: any, order: number): IUastNode {
    const isObj = value !== null && typeof value === 'object' && !Array.isArray(value);
    const isArr = Array.isArray(value);

    let kind: NodeKind = 'FIELD';
    let dataType: DataType = 'STRING';
    let children: IUastNode[] = [];
    let exampleValue: any = value;

    if (isObj) {
      kind = 'OBJECT';
      dataType = 'OBJECT';
      exampleValue = undefined;
      let childIndex = 1;
      for (const [childKey, childVal] of Object.entries(value)) {
        const childPath = `${path}.${childKey}`;
        const childId = `node_${childKey}_${Math.random().toString(36).substring(2, 7)}`;
        children.push(this.buildNodeRecursively(childId, childPath, childKey, childVal, childIndex++));
      }
    } else if (isArr) {
      kind = 'ARRAY';
      dataType = 'ARRAY';
      exampleValue = undefined;
      if (value.length > 0) {
        const firstElem = value[0];
        const childPath = `${path}[0]`;
        const childId = `node_item_${Math.random().toString(36).substring(2, 7)}`;
        children.push(this.buildNodeRecursively(childId, childPath, 'item', firstElem, 1));
      }
    } else if (typeof value === 'number') {
      dataType = Number.isInteger(value) ? 'NUMBER' : 'DECIMAL';
    } else if (typeof value === 'boolean') {
      dataType = 'BOOLEAN';
    } else if (typeof value === 'string') {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        dataType = 'UUID';
      } else if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/i.test(value)) {
        dataType = 'DATE';
      } else {
        dataType = 'STRING';
      }
    }

    // Heuristics for Security & Business Categories
    let securityLevel: SecurityLevel = 'PUBLIC';
    let businessCategory: string | undefined = undefined;
    const lowerKey = keyName.toLowerCase();

    if (/iban/i.test(lowerKey)) {
      businessCategory = 'BANK_ACCOUNT_IBAN';
      securityLevel = 'CONFIDENTIAL_MASKED';
    } else if (/(account|acc_no|accountnumber)/i.test(lowerKey)) {
      businessCategory = 'ACCOUNT_NUMBER';
      securityLevel = 'CONFIDENTIAL_MASKED';
    } else if (/(amount|balance|total|fee)/i.test(lowerKey)) {
      businessCategory = 'FINANCIAL_AMOUNT';
    } else if (/(currency|cur)/i.test(lowerKey)) {
      businessCategory = 'CURRENCY_CODE';
    } else if (/(secret|password|token|pin|pan|cvv|auth)/i.test(lowerKey)) {
      securityLevel = 'RESTRICTED';
      exampleValue = '********';
    }

    return {
      nodeId: id,
      structure: {
        kind,
        path,
        order,
        isCollapsible: isObj || isArr,
        isExpanded: true
      },
      semantics: {
        name: keyName,
        dataType,
        businessCategory,
        description: this.generateDefaultDescription(keyName),
        descriptionEn: `Field: ${keyName}`
      },
      constraints: {
        required: true,
        regexPattern: dataType === 'UUID' ? '^[0-9a-fA-F-]{36}$' : undefined
      },
      governance: {
        securityLevel,
        exampleValue,
        reviewStatus: 'DRAFT',
        addedInVersion: '1.0.0'
      },
      children
    };
  }

  private generateDefaultDescription(key: string): string {
    const k = key.toLowerCase();
    if (k.includes('iban')) return 'رقم الآيبان البنكي الدولي المعتمد للعملية';
    if (k.includes('account')) return 'رقم الحساب المصرفي للمستفيد أو العميل';
    if (k.includes('amount')) return 'المبلغ المالي للعملية وفق القواعد المصرفية';
    if (k.includes('currency')) return 'رمز العملة الرسمية المعتمدة (مثل YER أو SAR)';
    if (k.includes('id') || k.includes('uuid')) return 'المعرف الرقمي الفريد للعملية لمنع الازدواجية';
    if (k.includes('date') || k.includes('time')) return 'تاريخ ووقت تسجيل العملية بالتوقيت الموحد';
    if (k.includes('status')) return 'حالة المعاملة الحالية في المنظومة المصرفية';
    return `حقل ${key} ضمن معايير ومواصفات الطلب`;
  }
}
