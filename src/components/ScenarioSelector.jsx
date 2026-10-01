import React from 'react';
import { SCENARIOS } from '../engine/gridflexEngine';
import { CloudRain, Moon, Sun, Play, RefreshCw, Battery, Users, Sliders, Sparkles } from 'lucide-react';

export default function ScenarioSelector({
  scenarioId,
  setScenarioId,
  batteryEnabled,
  setBatteryEnabled,
  participationRate,
  setParticipationRate,
  batteryInitialSoC,
  setBatteryInitialSoC,
  onRunOptimizer,
  isEngineSolving
}) {
  const currentScenario = SCENARIOS[scenarioId];

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="#c084fc" />
            Grid Stress Scenarios & Live Decision Controls
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Select a feeder stress event and adjust live engine parameters to watch GridFlex re-solve in real-time.
          </p>
        </div>

        <button
          onClick={onRunOptimizer}
          disabled={isEngineSolving}
          className="btn-ai-glow"
        >
          {isEngineSolving ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
          <span>{isEngineSolving ? 'Solving MILP Engine...' : 'Run GridFlex Engine 🧠'}</span>
        </button>
      </div>

      {/* Scenario Presets Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        
        {/* Scenario 1: Cloud Event */}
        <div
          onClick={() => setScenarioId('cloud_event')}
          className="glass-panel glass-card-interactive"
          style={{
            padding: '14px',
            border: scenarioId === 'cloud_event' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
            background: scenarioId === 'cloud_event' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-panel-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
              🌦️ Midday Ramp Emergency
            </span>
            {scenarioId === 'cloud_event' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }}></span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px', color: 'var(--text-heading)' }}>Cloud Event (Sudden Solar Drop)</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Solar drops from 2.5 MW → 0.2 MW during midday peak (12:30-14:30), causing 130% transformer overload (+1.25 MW gap).
          </div>
        </div>

        {/* Scenario 2: Evening Peak (ALERT MODE) */}
        <div
          onClick={() => setScenarioId('evening_peak')}
          className="glass-panel glass-card-interactive"
          style={{
            padding: '14px',
            border: scenarioId === 'evening_peak' ? '2px solid var(--danger)' : '1px solid rgba(239, 68, 68, 0.4)',
            background: scenarioId === 'evening_peak' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.05)',
            boxShadow: scenarioId === 'evening_peak' ? '0 0 16px rgba(239, 68, 68, 0.35)' : 'none',
            position: 'relative',
            transition: 'all 0.25s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              🚨 Sunset Surge Peak (Alert Mode)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--danger)', fontWeight: 800, textTransform: 'uppercase' }}>ALERT</span>
              <span className="pulse-dot-danger"></span>
            </div>
          </div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '4px', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Evening Peak (EV + Residential)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Unmanaged EV charging & AC load surge as solar drops to 0 (18:00-21:30), causing <strong style={{ color: 'var(--danger)' }}>130% transformer overload (+1.25 MW gap)</strong>.
          </div>
        </div>

        {/* Scenario 3: Solar Surge */}
        <div
          onClick={() => setScenarioId('solar_surge')}
          className="glass-panel glass-card-interactive"
          style={{
            padding: '14px',
            border: scenarioId === 'solar_surge' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
            background: scenarioId === 'solar_surge' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-panel-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
              ☀️ Reverse Flow Swell
            </span>
            {scenarioId === 'solar_surge' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }}></span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px', color: 'var(--text-heading)' }}>Solar Over-Generation</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Excess solar PV during low load (11:00-13:30) causes reverse power flow (-1.2 MW) & overvoltage swell.
          </div>
        </div>

      </div>

      {/* Interactive Live Sensitivity Parameters (Re-solve Live) */}
      <div style={{
        background: 'var(--bg-panel-nested)',
        padding: '16px',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        
        {/* Toggle Battery ON / OFF */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Battery size={20} color={batteryEnabled ? 'var(--success)' : 'var(--text-dim)'} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>Substation Battery (BESS)</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Status: <span style={{ color: batteryEnabled ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{batteryEnabled ? 'ONLINE' : 'OFF (Load Shift Only)'}</span>
            </div>
          </div>
          <label className="switch" style={{ marginLeft: '8px' }}>
            <input
              type="checkbox"
              checked={batteryEnabled}
              onChange={(e) => setBatteryEnabled(e.target.checked)}
            />
            <span className="slider-toggle"></span>
          </label>
        </div>

        <div style={{ width: '1px', height: '32px', background: 'var(--border-highlight)' }} />

        {/* Customer Flex Participation Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
          <Users size={20} color="var(--ai-purple)" />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              <span>Flex Participation Rate</span>
              <span style={{ color: 'var(--ai-purple)' }}>{participationRate}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={participationRate}
              onChange={(e) => setParticipationRate(Number(e.target.value))}
              style={{ width: '100%', marginTop: '6px' }}
            />
          </div>
        </div>

        <div style={{ width: '1px', height: '32px', background: 'var(--border-highlight)' }} />

        {/* Initial SoC Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '200px' }}>
          <Battery size={20} color="var(--primary)" />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              <span>Initial Battery SoC</span>
              <span style={{ color: 'var(--primary)' }}>{batteryInitialSoC}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="95"
              step="5"
              value={batteryInitialSoC}
              onChange={(e) => setBatteryInitialSoC(Number(e.target.value))}
              disabled={!batteryEnabled}
              style={{ width: '100%', marginTop: '6px', opacity: batteryEnabled ? 1 : 0.4 }}
            />
          </div>
        </div>

      </div>

    </div>
  );
}
