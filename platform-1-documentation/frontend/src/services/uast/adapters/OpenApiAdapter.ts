import { IFormatAdapter } from './IFormatAdapter';
import { UastDocument, IUastNode, NodeKind, DataType, SecurityLevel, HttpMethod } from '../types';
import { RawJsonAdapter } from './RawJsonAdapter';
import YAML from 'yaml';

export class OpenApiAdapter implements IFormatAdapter {
  readonly adapterName = 'OpenApiAdapter';
  readonly supportedFormats = ['openapi', 'swagger', 'yaml', 'yml'];
  private rawJsonAdapter = new RawJsonAdapter();

  canHandle(formatHint: string, rawContent: string): boolean {
    const hint = formatHint.toLowerCase();
    if (hint === 'openapi' || hint === 'swagger' || hint === 'yaml' || hint === 'yml') return true;
    const trimmed = rawContent.trim();
    return trimmed.includes('openapi:') || 
           trimmed.includes('"openapi"') || 
           trimmed.includes('swagger:') || 
           trimmed.includes('"swagger"') ||
           (trimmed.includes('paths:') && trimmed.includes('info:'));
  }

  parseToAst(rawContent: string, defaultMeta?: Partial<UastDocument>): UastDocument {
    let specObj: any = null;

    // 1. Parse YAML/JSON reliably using standard YAML parser
    try {
      specObj = YAML.parse(rawContent);
    } catch {
      try {
        specObj = JSON.parse(rawContent);
      } catch (err: any) {
        throw new Error(`تعذر قراءة ملف OpenAPI/YAML: ${err.message}`);
      }
    }

    if (!specObj || typeof specObj !== 'object') {
      throw new Error('محتوى مواصفة OpenAPI غير صالح أو فارغ.');
    }

    const title = specObj.info?.title || defaultMeta?.serviceName || 'OpenAPI Banking Service';
    const version = specObj.info?.version || defaultMeta?.semver || '1.0.0';
    const serverUrl = specObj.servers?.[0]?.url || 'https://api.gov.fintech/v1';

    // 2. Discover operations across all paths
    interface CandidateOp {
      path: string;
      method: HttpMethod;
      opObj: any;
      pathParams: any[];
      score: number;
    }

    const candidates: CandidateOp[] = [];

    if (specObj.paths && typeof specObj.paths === 'object') {
      for (const [pathKey, pathItem] of Object.entries<any>(specObj.paths)) {
        if (!pathItem || typeof pathItem !== 'object') continue;
        const pathParams = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

        for (const [methodKey, op] of Object.entries<any>(pathItem)) {
          const upperMethod = methodKey.toUpperCase();
          if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(upperMethod) && op && typeof op === 'object') {
            let score = 0;
            if (op.requestBody) score += 10;
            if (op.parameters && op.parameters.length > 0) score += 5;
            if (op.operationId) score += 2;

            candidates.push({
              path: pathKey,
              method: upperMethod as HttpMethod,
              opObj: op,
              pathParams,
              score
            });
          }
        }
      }
    }

    if (candidates.length === 0) {
      throw new Error('لم يتم العثور على أي مسارات أو عمليات HTTP صالحة داخل مواصفة الـ OpenAPI.');
    }

    // Select the best candidate (highest score or first)
    candidates.sort((a, b) => b.score - a.score);
    const chosen = candidates[0];
    const { path: foundPath, method: foundMethod, opObj, pathParams } = chosen;

    // 3. Extract Headers from both path-level and operation-level parameters
    const allParameters = [...pathParams, ...(Array.isArray(opObj.parameters) ? opObj.parameters : [])];
    const headers: IUastNode[] = [];
    let hOrder = 1;

    for (const rawParam of allParameters) {
      const param = this.resolveRef(rawParam?.$ref, specObj) || rawParam;
      if (!param || typeof param !== 'object') continue;

      if (param.in === 'header') {
        const pName = param.name;
        const pDesc = (param.description || `ترويسة ${pName}`).replace(/\r?\n/g, ' ');
        const isConfidential = /client|auth|key|secret|sign|nonce|token|timestamp/i.test(pName);
        
        let exVal: any = param.example;
        if (exVal === undefined && param.schema?.example !== undefined) exVal = param.schema.example;
        if (exVal === undefined && param.schema?.default !== undefined) exVal = param.schema.default;
        if (exVal === undefined) {
          if (/nonce/i.test(pName)) exVal = 'e8b39c2a-9f41-4821-b328-984210a';
          else if (/signature/i.test(pName)) exVal = 'RSA_SHA256_BASE64_SIG==';
          else if (/timestamp/i.test(pName)) exVal = String(Math.floor(Date.now() / 1000));
          else if (/client/i.test(pName)) exVal = 'client_biller_10098';
          else exVal = 'HeaderValue';
        }

        headers.push({
          nodeId: `h_${pName}_${hOrder}`,
          structure: { kind: 'HEADER', path: `$.headers.${pName}`, order: hOrder++ },
          semantics: {
            name: pName,
            dataType: 'STRING',
            description: pDesc,
            descriptionEn: pDesc
          },
          constraints: { required: !!param.required },
          governance: {
            securityLevel: isConfidential ? 'CONFIDENTIAL_MASKED' : 'PUBLIC',
            exampleValue: String(exVal),
            reviewStatus: 'APPROVED'
          },
          children: []
        });
      }
    }

