import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  X,
  Filter,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  RefreshCw,
  Copy,
  Check,
  RotateCcw,
  Globe,
  FileSpreadsheet,
  Code2,
  ExternalLink
} from 'lucide-react';
import { AuditLog } from '../../types/auth';
import { useLanguage } from '../../i18n';

export interface SecurityAuditTrailViewProps {
  logs: AuditLog[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onNotify?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

type StatusFilter = 'ALL' | 'SUCCESS' | 'DENIED' | 'FAILED';
type TimeRangeFilter = 'ALL' | 'TODAY' | '24H' | '7D' | '30D';

export const SecurityAuditTrailView: React.FC<SecurityAuditTrailViewProps> = ({
  logs,
  isLoading = false,
  onRefresh,
  onNotify
}) => {
  const { isRtl } = useLanguage();

  // ── Filters State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [actorFilter, setActorFilter] = useState<string>('ALL');
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>('ALL');

  // ── Pagination State ──
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [jumpPageInput, setJumpPageInput] = useState('');

  // ── Expanded Row (Inline Inspector) ──
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ── Extract Unique Actions & Actors for Filter Dropdowns ──
  const uniqueActions = useMemo(() => {
    const actions = Array.from(new Set(logs.map(l => l.action).filter(Boolean)));
    return actions.sort();
  }, [logs]);

  const uniqueActors = useMemo(() => {
    const actors = Array.from(new Set(logs.map(l => l.username).filter(Boolean)));
    return actors.sort();
  }, [logs]);

  // ── Calculate Status Counts for Badges ──
  const statusCounts = useMemo(() => {
    const counts = { ALL: logs.length, SUCCESS: 0, DENIED: 0, FAILED: 0 };
    logs.forEach(l => {
      if (l.status === 'SUCCESS') counts.SUCCESS++;
      else if (l.status === 'DENIED') counts.DENIED++;
      else if (l.status === 'FAILED') counts.FAILED++;
    });
    return counts;
  }, [logs]);

  // ── Reset Filters ──
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setActionFilter('ALL');
    setActorFilter('ALL');
    setTimeRangeFilter('ALL');
    setCurrentPage(1);
  }, []);

