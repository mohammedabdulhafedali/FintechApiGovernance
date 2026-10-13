import React from 'react';
import { Endpoint } from '../../types/schema';
import { useLanguage } from '../../i18n';

interface EndpointsRibbonProps {
  endpoints: Endpoint[];
  activeEndpointIndex: number;
  onSelectEndpoint: (index: number) => void;
  systemName?: string;
  integrationName?: string;
  onAddNewEndpoint?: () => void;
  onAddApiForSector?: () => void;
}

export const EndpointsRibbon: React.FC<EndpointsRibbonProps> = ({
  endpoints,
  activeEndpointIndex,
  onSelectEndpoint,
  systemName,
  integrationName,
  onAddNewEndpoint,
  onAddApiForSector
}) => {
  const { t, isRtl } = useLanguage();

  return (
    <div className="endpoints-ribbon">
      {/* Endpoint Pills — Clean Monospace Buttons with dynamic REST API route prefix */}
      {endpoints.map((ep, idx) => {
        const isActive = idx === activeEndpointIndex;
        const rawName = ep.shortName || ep.path.split('/').filter(Boolean).pop() || ep.path || `ep-${idx + 1}`;
        const cleanName = rawName.replace(/^[/\\+]+/, '');

        return (
          <div
            key={ep.id || idx}
            className={`ep-pill ${isActive ? 'active' : ''}`}
            onClick={() => onSelectEndpoint(idx)}
            title={ep.path}
          >
            <span className="ep-pill-path" dir="ltr">
              <span className="ep-slash">/</span>
              <span className="ep-name">{cleanName}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
};
