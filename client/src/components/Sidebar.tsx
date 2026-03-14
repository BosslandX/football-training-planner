import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { TEAM_COLORS, DRAW_COLORS } from '../types';
import type { ElementType, ToolMode } from '../types';
import { getPlayerSvg, type PlayerPose } from '../utils/playerSvg';
import { t, useLocale } from '../i18n';

const POSE_MAP: Partial<Record<ElementType, PlayerPose>> = {
  'player-run': 'run',
  'player-stand': 'stand',
  'player-pass': 'pass',
  'goalkeeper': 'goalkeeper',
  'trainer': 'trainer',
};

interface ToolDef {
  type: ElementType;
  icon: string;
  labelKey: string;
}

const PLAYER_TOOLS: ToolDef[] = [
  { type: 'player-run', icon: '🏃', labelKey: 'tools.playerRun' },
  { type: 'player-stand', icon: '🧍', labelKey: 'tools.playerStand' },
  { type: 'player-pass', icon: '⚡', labelKey: 'tools.playerPass' },
  { type: 'goalkeeper', icon: '🧤', labelKey: 'tools.goalkeeper' },
  { type: 'trainer', icon: '👨‍🏫', labelKey: 'tools.trainer' },
  { type: 'dummy', icon: '🧱', labelKey: 'tools.dummy' },
];

const EQUIPMENT_TOOLS: ToolDef[] = [
  { type: 'ball', icon: '⚽', labelKey: 'tools.ball' },
  { type: 'cone', icon: '🔶', labelKey: 'tools.cone' },
  { type: 'pole', icon: '│', labelKey: 'tools.pole' },
  { type: 'ladder', icon: '🪜', labelKey: 'tools.ladder' },
  { type: 'flag', icon: '🚩', labelKey: 'tools.flag' },
  { type: 'ring', icon: '⭕', labelKey: 'tools.ring' },
];

const GOAL_TOOLS: ToolDef[] = [
  { type: 'goal-large', icon: '🥅', labelKey: 'tools.goalLarge' },
  { type: 'goal-small', icon: '⊓', labelKey: 'tools.goalSmall' },
  { type: 'goal-cone', icon: '⋮⋮', labelKey: 'tools.goalCone' },
];

const DRAW_TOOL_DEFS: { mode: ToolMode; icon: string; labelKey: string }[] = [
  { mode: 'select', icon: '⊹', labelKey: 'tools.select' },
  { mode: 'arrow', icon: '→', labelKey: 'tools.arrow' },
  { mode: 'dashed', icon: '┅', labelKey: 'tools.dashed' },
  { mode: 'curved', icon: '↝', labelKey: 'tools.curved' },
  { mode: 'zone', icon: '▭', labelKey: 'tools.zone' },
  { mode: 'text', icon: 'T', labelKey: 'tools.text' },
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

function PlayerIcon({ type, color }: { type: ElementType; color: string }) {
  const pose = POSE_MAP[type];
  const svgUrl = useMemo(() => {
    if (!pose) return null;
    const svg = getPlayerSvg(pose, color);
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }, [pose, color, type]);

  if (!svgUrl) return null;
  return <img src={svgUrl} alt="" style={{ width: 24, height: 32 }} draggable={false} />;
}

function ToolGrid({ tools }: { tools: ToolDef[] }) {
  const { placementType, setPlacementType, selectedColor } = useStore();

  return (
    <div className="tool-grid">
      {tools.map(tool => {
        const hasSvg = !!POSE_MAP[tool.type];
        const isActive = placementType === tool.type;

        return (
          <div
            key={tool.type}
            className={`tool-item${isActive ? ' active' : ''}`}
            draggable
            onDragStart={e => {
              e.dataTransfer.setData('elementType', tool.type);
              setPlacementType(null);
            }}
            onClick={() => setPlacementType(isActive ? null : tool.type)}
          >
            <div className="icon">
              {hasSvg ? <PlayerIcon type={tool.type} color={selectedColor} /> : tool.icon}
            </div>
            {t(tool.labelKey)}
          </div>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  useLocale(s => s.locale);
  const { selectedColor, setSelectedColor, drawColor, setDrawColor, mode, setMode, selectedId, elements, addKeyframe, clearKeyframes, animTime, mobileDrawer } = useStore();

  const selectedEl = elements.find(e => e.id === selectedId);

  return (
    <div className={`sidebar ${mobileDrawer === 'sidebar' ? 'open' : ''}`}>
      <Section title={t('sidebar.teamColor')}>
        <div className="color-row">
          {TEAM_COLORS.map(c => (
            <div
              key={c.value}
              className={`color-swatch ${selectedColor === c.value ? 'active' : ''}`}
              style={{ background: c.value }}
              title={t(c.nameKey)}
              onClick={() => {
                setSelectedColor(c.value);
                if (selectedEl && (selectedEl.type.startsWith('player') || selectedEl.type === 'goalkeeper' || selectedEl.type === 'trainer')) {
                  useStore.getState().updateElement(selectedEl.id, { color: c.value });
                }
              }}
            />
          ))}
        </div>
      </Section>

      <Section title={t('sidebar.players')}>
        <ToolGrid tools={PLAYER_TOOLS} />
      </Section>

      <Section title={t('sidebar.equipment')}>
        <ToolGrid tools={EQUIPMENT_TOOLS} />
      </Section>

      <Section title={t('sidebar.goals')}>
        <ToolGrid tools={GOAL_TOOLS} />
      </Section>

      <Section title={t('sidebar.drawing')}>
        <div className="draw-tools">
          {DRAW_TOOL_DEFS.map(d => (
            <button
              key={d.mode}
              className={`draw-btn ${mode === d.mode ? 'active' : ''}`}
              onClick={() => setMode(d.mode)}
            >{d.icon} {t(d.labelKey)}</button>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t('sidebar.lineColor')}</label>
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

      <Section title={t('sidebar.animation')}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
          {t('sidebar.animHint')}
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
        >{t('sidebar.addKeyframe')}</button>
        <div style={{ marginTop: 8 }}>
          <button
            className="add-btn danger"
            onClick={() => selectedId && clearKeyframes(selectedId)}
            disabled={!selectedId}
          >{t('sidebar.clearKeyframes')}</button>
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
