import React from 'react';
import { Cpu, Zap, Activity, ShieldCheck, AlertTriangle, HelpCircle, Layers, Home, Info, Sun, Moon } from 'lucide-react';

export default function Header({ 
  selectedFeeder, 
  setSelectedFeeder, 
  planApproved, 
  scenario,
  isEngineSolving,
  onOpenWalkthrough,
  activeView,
  setActiveView,
  onScrollToSection,
  activeSection = 'topology',
  theme = 'dark',
  toggleTheme
}) {
  return (
    <header style={{ marginBottom: '24px' }}>
      
      {/* 1. Hero & Problem Statement Strip */}
      <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '16px', marginBottom: '14px', background: 'var(--bg-hero)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(139, 92, 246, 0.4)'
            }}>
              <Cpu size={28} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-heading)' }}>
                  GRIDFLEX
                </h1>
                <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.2)', color: 'var(--ai-purple)', border: '1px solid rgba(139, 92, 246, 0.4)', fontWeight: 700 }}>
                  PHYSICS-CONSTRAINED DECISION ENGINE
                </span>
                
                {/* Simulated Data Badge */}
                <span className="tooltip-badge" data-tooltip="Simulated distribution grid telemetry for demonstration" style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-panel-inner)', color: 'var(--text-muted)', border: '1px solid var(--border-highlight)', fontWeight: 600 }}>
                  <Info size={11} color="var(--text-dim)" /> Synthetic Telemetry
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <strong>Problem Statement:</strong> Feeder overload & voltage instability caused by solar volatility and unmanaged EV surges — GridFlex predicts stress, optimizes flexible DER dispatches, enforces safety, and proves DISCOM ROI.
              </p>
            </div>
          </div>

          {/* Right Controls: View Switch & Theme Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            
            {/* Dark / Light Theme Toggle Switch */}
            <button
              onClick={toggleTheme}
              className="tooltip-badge"
              data-tooltip={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{
                background: 'var(--bg-panel-inner)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-highlight)',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-main)'
              }}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={16} color="#f59e0b" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon size={16} color="#7c3aed" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* View Toggle: DISCOM vs Consumer */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-panel-inner)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-highlight)' }}>
              <button
                onClick={() => setActiveView('discom')}
                style={{
                  background: activeView === 'discom' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'transparent',
                  color: activeView === 'discom' ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Layers size={14} />
                DISCOM Control Center
              </button>

              <button
                onClick={() => setActiveView('consumer')}
                style={{
                  background: activeView === 'consumer' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'transparent',
                  color: activeView === 'consumer' ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Home size={14} />
                Prosumer & Household Portal
              </button>
            </div>

          </div>

        </div>

        {/* How It Works Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6' }}>
            <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem' }}>1</span>
            <span><strong>Forecast:</strong> 24h PV & Load Prediction</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6' }}>
            <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem' }}>2</span>
            <span><strong>Optimize:</strong> Constraint-Aware Dispatch</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
            <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem' }}>3</span>
            <span><strong>Approve:</strong> Operator Review Gate</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
            <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem' }}>4</span>
            <span><strong>Measure:</strong> Financial & Physics Proof</span>
          </div>
        </div>
      </div>

      {/* 2. Sticky Stage Navigation Bar */}
      {activeView === 'discom' && (
        <div className="sticky-navbar glass-panel" style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={16} color="#f59e0b" />
              <select
                value={selectedFeeder}
                onChange={(e) => setSelectedFeeder(e.target.value)}
                style={{
                  background: 'var(--select-bg)',
                  color: 'var(--select-text)',
                  border: '1px solid var(--select-border)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Feeder-04">Feeder-04 (Urban Commercial 33/11kV)</option>
                <option value="Feeder-09">Feeder-09 (Agri Solar Microgrid 11kV)</option>
                <option value="Feeder-12">Feeder-12 (Residential EV Corridor 11kV)</option>
              </select>
            </div>

            <div style={{ width: '1px', height: '20px', background: 'var(--border-highlight)' }} />

            {/* Stage Scroll Jump Buttons / Pills */}
            <div style={{ display: 'flex', gap: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
              
              {/* Pill 1: Topology */}
              <button
                onClick={() => onScrollToSection('topology')}
                style={{
                  background: activeSection === 'topology' ? 'rgba(100, 116, 139, 0.3)' : 'var(--pill-bg)',
                  border: activeSection === 'topology' ? '1px solid var(--text-dim)' : '1px solid var(--pill-border)',
                  color: activeSection === 'topology' ? 'var(--text-heading)' : 'var(--pill-text)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: activeSection === 'topology' ? '0 0 10px rgba(148, 163, 184, 0.3)' : 'none'
                }}
              >
                Topology SLD
              </button>

              {/* Pill 2: Forecast (Predict) */}
              <button
                onClick={() => onScrollToSection('forecast')}
                style={{
                  background: activeSection === 'forecast' ? 'rgba(59, 130, 246, 0.25)' : 'var(--pill-bg)',
                  border: activeSection === 'forecast' ? '1px solid #3b82f6' : '1px solid var(--pill-border)',
                  color: activeSection === 'forecast' ? '#3b82f6' : 'var(--pill-text)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: activeSection === 'forecast' ? '0 0 12px rgba(59, 130, 246, 0.4)' : 'none'
                }}
              >
                1. Forecast
              </button>

              {/* Pill 3: Optimize */}
              <button
                onClick={() => onScrollToSection('optimizer')}
                style={{
                  background: activeSection === 'optimizer' ? 'rgba(139, 92, 246, 0.25)' : 'var(--pill-bg)',
                  border: activeSection === 'optimizer' ? '1px solid #8b5cf6' : '1px solid var(--pill-border)',
                  color: activeSection === 'optimizer' ? '#8b5cf6' : 'var(--pill-text)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: activeSection === 'optimizer' ? '0 0 12px rgba(139, 92, 246, 0.4)' : 'none'
                }}
              >
                2. Optimize
              </button>

              {/* Pill 4: Approve */}
              <button
                onClick={() => onScrollToSection('approval')}
                style={{
                  background: activeSection === 'approval' ? 'rgba(16, 185, 129, 0.25)' : 'var(--pill-bg)',
                  border: activeSection === 'approval' ? '1px solid #10b981' : '1px solid var(--pill-border)',
                  color: activeSection === 'approval' ? '#10b981' : 'var(--pill-text)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: activeSection === 'approval' ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none'
                }}
              >
                3. Approve
              </button>

              {/* Pill 5: Measure / Prove */}
              <button
                onClick={() => onScrollToSection('proof')}
                style={{
                  background: activeSection === 'proof' ? 'rgba(245, 158, 11, 0.25)' : 'var(--pill-bg)',
                  border: activeSection === 'proof' ? '1px solid #f59e0b' : '1px solid var(--pill-border)',
                  color: activeSection === 'proof' ? '#f59e0b' : 'var(--pill-text)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: activeSection === 'proof' ? '0 0 12px rgba(245, 158, 11, 0.4)' : 'none'
                }}
              >
                4. Measure & Prove
              </button>

            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={onOpenWalkthrough}
              style={{ background: 'var(--bg-panel-inner)', border: '1px solid var(--border-highlight)', color: 'var(--text-muted)', padding: '5px 12px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <HelpCircle size={14} color="var(--text-dim)" />
              Story Guide
            </button>

            {planApproved ? (
              <div className="pulse-badge-success">
                <ShieldCheck size={14} />
                <span>PLAN APPROVED</span>
              </div>
            ) : isEngineSolving ? (
              <div style={{ color: 'var(--ai-purple)', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={14} className="animate-spin" />
                <span>RE-SOLVING...</span>
              </div>
            ) : scenario === 'normal' ? (
              <div className="pulse-badge-success">
                <ShieldCheck size={14} />
                <span>NORMAL OPERATION</span>
              </div>
            ) : (
              <div className="pulse-badge-danger">
                <AlertTriangle size={14} />
                <span>STRESS BREACH</span>
              </div>
            )}
          </div>

        </div>
      )}

    </header>
  );
}

