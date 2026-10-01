import React from 'react';
import { X, CheckCircle, ArrowRight, Play, Cpu, ShieldCheck } from 'lucide-react';

export default function StoryModal({ isOpen, onClose, onJumpToStep }) {
  if (!isOpen) return null;

  const steps = [
    { title: '1. Open DISCOM Dashboard', desc: 'Inspect Feeder-04 single-line topology and initial operating parameters.' },
    { title: '2. Select Cloud Event / Evening Peak', desc: 'Trigger a steep solar ramp or unmanaged EV surge scenario.' },
    { title: '3. Forecast & Risk Window', desc: 'View 24h predictive forecast and highlighted stress window.' },
    { title: '4. Detected Flexibility Gap', desc: 'Audit MW shortfall (+1.42 MW) and available DER flex capacity.' },
    { title: '5. Run GridFlex Engine 🧠', desc: 'Formulate MILP optimization & solve coordinated dispatch schedule.' },
    { title: '6. Review Load Shift & BESS Action', desc: 'Examine BESS discharge + EV delay + HVAC setback dispatches.' },
    { title: '7. Protection Summary', desc: 'Verify 100% compliance on thermal limits, voltage bounds & battery DoD.' },
    { title: '8. Operator Approval', desc: 'Click Approve Plan to dispatch control vectors via OpenADR / IEEE 2030.5.' },
    { title: '9. Before vs After Proof', desc: 'Compare flattened load curve, restored voltage, and DISCOM financial ROI.' },
    { title: '10. Sensitivity & Re-solve Live', desc: 'Toggle Battery OFF or slide Participation to watch live re-optimization!' },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--bg-modal)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        border: '1px solid rgba(139, 92, 246, 0.5)',
        boxShadow: 'var(--shadow-main)',
        background: 'var(--bg-modal-panel)'
      }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={24} color="var(--ai-purple)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)' }}>GridFlex Story & Demonstration Guide</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '20px', lineHeight: '1.5' }}>
          <strong>Core Product Principle:</strong> "We are building one AI decision engine, and the UI is simply showing its thinking and its result. GridFlex predicted the problem, decided how to respond, respected constraints, and proved the result."
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {steps.map((s, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-panel-inner)',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-heading)' }}>{s.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.desc}</div>
              </div>
              <CheckCircle size={18} color="var(--success)" />
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="btn-ai-glow"
          style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
        >
          <span>Start Interactive Demonstration</span>
          <ArrowRight size={18} />
        </button>

      </div>
    </div>
  );
}
