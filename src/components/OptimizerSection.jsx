import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { ShieldCheck, CheckCircle2, AlertTriangle, Terminal, Info } from 'lucide-react';

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div style={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--tooltip-text)', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px' }}>Time: {label}</div>
      {payload.map((entry, index) => (
        <div key={`item-${index}`} style={{ color: entry.color, display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '2px 0' }}>
          <span>{entry.name}:</span>
          <span style={{ fontWeight: 600 }}>{entry.value > 0 ? `+${entry.value}` : entry.value} MW</span>
        </div>
      ))}
    </div>
  );
}

export default function OptimizerSection({ engineData, batteryEnabled, participationRate }) {
  const { timeSeries, protectionSummary, logs } = engineData;
  const constraintsPass = protectionSummary.thermalCompliant && protectionSummary.voltageCompliant && protectionSummary.batterySoCCompliant && protectionSummary.slaCompliant;
  const batterySoCValues = timeSeries.map((slot) => slot.bessSoC);

  // Real-time line-by-line typing animation for solver execution console
  const [visibleLogCount, setVisibleLogCount] = useState(0);

  useEffect(() => {
    const timers = logs.map((_, index) => setTimeout(() => {
      setVisibleLogCount(index + 1);
    }, (index + 1) * 160));

    return () => timers.forEach(clearTimeout);
  }, [logs]);

  const visibleLogs = logs.slice(0, visibleLogCount);

  return (
    <div id="optimizer-section" className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.2)', color: 'var(--ai-purple)', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
              STAGE 2
            </span>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              WHAT CAN WE DO? — Constraint-Aware Feeder Dispatch
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            GridFlex allocates available load flexibility and battery power, then checks the resulting feeder and asset limits.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: constraintsPass ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${constraintsPass ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`, padding: '6px 14px', borderRadius: '8px', color: constraintsPass ? 'var(--success)' : 'var(--danger)', fontSize: '0.8rem', fontWeight: 600 }}>
          {constraintsPass ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
          <span>{constraintsPass ? 'All modeled constraints pass' : 'One or more constraints fail'}</span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        
        {/* Left: Recommended Dispatch Action Chart with Clean Y-Axis Ticks [-1.0, -0.5, 0, 0.5, 1.0, 1.5] */}
        <div style={{ background: 'var(--bg-panel-nested)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              Coordinated Asset Dispatch Schedule (Discharge/Shift Relief vs Night Recharging)
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--ai-purple)', fontWeight: 600 }}>Flex Rate: {participationRate}%</span>
          </div>

          <div style={{ width: '100%', height: 270 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="time" stroke="var(--chart-axis)" fontSize={11} interval={5} />
                <YAxis stroke="var(--chart-axis)" fontSize={11} domain={[-1.0, 1.5]} ticks={[-1.0, -0.5, 0, 0.5, 1.0, 1.5]} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                
                <Bar dataKey="bessPower" name="BESS Power (kW)" fill="#10b981" stackId="a" />
                <Bar dataKey="evShift" name="EV Shift (kW)" fill="#8b5cf6" stackId="a" />
                <Bar dataKey="hvacSetback" name="HVAC Setback (kW)" fill="#38bdf8" stackId="a" />
                <Bar dataKey="agReschedule" name="Ag Pump Shift (kW)" fill="#f59e0b" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Protection Matrix & Live Solver Console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Protection Matrix */}
          <div style={{ background: 'var(--bg-panel-nested)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--success)" />
              Protection Summary & Grid Safety Matrix
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              
              <div style={{ background: 'var(--bg-panel-inner)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Thermal Rating</span>
                  {protectionSummary.thermalCompliant ? <CheckCircle2 size={14} color="var(--success)" /> : <AlertTriangle size={14} color="var(--danger)" />}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: protectionSummary.thermalCompliant ? 'var(--success)' : 'var(--danger)' }} className="font-mono">
                  {protectionSummary.maxThermalPct}% Max Loading
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px' }}>Limit: ≤ 100% (4.2 MW)</div>
              </div>

              <div style={{ background: 'var(--bg-panel-inner)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Voltage Bounds
                    <span className="tooltip-badge" data-tooltip="p.u. (Per-Unit Voltage): Grid voltage normalized to 1.0 p.u. nominal (0.95 - 1.05 safe bounds)" style={{ marginLeft: '4px' }}>
                      (p.u.) <Info size={10} color="var(--text-dim)"/>
                    </span>
                  </span>
                  {protectionSummary.voltageCompliant ? <CheckCircle2 size={14} color="var(--success)" /> : <AlertTriangle size={14} color="var(--danger)" />}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: protectionSummary.voltageCompliant ? 'var(--success)' : 'var(--danger)' }} className="font-mono">
                  {protectionSummary.minVoltagePu} - {protectionSummary.maxVoltagePu} p.u.
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px' }}>Safe: [0.95 - 1.05] p.u.</div>
              </div>

              <div style={{ background: 'var(--bg-panel-inner)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Battery DoD / SoC
                    <span className="tooltip-badge" data-tooltip="SoC (State of Charge) & DoD (Depth of Discharge): Battery energy limits (20% min to 95% max) to prevent cell degradation" style={{ marginLeft: '4px' }}>
                      <Info size={10} color="var(--text-dim)"/>
                    </span>
                  </span>
                  {protectionSummary.batterySoCCompliant ? <CheckCircle2 size={14} color="var(--success)" /> : <AlertTriangle size={14} color="var(--danger)" />}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: protectionSummary.batterySoCCompliant ? 'var(--success)' : 'var(--danger)' }} className="font-mono">
                  {batteryEnabled ? `${Math.min(...batterySoCValues)}% - ${Math.max(...batterySoCValues)}%` : 'Battery disabled'}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px' }}>Degradation Minimized</div>
              </div>

              <div style={{ background: 'var(--bg-panel-inner)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Customer SLA
                    <span className="tooltip-badge" data-tooltip="SLA (Service Level Agreement): Guaranteed customer comfort temperature bounds (≤ +1.5°C drift)" style={{ marginLeft: '4px' }}>
                      <Info size={10} color="var(--text-dim)"/>
                    </span>
                  </span>
                  {protectionSummary.slaCompliant ? <CheckCircle2 size={14} color="var(--success)" /> : <AlertTriangle size={14} color="var(--danger)" />}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: protectionSummary.slaCompliant ? 'var(--success)' : 'var(--danger)' }} className="font-mono">
                  {protectionSummary.slaCompliant ? 'Within flex limits' : 'Flex limit exceeded'}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px' }}>Temp float ≤ +1.5°C</div>
              </div>

            </div>
          </div>

          {/* Solver Console with Auto-Scroll */}
          <div style={{ background: 'var(--console-bg)', border: '1px solid var(--console-border)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ai-purple)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={14} />
                Decision Engine Execution Console
                <span className="tooltip-badge" data-tooltip="Backend solve output and measured dispatch constraints" style={{ marginLeft: '4px' }}>
                  <Info size={10} color="var(--text-dim)"/>
                </span>
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 600 }} className="font-mono">{engineData.engine?.name || 'Local engine'}</span>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--console-text)', display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '110px', maxHeight: '140px', overflowY: 'auto' }} className="font-mono">
              {visibleLogs.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>[{log.step}]</span>
                  <span>{log.msg}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
