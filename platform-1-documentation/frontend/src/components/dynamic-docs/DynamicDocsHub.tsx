import React, { useState, useEffect } from 'react';
import { DynamicDocument } from '../../types/dynamicDocs';
import { dynamicDocService } from '../../services/dynamicDocService';
import { DocumentStudio } from './DocumentStudio';
import { 
  FileText, 
  Plus, 
  Search, 
  Globe, 
  Printer, 
  Clock, 
  User, 
  Trash2, 
  ExternalLink, 
  Layers, 
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface DynamicDocsHubProps {
  onNotify?: (title: string, message: string, type: 'success' | 'info' | 'error') => void;
}

export const DynamicDocsHub: React.FC<DynamicDocsHubProps> = ({ onNotify }) => {
  const [documents, setDocuments] = useState<DynamicDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDocForEdit, setActiveDocForEdit] = useState<DynamicDocument | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Doc Form
  const [newTitle, setNewTitle] = useState('');
  const [newTemplate, setNewTemplate] = useState<'blank' | 'ips-transfer' | 'webhook'>('ips-transfer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const list = await dynamicDocService.getAll();
      setDocuments(list);
    } catch (err: any) {
      if (onNotify) onNotify('تنبيه', 'تعذر جلب الوثائق من الخادم، تم تفعيل النسخ الاحتياطية', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await dynamicDocService.create({
        title: newTitle.trim(),
        slug: newTitle.trim().toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        status: 'DRAFT'
      });

      setDocuments(prev => [created, ...prev]);
      setIsCreateModalOpen(false);
      setNewTitle('');
      setActiveDocForEdit(created);
      if (onNotify) onNotify('تم الإنشاء بنجاح', `تم إنشاء مسودة [${created.title}]`, 'success');
    } catch (err: any) {
      if (onNotify) onNotify('خطأ', err.message || 'فشل إنشاء الوثيقة', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`هل أنت متأكد من حذف وثيقة [${title}]؟`)) return;

    try {
      await dynamicDocService.delete(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (onNotify) onNotify('تم الحذف', `تمت إزالة الوثيقة بنجاح`, 'info');
    } catch (err: any) {
      if (onNotify) onNotify('خطأ', 'فشل حذف الوثيقة', 'error');
    }
  };

  const handleSaveFromStudio = async (updatedDoc: DynamicDocument) => {
    const saved = await dynamicDocService.update(updatedDoc.id, updatedDoc);
    setDocuments(prev => prev.map(d => (d.id === saved.id ? saved : d)));
    setActiveDocForEdit(saved);
  };

  const handlePublishFromStudio = async (docId: string) => {
    const published = await dynamicDocService.publish(docId);
    setDocuments(prev => prev.map(d => (d.id === published.id ? published : d)));
    setActiveDocForEdit(published);
    if (onNotify) onNotify('اعتماد رسمي', 'تم اعتماد ونشر الوثيقة وتجميد إصدارها في الكتالوج', 'success');
  };

  // If Studio is open, render DocumentStudio full screen
  if (activeDocForEdit) {
    return (
      <DocumentStudio
        initialDocument={activeDocForEdit}
        onBack={() => {
          setActiveDocForEdit(null);
          loadDocuments();
        }}
        onSave={handleSaveFromStudio}
        onPublish={handlePublishFromStudio}
      />
    );
  }

  // Filtered documents
  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="dynamic-docs-hub-container"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem 2.5rem',
        background: '#162238',
        color: '#f8fafc',
        overflowY: 'auto'
      }}
    >
      {/* 1. Sovereign Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.10)',
          paddingBottom: '1.25rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                padding: '0.4rem',
                borderRadius: '8px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(2, 132, 199, 0.3)'
              }}
            >
              <FileText size={20} />
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f8fafc', margin: 0 }}>
              التوثيق الديناميكي متعدد الأوضاع (Dynamic Docs Studio)
            </h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
            محرك موحد لإدارة وتصميم وثائق الـ APIs ذات المصدر الواحد، مع دعم العرض التفاعلي على الويب وطباعة A4 الرسمية.
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
            border: 'none',
            color: '#ffffff',
            padding: '0.65rem 1.35rem',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <Plus size={18} />
          <span>إنشاء وثيقة مواصفات جديدة</span>
        </button>
      </div>

      {/* 2. Search & Stats Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        <div style={{ position: 'relative', width: '360px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              right: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8'
            }}
          />
          <input
            type="text"
            placeholder="بحث بالاسم أو المعرف الرقمي..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 2.4rem 0.6rem 1rem',
              background: '#1c3250',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.82rem', color: '#cbd5e1' }}>
          <span>إجمالي الوثائق: <strong>{documents.length}</strong></span>
          <span>•</span>
          <span style={{ color: '#10b981' }}>
            المنشور والمعتمد: <strong>{documents.filter(d => d.status === 'PUBLISHED').length}</strong>
          </span>
          <span>•</span>
          <span style={{ color: '#f59e0b' }}>
            المسودات: <strong>{documents.filter(d => d.status === 'DRAFT').length}</strong>
          </span>
        </div>
      </div>

      {/* 3. Document Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
          جارٍ تحميل مكتبة الوثائق الديناميكية...
        </div>
      ) : filteredDocs.length === 0 ? (
        <div
          style={{
            background: '#243d5c',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '4rem 2rem',
            textAlign: 'center'
          }}
        >
          <FileText size={40} style={{ color: '#64748b', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
            لا توجد وثائق مطابقة
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            ابدأ بإنشاء أول وثيقة مواصفات موحدة متعددة الأوضاع بالضغط على الزر أدناه.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              background: '#0284c7',
              border: 'none',
              color: '#ffffff',
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            + إنشاء وثيقة جديدة
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.25rem'
          }}
        >
          {filteredDocs.map((docItem) => (
            <div
              key={docItem.id}
              onClick={() => setActiveDocForEdit(docItem)}
              style={{
                background: '#243d5c',
                border: '1px solid rgba(255, 255, 255, 0.10)',
                borderRadius: '10px',
                padding: '1.35rem',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#38bdf8';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.10)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                {/* Header row: Version + Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span
                      style={{
                        background: 'rgba(56, 189, 248, 0.12)',
                        color: '#38bdf8',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        border: '1px solid rgba(56, 189, 248, 0.25)'
                      }}
                    >
                      v{docItem.version}
                    </span>
                    <span
                      style={{
                        background: docItem.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        color: docItem.status === 'PUBLISHED' ? '#10b981' : '#f59e0b',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}
                    >
                      {docItem.status === 'PUBLISHED' ? 'منشور ومعتمد' : 'مسودة'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(docItem.id, docItem.title, e)}
                    title="حذف الوثيقة"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '0.2rem'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#f43f5e')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#f8fafc',
                    margin: '0 0 0.5rem 0',
                    lineHeight: 1.4
                  }}
                >
                  {docItem.title}
                </h3>

                {/* Slug */}
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontFamily: 'monospace', direction: 'ltr', textAlign: 'right', marginBottom: '0.85rem' }}>
                  {docItem.slug}
                </div>
              </div>

              {/* Footer info: Modes supported + Author + Date */}
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: '#94a3b8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: '#1c3250',
                        padding: '0.2rem 0.45rem',
                        borderRadius: '4px',
                        color: '#cbd5e1'
                      }}
                    >
                      <Globe size={12} color="#38bdf8" />
                      <span>ويب</span>
                    </span>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: '#1c3250',
                        padding: '0.2rem 0.45rem',
                        borderRadius: '4px',
                        color: '#cbd5e1'
                      }}
                    >
                      <Printer size={12} color="#10b981" />
                      <span>A4</span>
                    </span>
                  </div>

                  <span>{docItem.sections.length} أقسام</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.72rem', color: '#64748b' }}>
                  <span>بواسطة: {docItem.author.name}</span>
                  <span>{new Date(docItem.updatedAt).toLocaleDateString('ar-SA')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 4. CREATE NEW DOCUMENT MODAL ── */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            style={{
              background: '#243d5c',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '2rem',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
              إنشاء وثيقة مواصفات جديدة
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 1.5rem 0' }}>
              حدد اسم الوثيقة والنموذج الأولي للبدء في تحريرها عبر استوديو التوثيق الموحد.
            </p>

            <form onSubmit={handleCreateDocument}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  اسم الوثيقة أو المعيار:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: وثيقة واجهات المحافظ الرقمية v1.0"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: '#1c3250',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
                    padding: '0.55rem 1.15rem',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  style={{
                    background: '#0284c7',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.55rem 1.35rem',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: isSubmitting ? 'wait' : 'pointer'
                  }}
                >
                  {isSubmitting ? 'جارٍ الإنشاء...' : 'إنشاء والانتقال للمحرر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