    // Fallback standard Authorization header if none defined
    if (headers.length === 0) {
      headers.push({
        nodeId: 'h_auth_default',
        structure: { kind: 'HEADER', path: '$.headers.Authorization', order: 1 },
        semantics: { name: 'Authorization', dataType: 'STRING', description: 'Bearer Token for API authorization' },
        constraints: { required: true },
        governance: { securityLevel: 'CONFIDENTIAL_MASKED', reviewStatus: 'APPROVED', exampleValue: 'Bearer eyJhbGci...' },
        children: []
      });
    }

    // 4. Extract Request Body Schema & Examples
    let exampleValuesMap: Record<string, any> = {};
    let requestSchema: any = null;

    if (opObj.requestBody) {
      const resolvedRb = this.resolveRef(opObj.requestBody.$ref, specObj) || opObj.requestBody;
      const content = resolvedRb?.content;
      if (content && typeof content === 'object') {
        // Preferred content types in order
        const targetContent = content['application/json'] || 
                              content['application/x-www-form-urlencoded'] || 
                              content['multipart/form-data'] || 
                              Object.values(content)[0];

        if (targetContent) {
          // Extract concrete example values if defined
          if (targetContent.examples && typeof targetContent.examples === 'object') {
            const firstEx = Object.values(targetContent.examples)[0] as any;
            if (firstEx?.value && typeof firstEx.value === 'object') {
              exampleValuesMap = { ...firstEx.value };
            }
          } else if (targetContent.example && typeof targetContent.example === 'object') {
            exampleValuesMap = { ...targetContent.example };
          }

          requestSchema = targetContent.schema;
        }
      }
    }

    // Resolve schema if it contains $ref
    if (requestSchema?.$ref) {
      requestSchema = this.resolveRef(requestSchema.$ref, specObj) || requestSchema;
    }

    let requestTree: IUastNode;

    if (requestSchema && typeof requestSchema === 'object') {
      requestTree = this.schemaToUastNode(
        'root_payload', 
        '$', 
        'RequestBody', 
        requestSchema, 
        specObj, 
        1, 
        exampleValuesMap
      );
    } else if (Object.keys(exampleValuesMap).length > 0) {
      requestTree = this.rawJsonAdapter.parseToAst(JSON.stringify(exampleValuesMap, null, 2)).requestTree;
    } else {
      // If endpoint has query/path params but no body, represent them in requestTree
      const otherParams = allParameters.filter(p => p.in === 'query' || p.in === 'path');
      if (otherParams.length > 0) {
        const syntheticObj: Record<string, any> = {};
        for (const p of otherParams) {
          syntheticObj[p.name] = p.example || (p.schema?.type === 'integer' ? 1 : 'value');
        }
        requestTree = this.rawJsonAdapter.parseToAst(JSON.stringify(syntheticObj, null, 2)).requestTree;
      } else {
        requestTree = this.rawJsonAdapter.parseToAst(JSON.stringify({
          serviceStatus: "ACTIVE",
          timestamp: new Date().toISOString()
        })).requestTree;
      }
    }

