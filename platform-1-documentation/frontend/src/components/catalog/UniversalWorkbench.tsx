import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  PlusCircle, 
  FileText, 
  CheckCircle2, 
  Copy, 
  Check,
  Upload
} from 'lucide-react';
import { UastDocument, IUastNode, type DataType } from '../../services/uast/types';
import { Endpoint } from '../../types/schema';
import { uastAdapterFactory } from '../../services/uast/adapters/AdapterFactory';
import { uastDraftService } from '../../services/uast/draftService';
import { SpecViewer } from './SpecViewer';
import { useLanguage } from '../../i18n';

interface UniversalWorkbenchProps {
  initialDocument?: UastDocument;
  onPublishSuccess?: (doc: UastDocument) => void;
  onBackToCatalog?: () => void;
}

type WorkbenchTab = 'add' | 'drafts' | 'submissions';
type FullscreenTarget = 'none' | 'all' | 'code' | 'web' | 'pdf';

// Preset Templates
const PRESETS = {
  json: {
    format: 'json',
    title: 'خدمة التحويل المالي اللحظي (SARIE IPS)',
    serviceCode: 'IPS_TRANSFER',
    code: JSON.stringify({
      transferId: "TRX-2026-9812",
      senderIban: "YE00010001234567890123",
      receiverIban: "YE00020009876543210987",
      amount: 50000.00,
      currency: "YER",
      remittancePurpose: "COMMERCIAL_PAYMENT",
      clientConsentId: "c83890a1-43e2-4df4-8d9e-10821d3f9b88"
    }, null, 2)
  },
  soap: {
    format: 'soap',
    title: 'استعلام رصيد حساب مصرفي (SOAP Envelope)',
    serviceCode: 'SOAP_BAL_INQ',
    code: `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bank="http://bank.example.com/">
   <soapenv:Header>
      <bank:AuthToken>SECRET_BANK_TOKEN_9988</bank:AuthToken>
   </soapenv:Header>
   <soapenv:Body>
      <bank:BalanceInquiryRequest>
         <bank:accountNumber>1234567890123456</bank:accountNumber>
         <bank:currencyCode>YER</bank:currencyCode>
         <bank:branchCode>10</bank:branchCode>
      </bank:BalanceInquiryRequest>
   </soapenv:Body>
</soapenv:Envelope>`
  },
  openapi: {
    format: 'openapi',
    title: 'نظام حماية الأجور والرواتب (WPS OpenAPI)',
    serviceCode: 'WPS_PAYROLL',
    code: `openapi: 3.1.0
info:
  title: WPS Unified Payroll Gateway
  version: 1.1.0
paths:
  /v1/payroll/batches/submit:
    post:
      summary: Submit Monthly Salary Batch
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [employerId, totalAmount, currency, employeesCount]
              properties:
                employerId:
                  type: string
                  description: رقم السجل التجاري للمنشأة
                totalAmount:
                  type: number
                  description: إجمالي مبالغ الرواتب للشهر
                currency:
                  type: string
                  description: العملة المعتمدة
                employeesCount:
                  type: integer
                  description: عدد الموظفين المشمولين بالمسير`
  },
  markdown: {
    format: 'markdown',
    title: 'توثيق بطاقات الدفع الإلكتروني (Markdown Table)',
    serviceCode: 'CARDS_INQUIRY',
    code: `# خدمة استعلام حركات البطاقات المصرفية
| الحقل | النوع | الإلزام | الوصف الرقابي |
| --- | --- | --- | --- |
| cardNumber | String | إجباري | رقم بطاقة الدفع (محجوب PII) |
| fromDate | Date | اختياري | تاريخ بدء فترة الاستعلام |
| toDate | Date | اختياري | تاريخ نهاية فترة الاستعلام |
| maxRecords | Number | اختياري | الحد الأقصى للسجلات المعادة |

\`\`\`json
{
  "cardNumber": "411111******1111",
  "fromDate": "2026-01-01",
  "toDate": "2026-10-14",
  "maxRecords": 50
}
\`\`\``
  },
  postman: {
    format: 'postman',
    title: 'كشف حساب مصرفي تفصيلي (Postman Collection)',
    serviceCode: 'STMT_POSTMAN',
    code: JSON.stringify({
      info: { name: "Bank Statement Inquiry" },
      item: [
        {
          name: "Get Account Statement",
          request: {
            method: "POST",
            url: "https://api.bank.com/v1/accounts/statement",
            header: [
              { key: "Authorization", value: "Bearer eyJhbG..." },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              raw: JSON.stringify({
                accountNumber: "SA440000001234567890",
                statementPeriodMonths: 3
              }, null, 2)
            }
          }
        }
      ]
    }, null, 2)
  },
  manual: {
    format: 'json',
    title: 'خدمة جديدة (إدخال مباشر)',
    serviceCode: 'API_DIRECT',
    code: JSON.stringify({
      requestId: "REQ-001",
      amount: 1000,
      currency: "YER"
    }, null, 2)
  }
};

function extractLenientFields(source: string): Array<{ name: string; type: DataType; value: any; path: string }> {
  const fields: Array<{ name: string; type: DataType; value: any; path: string }> = [];
  const lines = source.split('\n');
  const seen = new Set<string>();

  for (const line of lines) {
    const match = line.match(/^\s*["']?([a-zA-Z0-9_.-]+)["']?\s*:\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let rawVal = match[2].trim();
      rawVal = rawVal.replace(/[,;]+$/, '').trim();
      
      if (['serviceCode', 'serviceName', 'channel', 'version', 'request'].includes(key)) {
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);

      let detectedType: DataType = 'STRING';
      let cleanVal: any = rawVal;

      if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
        cleanVal = rawVal.slice(1, -1);
        detectedType = 'STRING';
      } else if (rawVal === 'true' || rawVal === 'false') {
        cleanVal = rawVal === 'true';
        detectedType = 'BOOLEAN';
      } else if (!isNaN(Number(rawVal)) && rawVal !== '') {
        cleanVal = Number(rawVal);
        detectedType = Number.isInteger(cleanVal) ? 'NUMBER' : 'DECIMAL';
      } else if (rawVal.startsWith('{') || rawVal.startsWith('[')) {
        continue;
      }

      fields.push({
        name: key,
        type: detectedType,
        value: cleanVal,
        path: `$.${key}`
      });
    }
  }
  return fields;
}

