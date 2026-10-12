import React, { useState } from 'react';
import { PlusCircle, X, Building2, Store, ShieldAlert, Scale, Coins, Wallet } from 'lucide-react';
import { Sector } from '../../types/schema';
import { useLanguage } from '../../i18n';

interface AddSectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSector: (newSector: Sector) => void;
}

export const AddSectorModal: React.FC<AddSectorModalProps> = ({
  isOpen,
  onClose,
  onAddSector
}) => {
  const { t, isRtl, language } = useLanguage();
  const isEn = language === 'en';

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [code, setCode] = useState('');
  const [icon, setIcon] = useState('banking');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('modals.errSectorName'));
      return;
    }

    const cleanCode = (code.trim() || `SECTOR_${Date.now()}`).toUpperCase();
    const sectorKey = `sec_${Date.now().toString(36)}`;
    const finalNameEn = nameEn.trim() || name.trim();

    const newSector: Sector = {
      key: sectorKey,
      name: name.trim(),
      nameEn: finalNameEn,
      code: cleanCode.startsWith('SECTOR_') ? cleanCode : `SECTOR_${cleanCode}`,
      icon: icon === 'merchants' ? 'fa-store' : icon === 'aml' ? 'fa-shield-halved' : icon === 'settlement' ? 'fa-scale-balanced' : 'fa-building-columns',
      services: {
        default: {
          title: `خدمات ${name.trim()}`,
          titleEn: `${finalNameEn} Services`,
          code: cleanCode.replace(/^SECTOR_/, '').substring(0, 8),
          baseUrl: `https://api.gov.fintech/v1/${sectorKey}`,
          versions: ['v2026.2'],
          endpoints: []
        }
      }
    };

    onAddSector(newSector);
    setName('');
    setNameEn('');
    setCode('');
    setDesc('');
    setError('');
    onClose();
  };

  const alignStyle = { textAlign: isRtl ? 'right' : 'left' } as const;

  return (
    <div className="floating-alert-overlay" onClick={onClose}>
      <div
        className="floating-alert-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          ...alignStyle,
          alignItems: 'stretch',
          borderTop: '4px solid var(--emerald)'
        }}
      >
        {/* Header with Close */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--emerald)',
              flexShrink: 0
            }}>
              <PlusCircle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {t('modals.addSectorTitle')}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {t('modals.addSectorSub')}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-xs)'
            }}
            title={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Callout */}
        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid var(--rose)',
            color: '#fecdd3',
            padding: '0.6rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.80rem'
          }}>
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>
                {t('modals.sectorNameAr')} <span style={{ color: 'var(--rose)' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder={t('modals.sectorNamePlaceholder')}
                className="form-control"
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>
                {t('modals.sectorNameEn')}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Exchange Companies"
                className="form-control"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>
                {t('modals.sectorCode')}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t('modals.sectorCodePlaceholder')}
                className="form-control mono"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>
                {t('modals.sectorIcon')}
              </label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="form-control"
              >
                <option value="banking">{isEn ? 'Bank (Building)' : 'مصرف (مبنى)'}</option>
                <option value="merchants">{isEn ? 'Merchant (Store)' : 'تاجر وبوابة دفع (متجر)'}</option>
                <option value="aml">{isEn ? 'Security (Shield)' : 'رقابة وأمان (درع)'}</option>
                <option value="settlement">{isEn ? 'Clearing (Scale)' : 'مقاصة وتسوية (ميزان)'}</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>
              {t('modals.sectorDesc')}
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t('modals.sectorDescPlaceholder')}
              className="form-control"
              style={{ height: '65px', resize: 'vertical' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.5rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              style={{ padding: '0.5rem 1.15rem' }}
            >
              {t('modals.btnCancel')}
            </button>

            <button
              type="submit"
              className="btn btn-emerald"
              style={{ padding: '0.55rem 1.35rem' }}
            >
              <PlusCircle size={15} />
              <span>{t('modals.btnSubmitSector')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
