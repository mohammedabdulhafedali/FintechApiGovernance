import React, { useState } from 'react';
import { ChangeRequest } from '../../types/schema';
import { X, GitPullRequest, Check, ShieldCheck, Clock, UserCheck, AlertCircle } from 'lucide-react';

interface ChangeRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  changeRequests: ChangeRequest[];
  onApproveCr: (crId: string, roleName: string) => void;
}

export const ChangeRequestsModal: React.FC<ChangeRequestsModalProps> = ({
  isOpen,
  onClose,
  changeRequests,
  onApproveCr
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '920px' }}>
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
            <GitPullRequest size={20} color="var(--amber)" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                محرك طلبات التغيير والاعتمادات المتعددة (Multi-Sig Vault & 4-Eyes)
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                لا يتم إقرار أي تعديل على مواصفات الـ API إلا باكتمال تواقيع أصحاب القرار الثلاثة
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {changeRequests.map((cr) => {
            const allSigned = cr.approvals.every(a => a.signed);

            return (
              <div key={cr.id} className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="mono badge-pill badge-blue" style={{ fontSize: '0.75rem' }}>{cr.crNumber}</span>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text)' }}>{cr.title}</h3>
                  </div>
                  <span className={`badge-pill ${cr.changeType === 'BREAKING' ? 'badge-rose' : 'badge-emerald'}`}>
                    {cr.changeType === 'BREAKING' ? 'كسر توافق إجباري (MAJOR)' : 'تحديث متوافق (MINOR)'}
                  </span>
                </div>

                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '0.85rem', lineHeight: 1.6 }}>
                  {cr.proposedChange}
                </p>

                {/* Submitter & Path */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem',
                  fontSize: '0.78rem',
                  color: 'var(--text-dim)',
                  marginBottom: '1rem',
                  background: 'var(--bg-input)',
                  padding: '0.5rem 0.85rem',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <span>المسار المتأثر: <code className="mono" style={{ color: 'var(--blue)' }}>{cr.endpointPath}</code></span>
                  <span>مقدم الطلب: <strong style={{ color: 'var(--text)' }}>{cr.author}</strong> ({cr.authorRole})</span>
                  <span>التاريخ: {cr.createdAt}</span>
                </div>

                {/* Multi-Sig Signatures Matrix */}
                <div style={{
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  paddingTop: '0.85rem'
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                    سجل التواقيع الرقمية الثلاثية المطلوبة للاعتماد:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem' }}>
                    {cr.approvals.map((approval, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: approval.signed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                          border: `1px solid ${approval.signed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                          borderRadius: 'var(--radius-md)',
                          padding: '0.65rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: approval.signed ? 'var(--emerald)' : 'var(--amber)' }}>
                            {approval.role}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {approval.approver}
                          </div>
                          {approval.approvedAt && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                              تم التوقيع: {approval.approvedAt}
                            </div>
                          )}
                        </div>

                        {approval.signed ? (
                          <span className="badge-pill badge-emerald" style={{ fontSize: '0.65rem' }}>
                            <Check size={12} /> معتمد
                          </span>
                        ) : (
                          <button
                            className="btn btn-primary"
                            onClick={() => onApproveCr(cr.id, approval.role)}
                            style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
                          >
                            <UserCheck size={12} /> توقيع واعتماد
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {allSigned && (
                    <div style={{
                      marginTop: '0.85rem',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid var(--emerald)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.65rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--emerald)', fontWeight: 700 }}>
                        <ShieldCheck size={18} />
                        اكتملت شروط الاعتماد الثلاثي! الطلب جاهز للختم الرقمي السيادي في الإصدار القادم.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'rgba(11, 20, 38, 0.7)'
        }}>
          <button className="btn btn-glass" onClick={onClose} style={{ fontSize: '0.82rem' }}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
