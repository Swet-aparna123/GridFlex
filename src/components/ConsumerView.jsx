import React, { useState } from 'react';
import { Home, Car, Sun, Wind, DollarSign, AlertCircle, Zap, CheckCircle2, Users } from 'lucide-react';

export default function ConsumerView({ participationRate, setParticipationRate }) {
  const [optedOut, setOptedOut] = useState(false);
  const maxTempFloat = 1.5;
  const evGuaranteeTime = '07:00 AM';

  const handleOptOutToggle = () => {
    const nextState = !optedOut;
    setOptedOut(nextState);
    if (nextState) {
      setParticipationRate(0); // Drops local participation to 0%
    } else {
      setParticipationRate(65); // Restores default participation
    }
  };

  const isParticipating = !optedOut && participationRate > 0;

  return (
    <div style={{ marginTop: '20px' }}>
      
      {/* Hero Banner for Prosumer View */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', background: 'var(--bg-hero)', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Home size={24} color="#3b82f6" />
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-heading)' }}>Smart Home & Community Flexibility Portal</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Earn monthly DISCOM bill credits by allowing GridFlex to shift non-critical loads during peak feeder stress hours.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-panel-inner)', padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--border-highlight)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: isParticipating ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} color={isParticipating ? 'var(--success)' : 'var(--text-dim)'} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Monthly Bill Credit</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isParticipating ? 'var(--success)' : 'var(--text-muted)' }} className="font-mono">
                {isParticipating ? '₹420 / month' : '₹0 (no shifting needed)'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Active Sample Event Panel */}
      <div className="glass-panel" style={{
        padding: '20px',
        marginBottom: '24px',
        background: isParticipating
          ? 'rgba(139, 92, 246, 0.12)'
          : 'var(--bg-panel-subtle)',
        border: isParticipating ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} color="var(--warning)" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Demand Response Event
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: '2px' }}>
                Tonight 7:00 – 8:30 PM: Delay EV charging & shift HVAC, earn {isParticipating ? '₹85' : '₹0 (no shifting needed)'}
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isParticipating ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-panel-inner)', border: isParticipating ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)', padding: '6px 14px', borderRadius: '8px', color: isParticipating ? 'var(--success)' : 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 700 }}>
            {isParticipating ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{isParticipating ? 'SCHEDULED & CONFIRMED (+₹85 CREDIT)' : 'OPTED OUT — NO SHIFTING'}</span>
          </div>
        </div>

        {/* Breakdown of Event Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginTop: '12px' }}>
          
          {/* Action 1: EV Charger Delay */}
          <div style={{ background: 'var(--bg-panel-inner)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Car size={18} color="var(--ai-purple)" />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)' }}>Delay EV Charging (7–8:30 PM)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Resume 100% full charge at 22:30 night</div>
              </div>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isParticipating ? 'var(--success)' : 'var(--text-muted)' }} className="font-mono">
              {isParticipating ? '+₹50' : '₹0 (no shifting needed)'}
            </span>
          </div>

          {/* Action 2: Smart HVAC Float */}
          <div style={{ background: 'var(--bg-panel-inner)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Wind size={18} color="#38bdf8" />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)' }}>Smart HVAC Thermal Setback</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Allow +1.5°C float during 7:00–8:30 PM peak</div>
              </div>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isParticipating ? 'var(--success)' : 'var(--text-muted)' }} className="font-mono">
              {isParticipating ? '+₹35' : '₹0 (no shifting needed)'}
            </span>
          </div>

        </div>
      </div>

      {/* Main Household DER Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '24px' }}>
        
        {/* Household EV Charger */}
        <div style={{ background: 'var(--bg-panel-nested)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Car size={20} color="var(--ai-purple)" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-heading)' }}>Smart EV Fast Charger</span>
            </div>
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: isParticipating ? 'rgba(139, 92, 246, 0.2)' : 'var(--bg-panel-inner)', color: isParticipating ? 'var(--ai-purple)' : 'var(--text-dim)', fontWeight: 700 }}>
              {isParticipating ? 'FLEXIBLE SHIFT' : 'UNMANAGED'}
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Charging rate automatically shifted away from 18:00–21:30 evening peak to 22:30 off-peak.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', background: 'var(--bg-panel-inner)', padding: '8px 12px', borderRadius: '6px' }} className="font-mono">
            <span>Guaranteed Ready:</span>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>100% by {evGuaranteeTime}</span>
          </div>
        </div>

        {/* Household Smart HVAC */}
        <div style={{ background: 'var(--bg-panel-nested)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Wind size={20} color="#38bdf8" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-heading)' }}>Smart HVAC Heat Pump</span>
            </div>
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: isParticipating ? 'rgba(56, 189, 248, 0.2)' : 'var(--bg-panel-inner)', color: isParticipating ? '#38bdf8' : 'var(--text-dim)', fontWeight: 700 }}>
              {isParticipating ? 'THERMAL FLOAT' : 'MANUAL'}
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Pre-cools house before peak hours; allows a maximum +{maxTempFloat}°C temperature drift.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', background: 'var(--bg-panel-inner)', padding: '8px 12px', borderRadius: '6px' }} className="font-mono">
            <span>Comfort SLA Limit:</span>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>±{maxTempFloat}°C Drift Max</span>
          </div>
        </div>

        {/* Rooftop Solar System */}
        <div style={{ background: 'var(--bg-panel-nested)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sun size={20} color="var(--warning)" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-heading)' }}>Rooftop Solar PV (4.5kWp)</span>
            </div>
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--warning)', fontWeight: 700 }}>
              EXPORTING
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Feeds clean solar power back to Feeder-04 during midday hours under net-metering tariff.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', background: 'var(--bg-panel-inner)', padding: '8px 12px', borderRadius: '6px' }} className="font-mono">
            <span>Grid Export Rate:</span>
            <span style={{ color: 'var(--warning)', fontWeight: 600 }}>3.2 kW Active Export</span>
          </div>
        </div>

      </div>

      {/* Community Impact Dashboard Panel */}
      <div style={{ background: 'var(--bg-panel-nested)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="var(--ai-purple)" />
          Feeder-04 Community Flexibility & Sustainability Impact
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          
          <div style={{ background: 'var(--bg-panel-inner)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Participating Households</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ai-purple)', marginTop: '4px' }} className="font-mono">
              {isParticipating ? `${participationRate}% (91 / 140)` : '0% (Opted Out)'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>Active automated flex response</div>
          </div>

          <div style={{ background: 'var(--bg-panel-inner)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Community Peak Relief</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }} className="font-mono">
              {isParticipating ? '680 kW Shifted' : '0 kW (No Shifting)'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>Avoided transformer overload</div>
          </div>

          <div style={{ background: 'var(--bg-panel-inner)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Community Payout</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }} className="font-mono">
              {isParticipating ? '₹11,900 / mo' : '₹0 (no shifting needed)'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>Distributed across participants</div>
          </div>

          <div style={{ background: 'var(--bg-panel-inner)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Environmental Offset</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--warning)', marginTop: '4px' }} className="font-mono">
              {isParticipating ? '0.85 Tons CO₂e' : '0 Tons CO₂e'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>142 trees / mo equivalent offset</div>
          </div>

        </div>
      </div>

      {/* Consumer Preferences & 1-Click Opt-Out Controls */}
      <div style={{ background: 'var(--bg-panel-nested)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '4px', color: 'var(--text-heading)' }}>Consumer Flexibility Participation Controls</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              You maintain full ownership of your household devices. Toggle off to opt-out anytime.
            </div>
          </div>

          <button
            onClick={handleOptOutToggle}
            style={{
              background: optedOut ? 'var(--danger)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            {optedOut ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{optedOut ? 'OPTED OUT (Click to Opt-In)' : 'ACTIVE PARTICIPANT (Click to Opt-Out)'}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
