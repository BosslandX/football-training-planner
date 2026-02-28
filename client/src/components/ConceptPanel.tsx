import { useState } from 'react';
import { useStore } from '../store/useStore';
import { CATEGORIES, ELEMENT_TYPE_NAMES, TEAM_COLORS } from '../types';
import type { ElementType } from '../types';

export function ConceptPanel() {
  const [tab, setTab] = useState<'concept' | 'properties'>('concept');
  const store = useStore();
  const { concept, updateConcept, addPhase, updatePhase, removePhase, addCoachingPoint, updateCoachingPoint, addVariation, updateVariation, elements, selectedId } = store;

  const selectedEl = elements.find(e => e.id === selectedId);

  // Material count
  const materialCounts: Record<string, number> = {};
  elements.forEach(el => {
    const name = ELEMENT_TYPE_NAMES[el.type] || el.type;
    // Group player types
    const key = el.type.startsWith('player') ? 'Spieler' : name;
    materialCounts[key] = (materialCounts[key] || 0) + 1;
  });

  return (
    <div className="concept-panel">
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'concept' ? 'active' : ''}`} onClick={() => setTab('concept')}>
          Konzeption
        </button>
        <button className={`tab-btn ${tab === 'properties' ? 'active' : ''}`} onClick={() => setTab('properties')}>
          Eigenschaften
        </button>
      </div>

      {tab === 'concept' && (
        <>
          <div className="concept-section">
            <h3>Übungsinfo</h3>
            <div className="form-group">
              <label>Übungsname</label>
              <input type="text" className="form-input" value={concept.name}
                onChange={e => updateConcept({ name: e.target.value })}
                placeholder="z.B. 4 gegen 4 auf Minitore" />
            </div>
            <div className="form-group">
              <label>Kategorie</label>
              <select className="form-input" value={concept.category}
                onChange={e => updateConcept({ category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="row">
              <div className="form-group flex-1">
                <label>Dauer (min)</label>
                <input type="number" className="form-input" value={concept.duration}
                  onChange={e => updateConcept({ duration: parseInt(e.target.value) || 15 })} min={1} />
              </div>
              <div className="form-group flex-1">
                <label>Spieler</label>
                <input type="number" className="form-input" value={concept.players}
                  onChange={e => updateConcept({ players: parseInt(e.target.value) || 16 })} min={1} />
              </div>
            </div>
            <div className="form-group">
              <label>Feldgröße</label>
              <input type="text" className="form-input" value={concept.fieldSize}
                onChange={e => updateConcept({ fieldSize: e.target.value })}
                placeholder="z.B. 30x20m" />
            </div>
          </div>

          <div className="concept-section">
            <h3>Beschreibung</h3>
            <textarea className="form-input" rows={4} value={concept.description}
              onChange={e => updateConcept({ description: e.target.value })}
              placeholder="Beschreibe den Ablauf der Übung..." />
          </div>

          <div className="concept-section">
            <h3>Coaching-Punkte</h3>
            {concept.coachingPoints.map((cp, i) => (
              <div className="form-group" key={i}>
                <input type="text" className="form-input" value={cp}
                  onChange={e => updateCoachingPoint(i, e.target.value)}
                  placeholder="z.B. Freilaufverhalten" />
              </div>
            ))}
            <button className="add-btn" onClick={addCoachingPoint}>+ Coaching-Punkt</button>
          </div>

          <div className="concept-section">
            <h3>Variationen</h3>
            {concept.variations.map((v, i) => (
              <div className="form-group" key={i}>
                <input type="text" className="form-input" value={v}
                  onChange={e => updateVariation(i, e.target.value)}
                  placeholder="z.B. Nur Direktspiel" />
              </div>
            ))}
            <button className="add-btn" onClick={addVariation}>+ Variation</button>
          </div>

          <div className="concept-section">
            <h3>Phasen / Ablauf</h3>
            {concept.phases.map((phase, i) => (
              <div className="phase-item" key={phase.id}>
                <span className="phase-num">Phase {i + 1}</span>
                <button className="phase-remove" onClick={() => removePhase(phase.id)}>×</button>
                <input className="phase-input" value={phase.name}
                  onChange={e => updatePhase(phase.id, { name: e.target.value })}
                  placeholder="Name der Phase" />
                <textarea className="phase-input" value={phase.description}
                  onChange={e => updatePhase(phase.id, { description: e.target.value })}
                  placeholder="Beschreibung / Ablauf..." rows={2} />
              </div>
            ))}
            <button className="add-btn" onClick={addPhase}>+ Phase hinzufügen</button>
          </div>

          <div className="concept-section">
            <h3>Material</h3>
            {Object.keys(materialCounts).length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Keine Elemente platziert.</div>
            ) : (
              Object.entries(materialCounts).map(([name, count]) => (
                <div className="material-row" key={name}>
                  <span>{name}</span>
                  <strong>{count}×</strong>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'properties' && (
        <div className="props-section">
          <h3>Element-Eigenschaften</h3>
          {!selectedEl ? (
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Wähle ein Element auf dem Spielfeld aus.
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 10, fontWeight: 600, color: 'var(--highlight)' }}>
                {ELEMENT_TYPE_NAMES[selectedEl.type]}
              </div>
              {(selectedEl.type.startsWith('player') || selectedEl.type === 'goalkeeper') && (
                <>
                  <div className="prop-row">
                    <label>Nummer</label>
                    <input type="text" className="prop-input" value={selectedEl.number}
                      onChange={e => store.updateElement(selectedEl.id, { number: e.target.value })} />
                  </div>
                  <div className="prop-row">
                    <label>Bezeichnung</label>
                    <input type="text" className="prop-input" style={{ width: 120 }} value={selectedEl.label}
                      onChange={e => store.updateElement(selectedEl.id, { label: e.target.value })}
                      placeholder="z.B. LV" />
                  </div>
                </>
              )}
              {['player-home', 'player-away', 'player-neutral', 'goalkeeper', 'cone', 'flag', 'ring'].includes(selectedEl.type) && (
                <div className="prop-row">
                  <label>Farbe</label>
                  <div className="color-row">
                    {TEAM_COLORS.map(c => (
                      <div key={c.value}
                        className={`color-swatch${selectedEl.color === c.value ? ' active' : ''}`}
                        style={{ background: c.value }}
                        title={c.name}
                        onClick={() => store.updateElement(selectedEl.id, { color: c.value })} />
                    ))}
                  </div>
                </div>
              )}
              <div className="prop-row">
                <label>Drehung</label>
                <input type="range" min={0} max={360} value={selectedEl.rotation}
                  style={{ width: 100 }}
                  onChange={e => store.updateElement(selectedEl.id, { rotation: Number(e.target.value) })} />
              </div>
              <div className="prop-row">
                <label>Start (s)</label>
                <input type="number" className="prop-input" step={0.1} min={0}
                  value={selectedEl.startTime ?? 0}
                  onChange={e => store.updateElement(selectedEl.id, { startTime: Math.max(0, Number(e.target.value)) })} />
              </div>
              <div className="prop-row">
                <label>Ende (s)</label>
                <input type="number" className="prop-input" step={0.1} min={-1}
                  value={(selectedEl.endTime ?? -1) < 0 ? '' : selectedEl.endTime}
                  placeholder="∞"
                  onChange={e => {
                    const v = e.target.value;
                    store.updateElement(selectedEl.id, { endTime: v === '' ? -1 : Number(v) });
                  }} />
              </div>
              <div className="prop-row">
                <label>X</label>
                <input type="number" className="prop-input" value={Math.round(selectedEl.x)}
                  onChange={e => store.updateElement(selectedEl.id, { x: Number(e.target.value) })} />
              </div>
              <div className="prop-row">
                <label>Y</label>
                <input type="number" className="prop-input" value={Math.round(selectedEl.y)}
                  onChange={e => store.updateElement(selectedEl.id, { y: Number(e.target.value) })} />
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="add-btn danger" onClick={() => {
                  store.saveUndo();
                  store.removeElement(selectedEl.id);
                }}>🗑️ Element löschen</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
