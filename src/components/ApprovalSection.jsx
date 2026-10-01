import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ShieldCheck, Send, Lock, RotateCcw, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { SCENARIOS } from '../engine/gridflexEngine';

export default function ApprovalSection({ planApproved, setPlanApproved, scenarioId, engineData }) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [approvedAt, setApprovedAt] = useState('');

  const { protectionSummary, timeSeries } = engineData || {};
  const planFeasible = Boolean(protectionSummary && protectionSummary.thermalCompliant && protectionSummary.voltageCompliant && protectionSummary.batterySoCCompliant && protectionSummary.slaCompliant);
  const baselineHasViolation = timeSeries?.some((slot) =>
    slot.baselineNetLoad > 4.2 || slot.baselineVoltage < 0.95 || slot.baselineVoltage > 1.05
  );
  const noDispatchRequired = Boolean(planFeasible && !baselineHasViolation);
  const canApprove = planFeasible && !noDispatchRequired;
  const peakSlot = timeSeries?.reduce((peak, slot) => slot.baselineNetLoad > peak.baselineNetLoad ? slot : peak, timeSeries[0]);
  const riskWindow = SCENARIOS[scenarioId]?.riskTimeWindow || 'the forecast risk window';

  const triggerConfirm = () => {
    if (!canApprove) return;
    setShowConfirmModal(true);
  };

  const handleFinalApproval = () => {
    setShowConfirmModal(false);
    setPlanApproved(true);
    setApprovedAt(new Date().toLocaleTimeString());
    // Fire celebratory confetti effect
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  const handleReset = () => {
    setPlanApproved(false);
    setApprovedAt('');
  };

  return (
    <div id="approval-section" className="glass-panel" style={{
      padding: '24px',
      marginBottom: '24px',
      background: planApproved 
        ? 'rgba(16, 185, 129, 0.12)'
        : noDispatchRequired
        ? 'var(--bg-panel-subtle)'
        : !planFeasible
        ? 'rgba(239, 68, 68, 0.12)'
        : 'rgba(139, 92, 246, 0.12)',
      border: planApproved 
        ? '1px solid rgba(16, 185, 129, 0.4)' 
        : noDispatchRequired
        ? '1px solid var(--border-color)'
        : !planFeasible
        ? '1px solid rgba(239, 68, 68, 0.5)'
        : '1px solid rgba(139, 92, 246, 0.4)',
      transition: 'all 0.3s ease'
    }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Left Status Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: planApproved ? 'rgba(16, 185, 129, 0.2)' : noDispatchRequired ? 'rgba(100, 116, 139, 0.2)' : !planFeasible ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: planApproved ? '1px solid rgba(16, 185, 129, 0.4)' : noDispatchRequired ? '1px solid var(--border-color)' : !planFeasible ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(139, 92, 246, 0.4)'
          }}>
            {planApproved ? <ShieldCheck size={30} color="var(--success)" /> : <Lock size={30} color={noDispatchRequired ? 'var(--text-dim)' : !planFeasible ? 'var(--danger)' : 'var(--ai-purple)'} />}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: planApproved ? 'rgba(16, 185, 129, 0.2)' : noDispatchRequired ? 'rgba(100, 116, 139, 0.2)' : !planFeasible ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)', color: planApproved ? 'var(--success)' : noDispatchRequired ? 'var(--text-dim)' : !planFeasible ? 'var(--danger)' : 'var(--ai-purple)' }}>
                STAGE 3
              </span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                {planApproved 
                  ? 'OPERATOR APPROVAL RECORDED FOR THE DISPATCH PLAN'
                  : noDispatchRequired
                  ? 'FEEDER OPERATING SAFELY — NO DISPATCH REQUIRED'
                  : !planFeasible
                  ? 'PLAN BLOCKED — AVAILABLE FLEXIBILITY CANNOT CLEAR ALL LIMITS'
                  : 'OPERATOR PLAN APPROVAL GATEWAY'}
              </h2>
            </div>
            
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {planApproved 
                ? 'Approval is recorded in this local simulation. No external DER control signals are sent.'
                : noDispatchRequired
                ? 'The feeder is operating within the modeled thermal and voltage limits. No control action is required.'
                : !planFeasible
                ? 'The measured dispatch still violates one or more thermal, voltage, battery, or customer-flex constraints. Increase available resources or reduce feeder stress before approval.'
                : 'Review the optimization plan and click below to approve automated control signal dispatch for Feeder-04.'}
            </p>
          </div>
        </div>

        {/* Right Interactive Buttons */}
        <div>
          {!planApproved ? (
            <button
              onClick={triggerConfirm}
              disabled={!canApprove}
              style={{
                background: !canApprove
                  ? 'var(--bg-panel-inner)' 
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: !canApprove ? 'var(--text-dim)' : '#ffffff',
                fontWeight: 800,
                fontSize: '0.92rem',
                padding: '12px 24px',
                borderRadius: '10px',
                border: !canApprove ? '1px solid var(--border-color)' : 'none',
                cursor: !canApprove ? 'not-allowed' : 'pointer',
                boxShadow: !canApprove ? 'none' : '0 0 24px rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: !canApprove ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {!canApprove ? <Lock size={18} /> : <Send size={18} />}
              <span>{noDispatchRequired ? 'No dispatch required' : !planFeasible ? 'Plan infeasible' : 'APPROVE DISPATCH PLAN'}</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '8px 16px', borderRadius: '8px', color: 'var(--success)', fontSize: '0.82rem', fontWeight: 700 }} className="font-mono">
                ✓ APPROVED @ {approvedAt}
              </div>

              <button
                onClick={handleReset}
                style={{
                  background: 'var(--bg-panel-inner)',
                  border: '1px solid var(--border-highlight)',
                  color: 'var(--text-main)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw size={14} />
                Reset Plan
              </button>
            </div>
          )}
        </div>

      </div>

      {/* One-Line Plan Summary Box */}
      {engineData && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: planApproved 
            ? 'rgba(16, 185, 129, 0.15)' 
            : noDispatchRequired
            ? 'var(--bg-panel-subtle)'
            : 'rgba(139, 92, 246, 0.15)',
          border: planApproved 
            ? '1px solid rgba(16, 185, 129, 0.4)' 
            : noDispatchRequired
            ? '1px solid var(--border-color)'
            : '1px solid rgba(139, 92, 246, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.85rem',
          fontWeight: 700,
            color: planApproved ? 'var(--success)' : noDispatchRequired ? 'var(--text-muted)' : !planFeasible ? 'var(--danger)' : 'var(--ai-purple)'
        }}>
          <span style={{ fontSize: '1rem' }}>{planApproved ? '✅' : noDispatchRequired ? 'ℹ️' : '⚡'}</span>
          <div className="font-mono" style={{ flex: 1 }}>
            {planApproved ? (
              <>
                <strong>Approved synthetic plan:</strong> {riskWindow}; BESS {peakSlot?.bessPower > 0 ? `discharge ${peakSlot.bessPower.toFixed(2)} MW` : 'on standby'}, EV shift {peakSlot?.evShift.toFixed(2)} MW; peak {engineData.kpis.baselinePeakMW} → {engineData.kpis.optPeakMW} MW.
              </>
            ) : noDispatchRequired ? (
              <>
                <strong>Current State:</strong> No dispatch needed — Feeder load is within safe capacity limit (4.2 MW / 4,200 kW).
              </>
            ) : !planFeasible ? (
              <>
                <strong>Approval blocked:</strong> Dispatch remains outside at least one protection limit; current peak is {engineData.kpis.optPeakMW} MW with {engineData.kpis.optimizedViolationCount} measured violations.
              </>
            ) : (
              <>
                <strong>Proposed plan:</strong> {riskWindow}; BESS {peakSlot?.bessPower > 0 ? `discharge ${peakSlot.bessPower.toFixed(2)} MW` : 'on standby'}, EV shift {peakSlot?.evShift.toFixed(2)} MW; peak {engineData.kpis.baselinePeakMW} → {engineData.kpis.optPeakMW} MW.
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Step Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-modal)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '24px', border: '1px solid rgba(16, 185, 129, 0.5)', boxShadow: 'var(--shadow-main)', background: 'var(--bg-modal-panel)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={22} color="var(--success)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading)' }}>Confirm Control Vector Dispatch</h3>
              </div>
              <button onClick={() => setShowConfirmModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
              Are you sure you want to approve this simulated plan for <strong>Feeder-04</strong> during {riskWindow}?
              <ul style={{ margin: '10px 0 0 18px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                <li>BESS: {peakSlot?.bessPower > 0 ? `discharge ${peakSlot.bessPower.toFixed(2)} MW` : peakSlot?.bessPower < 0 ? `charge ${Math.abs(peakSlot.bessPower).toFixed(2)} MW` : 'standby'}</li>
                <li>EV charging shift: {peakSlot?.evShift.toFixed(2)} MW</li>
                <li>HVAC setback: {peakSlot?.hvacSetback.toFixed(3)} MW within customer flex limit</li>
                <li>Agricultural load shift: {peakSlot?.agReschedule.toFixed(2)} MW</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{ background: 'var(--bg-panel-inner)', border: '1px solid var(--border-highlight)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleFinalApproval}
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircle2 size={16} />
                Confirm Simulated Approval
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
