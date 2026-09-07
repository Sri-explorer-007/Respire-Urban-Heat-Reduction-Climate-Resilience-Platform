import React from 'react';
import { AlertCircle } from 'lucide-react';
import { respireApi } from '../../api/respireApi';

export const Header: React.FC = () => {
  const isDemo = respireApi.isDemoDataActive();
  const datasetLabel = respireApi.getDatasetLabel();

  return (
    <header className="app-header">
      <div className="brand-section">
        <h1 className="brand-title">RESPIRE</h1>
        <span className="brand-subtitle">Urban Heat Reduction & Climate Resilience Platform</span>
      </div>
      
      <div className="brand-actions">
        {isDemo && (
          <div className="demo-status-pill" title="Passing through production scoring pipeline">
            <AlertCircle size={14} />
            <span>{datasetLabel}</span>
          </div>
        )}
      </div>
    </header>
  );
};
