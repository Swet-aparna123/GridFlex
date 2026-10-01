import React from 'react';
import { Battery, Sun, Car, Wind, Droplets, Zap, Info } from 'lucide-react';

export default function FeederTopology({ 
  batteryEnabled, 
  participationRate, 
  currentScenario,
  isOptimized,
  engineData
}) {
  const timeSeries = engineData && engineData.timeSeries ? engineData.timeSeries : [];
  
  // Find peak stress timestamp in the time series dynamically
  const peakIndex = timeSeries.length > 0
    ? timeSeries.reduce((maxIdx, current, idx, arr) => current.baselineNetLoad > arr[maxIdx].baselineNetLoad ? idx : maxIdx, 0)
    : 39;
    
  const peakData = timeSeries[peakIndex] || null;

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#60a5fa" />
            Distribution Feeder Topology & Asset Single Line Diagram 
            <span className="tooltip-badge" data-tooltip="SLD: Single Line Diagram — Electrical schematic showing 11kV bus and connected DER assets" style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 700 }}>
              (SLD) <Info size={11} color="#94a3b8" />
            </span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Feeder-04 (11kV Local Circuit) — Telemetry at Peak Stress Window ({peakData ? peakData.time : '19:30'})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Normal Asset</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Flexibility Active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Stressed Node</span>
          </div>
        </div>
      </div>

      {/* Interactive Topology Nodes Matrix */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
        background: 'var(--bg-panel-nested)',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        position: 'relative'
      }}>

        {/* 1. Substation Transformer Node */}
        <div style={{
          background: 'var(--bg-card-grad)',
          border: peakData && peakData.baselineNetLoad > 4.2 ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} color="#3b82f6" />
            </div>
            <span className={isOptimized ? "pulse-dot-success" : "pulse-dot-danger"}></span>
          </div>
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>Substation (33/11kV)</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rating: 4.20 MW Max</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isOptimized ? 'var(--success)' : 'var(--danger)', marginTop: '6px' }} className="font-mono">
              Net Load: {peakData ? (isOptimized ? peakData.optNetLoad : peakData.baselineNetLoad) : '4.95'} MW
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }} className="font-mono">
              Voltage: <span className="tooltip-badge" data-tooltip="p.u. (Per-Unit): Grid voltage normalized to 1.0 p.u. nominal (0.95 - 1.05 safe bounds)">
                {peakData ? (isOptimized ? peakData.optVoltage : peakData.baselineVoltage) : '0.912'} p.u. <Info size={10} color="var(--text-dim)" />
              </span>
            </div>
          </div>
        </div>

        {/* 2. Battery Energy Storage (BESS) */}
        <div style={{
          background: batteryEnabled ? 'var(--bg-card-grad)' : 'var(--bg-panel-subtle)',
          border: batteryEnabled ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '14px',
          opacity: batteryEnabled ? 1 : 0.6,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: batteryEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Battery size={18} color={batteryEnabled ? 'var(--success)' : 'var(--text-dim)'} />
            </div>
            <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: batteryEnabled ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-panel-inner)', color: batteryEnabled ? 'var(--success)' : 'var(--text-dim)', fontWeight: 700 }}>
              {batteryEnabled ? 'ONLINE' : 'OFF'}
            </span>
          </div>
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              Substation BESS
              <span className="tooltip-badge" data-tooltip="BESS: Battery Energy Storage System (1.5 MWh / 750 kW)" style={{ marginLeft: '4px' }}>
                <Info size={10} color="var(--text-dim)" />
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1.5 MWh / 750 kW</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--success)', marginTop: '6px' }} className="font-mono">
              {batteryEnabled && isOptimized ? `Dispatch: +${peakData?.bessPower > 0 ? peakData.bessPower : 0.65} MW` : 'Standby / 0 kW'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }} className="font-mono">
              SoC: <span className="tooltip-badge" data-tooltip="SoC (State of Charge): Available battery capacity percentage (20% min to 95% max)">
                {peakData ? peakData.bessSoC : 75}% <Info size={10} color="var(--text-dim)" />
              </span>
            </div>
          </div>
        </div>

        {/* 3. EV Charging Hub */}
        <div style={{
          background: 'var(--bg-card-grad)',
          border: isOptimized ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={18} color="var(--ai-purple)" />
            </div>
            <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.2)', color: 'var(--ai-purple)', fontWeight: 700 }}>
              FLEXIBLE
            </span>
          </div>
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>Commercial EV Hub</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1.15 MW Unmanaged</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ai-purple)', marginTop: '6px' }} className="font-mono">
              {isOptimized ? `Shifted: -${Math.abs(peakData?.evShift || 0.42)} MW` : 'Unmanaged Charging'}
            </div>
          </div>
        </div>

        {/* 4. Solar Aggregator */}
        <div style={{
          background: 'var(--bg-card-grad)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sun size={18} color="var(--warning)" />
            </div>
            <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--warning)', fontWeight: 700 }}>
              SOLAR PV
            </span>
          </div>
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>Rooftop Solar Array</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>2.5 MWp Aggregated</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--warning)', marginTop: '6px' }} className="font-mono">
              Output: {peakData?.solarGen || 0.00} MW
            </div>
          </div>
        </div>

        {/* 5. Smart HVAC & Cold Storage */}
        <div style={{
          background: 'var(--bg-card-grad)',
          border: isOptimized ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wind size={18} color="#38bdf8" />
            </div>
            <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 700 }}>
              THERMAL
            </span>
          </div>
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>Smart HVAC & Storage</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.65 MW Demand</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8', marginTop: '6px' }} className="font-mono">
              {isOptimized ? `Setback: -${Math.abs(peakData?.hvacSetback || 0.24)} MW` : 'Baseline Cooling'}
            </div>
          </div>
        </div>

        {/* 6. Agricultural Pumps */}
        <div style={{
          background: 'var(--bg-card-grad)',
          border: isOptimized ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Droplets size={18} color="var(--success)" />
            </div>
            <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', fontWeight: 700 }}>
              AGRI PUMP
            </span>
          </div>
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>Agri Irrigation Feeders</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.35 MW Load</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--success)', marginTop: '6px' }} className="font-mono">
              {isOptimized ? `Shifted: -${Math.abs(peakData?.agReschedule || 0.31)} MW` : 'Peak Pumping'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
