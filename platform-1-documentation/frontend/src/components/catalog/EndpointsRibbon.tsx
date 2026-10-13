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
      {/* Endpoint Pills — Clean Monospace Buttons without POST badge */}
      {endpoints.map((ep, idx) => {
        const isActive = idx === activeEndpointIndex;
        const nameToShow = ep.shortName || ep.path.split('/').filter(Boolean).pop() || ep.path;
        return (
          <div
            key={ep.id || idx}
            className={`ep-pill ${isActive ? 'active' : ''}`}
            onClick={() => onSelectEndpoint(idx)}
            title={ep.path}
          >
            <span>{nameToShow}</span>
          </div>
        );
      })}
    </div>
  );
};
