import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';

interface SessionSummary {
  id: number;
  topic_de: string;
  topic_en: string;
  total_duration_min: number;
  intensity_level: string;
  age_code: string;
  age_name: string;
  drill_count: number;
}

const INTENSITY_LABELS: Record<string, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
};

export function SessionBrowser({ onClose }: { onClose: () => void }) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        setSessions(data.sessions);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleImport = useCallback(async (sessionId: number) => {
    const state = useStore.getState();
    const hasContent = state.elements.length > 0 || state.exercises.length > 1;
    if (hasContent && !confirm('Alle aktuellen Uebungen werden ersetzt. Fortfahren?')) {
      return;
    }

    setImporting(sessionId);
    try {
      const resp = await fetch(`/api/sessions/${sessionId}`);
      if (!resp.ok) {
        const err = await resp.json();
        alert(`Import fehlgeschlagen: ${err.error || 'Unbekannter Fehler'}`);
        return;
      }
      const data = await resp.json();
      state.importTrainingPlan(data);
      onClose();
    } catch {
      alert('Import fehlgeschlagen: Server nicht erreichbar');
    } finally {
      setImporting(null);
    }
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Trainingseinheiten</h2>
          <button style={closeBtnStyle} onClick={onClose}>X</button>
        </div>

        {loading && <p style={msgStyle}>Lade Sessions...</p>}
        {error && <p style={{ ...msgStyle, color: '#e74c3c' }}>Fehler: {error}</p>}

        {!loading && !error && sessions.length === 0 && (
          <p style={msgStyle}>Keine Sessions vorhanden.</p>
        )}

        {!loading && !error && sessions.length > 0 && (
          <div style={listStyle}>
            {sessions.map(s => (
              <div key={s.id} style={rowStyle}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    #{s.id} {s.topic_de}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {s.age_name} &middot; {INTENSITY_LABELS[s.intensity_level] || s.intensity_level} &middot; {s.total_duration_min} min &middot; {s.drill_count} Uebungen
                  </div>
                </div>
                <button
                  style={importBtnStyle}
                  onClick={() => handleImport(s.id)}
                  disabled={importing !== null}
                >
                  {importing === s.id ? '...' : 'Laden'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline styles

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  background: '#1e1e2e',
  borderRadius: 8,
  width: 520,
  maxHeight: '70vh',
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid #333',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: '1px solid #333',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  fontSize: 16,
  cursor: 'pointer',
  padding: '4px 8px',
};

const listStyle: React.CSSProperties = {
  overflowY: 'auto',
  padding: '8px 0',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 16px',
  borderBottom: '1px solid #2a2a3a',
  gap: 12,
};

const importBtnStyle: React.CSSProperties = {
  background: '#3498db',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '6px 14px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

const msgStyle: React.CSSProperties = {
  padding: '24px 16px',
  textAlign: 'center',
  color: '#888',
};
