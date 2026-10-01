import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, Legend } from 'recharts';
import { DollarSign, TrendingDown, Leaf, Building, Award, BarChart2, Info } from 'lucide-react';

function CustomCompareTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div style={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--tooltip-text)', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px' }}>Time: {label}</div>
      {payload.map((entry, index) => (
        <div key={`item-${index}`} style={{ color: entry.color, display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '2px 0' }}>
          <span>{entry.name}:</span>
          <span style={{ fontWeight: 600 }}>{entry.value} {entry.unit || ''}</span>
        </div>
      ))}
    </div>
  );
}

export default function BeforeAfterKpiSection({ engineData }) {
  const { timeSeries, kpis, strategyBaselines } = engineData;
  const isPlanFeasible = engineData.protectionSummary.thermalCompliant && engineData.protectionSummary.voltageCompliant && engineData.protectionSummary.batterySoCCompliant && engineData.protectionSummary.slaCompliant;

  return (
    <div id="proof-section" className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              STAGE 4
            </span>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              BEFORE vs AFTER — Simulated Outcome & Measured Impact
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            GridFlex proves peak load flattening, voltage stabilization, and DISCOM financial ROI compared to unmanaged baselines.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '6px 14px', borderRadius: '8px', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600 }}>
          <Award size={16} />
          <span>{isPlanFeasible ? 'Modeled constraints pass' : 'Modeled constraints not met'}</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        
        {/* KPI 1: Cost Savings */}
        <div style={{ background: 'var(--bg-card-grad)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Daily Operating Cost Change</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} color="var(--success)" />
            </div>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: kpis.dailySavingsRs >= 0 ? 'var(--success)' : 'var(--danger)' }} className="font-mono">
            {kpis.dailySavingsRs >= 0 ? 'Lower by ' : 'Higher by '}₹{Math.abs(kpis.dailySavingsRs).toLocaleString()} / day
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Modeled cost: ₹{kpis.baselineDailyCostRs.toLocaleString()} → ₹{kpis.optimizedDailyCostRs.toLocaleString()} / day</div>
        </div>

        {/* KPI 2: Peak Demand Shaved */}
        <div style={{ background: 'var(--bg-card-grad)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Peak Demand Reduction</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={16} color="#3b82f6" />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }} className="font-mono">
            {kpis.peakShavedMW} MW <span style={{ fontSize: '0.75rem', color: kpis.peakShavedPct > 0 ? 'var(--success)' : 'var(--text-dim)' }}>
              ({kpis.peakShavedPct > 0 ? `${kpis.peakShavedPct}% Shaved` : 'N/A'})
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Feeder peak flattened below 4.2 MW</div>
        </div>

        {/* KPI 3: Carbon Avoided */}
        <div style={{ background: 'var(--bg-card-grad)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Carbon Offset</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Leaf size={16} color="var(--ai-purple)" />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ai-purple)' }} className="font-mono">
            {kpis.co2SavedTons == null ? 'Not modeled' : `${kpis.co2SavedTons} Tons CO₂e`}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Requires a generation emissions model</div>
        </div>

        {/* KPI 4: Capex Deferral */}
        <div style={{ background: 'var(--bg-card-grad)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Grid Capex Deferral</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building size={16} color="var(--warning)" />
            </div>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-muted)' }} className="font-mono">
            {kpis.capexDeferralLakhs == null ? 'Not modeled' : `₹${kpis.capexDeferralLakhs} Lakhs`}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Requires asset investment assumptions</div>
        </div>

      </div>

      {/* Side-by-Side Comparison Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Chart 1: Load Curve Before vs After */}
        <div style={{ background: 'var(--bg-panel-nested)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              Net Feeder Load: Unmanaged Baseline (Red) vs GridFlex Plan (Green)
            </div>
          </div>

          <div style={{ width: '100%', height: 270 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="time" stroke="var(--chart-axis)" fontSize={11} interval={5} />
                <YAxis stroke="var(--chart-axis)" fontSize={11} domain={[0, 6]} />
                <Tooltip content={<CustomCompareTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine y={4.2} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Feeder Limit: 4.2 MW (4,200 kW)', fill: '#ef4444', fontSize: 11, fontWeight: 700, position: 'insideTopRight', dy: 8, dx: -10 }} />

                <Line type="monotone" dataKey="baselineNetLoad" name="Unmanaged Baseline" stroke="#ef4444" strokeWidth={2.8} dot={false} unit="MW" />
                <Line type="monotone" dataKey="optNetLoad" name="GridFlex Optimized" stroke="#10b981" strokeWidth={3.2} dot={false} unit="MW" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Voltage Profile Before vs After */}
        <div style={{ background: 'var(--bg-panel-nested)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              Feeder Voltage Profile (p.u.): Voltage Sag Mitigation
              <span className="tooltip-badge" data-tooltip="Per-unit voltage bounds [0.95, 1.05]" style={{ marginLeft: '4px' }}><Info size={11} color="var(--text-dim)"/></span>
            </div>
          </div>

          <div style={{ width: '100%', height: 270 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="time" stroke="var(--chart-axis)" fontSize={11} interval={5} />
                <YAxis stroke="var(--chart-axis)" fontSize={11} domain={[0.88, 1.08]} />
                <Tooltip content={<CustomCompareTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine y={0.95} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '0.95 Min Safe', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={1.05} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '1.05 Max Safe', fill: '#ef4444', fontSize: 10 }} />

                <Line type="monotone" dataKey="baselineVoltage" name="Baseline Voltage (p.u.)" stroke="#f59e0b" strokeWidth={2.2} dot={false} unit="p.u." />
                <Line type="monotone" dataKey="optVoltage" name="GridFlex Voltage (p.u.)" stroke="#3b82f6" strokeWidth={3.2} dot={false} unit="p.u." />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Expanded Strategy Comparison Table with 4 Baselines */}
      <div style={{ background: 'var(--bg-panel-nested)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart2 size={18} color="var(--ai-purple)" />
          Strategy Performance Matrix — 4 Strategy Baselines Compared
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--table-header-bg)', color: 'var(--table-header-text)' }}>
                <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--table-border)' }}>Strategy Baseline</th>
                <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--table-border)' }}>Peak Overload</th>
                <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--table-border)' }}>Min Voltage</th>
                <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--table-border)' }}>Grid Violations</th>
                <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--table-border)' }}>Daily Operating Cost</th>
                <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--table-border)' }}>Protection Status</th>
              </tr>
            </thead>
            <tbody>
              {strategyBaselines && strategyBaselines.map((st, idx) => (
                <tr key={idx} style={{ background: idx === 3 ? 'rgba(16, 185, 129, 0.12)' : 'transparent', borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: st.color }}>{st.name}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-heading)' }} className="font-mono">{st.overload}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-heading)' }} className="font-mono">{st.minVoltage}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{st.violations}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: idx === 3 ? 'var(--success)' : 'var(--text-heading)' }} className="font-mono">{st.cost}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: st.color }}>{st.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
