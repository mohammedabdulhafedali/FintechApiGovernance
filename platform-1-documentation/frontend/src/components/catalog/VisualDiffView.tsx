import React, { useState, useMemo } from 'react';
import { 
  GitCompare, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  XCircle, 
  PlusCircle, 
  Edit3, 
  Send, 
  Check, 
  MessageSquare,
  FileCheck
} from 'lucide-react';
import { UastDocument, VersionDiffReport } from '../../services/uast/types';
import { astDiffEngine } from '../../services/uast/diffEngine';
import { uastDraftService } from '../../services/uast/draftService';
import { useLanguage } from '../../i18n';
import { FloatingAlertCard, FloatingAlertState } from '../common/FloatingAlertCard';

interface VisualDiffViewProps {
  currentDocument: UastDocument;
  onClose: () => void;
  onApproveVersion?: (promotedDoc: UastDocument) => void;
}

export const VisualDiffView: React.FC<VisualDiffViewProps> = ({
  currentDocument,
  onClose,
  onApproveVersion
}) => {
  const { isRtl } = useLanguage();
  const [checkerNote, setCheckerNote] = useState('');
  const [actionDoneMsg, setActionDoneMsg] = useState<string | null>(null);
  const [floatingAlert, setFloatingAlert] = useState<FloatingAlertState | null>(null);

  // 1. Resolve Baseline Document (Previous Approved Version)
  const baselineDoc = useMemo<UastDocument>(() => {
    const history = uastDraftService.getVersionHistory(currentDocument.serviceCode);
    if (history.length > 0) {
      return history[0].astSnapshot;
    }
    // If no previous version, create a synthetic baseline (e.g., initial draft)
    return {
      ...currentDocument,
      semver: '1.0.0',
      requestTree: {
        ...currentDocument.requestTree,
        children: currentDocument.requestTree.children.slice(0, Math.max(1, currentDocument.requestTree.children.length - 1))
      }
    };
  }, [currentDocument]);

  // 2. Compute Semantic Diff & Breaking Change Analysis
  const diffReport = useMemo<VersionDiffReport>(() => {
    return astDiffEngine.compare(baselineDoc, currentDocument);
  }, [baselineDoc, currentDocument]);

  const nextSemver = useMemo(() => {
    return astDiffEngine.computeNextVersion(baselineDoc.semver, diffReport.recommendedBump);
  }, [baselineDoc.semver, diffReport.recommendedBump]);

  // Handlers
  const handleApprove = async () => {
    try {
      const record = await uastDraftService.approveAndPublish(currentDocument.documentId);
      setActionDoneMsg(`تم اعتماد الإصدار v${record.semver} ونشره رسمياً في الكتالوج المعتمد ✔️`);
      if (onApproveVersion) {
        onApproveVersion({
          ...currentDocument,
          semver: record.semver,
          status: 'PUBLISHED',
          publishedVersionId: record.versionId
        });
      }
    } catch (e: any) {
      setFloatingAlert({
        isOpen: true,
        type: 'error',
        title: 'فشل اعتماد الإصدار في الكتالوج',
        message: `تعذر إتمام عملية الاعتماد وتجميد النسخة في السجل الرسمي: ${e.message}`,
        codeSnippet: e.message,
        confirmText: 'إغلاق ومراجعة التوثيق'
      });
    }
  };

  const handleRequestChanges = async () => {
    if (!checkerNote.trim()) {
      setFloatingAlert({
        isOpen: true,
        type: 'warning',
        title: 'ملاحظة التوجيه الرقابي مطلوبة',
        message: 'يرجى كتابة سبب طلب التعديل أو الملاحظة التوجيهية في الحقل المخصص لتبرير إعادة المسودة للمطور.',
        confirmText: 'حسناً، سأكتب الملاحظة'
      });
      return;
    }
    try {
      await uastDraftService.requestChanges(currentDocument.documentId, checkerNote);
      setActionDoneMsg('تمت إعادة المسودة للموظف مع الملاحظات الرقابية بنجاح ↩️');
    } catch (e: any) {
      setFloatingAlert({
        isOpen: true,
        type: 'error',
        title: 'فشل إرسال طلب التعديل',
        message: `تعذر إعادة المسودة للمطور: ${e.message}`,
        codeSnippet: e.message,
        confirmText: 'إغلاق'
      });
    }
  };

  return (
    <div className="diff-view-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* ── TOP BAR ── */}
      <header className="diff-view-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="btn btn-ghost" 
            onClick={onClose}
            title="العودة للاستوديو"
          >
            <ArrowRight size={16} />
            <span>العودة للمحرر</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitCompare size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              لوحة فحص الفروقات واكتشاف التغييرات الكاسرة (Semantic AST Diff)
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="diff-compare-tag">
            <span style={{ color: 'var(--text-dim)' }}>المقارنة بين:</span>
            <span className="badge-tag-btn">الإصدار المعتمد v{baselineDoc.semver}</span>
            <span>➔</span>
            <span className="badge-tag-btn" style={{ borderColor: 'var(--cyan)' }}>
              مسودة العمل الحالية v{currentDocument.semver}
            </span>
          </div>

          <div className={`diff-bump-badge bump-${diffReport.recommendedBump.toLowerCase()}`}>
            <span>الترقية الموصى بها:</span>
            <strong>{diffReport.recommendedBump} (v{nextSemver})</strong>
          </div>
        </div>
      </header>

      {/* ── ACTION NOTIFICATION BANNER ── */}
      {actionDoneMsg && (
        <div className="diff-alert-banner success">
          <CheckCircle2 size={18} color="var(--emerald)" />
          <span>{actionDoneMsg}</span>
        </div>
      )}

      {/* ── BREAKING CHANGE WARNING BANNER ── */}
      <div className={`diff-alert-banner ${diffReport.hasBreakingChanges ? 'warning' : 'safe'}`}>
        {diffReport.hasBreakingChanges ? (
          <>
            <ShieldAlert size={22} color="var(--rose)" />
            <div>
              <strong style={{ color: 'var(--rose)', display: 'block', fontSize: '0.92rem' }}>
                ⚠️ تحذير رقابي: تم اكتشاف تغييرات كاسرة للتوافق (Breaking Changes)!
              </strong>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {diffReport.summary} يتطلب هذا التغيير ترقية الإصدار الرئيسي (Major Bump) وإشعار المطورين الخارجيين بمهلة انتقال.
              </p>
            </div>
          </>
        ) : (
          <>
            <ShieldCheck size={22} color="var(--emerald)" />
            <div>
              <strong style={{ color: 'var(--emerald)', display: 'block', fontSize: '0.92rem' }}>
                ✔️ توافق رجعي كامل (Backward Compatible)
              </strong>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {diffReport.summary}
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── DIFF ITEMS BREAKDOWN ── */}
      <div className="diff-breakdown-grid">
        <div className="diff-list-card">
          <div className="diff-list-header">
            <span>سجل التغييرات المفصلة في الشجرة ({diffReport.diffs.length}):</span>
          </div>

          {diffReport.diffs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
              لا توجد أي فروقات بين المسودة والإصدار المعتمد السابق.
            </div>
          ) : (
            <div className="diff-items-stack">
              {diffReport.diffs.map((item, index) => (
                <div 
                  key={index} 
                  className={`diff-item-row diff-type-${item.changeType.toLowerCase()} ${item.isBreaking ? 'is-breaking' : ''}`}
                >
                  <div className="diff-item-left">
                    {item.changeType === 'DELETED' && <XCircle size={16} color="var(--rose)" />}
                    {item.changeType === 'ADDED' && <PlusCircle size={16} color="var(--emerald)" />}
                    {item.changeType === 'MODIFIED' && <Edit3 size={16} color="var(--amber)" />}

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="diff-item-path" dir="ltr">{item.path}</span>
                        {item.isBreaking && (
                          <span className="badge-breaking-tag">كاسر للتوافق (Breaking)</span>
                        )}
                      </div>
                      <p className="diff-item-desc">{item.description}</p>
                    </div>
                  </div>

                  <div className="diff-item-values" dir="ltr">
                    {item.oldValue && (
                      <span className="diff-val-old">- {item.oldValue}</span>
                    )}
                    {item.newValue && (
                      <span className="diff-val-new">+ {item.newValue}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── CHECKER DECISION & ANNOTATIONS CARD ── */}
        <div className="diff-governance-card">
          <div className="governance-card-title">
            <MessageSquare size={16} />
            <span>قرار المشرف والملاحظات الرقابية</span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: '0 0 10px' }}>
            بصفتك المشرف الرقابي (Checker)، يمكنك كتابة توجيهات للموظف لإعادة ضبط المسودة، أو اعتمادها وترقيتها للإصدار المستهدف.
          </p>

          <textarea
            className="checker-feedback-textarea"
            value={checkerNote}
            onChange={(e) => setCheckerNote(e.target.value)}
            placeholder="اكتب ملاحظاتك على الحقول هنا في حال طلب تعديلات (مثلاً: حقل الآيبان يجب أن يكون بطول 22 خانة)..."
          />

          <div className="governance-actions-row">
            <button 
              className="btn btn-rose"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={handleRequestChanges}
              title="إعادة المسودة للموظف مع كتابة الملاحظات"
            >
              <XCircle size={14} />
              <span>إرجاع مع ملاحظات</span>
            </button>

            <button 
              className="btn btn-emerald"
              style={{ flex: 1.5, justifyContent: 'center' }}
              onClick={handleApprove}
              title="اعتماد الإصدار وتجميد النسخة في الكتالوج"
            >
              <FileCheck size={14} />
              <span>اعتماد ونشر v{nextSemver} ✔️</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Alert Modal */}
      <FloatingAlertCard
        alert={floatingAlert}
        onClose={() => setFloatingAlert(null)}
      />
    </div>
  );
};
