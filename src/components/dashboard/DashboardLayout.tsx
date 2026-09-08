import React, { useState, useEffect } from 'react';
import { Header } from '../common/Header';
import { ExecutiveOverviewScreen } from './ExecutiveOverviewScreen';
import { DataWorkspaceScreen } from './DataWorkspaceScreen';
import { IdentifyScreen } from './IdentifyScreen';
import { ExplainScreen } from './ExplainScreen';
import { RecommendScreen } from './RecommendScreen';
import { PrioritizeScreen } from './PrioritizeScreen';
import { InterventionPlanningScreen } from './InterventionPlanningScreen';
import { respireWorkspaceService } from '../../core/services/data/workspaceService';
import { respireScoringEngine } from '../../core/services/scoring/scoringEngine';

export type WorkflowStep = 'OVERVIEW' | 'DATA' | 'IDENTIFY' | 'EXPLAIN' | 'RECOMMEND' | 'PRIORITIZE' | 'PLANNING';

export const DashboardLayout: React.FC = () => {
  const [activeStep, setActiveStep] = useState<WorkflowStep>('OVERVIEW');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>('ZONE-CHN-W045'); // Default to Vyasarpadi

  // Listen to dataset changes and reset selectedZoneId if current selection is absent in new dataset
  useEffect(() => {
    const handleDatasetChange = () => {
      const activeZones = respireWorkspaceService.getActiveZones();
      if (activeZones.length === 0) {
        setSelectedZoneId(null);
        return;
      }

      const existsInNewDataset = activeZones.some(z => (z.zoneId || z.id) === selectedZoneId);
      if (!existsInNewDataset) {
        // Find highest risk analyzable zone or default to first zone
        const scored = activeZones.map(z => ({
          id: z.zoneId || z.id,
          score: respireScoringEngine.calculateZoneRisk(z).totalScore
        }));
        scored.sort((a, b) => (b.score || 0) - (a.score || 0));
        const newDefaultId = scored[0]?.id || activeZones[0].zoneId || activeZones[0].id || null;
        setSelectedZoneId(newDefaultId);
      }
    };

    const unsubscribe = respireWorkspaceService.subscribe(handleDatasetChange);
    return unsubscribe;
  }, [selectedZoneId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-dark)' }}>
      <Header />
      
      <nav className="workflow-nav" role="tablist" aria-label="RESPIRE Platform Workflow Steps">
        <button 
          type="button"
          role="tab"
          aria-selected={activeStep === 'OVERVIEW'}
          className={`workflow-tab ${activeStep === 'OVERVIEW' ? 'active' : ''}`}
          onClick={() => setActiveStep('OVERVIEW')}
          aria-label="Navigate to OVERVIEW stage"
        >
          <span className="workflow-step-num">00</span>
          <span>OVERVIEW</span>
        </button>

        <button 
          type="button"
          role="tab"
          aria-selected={activeStep === 'DATA'}
          className={`workflow-tab ${activeStep === 'DATA' ? 'active' : ''}`}
          onClick={() => setActiveStep('DATA')}
          aria-label="Navigate to DATA WORKSPACE stage"
        >
          <span className="workflow-step-num">01</span>
          <span>DATA WORKSPACE</span>
        </button>

        <button 
          type="button"
          role="tab"
          aria-selected={activeStep === 'IDENTIFY'}
          className={`workflow-tab ${activeStep === 'IDENTIFY' ? 'active' : ''}`}
          onClick={() => setActiveStep('IDENTIFY')}
          aria-label="Navigate to IDENTIFY stage"
        >
          <span className="workflow-step-num">02</span>
          <span>IDENTIFY</span>
        </button>

        <button 
          type="button"
          role="tab"
          aria-selected={activeStep === 'EXPLAIN'}
          className={`workflow-tab ${activeStep === 'EXPLAIN' ? 'active' : ''}`}
          onClick={() => setActiveStep('EXPLAIN')}
          aria-label="Navigate to EXPLAIN WHY stage"
        >
          <span className="workflow-step-num">03</span>
          <span>EXPLAIN WHY</span>
        </button>

        <button 
          type="button"
          role="tab"
          aria-selected={activeStep === 'RECOMMEND'}
          className={`workflow-tab ${activeStep === 'RECOMMEND' ? 'active' : ''}`}
          onClick={() => setActiveStep('RECOMMEND')}
          aria-label="Navigate to RECOMMEND ACTION stage"
        >
          <span className="workflow-step-num">04</span>
          <span>RECOMMEND ACTION</span>
        </button>

        <button 
          type="button"
          role="tab"
          aria-selected={activeStep === 'PRIORITIZE'}
          className={`workflow-tab ${activeStep === 'PRIORITIZE' ? 'active' : ''}`}
          onClick={() => setActiveStep('PRIORITIZE')}
          aria-label="Navigate to PRIORITIZE & FUND workflow stage"
        >
          <span className="workflow-step-num">05</span>
          <span>PRIORITIZE & FUND</span>
        </button>

        <button 
          type="button"
          role="tab"
          aria-selected={activeStep === 'PLANNING'}
          className={`workflow-tab ${activeStep === 'PLANNING' ? 'active' : ''}`}
          onClick={() => setActiveStep('PLANNING')}
          aria-label="Navigate to INTERVENTION PLANNING workflow stage"
        >
          <span className="workflow-step-num">06</span>
          <span>INTERVENTION PLANNING</span>
        </button>
      </nav>

      <main className="content-container">
        {activeStep === 'OVERVIEW' && (
          <ExecutiveOverviewScreen 
            selectedZoneId={selectedZoneId}
            onSelectZone={(id) => setSelectedZoneId(id)}
            onNavigate={(step) => setActiveStep(step)}
          />
        )}

        {activeStep === 'DATA' && (
          <DataWorkspaceScreen 
            onNavigateToIdentify={() => setActiveStep('IDENTIFY')}
          />
        )}

        {activeStep === 'IDENTIFY' && (
          <IdentifyScreen 
            selectedZoneId={selectedZoneId}
            onSelectZone={(id) => setSelectedZoneId(id)}
            onNavigateToExplain={() => setActiveStep('EXPLAIN')}
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
          <PrioritizeScreen 
            selectedZoneId={selectedZoneId}
            onSelectZone={(id) => setSelectedZoneId(id)}
          />
        )}

        {activeStep === 'PLANNING' && (
          <InterventionPlanningScreen 
            selectedZoneId={selectedZoneId}
            onSelectZone={(id) => setSelectedZoneId(id)}
            onNavigate={(step) => setActiveStep(step)}
          />
        )}
      </main>
    </div>
  );
};

