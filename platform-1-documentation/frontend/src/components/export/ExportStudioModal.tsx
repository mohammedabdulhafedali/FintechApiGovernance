import React, { useState } from 'react';
import { SealedSnapshot } from '../../types/schema';
import { X, ShieldCheck, Copy, Check, Download, FileText, Code2, Award } from 'lucide-react';
import { useLanguage } from '../../i18n';

interface ExportStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: SealedSnapshot[];
}

export const ExportStudioModal: React.FC<ExportStudioModalProps> = ({
  isOpen,
  onClose,
  snapshots
}) => {
  const { t, language, isRtl } = useLanguage();
  const isEn = language === 'en';

  if (!isOpen) return null;

  const [selectedFormat, setSelectedFormat] = useState<'snapshot' | 'openapi' | 'pdf'>('snapshot');
  const [copiedHash, setCopiedHash] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const activeSnapshot = snapshots[0] || {
    releaseId: 'REL-2026-001',
    apiCode: 'CORE_BANKING',
    semver: 'v2026.2',
    canonicalSha256: '71027c802f60a92b951ec663c11e74a87265a7f9d854e7d483b8e5c12001e847',
    sealedAt: '2026-10-12 12:00 UTC',
    signerKmsKey: 'kms:sa-central-1:fintech-vault-01',
    endpointsCount: 4,
    complianceLevel: 'ISO 20022 Certified'
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(activeSnapshot.canonicalSha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleTriggerExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
    }, 1200);
  };

  const getExportPreview = () => {
    if (selectedFormat === 'snapshot') {
      return JSON.stringify({
        $schema: "https://spec.gov.fintech/v1/sealed-release.json",
        canonicalJcsVersion: "RFC-8785",
        releaseId: activeSnapshot.releaseId,
        apiCode: activeSnapshot.apiCode,
        semver: activeSnapshot.semver,
        sha256: activeSnapshot.canonicalSha256,
        sealedAt: activeSnapshot.sealedAt,
        signature: {
          algorithm: "RSA-PSS-4096",
          hash: "SHA-256",
          saltLength: 32,
          kmsKeyId: activeSnapshot.signerKmsKey,
          signerRole: "Chief Security Officer (CSO)"
        },
        complianceValidation: {
          iso20022Compliant: true,
          pciDssLevel: "Level 1 Certified",
          immutabilityLocked: true
        }
      }, null, 2);
    } else if (selectedFormat === 'openapi') {
      return JSON.stringify({
        openapi: "3.1.0",
        info: {
          title: isEn ? "National Fintech API Specification" : "المواصفة الوطنية للتقنية المالية والربط المصرفي",
          version: activeSnapshot.semver,
          description: isEn 
            ? "Official Immutable API Contract for Certified Financial Institutions"
            : "العقد الرقمي المعتمد غير القابل للتعديل للمؤسسات المالية المرخصة",
          "x-canonical-hash": activeSnapshot.canonicalSha256
        },
        servers: [{ url: "https://api.gov.fintech/v1" }],
        paths: {
          "/v1/transfers": {
            post: {
              summary: isEn ? "Execute Instant Transfer" : "تنفيذ تحويل فوري",
              operationId: "executeInstantTransfer",
              responses: {
                "200": { description: isEn ? "Successful transfer settlement" : "تسوية ناجحة للحوالة" },
                "422": { description: isEn ? "Unprocessable entity rule violation" : "خطأ رقابي في بيانات الطلب" }
              }
            }
          }
        }
      }, null, 2);
    } else {
      if (isEn) {
        return `# Certified Sovereign API Specification Report\n\n- Release ID: ${activeSnapshot.releaseId}\n- Architectural SemVer: ${activeSnapshot.semver}\n- Canonical Hash Fingerprint: ${activeSnapshot.canonicalSha256}\n- Cryptographic Standard: Canonical JCS (RFC 8785) + RSA-PSS 4096-bit\n- Document Status: Formally sealed and legally immutable.\n- Fully compliant with central clearing and instant payment regulations.`;
      } else {
        return `# تقرير التوثيق السيادي المعتمد لمواصفة الـ API\n\n- معرف الإصدار: ${activeSnapshot.releaseId}\n- الإصدار المعماري: ${activeSnapshot.semver}\n- بصمة الهاش الرقمي: ${activeSnapshot.canonicalSha256}\n- معيار التشفير: Canonical JCS (RFC 8785) + RSA-PSS 4096-bit\n- حالة الوثيقة: مختومة وغير قابلة للتعديل قانونياً وفنياً.\n- متوافقة مع ضوابط البنك المركزي والمدفوعات الفورية.`;
      }
    }
  };

  const alignStyle = { textAlign: isRtl ? 'right' : 'left' } as const;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '880px', ...alignStyle }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(13, 25, 48, 0.7)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Award size={22} color="var(--emerald)" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                {isEn ? 'Canonical Sealing & Export Studio' : 'استوديو التصدير المخصص والختم السيادي (Canonical Sealing Studio)'}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                {isEn ? 'Derive certified immutable contracts and digitally signed specifications' : 'اشتقاق الوثائق الرسمية والعقود المشفرة غير القابلة للإنكار أو التعديل'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Sealing Status Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.08))',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} color="var(--emerald)" />
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#6ee7b7' }}>
                  {isEn ? `Certified Release Contract (${activeSnapshot.releaseId})` : `وثيقة الإصدار المختومة رسمياً (${activeSnapshot.releaseId})`}
                </span>
              </div>
              <span className="badge-pill badge-emerald">
                Canonical JCS + RSA-PSS
              </span>
            </div>

            <div style={{
              background: '#040812',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>
                  SHA-256 Canonical Fingerprint:
                </span>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                  {activeSnapshot.canonicalSha256}
                </span>
              </div>
              <button
                className="btn btn-glass"
                onClick={handleCopyHash}
                style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
              >
                {copiedHash ? <Check size={14} color="var(--emerald)" /> : <Copy size={14} />}
                <span>{copiedHash ? t('common.copied') : t('common.copy')}</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>{isEn ? 'Sealed Date:' : 'تاريخ الختم:'} {activeSnapshot.sealedAt}</span>
              <span>{isEn ? 'KMS Key:' : 'مفتاح الخزينة:'} {activeSnapshot.signerKmsKey}</span>
            </div>
          </div>

          {/* Export Options Format Selector */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.65rem' }}>
              {isEn ? 'Select Export Deliverable Format:' : 'اختر صيغة التصدير المطلوبة:'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div
                onClick={() => setSelectedFormat('snapshot')}
                style={{
                  background: selectedFormat === 'snapshot' ? 'rgba(59, 130, 246, 0.18)' : 'var(--bg-card)',
                  border: `1px solid ${selectedFormat === 'snapshot' ? 'var(--blue)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                  <ShieldCheck size={16} color="var(--blue)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
                    {isEn ? 'Sealed Snapshot' : 'عقد الـ Snapshot المختوم'}
                  </span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                  {isEn ? 'Official cryptographically sealed JSON manifest for interoperability.' : 'ملف JSON رسمي معتمد مشفر برقم البصمة والتوقيع لنقله للبنوك.'}
                </p>
              </div>

              <div
                onClick={() => setSelectedFormat('openapi')}
                style={{
                  background: selectedFormat === 'openapi' ? 'rgba(16, 185, 129, 0.18)' : 'var(--bg-card)',
                  border: `1px solid ${selectedFormat === 'openapi' ? 'var(--emerald)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                  <Code2 size={16} color="var(--emerald)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
                    OpenAPI 3.1
                  </span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                  {isEn ? 'Interactive OpenAPI spec compliant with Swagger, Postman and SDK tools.' : 'مواصفة تفاعلية متوافقة مع Swagger و Postman لاختبارات الشركاء.'}
                </p>
              </div>

              <div
                onClick={() => setSelectedFormat('pdf')}
                style={{
                  background: selectedFormat === 'pdf' ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-card)',
                  border: `1px solid ${selectedFormat === 'pdf' ? 'var(--amber)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                  <FileText size={16} color="var(--amber)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
                    {isEn ? 'Official PDF' : 'مستند PDF التنفيذي'}
                  </span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                  {isEn ? 'Formally formatted print-ready specification for regulatory committees.' : 'وثيقة تفصيلية رسمية جاهزة للطباعة والاعتماد من الإدارات.'}
                </p>
              </div>
            </div>
          </div>

          {/* Preview Window */}
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '0.35rem', display: 'block' }}>
              {isEn ? 'Deliverable Preview Output:' : 'معاينة محتوى المستند المصدر:'}
            </span>
            <pre style={{
              background: '#040812',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: '#a5f3fc',
              maxHeight: '220px',
              overflowY: 'auto',
              direction: 'ltr',
              textAlign: 'left'
            }}>
              {getExportPreview()}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(11, 20, 38, 0.7)'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {isEn ? 'Guaranteed by Sovereign Central KMS Cryptographic Signer' : 'مضمون بواسطة مفتاح التشفير السيادي المركزي KMS'}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-glass" onClick={onClose} style={{ fontSize: '0.82rem' }}>
              {t('common.cancel')}
            </button>
            <button
              className="btn btn-emerald"
              onClick={handleTriggerExport}
              disabled={isExporting}
              style={{ fontSize: '0.82rem' }}
            >
              <Download size={15} />
              <span>{isExporting ? t('export.generating') : (isEn ? 'Download Deliverable Now' : 'تصدير وتحميل المستند الآن')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
