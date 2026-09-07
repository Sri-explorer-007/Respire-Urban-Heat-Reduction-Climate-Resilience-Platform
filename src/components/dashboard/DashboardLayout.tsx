import React, { useState } from 'react';
import { Header } from '../common/Header';
import { IdentifyScreen } from './IdentifyScreen';
import { ExplainScreen } from './ExplainScreen';
import { RecommendScreen } from './RecommendScreen';

export type WorkflowStep = 'IDENTIFY' | 'EXPLAIN' | 'RECOMMEND' | 'PRIORITIZE';

export const DashboardLayout: React.FC = () => {
  const [activeStep, setActiveStep] = useState<WorkflowStep>('IDENTIFY');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>('ZONE-CHN-W045'); // Default to Vyasarpadi (Ward 045)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-dark)' }}>
      <Header />
      
      <nav className="workflow-nav">
        <div 
          className={`workflow-tab ${activeStep === 'IDENTIFY' ? 'active' : ''}`}
          onClick={() => setActiveStep('IDENTIFY')}
          aria-label="Navigate to IDENTIFY RISK workflow stage"
        >
          <span className="workflow-step-num">01</span>
          <span>IDENTIFY RISK</span>
        </div>

        <div 
          className={`workflow-tab ${activeStep === 'EXPLAIN' ? 'active' : ''}`}
          onClick={() => setActiveStep('EXPLAIN')}
          aria-label="Navigate to EXPLAIN WHY workflow stage"
        >
          <span className="workflow-step-num">02</span>
          <span>EXPLAIN WHY</span>
        </div>

        <div 
          className={`workflow-tab ${activeStep === 'RECOMMEND' ? 'active' : ''}`}
          onClick={() => setActiveStep('RECOMMEND')}
          aria-label="Navigate to RECOMMEND ACTIONS workflow stage"
        >
          <span className="workflow-step-num">03</span>
          <span>RECOMMEND ACTIONS</span>
        </div>

        <div 
          className={`workflow-tab ${activeStep === 'PRIORITIZE' ? 'active' : ''}`}
          title="Upcoming Stage: Cost & Impact Prioritization"
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        >
          <span className="workflow-step-num">04</span>
          <span>PRIORITIZE & FUND</span>
        </div>
      </nav>

      <main className="content-container">
        {activeStep === 'IDENTIFY' && (
          <IdentifyScreen 
            selectedZoneId={selectedZoneId}
            onSelectZone={(id) => setSelectedZoneId(id)}
          />
        )}

        {activeStep === 'EXPLAIN' && (
          <ExplainScreen 
            selectedZoneId={selectedZoneId}
            onSelectZone={(id) => setSelectedZoneId(id)}
          />
        )}

        {activeStep === 'RECOMMEND' && (
          <RecommendScreen 
            selectedZoneId={selectedZoneId}
            onSelectZone={(id) => setSelectedZoneId(id)}
          />
        )}

        {activeStep === 'PRIORITIZE' && (
          <div className="placeholder-card">
            <h3>Cost & Impact Prioritization Module</h3>
            <p>Upcoming stage: Municipal priority score, indicative cost efficiency, and funding ranking.</p>
          </div>
        )}
      </main>
    </div>
  );
};
