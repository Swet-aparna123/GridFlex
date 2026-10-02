import { useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';

export default function GeminiAdvisor({ scenario, kpis, protection }) {
  const [advice, setAdvice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getAdvice = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/grid-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, kpis, protection }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gemini request failed.');
      setAdvice(result.text || 'Gemini returned an empty response.');
    } catch (requestError) {
      setError(requestError.message || 'Could not reach the GridFlex API server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }} aria-labelledby="gemini-advisor-title">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 id="gemini-advisor-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-heading)', fontSize: '1.1rem' }}>
            <Bot size={20} color="var(--ai-purple)" /> AI Grid Advisor
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '5px' }}>
            Ask Gemini to explain the current synthetic scenario and optimizer results.
          </p>
        </div>
        <button type="button" onClick={getAdvice} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: 0, borderRadius: '8px', padding: '10px 14px', background: 'var(--ai-purple)', color: '#fff', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          <Sparkles size={16} /> {loading ? 'Analyzing…' : advice ? 'Refresh explanation' : 'Explain results'}
        </button>
      </div>
      {error && <p role="alert" style={{ color: 'var(--danger, #f87171)', marginTop: '14px', fontSize: '0.88rem' }}>{error}</p>}
      {advice && <div aria-live="polite" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-main)', marginTop: '16px', padding: '14px', borderRadius: '8px', background: 'var(--bg-panel-nested)', border: '1px solid var(--border-color)' }}>{advice}</div>}
    </section>
  );
}
