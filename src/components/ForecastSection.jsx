import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
import { SCENARIOS } from '../engine/gridflexEngine';
import { AlertTriangle, ShieldAlert, Info } from 'lucide-react';

export default function ForecastSection({ scenarioId, engineData }) {
  const scenario = SCENARIOS[scenarioId];
  const { timeSeries, kpis } = engineData;

  // Custom Tooltip with uncertainty bounds
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--tooltip-text)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px' }}>Time: {label}</div>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} style={{ color: entry.color, display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '2px 0' }}>
              <span>{entry.name}:</span>
              <span style={{ fontWeight: 600 }}>{entry.value} {entry.unit || 'MW'}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="forecast-section" className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
              STAGE 1
            </span>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              WHAT WILL HAPPEN? — Physics-Based Predictive Load & Risk Forecast
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Predictive time-series model with 95% confidence prediction interval bands identifying upcoming feeder overload & voltage sag.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 14px', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600 }}>
          <AlertTriangle size={16} />
          <span>Predicted Risk Window: {scenario.riskTimeWindow}</span>
        </div>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Left Column: 24h Net Load & Solar Time-Series Chart with Shaded Uncertainty Band */}
        <div style={{ background: 'var(--bg-panel-nested)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              Feeder Net Demand Forecast (with 95% Confidence Interval Shading)
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 700 }}>Feeder Rating: 4.2 MW (4,200 kW)</span>
          </div>

          <div style={{ width: '100%', height: 270 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorUncertainty" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="time" stroke="var(--chart-axis)" fontSize={11} interval={5} />
                <YAxis stroke="var(--chart-axis)" fontSize={11} domain={[0, 6]} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={4.2} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Feeder Limit: 4.2 MW (4,200 kW)', fill: '#ef4444', fontSize: 11, fontWeight: 700, position: 'insideTopRight', dy: 8, dx: -10 }} />
                
                {/* 95% Confidence Band Area */}
                <Area type="monotone" dataKey="uncertaintyUpper" name="Upper 95% Bound" stroke="none" fill="url(#colorUncertainty)" unit="MW" />
                
                <Area type="monotone" dataKey="solarGen" name="Solar Gen" stroke="#f59e0b" fillOpacity={0.2} fill="#f59e0b" unit="MW" />
                <Area type="monotone" dataKey="baselineNetLoad" name="Predicted Net Load" stroke="#ef4444" strokeWidth={2.8} fillOpacity={1} fill="url(#colorBaseline)" unit="MW" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Detected Gap & Risk Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Risk Summary Alert */}
          <div style={{ background: 'var(--bg-panel-nested)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '8px' }}>
              <ShieldAlert size={20} />
              <span>DETECTED FLEXIBILITY GAP & CONSTRAINT BREACH</span>
            </div>
            
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '12px' }}>
              {scenario.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'var(--bg-panel-inner)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Peak Shortfall Gap</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }} className="font-mono">
                  +{kpis.baselineMaxOverloadMW} MW
                </div>
              </div>

              <div style={{ background: 'var(--bg-panel-inner)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Predicted Voltage Sag
                  <span className="tooltip-badge" data-tooltip="Per-Unit voltage relative to nominal 11kV grid rating" style={{ marginLeft: '4px' }}><Info size={11} color="var(--text-dim)"/></span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)' }} className="font-mono">
                  {kpis.baselineMinVoltage} p.u.
                </div>
              </div>
            </div>
          </div>

          {/* Violations Checklist */}
          <div style={{ background: 'var(--bg-panel-nested)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '8px' }}>
              Feeder Violations (Do Nothing Baseline):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {scenario.baselineViolations.map((v, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                  <AlertTriangle size={14} />
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Flexibility Audit */}
          <div style={{ background: 'var(--bg-panel-nested)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                Available Flexibility Inventory:
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--ai-purple)', fontWeight: 600 }}>Total: 1.85 MW Flex</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', fontSize: '0.72rem', textTransform: 'uppercase', textAlign: 'center' }} className="font-mono">
              <div style={{ background: 'var(--bg-panel-inner)', padding: '6px', borderRadius: '6px', color: 'var(--success)' }}>BESS: 750 kW</div>
              <div style={{ background: 'var(--bg-panel-inner)', padding: '6px', borderRadius: '6px', color: 'var(--ai-purple)' }}>EV: 400 kW</div>
              <div style={{ background: 'var(--bg-panel-inner)', padding: '6px', borderRadius: '6px', color: '#38bdf8' }}>HVAC: 200 kW</div>
              <div style={{ background: 'var(--bg-panel-inner)', padding: '6px', borderRadius: '6px', color: 'var(--warning)' }}>Ag: 500 kW</div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
