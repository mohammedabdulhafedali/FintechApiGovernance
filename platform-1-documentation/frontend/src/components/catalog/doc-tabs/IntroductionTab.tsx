import React, { useState } from 'react';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../../i18n';

interface IntroductionTabProps {
  title?: string;
  systemName?: string;
  baseUrl?: string;
  lastUpdated?: string;
  version?: string;
  overview?: string;
}

export const IntroductionTab: React.FC<IntroductionTabProps> = ({
  title = 'Financial Institutions (FI) API Documentation',
  systemName = 'Ultimate Pay Platform',
  baseUrl = 'https://tahseeltest.ultimate-pay.net/webserve',
  lastUpdated = '30-9-2026',
  version = 'v2026.2',
  overview = 'The Ultimate Pay Financial Institutions (FI) API enables financial institutions to seamlessly integrate payment, inquiry, biller discovery, and transaction management services. All API requests are authenticated using RSA-SHA256 digital signatures to ensure end-to-end message integrity and non-repudiation.'
}) => {
  const { isRtl, language, t, getLocalized } = useLanguage();
  const isEn = language === 'en';
  const [copiedBaseUrl, setCopiedBaseUrl] = useState(false);
  const [copiedCanonical, setCopiedCanonical] = useState(false);

  const canonicalFormat = `<HTTP_METHOD>\\n<PATH>\\n<TIMESTAMP>\\n<NONCE>\\n<SHA256_HASH_OF_BODY>`;

  const handleCopy = (text: string, type: 'url' | 'canonical') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedBaseUrl(true);
      setTimeout(() => setCopiedBaseUrl(false), 2000);
    } else {
      setCopiedCanonical(true);
      setTimeout(() => setCopiedCanonical(false), 2000);
    }
  };

  const isDefaultEnglishOverview = !overview || overview.includes('The Ultimate Pay Financial Institutions') || overview.includes('enables financial institutions to seamlessly integrate');

  const localizedOverview = isEn 
    ? (overview || 'The Ultimate Pay Financial Institutions (FI) API enables financial institutions to seamlessly integrate payment, inquiry, biller discovery, and transaction management services. All API requests are authenticated using RSA-SHA256 digital signatures to ensure end-to-end message integrity and non-repudiation.')
    : (isDefaultEnglishOverview 
        ? 'تُمكّن واجهات برمجة تطبيقات المؤسسات المالية (FI) في منصة ألتيميت باي المؤسسات المالية من الربط السلس مع خدمات الدفع والاستعلام واكتشاف المفوترين وإدارة العمليات. يتم توثيق كافة طلبات الـ API وتأمينها باستخدام التواقيع الرقمية RSA-SHA256 لضمان سلامة الرسائل ومنع الإنكار.'
        : getLocalized(overview, 'تُمكّن واجهات برمجة تطبيقات المؤسسات المالية (FI) في منصة ألتيميت باي المؤسسات المالية من الربط السلس مع خدمات الدفع والاستعلام واكتشاف المفوترين وإدارة العمليات. يتم توثيق كافة طلبات الـ API وتأمينها باستخدام التواقيع الرقمية RSA-SHA256 لضمان سلامة الرسائل ومنع الإنكار.')
      );

  const isDefaultTitle = !title || title === 'Financial Institutions (FI) API Documentation';
  const localizedTitle = isDefaultTitle 
    ? t('docTabs.intro.title') 
    : getLocalized(title, title);

  const isDefaultSystemName = !systemName || systemName === 'Ultimate Pay Platform';
  const localizedSystemName = isDefaultSystemName 
    ? t('docTabs.intro.systemName') 
    : getLocalized(systemName, systemName);

  return (
    <div 
      className="doc-tab-pane intro-tab-container" 
      style={{ 
        padding: '1.5rem', 
        maxWidth: '1080px', 
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        direction: isRtl ? 'rtl' : 'ltr'
      }}
    >
      {/* ── Document Official Header Card ── */}
      <div 
        style={{
          padding: '1.5rem',
          borderRadius: '10px',
          background: 'var(--bg-card, #2b4870)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          textAlign: isRtl ? 'right' : 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: 'var(--text, #ffffff)',
              margin: '0 0 0.4rem 0',
              fontFamily: 'var(--font-title, sans-serif)',
              letterSpacing: '-0.01em'
            }}>
              {localizedTitle}
            </h1>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-dim, #94a3b8)', fontWeight: 600 }}>
              {localizedSystemName}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--emerald, #10b981)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontFamily: 'var(--font-mono, monospace)',
              direction: 'ltr'
            }}>
              {isEn ? `Version ${version}` : `الإصدار ${version}`}
            </span>
            <span style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-muted, #cbd5e1)',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              fontFamily: 'var(--font-mono, monospace)',
              direction: 'ltr'
            }}>
              {isEn ? `latest update ${lastUpdated}` : `آخر تحديث ${lastUpdated}`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Section: Overview ── */}
      <div 
        style={{
          padding: '1.4rem',
          borderRadius: '10px',
          background: 'var(--bg-card, #2b4870)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          textAlign: isRtl ? 'right' : 'left'
        }}
      >
        <h2 style={{
          fontSize: '1.08rem',
          fontWeight: 700,
          color: 'var(--text, #ffffff)',
          margin: '0 0 0.75rem 0'
        }}>
          {t('docTabs.intro.overviewTitle')}
        </h2>
        <p style={{
          fontSize: '0.92rem',
          lineHeight: '1.65',
          color: 'var(--text-muted, #cbd5e1)',
          margin: 0
        }}>
          {localizedOverview}
        </p>
      </div>

      {/* ── Section: Base URL ── */}
      <div 
        style={{
          padding: '1.25rem 1.4rem',
          borderRadius: '10px',
          background: 'var(--bg-card, #2b4870)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          textAlign: isRtl ? 'right' : 'left'
        }}
      >
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', marginBottom: '0.65rem' }}>
          {t('docTabs.intro.baseUrlTitle')}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-main, #1a2d45)',
          padding: '0.65rem 1rem',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          gap: '1rem',
          direction: 'ltr'
        }}>
          <code style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.9rem',
            color: '#38bdf8',
            direction: 'ltr',
            wordBreak: 'break-all'
          }}>
            {baseUrl}
          </code>
          <button
            onClick={() => handleCopy(baseUrl, 'url')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.15))',
              background: 'rgba(255, 255, 255, 0.05)',
              color: copiedBaseUrl ? 'var(--emerald, #10b981)' : 'var(--text, #ffffff)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0
            }}
            title={isEn ? 'Copy Base URL' : 'نسخ رابط البوابة'}
          >
            {copiedBaseUrl ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedBaseUrl ? (isEn ? 'Copied' : 'تم النسخ') : (isEn ? 'Copy' : 'نسخ')}</span>
          </button>
        </div>
      </div>

      {/* ── Section 1: Authentication & Security ── */}
      <div 
        style={{
          padding: '1.5rem',
          borderRadius: '10px',
          background: 'var(--bg-card, #2b4870)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.4rem',
          textAlign: isRtl ? 'right' : 'left'
        }}
      >
        <h2 style={{
          fontSize: '1.18rem',
          fontWeight: 800,
          color: 'var(--text, #ffffff)',
          margin: 0
        }}>
          {isEn ? '1. Authentication & Cryptographic Security' : '1. المصادقة والتشفير الرقمي السيادي'}
        </h2>

        {/* 1.1 Digital Signature Overview */}
        <div>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#38bdf8', margin: '0 0 0.5rem 0' }}>
            {isEn ? '1.1 Digital Signature Overview' : '1.1 نظرة عامة على معيار التوقيع الرقمي'}
          </h3>
          <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-muted, #cbd5e1)', margin: 0 }}>
            {isEn 
              ? 'The digital signature serves as a secure, stateless alternative to traditional username/password authentication. Every HTTP request sent to the platform must include custom security headers generated using an RSA-256 private key.'
              : 'يعمل التوقيع الرقمي كبديل أمني متقدم وعديم الحالة (Stateless) للمصادقة التقليدية. يجب أن يتضمن كل طلب HTTP مُرسل إلى المنظومة رؤوس أمان معيارية يتم إنشاؤها وتوقيعها تشفيرياً باستخدام المفتاح الخاص RSA-256.'
            }
          </p>
        </div>

        {/* 1.2 FI Onboarding Steps */}
        <div>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#38bdf8', margin: '0 0 0.65rem 0' }}>
            {isEn ? '1.2 FI Onboarding Steps' : '1.2 خطوات تهيئة وربط المؤسسة المالية (Onboarding)'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted, #cbd5e1)' }}>
            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, color: 'var(--emerald, #10b981)', minWidth: '1.25rem' }}>1.</span>
              <div>
                <strong style={{ color: 'var(--text, #ffffff)' }}>
                  {isEn ? 'Navigate to Platform Settings:' : 'الانتقال إلى إعدادات المنظومة:'}
                </strong>{' '}
                {isEn 
                  ? 'Log into the Ultimate Pay Platform and navigate to the IAM / Users management screen.'
                  : 'تسجيل الدخول إلى منصة ألتيميت باي والانتقال لشاشة إدارة المستخدمين والحسابات.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, color: 'var(--emerald, #10b981)', minWidth: '1.25rem' }}>2.</span>
              <div>
                <strong style={{ color: 'var(--text, #ffffff)' }}>
                  {isEn ? 'Create FI User Account:' : 'إنشاء حساب المؤسسة المالية (FI User):'}
                </strong>
                <ul style={{ margin: '0.35rem 0 0 1.25rem', padding: 0 }}>
                  <li style={{ marginBottom: '0.25rem' }}>
                    {isEn ? 'Create a new user with type ' : 'إنشاء مستخدم جديد بنوع '}
                    <code style={{ color: '#38bdf8', direction: 'ltr' }}>Financial Institution</code>.
                  </li>
                  <li style={{ marginBottom: '0.25rem' }}>
                    {isEn ? 'Assign appropriate banking permissions.' : 'إسناد الصلاحيات المصرفية والرقابية المناسبة.'}
                  </li>
                  <li>
                    {isEn ? 'Set the user role/type as ' : 'تعيين دور المستخدم كمستخدم طرفي معتمد '}
                    <code style={{ color: '#38bdf8', direction: 'ltr' }}>Terminal User</code>.
                  </li>
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, color: 'var(--emerald, #10b981)', minWidth: '1.25rem' }}>3.</span>
              <div>
                <strong style={{ color: 'var(--text, #ffffff)' }}>
                  {isEn ? 'Cryptographic Key Exchange:' : 'تبادل المفاتيح التشفيرية (Key Exchange):'}
                </strong>
                <ul style={{ margin: '0.35rem 0 0 1.25rem', padding: 0 }}>
                  <li style={{ marginBottom: '0.25rem' }}>
                    {isEn ? 'Generate an RSA key pair locally (minimum 2048-bit recommended).' : 'توليد زوج مفاتيح RSA محلياً لدى المؤسسة (بطول 2048-بت كحد أدنى موصى به).'}
                  </li>
                  <li>
                    {isEn ? 'Upload the ' : 'رفع ملف المفتاح العام '}
                    <code style={{ color: '#38bdf8', direction: 'ltr' }}>public_key.pem</code>
                    {isEn ? ' file or paste its content into the designated text box in the admin portal.' : ' أو لصق محتواه في الحقل المخصص في بوابة الإدارة.'}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Security Notice Callout */}
          <div style={{
            marginTop: '0.9rem',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem'
          }}>
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.84rem', color: '#fca5a5', lineHeight: '1.5' }}>
              <strong style={{ color: '#ef4444' }}>
                {isEn ? 'Important Security Notice: ' : 'تنبيه أمني بالغ الأهمية: '}
              </strong>
              {isEn 
                ? 'Store private_key.pem in a secure hardware or cloud location (e.g., HSM, AWS Secrets Manager, Key Vault). Never share or expose the private key.'
                : 'احفظ المفتاح الخاص private_key.pem في مكان آمن حصين (مثل HSM أو خزينة مفاتيح سحابية مشفرة). يُحظر تماماً مشاركة أو إفشاء المفتاح الخاص لأي جهة.'}
            </div>
          </div>
        </div>

        {/* 1.3 Signature Generation Specification */}
        <div>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#38bdf8', margin: '0 0 0.65rem 0' }}>
            {isEn ? '1.3 Signature Generation Specification' : '1.3 مواصفة توليد التوقيع الرقمي والسلسلة الكنونية'}
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #cbd5e1)', margin: '0 0 0.65rem 0' }}>
            {isEn 
              ? 'To sign a request, construct a canonical string formatted in strict order as follows:'
              : 'لتوقيع أي طلب، يتم تركيب السلسلة الكنونية المعيارية بالترتيب التالي:'}
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-main, #1a2d45)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            marginBottom: '1rem',
            gap: '1rem',
            direction: 'ltr'
          }}>
            <code style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.86rem',
              color: '#34d399',
              direction: 'ltr',
              wordBreak: 'break-all'
            }}>
              {canonicalFormat}
            </code>
            <button
              onClick={() => handleCopy(canonicalFormat, 'canonical')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid var(--border, rgba(255, 255, 255, 0.15))',
                background: 'rgba(255, 255, 255, 0.05)',
                color: copiedCanonical ? 'var(--emerald, #10b981)' : 'var(--text, #ffffff)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0
              }}
              title={isEn ? 'Copy Canonical Formula' : 'نسخ صيغة السلسلة الكنونية'}
            >
              {copiedCanonical ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedCanonical ? (isEn ? 'Copied' : 'تم النسخ') : (isEn ? 'Copy' : 'نسخ')}</span>
            </button>
          </div>

          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted, #cbd5e1)', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 0.4rem 0', fontWeight: 600, color: 'var(--text, #ffffff)' }}>
              {isEn ? 'Where variables represent:' : 'حيث تمثل المتغيرات البرمجية:'}
            </p>
            <ul style={{ margin: 0, padding: isRtl ? '0 1.25rem 0 0' : '0 0 0 1.25rem' }}>
              <li style={{ marginBottom: '0.25rem' }}>
                <code style={{ color: '#38bdf8', direction: 'ltr' }}>&lt;HTTP_METHOD&gt;</code>:{' '}
                {isEn ? 'Uppercase HTTP method (GET, POST, PUT, DELETE).' : 'طريقة الـ HTTP بالأحرف الكبيرة (GET, POST, PUT, DELETE).'}
              </li>
              <li style={{ marginBottom: '0.25rem' }}>
                <code style={{ color: '#38bdf8', direction: 'ltr' }}>&lt;PATH&gt;</code>:{' '}
                {isEn 
                  ? 'Request endpoint path starting with / (e.g., /v1/transfers).' 
                  : 'مسار نقطة النهاية للطلب ويبدأ بـ / (مثل /v1/transfers).'}
              </li>
              <li style={{ marginBottom: '0.25rem' }}>
                <code style={{ color: '#38bdf8', direction: 'ltr' }}>&lt;TIMESTAMP&gt;</code>:{' '}
                {isEn 
                  ? 'Current Unix timestamp in seconds (string format).' 
                  : 'الطابع الزمني Unix بالثواني لحظة الإرسال كـ string لمنع انتهاء الصلاحية.'}
              </li>
              <li style={{ marginBottom: '0.25rem' }}>
                <code style={{ color: '#38bdf8', direction: 'ltr' }}>&lt;NONCE&gt;</code>:{' '}
                {isEn 
                  ? 'Unique UUID v4 string generated per request for replay protection.' 
                  : 'معرف عشوائي فريد UUID v4 يتم توليده لكل طلب لمنع هجمات إعادة التشغيل (Replay Attacks).'}
              </li>
              <li>
                <code style={{ color: '#38bdf8', direction: 'ltr' }}>&lt;SHA256_HASH_OF_BODY&gt;</code>:{' '}
                {isEn 
                  ? 'Lowercase hex digest of the SHA-256 hash of the raw JSON request body (for empty body, use "").' 
                  : 'تجزئة الهاش SHA-256 لحقل الـ JSON لجسم الطلب بصيغة Hex بأحرف صغيرة (وللطلب الفارغ استخدم "").'}
              </li>
            </ul>
            <p style={{ margin: '0.75rem 0 0 0', fontStyle: 'italic', color: 'var(--text-dim, #94a3b8)' }}>
              {isEn 
                ? 'Sign the UTF-8 encoded canonical string using RSA PKCS#1 v1.5 with SHA-256, then Base64 encode the resulting signature.'
                : 'يتم توقيع السلسلة الكنونية بترميز UTF-8 باستخدام خوارزمية RSA PKCS#1 v1.5 مع SHA-256، ثم ترميز التوقيع الناتج بـ Base64.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
