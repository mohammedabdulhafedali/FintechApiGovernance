import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  PlusCircle, 
  FileText, 
  CheckCircle2, 
  Copy, 
  Check,
  Upload,
  Code,
  Globe,
  Columns,
  EyeOff,
  Pin,
  PinOff,
  ChevronDown,
  ChevronUp,
  Building2,
  Store,
  Scale,
  ShieldAlert,
  Receipt,
  Layers,
  BellRing,
  ArrowRight,
  ArrowLeft,
  Plus,
  FolderPlus,
  Sparkles,
  X,
  AlertCircle,
  AlertTriangle,
  Printer
} from 'lucide-react';
import { UastDocument, IUastNode, type DataType } from '../../services/uast/types';
import { Endpoint, SystemModule, SystemIntegration } from '../../types/schema';
import { INITIAL_SYSTEMS } from '../../data/mockData';
import { uastAdapterFactory } from '../../services/uast/adapters/AdapterFactory';
import { uastDraftService } from '../../services/uast/draftService';
import { SpecViewer } from './SpecViewer';
import { MarkdownDocumentRenderer } from './MarkdownDocumentRenderer';
import { EndpointsRibbon } from './EndpointsRibbon';
import { ApiDocumentationView } from './ApiDocumentationView';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { FloatingAlertCard, FloatingAlertState } from '../common/FloatingAlertCard';
import { formatSyntaxError } from '../../utils/syntaxErrorFormatter';
import { useLanguage } from '../../i18n';

interface UniversalWorkbenchProps {
  initialDocument?: UastDocument;
  onPublishSuccess?: (doc: UastDocument, targetSystemKey?: string, targetEntityKey?: string) => void;
  onBackToCatalog?: () => void;
  systems?: Record<string, SystemModule>;
  activeSystemKey?: string;
  activeIntegrationKey?: string;
  onAddSystem?: (newSystem: SystemModule) => void;
  onAddIntegration?: (systemKey: string, newIntegration: SystemIntegration) => void;
}

type WorkbenchTab = 'add' | 'drafts' | 'submissions';
type FullscreenTarget = 'none' | 'all' | 'code' | 'web' | 'pdf';

interface StudioSplitterProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  isDragging: boolean;
  title?: string;
}