  const isFilterActive = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      statusFilter !== 'ALL' ||
      actionFilter !== 'ALL' ||
      actorFilter !== 'ALL' ||
      timeRangeFilter !== 'ALL'
    );
  }, [searchQuery, statusFilter, actionFilter, actorFilter, timeRangeFilter]);

  // ── Filtering Logic ──
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const q = searchQuery.trim().toLowerCase();

    return logs.filter(log => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && log.status !== statusFilter) {
        return false;
      }

      // 2. Action Filter
      if (actionFilter !== 'ALL' && log.action !== actionFilter) {
        return false;
      }

      // 3. Actor Filter
      if (actorFilter !== 'ALL' && log.username !== actorFilter) {
        return false;
      }

      // 4. Time Range Filter
      if (timeRangeFilter !== 'ALL') {
        const logTime = new Date(log.timestamp).getTime();
        if (isNaN(logTime)) return true;

        if (timeRangeFilter === 'TODAY') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          if (logTime < startOfToday.getTime()) return false;
        } else if (timeRangeFilter === '24H') {
          if (logTime < now - 24 * 60 * 60 * 1000) return false;
        } else if (timeRangeFilter === '7D') {
          if (logTime < now - 7 * 24 * 60 * 60 * 1000) return false;
        } else if (timeRangeFilter === '30D') {
          if (logTime < now - 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      // 5. Search Query across all fields
      if (q) {
        const matchUser = log.username?.toLowerCase().includes(q);
        const matchUserId = log.userId?.toLowerCase().includes(q);
        const matchAction = log.action?.toLowerCase().includes(q);
        const matchResource = log.resource?.toLowerCase().includes(q);
        const matchDetails = log.details?.toLowerCase().includes(q);
        const matchIp = log.ip?.toLowerCase().includes(q);
        const matchId = log.id?.toLowerCase().includes(q);
        const matchStatus = log.status?.toLowerCase().includes(q);

        if (!matchUser && !matchUserId && !matchAction && !matchResource && !matchDetails && !matchIp && !matchId && !matchStatus) {
          return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, statusFilter, actionFilter, actorFilter, timeRangeFilter]);

  // ── Pagination Calculation ──
  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Auto clamp currentPage if exceeds totalPages
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedLogs = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredLogs.slice(startIndex, startIndex + pageSize);
  }, [filteredLogs, validCurrentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setExpandedLogId(null);
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      handlePageChange(p);
      setJumpPageInput('');
    }
  };

  // ── Clipboard Copy Helper ──
  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ── Export Filtered Logs to CSV ──
  const handleExportCsv = () => {
    try {
      const headers = ['ID', 'Timestamp', 'Actor', 'UserId', 'Action', 'Resource', 'Status', 'IP', 'Details'];
      const rows = filteredLogs.map(l => [
        `"${(l.id || '').replace(/"/g, '""')}"`,
        `"${(l.timestamp || '').replace(/"/g, '""')}"`,
        `"${(l.username || '').replace(/"/g, '""')}"`,
        `"${(l.userId || '').replace(/"/g, '""')}"`,
        `"${(l.action || '').replace(/"/g, '""')}"`,
        `"${(l.resource || '').replace(/"/g, '""')}"`,
        `"${(l.status || '').replace(/"/g, '""')}"`,
        `"${(l.ip || '').replace(/"/g, '""')}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `security_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (onNotify) {
        onNotify(
          isRtl ? 'تم التصدير' : 'Export Complete',
          isRtl ? `تم تصدير ${filteredLogs.length} سجل بنجاح إلى ملف CSV` : `Exported ${filteredLogs.length} logs to CSV.`,
          'success'
        );
      }
    } catch {
      if (onNotify) {
        onNotify(isRtl ? 'خطأ' : 'Error', isRtl ? 'فشل تصدير ملف CSV' : 'Failed to export CSV file.', 'error');
      }
    }
  };

  // ── Export Filtered Logs to JSON ──
  const handleExportJson = () => {
    try {
      const jsonStr = JSON.stringify(filteredLogs, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `security_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (onNotify) {
        onNotify(
          isRtl ? 'تم التصدير' : 'Export Complete',
          isRtl ? `تم تصدير ${filteredLogs.length} سجل بنجاح إلى JSON` : `Exported ${filteredLogs.length} logs to JSON.`,
          'success'
        );
      }
    } catch {
      if (onNotify) {
        onNotify(isRtl ? 'خطأ' : 'Error', isRtl ? 'فشل تصدير ملف JSON' : 'Failed to export JSON file.', 'error');
      }
    }
  };

  // ── Render Pagination Window ──
  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (validCurrentPage > 3) {
        pages.push('...');
      }
      const start = Math.max(2, validCurrentPage - 1);
      const end = Math.min(totalPages - 1, validCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (validCurrentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return pages.map((page, idx) => {
      if (typeof page === 'string') {
        return (
          <span
            key={`ellipsis-${idx}`}
            style={{
              padding: '0.35rem 0.6rem',
              color: 'var(--text-dim, #94a3b8)',
              fontSize: '0.82rem',
              userSelect: 'none'
            }}
          >
            ...
          </span>
        );
      }

      const isActive = page === validCurrentPage;
      return (
        <button
          key={`page-${page}`}
          onClick={() => handlePageChange(page)}
          style={{
            minWidth: '34px',
            height: '34px',
            padding: '0 0.5rem',
            borderRadius: '6px',
            border: isActive ? '1px solid #10b981' : '1px solid var(--border, rgba(255, 255, 255, 0.1))',
            background: isActive ? '#10b981' : 'var(--overlay-subtle, rgba(255, 255, 255, 0.04))',
            color: isActive ? '#ffffff' : 'var(--text-main, #e2e8f0)',
            fontWeight: isActive ? 800 : 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          {page}
        </button>
      );
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 195px)',
        minHeight: '620px',
        maxHeight: 'calc(100vh - 170px)',
        background: 'var(--bg-card, #1c2b3e)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28)',
        direction: isRtl ? 'rtl' : 'ltr'
      }}
    >
      {/* ── 1. OFFICIAL TOOLBAR & CONTROLS BAR ── */}
      <div
        style={{
          padding: '1rem 1.25rem',
          background: 'var(--bg-subtle, rgba(24, 38, 59, 0.95))',
          borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          flexShrink: 0
        }}
      >
        {/* Upper Row: Search Box & Actions (Export, Refresh) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          {/* Official Clean Search Input */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 320px',
              maxWidth: '520px'
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                [isRtl ? 'right' : 'left']: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: searchQuery ? '#38bdf8' : '#94a3b8',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={isRtl ? 'بحث في المستخدمين، العمليات، المسار، الـ IP، أو المعرف...' : 'Search actors, actions, resources, IPs, or IDs...'}
              style={{
                width: '100%',
                padding: isRtl ? '0.55rem 2.4rem 0.55rem 2.4rem' : '0.55rem 2.4rem 0.55rem 2.4rem',
                fontSize: '0.84rem',
                fontFamily: 'inherit',
                borderRadius: '8px',
                border: searchQuery ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid var(--border, rgba(255, 255, 255, 0.12))',
                background: 'var(--bg-input, rgba(15, 23, 42, 0.65))',
                color: 'var(--text-main, #ffffff)',
                outline: 'none',
                boxShadow: searchQuery ? '0 0 0 2px rgba(56, 189, 248, 0.15)' : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                title={isRtl ? 'مسح البحث' : 'Clear search'}
                style={{
                  position: 'absolute',
                  [isRtl ? 'left' : 'right']: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px',
                  borderRadius: '4px'
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Right Action Buttons: Refresh, CSV Export, JSON Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Active Filters Clear Button */}
            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '7px',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  background: 'rgba(244, 63, 94, 0.10)',
                  color: '#f87171',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <RotateCcw size={13} />
                <span>{isRtl ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}</span>
              </button>
            )}

            {/* Export CSV */}
            <button
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              title={isRtl ? 'تصدير السجلات الحالية إلى ملف CSV' : 'Export current logs to CSV'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '7px',
                border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
                background: 'var(--overlay-subtle, rgba(255, 255, 255, 0.05))',
                color: 'var(--text-main, #e2e8f0)',
                fontSize: '0.80rem',
                fontWeight: 600,
                cursor: filteredLogs.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filteredLogs.length === 0 ? 0.5 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              <FileSpreadsheet size={14} style={{ color: '#10b981' }} />
              <span>{isRtl ? 'تصدير CSV' : 'Export CSV'}</span>
            </button>

            {/* Export JSON */}
            <button
              onClick={handleExportJson}
              disabled={filteredLogs.length === 0}
              title={isRtl ? 'تصدير السجلات الحالية إلى JSON' : 'Export current logs to JSON'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '7px',
                border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
                background: 'var(--overlay-subtle, rgba(255, 255, 255, 0.05))',
                color: 'var(--text-main, #e2e8f0)',
                fontSize: '0.80rem',
                fontWeight: 600,
                cursor: filteredLogs.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filteredLogs.length === 0 ? 0.5 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              <Code2 size={14} style={{ color: '#38bdf8' }} />
              <span>{isRtl ? 'تصدير JSON' : 'Export JSON'}</span>
            </button>

            {/* Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                title={isRtl ? 'تحديث السجلات الآن' : 'Refresh logs now'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '7px',
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
                  background: 'var(--overlay-subtle, rgba(255, 255, 255, 0.05))',
                  color: 'var(--text-main, #e2e8f0)',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <RefreshCw size={14} className={isLoading ? 'spin-smooth' : ''} style={{ color: '#10b981' }} />
                <span>{isRtl ? 'تحديث' : 'Refresh'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Lower Row: Precise Filters (Status Pills, Action Selector, Actor Selector, Time Selector) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          {/* Status Segmented Buttons */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-input, rgba(15, 23, 42, 0.65))',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
              gap: '2px'
            }}
          >
            {(
              [
                { key: 'ALL', labelAr: 'الكل', labelEn: 'All', count: statusCounts.ALL, color: '#e2e8f0' },
                { key: 'SUCCESS', labelAr: 'مقبولة', labelEn: 'Success', count: statusCounts.SUCCESS, color: '#34d399' },
                { key: 'DENIED', labelAr: 'مرفوضة', labelEn: 'Denied', count: statusCounts.DENIED, color: '#f87171' },
                { key: 'FAILED', labelAr: 'فاشلة', labelEn: 'Failed', count: statusCounts.FAILED, color: '#fbbf24' }
              ] as const
            ).map(tab => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setCurrentPage(1);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: active ? 'var(--overlay-hover, rgba(255, 255, 255, 0.12))' : 'transparent',
                    color: active ? 'var(--text-main, #ffffff)' : 'var(--text-dim, #94a3b8)',
                    fontSize: '0.80rem',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ color: active ? tab.color : 'inherit' }}>{isRtl ? tab.labelAr : tab.labelEn}</span>
                  <span
                    style={{
                      fontSize: '0.70rem',
                      fontFamily: 'monospace',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px',
                      background: active ? 'var(--overlay-hover, rgba(255, 255, 255, 0.15))' : 'var(--overlay-subtle, rgba(255, 255, 255, 0.05))',
                      color: active ? tab.color : 'var(--text-dim, #94a3b8)'
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dropdown Filters: Time, Action, Actor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {/* Time Range Selector */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <Clock size={13} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '0.65rem', color: '#94a3b8', pointerEvents: 'none' }} />
              <select
                value={timeRangeFilter}
                onChange={e => {
                  setTimeRangeFilter(e.target.value as TimeRangeFilter);
                  setCurrentPage(1);
                }}
                style={{
                  padding: isRtl ? '0.4rem 1.8rem 0.4rem 0.65rem' : '0.4rem 0.65rem 0.4rem 1.8rem',
                  fontSize: '0.80rem',
                  borderRadius: '7px',
                  border: timeRangeFilter !== 'ALL' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border, rgba(255, 255, 255, 0.10))',
                  background: 'var(--bg-input, rgba(15, 23, 42, 0.7))',
                  color: timeRangeFilter !== 'ALL' ? '#38bdf8' : 'var(--text-main, #e2e8f0)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">{isRtl ? 'كافة الفترات' : 'All Time'}</option>
                <option value="TODAY">{isRtl ? 'اليوم فقط' : 'Today Only'}</option>
                <option value="24H">{isRtl ? 'آخر 24 ساعة' : 'Last 24 Hours'}</option>
                <option value="7D">{isRtl ? 'آخر 7 أيام' : 'Last 7 Days'}</option>
                <option value="30D">{isRtl ? 'آخر 30 يوماً' : 'Last 30 Days'}</option>
              </select>
            </div>

            {/* Action Type Selector */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <Filter size={13} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '0.65rem', color: '#94a3b8', pointerEvents: 'none' }} />
              <select
                value={actionFilter}
                onChange={e => {
                  setActionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: isRtl ? '0.4rem 1.8rem 0.4rem 0.65rem' : '0.4rem 0.65rem 0.4rem 1.8rem',
                  fontSize: '0.80rem',
                  borderRadius: '7px',
                  border: actionFilter !== 'ALL' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border, rgba(255, 255, 255, 0.10))',
                  background: 'var(--bg-input, rgba(15, 23, 42, 0.7))',
                  color: actionFilter !== 'ALL' ? '#38bdf8' : 'var(--text-main, #e2e8f0)',
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '180px'
                }}
              >
                <option value="ALL">{isRtl ? 'كافة العمليات' : 'All Actions'}</option>
                {uniqueActions.map(act => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            {/* Actor (User) Selector */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <User size={13} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '0.65rem', color: '#94a3b8', pointerEvents: 'none' }} />
              <select
                value={actorFilter}
                onChange={e => {
                  setActorFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: isRtl ? '0.4rem 1.8rem 0.4rem 0.65rem' : '0.4rem 0.65rem 0.4rem 1.8rem',
                  fontSize: '0.80rem',
                  borderRadius: '7px',
                  border: actorFilter !== 'ALL' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border, rgba(255, 255, 255, 0.10))',
                  background: 'var(--bg-input, rgba(15, 23, 42, 0.7))',
                  color: actorFilter !== 'ALL' ? '#38bdf8' : 'var(--text-main, #e2e8f0)',
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '160px'
                }}
              >
                <option value="ALL">{isRtl ? 'كافة المستخدمين' : 'All Actors'}</option>
                {uniqueActors.map(usr => (
                  <option key={usr} value={usr}>
                    @{usr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. SCROLLABLE OFFICIAL TABLE CONTAINER (Strictly contained, no page runaway) ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'auto',
          position: 'relative'
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            textAlign: isRtl ? 'right' : 'left'
          }}
        >
          {/* Sticky Header */}
          <thead
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'var(--table-header-bg, #1a293e)',
              boxShadow: '0 1px 0 var(--border, rgba(255, 255, 255, 0.08))'
            }}
          >
            <tr>
              <th style={{ padding: '0.80rem 1.25rem', fontSize: '0.80rem', fontWeight: 700, color: '#94a3b8', width: '180px' }}>
                {isRtl ? 'التوقيت' : 'Timestamp'}
              </th>
              <th style={{ padding: '0.80rem 1.25rem', fontSize: '0.80rem', fontWeight: 700, color: '#94a3b8', width: '160px' }}>
                {isRtl ? 'المستخدم' : 'Actor'}
              </th>
              <th style={{ padding: '0.80rem 1.25rem', fontSize: '0.80rem', fontWeight: 700, color: '#94a3b8', width: '180px' }}>
                {isRtl ? 'العملية' : 'Action'}
              </th>
              <th style={{ padding: '0.80rem 1.25rem', fontSize: '0.80rem', fontWeight: 700, color: '#94a3b8', width: '120px' }}>
                {isRtl ? 'النتيجة' : 'Result'}
              </th>
              <th style={{ padding: '0.80rem 1.25rem', fontSize: '0.80rem', fontWeight: 700, color: '#94a3b8' }}>
                {isRtl ? 'المسار والتفاصيل' : 'Resource & Details'}
              </th>
              <th style={{ padding: '0.80rem 1.25rem', fontSize: '0.80rem', fontWeight: 700, color: '#94a3b8', width: '120px', textAlign: 'center' }}>
                {isRtl ? 'عنوان IP' : 'Client IP'}
              </th>
              <th style={{ padding: '0.80rem 1.25rem', fontSize: '0.80rem', fontWeight: 700, color: '#94a3b8', width: '70px', textAlign: 'center' }}>
                {isRtl ? 'الفحص' : 'Inspect'}
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '4rem 1.5rem',
                    textAlign: 'center',
                    color: '#94a3b8'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <ShieldAlert size={36} style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
                    <span style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                      {isRtl ? 'لا توجد سجلات أمنية مطابقة لمعايير البحث الحالية' : 'No audit records match the current filter criteria.'}
                    </span>
                    {isFilterActive && (
                      <button
                        onClick={handleResetFilters}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.4rem 0.9rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#38bdf8',
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        {isRtl ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedLogs.map(log => {
                const dateObj = new Date(log.timestamp);
                const isValidDate = !isNaN(dateObj.getTime());
                const dateStr = isValidDate ? dateObj.toLocaleDateString(isRtl ? 'ar-SA' : 'en-US') : log.timestamp;
                const timeStr = isValidDate
                  ? dateObj.toLocaleTimeString(isRtl ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : '';
                const isExpanded = expandedLogId === log.id;

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isExpanded ? 'rgba(56, 189, 248, 0.06)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        if (!isExpanded) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                      }}
                      onMouseLeave={e => {
                        if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Timestamp */}
                      <td style={{ padding: '0.75rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.80rem', color: 'var(--text-main, #ffffff)', fontFamily: 'monospace', fontWeight: 600 }}>
                          {timeStr}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {dateStr}
                        </div>
                      </td>

                      {/* Actor */}
                      <td style={{ padding: '0.75rem 1.25rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: 'var(--text-main, #ffffff)',
                              fontSize: '0.84rem'
                            }}
                          >
                            @{log.username}
                          </span>
                        </div>
                        {log.userId && (
                          <div style={{ fontSize: '0.70rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                            {log.userId}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.75rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '5px',
                            background: 'rgba(99, 102, 241, 0.12)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            fontSize: '0.78rem',
                            fontFamily: 'monospace',
                            color: '#93c5fd',
                            fontWeight: 600
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Result / Status */}
                      <td style={{ padding: '0.75rem 1.25rem' }}>
                        {log.status === 'SUCCESS' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: '#34d399',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              borderRadius: '4px'
                            }}
                          >
                            <ShieldCheck size={12} />
                            <span>{isRtl ? 'مقبولة' : 'SUCCESS'}</span>
                          </span>
                        ) : log.status === 'DENIED' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: '#f87171',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              background: 'rgba(244, 63, 94, 0.12)',
                              border: '1px solid rgba(244, 63, 94, 0.25)',
                              borderRadius: '4px'
                            }}
                          >
                            <ShieldAlert size={12} />
                            <span>{isRtl ? 'مرفوضة' : 'DENIED'}</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: '#fbbf24',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              background: 'rgba(245, 158, 11, 0.12)',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                              borderRadius: '4px'
                            }}
                          >
                            <AlertTriangle size={12} />
                            <span>{log.status || (isRtl ? 'فاشلة' : 'FAILED')}</span>
                          </span>
                        )}
                      </td>

                      {/* Resource & Details */}
                      <td style={{ padding: '0.75rem 1.25rem', maxWidth: '380px' }}>
                        <div
                          style={{
                            fontSize: '0.80rem',
                            color: '#e2e8f0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={log.details || log.resource}
                        >
                          {log.details || log.resource}
                        </div>
                        {log.details && log.resource && log.details !== log.resource && (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: '#94a3b8',
                              fontFamily: 'monospace',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: '2px'
                            }}
                          >
                            {log.resource}
                          </div>
                        )}
                      </td>

                      {/* Client IP */}
                      <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: '0.76rem',
                            fontFamily: 'monospace',
                            color: '#94a3b8',
                            background: 'rgba(255, 255, 255, 0.04)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px'
                          }}
                        >
                          {log.ip || '127.0.0.1'}
                        </span>
                      </td>

                      {/* Expand / Inspect Trigger */}
                      <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setExpandedLogId(isExpanded ? null : log.id);
                          }}
                          title={isExpanded ? (isRtl ? 'إغلاق التفاصيل' : 'Close details') : (isRtl ? 'عرض التفاصيل السيادية' : 'View Sovereign details')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isExpanded ? '#38bdf8' : '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.15s ease'
                          }}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>

                    {/* ── EXPANDED ROW (IN-PLACE INSPECTOR - No disruptive modals) ── */}
                    {isExpanded && (
                      <tr style={{ background: 'var(--overlay-subtle, rgba(15, 23, 42, 0.55))', borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))' }}>
                        <td colSpan={7} style={{ padding: '1.25rem 1.5rem' }}>
                          <div
                            style={{
                              background: 'var(--bg-card-hover, #162238)',
                              border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
                              borderRadius: '8px',
                              padding: '1rem 1.25rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#38bdf8' }}>
                                  {isRtl ? 'تفاصيل السجل الرقابي المعتمد' : 'Sovereign Audit Record Details'}
                                </span>
                                <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                  ID: {log.id}
                                </span>
                              </div>
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(log, null, 2), `json-${log.id}`)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '5px',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  color: copiedField === `json-${log.id}` ? '#10b981' : '#e2e8f0',
                                  fontSize: '0.74rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {copiedField === `json-${log.id}` ? <Check size={12} /> : <Copy size={12} />}
                                <span>{copiedField === `json-${log.id}` ? (isRtl ? 'تم النسخ' : 'Copied!') : (isRtl ? 'نسخ JSON' : 'Copy JSON')}</span>
                              </button>
                            </div>

                            {/* Metadata Grid */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '0.75rem',
                                marginBottom: '0.85rem',
                                fontSize: '0.80rem'
                              }}
                            >
                              <div>
                                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>{isRtl ? 'التوقيت الدقيق (ISO)' : 'Exact ISO Timestamp'}</span>
                                <span style={{ color: 'var(--text-main, #ffffff)', fontFamily: 'monospace' }}>{log.timestamp}</span>
                              </div>
                              <div>
                                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>{isRtl ? 'معرف المستخدم (Actor ID)' : 'Actor User ID'}</span>
                                <span style={{ color: 'var(--text-main, #ffffff)', fontFamily: 'monospace' }}>{log.userId || 'N/A'}</span>
                              </div>
                              <div>
                                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>{isRtl ? 'المورد المستهدف (Resource)' : 'Target Resource'}</span>
                                <span style={{ color: 'var(--text-main, #ffffff)', fontFamily: 'monospace' }}>{log.resource || 'N/A'}</span>
                              </div>
                              <div>
                                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>{isRtl ? 'عنوان IP المصدر' : 'Source IP'}</span>
                                <span style={{ color: 'var(--text-main, #ffffff)', fontFamily: 'monospace' }}>{log.ip || '127.0.0.1'}</span>
                              </div>
                            </div>

                            {/* Details description */}
                            {log.details && (
                              <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.85rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '6px' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block', marginBottom: '2px' }}>
                                  {isRtl ? 'البيان والرسالة التشغيلية:' : 'Operational Statement:'}
                                </span>
                                <span style={{ color: '#e2e8f0', fontSize: '0.82rem' }}>
                                  {log.details}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── 3. OFFICIAL PAGINATION BAR (Pinned at bottom, no runaway) ── */}
      <div
        style={{
          padding: '0.75rem 1.25rem',
          background: 'var(--bg-subtle, rgba(24, 38, 59, 0.98))',
          borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          flexShrink: 0
        }}
      >
        {/* Left Side: Records Counter & Page Size Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            {totalItems === 0 ? (
              <span>{isRtl ? '0 سجل' : '0 entries'}</span>
            ) : (
              <span>
                {isRtl
                  ? `عرض ${((validCurrentPage - 1) * pageSize) + 1} - ${Math.min(validCurrentPage * pageSize, totalItems)} من أصل ${totalItems} سجل`
                  : `Showing ${((validCurrentPage - 1) * pageSize) + 1} - ${Math.min(validCurrentPage * pageSize, totalItems)} of ${totalItems} entries`}
              </span>
            )}
          </div>

          {/* Page Size Selector */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.80rem', color: '#94a3b8' }}>
            <span>{isRtl ? 'لكل صفحة:' : 'Per page:'}</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.80rem',
                borderRadius: '6px',
                border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
                background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                color: 'var(--text-main, #ffffff)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Right Side: Page Navigation Buttons & Jump to Page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {/* First Page Button */}
          <button
            onClick={() => handlePageChange(1)}
            disabled={validCurrentPage <= 1}
            title={isRtl ? 'الصفحة الأولى' : 'First page'}
            style={{
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: validCurrentPage <= 1 ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
              cursor: validCurrentPage <= 1 ? 'not-allowed' : 'pointer'
            }}
          >
            {isRtl ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
          </button>

          {/* Previous Page Button */}
          <button
            onClick={() => handlePageChange(validCurrentPage - 1)}
            disabled={validCurrentPage <= 1}
            title={isRtl ? 'الصفحة السابقة' : 'Previous page'}
            style={{
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: validCurrentPage <= 1 ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
              cursor: validCurrentPage <= 1 ? 'not-allowed' : 'pointer'
            }}
          >
            {isRtl ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>

          {/* Page Numbers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {renderPageNumbers()}
          </div>

          {/* Next Page Button */}
          <button
            onClick={() => handlePageChange(validCurrentPage + 1)}
            disabled={validCurrentPage >= totalPages}
            title={isRtl ? 'الصفحة التالية' : 'Next page'}
            style={{
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: validCurrentPage >= totalPages ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
              cursor: validCurrentPage >= totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            {isRtl ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </button>

          {/* Last Page Button */}
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={validCurrentPage >= totalPages}
            title={isRtl ? 'الصفحة الأخيرة' : 'Last page'}
            style={{
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: validCurrentPage >= totalPages ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
              cursor: validCurrentPage >= totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            {isRtl ? <ChevronsLeft size={15} /> : <ChevronsRight size={15} />}
          </button>

          {/* Jump to Page Form if pages > 3 */}
          {totalPages > 3 && (
            <form onSubmit={handleJumpSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginInlineStart: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{isRtl ? 'انتقال:' : 'Go:'}</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPageInput}
                onChange={e => setJumpPageInput(e.target.value)}
                placeholder={`${validCurrentPage}`}
                style={{
                  width: '45px',
                  padding: '0.2rem 0.35rem',
                  fontSize: '0.80rem',
                  textAlign: 'center',
                  borderRadius: '5px',
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
                  background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                  color: 'var(--text-main, #ffffff)',
                  outline: 'none'
                }}
              />
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
