import React, { useState } from 'react';
import { Header } from '../common/Header';
import { IdentifyScreen } from './IdentifyScreen';

export type WorkflowStep = 'IDENTIFY' | 'EXPLAIN' | 'RECOMMEND' | 'PRIORITIZE';

export const DashboardLayout: React.FC = () => {
  const [activeStep, setActiveStep] = useState<WorkflowStep>('IDENTIFY');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-dark)' }}>
      <Header />
      
      <nav className="workflow-nav">
        <div 
          className={`workflow-tab ${activeStep === 'IDENTIFY' ? 'active' : ''}`}
          onClick={() => setActiveStep('IDENTIFY')}
        >
          <span className="workflow-step-num">01</span>
          <span>IDENTIFY RISK</span>
        </div>

        <div 
          className={`workflow-tab ${activeStep === 'EXPLAIN' ? 'active' : ''}`}
          title="Upcoming Stage: Explainable Risk Breakdown"
          style={{ opacity: 0.6 }}
        >
          <span className="workflow-step-num">02</span>
          <span>EXPLAIN WHY</span>
        </div>

        <div 
          className={`workflow-tab ${activeStep === 'RECOMMEND' ? 'active' : ''}`}
          title="Upcoming Stage: Intervention Recommendation Engine"
          style={{ opacity: 0.6 }}
        >
          <span className="workflow-step-num">03</span>
          <span>RECOMMEND ACTIONS</span>
        </div>

        <div 
          className={`workflow-tab ${activeStep === 'PRIORITIZE' ? 'active' : ''}`}
          title="Upcoming Stage: Cost & Impact Prioritization"
          style={{ opacity: 0.6 }}
        >
          <span className="workflow-step-num">04</span>
          <span>PRIORITIZE & FUND</span>
        </div>
      </nav>

      <main className="content-container">
        {activeStep === 'IDENTIFY' && <IdentifyScreen />}

        {activeStep === 'EXPLAIN' && (
          <div className="placeholder-card">
            <h3>Explainable Risk Breakdown Module</h3>
            <p>Upcoming stage: Detailed indicator provenance & risk component analysis.</p>
          </div>
        )}

        {activeStep === 'RECOMMEND' && (
          <div className="placeholder-card">
            <h3>Rule-Based Recommendation Module</h3>
            <p>Upcoming stage: Targeted cooling intervention matrix & rationale.</p>
          </div>
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
