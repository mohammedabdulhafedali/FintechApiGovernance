import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Endpoint } from '../../types/schema';
import { useLanguage } from '../../i18n';

interface EndpointsRibbonProps {
  endpoints: Array<{
    id?: string;
    path: string;
    shortName?: string;
    method?: string;
    desc?: string;
    descEn?: string;
    summary?: string;
    [key: string]: any;
  }>;
  activeEndpointIndex: number;
  onSelectEndpoint: (index: number) => void;
  systemName?: string;
  integrationName?: string;
  onAddNewEndpoint?: () => void;
  onAddApiForSector?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const EndpointsRibbon: React.FC<EndpointsRibbonProps> = ({
  endpoints,
  activeEndpointIndex,
  onSelectEndpoint,
  systemName,
  integrationName,
  onAddNewEndpoint,
  onAddApiForSector,
  className,
  style
}) => {
  const { t, isRtl } = useLanguage();
  const ribbonRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll active pill into view
  React.useEffect(() => {
    if (ribbonRef.current) {
      const activeEl = ribbonRef.current.querySelector('.ep-pill.active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeEndpointIndex]);

  // Enable horizontal scrolling with mouse wheel
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && ribbonRef.current) {
      ribbonRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (ribbonRef.current) {
      const scrollAmount = 260;
      ribbonRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', background: 'var(--bg-main)' }}>
      {endpoints.length > 4 && (
        <button
          type="button"
          className="ep-scroll-arrow"
          onClick={() => handleScroll(isRtl ? 'right' : 'left')}
          title="تمرير للخلف"
          aria-label="Scroll backward"
        >
          {isRtl ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      )}

      <div 
        className={`endpoints-ribbon ${className || ''}`}
        ref={ribbonRef}
        onWheel={handleWheel}
        style={{ flex: 1, ...style }}
      >
        {/* Endpoint Pills — Clean Monospace Buttons with dynamic REST API route prefix */}
        {endpoints.map((ep, idx) => {
          const isActive = idx === activeEndpointIndex;
          const rawName = ep.shortName || ep.path.split('/').filter(Boolean).pop() || ep.path || `ep-${idx + 1}`;
          const cleanName = rawName.replace(/^[/\\+]+/, '');
          const tooltip = `${ep.method ? `[${ep.method.toUpperCase()}] ` : ''}${ep.path}${ep.desc || ep.summary || ep.descEn ? ` — ${ep.desc || ep.summary || ep.descEn}` : ''}`;

          return (
            <div
              key={ep.id || idx}
              className={`ep-pill ${isActive ? 'active' : ''}`}
              onClick={() => onSelectEndpoint(idx)}
              title={tooltip}
            >
              <span className="ep-pill-path" dir="ltr">
                <span className="ep-slash">/</span>
                <span className="ep-name">{cleanName}</span>
              </span>
            </div>
          );
        })}
      </div>

      {endpoints.length > 4 && (
        <button
          type="button"
          className="ep-scroll-arrow"
          onClick={() => handleScroll(isRtl ? 'left' : 'right')}
          title="تمرير للأمام"
          aria-label="Scroll forward"
        >
          {isRtl ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      )}
    </div>
  );
};
