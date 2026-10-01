import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceArea, CartesianGrid } from 'recharts';
import { SCENARIOS } from '../engine/gridflexEngine';
import { AlertTriangle, ShieldAlert, Info } from 'lucide-react';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

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

export default function ForecastSection({ scenarioId, engineData }) {
  const scenario = SCENARIOS[scenarioId];
  const { timeSeries, kpis } = engineData;
  const riskWindowBounds = scenario.riskTimeWindow.includes(' - ') ? scenario.riskTimeWindow.split(' - ') : null;
  const baselineViolations = [];
  if (kpis.baselineMaxOverloadMW > 0) baselineViolations.push(`Transformer overload: +${kpis.baselineMaxOverloadMW} MW over 4.2 MW rating`);
  if (kpis.baselineMinVoltage < 0.95) baselineViolations.push(`Low voltage: ${kpis.baselineMinVoltage} p.u. below 0.950 p.u. limit`);
  if (kpis.baselineMaxVoltage > 1.05) baselineViolations.push(`High voltage: ${kpis.baselineMaxVoltage} p.u. above 1.050 p.u. limit`);
  const baselineHasViolation = baselineViolations.length > 0;
  if (baselineViolations.length === 0) baselineViolations.push('No modeled thermal or voltage limit breach in the baseline profile.');

  return (
    <div id="forecast-section" className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '4px', background: baselineHasViolation ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)', color: baselineHasViolation ? 'var(--danger)' : 'var(--success)', border: `1px solid ${baselineHasViolation ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.3)'}` }}>
              {baselineHasViolation ? 'STAGE 1 · RISK DETECTED' : 'BASELINE · NORMAL'}
            </span>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              WHAT WILL HAPPEN? — Physics-Based Predictive Load & Risk Forecast
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Seasonal-naive forecast with a historical variability band, highlighting likely feeder overload and voltage sag.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: baselineHasViolation ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)', border: `1px solid ${baselineHasViolation ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`, padding: '6px 14px', borderRadius: '8px', color: baselineHasViolation ? 'var(--danger)' : 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
          {baselineHasViolation ? <AlertTriangle size={16} /> : <Info size={16} />}
          <span>Predicted Risk Window: {scenario.riskTimeWindow}</span>
        </div>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Left Column: 24h Net Load & Solar Time-Series Chart with Shaded Uncertainty Band */}
        <div style={{ background: 'var(--bg-panel-nested)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              Feeder Net Demand Forecast (with historical variability band)
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
                {riskWindowBounds && (
                  <ReferenceArea
                    x1={riskWindowBounds[0]}
                    x2={riskWindowBounds[1]}
                    y1={0}
                    y2={6}
                    fill="#ef4444"
                    fillOpacity={0.12}
                    stroke="#ef4444"
                    strokeOpacity={0.45}
                    label={{ value: 'PREDICTED RISK WINDOW', fill: '#ef4444', fontSize: 10, position: 'insideTop' }}
                  />
                )}
                <XAxis dataKey="time" stroke="var(--chart-axis)" fontSize={11} interval={5} />
                <YAxis stroke="var(--chart-axis)" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={4.2} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Feeder Limit: 4.2 MW (4,200 kW)', fill: '#ef4444', fontSize: 11, fontWeight: 700, position: 'insideTopRight', dy: 8, dx: -10 }} />
                
                {/* Stacked areas shade the space between the forecast bounds. */}
                <Area type="monotone" dataKey="uncertaintyLower" stackId="forecast-band" name="Lower Forecast Bound" stroke="none" fill="transparent" fillOpacity={0} unit="MW" />
                <Area type="monotone" dataKey="uncertaintyBandMW" stackId="forecast-band" name="Forecast Variability Band" stroke="none" fill="url(#colorUncertainty)" unit="MW" />
                
                <Area type="monotone" dataKey="solarGen" name="Solar Gen" stroke="#f59e0b" fillOpacity={0.2} fill="#f59e0b" unit="MW" />
                <Area type="monotone" dataKey="forecastNetLoad" name="Seasonal-Naive Forecast" stroke="#ef4444" strokeWidth={2.8} fillOpacity={1} fill="url(#colorBaseline)" unit="MW" />
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
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Peak Thermal Gap</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }} className="font-mono">
                  +{kpis.baselineMaxOverloadMW} MW
                </div>
              </div>

              <div style={{ background: 'var(--bg-panel-inner)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Baseline Voltage Range
                  <span className="tooltip-badge" data-tooltip="Per-Unit voltage relative to nominal 11kV grid rating" style={{ marginLeft: '4px' }}><Info size={11} color="var(--text-dim)"/></span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)' }} className="font-mono">
                  {kpis.baselineMinVoltage} - {kpis.baselineMaxVoltage} p.u.
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
              {baselineViolations.map((v, idx) => (
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
              <span style={{ fontSize: '0.75rem', color: 'var(--ai-purple)', fontWeight: 600 }}>Up to 1.85 MW Flex</span>
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