    // 5. Extract Error Matrix from Responses
    const errorCodes: Array<{ code: string; message: string; action: string }> = [];
    if (opObj.responses && typeof opObj.responses === 'object') {
      for (const [statusCode, resItem] of Object.entries<any>(opObj.responses)) {
        if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
          const resObj = this.resolveRef(resItem?.$ref, specObj) || resItem;
          errorCodes.push({
            code: `HTTP_${statusCode}`,
            message: resObj?.description || `رمز الخطأ المعياري ${statusCode}`,
            action: statusCode === '401' ? 'التحقق من صحة مفاتيح التوثيق والتوقيع' :
                    statusCode === '422' ? 'مراجعة قيود الحقول والتأكد من مطابقة الـ Schema' :
                    statusCode === '404' ? 'التحقق من صحة المعرفات والمسار' : 'مراجعة سجلات الخادم وإعادة المحاولة'
          });
        }
      }
    }

    if (errorCodes.length === 0) {
      errorCodes.push({
        code: 'VALIDATION_FAILED_422',
        message: 'مواصفة الطلب غير متطابقة مع معايير OpenAPI المعتمدة',
        action: 'تصحيح قيم الحقول طبقاً للـ Schema'
      });
    }

    // Determine clean service code & service name
    const serviceCode = defaultMeta?.serviceCode || 
                        opObj.operationId || 
                        foundPath.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '').toUpperCase() || 
                        'SVC_OPENAPI';

    const serviceName = defaultMeta?.serviceName || 
                        opObj.summary || 
                        opObj.description || 
                        title;

    return {
      documentId: defaultMeta?.documentId || `doc_openapi_${Date.now()}`,
      serviceCode,
      serviceName,
      serviceNameEn: opObj.operationId || serviceName,
      semver: version,
      lifecycleStage: 'ACTIVE',
      channel: {
        protocol: 'REST',
        method: foundMethod,
        endpointPath: foundPath,
        environments: {
          sandbox: serverUrl.startsWith('/') ? `https://sandbox.api.gov.fintech${serverUrl}` : serverUrl.replace('api.', 'sandbox.api.'),
          production: serverUrl.startsWith('/') ? `https://api.gov.fintech${serverUrl}` : serverUrl
        }
      },
      headers,
      requestTree,
      errorCodes,
      rawSource: rawContent,
      rawFormat: 'openapi',
      updatedAt: new Date().toISOString(),
      status: defaultMeta?.status || 'PRIVATE_DRAFT'
    };
  }

  // Helper to resolve $ref references across OpenAPI components and definitions
  private resolveRef(ref: string | undefined, rootObj: any): any {
    if (!ref || typeof ref !== 'string' || !ref.startsWith('#/')) return null;
    const parts = ref.replace('#/', '').split('/');
    let current = rootObj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    return current;
  }

  private schemaToUastNode(
    id: string, 
    path: string, 
    keyName: string, 
    rawSchema: any, 
    rootDoc: any, 
    order: number,
    examplesMap?: Record<string, any>
  ): IUastNode {
    // Resolve $ref if nested
    const schema = rawSchema?.$ref ? (this.resolveRef(rawSchema.$ref, rootDoc) || rawSchema) : rawSchema;
    const schemaType = (schema?.type || 'object').toLowerCase();
    
    let kind: NodeKind = 'FIELD';
    let dataType: DataType = 'STRING';
    const children: IUastNode[] = [];

    if (schemaType === 'object' || schema.properties) {
      kind = 'OBJECT';
      dataType = 'OBJECT';
      const properties = schema.properties || {};
      const requiredList: string[] = Array.isArray(schema.required) ? schema.required : [];

      let childOrder = 1;
      for (const [propKey, propVal] of Object.entries<any>(properties)) {
        const childPath = `${path}.${propKey}`;
        const childId = `node_${propKey}_${childOrder}`;
        const childNode = this.schemaToUastNode(
          childId, 
          childPath, 
          propKey, 
          propVal, 
          rootDoc, 
          childOrder++,
          examplesMap
        );
        childNode.constraints.required = requiredList.includes(propKey);
        children.push(childNode);
      }
    } else if (schemaType === 'array') {
      kind = 'ARRAY';
      dataType = 'ARRAY';
      if (schema.items) {
        const itemSchema = schema.items.$ref ? (this.resolveRef(schema.items.$ref, rootDoc) || schema.items) : schema.items;
        const childNode = this.schemaToUastNode(`node_item_${Date.now()}`, `${path}[0]`, 'item', itemSchema, rootDoc, 1, examplesMap);
        children.push(childNode);
      }
    } else if (schemaType === 'integer' || schemaType === 'number') {
      dataType = (schemaType === 'integer' || schema.format === 'int32' || schema.format === 'int64') ? 'NUMBER' : 'DECIMAL';
    } else if (schemaType === 'boolean') {
      dataType = 'BOOLEAN';
    } else {
      dataType = 'STRING';
    }

    // Determine realistic example value
    let exampleValue: any = undefined;
    if (kind !== 'OBJECT' && kind !== 'ARRAY') {
      if (examplesMap && examplesMap[keyName] !== undefined) {
        exampleValue = examplesMap[keyName];
      } else if (schema.example !== undefined) {
        exampleValue = schema.example;
      } else if (schema.default !== undefined) {
        exampleValue = schema.default;
      } else {
        if (dataType === 'NUMBER') exampleValue = /id|no|code|count/i.test(keyName) ? 1 : 100;
        else if (dataType === 'DECIMAL') exampleValue = 1500.00;
        else if (dataType === 'BOOLEAN') exampleValue = true;
        else if (/date/i.test(keyName)) exampleValue = '2026-02-01';
        else if (/curr/i.test(keyName)) exampleValue = 'YER';
        else if (/no|num|id/i.test(keyName)) exampleValue = `${keyName.toUpperCase()}-001`;
        else exampleValue = `قيمة_${keyName}`;
      }
    }

    let securityLevel: SecurityLevel = 'PUBLIC';
    if (/iban|account|pan|pin|secret|auth|pass|client_id|nonce|signature/i.test(keyName)) {
      securityLevel = 'CONFIDENTIAL_MASKED';
    }

    return {
      nodeId: id,
      structure: {
        kind,
        path,
        order,
        isCollapsible: kind === 'OBJECT' || kind === 'ARRAY',
        isExpanded: true
      },
      semantics: {
        name: keyName,
        dataType,
        description: schema.description || `حقل ${keyName}`,
        descriptionEn: schema.description || `Field: ${keyName}`
      },
      constraints: {
        required: false,
        minLength: schema.minLength,
        maxLength: schema.maxLength,
        regexPattern: schema.pattern,
        allowedValues: schema.enum || null
      },
      governance: {
        securityLevel,
        exampleValue,
        reviewStatus: 'APPROVED',
        addedInVersion: '1.0.0'
      },
      children
    };
  }
}
