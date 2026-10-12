import React, { useState, useRef, useEffect } from 'react';
import { SealedSnapshot } from '../../types/schema';
import { useLanguage } from '../../i18n';

interface ExportStudioViewProps {
  snapshots?: SealedSnapshot[];
  onNotify: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error', snippet?: string) => void;
}

type ExportFormat = 'pdf' | 'word' | 'markdown' | 'openapi' | 'postman' | 'iso';

interface ServiceItem {
  code: string;
  title: string;
  titleEn: string;
  sectorName: string;
  sectorNameEn: string;
  sectorKey: 'banking' | 'merchants' | 'aml';
  endpoints: {
    method: string;
    path: string;
    desc: string;
    descEn: string;
  }[];
}

export const ExportStudioView: React.FC<ExportStudioViewProps> = ({
  snapshots = [],
  onNotify
}) => {
  const { t, language, isRtl } = useLanguage();

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [exportLanguage, setExportLanguage] = useState<'ar' | 'en'>(language);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [panelWidth, setPanelWidth] = useState<number>(310);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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
  const allServices: ServiceItem[] = [
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

  const selectedServices = allServices.filter(s => sectors[s.sectorKey]);
  const totalEndpoints = selectedServices.reduce((sum, s) => sum + s.endpoints.length, 0);

  const selectedSectorCount = Object.values(sectors).filter(Boolean).length;
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
          const element = document.getElementById('pdf-pages-stack-container');
          if (element) {
            const opt = {
              margin: [0, 0, 0, 0],
              filename: filename,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            await win.html2pdf().set(opt).from(element).save();
            onNotify(
              t('export.exportSuccessTitle'),
              `${t('export.exportSuccessMsg', { format: 'PDF' })} (${filename})`,
              'success',
              filename
            );
            return;
          }
        }
        
        // Fallback to window.print()
        window.print();
        onNotify(
          t('export.exportSuccessTitle'),
          `${t('export.exportSuccessMsg', { format: 'PDF' })} (${filename})`,
          'success',
          filename
        );

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
    <div
      ref={wrapRef}
      id="export-resizable-wrap"
      className={`export-clean-wrap ${isExpanded ? 'pdf-site-expanded' : ''}`}
      style={{
        gridTemplateColumns: isExpanded ? '1fr' : `${panelWidth}px 14px 1fr`,
        ['--export-panel-w' as any]: `${panelWidth}px`
      }}
    >
      {/* =========================================================================
          COLUMN 1: Options Rail (Configuration Panel)
          ========================================================================= */}
      <div
        className="export-config-panel"
        id="export-config-panel"
        data-size={panelWidth < 260 ? 'compact' : panelWidth >= 360 ? 'wide' : undefined}
      >
        {/* Top Action Button */}
        <div className="export-top-action-bar">
          <button
            className="btn-export-direct"
            onClick={handleExecuteExport}
            disabled={isExporting}
            title={getButtonLabel()}
          >
            <i className={isExporting ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-file-export"} />
            <span>{isExporting ? t('export.generating') : getButtonLabel()}</span>
          </button>
        </div>

        {/* Group 0: Document Export Language Selector (الميزة الجوهرية المطلوبة) */}
        <div className="export-group">
          <div className="export-group-header">
            <div className="export-group-title">
              <i className="fa-solid fa-language" style={{ color: '#38bdf8' }} />
              <span>{t('export.exportDocLanguage')}</span>
            </div>
            <span className="mono" style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
              {exportLanguage.toUpperCase()}
            </span>
          </div>
          <div className="export-formats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div
              className={`format-pill ${exportLanguage === 'ar' ? 'active' : ''}`}
              onClick={() => setExportLanguage('ar')}
            >
              <span>العربية (RTL)</span>
            </div>
            <div
              className={`format-pill ${exportLanguage === 'en' ? 'active' : ''}`}
              onClick={() => setExportLanguage('en')}
            >
              <span>English (LTR)</span>
            </div>
          </div>
        </div>

        {/* Group 1: Sectors */}
        <div className="export-group">
          <div className="export-group-header">
            <div className="export-group-title">
              <i className="fa-solid fa-layer-group" style={{ color: '#38bdf8' }} />
              <span>{t('export.sectorsSection')}</span>
            </div>
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {t('export.sectorsSelectedCount', { selected: selectedSectorCount, total: 3 })}
            </span>
          </div>
          <div className="export-chips-row">
            <label className="export-chip">
              <input
                type="checkbox"
                checked={sectors.banking}
                onChange={e => setSectors(prev => ({ ...prev, banking: e.target.checked }))}
              />
              <span>{t('export.sectorBanking')}</span>
            </label>
            <label className="export-chip">
              <input
                type="checkbox"
                checked={sectors.merchants}
                onChange={e => setSectors(prev => ({ ...prev, merchants: e.target.checked }))}
              />
              <span>{t('export.sectorMerchants')}</span>
            </label>
            <label className="export-chip">
              <input
                type="checkbox"
                checked={sectors.aml}
                onChange={e => setSectors(prev => ({ ...prev, aml: e.target.checked }))}
              />
              <span>{t('export.sectorAml')}</span>
            </label>
          </div>
        </div>

        {/* Group 2: Package Modules */}
        <div className="export-group">
          <div className="export-group-header">
            <div className="export-group-title">
              <i className="fa-solid fa-boxes-stacked" style={{ color: '#38bdf8' }} />
              <span>{t('export.modulesSection')}</span>
            </div>
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {t('export.modulesSelectedCount', { selected: selectedModuleCount, total: 5 })}
            </span>
          </div>
          <div className="export-chips-row">
            <label className="export-chip">
              <input
                type="checkbox"
                checked={modules.schemas}
                onChange={e => setModules(prev => ({ ...prev, schemas: e.target.checked }))}
              />
              <span>{t('export.modSchemas')}</span>
            </label>
            <label className="export-chip">
              <input
                type="checkbox"
                checked={modules.wire}
                onChange={e => setModules(prev => ({ ...prev, wire: e.target.checked }))}
              />
              <span>{t('export.modWire')}</span>
            </label>
            <label className="export-chip">
              <input
                type="checkbox"
                checked={modules.crypto}
                onChange={e => setModules(prev => ({ ...prev, crypto: e.target.checked }))}
              />
              <span>{t('export.modCrypto')}</span>
            </label>
            <label className="export-chip">
              <input
                type="checkbox"
                checked={modules.errors}
                onChange={e => setModules(prev => ({ ...prev, errors: e.target.checked }))}
              />
              <span>{t('export.modErrors')}</span>
            </label>
            <label className="export-chip">
              <input
                type="checkbox"
                checked={modules.sla}
                onChange={e => setModules(prev => ({ ...prev, sla: e.target.checked }))}
              />
              <span>{t('export.modSla')}</span>
            </label>
          </div>
        </div>

        {/* Group 3: Format Selection */}
        <div className="export-group">
          <div className="export-group-header">
            <div className="export-group-title">
              <i className="fa-solid fa-file-code" style={{ color: '#38bdf8' }} />
              <span>{t('export.formatSection')}</span>
            </div>
            <span className="mono" style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
              {selectedFormat.toUpperCase()}
            </span>
          </div>
          <div className="export-formats-grid">
            <div
              className={`format-pill ${selectedFormat === 'pdf' ? 'active' : ''}`}
              onClick={() => setSelectedFormat('pdf')}
            >
              <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', marginInlineEnd: '0.35rem' }} />
              <span>PDF</span>
            </div>
            <div
              className={`format-pill ${selectedFormat === 'word' ? 'active' : ''}`}
              onClick={() => setSelectedFormat('word')}
            >
              <i className="fa-solid fa-file-word" style={{ color: '#2563eb', marginInlineEnd: '0.35rem' }} />
              <span>Word (.docx)</span>
            </div>
            <div
              className={`format-pill ${selectedFormat === 'markdown' ? 'active' : ''}`}
              onClick={() => setSelectedFormat('markdown')}
            >
              <i className="fa-brands fa-markdown" style={{ color: '#a855f7', marginInlineEnd: '0.35rem' }} />
              <span>Markdown (.md)</span>
            </div>
            <div
              className={`format-pill ${selectedFormat === 'openapi' ? 'active' : ''}`}
              onClick={() => setSelectedFormat('openapi')}
            >
              <i className="fa-solid fa-code" style={{ color: '#10b981', marginInlineEnd: '0.35rem' }} />
              <span>OpenAPI 3.1</span>
            </div>
            <div
              className={`format-pill ${selectedFormat === 'postman' ? 'active' : ''}`}
              onClick={() => setSelectedFormat('postman')}
            >
              <i className="fa-solid fa-paper-plane" style={{ color: '#f97316', marginInlineEnd: '0.35rem' }} />
              <span>Postman</span>
            </div>
            <div
              className={`format-pill ${selectedFormat === 'iso' ? 'active' : ''}`}
              onClick={() => setSelectedFormat('iso')}
            >
              <i className="fa-solid fa-file-lines" style={{ color: '#38bdf8', marginInlineEnd: '0.35rem' }} />
              <span>ISO 20022</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          COLUMN 2: Center Splitter Divider
          ========================================================================= */}
      <div
        id="export-splitter"
        className={`export-splitter ${isDragging ? 'dragging' : ''}`}
        title="اسحب لتعديل الحجم / Drag to resize"
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
          <svg width="6" height="12" viewBox="0 0 6 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" width="1.5" height="12" rx="0.75" fill="white" />
            <rect x="4" width="1.5" height="12" rx="0.75" fill="white" />
          </svg>
        </div>
      </div>

      {/* =========================================================================
          COLUMN 3: Live Deliverable Preview Area
          ========================================================================= */}
      <div className="export-summary-card" id="export-summary-card">
        {/* Floating Maximize Button */}
        <button
          type="button"
          className="btn-pdf-floating-expand"
          onClick={() => {
            setIsExpanded(!isExpanded);
            onNotify(
              isExpanded ? t('export.restoreBtn') : t('export.maximizeBtn'),
              isExpanded ? 'Restored default size' : 'Maximized preview to fill container',
              'info'
            );
          }}
          title={isExpanded ? t('export.restoreBtn') : t('export.maximizeBtn')}
        >
          <i className={isExpanded ? 'fa-solid fa-compress' : 'fa-solid fa-expand'} />
        </button>

        {/* Floating Stage Container */}
        <div className="pdf-viewer-stage">
          <div className="pdf-viewport-guard-top" />

          <div className="pdf-viewer-viewport">
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
                <div className="pdf-paper-page" style={{ padding: '2rem' }}>
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #2563eb', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <i className="fa-solid fa-file-word" style={{ fontSize: '2.5rem', color: '#2563eb', marginBottom: '0.5rem' }} />
                    <h2 style={{ color: '#0f172a', fontSize: '1.2rem', fontWeight: 800 }}>
                      {isExportEn ? 'Microsoft Word Document Deliverable (.docx)' : 'مستند Microsoft Word الرسمي المعتمد (.docx)'}
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.78rem' }}>
                      {isExportEn 
                        ? `Language: English (LTR) • Total Routes: ${totalEndpoints}` 
                        : `اللغة: العربية (RTL) • إجمالي المسارات: ${totalEndpoints}`}
                    </p>
                  </div>
                  <div style={{ color: '#334155', fontSize: '0.82rem', lineHeight: 1.8 }}>
                    <p><strong>{isExportEn ? 'Document Structure:' : 'هيكل المستند المُصدر:'}</strong></p>
                    <ul style={{ paddingInlineStart: '1.25rem' }}>
                      <li>{isExportEn ? 'Institutional Header & Scope' : 'الترويسة المؤسسية ونطاق العمل'}</li>
                      <li>{isExportEn ? 'Full Endpoints & Schema Table' : 'جدول المسارات والمخططات المعتمدة'}</li>
                      <li>{isExportEn ? 'Security Profile & Idempotency Rules' : 'المعايير الأمنية وقواعد عدم التكرار'}</li>
                      <li>{isExportEn ? 'Regulatory Error Dictionary' : 'قاموس الأخطاء والرموز الرقابية'}</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* FORMAT 3: MARKDOWN LIVE PREVIEW */}
              {selectedFormat === 'markdown' && (
                <div className="pdf-paper-page" style={{ padding: '1.5rem', background: '#0f172a', color: '#f8fafc' }}>
                  <pre style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.74rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: '#94a3b8'
                  }}>
                    {generateMarkdownContent()}
                  </pre>
                </div>
              )}

              {/* FORMAT 4: OPENAPI 3.1 LIVE PREVIEW */}
              {selectedFormat === 'openapi' && (
                <div className="pdf-paper-page" style={{ padding: '1.5rem', background: '#0f172a', color: '#38bdf8' }}>
                  <pre style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {JSON.stringify(generateOpenApiSpec(), null, 2)}
                  </pre>
                </div>
              )}

              {/* FORMAT 5: POSTMAN LIVE PREVIEW */}
              {selectedFormat === 'postman' && (
                <div className="pdf-paper-page" style={{ padding: '1.5rem', background: '#0f172a', color: '#f97316' }}>
                  <pre style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {JSON.stringify(generatePostmanCollection(), null, 2)}
                  </pre>
                </div>
              )}

              {/* FORMAT 6: ISO 20022 XML LIVE PREVIEW */}
              {selectedFormat === 'iso' && (
                <div className="pdf-paper-page" style={{ padding: '1.5rem', background: '#0f172a', color: '#34d399' }}>
                  <pre style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.70rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {generateIsoXml()}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
