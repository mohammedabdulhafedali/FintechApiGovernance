import React, { useState } from 'react';
import { Endpoint, HttpMethod } from '../../types/schema';
import { X, Plus, PlusCircle, Check } from 'lucide-react';
import { useLanguage } from '../../i18n';

interface AddApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectorName: string;
  onAddEndpoint: (endpoint: Endpoint) => void;
}

export const AddApiModal: React.FC<AddApiModalProps> = ({
  isOpen,
  onClose,
  sectorName,
  onAddEndpoint
}) => {
  const { t, language, isRtl } = useLanguage();
  const isEn = language === 'en';

  if (!isOpen) return null;

  const [method, setMethod] = useState<HttpMethod>('POST');
  const [path, setPath] = useState('/v1/');
  const [shortName, setShortName] = useState('');
  const [desc, setDesc] = useState('');
  const [paramName, setParamName] = useState('');
  const [paramType, setParamType] = useState('string');
  const [paramRule, setParamRule] = useState('');
  const [paramsList, setParamsList] = useState<{ name: string; type: string; req: boolean; rule: string; tag: string; tagClass: string }[]>([]);

  const handleAddParam = () => {
    if (!paramName) return;
    setParamsList(prev => [
      ...prev,
      {
        name: paramName,
        type: paramType,
        req: true,
        rule: paramRule || (isEn ? 'Standard Validation' : 'تحقق قياسي'),
        tag: 'Financial',
        tagClass: 'badge-emerald'
      }
    ]);
    setParamName('');
    setParamRule('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!path || !shortName) return;

    const newEndpoint: Endpoint = {
      id: `ep_custom_${Date.now()}`,
      method,
      path,
      shortName,
      desc: desc || (isEn ? 'Newly registered route' : 'مسار جديد مسجل في المنظومة'),
      descEn: isEn ? desc : `${shortName} service`,
      params: paramsList,
      rules: [
        { id: `BR_${shortName.toUpperCase()}_01`, name: isEn ? 'Mandatory Field Validation' : 'التحقق الإلزامي من صحة البيانات', err: 'VALIDATION_FAILED_422' }
      ],
      payload: paramsList.length > 0 ? JSON.stringify(
        paramsList.reduce((acc, p) => ({ ...acc, [p.name]: p.type === 'number' ? 100 : 'example_value' }), {}),
        null, 2
      ) : '// No Request Body',
      res200: JSON.stringify({ status: "SUCCESS", message: "Processed successfully" }, null, 2),
      res422: JSON.stringify({ error: "VALIDATION_FAILED_422", message: "Rule condition failed" }, null, 2),
      isDraft: true
    };

    onAddEndpoint(newEndpoint);
    onClose();
  };

  const alignStyle = { textAlign: isRtl ? 'right' : 'left' } as const;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px', ...alignStyle }}>
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
            <PlusCircle size={20} color="var(--emerald)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              {isEn ? `Document New API Route for [${sectorName}]` : `إضافة وتوثيق مسار API جديد لـ [${sectorName}]`}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 180px', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem' }}>
                {t('docHub.methodLabel')}
              </label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value as HttpMethod)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '0.55rem',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem' }}>
                {t('docHub.endpointPathLabel')}
              </label>
              <input
                type="text"
                value={path}
                onChange={e => setPath(e.target.value)}
                placeholder="/v1/cards/issue"
                required
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)',
                  direction: 'ltr',
                  textAlign: 'left'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem' }}>
                {t('docHub.shortNameLabel')}
              </label>
              <input
                type="text"
                value={shortName}
                onChange={e => setShortName(e.target.value)}
                placeholder="cards"
                required
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)',
                  direction: 'ltr',
                  textAlign: 'left'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem' }}>
              {t('docHub.descLabel')}
            </label>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder={isEn ? "Digital credit card issuance with linked core account..." : "إصدار بطاقة ائتمانية رقمية فورية مع ربط الحساب البنكي..."}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '0.55rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                fontSize: '0.82rem'
              }}
            />
          </div>

          {/* Parameters Builder */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem'
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.5rem' }}>
              {isEn ? 'Add Schema Fields (Parameters):' : 'إضافة حقول المخطط (Schema Fields):'}
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1.5fr auto', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                type="text"
                value={paramName}
                onChange={e => setParamName(e.target.value)}
                placeholder={isEn ? "Field Name (cardType)" : "اسم الحقل (cardType)"}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
              <select
                value={paramType}
                onChange={e => setParamType(e.target.value)}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem'
                }}
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="UUID">UUID</option>
                <option value="IBAN">IBAN</option>
              </select>
              <input
                type="text"
                value={paramRule}
                onChange={e => setParamRule(e.target.value)}
                placeholder={isEn ? "Validation Rule (DEBIT or CREDIT)" : "قاعدة التحقق (قيمة افتراضية: DEBIT أو CREDIT)"}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem'
                }}
              />
              <button
                type="button"
                onClick={handleAddParam}
                className="btn btn-emerald"
                style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem' }}
              >
                <Plus size={14} />
              </button>
            </div>

            {paramsList.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {paramsList.map((p, i) => (
                  <span key={i} className="badge-pill badge-blue" style={{ fontSize: '0.72rem' }}>
                    {p.name} ({p.type})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-glass" onClick={onClose} style={{ fontSize: '0.82rem' }}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-emerald" style={{ fontSize: '0.82rem' }}>
              <Check size={14} />
              <span>{isEn ? 'Register Route as Draft' : 'تسجيل المسار كمسودة جديدة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