export const UniversalWorkbench: React.FC<UniversalWorkbenchProps> = ({
  initialDocument,
  onPublishSuccess
}) => {
  const { isRtl } = useLanguage();

  // ── Navigation Tabs ──
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('add');

  // ── Tab 1: [إضافة توثيق] State (import_selection = format cards | active_editing = 3 screens) ──
  const [editorState, setEditorState] = useState<'import_selection' | 'active_editing'>(() => {
    return initialDocument ? 'active_editing' : 'import_selection';
  });
  const [sourceCode, setSourceCode] = useState<string>(() => {
    if (initialDocument?.rawSource) return initialDocument.rawSource;
    const latest = uastDraftService.getLatestLocalDraft();
    if (latest?.rawSource) return latest.rawSource;
    return PRESETS.json.code;
  });
  const [sourceFormat, setSourceFormat] = useState<string>(() => {
    if (initialDocument?.rawFormat) return initialDocument.rawFormat;
    const latest = uastDraftService.getLatestLocalDraft();
    if (latest?.rawFormat) return latest.rawFormat;
    return 'json';
  });
  const [activeDoc, setActiveDoc] = useState<UastDocument | null>(() => {
    if (initialDocument) return initialDocument;
    const latest = uastDraftService.getLatestLocalDraft();
    if (latest) return latest;
    try {
      return uastAdapterFactory.parse(PRESETS.json.code, 'json', {
        serviceName: PRESETS.json.title,
        serviceCode: PRESETS.json.serviceCode
      });
    } catch {
      return null;
    }
  });

  // Fullscreen controller for screens
  const [fullscreenTarget, setFullscreenTarget] = useState<FullscreenTarget>('none');
  const [copiedSource, setCopiedSource] = useState<boolean>(false);

  // File Upload Reference and Format target
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUploadFormat, setTargetUploadFormat] = useState<string>('json');

  const triggerFilePicker = (format: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetUploadFormat(format);
    if (fileInputRef.current) {
      if (format === 'json') fileInputRef.current.accept = '.json,application/json';
      else if (format === 'markdown') fileInputRef.current.accept = '.md,.markdown,text/markdown,text/plain';
      else if (format === 'soap') fileInputRef.current.accept = '.xml,.wsdl,text/xml,application/xml';
      else if (format === 'openapi') fileInputRef.current.accept = '.yaml,.yml,.json';
      else if (format === 'postman') fileInputRef.current.accept = '.json';
      else fileInputRef.current.accept = '*/*';
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const ext = file.name.split('.').pop()?.toLowerCase();
      let detectedFormat = targetUploadFormat;
      if (ext === 'yaml' || ext === 'yml') detectedFormat = 'openapi';
      if (ext === 'xml' || ext === 'wsdl') detectedFormat = 'soap';
      if (ext === 'md') detectedFormat = 'markdown';

      setSourceFormat(detectedFormat);
      setSourceCode(content);

      try {
        const parsed = uastAdapterFactory.parse(content, detectedFormat, {
          serviceName: baseName || 'ملف مستورد حديثاً',
          serviceCode: baseName.toUpperCase().replace(/[^A-Z0-9_]/g, '_') || 'IMPORTED_API',
          status: 'PRIVATE_DRAFT'
        });
        parsed.updatedAt = new Date().toISOString();
        setActiveDoc(parsed);
        uastDraftService.saveLocalImmediate(parsed);
        setEditorState('active_editing');
      } catch (err: any) {
        alert(`تم قراءة محتوى الملف بنجاح. يمكنك الآن مراجعته وتعديله مباشرة في المحرر.`);
        setEditorState('active_editing');
      }
    };
    reader.readAsText(file);
  };

  // ── Live Editing Highlight & Auto-Navigation State ──
  const [highlightedField, setHighlightedField] = useState<string | null>(null);

  // Auto-scroll Screen 3 (PDF Preview) to the modified row
  useEffect(() => {
    if (!highlightedField) return;
    const el3 = document.getElementById(`col3-field-${highlightedField}`);
    if (el3) {
      el3.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlightedField]);

  // ── Center Modal Alert State ──
  const [centerModal, setCenterModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // ── Tab 2: [المسودات] State ──
  const [draftsList, setDraftsList] = useState<UastDocument[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [draftPdfFullscreen, setDraftPdfFullscreen] = useState<boolean>(false);

  // ── Tab 3: [المرفوعات] State ──
  const [submissionsList, setSubmissionsList] = useState<UastDocument[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [subPdfFullscreen, setSubPdfFullscreen] = useState<boolean>(false);

  // Refresh lists on tab change
  const refreshStorageLists = () => {
    const allDrafts = uastDraftService.listDrafts();
    const privateDrafts = allDrafts.filter(d => d.status === 'PRIVATE_DRAFT' || d.status === 'CHANGES_REQUESTED');
    setDraftsList(privateDrafts);
    if (privateDrafts.length > 0 && !selectedDraftId) {
      setSelectedDraftId(privateDrafts[0].documentId);
    }

    const submitted = allDrafts.filter(d => d.status === 'PENDING_REVIEW' || d.status === 'PUBLISHED');
    setSubmissionsList(submitted);
    if (submitted.length > 0 && !selectedSubmissionId) {
      setSelectedSubmissionId(submitted[0].documentId);
    }
  };

  useEffect(() => {
    refreshStorageLists();
  }, [activeTab]);

  // ── Continuous Auto-Save to Drafts (Debounced 500ms) ──
  useEffect(() => {
    if (!activeDoc) return;
    const currentDoc: UastDocument = {
      ...activeDoc,
      rawSource: sourceCode,
      rawFormat: sourceFormat,
      updatedAt: new Date().toISOString()
    };
    uastDraftService.saveLocalImmediate(currentDoc);

    const timer = setTimeout(() => {
      uastDraftService.saveDraft(currentDoc).then(() => {
        const allDrafts = uastDraftService.listDrafts();
        const privateDrafts = allDrafts.filter(d => d.status === 'PRIVATE_DRAFT' || d.status === 'CHANGES_REQUESTED');
        setDraftsList(privateDrafts);
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [activeDoc, sourceCode, sourceFormat]);

  // ── Auto-save on page exit or refresh (beforeunload) ──
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeDoc) {
        const docToSave: UastDocument = {
          ...activeDoc,
          rawSource: sourceCode,
          rawFormat: sourceFormat,
          updatedAt: new Date().toISOString()
        };
        uastDraftService.saveLocalImmediate(docToSave);
        uastDraftService.saveDraft(docToSave);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeDoc, sourceCode, sourceFormat]);

  // ── Action: Start Fresh New Documentation ──
  const handleStartNewDoc = () => {
    const initialBlankJson = JSON.stringify({
      serviceCode: "NEW_API_SERVICE",
      serviceName: "خدمة مالية جديدة",
      version: "1.0.0",
      channel: {
        protocol: "REST",
        method: "POST",
        endpointPath: "/api/v1/new-service"
      },
      request: {
        requestId: "REQ-001",
        accountNumber: "1234567890",
        amount: 1000,
        currency: "YER"
      }
    }, null, 2);

    try {
      const blankDoc = uastAdapterFactory.parse(initialBlankJson, 'json', {
        serviceCode: "NEW_API_SERVICE",
        serviceName: "خدمة مالية جديدة",
        status: 'PRIVATE_DRAFT'
      });
      setSourceFormat('json');
      setSourceCode(initialBlankJson);
      setActiveDoc(blankDoc);
      uastDraftService.saveLocalImmediate(blankDoc);
      uastDraftService.saveDraft(blankDoc).then(() => refreshStorageLists());
      setEditorState('active_editing');
    } catch (e) {
      console.error(e);
    }
  };

  // ── Action: Select Format Card in Tab 1 Import Hub ──
  const handleSelectFormatCard = (format: string, defaultCode = '') => {
    let codeToUse = defaultCode;
    let titleToUse = 'خدمة موثقة جديدة';
    let codeIdToUse = 'SVC_NEW';

    if (!codeToUse) {
      if (format === 'json') {
        codeToUse = PRESETS.json.code;
        titleToUse = PRESETS.json.title;
        codeIdToUse = PRESETS.json.serviceCode;
      } else if (format === 'soap') {
        codeToUse = PRESETS.soap.code;
        titleToUse = PRESETS.soap.title;
        codeIdToUse = PRESETS.soap.serviceCode;
      } else if (format === 'openapi') {
        codeToUse = PRESETS.openapi.code;
        titleToUse = PRESETS.openapi.title;
        codeIdToUse = PRESETS.openapi.serviceCode;
      } else if (format === 'markdown') {
        codeToUse = PRESETS.markdown.code;
        titleToUse = PRESETS.markdown.title;
        codeIdToUse = PRESETS.markdown.serviceCode;
      } else if (format === 'postman') {
        codeToUse = PRESETS.postman.code;
        titleToUse = PRESETS.postman.title;
        codeIdToUse = PRESETS.postman.serviceCode;
      } else {
        codeToUse = JSON.stringify({
          serviceCode: "NEW_API_SERVICE",
          serviceName: "خدمة مالية جديدة",
          version: "1.0.0",
          channel: {
            protocol: "REST",
            method: "POST",
            endpointPath: "/api/v1/new-service"
          },
          request: {
            requestId: "REQ-001",
            amount: 500,
            currency: "YER"
          }
        }, null, 2);
      }
    }

    const fmt = format === 'manual' ? 'json' : format;
    setSourceFormat(fmt);
    setSourceCode(codeToUse);

    try {
      const parsed = uastAdapterFactory.parse(codeToUse, fmt, {
        serviceName: titleToUse,
        serviceCode: codeIdToUse,
        status: 'PRIVATE_DRAFT'
      });
      setActiveDoc(parsed);
      uastDraftService.saveLocalImmediate(parsed);
      setEditorState('active_editing');
    } catch (e: any) {
      alert(`خطأ في قراءة الصيغة: ${e.message}`);
    }
  };

  // Synchronize AST when source code changes in active editing
  const syncSourceToAst = (newSource: string, format: string, activeKey?: string | null) => {
    setSourceCode(newSource);
    if (activeKey) {
      setHighlightedField(activeKey);
    }

    try {
      const parsed = uastAdapterFactory.parse(newSource, format, {
        documentId: activeDoc?.documentId,
        serviceCode: activeDoc?.serviceCode || 'SERVICE_DOC',
        serviceName: activeDoc?.serviceName || 'خدمة موثقة حديثاً',
        status: activeDoc?.status || 'PRIVATE_DRAFT',
        channel: activeDoc?.channel
      });
      parsed.updatedAt = new Date().toISOString();
      parsed.rawSource = newSource;
      parsed.rawFormat = format;
      setActiveDoc(parsed);
    } catch {
      // Incomplete syntax during live typing; leniently extract fields so table updates immediately without waiting
      const extracted = extractLenientFields(newSource);
      if (extracted.length > 0 && activeDoc) {
        const syntheticChildren: IUastNode[] = extracted.map((f, i) => ({
          nodeId: `lenient_node_${i}_${f.name}`,
          structure: {
            path: f.path,
            depth: 1,
            isLeaf: true
          },
          semantics: {
            name: f.name,
            dataType: f.type,
            description: `الحقل ${f.name} (تحديث حي)`
          },
          constraints: {
            required: true
          },
          governance: {
            securityLevel: 'PUBLIC',
            exampleValue: f.value
          },
          children: []
        }));

        setActiveDoc(prev => prev ? ({
          ...prev,
          rawSource: newSource,
          updatedAt: new Date().toISOString(),
          requestTree: {
            ...prev.requestTree,
            children: syntheticChildren
          }
        }) : null);
      } else if (activeDoc) {
        setActiveDoc(prev => prev ? ({
          ...prev,
          rawSource: newSource,
          updatedAt: new Date().toISOString()
        }) : null);
      }
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSource = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // Find key being edited on current line
    const textBeforeCursor = newSource.substring(0, cursorPos);
    const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
    const nextLineEnd = newSource.indexOf('\n', cursorPos);
    const lineEnd = nextLineEnd === -1 ? newSource.length : nextLineEnd;
    const currentLine = newSource.substring(lineStart, lineEnd);
    
    const keyMatch = currentLine.match(/^\s*["']?([a-zA-Z0-9_.-]+)["']?\s*:/);
    const activeKey = keyMatch ? keyMatch[1] : null;

    syncSourceToAst(newSource, sourceFormat, activeKey);
  };

  // Switch format directly from the dropdown menu
  const handleSelectFormat = (formatKey: keyof typeof PRESETS) => {
    const preset = PRESETS[formatKey] || PRESETS.json;
    setSourceFormat(preset.format);
    setSourceCode(preset.code);
    try {
      const parsed = uastAdapterFactory.parse(preset.code, preset.format, {
        serviceName: preset.title,
        serviceCode: preset.serviceCode
      });
      parsed.updatedAt = new Date().toISOString();
      setActiveDoc(parsed);
    } catch {
      // ignore
    }
  };

  // Convert active UAST Document to full Catalog Endpoint for SpecViewer
  const endpointPreview = useMemo<Endpoint | null>(() => {
    if (!activeDoc) return null;

    const params: Endpoint['params'] = (activeDoc.headers || []).map(h => ({
      name: h.semantics.name,
      type: h.semantics.dataType,
      req: h.constraints.required,
      rule: h.semantics.description,
      tag: h.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'Security' : 'General',
      tagClass: h.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'badge-purple' : 'badge-blue'
    }));

    const flattenParams = (node: IUastNode) => {
      if (node.structure.path && node.structure.path !== '$') {
        const valStr = node.governance?.exampleValue !== undefined && node.governance?.exampleValue !== null 
          ? String(node.governance.exampleValue)
          : '';
        params.push({
          name: node.semantics.name,
          type: node.semantics.dataType,
          req: node.constraints.required,
          rule: valStr ? `القيمة الحية: ${valStr}` : node.semantics.description,
          tag: valStr ? valStr : (node.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'PII' : 'Payload'),
          tagClass: node.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'badge-amber' : 'badge-green'
        });
      }
      for (const c of node.children) {
        flattenParams(c);
      }
    };
    flattenParams(activeDoc.requestTree);

    return {
      id: `ep_uast_${activeDoc.documentId || 'live_edit'}`,
      method: activeDoc.channel.method,
      path: activeDoc.channel.endpointPath,
      shortName: activeDoc.serviceCode.toLowerCase().replace(/_/g, '-'),
      desc: activeDoc.serviceName,
      descEn: activeDoc.serviceNameEn || activeDoc.serviceName,
      isDraft: activeDoc.status !== 'PUBLISHED',
      statusBadge: `v${activeDoc.semver}`,
      releaseId: activeDoc.publishedVersionId,
      systemKey: 'DOC_GATEWAY',
      params,
      rules: (activeDoc.errorCodes || []).map((err, i) => ({
        id: `BR_${activeDoc.serviceCode}_00${i + 1}`,
        name: err.message,
        err: err.code
      })),
      payload: sourceCode || activeDoc.rawSource,
      res200: JSON.stringify({ 
        status: "SUCCESS", 
        code: "SETTLED_200", 
        timestamp: new Date().toISOString(),
        version: activeDoc.semver 
      }, null, 2)
    };
  }, [activeDoc, sourceCode]);

  // ── Action: Save as Draft (Center Modal) ──
  const handleSaveAsDraft = async () => {
    if (!activeDoc) return;

    await uastDraftService.saveDraft({
      ...activeDoc,
      rawSource: sourceCode,
      rawFormat: sourceFormat,
      status: 'PRIVATE_DRAFT'
    });

    setCenterModal({
      isOpen: true,
      title: 'تأكيد العملية',
      message: 'تم حفظ المسودة بنجاح في سجل مسوداتك الخاصة.',
      onConfirm: () => {
        setCenterModal(null);
        refreshStorageLists();
        setEditorState('import_selection');
      }
    });
  };

  // ── Action: Submit to Reviewer (Center Modal + Move to Tab 3) ──
  const handleSubmitToReviewer = async () => {
    if (!activeDoc) return;

    const docToSubmit = {
      ...activeDoc,
      rawSource: sourceCode,
      rawFormat: sourceFormat,
      status: 'PENDING_REVIEW' as const
    };
    await uastDraftService.saveDraft(docToSubmit);

    setCenterModal({
      isOpen: true,
      title: 'تم رفع الوثيقة بنجاح',
      message: 'تم إرسال الوثيقة للمشرف الرقابي للاعتماد.',
      onConfirm: () => {
        setCenterModal(null);
        refreshStorageLists();
        setEditorState('import_selection');
        setActiveTab('submissions');
        if (onPublishSuccess) {
          onPublishSuccess(docToSubmit);
        }
      }
    });
  };

  // ── Action in Tab 2: [استكمال] ──
  const handleResumeDraft = (draft: UastDocument) => {
    setActiveDoc(draft);
    setSourceCode(draft.rawSource || JSON.stringify(draft.requestTree, null, 2));
    setSourceFormat(draft.rawFormat || 'json');
    setEditorState('active_editing');
    setActiveTab('add'); // Switch to Tab 1 with 3 screens loaded!
  };

  // ── Action: Delete Draft ──
  const handleDeleteDraft = (docId: string) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذه المسودة نهائياً؟')) {
      uastDraftService.deleteDraft(docId);
      refreshStorageLists();
    }
  };

  // Selected Draft / Submission Resolution
  const selectedDraft = useMemo(() => {
    return draftsList.find(d => d.documentId === selectedDraftId) || draftsList[0] || null;
  }, [draftsList, selectedDraftId]);

  const selectedSubmission = useMemo(() => {
    return submissionsList.find(s => s.documentId === selectedSubmissionId) || submissionsList[0] || null;
  }, [submissionsList, selectedSubmissionId]);

  return (
    <div className="doc-center-root" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      
      {/* ── TOP NAVIGATION TABS (Strictly matching IamManagementView / Image 1 styling) ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '0 1.25rem',
          backgroundColor: '#090f19',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setActiveTab('add')}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'add' ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === 'add' ? '#10b981' : 'var(--text-dim, #9ca3af)',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease'
            }}
          >
            <PlusCircle size={17} />
            <span>إضافة توثيق</span>
          </button>

          <button
            onClick={() => setActiveTab('drafts')}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'drafts' ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === 'drafts' ? '#10b981' : 'var(--text-dim, #9ca3af)',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={17} />
            <span>المسودات</span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.1rem 0.5rem',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '999px',
                color: activeTab === 'drafts' ? '#10b981' : '#cbd5e1'
              }}
            >
              {draftsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'submissions' ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === 'submissions' ? '#10b981' : 'var(--text-dim, #9ca3af)',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease'
            }}
          >
            <CheckCircle2 size={17} />
            <span>المرفوعات</span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.1rem 0.5rem',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '999px',
                color: activeTab === 'submissions' ? '#10b981' : '#cbd5e1'
              }}
            >
              {submissionsList.length}
            </span>
          </button>
        </div>

        {/* Studio Actions in Tab Header */}
        {activeTab === 'add' && editorState === 'active_editing' && activeDoc && (
          <div className="studio-actions-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              className="studio-btn-save"
              onClick={() => setEditorState('import_selection')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="العودة لاختيار صيغة أو استيراد ملف آخر"
            >
              <span>← العودة للاستيراد</span>
            </button>

            <button 
              className={`studio-icon-btn ${fullscreenTarget === 'all' ? 'is-active' : ''}`}
              onClick={() => setFullscreenTarget(prev => prev === 'all' ? 'none' : 'all')}
              title="ملء الشاشة للشاشات الثلاث"
              aria-label="ملء الشاشة للشاشات الثلاث"
            >
              {fullscreenTarget === 'all' ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button 
              className="studio-btn-save"
              onClick={handleSaveAsDraft}
            >
              حفظ كمسودة
            </button>

            <button 
              className="studio-btn-submit"
              onClick={handleSubmitToReviewer}
            >
              رفع إلى المراجع
            </button>
          </div>
        )}
      </div>

      {/* ── CENTER MODAL DIALOG ── */}
      {centerModal && centerModal.isOpen && (
        <div className="center-modal-backdrop">
          <div className="center-modal-card">
            <h3 className="center-modal-title">{centerModal.title}</h3>
            <p className="center-modal-body">{centerModal.message}</p>
            <div className="center-modal-actions">
              <button 
                className="btn-sovereign-primary"
                onClick={centerModal.onConfirm}
              >
                موافق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: [إضافة توثيق] - 1. IMPORT SELECTION HUB
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'add' && editorState === 'import_selection' && (
        <div className="import-selection-screen">
          <div className="import-hero-title">
            <h2>استيراد وتوثيق API جديد</h2>
            <p>اختر الصيغة التي ترغب باستيرادها أو ابدأ التوثيق المباشر لفتح الشاشات الثلاث المتزامنة.</p>
          </div>

          {/* Hidden File Input for Native File System Picking */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelected} 
            style={{ display: 'none' }} 
          />

          {/* Format Cards Grid */}
          <div className="format-cards-grid">
            <div className="format-selection-card">
              <span className="card-badge-format">JSON</span>
              <h3>صيغة JSON</h3>
              <p>استيراد نماذج طلبات واستجابات الـ JSON وتفكيك بنية الحقول تلقائياً.</p>
              <div className="format-card-actions">
                <button 
                  className="btn-card-action is-upload"
                  onClick={(e) => triggerFilePicker('json', e)}
                >
                  <Upload size={14} />
                  <span>استيراد ملف JSON من جهازك</span>
                </button>
                <button 
                  className="btn-card-secondary"
                  onClick={() => handleSelectFormatCard('json')}
                >
                  استخدام نموذج افتراضي
                </button>
              </div>
            </div>

            <div className="format-selection-card">
              <span className="card-badge-format">MARKDOWN</span>
              <h3>صيغة Markdown</h3>
              <p>استخراج جداول الحقول ونماذج الأكواد الموثقة في ملفات الـ Markdown.</p>
              <div className="format-card-actions">
                <button 
                  className="btn-card-action is-upload"
                  onClick={(e) => triggerFilePicker('markdown', e)}
                >
                  <Upload size={14} />
                  <span>استيراد ملف Markdown (.md)</span>
                </button>
                <button 
                  className="btn-card-secondary"
                  onClick={() => handleSelectFormatCard('markdown')}
                >
                  استخدام نموذج افتراضي
                </button>
              </div>
            </div>

            <div className="format-selection-card">
              <span className="card-badge-format">SOAP / XML</span>
              <h3>صيغة SOAP / XML</h3>
              <p>تحليل أغلفة الـ SOAP المصرفية ورسائل WSDL وتفكيك الترويسات والمتن.</p>
              <div className="format-card-actions">
                <button 
                  className="btn-card-action is-upload"
                  onClick={(e) => triggerFilePicker('soap', e)}
                >
                  <Upload size={14} />
                  <span>استيراد ملف WSDL / XML</span>
                </button>
                <button 
                  className="btn-card-secondary"
                  onClick={() => handleSelectFormatCard('soap')}
                >
                  استخدام نموذج افتراضي
                </button>
              </div>
            </div>

            <div className="format-selection-card">
              <span className="card-badge-format">OPENAPI</span>
              <h3>صيغة OpenAPI / Swagger</h3>
              <p>قراءة مواصفات الـ REST والشروط والمسارات المعيارية (YAML أو JSON).</p>
              <div className="format-card-actions">
                <button 
                  className="btn-card-action is-upload"
                  onClick={(e) => triggerFilePicker('openapi', e)}
                >
                  <Upload size={14} />
                  <span>استيراد مواصفات OpenAPI (.yaml/.json)</span>
                </button>
                <button 
                  className="btn-card-secondary"
                  onClick={() => handleSelectFormatCard('openapi')}
                >
                  استخدام نموذج افتراضي
                </button>
              </div>
            </div>

            <div className="format-selection-card">
              <span className="card-badge-format">POSTMAN</span>
              <h3>مجموعات Postman</h3>
              <p>استيراد ملفات Postman Collection الجاهزة وتحويل الطلبات لمواصفات معتمدة.</p>
              <div className="format-card-actions">
                <button 
                  className="btn-card-action is-upload"
                  onClick={(e) => triggerFilePicker('postman', e)}
                >
                  <Upload size={14} />
                  <span>استيراد مجموعة Postman (.json)</span>
                </button>
                <button 
                  className="btn-card-secondary"
                  onClick={() => handleSelectFormatCard('postman')}
                >
                  استخدام نموذج افتراضي
                </button>
              </div>
            </div>

            <div className="format-selection-card">
              <span className="card-badge-format">MANUAL</span>
              <h3>إدخال يدوي مباشر</h3>
              <p>فتح الشاشات الثلاث بنموذج فارغ للبدء بكتابة وتوثيق الـ API من الصفر.</p>
              <div className="format-card-actions">
                <button 
                  className="btn-card-action"
                  onClick={handleStartNewDoc}
                  style={{ width: '100%' }}
                >
                  فتح الشاشات الثلاث (نموذج فارغ)
                </button>
              </div>
            </div>
          </div>

          {/* Quick Bank Presets */}
          <div className="quick-presets-box">
            <span className="presets-label">نماذج بنكية وطنية سريعة للاختبار المباشر:</span>
            <div className="presets-buttons-row">
              <button onClick={() => handleSelectFormatCard('json', PRESETS.json.code)}>التحويل المالي اللحظي IPS</button>
              <button onClick={() => handleSelectFormatCard('soap', PRESETS.soap.code)}>استعلام الرصيد SOAP</button>
              <button onClick={() => handleSelectFormatCard('openapi', PRESETS.openapi.code)}>حماية الأجور WPS</button>
              <button onClick={() => handleSelectFormatCard('markdown', PRESETS.markdown.code)}>بطاقات الخصم Markdown</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: [إضافة توثيق] - 2. STUDIO 3 SCREENS (Strictly matching Image 2)
          Single Screen, Zero Page Scroll
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'add' && editorState === 'active_editing' && activeDoc && (
        <div className={`studio-workbench-container fs-${fullscreenTarget}`}>
          
          {/* Studio 3 Split Screens */}
          <div className="studio-screens-grid">
            
            {/* ── SCREEN 1: SOURCE CODE (كود المصدر مع قائمة الصيغ المنسدلة) ── */}
            <div className={`studio-screen-card screen-source ${fullscreenTarget === 'code' ? 'is-maximized' : ''}`}>
              <div className="studio-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="studio-pane-pill">1. كود المصدر (Source Code)</span>
                  
                  {/* Space-Saving Compact Dropdown Menu matching Image 2 */}
                  <select 
                    className="studio-format-select"
                    value={sourceFormat}
                    onChange={(e) => handleSelectFormat(e.target.value as any)}
                  >
                    <option value="json">صيغة JSON</option>
                    <option value="markdown">صيغة Markdown</option>
                    <option value="soap">صيغة SOAP / XML</option>
                    <option value="openapi">صيغة OpenAPI / Swagger</option>
                    <option value="postman">مجموعة Postman Collection</option>
                    <option value="manual">إدخال يدوي مباشر</option>
                  </select>

                  <span 
                    style={{
                      fontSize: '0.68rem',
                      color: '#10b981',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      padding: '2px 7px',
                      borderRadius: '10px'
                    }}
                    title="التعديلات التي تجريها في الكود تنعكس مباشرة في شاشتي المعاينة"
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                    تعديل مباشر
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <button 
                    className="studio-icon-btn"
                    onClick={() => triggerFilePicker(sourceFormat)}
                    title="استيراد ملف من جهازك"
                    aria-label="استيراد ملف"
                    style={{ gap: '4px', padding: '0.2rem 0.55rem', fontSize: '0.75rem', color: '#38bdf8' }}
                  >
                    <Upload size={13} />
                    <span>استيراد ملف</span>
                  </button>

                  <button 
                    className="studio-icon-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(sourceCode);
                      setCopiedSource(true);
                      setTimeout(() => setCopiedSource(false), 2000);
                    }}
                    title="نسخ الكود"
                    aria-label="نسخ الكود"
                  >
                    {copiedSource ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                  </button>

                  <button 
                    className="studio-icon-btn"
                    onClick={() => setFullscreenTarget(prev => prev === 'code' ? 'none' : 'code')}
                    title="ملء شاشة الكود"
                    aria-label="ملء شاشة الكود"
                  >
                    {fullscreenTarget === 'code' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                </div>
              </div>

              <div className="studio-card-body-editor">
                <textarea 
                  className="studio-code-textarea"
                  value={sourceCode}
                  onChange={handleCodeChange}
                  placeholder="اكتب أو الصق كود الـ API هنا..."
                  dir="ltr"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* ── SCREEN 2: LIVE WEB PREVIEW (معاينة حقيقية كاملة للموقع كأنك داخل النظام) ── */}
            <div 
              className={`studio-screen-card screen-web studio-card-active ${fullscreenTarget === 'web' ? 'is-maximized' : ''}`}
              style={{
                border: '2px solid #10b981',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.15)'
              }}
            >
              <div className="studio-card-header" style={{ borderBottomColor: 'rgba(16, 185, 129, 0.25)' }}>
                <span className="studio-pane-pill" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                  2. معاينة البوابة (Live Portal)
                </span>
                
                <button 
                  className="studio-icon-btn"
                  onClick={() => setFullscreenTarget(prev => prev === 'web' ? 'none' : 'web')}
                  title="ملء شاشة الموقع"
                  aria-label="ملء شاشة الموقع"
                >
                  {fullscreenTarget === 'web' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>

              {/* Full Detailed Spec Viewer inside the panel */}
              <div className="studio-card-body-scroll spec-viewer-contained">
                {endpointPreview ? (
                  <SpecViewer 
                    key={activeDoc.documentId} 
                    endpoint={endpointPreview} 
                    highlightedField={highlightedField} 
                  />
                ) : (
                  <div className="empty-state-notice">جاري تجهيز بيانات المعاينة...</div>
                )}
              </div>
            </div>

            {/* ── SCREEN 3: LIVE PDF DOCUMENT PREVIEW (الوثيقة الرسمية الكاملة) ── */}
            <div className={`studio-screen-card screen-pdf ${fullscreenTarget === 'pdf' ? 'is-maximized' : ''}`}>
              <div className="studio-card-header">
                <span className="studio-pane-pill">3. الوثيقة الرسمية (A4 Banking PDF)</span>
                
                <button 
                  className="studio-icon-btn"
                  onClick={() => setFullscreenTarget(prev => prev === 'pdf' ? 'none' : 'pdf')}
                  title="ملء شاشة الـ PDF"
                  aria-label="ملء شاشة الـ PDF"
                >
                  {fullscreenTarget === 'pdf' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>

              <div className="studio-card-body-scroll studio-pdf-scroll">
                <div className="pdf-paper-sheet">
                  <div className="pdf-header-row">
                    <div>
                      <h1 className="pdf-org-title">الجمهورية اليمنية</h1>
                      <h2 className="pdf-doc-title">المنظومة الوطنية لحوكمة وتوثيق الـ APIs المصرفية</h2>
                    </div>
                    <div className="pdf-stamp-badge">
                      <span>وثيقة معتمدة</span>
                      <span className="stamp-sub">Official Specification</span>
                    </div>
                  </div>

                  <hr className="pdf-divider" />

                  <div className="pdf-meta-grid">
                    <div><strong>اسم الخدمة:</strong> {activeDoc.serviceName}</div>
                    <div><strong>كود الخدمة:</strong> <span dir="ltr">{activeDoc.serviceCode}</span></div>
                    <div><strong>البروتوكول:</strong> {activeDoc.channel.protocol}</div>
                    <div><strong>طريقة الاستدعاء:</strong> <span dir="ltr">{activeDoc.channel.method}</span></div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <strong>المسار المعتمد:</strong> <span className="code-font" dir="ltr">{activeDoc.channel.endpointPath}</span>
                    </div>
                  </div>

                  <h3 className="pdf-section-heading">أولاً: مواصفات حقول الطلب (Request Parameters)</h3>
                  <div className="pdf-table-wrapper">
                    <table className="pdf-formal-table">
                      <thead>
                        <tr>
                          <th>اسم الحقل</th>
                          <th>نوع البيانات</th>
                          <th>الإلزام</th>
                          <th>القيمة الحية (Live Value)</th>
                          <th>مستوى السرية</th>
                          <th>الوصف والشروط الرقابية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderPdfTableRows(activeDoc.requestTree, 0, highlightedField)}
                      </tbody>
                    </table>
                  </div>

                  <h3 className="pdf-section-heading">ثانياً: ترويسات الأمان والمصادقة (Headers)</h3>
                  <div className="pdf-table-wrapper">
                    <table className="pdf-formal-table">
                      <thead>
                        <tr>
                          <th>المفتاح</th>
                          <th>النوع</th>
                          <th>الوصف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeDoc.headers.map((h, i) => (
                          <tr key={i}>
                            <td className="code-font" dir="ltr">{h.semantics.name}</td>
                            <td>{h.semantics.dataType}</td>
                            <td>{h.semantics.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {(activeDoc.errorCodes || []).length > 0 && (
                    <>
                      <h3 className="pdf-section-heading">ثالثاً: مصفوفة أكواد الأخطاء والإجراءات (Error Matrix)</h3>
                      <div className="pdf-table-wrapper">
                        <table className="pdf-formal-table">
                          <thead>
                            <tr>
                              <th>كود الخطأ</th>
                              <th>الرسالة التوضيحية</th>
                              <th>الإجراء التصحيحي المطلوب</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeDoc.errorCodes.map((err, i) => (
                              <tr key={i}>
                                <td className="code-font" dir="ltr">{err.code}</td>
                                <td>{err.message}</td>
                                <td>{err.action}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  <div className="pdf-footer-block">
                    <div className="pdf-signatures-row">
                      <div>
                        <span className="sign-label">توقيع مسؤول التوثيق:</span>
                        <span className="sign-line">معتمد إلكترونياً</span>
                      </div>
                      <div>
                        <span className="sign-label">اعتماد المشرف الرقابي:</span>
                        <span className="sign-line">بانتظار الاعتماد النهائي</span>
                      </div>
                    </div>
                    <div className="pdf-security-notice">
                      هذه الوثيقة صادرة عن البنك المركزي / المنظومة الوطنية وتعتبر مرجعاً ملزماً لكافة المطورين.
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: [المسودات] - DRAFTS SPLIT VIEW (Clean, No Fluff Text)
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'drafts' && (
        <div className="studio-split-container">
          
          {/* Right Column (35%): Drafts Rows List */}
          <div className="studio-list-column">
            {draftsList.length === 0 ? (
              <div className="empty-state-notice">
                لا توجد أي مسودات محفوظة حالياً.
              </div>
            ) : (
              <div className="items-rows-stack">
                {draftsList.map((draft) => {
                  const isSelected = draft.documentId === selectedDraftId;
                  return (
                    <div 
                      key={draft.documentId}
                      className={`item-row-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedDraftId(draft.documentId)}
                    >
                      <div className="row-content-main">
                        <div className="row-title-row">
                          <span className="row-service-code">{draft.serviceCode}</span>
                          <strong className="row-service-name">{draft.serviceName}</strong>
                        </div>
                        <div className="row-meta-row">
                          <span className="format-tag-pill">{draft.rawFormat || 'JSON'}</span>
                          <span className="date-text">{new Date(draft.updatedAt).toLocaleDateString('ar-YE')}</span>
                          {draft.status === 'CHANGES_REQUESTED' && (
                            <span className="status-warn-pill">مطلوب تعديلات</span>
                          )}
                        </div>
                      </div>

                      <button 
                        className="btn-row-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDraft(draft.documentId);
                        }}
                        title="حذف المسودة"
                      >
                        حذف
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Left Column (65%): Live PDF Preview + [استكمال] Button */}
          <div className={`studio-preview-column ${draftPdfFullscreen ? 'is-fullscreen' : ''}`}>
            {selectedDraft ? (
              <div className="preview-side-wrapper">
                <div className="studio-card-header">
                  <span className="studio-pane-pill">{selectedDraft.serviceCode} - {selectedDraft.serviceName}</span>
                  <button 
                    className="studio-icon-btn"
                    onClick={() => setDraftPdfFullscreen(prev => !prev)}
                    title="تكبير المعاينة"
                    aria-label="تكبير المعاينة"
                  >
                    {draftPdfFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  </button>
                </div>

                <div className="studio-card-body-scroll studio-pdf-scroll">
                  <div className="pdf-paper-sheet">
                    <div className="pdf-header-row">
                      <div>
                        <h1 className="pdf-org-title">الجمهورية اليمنية</h1>
                        <h2 className="pdf-doc-title">المنظومة الوطنية لحوكمة وتوثيق الـ APIs المصرفية</h2>
                      </div>
                      <div className="pdf-stamp-badge">
                        <span>مسودة عمل</span>
                        <span className="stamp-sub">Draft Version</span>
                      </div>
                    </div>
                    <hr className="pdf-divider" />
                    <div className="pdf-meta-grid">
                      <div><strong>اسم الخدمة:</strong> {selectedDraft.serviceName}</div>
                      <div><strong>كود الخدمة:</strong> <span dir="ltr">{selectedDraft.serviceCode}</span></div>
                      <div><strong>طريقة الاستدعاء:</strong> <span dir="ltr">{selectedDraft.channel.method}</span></div>
                      <div><strong>المسار:</strong> <span className="code-font" dir="ltr">{selectedDraft.channel.endpointPath}</span></div>
                    </div>
                    <h3 className="pdf-section-heading">مواصفات حقول الطلب (Request Parameters)</h3>
                    <div className="pdf-table-wrapper">
                      <table className="pdf-formal-table">
                        <thead>
                          <tr>
                            <th>الحقل</th>
                            <th>النوع</th>
                            <th>الإلزام</th>
                            <th>الوصف</th>
                          </tr>
                        </thead>
                        <tbody>
                          {renderPdfTableRows(selectedDraft.requestTree)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* THE PROMINENT RESUME BUTTON (Directly Below PDF Preview) */}
                <div className="preview-side-footer-action">
                  <button 
                    className="btn-resume-screens-prominent"
                    onClick={() => handleResumeDraft(selectedDraft)}
                  >
                    استكمال
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state-notice">
                حدد مسودة من القائمة لعرض الوثيقة واستكمالها.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: [المرفوعات] - SUBMISSIONS SPLIT VIEW (Clean, No Fluff Text)
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'submissions' && (
        <div className="studio-split-container">
          
          {/* Right Column (35%): Submissions Rows List */}
          <div className="studio-list-column">
            {submissionsList.length === 0 ? (
              <div className="empty-state-notice">
                لا توجد أي وثائق مرفوعة حالياً.
              </div>
            ) : (
              <div className="items-rows-stack">
                {submissionsList.map((sub) => {
                  const isSelected = sub.documentId === selectedSubmissionId;
                  return (
                    <div 
                      key={sub.documentId}
                      className={`item-row-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedSubmissionId(sub.documentId)}
                    >
                      <div className="row-content-main">
                        <div className="row-title-row">
                          <span className="row-service-code">{sub.serviceCode}</span>
                          <strong className="row-service-name">{sub.serviceName}</strong>
                        </div>
                        <div className="row-meta-row">
                          <span className="format-tag-pill">{sub.rawFormat || 'JSON'}</span>
                          <span className="date-text">{new Date(sub.updatedAt).toLocaleDateString('ar-YE')}</span>
                          {sub.status === 'PENDING_REVIEW' && (
                            <span className="status-pending-pill">قيد المراجعة</span>
                          )}
                          {sub.status === 'PUBLISHED' && (
                            <span className="status-approved-pill">معتمد ومنشور</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Left Column (65%): Live PDF Preview (Read-only, Clean) */}
          <div className={`studio-preview-column ${subPdfFullscreen ? 'is-fullscreen' : ''}`}>
            {selectedSubmission ? (
              <div className="preview-side-wrapper">
                <div className="studio-card-header">
                  <span className="studio-pane-pill">{selectedSubmission.serviceCode} - {selectedSubmission.serviceName}</span>
                  <button 
                    className="studio-icon-btn"
                    onClick={() => setSubPdfFullscreen(prev => !prev)}
                    title="تكبير المعاينة"
                    aria-label="تكبير المعاينة"
                  >
                    {subPdfFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  </button>
                </div>

                <div className="studio-card-body-scroll studio-pdf-scroll">
                  <div className="pdf-paper-sheet">
                    <div className="pdf-header-row">
                      <div>
                        <h1 className="pdf-org-title">الجمهورية اليمنية</h1>
                        <h2 className="pdf-doc-title">المنظومة الوطنية لحوكمة وتوثيق الـ APIs المصرفية</h2>
                      </div>
                      <div className="pdf-stamp-badge">
                        <span>{selectedSubmission.status === 'PUBLISHED' ? 'معتمد رسمياً' : 'قيد المراجعة'}</span>
                        <span className="stamp-sub">Under Governance</span>
                      </div>
                    </div>
                    <hr className="pdf-divider" />
                    <div className="pdf-meta-grid">
                      <div><strong>اسم الخدمة:</strong> {selectedSubmission.serviceName}</div>
                      <div><strong>كود الخدمة:</strong> <span dir="ltr">{selectedSubmission.serviceCode}</span></div>
                      <div><strong>الحالة:</strong> {selectedSubmission.status === 'PUBLISHED' ? 'منشور ومعتمد' : 'بانتظار المشرف'}</div>
                      <div><strong>المسار:</strong> <span className="code-font" dir="ltr">{selectedSubmission.channel.endpointPath}</span></div>
                    </div>
                    <h3 className="pdf-section-heading">مواصفات حقول الطلب (Request Parameters)</h3>
                    <div className="pdf-table-wrapper">
                      <table className="pdf-formal-table">
                        <thead>
                          <tr>
                            <th>الحقل</th>
                            <th>النوع</th>
                            <th>الإلزام</th>
                            <th>الوصف</th>
                          </tr>
                        </thead>
                        <tbody>
                          {renderPdfTableRows(selectedSubmission.requestTree)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state-notice">
                حدد وثيقة مرفوعة من القائمة لعرضها.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

// ── Recursive Table Renderers ──
function renderPdfTableRows(node: IUastNode, depth = 0, highlightedField?: string | null): React.ReactNode[] {
  const rows: React.ReactNode[] = [];
  if (node.structure.path && node.structure.path !== '$') {
    const val = node.governance?.exampleValue !== undefined && node.governance?.exampleValue !== null 
      ? String(node.governance.exampleValue) 
      : '-';
    const isHighlighted = highlightedField === node.semantics.name;
    rows.push(
      <tr 
        key={node.nodeId}
        id={`col3-field-${node.semantics.name}`}
        className={isHighlighted ? 'row-live-highlight' : ''}
      >
        <td className="code-font" dir="ltr" style={{ paddingRight: `${depth * 14 + 8}px` }}>
          {depth > 0 && '└─ '}
          {node.semantics.name}
        </td>
        <td>{node.semantics.dataType}</td>
        <td>{node.constraints.required ? 'إجباري' : 'اختياري'}</td>
        <td className="code-font" dir="ltr" style={{ color: '#059669', fontWeight: 700 }}>
          {val}
        </td>
        <td>{node.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'محجوب PII' : 'عام'}</td>
        <td>{node.semantics.description}</td>
      </tr>
    );
  }
  for (const child of node.children) {
    rows.push(...renderPdfTableRows(child, depth + 1, highlightedField));
  }
  return rows;
}
