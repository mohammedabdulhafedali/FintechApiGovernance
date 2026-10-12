import React from 'react';
import { ChangeRequest } from '../../types/schema';
import { GitPullRequest, Check, ShieldCheck, Clock, UserCheck, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../i18n';

interface ChangeRequestsViewProps {
  changeRequests: ChangeRequest[];
  onApproveCr: (crId: string, roleName: string) => void;
}

export const ChangeRequestsView: React.FC<ChangeRequestsViewProps> = ({
  changeRequests,
  onApproveCr
}) => {
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  return (
    <div className="dedicated-view-layout">
      {/* Header Banner */}
      <div className="dedicated-view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--amber)',
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <GitPullRequest size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              {t('governance.pageTitle')}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {t('governance.pageSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Requests Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {changeRequests.map((cr) => {
          const allSigned = cr.approvals.every(a => a.signed);
          const signedCount = cr.approvals.filter(a => a.signed).length;

          return (
            <div key={cr.id} className="dedicated-view-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className="mono badge-pill badge-blue" style={{ fontSize: '0.8rem' }}>{cr.crNumber}</span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>{cr.title}</h3>
                </div>
                <span className={`badge-pill ${cr.changeType === 'BREAKING' ? 'badge-rose' : 'badge-emerald'}`}>
                  {cr.changeType === 'BREAKING' ? t('governance.breakingChange') : t('governance.nonBreakingChange')}
                </span>
              </div>

              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>
                {cr.description || cr.proposedChange}
              </p>

              {/* Multi-Signature Status Ribbon */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                marginTop: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                    {t('governance.signaturesProgress', { signed: signedCount, total: cr.approvals.length })}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                    {allSigned ? t('governance.allApproved') : t('governance.pendingApprovalNotice')}
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '0.85rem'
                }}>
                  {cr.approvals.map((app, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'var(--bg-card)',
                        border: `1px solid ${app.signed ? 'rgba(16, 185, 129, 0.4)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.65rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff' }}>
                            {app.role}
                          </span>
                          {app.signed ? (
                            <span className="badge-pill badge-emerald" style={{ fontSize: '0.66rem' }}>
                              <Check size={11} /> {t('governance.signedStatus')}
                            </span>
                          ) : (
                            <span className="badge-pill badge-amber" style={{ fontSize: '0.66rem' }}>
                              <Clock size={11} /> {t('governance.pendingSignature')}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                          {isEn ? 'Signer:' : 'المفوض:'} {app.approver}
                        </div>
                        {app.approvedAt && (
                          <div className="mono" style={{ fontSize: '0.70rem', color: 'var(--emerald)', marginTop: '0.15rem' }}>
                            {app.approvedAt}
                          </div>
                        )}
                      </div>

                      {!app.signed && (
                        <button
                          type="button"
                          className="btn btn-emerald"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', alignSelf: 'stretch' }}
                          onClick={() => onApproveCr(cr.id, app.role)}
                        >
                          <ShieldCheck size={14} />
                          <span>{t('governance.signButton', { role: app.role })}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
