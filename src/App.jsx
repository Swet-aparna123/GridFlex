import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FeederTopology from './components/FeederTopology';
import ScenarioSelector from './components/ScenarioSelector';
import ForecastSection from './components/ForecastSection';
import OptimizerSection from './components/OptimizerSection';
import ApprovalSection from './components/ApprovalSection';
import BeforeAfterKpiSection from './components/BeforeAfterKpiSection';
import ConsumerView from './components/ConsumerView';
import StoryModal from './components/StoryModal';
import GeminiAdvisor from './components/GeminiAdvisor';
import { SCENARIOS } from './engine/gridflexEngine';

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('gridflex-theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const [activeView, setActiveView] = useState('discom'); // 'discom' | 'consumer'
  const [selectedFeeder, setSelectedFeeder] = useState('Feeder-04');
  const [scenarioId, setScenarioId] = useState('normal');
  const [batteryEnabled, setBatteryEnabled] = useState(true);
  const [participationRate, setParticipationRate] = useState(65); // Default 65% for realistic customer trade-off
  const [batteryInitialSoC, setBatteryInitialSoC] = useState(75);
  const [engineData, setEngineData] = useState(null);
  const [engineError, setEngineError] = useState('');
  const [solveRequestId, setSolveRequestId] = useState(0);
  const [planApproved, setPlanApproved] = useState(false);
  const [isEngineSolving, setIsEngineSolving] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('topology');

  // Sync theme attribute on document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gridflex-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Re-solve on the local decision API whenever an operating input changes.
  useEffect(() => {
    const controller = new AbortController();

    const requestSolve = async () => {
      setIsEngineSolving(true);
      setEngineError('');
      setEngineData(null);

      try {
        const response = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ scenarioId, batteryEnabled, participationRate, batteryInitialSoC }),
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'GridFlex solve failed.');
        setEngineData(result);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setEngineError(error.message || 'Unable to connect to the GridFlex decision API.');
        }
      } finally {
        if (!controller.signal.aborted) setIsEngineSolving(false);
      }
    };

    requestSolve();
    return () => controller.abort();
  }, [scenarioId, batteryEnabled, participationRate, batteryInitialSoC, solveRequestId]);

  // Track active section as user scrolls
  useEffect(() => {
    if (activeView !== 'discom') return;

    const sections = ['topology', 'forecast', 'optimizer', 'approval', 'proof'];
    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -40% 0px',
      threshold: 0.15
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id.replace('-section', '');
          setActiveSection(sectionId);
        }
      });
    }, observerOptions);

    sections.forEach((s) => {
      const el = document.getElementById(`${s}-section`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [activeView]);

  // Handler to trigger solver animation
  const handleRunOptimizer = () => {
    setSolveRequestId((requestId) => requestId + 1);
  };

  // Scroll to section handler
  const handleScrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const el = document.getElementById(`${sectionId}-section`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)', paddingBottom: '60px', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* Header with Hero, Sticky Navbar, and Tab Switcher */}
        <Header
          selectedFeeder={selectedFeeder}
          setSelectedFeeder={setSelectedFeeder}
          planApproved={planApproved}
          scenario={scenarioId}
          isEngineSolving={isEngineSolving}
          onOpenWalkthrough={() => setIsStoryModalOpen(true)}
          activeView={activeView}
          setActiveView={setActiveView}
          onScrollToSection={handleScrollToSection}
          activeSection={activeSection}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        {/* View Switch: DISCOM Control Center vs Prosumer View */}
        {activeView === 'discom' ? (
          <>
            {/* Feeder Topology SLD */}
            <div id="topology-section">
              <FeederTopology
                batteryEnabled={batteryEnabled}
                isOptimized={Boolean(engineData?.protectionSummary && engineData.protectionSummary.thermalCompliant && engineData.protectionSummary.voltageCompliant)}
                engineData={engineData}
              />
            </div>

            {/* Scenario Selector & Controls */}
            <ScenarioSelector
              scenarioId={scenarioId}
              setScenarioId={(id) => {
                setScenarioId(id);
                setPlanApproved(false);
              }}
              batteryEnabled={batteryEnabled}
              setBatteryEnabled={(val) => {
                setBatteryEnabled(val);
                setPlanApproved(false);
              }}
              participationRate={participationRate}
              setParticipationRate={(val) => {
                setParticipationRate(val);
                setPlanApproved(false);
              }}
              batteryInitialSoC={batteryInitialSoC}
              setBatteryInitialSoC={(val) => {
                setBatteryInitialSoC(val);
                setPlanApproved(false);
              }}
              onRunOptimizer={handleRunOptimizer}
              isEngineSolving={isEngineSolving}
            />

            {isEngineSolving && !engineData && (
              <div role="status" style={{ padding: '12px 16px', marginBottom: '20px', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                Solving feeder dispatch through the local GridFlex API...
              </div>
            )}
            {engineError && (
              <div role="alert" style={{ padding: '12px 16px', marginBottom: '20px', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.45)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <span>Decision API unavailable: {engineError}</span>
                <button type="button" onClick={handleRunOptimizer} style={{ color: 'inherit', background: 'transparent', border: '1px solid currentColor', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}>
                  Retry solve
                </button>
              </div>
            )}

            {/* Stage 1: Forecast & Risk Window */}
            {engineData && <ForecastSection scenarioId={scenarioId} engineData={engineData} />}

            {/* Stage 2: AI Optimizer Dispatch & Protection Matrix */}
            {engineData && <OptimizerSection
              engineData={engineData}
              batteryEnabled={batteryEnabled}
              participationRate={participationRate}
            />}

            {engineData && <GeminiAdvisor
              scenario={SCENARIOS[scenarioId]}
              kpis={engineData.kpis}
              protection={engineData.protectionSummary}
            />}

            {/* Stage 3: Operator Plan Approval Gateway */}
            {engineData && <ApprovalSection
              planApproved={planApproved}
              setPlanApproved={setPlanApproved}
              scenarioId={scenarioId}
              engineData={engineData}
            />}

            {/* Stage 4: Before vs After Proof & KPI Measurement */}
            {engineData && <BeforeAfterKpiSection
              engineData={engineData}
              scenarioId={scenarioId}
            />}
          </>
        ) : (
          /* Household Prosumer View */
          <ConsumerView
            participationRate={participationRate}
            setParticipationRate={setParticipationRate}
          />
        )}

        {/* Story Narrative Walkthrough Modal */}
        <StoryModal
          isOpen={isStoryModalOpen}
          onClose={() => setIsStoryModalOpen(false)}
        />

      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', marginTop: '40px', fontSize: '0.8rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
        <p>GridFlex — Distribution Feeder Optimization Engine © 2026</p>
        <p style={{ marginTop: '4px', fontSize: '0.75rem' }}>
          Synthetic Physics Telemetry Model • Illustrative DISCOM & Prosumer Automation
        </p>
      </footer>

    </div>
  );
}
