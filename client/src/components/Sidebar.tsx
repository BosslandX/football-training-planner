import { useState } from 'react';
import { useStore } from '../store/useStore';
import { TEAM_COLORS, DRAW_COLORS } from '../types';
import type { ElementType, ToolMode } from '../types';

interface ToolDef {
  type: ElementType;
  icon: string;
  label: string;
}

const PLAYER_TOOLS: ToolDef[] = [
  { type: 'player-run', icon: '🏃', label: 'Laufen' },
  { type: 'player-stand', icon: '🧍', label: 'Stehen' },
  { type: 'player-pass', icon: '⚡', label: 'Passen' },
  { type: 'goalkeeper', icon: '🧤', label: 'Torwart' },
  { type: 'trainer', icon: '👨‍🏫', label: 'Trainer' },
  { type: 'dummy', icon: '🧱', label: 'Dummy' },
];

const EQUIPMENT_TOOLS: ToolDef[] = [
  { type: 'ball', icon: '⚽', label: 'Ball' },
  { type: 'cone', icon: '🔶', label: 'Hütchen' },
  { type: 'pole', icon: '│', label: 'Stange' },
  { type: 'ladder', icon: '🪜', label: 'Leiter' },
  { type: 'flag', icon: '🚩', label: 'Flagge' },
  { type: 'ring', icon: '⭕', label: 'Ring' },
];

const GOAL_TOOLS: ToolDef[] = [
  { type: 'goal-large', icon: '🥅', label: 'Großtor' },
  { type: 'goal-small', icon: '⊓', label: 'Minitor' },
  { type: 'goal-cone', icon: '⋮⋮', label: 'Hütchentor' },
];

const DRAW_TOOLS: { mode: ToolMode; label: string }[] = [
  { mode: 'arrow', label: '→ Pfeil' },
  { mode: 'dashed', label: '┅ Gestrichelt' },
  { mode: 'curved', label: '↝ Kurve' },
  { mode: 'zone', label: '▭ Zone' },
  { mode: 'text', label: 'T Text' },
];

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`sidebar-section ${!open ? 'collapsed' : ''}`}>
      <div className="sidebar-section-header" onClick={() => setOpen(!open)}>
        {title} <span>{open ? '▾' : '▸'}</span>
      </div>
      <div className="sidebar-section-content">{children}</div>
    </div>
  );
}

function ToolGrid({ tools }: { tools: ToolDef[] }) {
  return (
    <div className="tool-grid">
      {tools.map(t => (
        <div
          key={t.type}
          className="tool-item"
          draggable
          onDragStart={e => e.dataTransfer.setData('elementType', t.type)}
        >
          <div className="icon">{t.icon}</div>
          {t.label}
        </div>
      ))}
    </div>
  );
}

export function Sidebar() {
  const { selectedColor, setSelectedColor, drawColor, setDrawColor, mode, setMode, selectedId, elements, addKeyframe, clearKeyframes, animTime } = useStore();

  const selectedEl = elements.find(e => e.id === selectedId);

  return (
    <div className="sidebar">
      <Section title="Teamfarbe">
        <div className="color-row">
          {TEAM_COLORS.map(c => (
            <div
              key={c.value}
              className={`color-swatch ${selectedColor === c.value ? 'active' : ''}`}
              style={{ background: c.value }}
              title={c.name}
              onClick={() => {
                setSelectedColor(c.value);
                if (selectedEl && (selectedEl.type.startsWith('player') || selectedEl.type === 'goalkeeper')) {
                  useStore.getState().updateElement(selectedEl.id, { color: c.value });
                }
              }}
            />
          ))}
        </div>
      </Section>

      <Section title="Spieler">
        <ToolGrid tools={PLAYER_TOOLS} />
      </Section>

      <Section title="Ausrüstung">
        <ToolGrid tools={EQUIPMENT_TOOLS} />
      </Section>

      <Section title="Tore">
        <ToolGrid tools={GOAL_TOOLS} />
      </Section>

      <Section title="Zeichnen">
        <div className="draw-tools">
          {DRAW_TOOLS.map(d => (
            <button
              key={d.mode}
              className={`draw-btn ${mode === d.mode ? 'active' : ''}`}
              onClick={() => setMode(d.mode)}
            >{d.label}</button>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>Linienfarbe</label>
          <div className="color-row">
            {DRAW_COLORS.map(c => (
              <div
                key={c}
                className={`color-swatch ${drawColor === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setDrawColor(c)}
              />
            ))}
          </div>
        </div>
      </Section>

      <Section title="Animation">
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
          Wähle ein Element, positioniere es und füge Keyframes hinzu.
        </div>
        <button
          className="add-btn"
          onClick={() => {
            if (selectedId) {
              const el = elements.find(e => e.id === selectedId);
              if (el) {
                useStore.getState().saveUndo();
                addKeyframe(selectedId, { t: animTime, x: el.x, y: el.y, rotation: el.rotation });
              }
            }
          }}
          disabled={!selectedId}
        >+ Keyframe hinzufügen</button>
        <div style={{ marginTop: 8 }}>
          <button
            className="add-btn danger"
            onClick={() => selectedId && clearKeyframes(selectedId)}
            disabled={!selectedId}
          >Keyframes löschen</button>
        </div>
        {selectedEl && selectedEl.keyframes.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12 }}>
            {selectedEl.keyframes.map((kf, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span>{kf.t.toFixed(1)}s — ({Math.round(kf.x)}, {Math.round(kf.y)})</span>
                <button
                  onClick={() => useStore.getState().removeKeyframe(selectedEl.id, i)}
                  style={{ background: 'none', border: 'none', color: 'var(--highlight)', cursor: 'pointer' }}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