const StudioSplitter: React.FC<StudioSplitterProps> = ({
  onMouseDown,
  onDoubleClick,
  isDragging,
  title = "اسحب لتعديل المسافة والعرض، أو انقر نقراً مزدوجاً لمساواة العرض"
}) => {
  return (
    <div
      className={`studio-resizer-handle ${isDragging ? 'is-dragging' : ''}`}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      title={title}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
    >
      <div className="resizer-visual-line" />
      <div className="resizer-visual-grip">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
};

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
  onPublishSuccess,
  onBackToCatalog,
  systems = {},
  activeSystemKey = '',
  activeIntegrationKey = '',
  onAddSystem,
  onAddIntegration
}) => {
  const { isRtl } = useLanguage();

  // ── Workbench Systems & Integrations Target State ──
  const [workbenchSystems, setWorkbenchSystems] = useState<Record<string, SystemModule>>(() => {
    return (systems && Object.keys(systems).length > 0) ? systems : INITIAL_SYSTEMS;
  });

  useEffect(() => {
    if (systems && Object.keys(systems).length > 0) {
      setWorkbenchSystems(systems);
    }
  }, [systems]);

  const [selectedSystemKey, setSelectedSystemKey] = useState<string>(() => {
    if (initialDocument?.systemKey) return initialDocument.systemKey;
    if (activeSystemKey && (systems[activeSystemKey] || INITIAL_SYSTEMS[activeSystemKey])) {
      return activeSystemKey;
    }
    const avail = (systems && Object.keys(systems).length > 0) ? systems : INITIAL_SYSTEMS;
    return Object.keys(avail)[0] || 'collection';
  });

  const [selectedEntityId, setSelectedEntityId] = useState<string>(() => {
    if (initialDocument?.entityId) return initialDocument.entityId;
    const avail = (systems && Object.keys(systems).length > 0) ? systems : INITIAL_SYSTEMS;
    const sys = avail[selectedSystemKey] || Object.values(avail)[0];
    if (activeIntegrationKey && sys?.integrations?.[activeIntegrationKey]) {
      return activeIntegrationKey;
    }
    return Object.keys(sys?.integrations || {})[0] || 'banking';
  });

  // Modals for Adding System & Entity Inline
  const [isAddSystemModalOpen, setIsAddSystemModalOpen] = useState(false);
  const [newSysNameAr, setNewSysNameAr] = useState('');
  const [newSysNameEn, setNewSysNameEn] = useState('');
  const [newSysCode, setNewSysCode] = useState('SYS_');
  const [newSysIcon, setNewSysIcon] = useState('Layers');
  const [newSysDesc, setNewSysDesc] = useState('');

  const [isAddEntityModalOpen, setIsAddEntityModalOpen] = useState(false);
  const [newEntityNameAr, setNewEntityNameAr] = useState('');
  const [newEntityNameEn, setNewEntityNameEn] = useState('');
  const [newEntityCode, setNewEntityCode] = useState('INT_');
  const [newEntityIcon, setNewEntityIcon] = useState('Building2');
  const [newEntityDirection, setNewEntityDirection] = useState<'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL'>('INBOUND');

  const getSystemIconElement = (iconName?: string) => {
    switch (iconName) {
      case 'Layers': return <Layers size={18} style={{ color: '#10b981' }} />;
      case 'Receipt': return <Receipt size={18} style={{ color: '#34d399' }} />;
      case 'Globe': return <Globe size={18} style={{ color: '#06b6d4' }} />;
      case 'BellRing': return <BellRing size={18} style={{ color: '#f59e0b' }} />;
      case 'ShieldAlert': return <ShieldAlert size={18} style={{ color: '#f43f5e' }} />;
      case 'Scale': return <Scale size={18} style={{ color: '#a855f7' }} />;
      case 'Building2': return <Building2 size={18} style={{ color: '#38bdf8' }} />;
      default: return <Layers size={18} style={{ color: '#10b981' }} />;
    }
  };

  const getEntityIconElement = (iconName?: string) => {
    switch (iconName) {
      case 'Building2': return <Building2 size={16} style={{ color: '#38bdf8' }} />;
      case 'Store': return <Store size={16} style={{ color: '#34d399' }} />;
      case 'Scale': return <Scale size={16} style={{ color: '#a855f7' }} />;
      case 'ShieldAlert': return <ShieldAlert size={16} style={{ color: '#f59e0b' }} />;
      case 'Globe': return <Globe size={16} style={{ color: '#06b6d4' }} />;
      default: return <Building2 size={16} style={{ color: '#38bdf8' }} />;
    }
  };

  const handleSystemChange = (newSysKey: string) => {
    setSelectedSystemKey(newSysKey);
    const targetSys = workbenchSystems[newSysKey];
    const availableInts = Object.keys(targetSys?.integrations || {});
    if (!targetSys?.integrations?.[selectedEntityId]) {
      setSelectedEntityId(availableInts[0] || '');
    }
  };

  const handleCreateSystem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSysNameAr.trim()) return;

    const generatedKey = (newSysNameEn.trim() || newSysNameAr.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '') || `sys_${Date.now()}`;

    const newSys: SystemModule = {
      key: generatedKey,
      name: newSysNameAr.trim(),
      nameEn: newSysNameEn.trim() || newSysNameAr.trim(),
      code: newSysCode.trim().toUpperCase() || `SYS_${generatedKey.toUpperCase()}`,
      icon: newSysIcon,
      description: newSysDesc.trim() || (isRtl ? 'نظام سيادي مالي معتمد' : 'Certified Sovereign Financial System'),
      status: 'ACTIVE',
      associatedSectorKeys: ['banking'],
      integrations: {
        banking: {
          entityId: 'banking',
          name: isRtl ? 'البنوك والمصارف المركزية' : 'Banks & Central Clearing',
          nameEn: 'Banks & Clearing Houses',
          code: 'INT_BANKING',
          icon: 'Building2',
          direction: 'INBOUND',
          endpoints: []
        }
      }
    };

    setWorkbenchSystems(prev => ({ ...prev, [generatedKey]: newSys }));
    setSelectedSystemKey(generatedKey);
    setSelectedEntityId('banking');

    if (onAddSystem) {
      onAddSystem(newSys);
    }

    setIsAddSystemModalOpen(false);
    setNewSysNameAr('');
    setNewSysNameEn('');
    setNewSysCode('SYS_');
    setNewSysDesc('');
  };

  const handleCreateEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntityNameAr.trim()) return;

    const generatedId = (newEntityNameEn.trim() || newEntityNameAr.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '') || `ent_${Date.now()}`;

    const newInt: SystemIntegration = {
      entityId: generatedId,
      name: newEntityNameAr.trim(),
      nameEn: newEntityNameEn.trim() || newEntityNameAr.trim(),
      code: newEntityCode.trim().toUpperCase() || `INT_${generatedId.toUpperCase()}`,
      icon: newEntityIcon,
      direction: newEntityDirection,
      endpoints: []
    };

    setWorkbenchSystems(prev => {
      const updated = { ...prev };
      const currentSys = updated[selectedSystemKey] || Object.values(updated)[0];
      if (currentSys) {
        updated[currentSys.key] = {
          ...currentSys,
          integrations: {
            ...(currentSys.integrations || {}),
            [generatedId]: newInt
          }
        };
      }
      return updated;
    });

    setSelectedEntityId(generatedId);

    if (onAddIntegration) {
      onAddIntegration(selectedSystemKey, newInt);
    }

    setIsAddEntityModalOpen(false);
    setNewEntityNameAr('');
    setNewEntityNameEn('');
    setNewEntityCode('INT_');
    setNewEntityDirection('INBOUND');
  };

  const currentSysObj = workbenchSystems[selectedSystemKey] || Object.values(workbenchSystems)[0];
  const currentIntObj = currentSysObj?.integrations?.[selectedEntityId] || Object.values(currentSysObj?.integrations || {})[0];
  const currentSysDisplayName = currentSysObj ? (isRtl ? currentSysObj.name : (currentSysObj.nameEn || currentSysObj.name)) : selectedSystemKey;
  const currentIntDisplayName = currentIntObj ? (isRtl ? currentIntObj.name : (currentIntObj.nameEn || currentIntObj.name)) : selectedEntityId;

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

  // Active endpoint index for multi-endpoint documents (OpenAPI, Postman, Markdown)
  const [selectedEndpointIndex, setSelectedEndpointIndex] = useState<number>(0);

  // View mode for Screen 3 (PDF Sheet): 'full_doc' for complete original document (matching document.pdf), or 'gov_summary' for structured governance card
  const [pdfViewMode, setPdfViewMode] = useState<'full_doc' | 'gov_summary'>('full_doc');

  // View mode for Screen 2 (Preview): 'portal' for interactive SpecViewer or 'doc' for complete document
  const [webViewMode, setWebViewMode] = useState<'portal' | 'doc'>('portal');

  // View mode for Tab 2 (Drafts) and Tab 3 (Submissions)
  const [draftViewMode, setDraftViewMode] = useState<'full_doc' | 'gov_summary'>('full_doc');
  const [subViewMode, setSubViewMode] = useState<'full_doc' | 'gov_summary'>('full_doc');

  // Fullscreen controller for screens
  const [fullscreenTarget, setFullscreenTarget] = useState<FullscreenTarget>('none');
  const fullscreenTargetRef = useRef<FullscreenTarget>('none');
  fullscreenTargetRef.current = fullscreenTarget;

  const [prevFullscreenTarget, setPrevFullscreenTarget] = useState<'none' | 'all'>('none');
  const prevFullscreenTargetRef = useRef<'none' | 'all'>('none');
  prevFullscreenTargetRef.current = prevFullscreenTarget;

  const [copiedSource, setCopiedSource] = useState<boolean>(false);

  // ── Multi-Pane Visibility & Dynamic Resizing State ──
  const [visiblePanes, setVisiblePanes] = useState<{ code: boolean; web: boolean; pdf: boolean }>({
    code: true,
    web: true,
    pdf: true
  });
  const visiblePanesRef = useRef(visiblePanes);
  visiblePanesRef.current = visiblePanes;

  // Toolbar Auto-hide & Pin State (Default: Auto-hide / Unpinned for max screen area)
  const [isToolbarPinned, setIsToolbarPinned] = useState<boolean>(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState<boolean>(false);
  const toolbarHoverTimeoutRef = useRef<any>(null);

  const handleToolbarMouseEnter = () => {
    if (toolbarHoverTimeoutRef.current) {
      clearTimeout(toolbarHoverTimeoutRef.current);
      toolbarHoverTimeoutRef.current = null;
    }
    setIsToolbarHovered(true);
  };

  const handleToolbarMouseLeave = () => {
    if (toolbarHoverTimeoutRef.current) {
      clearTimeout(toolbarHoverTimeoutRef.current);
    }
    toolbarHoverTimeoutRef.current = setTimeout(() => {
      setIsToolbarHovered(false);
    }, 250);
  };

  const isToolbarVisible = isToolbarPinned || isToolbarHovered;

  const [paneWeights, setPaneWeights] = useState<{ code: number; web: number; pdf: number }>({
    code: 32,
    web: 35,
    pdf: 33
  });
  const paneWeightsRef = useRef(paneWeights);
  paneWeightsRef.current = paneWeights;

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const activeSplitterRef = useRef<number | null>(null);
  const startXRef = useRef<number>(0);
  const startWeightsRef = useRef<{ code: number; web: number; pdf: number }>({ code: 32, web: 35, pdf: 33 });
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const togglePaneVisibility = (pane: 'code' | 'web' | 'pdf') => {
    const current = visiblePanesRef.current;
    const activeCount = (current.code ? 1 : 0) + (current.web ? 1 : 0) + (current.pdf ? 1 : 0);
    
    // Safety check: Don't allow closing the last remaining visible pane
    if (current[pane] && activeCount <= 1) {
      return;
    }

    const nextVisible = { ...current, [pane]: !current[pane] };
    visiblePanesRef.current = nextVisible;
    setVisiblePanes(nextVisible);

    // Re-balance weights equally for visible panes
    const nextActiveKeys = (['code', 'web', 'pdf'] as const).filter(k => nextVisible[k]);
    if (nextActiveKeys.length > 0) {
      const equalPercent = 100 / nextActiveKeys.length;
      const nextWeights = { ...paneWeightsRef.current };
      nextActiveKeys.forEach(k => {
        nextWeights[k] = equalPercent;
      });
      paneWeightsRef.current = nextWeights;
      setPaneWeights(nextWeights);
    }
  };

  const handleResetEqualWidths = () => {
    const current = visiblePanesRef.current;
    const activeKeys = (['code', 'web', 'pdf'] as const).filter(k => current[k]);
    if (activeKeys.length === 0) return;
    const equalPercent = 100 / activeKeys.length;
    const nextWeights = { ...paneWeightsRef.current };
    activeKeys.forEach(k => {
      nextWeights[k] = equalPercent;
    });
    paneWeightsRef.current = nextWeights;
    setPaneWeights(nextWeights);
  };

  // File Upload Reference and Format target
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUploadFormat, setTargetUploadFormat] = useState<string>('json');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const triggerFilePicker = (format: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetUploadFormat(format);
    if (fileInputRef.current) {
      if (format === 'json') fileInputRef.current.accept = '.json,application/json';
      else if (format === 'markdown') fileInputRef.current.accept = '.md,.markdown,text/markdown,text/plain';
      else if (format === 'soap') fileInputRef.current.accept = '.xml,.wsdl,text/xml,application/xml';
      else if (format === 'openapi') fileInputRef.current.accept = '.yaml,.yml,.json';
      else if (format === 'postman') fileInputRef.current.accept = '.json';
      else if (format === 'pdf') fileInputRef.current.accept = '.pdf,application/pdf';
      else fileInputRef.current.accept = '*/*';
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const ext = file.name.split('.').pop()?.toLowerCase();

    // Direct PDF Document handling (preserves original binary PDF 100%)
    if (ext === 'pdf' || file.type === 'application/pdf') {
      const blobUrl = URL.createObjectURL(file);
      setPdfBlobUrl(blobUrl);
      setSourceFormat('pdf');
      setSourceCode(`/* ملف وثيقة PDF الرسمية: ${file.name} */\n// الحجم: ${(file.size / 1024).toFixed(1)} KB\n// يتم عرض الملف الأصلي في شاشة الوثيقة والمعاينة بجودة 100% بدون أي نقصان أو تعديل.`);
      
      const doc: any = {
        documentId: `doc_${Date.now()}`,
        version: '1.0.0',
        systemKey: selectedSystemKey,
        entityId: selectedEntityId,
        serviceName: baseName || 'وثيقة PDF معتمدة',
        serviceCode: baseName.toUpperCase().replace(/[^A-Z0-9_]/g, '_') || 'PDF_DOC',
        channel: {
          protocol: 'REST',
          method: 'GET',
          endpointPath: `/${baseName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`,
          environments: {}
        },
        rawFormat: 'pdf',
        rawSource: `[PDF Document: ${file.name}]`,
        headers: [],
        requestTree: {
          nodeId: 'root',
          kind: 'OBJECT',
          structure: { path: '$', depth: 0, isCollection: false },
          semantics: { name: 'root', dataType: 'OBJECT' },
          constraints: { required: true, nullable: false },
          children: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'PRIVATE_DRAFT'
      };
      setActiveDoc(doc);
      setPdfViewMode('full_doc');
      setEditorState('active_editing');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      setPdfBlobUrl(null);
      let detectedFormat = targetUploadFormat;
      if (ext === 'yaml' || ext === 'yml') detectedFormat = 'openapi';
      if (ext === 'xml' || ext === 'wsdl') detectedFormat = 'soap';
      if (ext === 'md' || ext === 'markdown') detectedFormat = 'markdown';

      setSourceFormat(detectedFormat);
      setSourceCode(content);

      try {
        const parsed = uastAdapterFactory.parse(content, detectedFormat, {
          serviceName: baseName || 'ملف مستورد حديثاً',
          serviceCode: baseName.toUpperCase().replace(/[^A-Z0-9_]/g, '_') || 'IMPORTED_API',
          status: 'PRIVATE_DRAFT'
        });
        parsed.systemKey = selectedSystemKey;
        parsed.entityId = selectedEntityId;
        parsed.updatedAt = new Date().toISOString();
        setActiveDoc(parsed);
        setSelectedEndpointIndex(0);
        setPdfViewMode('full_doc');
        setSyntaxError(null);
        uastDraftService.saveLocalImmediate(parsed);
        setEditorState('active_editing');
      } catch (err: any) {
        const formatted = formatSyntaxError(content, detectedFormat, err, file.name);
        setFloatingAlert({
          isOpen: true,
          type: 'error',
          title: formatted.title,
          message: formatted.message,
          codeSnippet: formatted.snippet,
          confirmText: 'إغلاق وتصحيح الملف'
        });
        floatingAlertOnConfirmRef.current = null;
        setSourceCode('');
      }
    };
    reader.readAsText(file);
  };

  // ── Syntax Error State (Zero tolerance for bad code / no fake data) ──
  const [syntaxError, setSyntaxError] = useState<string | null>(null);

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

  // ── Floating Alert Card State (Replacing plain modal with rich floating box) ──
  const [floatingAlert, setFloatingAlert] = useState<FloatingAlertState | null>(null);
  const floatingAlertOnConfirmRef = useRef<(() => void) | null>(null);

  // ── Tab 2: [المسودات] State ──
  const [draftsList, setDraftsList] = useState<UastDocument[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [draftPdfFullscreen, setDraftPdfFullscreen] = useState<boolean>(false);

  // ── Tab 3: [المرفوعات] State ──
  const [submissionsList, setSubmissionsList] = useState<UastDocument[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [subPdfFullscreen, setSubPdfFullscreen] = useState<boolean>(false);

  // ── Handle Escape key to step back or exit fullscreen mode or return from editor ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isEscapeKey = e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27 || e.which === 27;
      if (!isEscapeKey) return;

      // 1. If Floating Alert is open, close it
      if (floatingAlert && floatingAlert.isOpen) {
        e.preventDefault();
        setFloatingAlert(null);
        return;
      }

      const current = fullscreenTargetRef.current;
      const prev = prevFullscreenTargetRef.current;

      // 2. If single column is maximized
      if (current === 'code' || current === 'web' || current === 'pdf') {
        e.preventDefault();
        e.stopPropagation();
        // If we came from 3-column fullscreen ('all'), return to 'all'!
        if (prev === 'all') {
          fullscreenTargetRef.current = 'all';
          prevFullscreenTargetRef.current = 'none';
          setFullscreenTarget('all');
          setPrevFullscreenTarget('none');
        } else {
          fullscreenTargetRef.current = 'none';
          prevFullscreenTargetRef.current = 'none';
          setFullscreenTarget('none');
          setPrevFullscreenTarget('none');
        }
        return;
      } 
      
      // 3. If all 3 columns are in fullscreen
      if (current === 'all') {
        e.preventDefault();
        e.stopPropagation();
        fullscreenTargetRef.current = 'none';
        prevFullscreenTargetRef.current = 'none';
        setFullscreenTarget('none');
        setPrevFullscreenTarget('none');
        return;
      } 
      
      // 4. Drafts / Submissions modal fullscreen
      if (draftPdfFullscreen) {
        e.preventDefault();
        setDraftPdfFullscreen(false);
        return;
      } 
      if (subPdfFullscreen) {
        e.preventDefault();
        setSubPdfFullscreen(false);
        return;
      }

      // 5. Native browser fullscreen element
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }

      // 6. When in active editing view (the view shown in user's screenshots),
      // pressing Escape exits back to import selection (العودة للاستيراد)
      if (editorState === 'active_editing') {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') {
          (document.activeElement as HTMLElement).blur();
        }
        setEditorState('import_selection');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [draftPdfFullscreen, subPdfFullscreen, editorState, floatingAlert]);

  const handleToggleAllFullscreen = () => {
    if (fullscreenTargetRef.current === 'all') {
      fullscreenTargetRef.current = 'none';
      prevFullscreenTargetRef.current = 'none';
      setFullscreenTarget('none');
      setPrevFullscreenTarget('none');
    } else {
      fullscreenTargetRef.current = 'all';
      prevFullscreenTargetRef.current = 'none';
      setFullscreenTarget('all');
      setPrevFullscreenTarget('none');
    }
  };

  const handleToggleColumnFullscreen = (col: 'code' | 'web' | 'pdf') => {
    const current = fullscreenTargetRef.current;
    if (current === col) {
      // Return to whatever we were in before ('all' if came from 3-column fullscreen, else 'none')
      const targetToReturn = prevFullscreenTargetRef.current === 'all' ? 'all' : 'none';
      fullscreenTargetRef.current = targetToReturn;
      prevFullscreenTargetRef.current = 'none';
      setFullscreenTarget(targetToReturn);
      setPrevFullscreenTarget('none');
    } else {
      const cameFromAll = current === 'all';
      fullscreenTargetRef.current = col;
      prevFullscreenTargetRef.current = cameFromAll ? 'all' : 'none';
      setFullscreenTarget(col);
      setPrevFullscreenTarget(cameFromAll ? 'all' : 'none');
    }
  };

  // ── Splitter Mouse Dragging Handler with RTL & Safety Limits ──
  const handleSplitterMouseDown = (splitterIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    activeSplitterRef.current = splitterIndex;
    startXRef.current = e.clientX;
    startWeightsRef.current = { ...paneWeightsRef.current };
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || activeSplitterRef.current === null) return;
      const container = gridContainerRef.current;
      if (!container) return;

      const containerWidth = container.getBoundingClientRect().width;
      if (containerWidth <= 100) return;

      // In RTL: dragging to left (e.clientX < startX) expands pane 0 and shrinks pane 1
      const deltaX = isRtl ? (startXRef.current - e.clientX) : (e.clientX - startXRef.current);
      const deltaPercent = (deltaX / containerWidth) * 100;

      // Safety constraint: minimum width per pane (at least 260px in percent)
      const minPercent = Math.max(16, (260 / containerWidth) * 100);

      const activePanes = (['code', 'web', 'pdf'] as const).filter(k => visiblePanesRef.current[k]);
      const splitterIdx = activeSplitterRef.current;

      if (activePanes.length === 3) {
        if (splitterIdx === 0) {
          const combined = startWeightsRef.current.code + startWeightsRef.current.web;
          let newCode = startWeightsRef.current.code + deltaPercent;
          newCode = Math.max(minPercent, Math.min(combined - minPercent, newCode));
          const newWeb = combined - newCode;

          const updated = {
            ...paneWeightsRef.current,
            code: newCode,
            web: newWeb
          };
          paneWeightsRef.current = updated;
          setPaneWeights(updated);
        } else if (splitterIdx === 1) {
          const combined = startWeightsRef.current.web + startWeightsRef.current.pdf;
          let newWeb = startWeightsRef.current.web + deltaPercent;
          newWeb = Math.max(minPercent, Math.min(combined - minPercent, newWeb));
          const newPdf = combined - newWeb;

          const updated = {
            ...paneWeightsRef.current,
            web: newWeb,
            pdf: newPdf
          };
          paneWeightsRef.current = updated;
          setPaneWeights(updated);
        }
      } else if (activePanes.length === 2 && splitterIdx === 0) {
        const p0 = activePanes[0];
        const p1 = activePanes[1];
        const combined = startWeightsRef.current[p0] + startWeightsRef.current[p1];
        let newP0 = startWeightsRef.current[p0] + deltaPercent;
        newP0 = Math.max(minPercent, Math.min(combined - minPercent, newP0));
        const newP1 = combined - newP0;

        const updated = {
          ...paneWeightsRef.current,
          [p0]: newP0,
          [p1]: newP1
        };
        paneWeightsRef.current = updated;
        setPaneWeights(updated);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        activeSplitterRef.current = null;
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isRtl]);

  // Refresh lists on tab change
  const refreshStorageLists = () => {
    const allDrafts = uastDraftService.listDrafts();
    const privateDrafts = allDrafts.filter(d => d.status === 'PRIVATE_DRAFT' || d.status === 'CHANGES_REQUESTED');
    setDraftsList(privateDrafts);
    if (activeDoc && privateDrafts.some(d => d.documentId === activeDoc.documentId)) {
      setSelectedDraftId(activeDoc.documentId);
    } else if (privateDrafts.length > 0 && (!selectedDraftId || !privateDrafts.some(d => d.documentId === selectedDraftId))) {
      setSelectedDraftId(privateDrafts[0].documentId);
    }

    const submitted = allDrafts.filter(d => d.status === 'PENDING_REVIEW' || d.status === 'PUBLISHED');
    setSubmissionsList(submitted);
    if (submitted.length > 0 && (!selectedSubmissionId || !submitted.some(s => s.documentId === selectedSubmissionId))) {
      setSelectedSubmissionId(submitted[0].documentId);
    }
  };

  useEffect(() => {
    refreshStorageLists();
  }, [activeTab]);

  // ── Continuous Auto-Save to Drafts (Debounced 500ms) ──
  useEffect(() => {
    if (!activeDoc || syntaxError) return; // Zero tolerance: freeze auto-save during syntax errors to prevent corrupting drafts!
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
  }, [activeDoc, sourceCode, sourceFormat, syntaxError]);

  // ── Auto-save on page exit or refresh (beforeunload) ──
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeDoc && !syntaxError) {
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
  }, [activeDoc, sourceCode, sourceFormat, syntaxError]);

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
      blankDoc.systemKey = selectedSystemKey;
      blankDoc.entityId = selectedEntityId;
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
      const formatted = formatSyntaxError(codeToUse, fmt, e);
      setFloatingAlert({
        isOpen: true,
        type: 'error',
        title: formatted.title,
        message: `تعذر إعداد القالب المختار (${format}): ${formatted.message}`,
        codeSnippet: formatted.snippet,
        confirmText: 'إغلاق'
      });
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
        serviceName: activeDoc?.serviceName || 'خدمة موثقة',
        status: activeDoc?.status || 'PRIVATE_DRAFT',
        channel: activeDoc?.channel
      });
      parsed.updatedAt = new Date().toISOString();
      parsed.rawSource = newSource;
      parsed.rawFormat = format;
      parsed.systemKey = activeDoc?.systemKey || selectedSystemKey;
      parsed.entityId = activeDoc?.entityId || selectedEntityId;
      setActiveDoc(parsed);
      setSyntaxError(null);
    } catch (err: any) {
      // Zero tolerance: reject invalid syntax and never fabricate fake synthetic fields!
      const formatted = formatSyntaxError(newSource, format, err);
      const expressiveMsg = `${formatted.title}: ${err?.message || 'خطأ في صياغة الكود'}`;
      setSyntaxError(expressiveMsg);
      if (activeDoc) {
        setActiveDoc(prev => prev ? ({
          ...prev,
          rawSource: newSource,
          rawFormat: format,
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
      setSelectedEndpointIndex(0);
    } catch {
      // ignore
    }
  };

  // Convert active UAST Document to full Catalog Endpoint for SpecViewer
  const endpointPreview = useMemo<Endpoint | null>(() => {
    if (!activeDoc) return null;

    const currentEp = (activeDoc.allEndpoints && activeDoc.allEndpoints.length > selectedEndpointIndex)
      ? activeDoc.allEndpoints[selectedEndpointIndex]
      : (activeDoc.allEndpoints?.[0] || null);

    // Build params: if currentEp has requestFields (from file), use them! Otherwise fallback to requestTree
    const params: Endpoint['params'] = [];

    if (currentEp?.requestFields && currentEp.requestFields.length > 0) {
      currentEp.requestFields.forEach(f => {
        const valStr = f.example || '';
        params.push({
          name: f.name,
          type: f.type,
          req: f.required,
          rule: valStr ? `القيمة: ${valStr}` : (f.description || `حقل ${f.name}`),
          tag: f.length ? f.length.substring(0, 20) : (valStr ? valStr.substring(0, 20) : 'Payload'),
          tagClass: /iban|pan|pin|token|auth|sign|nonce/i.test(f.name) ? 'badge-amber' : 'badge-green'
        });
      });
    } else {
      const flattenParams = (node: IUastNode) => {
        if (node.structure.path && node.structure.path !== '$') {
          const valStr = node.governance?.exampleValue !== undefined && node.governance?.exampleValue !== null 
            ? String(node.governance.exampleValue)
            : '';
          params.push({
            name: node.semantics.name,
            type: node.semantics.dataType,
            req: node.constraints.required,
            rule: valStr ? `القيمة: ${valStr}` : (node.semantics.description || `حقل ${node.semantics.name}`),
            tag: valStr ? valStr.substring(0, 20) : (node.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'PII' : 'Payload'),
            tagClass: node.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'badge-amber' : 'badge-green'
          });
        }
        for (const c of node.children) {
          flattenParams(c);
        }
      };
      flattenParams(activeDoc.requestTree);
    }

    // Build responseFields from currentEp if available (real from file)
    const responseFields: Endpoint['responseFields'] = currentEp?.responseFields?.map(f => ({
      name: f.name,
      type: f.type,
      req: 'Guaranteed',
      desc: f.description || `Response field: ${f.name}`
    })) || undefined;

    // Real response example from parsed file
    let res200 = currentEp?.responseExample;
    if (!res200) {
      res200 = JSON.stringify({ 
        status: 'success',
        msg: 'operation completed successfully',
        data: { id: 1, created_at: new Date().toISOString() }
      }, null, 2);
    }

    return {
      id: `ep_uast_${activeDoc.documentId || 'live_edit'}_${selectedEndpointIndex}`,
      method: currentEp?.method || activeDoc.channel.method,
      path: currentEp?.path || activeDoc.channel.endpointPath,
      shortName: (currentEp?.summary || activeDoc.serviceCode).toLowerCase().replace(/[^a-z0-9]/g, '-'),
      desc: currentEp?.summary || activeDoc.serviceName,
      descEn: currentEp?.description || activeDoc.serviceNameEn || activeDoc.serviceName,
      isDraft: activeDoc.status !== 'PUBLISHED',
      statusBadge: `v${activeDoc.semver}`,
      releaseId: activeDoc.publishedVersionId,
      systemKey: activeDoc.systemKey || selectedSystemKey,
      targetEntities: [activeDoc.entityId || selectedEntityId],
      params,
      rules: (activeDoc.errorCodes || []).slice(0, 12).map((err, i) => ({
        id: `BR_${activeDoc.serviceCode}_${String(i + 1).padStart(3, '0')}`,
        name: err.message,
        err: err.code
      })),
      payload: currentEp?.requestExample || sourceCode || activeDoc.rawSource,
      res200,
      responseFields
    };
  }, [activeDoc, sourceCode, selectedSystemKey, selectedEntityId, selectedEndpointIndex]);

  const workbenchEndpoints: Endpoint[] = useMemo(() => {
    if (activeDoc?.allEndpoints && activeDoc.allEndpoints.length > 0) {
      return activeDoc.allEndpoints.map((ep, idx) => {
        const pathSegments = (ep.path || '').split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1] || ep.summary || `endpoint-${idx + 1}`;
        return {
          id: `wb_ep_${idx}`,
          method: ep.method || 'POST',
          path: ep.path,
          shortName: lastSegment,
          desc: ep.summary,
          descEn: ep.description || ep.summary,
          summary: ep.summary,
          params: ep.requestFields ? ep.requestFields.map(f => ({
            name: f.name,
            type: f.type,
            req: f.required,
            rule: f.example ? `القيمة: ${f.example}` : (f.description || `حقل ${f.name}`),
            tag: f.length ? f.length.substring(0, 20) : (f.example ? f.example.substring(0, 20) : 'Payload'),
            tagClass: /iban|pan|pin|token|auth|sign|nonce/i.test(f.name) ? 'badge-amber' : 'badge-green'
          })) : (endpointPreview?.params || []),
          rules: (activeDoc.errorCodes || []).map((err, i) => ({
            id: `BR_${activeDoc.serviceCode}_${String(i + 1).padStart(3, '0')}`,
            name: err.message,
            err: err.code
          })),
          payload: ep.requestExample || endpointPreview?.payload || '',
          res200: ep.responseExample || endpointPreview?.res200 || '',
          responseFields: ep.responseFields?.map(f => ({
            name: f.name,
            type: f.type,
            req: 'Guaranteed',
            desc: f.description || `Response field: ${f.name}`
          })) || endpointPreview?.responseFields
        };
      });
    }
    if (endpointPreview) return [endpointPreview];
    return [];
  }, [activeDoc, endpointPreview]);


  // ── Action: Save as Draft (Floating Alert) ──
  const handleSaveAsDraft = async () => {
    if (!activeDoc) return;

    if (syntaxError) {
      const formatted = formatSyntaxError(sourceCode, sourceFormat, syntaxError);
      setFloatingAlert({
        isOpen: true,
        type: 'warning',
        title: 'تعذر حفظ المسودة: الكود يحتوي على أخطاء صياغة',
        message: 'تم تجميد الحفظ لمنع تلويث قاعدة البيانات بمسودات غير صالحة. يرجى مراجعة وتصحيح الخلل البرمجي التالي:',
        codeSnippet: formatted.snippet,
        confirmText: 'العودة لتصحيح الكود'
      });
      floatingAlertOnConfirmRef.current = null;
      return;
    }

    await uastDraftService.saveDraft({
      ...activeDoc,
      systemKey: activeDoc.systemKey || selectedSystemKey,
      entityId: activeDoc.entityId || selectedEntityId,
      rawSource: sourceCode,
      rawFormat: sourceFormat,
      status: 'PRIVATE_DRAFT'
    });

    setFloatingAlert({
      isOpen: true,
      type: 'success',
      title: 'تم حفظ المسودة بنجاح',
      message: `تم حفظ أحدث نسخة من مسودة الوثيقة في سجل مسوداتك الخاصة تحت نظام [${currentSysDisplayName}] ← جهة [${currentIntDisplayName}].`,
      confirmText: 'متابعة'
    });
    floatingAlertOnConfirmRef.current = () => {
      refreshStorageLists();
      setEditorState('import_selection');
    };
  };

  // ── Action: Submit to Reviewer (Floating Alert + Move to Tab 3) ──
  const handleSubmitToReviewer = async () => {
    if (!activeDoc) return;

    if (syntaxError) {
      const formatted = formatSyntaxError(sourceCode, sourceFormat, syntaxError);
      setFloatingAlert({
        isOpen: true,
        type: 'error',
        title: 'تم رفض الإرسال: مواصفة الوثيقة غير صالحة',
        message: 'ترفض المنظومة رفع أي وثيقة إلى المشرف الرقابي طالما تحتوي على أخطاء صياغة برمجية. تفاصيل الخطأ:',
        codeSnippet: formatted.snippet,
        confirmText: 'العودة للمحرر وتصحيح الخطأ'
      });
      floatingAlertOnConfirmRef.current = null;
      return;
    }

    let latestDoc = activeDoc;
    try {
      latestDoc = uastAdapterFactory.parse(sourceCode, sourceFormat, {
        documentId: activeDoc.documentId,
        serviceCode: activeDoc.serviceCode,
        serviceName: activeDoc.serviceName,
        status: 'PENDING_REVIEW',
        channel: activeDoc.channel
      });
    } catch {
      // fallback to activeDoc
    }

    const docToSubmit: UastDocument = {
      ...activeDoc,
      ...latestDoc,
      systemKey: activeDoc.systemKey || selectedSystemKey,
      entityId: activeDoc.entityId || selectedEntityId,
      rawSource: sourceCode,
      rawFormat: sourceFormat,
      status: 'PENDING_REVIEW' as const,
      allEndpoints: (latestDoc?.allEndpoints && latestDoc.allEndpoints.length > 0)
        ? latestDoc.allEndpoints
        : (activeDoc.allEndpoints || [])
    };
    await uastDraftService.saveDraft(docToSubmit);

    setFloatingAlert({
      isOpen: true,
      type: 'success',
      title: 'تم رفع الوثيقة بنجاح للمراجعة الرقابية',
      message: `تم إرسال الوثيقة الرسمية للمشرف الرقابي للاعتماد تحت نظام [${currentSysDisplayName}] ← جهة [${currentIntDisplayName}].`,
      confirmText: 'عرض قائمة المرفوعات'
    });
    floatingAlertOnConfirmRef.current = () => {
      refreshStorageLists();
      setEditorState('import_selection');
      setActiveTab('submissions');
      if (onPublishSuccess) {
        onPublishSuccess(docToSubmit, docToSubmit.systemKey, docToSubmit.entityId);
      }
    };
  };

  // ── Action in Tab 2: [استكمال] ──
  const handleResumeDraft = (draft: UastDocument) => {
    setActiveDoc(draft);
    if (draft.systemKey && workbenchSystems[draft.systemKey]) {
      setSelectedSystemKey(draft.systemKey);
    }
    if (draft.entityId) {
      setSelectedEntityId(draft.entityId);
    }
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
          borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          padding: '0 1.25rem',
          backgroundColor: 'var(--bg-subtle, #090f19)',
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
                background: 'var(--overlay-subtle, rgba(255, 255, 255, 0.08))',
                borderRadius: '999px',
                color: activeTab === 'drafts' ? '#10b981' : 'var(--text-main, #cbd5e1)'
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
                background: 'var(--overlay-subtle, rgba(255, 255, 255, 0.08))',
                borderRadius: '999px',
                color: activeTab === 'submissions' ? '#10b981' : 'var(--text-main, #cbd5e1)'
              }}
            >
              {submissionsList.length}
            </span>
          </button>
        </div>

        {/* Studio Actions in Tab Header */}
        {activeTab === 'add' && editorState === 'active_editing' && activeDoc && (
          <div className="studio-actions-group" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Live Context Route Pill in Header */}
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.3rem 0.75rem',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#34d399',
                fontWeight: 600
              }}
              title={isRtl ? 'الجهة والنظام التابع لهما هذا التوثيق' : 'Assigned System & Entity'}
            >
              <span>{currentSysDisplayName}</span>
              <span style={{ opacity: 0.5 }}>←</span>
              <span>{currentIntDisplayName}</span>
            </div>

            <button 
              className="studio-btn-save"
              onClick={() => setEditorState('import_selection')}
              style={{
                backgroundColor: 'var(--overlay-subtle, rgba(255, 255, 255, 0.08))',
                color: 'var(--text-main, #e2e8f0)',
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
              onClick={handleToggleAllFullscreen}
              title={fullscreenTarget === 'all' ? 'إنهاء ملء الشاشة (Esc)' : 'ملء الشاشة للشاشات الثلاث'}
              aria-label="ملء الشاشة للشاشات الثلاث"
            >
              {fullscreenTarget === 'all' ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button 
              className="studio-btn-save"
              onClick={handleSaveAsDraft}
              disabled={!!syntaxError}
              style={syntaxError ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(0.6)' } : undefined}
              title={syntaxError ? 'تعذر الحفظ: صحح أخطاء الصياغة أولاً' : 'حفظ كمسودة'}
            >
              حفظ كمسودة
            </button>

            <button 
              className="studio-btn-submit"
              onClick={handleSubmitToReviewer}
              disabled={!!syntaxError}
              style={syntaxError ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(0.6)' } : undefined}
              title={syntaxError ? 'تعذر الرفع: صحح أخطاء الصياغة أولاً' : 'رفع إلى المراجع'}
            >
              رفع إلى المراجع
            </button>
          </div>
        )}
      </div>

      {/* ── MODAL: ADD NEW SYSTEM ── */}
      {isAddSystemModalOpen && (
        <div className="sovereign-modal-backdrop" onClick={() => setIsAddSystemModalOpen(false)}>
          <div className="sovereign-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sovereign-modal-header">
              <h3 className="sovereign-modal-title">
                <Layers size={20} style={{ color: '#10b981' }} />
                <span>{isRtl ? 'إضافة نظام جديد إلى المنظومة' : 'Add New System'}</span>
              </h3>
              <button 
                className="sovereign-modal-close-btn" 
                onClick={() => setIsAddSystemModalOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSystem} className="sovereign-modal-form">
              <div className="sovereign-form-group">
                <label className="sovereign-form-label">
                  {isRtl ? 'اسم النظام بالعربية *' : 'System Name (Arabic) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isRtl ? 'مثال: نظام التسويات والمقاصة' : 'e.g. Clearing & Settlements System'}
                  value={newSysNameAr}
                  onChange={(e) => setNewSysNameAr(e.target.value)}
                  className="sovereign-form-input"
                  autoFocus
                />
              </div>

              <div className="sovereign-form-group">
                <label className="sovereign-form-label">
                  {isRtl ? 'اسم النظام بالإنجليزية' : 'System Name (English)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Settlements and Clearing Gateway"
                  value={newSysNameEn}
                  onChange={(e) => setNewSysNameEn(e.target.value)}
                  className="sovereign-form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="sovereign-form-group">
                  <label className="sovereign-form-label">
                    {isRtl ? 'رمز النظام (Code)' : 'System Code'}
                  </label>
                  <input
                    type="text"
                    placeholder="SYS_SETTLEMENT"
                    value={newSysCode}
                    onChange={(e) => setNewSysCode(e.target.value.toUpperCase())}
                    className="sovereign-form-input"
                  />
                </div>

                <div className="sovereign-form-group">
                  <label className="sovereign-form-label">
                    {isRtl ? 'الأيقونة' : 'Icon'}
                  </label>
                  <select
                    value={newSysIcon}
                    onChange={(e) => setNewSysIcon(e.target.value)}
                    className="sovereign-form-select"
                  >
                    <option value="Layers">{isRtl ? 'تحصيل / منصة (Layers)' : 'Layers'}</option>
                    <option value="Receipt">{isRtl ? 'تنترة / فواتير (Receipt)' : 'Receipt'}</option>
                    <option value="Globe">{isRtl ? 'المجمع / بوابة عامة (Globe)' : 'Globe'}</option>
                    <option value="BellRing">{isRtl ? 'إشعارات (BellRing)' : 'BellRing'}</option>
                    <option value="ShieldAlert">{isRtl ? 'حماية وامتثال (ShieldAlert)' : 'ShieldAlert'}</option>
                    <option value="Scale">{isRtl ? 'تسوية / ERP (Scale)' : 'Scale'}</option>
                    <option value="Building2">{isRtl ? 'مؤسسي / بنكي (Building2)' : 'Building2'}</option>
                  </select>
                </div>
              </div>

              <div className="sovereign-form-group">
                <label className="sovereign-form-label">
                  {isRtl ? 'الوصف والغرض التشغيلي' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isRtl ? 'وصف مختصر لمهام هذا النظام...' : 'Brief summary of this system...'}
                  value={newSysDesc}
                  onChange={(e) => setNewSysDesc(e.target.value)}
                  className="sovereign-form-textarea"
                />
              </div>

              <div className="sovereign-modal-actions">
                <button
                  type="button"
                  className="sovereign-btn-cancel"
                  onClick={() => setIsAddSystemModalOpen(false)}
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="sovereign-btn-submit"
                >
                  <Plus size={16} />
                  <span>{isRtl ? 'إضافة وتعيين النظام' : 'Create & Select System'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD NEW ENTITY / INTEGRATION ── */}
      {isAddEntityModalOpen && (
        <div className="sovereign-modal-backdrop" onClick={() => setIsAddEntityModalOpen(false)}>
          <div className="sovereign-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sovereign-modal-header">
              <h3 className="sovereign-modal-title">
                <Building2 size={20} style={{ color: '#38bdf8' }} />
                <span>{isRtl ? `إضافة جهة تابعة لنظام [${currentSysDisplayName}]` : `Add Entity under [${currentSysDisplayName}]`}</span>
              </h3>
              <button 
                className="sovereign-modal-close-btn" 
                onClick={() => setIsAddEntityModalOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEntity} className="sovereign-modal-form">
              <div className="sovereign-form-group">
                <label className="sovereign-form-label">
                  {isRtl ? 'اسم الجهة / البنك / القطاع بالعربية *' : 'Entity Name (Arabic) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isRtl ? 'مثال: بنك اليمن والكويت أو مصلحة الضرائب' : 'e.g. Yemen Kuwait Bank'}
                  value={newEntityNameAr}
                  onChange={(e) => setNewEntityNameAr(e.target.value)}
                  className="sovereign-form-input"
                  autoFocus
                />
              </div>

              <div className="sovereign-form-group">
                <label className="sovereign-form-label">
                  {isRtl ? 'اسم الجهة بالإنجليزية' : 'Entity Name (English)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Yemen Kuwait Bank"
                  value={newEntityNameEn}
                  onChange={(e) => setNewEntityNameEn(e.target.value)}
                  className="sovereign-form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="sovereign-form-group">
                  <label className="sovereign-form-label">
                    {isRtl ? 'رمز الجهة (Code)' : 'Entity Code'}
                  </label>
                  <input
                    type="text"
                    placeholder="INT_YKB"
                    value={newEntityCode}
                    onChange={(e) => setNewEntityCode(e.target.value.toUpperCase())}
                    className="sovereign-form-input"
                  />
                </div>

                <div className="sovereign-form-group">
                  <label className="sovereign-form-label">
                    {isRtl ? 'الأيقونة' : 'Icon'}
                  </label>
                  <select
                    value={newEntityIcon}
                    onChange={(e) => setNewEntityIcon(e.target.value)}
                    className="sovereign-form-select"
                  >
                    <option value="Building2">{isRtl ? 'بنوك / مؤسسات (Building2)' : 'Building2'}</option>
                    <option value="Store">{isRtl ? 'متاجر وتجار (Store)' : 'Store'}</option>
                    <option value="Scale">{isRtl ? 'حسابات و ERP (Scale)' : 'Scale'}</option>
                    <option value="ShieldAlert">{isRtl ? 'رقابة وامتثال (ShieldAlert)' : 'ShieldAlert'}</option>
                    <option value="Globe">{isRtl ? 'بوابة عامة (Globe)' : 'Globe'}</option>
                  </select>
                </div>
              </div>

              <div className="sovereign-form-group">
                <label className="sovereign-form-label">
                  {isRtl ? 'اتجاه الربط / العمليات' : 'Integration Direction'}
                </label>
                <select
                  value={newEntityDirection}
                  onChange={(e) => setNewEntityDirection(e.target.value as any)}
                  className="sovereign-form-select"
                >
                  <option value="INBOUND">{isRtl ? 'وارد (INBOUND - استقبال طلبات من الجهة)' : 'INBOUND'}</option>
                  <option value="OUTBOUND">{isRtl ? 'صادر (OUTBOUND - إرسال طلبات للجهة)' : 'OUTBOUND'}</option>
                  <option value="BIDIRECTIONAL">{isRtl ? 'ثنائي (BIDIRECTIONAL - تبادل متكامل)' : 'BIDIRECTIONAL'}</option>
                </select>
              </div>

              <div className="sovereign-modal-actions">
                <button
                  type="button"
                  className="sovereign-btn-cancel"
                  onClick={() => setIsAddEntityModalOpen(false)}
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="sovereign-btn-submit"
                >
                  <Plus size={16} />
                  <span>{isRtl ? 'إضافة وتعيين الجهة' : 'Create & Select Entity'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── UNIFIED FLOATING ALERT CARD (Rich, Expressive & Floating) ── */}
      <FloatingAlertCard
        alert={floatingAlert}
        onClose={() => {
          const cb = floatingAlertOnConfirmRef.current;
          floatingAlertOnConfirmRef.current = null;
          setFloatingAlert(null);
          if (cb) cb();
        }}
      />

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: [إضافة توثيق] - 1. IMPORT SELECTION HUB
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'add' && editorState === 'import_selection' && (
        <div className="import-selection-screen">
          {/* Hidden File Input for Native File System Picking */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelected} 
            style={{ display: 'none' }} 
          />

          {/* ── TARGET DESTINATION BAR (CLEAN & COMPACT) ── */}
          <div className="target-assignment-strip">
            <div className="target-strip-header">
              <Layers size={17} className="target-strip-icon" />
              <span className="target-strip-title">{isRtl ? 'وجهة التوثيق:' : 'Destination:'}</span>
            </div>

            <div className="target-strip-controls">
              {/* System Selector */}
              <div className="target-strip-field">
                <span className="target-field-tag">{isRtl ? 'النظام:' : 'System:'}</span>
                <div className="target-select-wrapper">
                  <select
                    className="target-native-select compact"
                    value={selectedSystemKey}
                    onChange={(e) => handleSystemChange(e.target.value)}
                  >
                    {Object.values(workbenchSystems).map(sys => (
                      <option key={sys.key} value={sys.key}>
                        {sys.name} {sys.code ? `(${sys.code})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="target-select-chevron" size={14} />
                </div>
                <button
                  type="button"
                  className="target-btn-add-mini"
                  onClick={() => setIsAddSystemModalOpen(true)}
                  title={isRtl ? 'إضافة نظام جديد' : 'Add New System'}
                >
                  <Plus size={14} />
                </button>
              </div>

              <span className="target-strip-divider">{isRtl ? '←' : '→'}</span>

              {/* Entity Selector */}
              <div className="target-strip-field">
                <span className="target-field-tag">{isRtl ? 'الجهة:' : 'Entity:'}</span>
                <div className="target-select-wrapper">
                  <select
                    className="target-native-select compact"
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                  >
                    {currentSysObj && Object.values(currentSysObj.integrations || {}).map(int => (
                      <option key={int.entityId} value={int.entityId}>
                        {int.name} {int.code ? `(${int.code})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="target-select-chevron" size={14} />
                </div>
                <button
                  type="button"
                  className="target-btn-add-mini"
                  onClick={() => setIsAddEntityModalOpen(true)}
                  title={isRtl ? 'إضافة جهة جديدة' : 'Add New Entity'}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Format Cards Grid */}
          <div className="format-cards-grid">
            {/* 1. JSON */}
            <div 
              className="format-selection-card"
              onClick={(e) => triggerFilePicker('json', e)}
              role="button"
              tabIndex={0}
              title="استيراد ملف JSON"
            >
              <div className="format-file-visual">
                <FileText size={42} />
                <span className="format-file-ext">JSON</span>
              </div>
            </div>

            {/* 2. Markdown */}
            <div 
              className="format-selection-card"
              onClick={(e) => triggerFilePicker('markdown', e)}
              role="button"
              tabIndex={0}
              title="استيراد ملف Markdown"
            >
              <div className="format-file-visual">
                <FileText size={42} />
                <span className="format-file-ext">MD</span>
              </div>
            </div>

            {/* 3. SOAP / XML */}
            <div 
              className="format-selection-card"
              onClick={(e) => triggerFilePicker('soap', e)}
              role="button"
              tabIndex={0}
              title="استيراد ملف SOAP / XML"
            >
              <div className="format-file-visual">
                <Code size={42} />
                <span className="format-file-ext">XML</span>
              </div>
            </div>

            {/* 4. OpenAPI / Swagger */}
            <div 
              className="format-selection-card"
              onClick={(e) => triggerFilePicker('openapi', e)}
              role="button"
              tabIndex={0}
              title="استيراد مواصفات OpenAPI / Swagger"
            >
              <div className="format-file-visual">
                <Globe size={42} />
                <span className="format-file-ext">YAML</span>
              </div>
            </div>

            {/* 5. Postman */}
            <div 
              className="format-selection-card"
              onClick={(e) => triggerFilePicker('postman', e)}
              role="button"
              tabIndex={0}
              title="استيراد مجموعة Postman"
            >
              <div className="format-file-visual">
                <Upload size={42} />
                <span className="format-file-ext">POSTMAN</span>
              </div>
            </div>

            {/* 6. PDF Document */}
            <div 
              className="format-selection-card"
              onClick={(e) => triggerFilePicker('pdf', e)}
              role="button"
              tabIndex={0}
              title="استيراد وثيقة PDF مباشرة وعرضها بنفس الجودة"
            >
              <div className="format-file-visual">
                <FileText size={42} style={{ color: '#ef4444' }} />
                <span className="format-file-ext" style={{ color: '#ef4444' }}>PDF</span>
              </div>
            </div>

            {/* 7. Manual Entry */}
            <div 
              className="format-selection-card is-manual"
              onClick={handleStartNewDoc}
              role="button"
              tabIndex={0}
              title="فتح الشاشات الثلاث بنموذج فارغ"
            >
              <div className="format-file-visual">
                <PlusCircle size={42} />
                <span className="format-file-ext">يدوي</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: [إضافة توثيق] - 2. STUDIO DYNAMIC WORKSPACE
          Zero Page Scroll, Dynamic Multi-Pane Visibility & Resizing
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'add' && editorState === 'active_editing' && activeDoc && (
        <div className={`studio-workbench-container fs-${fullscreenTarget}`}>
          
          {/* ── FLOATING MULTI-PANE VISIBILITY TOOLBAR (AUTO-HIDE & PIN) ── */}
          {(fullscreenTarget === 'none' || fullscreenTarget === 'all') && (
            <div 
              className={`studio-floating-toolbar-wrapper ${isToolbarPinned ? 'is-pinned' : 'is-unpinned'} ${isToolbarVisible ? 'is-visible' : 'is-collapsed'}`}
              onMouseEnter={handleToolbarMouseEnter}
              onMouseLeave={handleToolbarMouseLeave}
            >
              {/* Minimalist Peek Tab when collapsed (only 10px high at top edge) */}
              <div 
                className="studio-toolbar-peek-strip"
                onClick={() => setIsToolbarPinned(prev => !prev)}
                title="مرر الماوس لإظهار شريط التحكم بالشاشات أو انقر للتثبيت"
              >
                <div className="tab-pill-line" />
                <ChevronDown size={11} className="tab-arrow-icon" />
              </div>

              {/* Full Floating Visibility Toolbar (Ultra-slim, single-tier) */}
              <div className="studio-floating-visibility-toolbar" role="toolbar" aria-label="التحكم في عرض الشاشات">
                <div className="visibility-pills-group">
                  <button
                    type="button"
                    className={`visibility-toggle-btn ${visiblePanes.code ? 'is-active' : ''}`}
                    onClick={() => togglePaneVisibility('code')}
                    title={visiblePanes.code ? 'إخفاء كود المصدر' : 'إظهار كود المصدر'}
                  >
                    <Code size={13} />
                    <span>كود المصدر</span>
                  </button>

                  <button
                    type="button"
                    className={`visibility-toggle-btn ${visiblePanes.web ? 'is-active' : ''}`}
                    onClick={() => togglePaneVisibility('web')}
                    title={visiblePanes.web ? 'إخفاء معاينة البوابة' : 'إظهار معاينة البوابة'}
                  >
                    <Globe size={13} />
                    <span>معاينة البوابة</span>
                  </button>

                  <button
                    type="button"
                    className={`visibility-toggle-btn ${visiblePanes.pdf ? 'is-active' : ''}`}
                    onClick={() => togglePaneVisibility('pdf')}
                    title={visiblePanes.pdf ? 'إخفاء الوثيقة الرسمية' : 'إظهار الوثيقة الرسمية'}
                  >
                    <FileText size={13} />
                    <span>الوثيقة الرسمية</span>
                  </button>
                </div>

                <div className="visibility-toolbar-divider" />

                <button
                  type="button"
                  className="visibility-reset-btn"
                  onClick={handleResetEqualWidths}
                  title="إعادة توزيع المسافات والأبعاد بالتساوي"
                >
                  <Columns size={13} />
                  <span>مساواة العرض</span>
                </button>

                <div className="visibility-toolbar-divider" />

                {/* Pin / Unpin button */}
                <button
                  type="button"
                  className={`visibility-pin-btn ${isToolbarPinned ? 'is-active' : ''}`}
                  onClick={() => setIsToolbarPinned(prev => !prev)}
                  title={isToolbarPinned ? 'إلغاء التثبيت (العودة للطي التلقائي)' : 'تثبيت الشريط لأسفل دائماً'}
                >
                  {isToolbarPinned ? <Pin size={13} /> : <PinOff size={13} />}
                  <span>{isToolbarPinned ? 'مثبت' : 'تثبيت'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Studio Dynamic Split Screens */}
          <div 
            ref={gridContainerRef}
            className={`studio-screens-grid has-splitters ${isDragging ? 'is-resizing' : ''}`}
          >
            
            {/* ── SCREEN 1: SOURCE CODE (كود المصدر) ── */}
            {visiblePanes.code && (
              <div 
                className={`studio-screen-card screen-source ${fullscreenTarget === 'code' ? 'is-maximized' : ''}`}
                style={fullscreenTarget === 'code' ? undefined : {
                  width: (!visiblePanes.web && !visiblePanes.pdf) ? '100%' : `${paneWeights.code}%`,
                  flex: (!visiblePanes.web && !visiblePanes.pdf) ? '1 1 100%' : `0 0 ${paneWeights.code}%`
                }}
              >
                {/* Floating Action Controls */}
                <div className="studio-floating-actions">
                  <button 
                    className="studio-icon-btn"
                    onClick={() => triggerFilePicker(sourceFormat)}
                    title="استيراد ملف من جهازك"
                    aria-label="استيراد ملف"
                    style={{ color: '#38bdf8' }}
                  >
                    <Upload size={14} />
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
                    onClick={() => handleToggleColumnFullscreen('code')}
                    title={fullscreenTarget === 'code' ? (prevFullscreenTarget === 'all' ? 'العودة للشاشات الثلاث (Esc)' : 'تصغير (Esc)') : 'ملء شاشة الكود'}
                    aria-label="ملء شاشة الكود"
                  >
                    {fullscreenTarget === 'code' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>

                  {((visiblePanes.web ? 1 : 0) + (visiblePanes.pdf ? 1 : 0) >= 1) && (
                    <button 
                      className="studio-icon-btn"
                      onClick={() => togglePaneVisibility('code')}
                      title="إخفاء كود المصدر"
                      aria-label="إخفاء كود المصدر"
                    >
                      <EyeOff size={14} />
                    </button>
                  )}
                </div>

                <ErrorBoundary
                  fallbackTitle="تعذر تشغيل محرر الكود: خطأ في معالجة النص"
                  fallbackMessage="واجه محرر الكود تعارضاً أثناء قراءة النص المدخل. تفاصيل الخطأ التقني المكتشف:"
                >
                  {syntaxError && (
                    <div style={{
                      margin: '0.65rem 0.85rem 0.25rem 0.85rem',
                      padding: '0.65rem 0.85rem',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      borderRadius: '8px',
                      color: '#fca5a5',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
                    }}>
                      <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ color: '#ef4444' }}>تم رفض التعديل لوجود خطأ في الصياغة (Syntax Error):</strong>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: '#fca5a5', marginTop: '3px', wordBreak: 'break-all' }}>
                          {syntaxError}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#fda4af', marginTop: '3px' }}>
                          تم تعليق التحديث والحفظ التلقائي لمنع قبول أو عرض أي بيانات وهمية.
                        </div>
                      </div>
                    </div>
                  )}

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
                </ErrorBoundary>
              </div>
            )}

            {/* Splitter between Code and Next Pane */}
            {visiblePanes.code && (visiblePanes.web || visiblePanes.pdf) && (fullscreenTarget === 'none' || fullscreenTarget === 'all') && (
              <StudioSplitter
                isDragging={isDragging && activeSplitterRef.current === 0}
                onMouseDown={(e) => handleSplitterMouseDown(0, e)}
                onDoubleClick={handleResetEqualWidths}
              />
            )}

            {/* ── SCREEN 2: LIVE WEB PREVIEW (معاينة البوابة) ── */}
            {visiblePanes.web && (
              <div 
                className={`studio-screen-card screen-web ${fullscreenTarget === 'web' ? 'is-maximized' : ''}`}
                style={fullscreenTarget === 'web' ? undefined : {
                  width: !visiblePanes.pdf ? undefined : `${paneWeights.web}%`,
                  flex: !visiblePanes.pdf ? '1 1 0%' : `0 0 ${paneWeights.web}%`
                }}
              >
                {/* Floating Action Controls */}
                <div className="studio-floating-actions">
                  <button 
                    className="studio-icon-btn"
                    onClick={() => handleToggleColumnFullscreen('web')}
                    title={fullscreenTarget === 'web' ? (prevFullscreenTarget === 'all' ? 'العودة للشاشات الثلاث (Esc)' : 'تصغير (Esc)') : 'ملء شاشة الموقع'}
                    aria-label="ملء شاشة الموقع"
                  >
                    {fullscreenTarget === 'web' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>

                  {((visiblePanes.code ? 1 : 0) + (visiblePanes.pdf ? 1 : 0) >= 1) && (
                    <button 
                      className="studio-icon-btn"
                      onClick={() => togglePaneVisibility('web')}
                      title="إخفاء معاينة البوابة"
                      aria-label="إخفاء معاينة البوابة"
                    >
                      <EyeOff size={14} />
                    </button>
                  )}
                </div>

                {/* Content: Either Full Document Renderer or Interactive ApiDocumentationView */}
                <ErrorBoundary
                  fallbackTitle="تعذر عرض معاينة البوابة: خطأ في مواصفة الـ API"
                  fallbackMessage="واجه محرك المعاينة خطأ أثناء تحليل مواصفة المسارات والحقول المحددة:"
                >
                  {syntaxError && (
                    <div style={{
                      padding: '0.55rem 0.85rem',
                      background: 'rgba(239, 68, 68, 0.12)',
                      borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                      <span>المعاينة مجمدة: يوجد خطأ في صياغة الكود يمنع تحديث المواصفة.</span>
                    </div>
                  )}

                  <div className="studio-card-body-scroll spec-viewer-contained" style={pdfBlobUrl ? { height: '100%', padding: 0 } : undefined}>
                    {pdfBlobUrl ? (
                      <iframe 
                        src={pdfBlobUrl} 
                        title="معاينة وثيقة PDF" 
                        style={{ width: '100%', height: '100%', minHeight: '850px', border: 'none' }} 
                      />
                    ) : webViewMode === 'doc' ? (
                      <div className="pdf-paper-sheet" style={{ margin: '1rem auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                          <button
                            type="button"
                            onClick={() => setWebViewMode('portal')}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: '#0ea5e9',
                              color: '#ffffff',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            العودة إلى بوابة الـ API التفاعلية ←
                          </button>
                        </div>
                        <MarkdownDocumentRenderer content={sourceCode || activeDoc?.rawSource || ''} />
                      </div>
                    ) : workbenchEndpoints.length > 0 ? (
                      <ApiDocumentationView
                        endpoints={workbenchEndpoints}
                        activeEndpointIndex={selectedEndpointIndex}
                        onSelectEndpoint={setSelectedEndpointIndex}
                        systemName={activeDoc?.serviceName || 'Ultimate Pay Platform'}
                        rawSource={sourceCode || activeDoc?.rawSource}
                        highlightedField={highlightedField}
                        initialTab="endpoints"
                        extraControls={
                          <button
                            type="button"
                            onClick={() => setWebViewMode('doc')}
                            style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-muted, #cbd5e1)',
                              border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
                              cursor: 'pointer'
                            }}
                            title="عرض وثيقة الـ Markdown بالكامل"
                          >
                            المستند الكامل (PDF Spec)
                          </button>
                        }
                      />
                    ) : (
                      <div className="empty-state-notice">لا توجد بيانات صالحة للعرض</div>
                    )}
                  </div>
                </ErrorBoundary>
              </div>
            )}

            {/* Splitter between Web and PDF */}
            {visiblePanes.web && visiblePanes.pdf && (fullscreenTarget === 'none' || fullscreenTarget === 'all') && (
              <StudioSplitter
                isDragging={isDragging && activeSplitterRef.current === (visiblePanes.code ? 1 : 0)}
                onMouseDown={(e) => handleSplitterMouseDown(visiblePanes.code ? 1 : 0, e)}
                onDoubleClick={handleResetEqualWidths}
              />
            )}

            {/* ── SCREEN 3: LIVE PDF DOCUMENT PREVIEW (الوثيقة الرسمية) ── */}
            {visiblePanes.pdf && (
              <div 
                className={`studio-screen-card screen-pdf ${fullscreenTarget === 'pdf' ? 'is-maximized' : ''}`}
                style={fullscreenTarget === 'pdf' ? undefined : {
                  flex: '1 1 0%',
                  width: undefined
                }}
              >
                {/* Floating Action Controls */}
                <div className="studio-floating-actions">
                  <button 
                    className="studio-icon-btn"
                    onClick={() => window.print()}
                    title="طباعة أو تصدير الوثيقة كـ PDF"
                    aria-label="طباعة وتصدير PDF"
                    style={{ color: '#0ea5e9' }}
                  >
                    <Printer size={14} />
                  </button>

                  <button 
                    className="studio-icon-btn"
                    onClick={() => handleToggleColumnFullscreen('pdf')}
                    title={fullscreenTarget === 'pdf' ? (prevFullscreenTarget === 'all' ? 'العودة للشاشات الثلاث (Esc)' : 'تصغير (Esc)') : 'ملء شاشة الـ PDF'}
                    aria-label="ملء شاشة الـ PDF"
                  >
                    {fullscreenTarget === 'pdf' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>

                  {((visiblePanes.code ? 1 : 0) + (visiblePanes.web ? 1 : 0) >= 1) && (
                    <button 
                      className="studio-icon-btn"
                      onClick={() => togglePaneVisibility('pdf')}
                      title="إخفاء الوثيقة الرسمية"
                      aria-label="إخفاء الوثيقة الرسمية"
                    >
                      <EyeOff size={14} />
                    </button>
                  )}
                </div>

                {/* Screen 3 View Mode Toolbar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 14px',
                  background: 'var(--bg-card, #ffffff)',
                  borderBottom: '1px solid var(--border-color, #e2e8f0)',
                  fontSize: '0.78rem',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setPdfViewMode('full_doc')}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: pdfViewMode === 'full_doc' ? 700 : 500,
                        backgroundColor: pdfViewMode === 'full_doc' ? '#0ea5e9' : 'transparent',
                        color: pdfViewMode === 'full_doc' ? '#ffffff' : '#64748b',
                        border: pdfViewMode === 'full_doc' ? '1px solid #0ea5e9' : '1px solid #cbd5e1',
                        cursor: 'pointer'
                      }}
                    >
                      الوثيقة الكاملة (Full Documentation)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfViewMode('gov_summary')}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: pdfViewMode === 'gov_summary' ? 700 : 500,
                        backgroundColor: pdfViewMode === 'gov_summary' ? '#0ea5e9' : 'transparent',
                        color: pdfViewMode === 'gov_summary' ? '#ffffff' : '#64748b',
                        border: pdfViewMode === 'gov_summary' ? '1px solid #0ea5e9' : '1px solid #cbd5e1',
                        cursor: 'pointer'
                      }}
                    >
                      ملخص الحوكمة (Governance Card)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 10px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backgroundColor: '#f0fdf4',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      cursor: 'pointer'
                    }}
                    title="طباعة الوثيقة كملف PDF مطابق لـ document.pdf"
                  >
                    <Printer size={12} />
                    <span>طباعة / تصدير PDF</span>
                  </button>
                </div>

              <ErrorBoundary
                fallbackTitle="تعذر إعداد وثيقة الـ PDF: خطأ في بنية التوثيق"
                fallbackMessage="واجه محرك إعداد الوثيقة خطأ أثناء معالجة جداول التوثيق والترويسات الرسمية:"
              >
                {syntaxError && (
                  <div style={{
                    padding: '0.55rem 0.85rem',
                    background: 'rgba(239, 68, 68, 0.12)',
                    borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span>عرض الوثيقة مجمد: يلزم تصحيح أخطاء الكود لعرض التوثيق الفعلي.</span>
                  </div>
                )}

              <div className="studio-card-body-scroll studio-pdf-scroll" style={pdfBlobUrl ? { height: '100%', padding: 0 } : undefined}>
                {pdfBlobUrl ? (
                  <iframe 
                    src={pdfBlobUrl} 
                    title={activeDoc.serviceName || 'وثيقة PDF معتمدة'} 
                    style={{ width: '100%', height: '100%', minHeight: '850px', border: 'none' }} 
                  />
                ) : pdfViewMode === 'full_doc' ? (
                  <div className="pdf-paper-sheet" style={{ padding: '2.5rem 2.8rem' }}>
                    <MarkdownDocumentRenderer content={sourceCode || activeDoc?.rawSource || ''} />
                  </div>
                ) : (
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

                  {/* ── Document Metadata ── */}
                  <div className="pdf-meta-grid">
                    <div><strong>اسم الخدمة:</strong> {activeDoc.serviceName}</div>
                    <div><strong>كود الخدمة:</strong> <span dir="ltr">{activeDoc.serviceCode}</span></div>
                    <div><strong>البروتوكول:</strong> {activeDoc.channel.protocol}</div>
                    <div><strong>طريقة الاستدعاء:</strong> <span dir="ltr">{activeDoc.channel.method}</span></div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <strong>المسار الأساسي:</strong> <span className="code-font" dir="ltr">{activeDoc.channel.endpointPath}</span>
                    </div>
                    {activeDoc.baseUrl && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <strong>Base URL:</strong> <span className="code-font" dir="ltr" style={{ color: '#0ea5e9', fontSize: '0.72rem' }}>{activeDoc.baseUrl}</span>
                      </div>
                    )}
                    {activeDoc.overviewText && (
                      <div style={{ gridColumn: 'span 2', fontSize: '0.74rem', color: 'var(--text-dim, #475569)', lineHeight: 1.6, marginTop: '0.25rem', padding: '0.5rem', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', borderRight: '3px solid #10b981' }}>
                        {activeDoc.overviewText.substring(0, 300)}{activeDoc.overviewText.length > 300 ? '...' : ''}
                      </div>
                    )}
                  </div>

                  {/* ── ALL Endpoints Overview (for multi-endpoint files) ── */}
                  {activeDoc.allEndpoints && activeDoc.allEndpoints.length > 0 && (
                    <>
                      <h3 className="pdf-section-heading">
                        أولاً: نقاط النهاية (API Endpoints) — {activeDoc.allEndpoints.length} endpoint{activeDoc.allEndpoints.length > 1 ? 's' : ''} (انقر على أي نقطة لمعاينتها)
                      </h3>
                      <div className="pdf-table-wrapper">
                        <table className="pdf-formal-table">
                          <thead>
                            <tr>
                              <th style={{ width: '8%', whiteSpace: 'nowrap' }}>#</th>
                              <th style={{ width: '12%', whiteSpace: 'nowrap' }}>الطريقة</th>
                              <th style={{ width: '40%' }}>المسار (Path)</th>
                              <th style={{ width: '40%' }}>الوصف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeDoc.allEndpoints.map((ep, i) => (
                              <tr 
                                key={i}
                                onClick={() => setSelectedEndpointIndex(i)}
                                style={{
                                  cursor: 'pointer',
                                  backgroundColor: selectedEndpointIndex === i ? 'rgba(14, 165, 233, 0.12)' : undefined,
                                  borderRight: selectedEndpointIndex === i ? '3px solid #0ea5e9' : undefined
                                }}
                                title="انقر لمعاينة هذه النقطة في شاشة العرض وتفاصيلها أدناه"
                              >
                                <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.68rem', color: selectedEndpointIndex === i ? '#0284c7' : '#64748b' }}>
                                  {selectedEndpointIndex === i ? '▶ ' : ''}{i + 1}
                                </td>
                                <td>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '3px',
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    backgroundColor: ep.method === 'GET' ? '#eff6ff' : ep.method === 'POST' ? '#f0fdf4' : ep.method === 'DELETE' ? '#fef2f2' : '#fefce8',
                                    color: ep.method === 'GET' ? '#1d4ed8' : ep.method === 'POST' ? '#15803d' : ep.method === 'DELETE' ? '#b91c1c' : '#92400e',
                                    border: `1px solid ${ep.method === 'GET' ? '#bfdbfe' : ep.method === 'POST' ? '#bbf7d0' : ep.method === 'DELETE' ? '#fecaca' : '#fde68a'}`
                                  }}>
                                    {ep.method}
                                  </span>
                                </td>
                                <td><code className="code-font" dir="ltr" style={{ fontSize: '0.68rem', color: '#0f766e', fontWeight: selectedEndpointIndex === i ? 700 : 400 }}>{ep.path}</code></td>
                                <td style={{ fontSize: '0.68rem', color: '#334155', fontWeight: selectedEndpointIndex === i ? 600 : 400 }}>{ep.summary}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* ── Real Request Fields for selected endpoint ── */}
                  <h3 className="pdf-section-heading">
                    {activeDoc.allEndpoints && activeDoc.allEndpoints.length > 0 ? 'ثانياً' : 'أولاً'}: مواصفات حقول الطلب (Request Parameters) {activeDoc.allEndpoints && activeDoc.allEndpoints.length > 1 ? `— ${activeDoc.allEndpoints[selectedEndpointIndex]?.summary || ''}` : ''}
                  </h3>
                  <div className="pdf-table-wrapper">
                    <table className="pdf-formal-table">
                      <thead>
                        <tr>
                          <th style={{ width: '28%' }}>اسم الحقل</th>
                          <th style={{ width: '16%', whiteSpace: 'nowrap' }}>النوع</th>
                          <th style={{ width: '14%', whiteSpace: 'nowrap' }}>الإلزام</th>
                          <th style={{ width: '42%' }}>القيمة / الوصف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeDoc.allEndpoints?.[selectedEndpointIndex]?.requestFields && activeDoc.allEndpoints[selectedEndpointIndex].requestFields!.length > 0 ? (
                          activeDoc.allEndpoints[selectedEndpointIndex].requestFields!.map((rf, rIdx) => (
                            <tr key={rIdx}>
                              <td className="code-font" dir="ltr" style={{ fontWeight: 700, color: '#0284c7' }}>
                                {rf.name}
                              </td>
                              <td><span className="pdf-type-badge">{rf.type}</span></td>
                              <td>
                                <span className={`pdf-req-badge ${rf.required ? 'is-mandatory' : 'is-optional'}`}>
                                  {rf.required ? 'إلزامي' : 'اختياري'}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.70rem' }}>
                                {rf.example ? `القيمة: ${rf.example}` : (rf.description || (rf.length ? `طول: ${rf.length}` : '—'))}
                              </td>
                            </tr>
                          ))
                        ) : (
                          renderPdfTableRows(activeDoc.requestTree, 0, highlightedField)
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* ── Real Response Fields for selected endpoint (if available) ── */}
                  {activeDoc.allEndpoints?.[selectedEndpointIndex]?.responseFields && activeDoc.allEndpoints[selectedEndpointIndex].responseFields!.length > 0 && (
                    <>
                      <h3 className="pdf-section-heading">
                        مواصفات حقول الاستجابة (Response Parameters) — {activeDoc.allEndpoints[selectedEndpointIndex].summary}
                      </h3>
                      <div className="pdf-table-wrapper">
                        <table className="pdf-formal-table">
                          <thead>
                            <tr>
                              <th style={{ width: '28%' }}>اسم الحقل</th>
                              <th style={{ width: '18%', whiteSpace: 'nowrap' }}>النوع</th>
                              <th style={{ width: '54%' }}>الوصف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeDoc.allEndpoints[selectedEndpointIndex].responseFields!.map((rf, rIdx) => (
                              <tr key={rIdx}>
                                <td className="code-font" dir="ltr" style={{ fontWeight: 700, color: '#16a34a' }}>
                                  {rf.name}
                                </td>
                                <td><span className="pdf-type-badge">{rf.type}</span></td>
                                <td style={{ fontSize: '0.70rem' }}>{rf.description || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* ── Real Imported Headers (from file, not hardcoded) ── */}
                  {activeDoc.importedHeaders && activeDoc.importedHeaders.length > 0 && (
                    <>
                      <h3 className="pdf-section-heading">
                        {activeDoc.allEndpoints && activeDoc.allEndpoints.length > 0 ? 'ثالثاً' : 'ثانياً'}: ترويسات الأمان المطلوبة (Required Security Headers)
                      </h3>
                      <div className="pdf-table-wrapper">
                        <table className="pdf-formal-table">
                          <thead>
                            <tr>
                              <th style={{ width: '28%' }}>المفتاح (Header)</th>
                              <th style={{ width: '42%' }}>الوصف</th>
                              <th style={{ width: '30%' }}>مثال</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeDoc.importedHeaders.map((h, i) => (
                              <tr key={i}>
                                <td className="code-font" dir="ltr" style={{ fontSize: '0.70rem', fontWeight: 700, color: /sign|secret|key|auth|nonce/i.test(h.name) ? '#b45309' : '#0f172a' }}>
                                  {h.name}
                                  {/sign|secret|key|auth|nonce/i.test(h.name) && (
                                    <span style={{ fontSize: '0.55rem', marginRight: '4px', color: '#dc2626', backgroundColor: '#fef2f2', padding: '0.05rem 0.3rem', borderRadius: '2px', border: '1px solid #fca5a5' }}>سري</span>
                                  )}
                                </td>
                                <td style={{ fontSize: '0.68rem', color: '#334155' }}>{h.description}</td>
                                <td><code className="code-font" dir="ltr" style={{ fontSize: '0.63rem', color: '#059669', backgroundColor: '#ecfdf5', padding: '0.1rem 0.3rem', borderRadius: '3px', border: '1px solid #a7f3d0', wordBreak: 'break-all' }}>
                                  {h.example ? (h.example.length > 35 ? h.example.substring(0, 35) + '...' : h.example) : '—'}
                                </code></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* Fallback: show UAST headers if no importedHeaders */}
                  {(!activeDoc.importedHeaders || activeDoc.importedHeaders.length === 0) && activeDoc.headers && activeDoc.headers.length > 0 && (
                    <>
                      <h3 className="pdf-section-heading">ثانياً: ترويسات الأمان والمصادقة (Headers)</h3>
                      <div className="pdf-table-wrapper">
                        <table className="pdf-formal-table">
                          <thead>
                            <tr>
                              <th style={{ width: '35%' }}>المفتاح</th>
                              <th style={{ width: '25%', whiteSpace: 'nowrap' }}>النوع</th>
                              <th style={{ width: '40%' }}>الوصف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeDoc.headers.map((h, i) => (
                              <tr key={i}>
                                <td className="code-font" dir="ltr" style={{ fontSize: '0.70rem' }}>{h.semantics.name}</td>
                                <td style={{ whiteSpace: 'nowrap', fontSize: '0.68rem' }}>{h.semantics.dataType}</td>
                                <td style={{ fontSize: '0.68rem' }}>{h.semantics.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* ── Real Error Codes ── */}
                  {(activeDoc.errorCodes || []).length > 0 && (
                    <>
                      <h3 className="pdf-section-heading">
                        {activeDoc.allEndpoints && activeDoc.allEndpoints.length > 0
                          ? (activeDoc.importedHeaders && activeDoc.importedHeaders.length > 0 ? 'رابعاً' : 'ثالثاً')
                          : (activeDoc.importedHeaders && activeDoc.importedHeaders.length > 0 ? 'ثالثاً' : 'ثانياً')
                        }: مصفوفة أكواد الأخطاء والإجراءات (Error Matrix)
                        {activeDoc.errorCodes!.length > 12 && <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#64748b', marginRight: '0.5rem' }}>— يُعرض أول 12 من {activeDoc.errorCodes!.length}</span>}
                      </h3>
                      <div className="pdf-table-wrapper">
                        <table className="pdf-formal-table">
                          <thead>
                            <tr>
                              <th>كود الخطأ</th>
                              <th>الرسالة التوضيحية</th>
                              <th>الإجراء التصحيحي</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeDoc.errorCodes!.slice(0, 12).map((err, i) => (
                              <tr key={i}>
                                <td className="code-font" dir="ltr" style={{ fontSize: '0.65rem', color: '#dc2626', fontWeight: 700 }}>{err.code}</td>
                                <td style={{ fontSize: '0.67rem' }}>{err.message}</td>
                                <td style={{ fontSize: '0.67rem', color: '#0369a1' }}>{err.action}</td>
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
                      هذه الوثيقة صادرة عن المنظومة الوطنية وتعتبر مرجعاً ملزماً لكافة المطورين.
                    </div>
                  </div>
                </div>
                )}
                {/* Permanent Bottom Safety Bar - stays visible during all scrolling */}
                <div className="preview-permanent-bottom-safe-bar" />
              </div>
              </ErrorBoundary>
            </div>
            )}

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
                <div className="studio-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="studio-pane-pill">{selectedDraft.serviceCode} - {selectedDraft.serviceName}</span>
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.15)', padding: '2px', borderRadius: '5px' }}>
                      <button
                        type="button"
                        onClick={() => setDraftViewMode('full_doc')}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '0.72rem',
                          fontWeight: draftViewMode === 'full_doc' ? 700 : 500,
                          backgroundColor: draftViewMode === 'full_doc' ? '#10b981' : 'transparent',
                          color: draftViewMode === 'full_doc' ? '#ffffff' : '#94a3b8',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        المستند الكامل (PDF Spec)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftViewMode('gov_summary')}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '0.72rem',
                          fontWeight: draftViewMode === 'gov_summary' ? 700 : 500,
                          backgroundColor: draftViewMode === 'gov_summary' ? '#0ea5e9' : 'transparent',
                          color: draftViewMode === 'gov_summary' ? '#ffffff' : '#94a3b8',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        بطاقة الحوكمة
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                        cursor: 'pointer'
                      }}
                      title="طباعة المسودة كـ PDF"
                    >
                      <Printer size={12} />
                      <span>طباعة PDF</span>
                    </button>
                    <button 
                      className="studio-icon-btn"
                      onClick={() => setDraftPdfFullscreen(prev => !prev)}
                      title="تكبير المعاينة"
                      aria-label="تكبير المعاينة"
                    >
                      {draftPdfFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                    </button>
                  </div>
                </div>

                <div className="studio-card-body-scroll studio-pdf-scroll" style={(selectedDraft.rawFormat === 'pdf' && pdfBlobUrl) ? { height: '100%', padding: 0 } : undefined}>
                  {(selectedDraft.rawFormat === 'pdf' && pdfBlobUrl) ? (
                    <iframe 
                      src={pdfBlobUrl} 
                      title={selectedDraft.serviceName || 'وثيقة PDF معتمدة'} 
                      style={{ width: '100%', height: '100%', minHeight: '850px', border: 'none' }} 
                    />
                  ) : (draftViewMode === 'full_doc' || selectedDraft.rawFormat === 'markdown' || (selectedDraft.rawSource && selectedDraft.rawSource.startsWith('#'))) ? (
                    <div className="pdf-paper-sheet" style={{ padding: '2.5rem 2.8rem' }}>
                      <MarkdownDocumentRenderer content={selectedDraft.rawSource || ''} />
                    </div>
                  ) : (
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
                              <th style={{ width: '30%' }}>اسم الحقل</th>
                              <th style={{ width: '20%', whiteSpace: 'nowrap' }}>النوع</th>
                              <th style={{ width: '18%', whiteSpace: 'nowrap' }}>الإلزام</th>
                              <th style={{ width: '32%' }}>القيمة الحية / الوصف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {renderPdfTableRows(selectedDraft.requestTree)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
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
                <div className="studio-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="studio-pane-pill">{selectedSubmission.serviceCode} - {selectedSubmission.serviceName}</span>
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.15)', padding: '2px', borderRadius: '5px' }}>
                      <button
                        type="button"
                        onClick={() => setSubViewMode('full_doc')}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '0.72rem',
                          fontWeight: subViewMode === 'full_doc' ? 700 : 500,
                          backgroundColor: subViewMode === 'full_doc' ? '#10b981' : 'transparent',
                          color: subViewMode === 'full_doc' ? '#ffffff' : '#94a3b8',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        المستند الكامل (PDF Spec)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubViewMode('gov_summary')}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '0.72rem',
                          fontWeight: subViewMode === 'gov_summary' ? 700 : 500,
                          backgroundColor: subViewMode === 'gov_summary' ? '#0ea5e9' : 'transparent',
                          color: subViewMode === 'gov_summary' ? '#ffffff' : '#94a3b8',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        بطاقة الحوكمة
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {selectedSubmission.status === 'PENDING_REVIEW' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const approvedDoc: UastDocument = {
                            ...selectedSubmission,
                            status: 'PUBLISHED',
                            publishedVersionId: `REL_${Date.now()}`,
                            updatedAt: new Date().toISOString()
                          };
                          await uastDraftService.saveDraft(approvedDoc);
                          refreshStorageLists();
                          if (onPublishSuccess) {
                            onPublishSuccess(approvedDoc, approvedDoc.systemKey, approvedDoc.entityId);
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="اعتماد هذه الوثيقة وتجميد كافة نقاط النهاية في الكتالوج المعتمد"
                      >
                        <CheckCircle2 size={13} />
                        <span>اعتماد ونشر في الكتالوج</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => window.print()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                        cursor: 'pointer'
                      }}
                      title="طباعة الوثيقة كـ PDF"
                    >
                      <Printer size={12} />
                      <span>طباعة PDF</span>
                    </button>
                    <button 
                      className="studio-icon-btn"
                      onClick={() => setSubPdfFullscreen(prev => !prev)}
                      title="تكبير المعاينة"
                      aria-label="تكبير المعاينة"
                    >
                      {subPdfFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                  </div>
                </div>

                <div className="studio-card-body-scroll studio-pdf-scroll" style={(selectedSubmission.rawFormat === 'pdf' && pdfBlobUrl) ? { height: '100%', padding: 0 } : undefined}>
                  {(selectedSubmission.rawFormat === 'pdf' && pdfBlobUrl) ? (
                    <iframe 
                      src={pdfBlobUrl} 
                      title={selectedSubmission.serviceName || 'وثيقة PDF معتمدة'} 
                      style={{ width: '100%', height: '100%', minHeight: '850px', border: 'none' }} 
                    />
                  ) : (subViewMode === 'full_doc' || selectedSubmission.rawFormat === 'markdown' || (selectedSubmission.rawSource && selectedSubmission.rawSource.startsWith('#'))) ? (
                    <div className="pdf-paper-sheet" style={{ padding: '2.5rem 2.8rem' }}>
                      <MarkdownDocumentRenderer content={selectedSubmission.rawSource || ''} />
                    </div>
                  ) : (
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
                              <th style={{ width: '30%' }}>اسم الحقل</th>
                              <th style={{ width: '20%', whiteSpace: 'nowrap' }}>النوع</th>
                              <th style={{ width: '18%', whiteSpace: 'nowrap' }}>الإلزام</th>
                              <th style={{ width: '32%' }}>القيمة الحية / الوصف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {renderPdfTableRows(selectedSubmission.requestTree)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Permanent Bottom Safety Bar - stays visible during all scrolling */}
                <div className="preview-permanent-bottom-safe-bar" />
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
      : '';
    const isHighlighted = highlightedField === node.semantics.name;
    rows.push(
      <tr 
        key={node.nodeId}
        id={`col3-field-${node.semantics.name}`}
        className={isHighlighted ? 'row-live-highlight' : ''}
      >
        <td>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', paddingRight: `${depth * 8}px` }}>
            {depth > 0 && <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>└─</span>}
            <code className="code-font" dir="ltr" style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)', fontSize: '0.72rem' }}>
              {node.semantics.name}
            </code>
          </span>
        </td>
        <td style={{ whiteSpace: 'nowrap' }}>
          <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim, #475569)', fontWeight: 600 }}>
            {node.semantics.dataType}
          </span>
        </td>
        <td style={{ whiteSpace: 'nowrap' }}>
          <span style={{
            display: 'inline-block',
            padding: '0.10rem 0.45rem',
            borderRadius: '3px',
            fontSize: '0.64rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            backgroundColor: node.constraints.required ? '#fef2f2' : '#f0fdf4',
            color: node.constraints.required ? '#b91c1c' : '#15803d',
            border: `1px solid ${node.constraints.required ? '#fecaca' : '#bbf7d0'}`
          }}>
            {node.constraints.required ? 'إجباري' : 'اختياري'}
          </span>
        </td>
        <td>
          {val && val !== '-' ? (
            <code className="code-font" dir="ltr" style={{ 
              color: '#059669', 
              fontWeight: 700, 
              backgroundColor: '#ecfdf5', 
              padding: '0.10rem 0.35rem', 
              borderRadius: '3px',
              fontSize: '0.70rem',
              display: 'inline-block',
              border: '1px solid #a7f3d0'
            }}>
              {val}
            </code>
          ) : (
            <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.3 }}>
              {node.semantics.description || '-'}
            </span>
          )}
        </td>
      </tr>
    );
  }
  for (const child of node.children) {
    rows.push(...renderPdfTableRows(child, depth + 1, highlightedField));
  }
  return rows;
}
