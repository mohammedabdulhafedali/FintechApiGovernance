import { IFormatAdapter } from './IFormatAdapter';
import { UastDocument, IUastNode, NodeKind, DataType, SecurityLevel } from '../types';

export class XmlSoapAdapter implements IFormatAdapter {
  readonly adapterName = 'XmlSoapAdapter';
  readonly supportedFormats = ['xml', 'soap', 'wsdl'];

  canHandle(formatHint: string, rawContent: string): boolean {
    const hint = formatHint.toLowerCase();
    if (hint === 'xml' || hint === 'soap' || hint === 'wsdl') return true;
    const trimmed = rawContent.trim();
    return trimmed.startsWith('<') && (
      trimmed.includes('soap:Envelope') || 
      trimmed.includes('soapenv:Envelope') || 
      trimmed.includes('<Envelope') ||
      trimmed.includes('<?xml')
    );
  }

  parseToAst(rawContent: string, defaultMeta?: Partial<UastDocument>): UastDocument {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rawContent, 'text/xml');

    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error(`XML Parsing error: ${parserError.textContent}`);
    }

    // Locate SOAP Header and Body elements
    let headerElement: Element | null = null;
    let bodyElement: Element | null = null;
    const allElements = xmlDoc.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      if (el.localName.toLowerCase() === 'header') {
        headerElement = el;
      }
      if (el.localName.toLowerCase() === 'body') {
        bodyElement = el;
      }
    }

    // Target the first child element of Body, or root element if not SOAP
    const rootTarget = (bodyElement && bodyElement.firstElementChild) 
      ? bodyElement.firstElementChild 
      : xmlDoc.documentElement;

    const requestTree = this.domElementToUastNode('root_soap', '$', rootTarget.localName, rootTarget, 1);

    const headers: IUastNode[] = [
      {
        nodeId: 'h_content_type',
        structure: { kind: 'HEADER', path: '$.headers.Content-Type', order: 1 },
        semantics: { name: 'Content-Type', dataType: 'STRING', description: 'SOAP XML Envelope Content Type' },
        constraints: { required: true },
        governance: { securityLevel: 'PUBLIC', exampleValue: 'text/xml; charset=utf-8', reviewStatus: 'APPROVED' },
        children: []
      },
      {
        nodeId: 'h_soap_action',
        structure: { kind: 'HEADER', path: '$.headers.SOAPAction', order: 2 },
        semantics: { name: 'SOAPAction', dataType: 'STRING', description: 'SOAP Action URI identifier' },
        constraints: { required: true },
        governance: { securityLevel: 'PUBLIC', exampleValue: `http://bank.example.com/${rootTarget.localName}`, reviewStatus: 'APPROVED' },
        children: []
      }
    ];

    if (headerElement && headerElement.children.length > 0) {
      for (let i = 0; i < headerElement.children.length; i++) {
        const hEl = headerElement.children[i];
        const val = hEl.textContent?.trim() || 'HeaderValue';
        const isSecret = /token|auth|key|sign|secret/i.test(hEl.localName);
        headers.push({
          nodeId: `h_${hEl.localName}_${headers.length + 1}`,
          structure: { kind: 'HEADER', path: `$.headers.${hEl.localName}`, order: headers.length + 1 },
          semantics: { name: hEl.localName, dataType: 'STRING', description: `ترويسة أمان SOAP: ${hEl.localName}` },
          constraints: { required: true },
          governance: {
            securityLevel: isSecret ? 'CONFIDENTIAL_MASKED' : 'PUBLIC',
            exampleValue: val,
            reviewStatus: 'APPROVED'
          },
          children: []
        });
      }
    }
    return {
      documentId: defaultMeta?.documentId || `doc_soap_${Date.now()}`,
      serviceCode: defaultMeta?.serviceCode || rootTarget.localName.toUpperCase() || 'SVC_SOAP_LEGACY',
      serviceName: defaultMeta?.serviceName || `خدمة بنكية معيارية (${rootTarget.localName})`,
      serviceNameEn: defaultMeta?.serviceNameEn || `SOAP Service (${rootTarget.localName})`,
      semver: defaultMeta?.semver || '1.0.0',
      lifecycleStage: 'ACTIVE',
      channel: {
        protocol: 'SOAP',
        method: 'POST',
        endpointPath: defaultMeta?.channel?.endpointPath || '/ws/banking/v1/service',
        environments: {
          sandbox: 'https://sandbox.soap.bank.local/ws/service',
          production: 'https://soap.bank.local/ws/service'
        }
      },
      headers,
      requestTree,
      errorCodes: [
        { code: 'SOAP_FAULT_500', message: 'خطأ معالجة الغلاف أو التوقيع في خادم البنك الأساسي', action: 'التحقق من صحة مفاتيح التشفير وغلاف SOAP' }
      ],
      rawSource: rawContent,
      rawFormat: 'soap',
      updatedAt: new Date().toISOString(),
      status: defaultMeta?.status || 'PRIVATE_DRAFT'
    };
  }

  private domElementToUastNode(id: string, path: string, tagName: string, element: Element, order: number): IUastNode {
    const hasChildren = element.children.length > 0;
    const textVal = element.textContent?.trim() || '';

    let kind: NodeKind = hasChildren ? 'OBJECT' : 'FIELD';
    let dataType: DataType = 'STRING';
    const children: IUastNode[] = [];

    if (hasChildren) {
      dataType = 'OBJECT';
      let childIndex = 1;
      for (let i = 0; i < element.children.length; i++) {
        const childEl = element.children[i];
        const childPath = `${path}.${childEl.localName}`;
        const childId = `node_${childEl.localName}_${Math.random().toString(36).substring(2, 6)}`;
        children.push(this.domElementToUastNode(childId, childPath, childEl.localName, childEl, childIndex++));
      }
    } else {
      if (/^\d+$/.test(textVal)) {
        dataType = 'NUMBER';
      } else if (/^\d+\.\d+$/.test(textVal)) {
        dataType = 'DECIMAL';
      } else if (textVal.toLowerCase() === 'true' || textVal.toLowerCase() === 'false') {
        dataType = 'BOOLEAN';
      }
    }

    let securityLevel: SecurityLevel = 'PUBLIC';
    if (/iban|account|pan|pin|token|auth/i.test(tagName)) {
      securityLevel = 'CONFIDENTIAL_MASKED';
    }

    return {
      nodeId: id,
      structure: {
        kind,
        path,
        order,
        isCollapsible: hasChildren,
        isExpanded: true
      },
      semantics: {
        name: tagName,
        dataType,
        description: `عنصر ${tagName} ضمن غلاف الـ SOAP المصرفي`,
        descriptionEn: `XML Element: ${tagName}`
      },
      constraints: {
        required: true
      },
      governance: {
        securityLevel,
        exampleValue: hasChildren ? undefined : (textVal || 'ExampleValue'),
        reviewStatus: 'DRAFT',
        addedInVersion: '1.0.0'
      },
      children
    };
  }
}
