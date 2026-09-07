import React from 'react';
import { DataSourceStatus } from '../../core/types/data-provenance';

interface ProvenanceBadgeProps {
  status: DataSourceStatus;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({ status }) => {
  const getCssClass = () => {
    switch (status) {
      case 'SOURCED': return 'provenance-sourced';
      case 'DERIVED': return 'provenance-derived';
      case 'INDICATIVE_ESTIMATE': return 'provenance-estimate';
      case 'ASSUMPTION': return 'provenance-assumption';
      default: return 'provenance-estimate';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'SOURCED': return 'SOURCED';
      case 'DERIVED': return 'DERIVED';
      case 'INDICATIVE_ESTIMATE': return 'INDICATIVE ESTIMATE';
      case 'ASSUMPTION': return 'ASSUMPTION';
      default: return 'UNKNOWN';
    }
  };

  return (
    <span className={`provenance-badge ${getCssClass()}`}>
      {getLabel()}
    </span>
  );
};
