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
    } catch {
      // Lenient recovery for live typing (trailing commas, unclosed braces)
      try {
        let cleaned = rawContent.trim();
        cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
        const openBraces = (cleaned.match(/\{/g) || []).length;
        const closeBraces = (cleaned.match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
          cleaned += '}'.repeat(openBraces - closeBraces);
        }
        const openBrackets = (cleaned.match(/\[/g) || []).length;
        const closeBrackets = (cleaned.match(/\]/g) || []).length;
        if (openBrackets > closeBrackets) {
          cleaned += ']'.repeat(openBrackets - closeBrackets);
        }
        parsedData = JSON.parse(cleaned);
      } catch (err: any) {
        throw new Error(`Invalid JSON syntax: ${err.message}`);
      }
    }

    // Dynamic metadata extraction from the JSON content if provided
    const serviceCode = (typeof parsedData?.serviceCode === 'string' && parsedData.serviceCode) || defaultMeta?.serviceCode || 'SERVICE_CUSTOM';
    const serviceName = (typeof parsedData?.serviceName === 'string' && parsedData.serviceName) || defaultMeta?.serviceName || 'خدمة مخصصة (Custom API Service)';
    const serviceNameEn = (typeof parsedData?.serviceNameEn === 'string' && parsedData.serviceNameEn) || defaultMeta?.serviceNameEn || 'Custom API Service';
    const semver = (typeof parsedData?.version === 'string' && parsedData.version) || (typeof parsedData?.semver === 'string' && parsedData.semver) || defaultMeta?.semver || '1.0.0';
    
    const endpointPath = parsedData?.channel?.endpointPath || parsedData?.endpointPath || parsedData?.path || defaultMeta?.channel?.endpointPath || '/api/v1/custom/endpoint';
    const method = ((parsedData?.channel?.method || parsedData?.method || defaultMeta?.channel?.method || 'POST')).toUpperCase() as any;
    const protocol = ((parsedData?.channel?.protocol || parsedData?.protocol || defaultMeta?.channel?.protocol || 'REST')).toUpperCase() as any;

    // Detect if JSON is wrapped in a request/payload object
    let payloadData = parsedData;
    if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
      if (parsedData.request && typeof parsedData.request === 'object') {
        payloadData = parsedData.request;
      } else if (parsedData.payload && typeof parsedData.payload === 'object') {
        payloadData = parsedData.payload;
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
        method,
        endpointPath,
        environments: defaultMeta?.channel?.environments || {
          sandbox: 'https://sandbox.api.fintech.local',
          production: 'https://api.fintech.local'
        }
      },
      headers: defaultMeta?.headers || [
        {
          nodeId: 'h_auth',
          structure: { kind: 'HEADER', path: '$.headers.Authorization', order: 1 },
          semantics: { name: 'Authorization', dataType: 'STRING', description: 'Bearer Token for API authorization' },
          constraints: { required: true },
          governance: { securityLevel: 'CONFIDENTIAL_MASKED', reviewStatus: 'APPROVED', exampleValue: 'Bearer eyJhbGci...' },
          children: []
        },
        {
          nodeId: 'h_idem',
          structure: { kind: 'HEADER', path: '$.headers.X-Idempotency-Key', order: 2 },
          semantics: { name: 'X-Idempotency-Key', dataType: 'UUID', description: 'Unique transaction request UUID' },
          constraints: { required: true, regexPattern: '^[0-9a-fA-F-]{36}$' },
          governance: { securityLevel: 'INTERNAL', reviewStatus: 'APPROVED', exampleValue: 'c83890a1-43e2-4df4-8d9e-10821d3f9b88' },
          children: []
        }
      ],
      requestTree: rootNode,
      response200Tree: defaultMeta?.response200Tree,
      response422Tree: defaultMeta?.response422Tree,
      errorCodes: defaultMeta?.errorCodes || [
        { code: 'VALIDATION_ERROR_422', message: 'قيمة أحد الحقول غير مطابقة للشروط الرقابية', action: 'مراجعة قيود الحقل وإعادة الإرسال' },
        { code: 'UNAUTHORIZED_401', message: 'انتهت صلاحية رمز التفويض الأمني', action: 'تجديد رمز الـ OAuth وإعادة المحاولة' }
      ],
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
