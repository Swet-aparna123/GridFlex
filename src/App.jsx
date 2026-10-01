import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import FeederTopology from './components/FeederTopology';
import ScenarioSelector from './components/ScenarioSelector';
import ForecastSection from './components/ForecastSection';
import OptimizerSection from './components/OptimizerSection';
import ApprovalSection from './components/ApprovalSection';
import BeforeAfterKpiSection from './components/BeforeAfterKpiSection';
import ConsumerView from './components/ConsumerView';
import StoryModal from './components/StoryModal';
import { solveGridFlex } from './engine/gridflexEngine';

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('gridflex-theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const [activeView, setActiveView] = useState('discom'); // 'discom' | 'consumer'
  const [selectedFeeder, setSelectedFeeder] = useState('Feeder-04');
  const [scenarioId, setScenarioId] = useState('evening_peak');
  const [batteryEnabled, setBatteryEnabled] = useState(true);
  const [participationRate, setParticipationRate] = useState(65); // Default 65% for realistic customer trade-off
  const [batteryInitialSoC, setBatteryInitialSoC] = useState(75);
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

  // Compute GridFlex simulation results whenever parameters change
  const engineData = useMemo(() => {
    return solveGridFlex({
      scenarioId,
      batteryEnabled,
      participationRate,
      batteryInitialSoC,
      feederCapacityMW: 4.2
    });
  }, [scenarioId, batteryEnabled, participationRate, batteryInitialSoC]);

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
    setIsEngineSolving(true);
    setTimeout(() => {
      setIsEngineSolving(false);
    }, 850);
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
                participationRate={participationRate}
                currentScenario={scenarioId}
                isOptimized={true}
                engineData={engineData}
              />
            </div>

            {/* Scenario Selector & Controls */}
            <ScenarioSelector
              scenarioId={scenarioId}
              setScenarioId={(id) => {
                setScenarioId(id);
                setPlanApproved(false);
                handleRunOptimizer();
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

            {/* Stage 1: Forecast & Risk Window */}
            <ForecastSection
              scenarioId={scenarioId}
              engineData={engineData}
            />

            {/* Stage 2: AI Optimizer Dispatch & Protection Matrix */}
            <OptimizerSection
              engineData={engineData}
              batteryEnabled={batteryEnabled}
              participationRate={participationRate}
              isEngineSolving={isEngineSolving}
            />

            {/* Stage 3: Operator Plan Approval Gateway */}
            <ApprovalSection
              planApproved={planApproved}
              setPlanApproved={setPlanApproved}
              scenarioId={scenarioId}
              engineData={engineData}
            />

            {/* Stage 4: Before vs After Proof & KPI Measurement */}
            <BeforeAfterKpiSection
              engineData={engineData}
              scenarioId={scenarioId}
            />
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
