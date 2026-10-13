import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SealedSnapshot, Sector } from '../../types/schema';
import { useLanguage } from '../../i18n';

interface ExportStudioViewProps {
  snapshots?: SealedSnapshot[];
  sectorsData?: Record<string, Sector>;
  onNotify: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error', snippet?: string) => void;
}

type ExportFormat = 'pdf' | 'word' | 'markdown' | 'openapi' | 'postman' | 'iso';

interface ServiceItem {
  code: string;
  title: string;
  titleEn: string;
  sectorName: string;
  sectorNameEn: string;
  sectorKey: string;
  endpoints: {
    method: string;
    path: string;
    desc: string;
    descEn: string;
  }[];
}

export const ExportStudioView: React.FC<ExportStudioViewProps> = ({
  snapshots = [],
  sectorsData,
  onNotify
}) => {
  const { t, language, isRtl } = useLanguage();

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [exportLanguage, setExportLanguage] = useState<'ar' | 'en'>(language);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [panelWidth, setPanelWidth] = useState<number>(310);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'options' | 'preview'>('options');
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => 
    typeof window !== 'undefined' ? window.innerWidth < 960 : false
  );
  const wrapRef = useRef<HTMLDivElement>(null);

  // Responsive window resize listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 960);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync export language with system language when system language changes
  useEffect(() => {
    setExportLanguage(language);
  }, [language]);

  // Dynamic Draggable Splitter between Export Options and Document Preview
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (clientX: number) => {
      if (!wrapRef.current) return;
      const wrapRect = wrapRef.current.getBoundingClientRect();
      const currentRtl = document.documentElement.getAttribute('dir') === 'rtl';
      let newWidth = currentRtl ? (wrapRect.right - clientX) : (clientX - wrapRect.left);

      const maxPanelWidth = Math.max(200, wrapRect.width - 340);
      newWidth = Math.max(180, Math.min(newWidth, Math.min(550, maxPanelWidth)));

      setPanelWidth(newWidth);
    };

    const handleMouseMove = (e: MouseEvent) => {
      onMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        onMove(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleEnd);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  // Sector filters
  const [sectors, setSectors] = useState({
    banking: true,
    merchants: true,
    aml: true
  });

  // Package modules filters
  const [modules, setModules] = useState({
    schemas: true,
    wire: true,
    crypto: true,
    errors: true,
    sla: true
  });

  const version = 'v2026.2';
  const isExportEn = exportLanguage === 'en';

  // Build bilingual services list
  const defaultStaticServices: ServiceItem[] = [
    {
      code: 'IPS',
      title: 'التحويل اللحظي',
      titleEn: 'Instant Payment Service (IPS)',
      sectorName: 'البنوك',
      sectorNameEn: 'Banking',
      sectorKey: 'banking',
      endpoints: [
        { 
          method: 'POST', 
          path: '/v1/transfers', 
          desc: 'تنفيذ أمر تحويل بنكي فوري مطابق لضوابط المقاصة الوطنية',
          descEn: 'Execute instant bank transfer compliant with national clearing rules'
        },
        { 
          method: 'GET', 
          path: '/v1/transfers/{id}', 
          desc: 'الاستعلام الفوري عن حالة المعالجة والتسوية النهائية للحوالة',
          descEn: 'Instant query for transfer settlement and clearing status'
        },
        { 
          method: 'POST', 
          path: '/v1/transfers/{id}/recall', 
          desc: 'طلب استرجاع رسمي للحوالة الخاطئة وفق اللائحة',
          descEn: 'Formal recall request for disputed or incorrect remittance'
        }
      ]
    },
    {
      code: 'ACCOUNTS',
      title: 'استعلام الحسابات',
      titleEn: 'Account Inquiry (Open Banking)',
      sectorName: 'البنوك',
      sectorNameEn: 'Banking',
      sectorKey: 'banking',
      endpoints: [
        { 
          method: 'GET', 
          path: '/v1/accounts/{iban}/balance', 
          desc: 'التحقق الفوري من الرصيد المتاح والأهلية المالية للعميل',
          descEn: 'Verify available ledger balance under verified customer consent'
        }
      ]
    },
    {
      code: 'RTGS',
      title: 'تسويات RTGS',
      titleEn: 'RTGS Settlements',
      sectorName: 'البنوك',
      sectorNameEn: 'Banking',
      sectorKey: 'banking',
      endpoints: [
        { 
          method: 'POST', 
          path: '/v1/rtgs/settlements', 
          desc: 'تسوية إجمالية فورية للحوالات الكبيرة بين البنوك المشاركة',
          descEn: 'High-value gross settlement between participant central clearing members'
        }
      ]
    },
    {
      code: 'PAY',
      title: 'الدفع السريع',
      titleEn: 'E-Commerce Checkout',
      sectorName: 'التجار',
      sectorNameEn: 'Merchants',
      sectorKey: 'merchants',
      endpoints: [
        { 
          method: 'POST', 
          path: '/v1/payments/charge', 
          desc: 'خصم فوري لمعاملات نقاط البيع الإلكترونية برمز تفويض آمن',
          descEn: 'Instant debit for POS & online checkouts with tokenized authentication'
        },
        { 
          method: 'POST', 
          path: '/v1/payments/{paymentId}/void', 
          desc: 'إلغاء فوري لعملية الدفع قبل الإقفال اليومي للحساب',
          descEn: 'Immediate transaction voiding prior to daily batch cut-off'
        }
      ]
    },
    {
      code: 'REFUND',
      title: 'الاسترجاع المالي',
      titleEn: 'Card Refund Processing',
      sectorName: 'التجار',
      sectorNameEn: 'Merchants',
      sectorKey: 'merchants',
      endpoints: [
        { 
          method: 'POST', 
          path: '/v1/refunds', 
          desc: 'استرداد مالي جزئي أو كلي لقيمة الشراء إلى البطاقة المصرفية',
          descEn: 'Partial or full refund of transaction value to originating card'
        }
      ]
    },
    {
      code: 'AML',
      title: 'فحص الحظر AML',
      titleEn: 'Sanctions & AML Screening',
      sectorName: 'مكافحة غسل الأموال',
      sectorNameEn: 'Anti-Money Laundering',
      sectorKey: 'aml',
      endpoints: [
        { 
          method: 'POST', 
          path: '/v1/compliance/sanctions/check', 
          desc: 'فحص أمني استباقي ومطابقة قوائم الحظر الوطنية والدولية',
          descEn: 'Real-time sanctions screening against UN, national, and FATF watchlists'
        }
      ]
    }
  ];

  // Dynamic services list from passed sectorsData or fallback
  const allServices: ServiceItem[] = useMemo(() => {
    if (sectorsData && Object.keys(sectorsData).length > 0) {
      const dynamicList: ServiceItem[] = [];
      Object.entries(sectorsData).forEach(([secKey, sec]) => {
        if (!sec.services) return;
        Object.values(sec.services).forEach(srv => {
          if (!srv.endpoints || srv.endpoints.length === 0) return;
          dynamicList.push({
            code: srv.code || sec.code || 'SVC',
            title: srv.title || sec.name,
            titleEn: srv.titleEn || sec.nameEn || srv.title,
            sectorName: sec.name,
            sectorNameEn: sec.nameEn || sec.name,
            sectorKey: secKey,
            endpoints: srv.endpoints.map(ep => ({
              method: ep.method,
              path: ep.path,
              desc: ep.desc,
              descEn: ep.descEn || ep.desc
            }))
          });
        });
      });
      if (dynamicList.length > 0) return dynamicList;
    }
    return defaultStaticServices;
  }, [sectorsData]);

  // Unique sector list for filters
  const sectorList = useMemo(() => {
    const map = new Map<string, { key: string; name: string; nameEn: string }>();
    allServices.forEach(s => {
      if (!map.has(s.sectorKey)) {
        map.set(s.sectorKey, { key: s.sectorKey, name: s.sectorName, nameEn: s.sectorNameEn });
      }
    });
    return Array.from(map.values());
  }, [allServices]);

  const isSectorChecked = (key: string) => (sectors as any)[key] !== false;
  const selectedServices = allServices.filter(s => isSectorChecked(s.sectorKey));
  const totalEndpoints = selectedServices.reduce((sum, s) => sum + s.endpoints.length, 0);

  const selectedSectorCount = sectorList.filter(s => isSectorChecked(s.key)).length;
  const selectedModuleCount = Object.values(modules).filter(Boolean).length;

  const securityMap: Record<string, string> = {
    banking: 'mTLS + FAPI 1.0 Advanced',
    merchants: 'Idempotency + HMAC-SHA256',
    aml: 'Zero-Trust Sanction Screening'
  };

  // Helper to trigger direct client download
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // OpenAPI Spec Generator
  const generateOpenApiSpec = () => {
    const paths: Record<string, any> = {};
    selectedServices.forEach(s => {
      s.endpoints.forEach(ep => {
        paths[ep.path] = {
          [ep.method.toLowerCase()]: {
            summary: isExportEn ? (ep.descEn || ep.path) : (ep.desc || s.title),
            tags: [isExportEn ? s.sectorNameEn : s.sectorName, s.code],
            parameters: [
              {
                name: "X-Idempotency-Key",
                in: "header",
                required: ep.method === 'POST',
                schema: { type: "string", format: "uuid" }
              }
            ],
            responses: {
              [ep.method === 'POST' ? "201" : "200"]: {
                description: isExportEn ? "Successful Operation" : "عملية ناجحة ومطابقة",
                content: {
                  "application/json": {
                    schema: { type: "object", properties: { status: { type: "string", example: "SUCCESS" } } }
                  }
                }
              }
            }
          }
        };
      });
    });

    return {
      openapi: "3.1.0",
      info: {
        title: isExportEn ? "Ultimate Pay Fintech API Governance Specifications" : "مواصفة Ultimate Pay لحوكمة الـ API المصرفية والمدفوعات",
        version: version,
        description: isExportEn 
          ? "Unified National Technical Specification for Financial Institutions & Fintech Gateway"
          : "المواصفة الوطنية الموحدة لربط الخدمات المصرفية والمدفوعات الإلكترونية"
      },
      servers: [{ url: "https://api.sama.gov.sa/v1", description: "Production Gateway (mTLS Strict)" }],
      paths
    };
  };

  // Postman Collection Generator
  const generatePostmanCollection = () => {
    const items = selectedServices.map(s => ({
      name: `${s.code} - ${isExportEn ? s.sectorNameEn : s.sectorName}`,
      item: s.endpoints.map(ep => ({
        name: isExportEn ? (ep.descEn || ep.path) : (ep.desc || ep.path),
        request: {
          method: ep.method,
          header: [
            { key: "Authorization", value: "Bearer {{authToken}}" },
            { key: "X-Idempotency-Key", value: "{{idempotencyKey}}" }
          ],
          url: {
            raw: "{{baseUrl}}" + ep.path,
            host: ["{{baseUrl}}"],
            path: ep.path.split('/').filter(Boolean)
          }
        }
      }))
    }));

    return {
      info: {
        name: `Ultimate-Pay-APIs-${version}-${exportLanguage.toUpperCase()}`,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: items
    };
  };

  // ISO 20022 XML Generator
  const generateIsoXml = () => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>SAMA-TRF-${Date.now()}-001</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>${totalEndpoints}</NbOfTxs>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
        <ClrSys>
          <Prtry>SARIE-INSTANT</Prtry>
        </ClrSys>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <EndToEndId>E2E-FINTECH-${version}-99281</EndToEndId>
        <TxId>TX-${Date.now()}</TxId>
      </PmtId>
      <IntrBkSttlmAmt Ccy="SAR">25000.00</IntrBkSttlmAmt>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>NCBKSAJE</BICFI>
          <Nm>${isExportEn ? 'The Saudi National Bank (SNB)' : 'البنك الأهلي السعودي'}</Nm>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>RJHISEJ2</BICFI>
          <Nm>${isExportEn ? 'Al Rajhi Banking Corp' : 'مصرف الراجحي'}</Nm>
        </FinInstnId>
      </CdtrAgt>
      <SplmtryData>
        <PlcAndNm>RegulatorySignOff</PlcAndNm>
        <Envlp>
          <SovereignSeal>SAMA-SEALED-RSA4096-COMPLIANT</SovereignSeal>
        </Envlp>
      </SplmtryData>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;
  };

  // Ultimate Pay Markdown Specification Generator
  const generateMarkdownContent = () => {
    if (isExportEn) {
      let md = `# Financial Institutions (FI) API Documentation\n\n`;
      md += `**Ultimate Pay Platform — Official Specification (${version})**\n\n`;
      md += `Latest Certification Date: 2026-10-12  \n\n`;
      md += `---\n\n`;

      if (modules.schemas) {
        md += `## 1. Executive Overview & Gateway\n\n`;
        md += `The **Ultimate Pay Financial Institutions (FI) API** provides accredited banks, merchant processors, and fintechs with real-time settlement, account balances, and automated screening. All transactions are authenticated using RSA-PSS 4096 digital signatures.\n\n`;
        md += `### Production Base URL\n\n`;
        md += `\`\`\`http\nhttps://tahseeltest.ultimate-pay.net/webserve\n\`\`\`\n\n`;
        md += `---\n\n`;
      }

      if (modules.crypto) {
        md += `## 2. Security & Digital Signatures\n\n`;
        md += `Every API call sent to the gateway requires digital signature headers computed from the institution private key.\n\n`;
        md += `\`\`\`text\n<HTTP_METHOD>\\n<PATH>\\n<TIMESTAMP>\\n<NONCE>\\n<SHA256_HASH_OF_BODY>\n\`\`\`\n\n`;
        md += `---\n\n`;
        md += `### Mandatory Headers\n\n`;
        md += `| Header Name | Requirement | Description | Example |\n`;
        md += `| :--- | :--- | :--- | :--- |\n`;
        md += `| \`X-Client-ID\` | Required | Institution Client ID | \`client_corp_17\` |\n`;
        md += `| \`X-Timestamp\` | Required | Unix timestamp in seconds | \`1786981200\` |\n`;
        md += `| \`X-Nonce\` | Required | UUID v4 nonce string | \`c9bf9e57-1685-4c89-bafb-ff5af830be8a\` |\n`;
        md += `| \`X-Signature\` | Required | Base64 RSA-256 digital signature | \`dGhpcyBpcyBhIHNpZ25hdHVyZQ...\` |\n`;
        md += `| \`Content-Type\` | Required | Payload format | \`application/json\` |\n\n`;
        md += `---\n\n`;
      }

      if (modules.errors) {
        md += `## 3. Standard Regulatory Error Codes\n\n`;
        md += `| Error Code | Semantic Identifier | Required Action |\n`;
        md += `| :--- | :--- | :--- |\n`;
        md += `| \`10111\` | INSUFFICIENT_FUNDS | Verify customer balance before resubmission |\n`;
        md += `| \`10112\` | DAILY_LIMIT_EXCEEDED | Daily transactional threshold surpassed |\n`;
        md += `| \`10204\` | DUPLICATE_IDEMPOTENCY_KEY | Transaction was already executed with this key |\n`;
        md += `| \`10301\` | AML_SANCTION_MATCH | Transaction blocked due to sanction list match |\n\n`;
        md += `---\n\n`;
      }

      if (modules.sla) {
        md += `## 4. Service Level Agreement (SLA)\n\n`;
        md += `- **Availability**: 99.99% Annual Uptime\n`;
        md += `- **Latency**: P99 Processing Time < 150ms\n`;
        md += `- **Idempotency Window**: 24 Hours Cache Guarantee\n\n`;
        md += `---\n\n`;
      }

      md += `## 5. Endpoints & Operations Matrix (${totalEndpoints} Endpoints)\n\n`;
      selectedServices.forEach(s => {
        md += `### Sector: ${s.sectorNameEn} — ${s.titleEn}\n\n`;
        s.endpoints.forEach(ep => {
          md += `- **${ep.method}** \`${ep.path}\` — ${ep.descEn}\n`;
        });
        md += `\n`;
      });

      return md;
    } else {
      let md = `# وثيقة المواصفات الفنية للربط المصرفي (FI API Documentation)\n\n`;
      md += `**منظومة Ultimate Pay — الإصدار المعتمد (${version})**\n\n`;
      md += `تاريخ التحديث والاعتماد: 2026-10-12  \n\n`;
      md += `---\n\n`;

      if (modules.schemas) {
        md += `## 1. نظرة عامة ومعمارية البوابة\n\n`;
        md += `تُمكّن **واجهة برمجة تطبيقات المؤسسات المالية (FI API)** في Ultimate Pay البنوك ومزودي خدمات الدفع من التكامل الآمن في التحويلات اللحظية، استعلام الأرصدة، والمقاصة المركزية. تخضع كافة الطلبات لتشفير وتوقيع رقمي RSA-SHA256.\n\n`;
        md += `### رابط بوابة الإنتاج المعتمدة (Base URL)\n\n`;
        md += `\`\`\`http\nhttps://tahseeltest.ultimate-pay.net/webserve\n\`\`\`\n\n`;
        md += `---\n\n`;
      }

      if (modules.crypto) {
        md += `## 2. معايير الأمان والتوقيع الإلكتروني\n\n`;
        md += `يجب أن يتضمن كل طلب ترويسات أمنية مخصصة وموقعة رقمياً بمفتاح البنك الخاص RSA-PSS 4096.\n\n`;
        md += `\`\`\`text\n<HTTP_METHOD>\\n<PATH>\\n<TIMESTAMP>\\n<NONCE>\\n<SHA256_HASH_OF_BODY>\n\`\`\`\n\n`;
        md += `---\n\n`;
        md += `### الترويسات الإلزامية في الطلب\n\n`;
        md += `| اسم الترويسة | الإلزامية | الوصف | مثال |\n`;
        md += `| :--- | :--- | :--- | :--- |\n`;
        md += `| \`X-Client-ID\` | إلزامي | المعرف الرقمي الخاص بالجهة | \`client_corp_17\` |\n`;
        md += `| \`X-Timestamp\` | إلزامي | التوقيت الزمني بالثواني | \`1786981200\` |\n`;
        md += `| \`X-Nonce\` | إلزامي | مفتاح عشوائي UUID v4 | \`c9bf9e57-1685-4c89-bafb-ff5af830be8a\` |\n`;
        md += `| \`X-Signature\` | إلزامي | التوقيع الرقمي المشفر Base64 | \`dGhpcyBpcyBhIHNpZ25hdHVyZQ...\` |\n`;
        md += `| \`Content-Type\` | إلزامي | صيغة البيانات المرسلة | \`application/json\` |\n\n`;
        md += `---\n\n`;
      }

      if (modules.errors) {
        md += `## 3. سجل وقاموس الأخطاء الرقابية القياسية\n\n`;
        md += `| كود الخطأ | الرمز المعياري | الإجراء الموصى به |\n`;
        md += `| :--- | :--- | :--- |\n`;
        md += `| \`10111\` | INSUFFICIENT_FUNDS | رصيد الحساب غير كافٍ لإتمام العملية |\n`;
        md += `| \`10112\` | DAILY_LIMIT_EXCEEDED | تجاوز السقف اليومي للعمليات المسموح بها |\n`;
        md += `| \`10204\` | DUPLICATE_IDEMPOTENCY_KEY | تم تنفيذ العملية مسبقاً بنفس مفتاح عدم التكرار |\n`;
        md += `| \`10301\` | AML_SANCTION_MATCH | حظر المعاملة لتطابق قوائم الحظر والاشتباه |\n\n`;
        md += `---\n\n`;
      }

      if (modules.sla) {
        md += `## 4. اتفاقية مستوى الخدمة (SLA)\n\n`;
        md += `- **التوافر التشغيلي**: 99.99% سنوي\n`;
        md += `- **زمن الاستجابة**: أقل من 150ms في الذروة\n`;
        md += `- **نافذة عدم التكرار**: 24 ساعة إلزامية\n\n`;
        md += `---\n\n`;
      }

      md += `## 5. مصفوفة المسارات المعتمدة (${totalEndpoints} مسار)\n\n`;
      selectedServices.forEach(s => {
        md += `### القطاع: ${s.sectorName} — ${s.title}\n\n`;
        s.endpoints.forEach(ep => {
          md += `- **${ep.method}** \`${ep.path}\` — ${ep.desc}\n`;
        });
        md += `\n`;
      });

      return md;
    }
  };

  // Main Export Trigger
  const handleExecuteExport = async () => {
    setIsExporting(true);

    try {
      if (selectedFormat === 'pdf') {
        const win = window as any;
        const filename = `ultimate-pay-specification-${version}-${exportLanguage}.pdf`;
        
        if (typeof win.html2pdf !== 'undefined') {
          const stackContainer = document.getElementById('pdf-pages-stack-container');
          if (!stackContainer) {
            throw new Error(isExportEn ? 'Document pages not found for export' : 'لم يتم العثور على صفحات المستند للتصدير');
          }

          // Build clean off-screen export stage (794px A4 standard)
          const exportStage = document.createElement('div');
          exportStage.id = 'clean-pdf-export-stage';
          exportStage.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 794px;
            background: #ffffff;
            direction: ${isExportEn ? 'ltr' : 'rtl'};
            margin: 0;
            padding: 0;
            z-index: 999997;
            box-shadow: none;
            border: none;
            pointer-events: none;
          `;

          const pages = stackContainer.querySelectorAll('.pdf-paper-page');
          pages.forEach((p, idx) => {
            const clone = p.cloneNode(true) as HTMLElement;
            clone.className = 'pdf-paper-page' + (idx < pages.length - 1 ? ' html2pdf__page-break' : '');
            clone.style.cssText = `
              width: 794px !important;
              min-height: 1122px !important;
              max-height: 1122px !important;
              height: 1122px !important;
              box-sizing: border-box !important;
              padding: 36px 40px !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
              direction: ${isExportEn ? 'ltr' : 'rtl'} !important;
              font-family: ${isExportEn ? "'Outfit', system-ui, sans-serif" : "'Cairo', system-ui, sans-serif"} !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              overflow: hidden !important;
              ${idx < pages.length - 1 ? 'page-break-after: always !important; break-after: page !important;' : 'page-break-after: avoid !important; break-after: avoid !important;'}
            `;

          // Unconstrain table scroll views in export clone for complete rendering
          const tableWraps = clone.querySelectorAll('.pdf-mini-table-wrap');
          tableWraps.forEach(tw => {
            (tw as HTMLElement).style.maxHeight = 'none';
            (tw as HTMLElement).style.overflow = 'visible';
          });

          clone.querySelectorAll('*').forEach(el => {
            (el as HTMLElement).style.letterSpacing = 'normal';
            (el as HTMLElement).style.fontKerning = 'normal';
          });

          exportStage.appendChild(clone);
        });

        document.body.appendChild(exportStage);

        const opt = {
          margin: [0, 0, 0, 0],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: false,
            scrollY: 0,
            scrollX: 0,
            windowWidth: 794
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], after: '.html2pdf__page-break' }
        };

        try {
          await win.html2pdf().set(opt).from(exportStage).save();

          onNotify(
            t('export.exportSuccessTitle'),
            `${t('export.exportSuccessMsg', { format: 'PDF' })} (${filename})`,
            'success',
            filename
          );
          return;
        } catch (pdfErr: any) {
          console.warn('html2pdf.save fallback to output blob', pdfErr);
          const pdfBlob = await win.html2pdf().set(opt).from(exportStage).outputPdf('blob');
          downloadBlob(pdfBlob, filename);
          onNotify(
            t('export.exportSuccessTitle'),
            `${t('export.exportSuccessMsg', { format: 'PDF' })} (${filename})`,
            'success',
            filename
          );
          return;
        } finally {
          if (exportStage && exportStage.parentNode) {
            exportStage.parentNode.removeChild(exportStage);
          }
        }
      } else {
        // Direct browser print fallback if script is loading or unavailable
        window.print();
        onNotify(
          t('export.exportSuccessTitle'),
          'تم فتح نافذة الطباعة الرسمية',
          'info'
        );
      }

      } else if (selectedFormat === 'word') {
        const filename = `ultimate-pay-specification-${version}-${exportLanguage}.docx`;
        const docDir = isExportEn ? 'ltr' : 'rtl';
        const docFont = isExportEn ? 'Outfit, Arial, sans-serif' : 'Cairo, Arial, sans-serif';

        const docContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>ULTIMATE-PAY-SPEC-${version}</title></head>
<body style="font-family:${docFont}; direction:${docDir}; padding: 2rem;">
  <h1 style="color:#0284c7; text-align:center;">
    ${isExportEn ? 'Kingdom of Saudi Arabia — Saudi Central Bank' : 'المملكة العربية السعودية — البنك المركزي السعودي'}
  </h1>
  <h2 style="text-align:center;">
    ${isExportEn 
      ? `National Financial Institutions API Technical Specifications (${version})` 
      : `وثيقة المواصفة الفنية الوطنية لمعايير الربط المصرفي (${version})`}
  </h2>
  <hr/>
  <h3>${isExportEn ? `Approved Endpoints Matrix (${totalEndpoints} Endpoints)` : `ملخص المسارات المعتمدة (${totalEndpoints} مسار)`}</h3>
  <table border="1" cellpadding="6" style="border-collapse:collapse; width:100%;">
    <tr style="background:#0f172a; color:#fff;">
      <th>${isExportEn ? 'Sector' : 'القطاع'}</th>
      <th>${isExportEn ? 'Service' : 'الخدمة'}</th>
      <th>${isExportEn ? 'Route Path' : 'المسار'}</th>
      <th>${isExportEn ? 'Description' : 'الوصف'}</th>
    </tr>
    ${selectedServices.map(s => s.endpoints.map(ep => `
      <tr>
        <td>${isExportEn ? s.sectorNameEn : s.sectorName}</td>
        <td>${isExportEn ? s.titleEn : s.title}</td>
        <td><b>${ep.method}</b> ${ep.path}</td>
        <td>${isExportEn ? ep.descEn : ep.desc}</td>
      </tr>
    `).join('')).join('')}
  </table>
</body>
</html>`;
        const blob = new Blob([docContent], { type: 'application/msword;charset=utf-8' });
        downloadBlob(blob, filename);

        onNotify(
          t('export.exportSuccessTitle'),
          `${t('export.exportSuccessMsg', { format: 'Word (.docx)' })} (${filename})`,
          'success',
          filename
        );

      } else if (selectedFormat === 'markdown') {
        const filename = `Ultimate_Pay_FI_API_Documentation_${version}_${exportLanguage}.md`;
        const mdText = generateMarkdownContent();
        const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8' });
        downloadBlob(blob, filename);
        onNotify(
          t('export.exportSuccessTitle'),
          `${t('export.exportSuccessMsg', { format: 'Markdown (.md)' })} (${filename})`,
          'success',
          filename
        );

      } else if (selectedFormat === 'openapi') {
        const filename = `ultimate-pay-openapi-${version}-${exportLanguage}.json`;
        const spec = generateOpenApiSpec();
        const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json;charset=utf-8' });
        downloadBlob(blob, filename);
        onNotify(
          t('export.exportSuccessTitle'),
          `${t('export.exportSuccessMsg', { format: 'OpenAPI 3.1' })} (${filename})`,
          'success',
          filename
        );

      } else if (selectedFormat === 'postman') {
        const filename = `ultimate-pay-postman-${version}-${exportLanguage}.json`;
        const col = generatePostmanCollection();
        const blob = new Blob([JSON.stringify(col, null, 2)], { type: 'application/json;charset=utf-8' });
        downloadBlob(blob, filename);
        onNotify(
          t('export.exportSuccessTitle'),
          `${t('export.exportSuccessMsg', { format: 'Postman Collection' })} (${filename})`,
          'success',
          filename
        );

      } else if (selectedFormat === 'iso') {
        const filename = `fintech-iso20022-pacs008-${version}.xml`;
        const xml = generateIsoXml();
        const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
        downloadBlob(blob, filename);
        onNotify(
          t('export.exportSuccessTitle'),
          `${t('export.exportSuccessMsg', { format: 'ISO 20022 (.xml)' })} (${filename})`,
          'success',
          filename
        );
      }
    } catch (err: any) {
      onNotify(t('export.errorTitle'), err?.message || 'Error executing export', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Button Label dynamically adapted
  const getButtonLabel = () => {
    switch (selectedFormat) {
      case 'pdf': return isExportEn ? 'Export Official PDF (.pdf)' : 'تصدير مستند رسمي (.pdf)';
      case 'word': return isExportEn ? 'Export Word Doc (.docx)' : 'تصدير مستند Word (.docx)';
      case 'markdown': return isExportEn ? 'Download Markdown (.md)' : 'تنزيل ملف Markdown (.md)';
      case 'openapi': return isExportEn ? 'Export OpenAPI (.json)' : 'تصدير OpenAPI (.json)';
      case 'postman': return isExportEn ? 'Export Postman Collection' : 'تصدير Postman Collection';
      case 'iso': return isExportEn ? 'Export ISO 20022 (.xml)' : 'تصدير ISO 20022 (.xml)';
      default: return isExportEn ? 'Export Specification' : 'تصدير المستند المعتمد';
    }
  };

  return (
    <div className="export-studio-view-container">
      {/* Mobile-Friendly Switcher Bar (Screens < 960px) */}
      {isMobileScreen && (
        <div className="export-mobile-segmented-bar">
          <button
            type="button"
            className={`export-mobile-tab-btn ${mobileTab === 'options' ? 'active' : ''}`}
            onClick={() => setMobileTab('options')}
          >
            <i className="fa-solid fa-sliders" />
            <span>{isRtl ? 'إعدادات وحزم التصدير' : 'Export Settings'}</span>
          </button>
          <button
            type="button"
            className={`export-mobile-tab-btn ${mobileTab === 'preview' ? 'active' : ''}`}
            onClick={() => setMobileTab('preview')}
          >
            <i className="fa-solid fa-file-lines" />
            <span>{isRtl ? 'معاينة الوثيقة المعتمدة' : 'Live Document Preview'}</span>
          </button>
        </div>
      )}

      <div
        ref={wrapRef}
        id="export-resizable-wrap"
        className={`export-clean-wrap ${isExpanded ? 'pdf-site-expanded' : ''} ${isMobileScreen ? 'export-mobile-mode' : ''}`}
        style={
          isExpanded || isMobileScreen
            ? { gridTemplateColumns: '1fr' }
            : {
                gridTemplateColumns: `${panelWidth}px 14px 1fr`,
                ['--export-panel-w' as any]: `${panelWidth}px`
              }
        }
      >
        {/* =========================================================================
            COLUMN 1: Options Rail (Configuration Panel)
            ========================================================================= */}
        {(!isMobileScreen || mobileTab === 'options') && (
          <div
            className="export-config-panel"
            id="export-config-panel"
            data-size={panelWidth < 260 ? 'compact' : panelWidth >= 360 ? 'wide' : undefined}
          >
        {/* Top Action Button */}
        <div className="export-top-action-bar">
          <button
            id="btn-execute-download"
            className="btn-export-direct"
            onClick={handleExecuteExport}
            disabled={isExporting}
            title={getButtonLabel()}
          >
            <i className={isExporting ? "fa-solid fa-spinner fa-spin" : (
              selectedFormat === 'word' ? 'fa-solid fa-file-word' :
              selectedFormat === 'markdown' ? 'fa-brands fa-markdown' :
              selectedFormat === 'openapi' ? 'fa-solid fa-code' :
              selectedFormat === 'postman' ? 'fa-solid fa-paper-plane' :
              selectedFormat === 'iso' ? 'fa-solid fa-file-lines' : 'fa-solid fa-file-pdf'
            )} />
            <span id="btn-download-label">{isExporting ? t('export.generating') : getButtonLabel()}</span>
          </button>
        </div>

        {/* Group 1: Sectors */}
        <div className="export-group">
          <div className="export-group-header">
            <div className="export-group-title">
              <i className="fa-solid fa-layer-group" style={{ color: '#38bdf8' }} />
              <span>{isExportEn ? 'Included Sectors' : 'القطاعات المشمولة'}</span>
            </div>
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {isExportEn 
                ? `${selectedSectorCount}/${sectorList.length} Selected` 
                : `${selectedSectorCount}/${sectorList.length} قطاعات مختارة`}
            </span>
          </div>
          <div className="export-chips-row">
            <label className="export-chip">
              <input
                type="checkbox"
                id="chk-sec-banking"
                checked={isSectorChecked('banking')}
                onChange={(e) => setSectors(prev => ({ ...prev, banking: e.target.checked }))}
              />
              <span>{isExportEn ? 'Banks & Financial Institutions' : 'قطاع البنوك والمصارف'}</span>
            </label>
            <label className="export-chip">
              <input
                type="checkbox"
                id="chk-sec-merchants"
                checked={isSectorChecked('merchants')}
                onChange={(e) => setSectors(prev => ({ ...prev, merchants: e.target.checked }))}
              />
              <span>{isExportEn ? 'Payment Gateways & Merchants' : 'بوابات الدفع والتجار'}</span>
            </label>
            <label className="export-chip">
              <input
                type="checkbox"
                id="chk-sec-aml"
                checked={isSectorChecked('aml')}
                onChange={(e) => setSectors(prev => ({ ...prev, aml: e.target.checked }))}
              />
              <span>{isExportEn ? 'Anti-Money Laundering (AML)' : 'مكافحة غسل الأموال'}</span>
            </label>
            {sectorList.filter(s => !['banking', 'merchants', 'aml'].includes(s.key)).map(s => (
              <label key={s.key} className="export-chip">
                <input
                  type="checkbox"
                  id={`chk-sec-${s.key}`}
                  checked={isSectorChecked(s.key)}
                  onChange={(e) => setSectors(prev => ({ ...prev, [s.key]: e.target.checked }))}
                />
                <span>{isExportEn ? s.nameEn : s.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Group 2: Package Modules */}
        <div className="export-group">
          <div className="export-group-header">
            <div className="export-group-title">
              <i className="fa-solid fa-boxes-stacked" style={{ color: '#38bdf8' }} />
              <span>{isExportEn ? 'Package Contents' : 'محتويات الحزمة'}</span>
            </div>
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {isExportEn 
                ? `${selectedModuleCount}/5 Modules` 
                : `${selectedModuleCount}/5 أقسام`}
            </span>
          </div>
          <div className="export-chips-row">
            <label className="export-chip">
              <input
                type="checkbox"
                id="mod-schemas"
                checked={modules.schemas}
                onChange={(e) => setModules(prev => ({ ...prev, schemas: e.target.checked }))}
              />
              <span>{isExportEn ? 'Field Schemas' : 'مخططات الحقول'}</span>
            </label>
            <label className="export-chip">
              <input
                type="checkbox"
                id="mod-wire"
                checked={modules.wire}
                onChange={(e) => setModules(prev => ({ ...prev, wire: e.target.checked }))}
              />
              <span>{isExportEn ? 'Requests & Responses Models' : 'نماذج الطلبات والاستجابات'}</span>
            </label>
            <label className="export-chip">
              <input
                type="checkbox"
                id="mod-crypto"
                checked={modules.crypto}
                onChange={(e) => setModules(prev => ({ ...prev, crypto: e.target.checked }))}
              />
              <span>{isExportEn ? 'Security & Encryption Standards' : 'معايير الأمان والتشفير'}</span>
            </label>
            <label className="export-chip">
              <input
                type="checkbox"
                id="mod-errors"
                checked={modules.errors}
                onChange={(e) => setModules(prev => ({ ...prev, errors: e.target.checked }))}
              />
              <span>{isExportEn ? 'Error Codes Dictionary' : 'سجل وقاموس الأخطاء'}</span>
            </label>
            <label className="export-chip">
              <input
                type="checkbox"
                id="mod-sla"
                checked={modules.sla}
                onChange={(e) => setModules(prev => ({ ...prev, sla: e.target.checked }))}
              />
              <span>{isExportEn ? 'Service Level Agreement (SLA)' : 'مستويات الخدمة (SLA)'}</span>
            </label>
          </div>
        </div>

        {/* Group 3: Format Selection */}
        <div className="export-group">
          <div className="export-group-header">
            <div className="export-group-title">
              <i className="fa-solid fa-file-code" style={{ color: '#38bdf8' }} />
              <span>{isExportEn ? 'Export Format' : 'صيغة التصدير'}</span>
            </div>
            <span className="mono" style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>
              {selectedFormat.toUpperCase()}
            </span>
          </div>
          <div className="export-formats-grid">
            <div
              className={`format-pill ${selectedFormat === 'pdf' ? 'active' : ''}`}
              data-fmt="pdf"
              onClick={() => setSelectedFormat('pdf')}
            >
              <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', marginInlineEnd: '0.25rem' }} />
              <span>{isExportEn ? 'PDF Document' : 'مستند (PDF)'}</span>
            </div>
            <div
              className={`format-pill ${selectedFormat === 'word' ? 'active' : ''}`}
              data-fmt="word"
              onClick={() => setSelectedFormat('word')}
            >
              <i className="fa-solid fa-file-word" style={{ color: '#2563eb', marginInlineEnd: '0.25rem' }} />
              <span>Word (.docx)</span>
            </div>
            <div
              className={`format-pill ${selectedFormat === 'markdown' ? 'active' : ''}`}
              data-fmt="markdown"
              onClick={() => setSelectedFormat('markdown')}
            >
              <i className="fa-brands fa-markdown" style={{ color: '#a855f7', marginInlineEnd: '0.25rem' }} />
              <span>Ultimate Pay (.md)</span>
            </div>
            <div
              className={`format-pill ${selectedFormat === 'openapi' ? 'active' : ''}`}
              data-fmt="openapi"
              onClick={() => setSelectedFormat('openapi')}
            >
              <i className="fa-solid fa-code" style={{ color: '#10b981', marginInlineEnd: '0.25rem' }} />
              <span>OpenAPI</span>
            </div>
            <div
              className={`format-pill ${selectedFormat === 'postman' ? 'active' : ''}`}
              data-fmt="postman"
              onClick={() => setSelectedFormat('postman')}
            >
              <i className="fa-solid fa-paper-plane" style={{ color: '#f97316', marginInlineEnd: '0.25rem' }} />
              <span>Postman</span>
            </div>
            <div
              className={`format-pill ${selectedFormat === 'iso' ? 'active' : ''}`}
              data-fmt="iso"
              onClick={() => setSelectedFormat('iso')}
            >
              <i className="fa-solid fa-file-lines" style={{ color: '#38bdf8', marginInlineEnd: '0.25rem' }} />
              <span>ISO 20022</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* =========================================================================
          COLUMN 2: Center Splitter Divider (Desktop Only)
          ========================================================================= */}
      {!isMobileScreen && !isExpanded && (
        <div
          id="export-splitter"
          className={`export-splitter ${isDragging ? 'dragging' : ''}`}
          title={isRtl ? "اسحب يميناً أو يساراً للتحكم بالمسافة بين لوحة التصدير والمعاينة" : "Drag left or right to resize panel"}
          onMouseDown={(e) => {
            if (isExpanded) return;
            e.preventDefault();
            setIsDragging(true);
          }}
          onTouchStart={() => {
            if (isExpanded) return;
            setIsDragging(true);
          }}
        >
          <div className="splitter-line" />
          <div className="splitter-handle">
            <i className="fa-solid fa-grip-lines-vertical" />
          </div>
        </div>
      )}

      {/* =========================================================================
          COLUMN 3: Live Deliverable Preview Area
          ========================================================================= */}
      {(!isMobileScreen || mobileTab === 'preview') && (
        <div className="export-summary-card" id="export-summary-card">
          {/* Permanent Floating Stage Frame (Ensures Permanent Safe Distance from Edges) */}
          <div className="pdf-viewer-stage">
            {/* Studio Header Toolbar */}
            <div className="pdf-viewer-toolbar">
              <div className="pdf-viewer-toolbar-info">
                <div className="pdf-doc-title-chip">
                  <i className={
                    selectedFormat === 'pdf' ? 'fa-solid fa-file-pdf' :
                    selectedFormat === 'word' ? 'fa-solid fa-file-word' :
                    selectedFormat === 'markdown' ? 'fa-brands fa-markdown' :
                    selectedFormat === 'openapi' ? 'fa-solid fa-code' :
                    selectedFormat === 'postman' ? 'fa-solid fa-paper-plane' : 'fa-solid fa-file-lines'
                  } style={{
                    color: selectedFormat === 'pdf' ? '#ef4444' :
                           selectedFormat === 'word' ? '#2563eb' :
                           selectedFormat === 'markdown' ? '#a855f7' :
                           selectedFormat === 'openapi' ? '#10b981' :
                           selectedFormat === 'postman' ? '#f97316' : '#38bdf8'
                  }} />
                  <strong>
                    {isExportEn ? 'National Technical Specification' : 'وثيقة المواصفة الفنية الوطنية'}
                  </strong>
                </div>
                <span className="pdf-meta-badge mono">SAMA-{version}</span>
                <span className="pdf-meta-tag">
                  {selectedFormat === 'pdf' 
                    ? (isExportEn ? '4 Pages • Certified' : '4 صفحات • معتمد رسمياً')
                    : (isExportEn ? 'Live Preview' : 'معاينة مباشرة')}
                </span>
              </div>

              {selectedFormat === 'pdf' && (
                <div className="pdf-page-jump-bar">
                  <span className="pdf-jump-label">{isRtl ? 'الصفحة:' : 'Page:'}</span>
                  {[1, 2, 3, 4].map(pg => (
                    <button
                      key={pg}
                      type="button"
                      className="btn-page-jump"
                      onClick={() => {
                        const target = document.getElementById(`pdf-page-${pg}`);
                        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      title={isRtl ? `الانتقال إلى صفحة ${pg}` : `Jump to page ${pg}`}
                    >
                      {pg}
                    </button>
                  ))}
                </div>
              )}

              <div className="pdf-viewer-toolbar-actions">
                <button
                  type="button"
                  className="btn-toolbar-btn"
                  onClick={() => window.print()}
                  title={isRtl ? 'طباعة المستند' : 'Print document'}
                >
                  <i className="fa-solid fa-print" />
                  <span className="btn-toolbar-text">{isRtl ? 'طباعة' : 'Print'}</span>
                </button>
                <button
                  type="button"
                  className="btn-toolbar-btn btn-toolbar-highlight"
                  onClick={handleExecuteExport}
                  title={isRtl ? 'تحميل مباشر' : 'Quick download'}
                >
                  <i className="fa-solid fa-download" />
                  <span className="btn-toolbar-text">{isRtl ? 'تحميل' : 'Download'}</span>
                </button>
                <button
                  type="button"
                  className="btn-toolbar-btn btn-toolbar-icon-only"
                  onClick={() => {
                    setIsExpanded(!isExpanded);
                    onNotify(
                      isExpanded ? t('export.restoreBtn') : t('export.maximizeBtn'),
                      isExpanded ? 'Restored default size' : 'Maximized preview to fill container',
                      'info'
                    );
                  }}
                  title={isExpanded ? (isRtl ? 'العودة للوضع الطبيعي' : 'Restore size') : (isRtl ? 'تكبير لملء مساحة الموقع' : 'Maximize preview')}
                >
                  <i className={isExpanded ? 'fa-solid fa-compress' : 'fa-solid fa-expand'} />
                </button>
              </div>
            </div>

            {/* Real Opened PDF / Word / Code Sheet Preview */}
            <div id="preview-tab-doc" className="pdf-viewer-viewport">
            <div 
              className="pdf-pages-stack" 
              id="pdf-pages-stack-container"
              dir={isExportEn ? 'ltr' : 'rtl'}
              style={{
                fontFamily: isExportEn ? "'Outfit', -apple-system, sans-serif" : "'Cairo', -apple-system, sans-serif"
              }}
            >
              {/* =======================================================
                  FORMAT 1: PDF OFFICIAL 4-PAGE PAPER PREVIEW
                  ======================================================= */}
              {selectedFormat === 'pdf' && (
                <>
                  {/* PAGE 1: COVER & EXECUTIVE SUMMARY */}
                  <div className="pdf-paper-page" id="pdf-page-1">
                    <div className="pdf-page-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <div className="pdf-gov-crest">
                          <i className="fa-solid fa-landmark-dome" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                            {isExportEn ? 'Kingdom of Saudi Arabia' : 'المملكة العربية السعودية'}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#475569' }}>
                            {isExportEn ? 'Saudi Central Bank (SAMA) • Banking Supervision' : 'البنك المركزي السعودي • الإشراف والرقابة المصرفية'}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: isExportEn ? 'right' : 'left' }} className="mono">
                        <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#0284c7' }}>
                          SAMA-SPEC-{version}
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#64748b' }}>
                          {isExportEn ? 'Effective: 2026-10' : 'تاريخ السريان: 2026-10'}
                        </div>
                      </div>
                    </div>

                    <div className="pdf-header-divider" />

                    <div style={{ textAlign: 'center', padding: '0.6rem 0 0.8rem 0' }}>
                      <div
                        style={{
                          display: 'inline-block',
                          background: '#e0f2fe',
                          color: '#0369a1',
                          padding: '0.18rem 0.65rem',
                          borderRadius: '3px',
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          marginBottom: '0.4rem'
                        }}
                      >
                        {isExportEn ? 'OFFICIALLY CERTIFIED SPECIFICATION' : 'المواصفة القياسية المعتمدة رسمياً'}
                      </div>
                      <h1 style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.3rem 0', lineHeight: 1.4 }}>
                        {isExportEn 
                          ? 'National Financial Institutions API Technical Specifications & Integration Standard' 
                          : 'وثيقة المواصفة الفنية الوطنية لمعايير الربط المصرفي المفتوح والتقنية المالية'}
                      </h1>
                      <div
                        style={{
                          fontSize: '0.62rem',
                          color: '#0284c7',
                          fontWeight: 700,
                          fontFamily: "'Outfit', sans-serif",
                          direction: 'ltr'
                        }}
                      >
                        NATIONAL FINTECH INTEROPERABILITY & OPEN BANKING STANDARD ({version})
                      </div>
                    </div>

                    <div className="pdf-doc-section">
                      <div className="pdf-section-title">
                        {isExportEn ? '1. Scope & Regulatory Objectives' : '1. النطاق والأهداف التنظيمية (Scope & Objectives)'}
                      </div>
                      <p className="pdf-section-text">
                        {isExportEn
                          ? 'This document establishes mandatory architectural standards, endpoints, and schemas for integrating certified financial institutions, banks, and licensed payment gateways across the Kingdom. The specification ensures operational resilience, idempotency guarantees, and sovereign compliance.'
                          : 'تحدد هذه الوثيقة المعايير المعمارية الإلزامية ونقاط النهاية ونماذج البيانات الموحدة لربط أنظمة البنوك والمؤسسات المالية المرخصة ومزودي خدمات الدفع بالمملكة. تهدف المواصفة لضمان استقرار العمليات اللحظية، منع الازدواج المالي، وتطبيق أعلى درجات الحماية السيادية للبيانات المالية.'}
                      </p>
                    </div>

                    <div className="pdf-doc-section">
                      <div className="pdf-section-title">
                        {isExportEn ? '2. Summary of Included Financial Sectors' : '2. ملخص القطاعات والخدمات المشمولة في هذه النسخة'}
                      </div>
                      <div className="pdf-mini-table-wrap">
                        <table className="pdf-mini-table">
                          <thead>
                            <tr>
                              <th>{isExportEn ? 'Sector' : 'القطاع المعماري'}</th>
                              <th>{isExportEn ? 'Service Package' : 'الخدمة التشغيلية'}</th>
                              <th>{isExportEn ? 'Endpoints' : 'عدد المسارات'}</th>
                              <th>{isExportEn ? 'Security Profile' : 'المعيار الأمني'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedServices.length > 0 ? (
                              selectedServices.map((s, idx) => (
                                <tr key={idx}>
                                  <td style={{ fontWeight: 700, color: '#0f172a' }}>
                                    {isExportEn ? s.sectorNameEn : s.sectorName}
                                  </td>
                                  <td>{isExportEn ? s.titleEn : s.title}</td>
                                  <td className="mono" style={{ fontWeight: 700, color: '#0284c7' }}>
                                    {s.endpoints.length} {isExportEn ? 'Routes' : 'مسار'}
                                  </td>
                                  <td className="mono" style={{ fontSize: '0.6rem', color: '#475569' }}>
                                    {securityMap[s.sectorKey] || 'TLS 1.3'}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '0.6rem' }}>
                                  {isExportEn ? 'No services selected' : 'لا توجد خدمات مختارة'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '3px',
                        padding: '0.45rem 0.75rem',
                        marginTop: '0.3rem'
                      }}
                    >
                      <span style={{ fontSize: '0.62rem', color: '#334155', fontWeight: 700 }}>
                        {isExportEn ? 'Total Certified Endpoints in this Release:' : 'إجمالي المسارات المعتمدة في هذا الملف:'}
                      </span>
                      <span className="mono" style={{ fontWeight: 800, color: '#059669', fontSize: '0.7rem' }}>
                        {totalEndpoints} {isExportEn ? 'Certified Endpoints' : 'Endpoint معتمد'}
                      </span>
                    </div>

                    <div className="pdf-page-footer-line">
                      <span>{isExportEn ? 'Official Regulatory Document Issued Under Banking Oversight' : 'وثيقة تنظيمية رسمية صادرة بموجب اللائحة المصرفية'}</span>
                      <span className="mono">{isExportEn ? 'Page 1 of 4' : 'صفحة 1 من 4'}</span>
                    </div>
                  </div>

                  <div className="pdf-page-separator">
                    <span>{isExportEn ? 'Page Break • Page 2 of 4' : 'فاصل الصفحات • صفحة 2 من 4'}</span>
                  </div>

                  {/* PAGE 2: TECHNICAL ENDPOINTS & SCHEMAS */}
                  <div className="pdf-paper-page" id="pdf-page-2">
                    <div className="pdf-page-header">
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0f172a' }}>
                        {isExportEn ? 'National Technical Specification — Endpoints Matrix' : 'المواصفة الفنية الوطنية — جداول المسارات المعمارية'}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b' }} className="mono">
                        SAMA-SPEC-{version} • PAGE 2
                      </div>
                    </div>
                    <div className="pdf-header-divider" />

                    <div className="pdf-doc-section">
                      <div className="pdf-section-title">
                        {isExportEn ? '3. Certified Architectural Endpoints Matrix' : '3. مصفوفة نقاط النهاية المعتمدة (Architectural Endpoints Matrix)'}
                      </div>
                      <p className="pdf-section-text">
                        {isExportEn 
                          ? 'The following table outlines precise operational requirements for all mandatory API routes included in this package:'
                          : 'الجدول التالي يوضح المواصفات الدقيقة لكافة مسارات الـ API الإلزامية المشمولة بالوثيقة:'}
                      </p>
                      <div className="pdf-mini-table-wrap" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                        <table className="pdf-mini-table">
                          <thead>
                            <tr>
                              <th>{isExportEn ? 'Sector' : 'القطاع'}</th>
                              <th>{isExportEn ? 'Method & Path' : 'الطلب والمسار (Method & Path)'}</th>
                              <th>{isExportEn ? 'Functional Description' : 'الوصف الوظيفي'}</th>
                              <th>{isExportEn ? 'Response' : 'الاستجابة'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedServices.flatMap(s =>
                              s.endpoints.map((ep, eIdx) => {
                                const methodColor = ep.method === 'POST' ? '#10b981' : (ep.method === 'GET' ? '#0284c7' : '#f59e0b');
                                return (
                                  <tr key={`${s.code}-${eIdx}`}>
                                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                                      {isExportEn ? s.sectorNameEn : s.sectorName}
                                    </td>
                                    <td>
                                      <strong className="mono" style={{ color: methodColor }}>{ep.method}</strong>{' '}
                                      <code className="mono" style={{ fontSize: '0.6rem', color: '#334155' }}>{ep.path}</code>
                                    </td>
                                    <td>
                                      <span style={{ fontSize: '0.62rem', color: '#475569' }}>
                                        {isExportEn ? ep.descEn : ep.desc}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="badge-pill mono" style={{ fontSize: '0.58rem', background: '#f1f5f9', color: '#0369a1' }}>
                                        {ep.method === 'POST' ? '201 Created' : '200 OK'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="pdf-doc-section" style={{ marginTop: '0.5rem' }}>
                      <div className="pdf-section-title">
                        {isExportEn ? '4. Mandatory Idempotency Enforcement' : '4. اشتراطات مفتاح عدم التكرار (Idempotency Enforcement)'}
                      </div>
                      <p className="pdf-section-text">
                        {isExportEn 
                          ? <strong>Mandatory Regulatory Requirement: </strong>
                          : <strong>قاعدة تنظيمية إلزامية: </strong>}
                        {isExportEn
                          ? 'All participating systems must provide the X-Idempotency-Key header using a valid, unique UUIDv4 token for each financial transaction. Banks must cache key results for at least 24 hours to prevent duplicate ledger postings.'
                          : 'يجب على كافة الأنظمة المتصلة تمرير الترويسة X-Idempotency-Key بتنسيق UUIDv4 صالح وفريد لكل عملية خصم أو تحويل مالي. تلتزم البنوك بحفظ المفتاح ونتيجته لمدة لا تقل عن 24 ساعة.'}
                      </p>
                    </div>

                    <div className="pdf-page-footer-line">
                      <span>{isExportEn ? 'Confidential — Regulated Financial Document' : 'سري ومحمي بموجب الأنظمة المصرفية'}</span>
                      <span className="mono">{isExportEn ? 'Page 2 of 4' : 'صفحة 2 من 4'}</span>
                    </div>
                  </div>

                  <div className="pdf-page-separator">
                    <span>{isExportEn ? 'Page Break • Page 3 of 4' : 'فاصل الصفحات • صفحة 3 من 4'}</span>
                  </div>

                  {/* PAGE 3: SECURITY, ERROR CODES & SLA */}
                  <div className="pdf-paper-page" id="pdf-page-3">
                    <div className="pdf-page-header">
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0f172a' }}>
                        {isExportEn ? 'National Technical Specification — Security, Errors & SLA' : 'المواصفة الفنية الوطنية — الأمان وقاموس الأخطاء وSLA'}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b' }} className="mono">
                        SAMA-SPEC-{version} • PAGE 3
                      </div>
                    </div>
                    <div className="pdf-header-divider" />

                    <div className="pdf-doc-section">
                      <div className="pdf-section-title">
                        {isExportEn ? '5. Mutual TLS & Identity Security Profile' : '5. بروتوكولات الأمان والتوثيق المتبادل (Security Profile)'}
                      </div>
                      <p className="pdf-section-text">
                        {isExportEn
                          ? 'All gateway communications enforce TLS 1.3 with mutual certificate verification (mTLS) issued by the National Digital Certification Authority. Authorization is strictly governed via OAuth 2.0 / FAPI 1.0 Advanced with granular scopes.'
                          : 'تخضع كافة الاتصالات لبروتوكول TLS 1.3 مع التوثيق المتبادل للشهادات (mTLS) باستخدام شهادات x509 المعتمدة. ويتم تفويض الوصول حصراً عبر بروتوكول OAuth 2.0 / FAPI 1.0 Advanced.'}
                      </p>
                    </div>

                    <div className="pdf-doc-section">
                      <div className="pdf-section-title">
                        {isExportEn ? '6. Standard Financial Error Codes' : '6. القاموس الموحد لأكواد الأخطاء المالية (Standard Error Codes)'}
                      </div>
                      <div className="pdf-mini-table-wrap">
                        <table className="pdf-mini-table">
                          <thead>
                            <tr>
                              <th>{isExportEn ? 'Error Code' : 'كود الخطأ'}</th>
                              <th>{isExportEn ? 'Standard Identifier' : 'الاسم المعياري'}</th>
                              <th>{isExportEn ? 'Reason & Required Action' : 'السبب والإجراء المطلوب'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="mono" style={{ fontWeight: 700, color: '#dc2626' }}>10111</td>
                              <td>INSUFFICIENT_FUNDS</td>
                              <td>{isExportEn ? 'Account balance is insufficient for transfer and fees.' : 'رصيد الحساب غير كافٍ لتغطية مبلغ العملية ورسومها.'}</td>
                            </tr>
                            <tr>
                              <td className="mono" style={{ fontWeight: 700, color: '#dc2626' }}>10112</td>
                              <td>DAILY_LIMIT_EXCEEDED</td>
                              <td>{isExportEn ? 'Daily maximum remittance threshold surpassed.' : 'تجاوز السقف اليومي المحدد للحوالات الفورية اللحظية.'}</td>
                            </tr>
                            <tr>
                              <td className="mono" style={{ fontWeight: 700, color: '#d97706' }}>10204</td>
                              <td>DUPLICATE_IDEMPOTENCY_KEY</td>
                              <td>{isExportEn ? 'Transaction already booked with identical key.' : 'تم تنفيذ العملية مسبقاً بنفس مفتاح عدم التكرار.'}</td>
                            </tr>
                            <tr>
                              <td className="mono" style={{ fontWeight: 700, color: '#dc2626' }}>10301</td>
                              <td>AML_SANCTION_MATCH</td>
                              <td>{isExportEn ? 'Blocked due to international or national sanction match.' : 'حظر العملية لتطابق أحد الأطراف مع القوائم المعتمدة.'}</td>
                            </tr>
                            <tr>
                              <td className="mono" style={{ fontWeight: 700, color: '#475569' }}>401 / 403</td>
                              <td>AUTH_FORBIDDEN</td>
                              <td>{isExportEn ? 'Invalid mTLS certificate or unauthorized token scopes.' : 'شهادة mTLS غير معتمدة أو صلاحيات الـ Token غير كافية.'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="pdf-doc-section">
                      <div className="pdf-section-title">
                        {isExportEn ? '7. Mandatory Service Level Agreement (SLA)' : '7. اتفاقية مستوى الخدمة الإلزامية (SLA)'}
                      </div>
                      <p className="pdf-section-text">
                        {isExportEn
                          ? 'Certified institutions guarantee at least 99.99% operational uptime annually, with peak instant transfer processing latency remaining strictly under 150ms.'
                          : 'تلتزم المؤسسات بمعدل توافر تشغيلي لا يقل عن 99.99% سنوياً، وألا يتجاوز زمن معالجة طلب التحويل اللحظي 150ms في أوقات الذروة.'}
                      </p>
                    </div>

                    <div className="pdf-page-footer-line">
                      <span>{isExportEn ? 'Confidential — Regulated Financial Document' : 'سري ومحمي بموجب الأنظمة المصرفية'}</span>
                      <span className="mono">{isExportEn ? 'Page 3 of 4' : 'صفحة 3 من 4'}</span>
                    </div>
                  </div>

                  <div className="pdf-page-separator">
                    <span>{isExportEn ? 'Page Break • Page 4 of 4' : 'فاصل الصفحات • صفحة 4 من 4'}</span>
                  </div>

                  {/* PAGE 4: REGULATORY SIGN-OFF & OFFICIAL SEAL */}
                  <div className="pdf-paper-page" id="pdf-page-4">
                    <div className="pdf-page-header">
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0f172a' }}>
                        {isExportEn ? 'National Technical Specification — Regulatory Sign-Off' : 'المواصفة الفنية الوطنية — محضر الاعتماد الرسمي والتوقيعات'}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b' }} className="mono">
                        SAMA-SPEC-{version} • PAGE 4
                      </div>
                    </div>
                    <div className="pdf-header-divider" />

                    <div className="pdf-doc-section">
                      <div className="pdf-section-title">
                        {isExportEn ? '8. Sovereign Mandate & Legal Enforceability' : '8. قرار الاعتماد وإلزامية التطبيق (Regulatory Mandate)'}
                      </div>
                      <p className="pdf-section-text">
                        {isExportEn
                          ? 'Pursuant to statutory regulatory authority, this specification constitutes a mandatory unified national technical standard for all licensed banks and payment companies. Enforceable immediately upon publication with a 60-day migration grace period.'
                          : 'بناءً على الصلاحيات المخولة نظاماً، تُعتمد هذه الوثيقة كـ مرجع فني وطني موحد وإلزامي لكافة المصارف المرخصة وشركات المدفوعات والتقنية المالية المصرحة بالمملكة.'}
                      </p>
                    </div>

                    <div className="pdf-doc-section" style={{ marginTop: '0.4rem' }}>
                      <div className="pdf-section-title">
                        {isExportEn ? '9. Multi-Signature Certification Table' : '9. جدول الاعتمادات والتوقيعات الرسمية'}
                      </div>
                      <div className="pdf-mini-table-wrap">
                        <table className="pdf-mini-table">
                          <thead>
                            <tr>
                              <th>{isExportEn ? 'Signer Role' : 'الصفة والمسؤولية'}</th>
                              <th>{isExportEn ? 'Oversight Committee' : 'الجهة المشرفة'}</th>
                              <th>{isExportEn ? 'Status' : 'الحالة'}</th>
                              <th>{isExportEn ? 'Date' : 'التاريخ'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ fontWeight: 700 }}>{isExportEn ? 'Central Bank Governor' : 'محافظ البنك المركزي'}</td>
                              <td>{isExportEn ? 'Board & Monetary Policy' : 'مجلس الإدارة والسياسات المصرفية'}</td>
                              <td><span style={{ color: '#059669', fontWeight: 800 }}>{isExportEn ? 'Certified' : 'معتمد ومصدق'}</span></td>
                              <td className="mono">2026-10-01</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 700 }}>{isExportEn ? 'VP Financial Oversight & IT' : 'وكيل الرقابة المالية وتقنية المعلومات'}</td>
                              <td>{isExportEn ? 'Banking Supervision' : 'الإشراف المصرفي وتطوير المدفوعات'}</td>
                              <td><span style={{ color: '#059669', fontWeight: 800 }}>{isExportEn ? 'Certified' : 'معتمد ومطابق'}</span></td>
                              <td className="mono">2026-10-01</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 700 }}>{isExportEn ? 'Director of Digital Governance' : 'مدير عام حوكمة المعايير الرقمية'}</td>
                              <td>{isExportEn ? 'National Tech Committee' : 'لجنة المعايير التقنية الوطنية'}</td>
                              <td><span style={{ color: '#059669', fontWeight: 800 }}>{isExportEn ? 'Audited' : 'مدقق ومعتمد'}</span></td>
                              <td className="mono">2026-10-01</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '0.6rem',
                        paddingTop: '0.6rem',
                        borderTop: '1px dashed #cbd5e1'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0f172a' }}>
                          {isExportEn ? 'Central KMS Electronic Auth Key:' : 'رمز الاعتماد الرقمي المركزي:'}
                        </div>
                        <div className="mono" style={{ fontSize: '0.56rem', color: '#64748b' }}>
                          CERT-ID: SAMA-GOV-{version}-FINAL-AUTH
                        </div>
                        <div style={{ fontSize: '0.55rem', color: '#059669', marginTop: '2px' }}>
                          <i className="fa-solid fa-circle-check" />{' '}
                          {isExportEn ? 'Authenticated according to National Electronic Transactions Law' : 'تم التوثيق وفق نظام المعاملات والتوثيق الإلكتروني'}
                        </div>
                      </div>

                      {/* Big Official Stamp */}
                      <div className="pdf-official-seal">
                        <div className="seal-inner">
                          <i className="fa-solid fa-stamp" />
                          <div style={{ fontSize: '0.54rem', fontWeight: 900, marginTop: '2px' }}>
                            {isExportEn ? 'SAMA CERTIFIED' : 'معتمد رسمياً'}
                          </div>
                          <div style={{ fontSize: '0.44rem', letterSpacing: '0.5px' }} className="mono">
                            {version}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pdf-page-footer-line">
                      <span>{isExportEn ? 'Central Regulatory Vault Sealed Document' : 'وثيقة مختومة رسمياً من الخزينة الرقابية المركزية'}</span>
                      <span className="mono">{isExportEn ? 'Page 4 of 4' : 'صفحة 4 من 4'}</span>
                    </div>
                  </div>
                </>
              )}

              {/* FORMAT 2: WORD DOCUMENT LIVE PREVIEW */}
              {selectedFormat === 'word' && (
                <>
                  <div className="word-paper-page">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }} className="mono">CONFIDENTIAL • SAMA-SPEC-{version}</span>
                      <span style={{ fontSize: '0.75rem', color: '#2b579a', fontWeight: 700 }}>{isExportEn ? 'Saudi Central Bank — Unified Technical Specification' : 'البنك المركزي السعودي — وثيقة المواصفات الفنية المعتمدة'}</span>
                    </div>

                    <div className="word-doc-title">{isExportEn ? 'National Financial API Technical Standard (.docx)' : 'المواصفة القياسية الوطنية لواجهات برمجة التطبيقات (API Standards)'}</div>

                    <p style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.7 }}>
                      {isExportEn 
                        ? 'This document specifies mandatory architectural standards, endpoints, and schemas for integrating certified financial institutions, banks, and payment service providers in Microsoft Word (.docx) format.'
                        : 'تُحدد هذه الوثيقة الصادرة بصيغة Microsoft Word المواصفات المعمارية الإلزامية ونماذج تبادل الرسائل المالية بين كافة المصارف المرخصة وشركات التقنية المالية المعتمدة بالمملكة.'}
                    </p>

                    <div className="word-heading-1">{isExportEn ? '1. Version Control & Release Metadata' : '1. جدول بيانات الاعتماد والتحكم بالنسخة'}</div>
                    <table className="word-table">
                      <thead>
                        <tr>
                          <th>{isExportEn ? 'Item' : 'البند التنظيمي'}</th>
                          <th>{isExportEn ? 'Value' : 'القيمة المعتمدة'}</th>
                          <th>{isExportEn ? 'Status' : 'الحالة التشغيلية'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 700 }}>{isExportEn ? 'Technical Version' : 'رقم الإصدار الفني'}</td>
                          <td className="mono">{version} Official Release</td>
                          <td><span style={{ color: '#059669', fontWeight: 700 }}>{isExportEn ? 'Effective' : 'ساري المفعول'}</span></td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>{isExportEn ? 'Total Certified Routes' : 'إجمالي المسارات المعتمدة'}</td>
                          <td className="mono">{totalEndpoints} Endpoints</td>
                          <td><span style={{ color: '#0284c7', fontWeight: 700 }}>{isExportEn ? 'Fully Covered' : 'مشمول بالكامل'}</span></td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>{isExportEn ? 'Mandatory Security Profile' : 'بروتوكول الأمان الإلزامي'}</td>
                          <td className="mono">TLS 1.3 / mTLS Strict</td>
                          <td><span style={{ color: '#d97706', fontWeight: 700 }}>{isExportEn ? 'Mandatory' : 'إلزامي ومطابق'}</span></td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>{isExportEn ? 'Idempotency Key' : 'مفتاح عدم التكرار'}</td>
                          <td className="mono">X-Idempotency-Key (UUIDv4)</td>
                          <td><span style={{ color: '#059669', fontWeight: 700 }}>{isExportEn ? 'Active (24h)' : 'مفعل 24 ساعة'}</span></td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="word-heading-1" style={{ marginTop: '1rem' }}>{isExportEn ? '2. API Endpoints Matrix' : '2. مصفوفة نقاط الربط المشمولة (API Endpoints Matrix)'}</div>
                    <table className="word-table">
                      <thead>
                        <tr>
                          <th>{isExportEn ? 'Sector' : 'القطاع'}</th>
                          <th>{isExportEn ? 'Method & Path' : 'الطلب والمسار (Method & Path)'}</th>
                          <th>{isExportEn ? 'Description' : 'الوصف الوظيفي'}</th>
                          <th>{isExportEn ? 'Response' : 'الاستجابة القياسية'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedServices.map(s => (s.endpoints || []).map(ep => (
                          <tr key={`${s.code}-${ep.method}-${ep.path}`}>
                            <td style={{ fontWeight: 700 }}>{isExportEn ? s.sectorNameEn : s.sectorName}</td>
                            <td>
                              <strong className="mono" style={{ color: '#2b579a', marginInlineEnd: '0.4rem' }}>{ep.method}</strong>
                              <code className="mono" style={{ fontSize: '0.75rem' }}>{ep.path}</code>
                            </td>
                            <td>{isExportEn ? ep.descEn : ep.desc}</td>
                            <td><span className="mono" style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>{ep.method === 'POST' ? '201 Created' : '200 OK'}</span></td>
                          </tr>
                        )))}
                      </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '0.6rem', marginTop: 'auto', fontSize: '0.75rem', color: '#64748b' }}>
                      <span>{isExportEn ? 'Official National Specification • SAMA Print-Ready Word' : 'المواصفة الفنية الوطنية المعتمدة • صالحة للتحرير والطباعة الرسمية'}</span>
                      <span className="mono">{isExportEn ? 'Page 1 of 2' : 'صفحة 1 من 2'}</span>
                    </div>
                  </div>

                  <div className="pdf-page-separator"><span>{isExportEn ? 'Page Break • Page 2 of 2' : 'فاصل الصفحات • صفحة 2 من 2'}</span></div>

                  <div className="word-paper-page">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }} className="mono">SAMA-SPEC-{version} • {isExportEn ? 'Security & SLA Addendum' : 'الملحق الأمني الفني'}</span>
                      <span style={{ fontSize: '0.75rem', color: '#2b579a', fontWeight: 700 }}>{isExportEn ? 'Saudi Central Bank — Security & QA Standards' : 'البنك المركزي السعودي — المعايير الأمنية وضمان الجودة'}</span>
                    </div>

                    <div className="word-heading-1">{isExportEn ? '3. Mandatory Security & Cryptographic Controls' : '3. المعايير الأمنية وضوابط التشفير الإلزامية'}</div>
                    <p style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.7 }}>
                      {isExportEn 
                        ? 'All financial integration channels strictly adhere to central banking security directives:' 
                        : 'تخضع كافة قنوات الربط المالي للضوابط الأمنية المشددة الصادرة عن البنك المركزي:'}
                    </p>
                    <ul style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.8, paddingInlineStart: '1.2rem' }}>
                      <li><strong>{isExportEn ? 'Mutual TLS (mTLS):' : 'التوثيق المتبادل للشهادات (mTLS):'}</strong> {isExportEn ? 'X.509 digital certificates with minimum SHA-256 signature.' : 'استخدام شهادات رقمية صادرة من هيئة وطنية معتمدة بتشفير SHA-256 كحد أدنى.'}</li>
                      <li><strong>{isExportEn ? 'Financial Authorization Protocol:' : 'بروتوكول التفويض المالي:'}</strong> {isExportEn ? 'FAPI 1.0 Advanced standard compliant with OAuth 2.0 & PKCE.' : 'اعتماد معيار FAPI (Financial-grade API) متوافق مع OAuth 2.0 و PKCE.'}</li>
                      <li><strong>{isExportEn ? 'Digital Message Signing:' : 'التوقيع الرقمي للرسائل:'}</strong> {isExportEn ? 'Full payload signing with RSA-PSS-4096 ensuring non-repudiation.' : 'توقيع كامل محتوى Payload باستخدام خوارزمية RSA-PSS-4096 لضمان عدم الإنكار والتلاعب.'}</li>
                    </ul>

                    <div className="word-heading-1" style={{ marginTop: '0.8rem' }}>{isExportEn ? '4. Service Level Agreement (SLA Standards)' : '4. اتفاقية مستوى الخدمة وجداول الأداء (SLA Standards)'}</div>
                    <table className="word-table">
                      <thead>
                        <tr>
                          <th>{isExportEn ? 'Metric' : 'المؤشر التشغيلي'}</th>
                          <th>{isExportEn ? 'Ceiling' : 'الحد الأقصى المسموح'}</th>
                          <th>{isExportEn ? 'Remedy' : 'الإجراء الرقابي عند التجاوز'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 700 }}>{isExportEn ? 'Processing Latency' : 'زمن الاستجابة للعملية (Latency)'}</td>
                          <td className="mono">P99 &lt; 250ms</td>
                          <td>{isExportEn ? 'Automated traffic failover' : 'تنبيه فوري وإعادة توجيه حركة المرور'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>{isExportEn ? 'Monthly Availability' : 'نسبة الجاهزية الشهرية (Availability)'}</td>
                          <td className="mono">99.99% Uptime</td>
                          <td>{isExportEn ? 'Regulatory compliance penalty' : 'فرض غرامات الامتثال التنظيمي'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>{isExportEn ? 'Technical Error Rate' : 'معدل الخطأ الفني (5xx Rate)'}</td>
                          <td className="mono">&lt; 0.01%</td>
                          <td>{isExportEn ? 'Immediate circuit break' : 'تعليق فوري لمسار الربط المتأثر'}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ background: '#f1f5f9', borderInlineStart: '4px solid #2b579a', padding: '1rem', borderRadius: '4px', marginTop: '1.5rem' }}>
                      <div style={{ fontWeight: 700, color: '#2b579a', fontSize: '0.88rem', marginBottom: '0.3rem' }}>
                        {isExportEn ? 'National Digital Specification Attestation' : 'اعتماد وختم المواصفة الوطنية الرقمية'}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0, lineHeight: 1.6 }}>
                        {isExportEn 
                          ? 'This document is officially signed and legally enforceable across all licensed financial institutions. Verification available via the National Digital Governance Gateway.' 
                          : 'صدرت هذه الوثيقة رسمياً وتعتبر ملزمة لكافة المؤسسات المالية والمصرفية المرخصة. التحقق الرقمي متاح عبر بوابة الحوكمة الرقمية الوطنية.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '0.6rem', marginTop: 'auto', fontSize: '0.75rem', color: '#64748b' }}>
                      <span>{isExportEn ? 'End of Technical Document • Word Printable Specification' : 'نهاية الوثيقة الفنية المعتمدة • صالحة للتحرير والطباعة الرسمية'}</span>
                      <span className="mono">{isExportEn ? 'Page 2 of 2' : 'صفحة 2 من 2'}</span>
                    </div>
                  </div>
                </>
              )}

              {/* FORMAT 3: MARKDOWN LIVE PREVIEW */}
              {selectedFormat === 'markdown' && (
                <div className="code-viewer-stage">
                  <div className="code-viewer-float-bar">
                    <span className="code-viewer-filename">Ultimate_Pay_FI_API_Documentation_{version}.md</span>
                    <button
                      type="button"
                      className="btn-code-copy-float"
                      onClick={() => {
                        navigator.clipboard.writeText(generateMarkdownContent());
                        onNotify(isRtl ? 'تم نسخ ملف Markdown' : 'Copied Markdown', '', 'success');
                      }}
                      title="نسخ الملف بالكامل"
                    >
                      <i className="fa-solid fa-copy" />
                      <span>{isRtl ? 'نسخ' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="code-viewer-pre">
                    <code>{generateMarkdownContent()}</code>
                  </pre>
                </div>
              )}

              {/* FORMAT 4: OPENAPI 3.1 LIVE PREVIEW */}
              {selectedFormat === 'openapi' && (
                <div className="code-viewer-stage">
                  <div className="code-viewer-float-bar">
                    <span className="code-viewer-filename">fintech-openapi-{version}.json</span>
                    <button
                      type="button"
                      className="btn-code-copy-float"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(generateOpenApiSpec(), null, 2));
                        onNotify(isRtl ? 'تم نسخ مخطط OpenAPI' : 'Copied OpenAPI', '', 'success');
                      }}
                      title="نسخ الملف بالكامل"
                    >
                      <i className="fa-solid fa-copy" />
                      <span>{isRtl ? 'نسخ' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="code-viewer-pre">
                    <code>{JSON.stringify(generateOpenApiSpec(), null, 2)}</code>
                  </pre>
                </div>
              )}

              {/* FORMAT 5: POSTMAN LIVE PREVIEW */}
              {selectedFormat === 'postman' && (
                <div className="code-viewer-stage">
                  <div className="code-viewer-float-bar">
                    <span className="code-viewer-filename">fintech-postman-collection-{version}.json</span>
                    <button
                      type="button"
                      className="btn-code-copy-float"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(generatePostmanCollection(), null, 2));
                        onNotify(isRtl ? 'تم نسخ Postman Collection' : 'Copied Postman', '', 'success');
                      }}
                      title="نسخ الملف بالكامل"
                    >
                      <i className="fa-solid fa-copy" />
                      <span>{isRtl ? 'نسخ' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="code-viewer-pre">
                    <code>{JSON.stringify(generatePostmanCollection(), null, 2)}</code>
                  </pre>
                </div>
              )}

              {/* FORMAT 6: ISO 20022 XML LIVE PREVIEW */}
              {selectedFormat === 'iso' && (
                <div className="code-viewer-stage">
                  <div className="code-viewer-float-bar">
                    <span className="code-viewer-filename">fintech-iso20022-pacs008-{version}.xml</span>
                    <button
                      type="button"
                      className="btn-code-copy-float"
                      onClick={() => {
                        navigator.clipboard.writeText(generateIsoXml());
                        onNotify(isRtl ? 'تم نسخ رسالة ISO 20022' : 'Copied ISO 20022 XML', '', 'success');
                      }}
                      title="نسخ الملف بالكامل"
                    >
                      <i className="fa-solid fa-copy" />
                      <span>{isRtl ? 'نسخ' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="code-viewer-pre">
                    <code>{generateIsoXml()}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
        )}
      </div>
    </div>
  );
};
