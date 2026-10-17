import React from 'react';
import { Lock, ShieldAlert, CheckCircle2, UserCheck, AlertCircle, Sparkles } from 'lucide-react';
import { DocClaimInfo, ChangeScopeType } from '../../types/docGovernance';

interface GovernanceLockBannerProps {
  isLockedByOther: boolean;
  lockedBy?: string;
  isApproverRole: boolean;
  allowedScope?: ChangeScopeType;
  supervisorNotes?: string;
  isClaimedByMe?: boolean;
  canClaim?: boolean;
  onClaim?: () => void;
  onRelease?: () => void;
}

export const GovernanceLockBanner: React.FC<GovernanceLockBannerProps> = ({
  isLockedByOther,
  lockedBy,
  isApproverRole,
  allowedScope,
  supervisorNotes,
  isClaimedByMe,
  canClaim,
  onClaim,
  onRelease
}) => {
  // If no governance condition applies, don't show
  if (!isLockedByOther && !isApproverRole && (!allowedScope || allowedScope === 'FULL') && !isClaimedByMe && !canClaim) {
    return null;
  }

  const getScopeArabic = (scope?: ChangeScopeType) => {
    switch (scope) {
      case 'ENDPOINTS': return 'نقاط النهاية والمسارات فقط (Endpoints)';
      case 'FIELDS_TABLE': return 'جداول الحقول والبيانات فقط (Fields Table)';
      case 'SECURITY_AUTH': return 'معايير الأمان والتفويض فقط (Security & Auth)';
      case 'OVERVIEW': return 'المقدمة والوصف العام فقط (Overview)';
      default: return 'كامل أقسام الوثيقة (Full Document)';
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      margin: '0 0 12px 0',
      zIndex: 100
    }}>
      {/* 1. Locked by another user */}
      {isLockedByOther && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderRadius: '8px',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.35)',
          color: '#f43f5e',
          fontSize: '0.82rem',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} />
            <span>
              <strong>قفل حصري (Exclusive Lock):</strong> هذه الوثيقة محجوزة وقيد التحرير حالياً بواسطة <u>[{lockedBy || 'مستخدم آخر'}]</u>. العرض متاح للقراءة فقط لتفادي تضارب التعديلات.
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', background: 'rgba(244, 63, 94, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
            READ ONLY
          </span>
        </div>
      )}

      {/* 2. Approver / Checker Role (Separation of Duties - SoD) */}
      {!isLockedByOther && isApproverRole && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderRadius: '8px',
          background: 'rgba(168, 85, 247, 0.12)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          color: '#c084fc',
          fontSize: '0.82rem',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} />
            <span>
              <strong>فصل الواجبات (SoD Guard):</strong> بصفتك معتمداً/مدققاً، يُحظر التعديل المباشر على محتوى الوثيقة لمنع تضارب المصالح. دورك محصور بالمراجعة أو طلب التعديل أو الاعتماد.
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', background: 'rgba(168, 85, 247, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
            CHECKER ONLY
          </span>
        </div>
      )}

      {/* 3. Scoped modification enforced by supervisor */}
      {!isLockedByOther && allowedScope && allowedScope !== 'FULL' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderRadius: '8px',
          background: 'rgba(56, 189, 248, 0.10)',
          border: '1px solid rgba(56, 189, 248, 0.30)',
          color: '#38bdf8',
          fontSize: '0.82rem',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>
              <strong>تعديل مقيد بنطاق المشرف:</strong> مصرح بتعديل [<strong>{getScopeArabic(allowedScope)}</strong>] فقط. باقي أجزاء الوثيقة مجمدة للحماية.
              {supervisorNotes && <span style={{ marginRight: '6px', opacity: 0.85 }}>({supervisorNotes})</span>}
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
            SCOPED LOCKDOWN
          </span>
        </div>
      )}

      {/* 4. Claimed by Current User */}
      {isClaimedByMe && !isLockedByOther && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 14px',
          borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          color: '#10b981',
          fontSize: '0.78rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={14} />
            <span>أنت المستلم الحصري لهذه المسودة حالياً. تم قفل التعديل عن باقي المستخدمين.</span>
          </div>
          {onRelease && (
            <button
              type="button"
              onClick={onRelease}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#10b981',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.74rem'
              }}
            >
              فك القفل وإتاحتها للآخرين
            </button>
          )}
        </div>
      )}

      {/* 5. Can Claim Button */}
      {canClaim && !isClaimedByMe && !isLockedByOther && !isApproverRole && onClaim && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 14px',
          borderRadius: '8px',
          background: 'rgba(234, 179, 8, 0.08)',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          color: '#eab308',
          fontSize: '0.78rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} />
            <span>هذه المسودة متاحة؛ يمكنك استلامها وتأمين القفل الحصري للبدء في التعديل.</span>
          </div>
          <button
            type="button"
            onClick={onClaim}
            style={{
              background: '#eab308',
              color: '#000000',
              border: 'none',
              padding: '2px 10px',
              borderRadius: '4px',
              fontWeight: 700,
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            استلام وحجز المسودة
          </button>
        </div>
      )}
    </div>
  );
};
