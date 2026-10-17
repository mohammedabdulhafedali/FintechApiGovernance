import React from 'react';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { useBreadcrumbs, BreadcrumbItem } from '../../context/BreadcrumbContext';
import { useLanguage } from '../../i18n';
import { AppViewMode } from './Sidebar';
import { SystemModule, SystemIntegration, Endpoint } from '../../types/schema';

interface HeaderBreadcrumbsProps {
  activeView?: AppViewMode;
  onBackToDashboard?: () => void;
  activeSystem?: SystemModule | null;
  activeIntegration?: SystemIntegration | null;
  activeEndpoint?: Endpoint | null;
}

export const HeaderBreadcrumbs: React.FC<HeaderBreadcrumbsProps> = ({
  activeView = 'dashboard',
  onBackToDashboard,
  activeSystem,
  activeIntegration,
  activeEndpoint
}) => {
  const { breadcrumbs } = useBreadcrumbs();
  const { isRtl } = useLanguage();

  const ArrowIcon = isRtl ? ArrowRight : ArrowLeft;

  // Resolve items: Custom from context takes top priority; fallback generates from active view hierarchy
  let resolvedItems: BreadcrumbItem[] = [];

  if (breadcrumbs && breadcrumbs.length > 0) {
    resolvedItems = breadcrumbs;
  } else {
    // Default system breadcrumbs fallback based on current application view
    switch (activeView) {
      case 'systems':
        resolvedItems = [
          {
            label: isRtl ? 'لوحة الأنظمة المركزية' : 'Core Systems Dashboard',
            onClick: onBackToDashboard
          },
          {
            label: isRtl ? 'إدارة الأنظمة' : 'Systems Management',
            isCurrent: true
          }
        ];
        break;

      case 'sectors':
        resolvedItems = [
          {
            label: isRtl ? 'لوحة الأنظمة المركزية' : 'Core Systems Dashboard',
            onClick: onBackToDashboard
          },
          {
            label: isRtl ? 'إدارة الجهات والقطاعات' : 'Entities & Sectors Management',
            isCurrent: true
          }
        ];
        break;

      case 'integrations':
        resolvedItems = [
          {
            label: isRtl ? 'لوحة الأنظمة المركزية' : 'Core Systems Dashboard',
            onClick: onBackToDashboard
          },
          {
            label: isRtl ? 'إدارة الربط والتكامل' : 'Integrations & Linking',
            isCurrent: true
          }
        ];
        break;

      case 'workbench':
      case 'add-api':
        resolvedItems = [
          {
            label: isRtl ? 'العودة للوحة الأنظمة' : 'Back to Systems',
            onClick: onBackToDashboard
          },
          {
            label: isRtl ? 'استوديو توثيق الـ APIs' : 'API Documentation Studio',
            isCurrent: true
          }
        ];
        break;

      case 'iam':
        resolvedItems = [
          {
            label: isRtl ? 'العودة للوحة الأنظمة' : 'Back to Systems',
            onClick: onBackToDashboard
          },
          {
            label: isRtl ? 'إدارة الهوية والصلاحيات (IAM)' : 'Identity & Access Management (IAM)',
            isCurrent: true
          }
        ];
        break;

      case 'documents-matrix':
        resolvedItems = [
          {
            label: isRtl ? 'العودة للوحة الأنظمة' : 'Back to Systems',
            onClick: onBackToDashboard
          },
          {
            label: isRtl ? 'إدارة وثائق الـ API ومساحات العمل' : 'API Documents Matrix',
            isCurrent: true
          }
        ];
        break;

      case 'governance':
        resolvedItems = [
          {
            label: isRtl ? 'العودة للوحة الأنظمة' : 'Back to Systems',
            onClick: onBackToDashboard
          },
          {
            label: isRtl ? 'مركز الاعتمادات والمرفوعات' : 'Approvals & Submissions Hub',
            isCurrent: true
          }
        ];
        break;

      case 'workflow-policies':
        resolvedItems = [
          {
            label: isRtl ? 'العودة للوحة الأنظمة' : 'Back to Systems',
            onClick: onBackToDashboard
          },
          {
            label: isRtl ? 'سياسات ومسارات الاعتماد' : 'Workflow & Approval Policies',
            isCurrent: true
          }
        ];
        break;

      case 'sector-spec': {
        const sysLabel = activeSystem?.name || (isRtl ? 'النظام' : 'System');
        const intLabel = activeIntegration?.name || (isRtl ? 'الجهة' : 'Entity');
        const epLabel = (activeEndpoint as any)?.summary || activeEndpoint?.shortName || activeEndpoint?.path || (isRtl ? 'الـ API' : 'Endpoint');

        resolvedItems = [
          {
            label: isRtl ? 'العودة للوحة الأنظمة' : 'Back to Systems',
            onClick: onBackToDashboard
          },
          {
            label: sysLabel,
            onClick: onBackToDashboard
          },
          {
            label: intLabel
          },
          {
            label: epLabel,
            isCurrent: true
          }
        ];
        break;
      }

      case 'dashboard':
      default:
        // On dashboard home root view, show subtle indicator or stay quiet
        resolvedItems = [
          {
            label: isRtl ? 'لوحة الأنظمة المركزية' : 'Core Systems Dashboard',
            isCurrent: true,
            icon: <Home size={13} style={{ opacity: 0.7 }} />
          }
        ];
        break;
    }
  }

  if (resolvedItems.length === 0) return null;

  return (
    <nav className="header-breadcrumbs-nav" aria-label="Breadcrumb">
      <ol className="header-breadcrumbs-list">
        {resolvedItems.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === resolvedItems.length - 1;
          const isCurrent = item.isCurrent ?? isLast;

          return (
            <li key={item.id || `${item.label}-${index}`} className="header-breadcrumb-item">
              {/* Optional Arrow for back actions or custom icon */}
              {isFirst && item.onClick && (
                <button
                  type="button"
                  className="breadcrumb-btn breadcrumb-back-btn"
                  onClick={item.onClick}
                  title={item.label}
                >
                  <ArrowIcon size={14} className="breadcrumb-arrow-icon" />
                  <span className="breadcrumb-label">{item.label}</span>
                </button>
              )}

              {/* Regular interactive item */}
              {!isFirst && !isCurrent && item.onClick && (
                <button
                  type="button"
                  className="breadcrumb-btn"
                  onClick={item.onClick}
                  title={item.label}
                >
                  {item.icon}
                  <span className="breadcrumb-label">{item.label}</span>
                </button>
              )}

              {/* Non-clickable intermediate item */}
              {(!item.onClick || (isFirst && !item.onClick && !isCurrent)) && !isCurrent && (
                <span className="breadcrumb-static-item">
                  {item.icon}
                  <span className="breadcrumb-label">{item.label}</span>
                </span>
              )}

              {/* Current active page indicator */}
              {isCurrent && (
                <span className="breadcrumb-current-item" aria-current="page">
                  {item.icon}
                  <span className="breadcrumb-current-label">{item.label}</span>
                </span>
              )}

              {/* Separator between items */}
              {!isLast && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
