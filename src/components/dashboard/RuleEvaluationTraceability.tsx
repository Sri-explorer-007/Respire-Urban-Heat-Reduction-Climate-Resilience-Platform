import React from 'react';
import { RuleEvaluationResult } from '../../core/types/recommendation';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface RuleEvaluationTraceabilityProps {
  ruleEvaluations: RuleEvaluationResult[];
}

export const RuleEvaluationTraceability: React.FC<RuleEvaluationTraceabilityProps> = ({ ruleEvaluations }) => {
  return (
    <div className="recommend-card">
      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        <ShieldCheck size={18} color="#3B82F6" />
        <span>Rule Evaluation Traceability (How Rules Were Evaluated)</span>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
        The recommendation engine evaluates candidate rules deterministically against zone risk indicators and threshold criteria.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ruleEvaluations.map((evalResult) => {
          const { ruleId, ruleName, matched, priorityRank, rationale, missingIndicators } = evalResult;
          const isMissingData = missingIndicators && missingIndicators.length > 0;

          return (
            <div 
              key={ruleId}
              style={{
                backgroundColor: matched ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface-elevated)',
                border: matched ? '1px solid rgba(16, 185, 129, 0.3)' : isMissingData ? '1px dashed rgba(234, 179, 8, 0.4)' : '1px solid var(--bg-surface-border)',
                borderRadius: '6px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  <span style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '0.75rem', 
                    backgroundColor: 'rgba(255, 255, 255, 0.06)', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    color: 'var(--text-secondary)'
                  }}>
                    Priority #{priorityRank}
                  </span>
                  <span>{ruleName}</span>
                </div>

                {/* Status Badge */}
                {matched ? (
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: '#10B981', 
                    backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    <CheckCircle2 size={12} /> MATCHED & RECOMMENDED
                  </span>
                ) : isMissingData ? (
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: '#FBBF24', 
                    backgroundColor: 'rgba(234, 179, 8, 0.15)', 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    border: '1px solid rgba(234, 179, 8, 0.3)'
                  }}>
                    <AlertTriangle size={12} /> INSUFFICIENT EVIDENCE
                  </span>
                ) : (
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    color: 'var(--text-muted)', 
                    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    border: '1px solid var(--bg-surface-border)'
                  }}>
                    <XCircle size={12} /> CRITERIA NOT MET
                  </span>
                )}
              </div>

              {/* Rationale Text */}
              <div style={{ fontSize: '0.82rem', color: matched ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.4, marginTop: '2px' }}>
                {rationale}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
