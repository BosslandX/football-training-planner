import { useStore } from '../store/useStore';
import { CATEGORY_KEYS, TEAM_COLORS, getElementTypeName } from '../types';
import type { ElementType } from '../types';
import { t, useLocale } from '../i18n';

export function ConceptPanel() {
  useLocale(s => s.locale);
  const store = useStore();
  const { concept, updateConcept, addPhase, updatePhase, removePhase, addCoachingPoint, updateCoachingPoint, addVariation, updateVariation, elements, selectedId, mobileDrawer, showConcept, conceptTab: tab, setConceptTab: setTab } = store;

  const selectedEl = elements.find(e => e.id === selectedId);

  // Material count
  const materialCounts: Record<string, number> = {};
  elements.forEach(el => {
    const name = getElementTypeName(el.type);
    // Group player types
    const key = el.type.startsWith('player') ? t('concept.playerGroup') : name;
    materialCounts[key] = (materialCounts[key] || 0) + 1;
  });

  return (
    <div className={`concept-panel ${mobileDrawer === 'concept' ? 'open' : ''} ${!showConcept ? 'hidden-desktop' : ''}`}>
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'concept' ? 'active' : ''}`} onClick={() => setTab('concept')}>
          {t('concept.concept')}
        </button>
        <button className={`tab-btn ${tab === 'properties' ? 'active' : ''}`} onClick={() => setTab('properties')}>
          {t('concept.properties')}
        </button>
      </div>

      {tab === 'concept' && (
        <>
          <div className="concept-section">
            <h3>{t('concept.exerciseInfo')}</h3>
            <div className="form-group">
              <label>{t('concept.exerciseName')}</label>
              <input type="text" className="form-input" value={concept.name}
                onChange={e => updateConcept({ name: e.target.value })}
                placeholder={t('concept.placeholderName')} />
            </div>
            <div className="form-group">
              <label>{t('concept.category')}</label>
              <select className="form-input" value={concept.category}
                onChange={e => updateConcept({ category: e.target.value })}>
                {CATEGORY_KEYS.map(key => <option key={key} value={key}>{t(key)}</option>)}
              </select>
            </div>
            <div className="row">
              <div className="form-group flex-1">
                <label>{t('concept.duration')}</label>
                <input type="number" className="form-input" value={concept.duration}
                  onChange={e => updateConcept({ duration: parseInt(e.target.value) || 15 })} min={1} />
              </div>
              <div className="form-group flex-1">
                <label>{t('concept.players')}</label>
                <input type="number" className="form-input" value={concept.players}
                  onChange={e => updateConcept({ players: parseInt(e.target.value) || 16 })} min={1} />
              </div>
            </div>
            <div className="form-group">
              <label>{t('concept.fieldSize')}</label>
              <input type="text" className="form-input" value={concept.fieldSize}
                onChange={e => updateConcept({ fieldSize: e.target.value })}
                placeholder={t('concept.placeholderFieldSize')} />
            </div>
          </div>

          <div className="concept-section">
            <h3>{t('concept.description')}</h3>
            <textarea className="form-input" rows={4} value={concept.description}
              onChange={e => updateConcept({ description: e.target.value })}
              placeholder={t('concept.placeholderDesc')} />
          </div>

          <div className="concept-section">
            <h3>{t('concept.coachingPoints')}</h3>
            {concept.coachingPoints.map((cp, i) => (
              <div className="form-group" key={i}>
                <input type="text" className="form-input" value={cp}
                  onChange={e => updateCoachingPoint(i, e.target.value)}
                  placeholder={t('concept.placeholderCoachingPoint')} />
              </div>
            ))}
            <button className="add-btn" onClick={addCoachingPoint}>{t('concept.addCoachingPoint')}</button>
          </div>

          <div className="concept-section">
            <h3>{t('concept.variations')}</h3>
            {concept.variations.map((v, i) => (
              <div className="form-group" key={i}>
                <input type="text" className="form-input" value={v}
                  onChange={e => updateVariation(i, e.target.value)}
                  placeholder={t('concept.placeholderVariation')} />
              </div>
            ))}
            <button className="add-btn" onClick={addVariation}>{t('concept.addVariation')}</button>
          </div>

          <div className="concept-section">
            <h3>{t('concept.phases')}</h3>
            {concept.phases.map((phase, i) => (
              <div className="phase-item" key={phase.id}>
                <span className="phase-num">{t('concept.phase', { n: i + 1 })}</span>
                <button className="phase-remove" onClick={() => removePhase(phase.id)}>×</button>
                <input className="phase-input" value={phase.name}
                  onChange={e => updatePhase(phase.id, { name: e.target.value })}
                  placeholder={t('concept.placeholderPhaseName')} />
                <textarea className="phase-input" value={phase.description}
                  onChange={e => updatePhase(phase.id, { description: e.target.value })}
                  placeholder={t('concept.placeholderPhaseDesc')} rows={2} />
              </div>
            ))}
            <button className="add-btn" onClick={addPhase}>{t('concept.addPhase')}</button>
          </div>

          <div className="concept-section">
            <h3>{t('concept.material')}</h3>
            {Object.keys(materialCounts).length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t('concept.noElements')}</div>
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
          <h3>{t('concept.elementProperties')}</h3>
          {!selectedEl ? (
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {t('concept.selectElement')}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 10, fontWeight: 600, color: 'var(--highlight)' }}>
                {getElementTypeName(selectedEl.type)}
              </div>
              {(selectedEl.type.startsWith('player') || selectedEl.type === 'goalkeeper' || selectedEl.type === 'trainer') && (
                <>
                  <div className="prop-row">
                    <label>{t('concept.number')}</label>
                    <input type="text" className="prop-input" value={selectedEl.number}
                      onChange={e => store.updateElement(selectedEl.id, { number: e.target.value })} />
                  </div>
                  <div className="prop-row">
                    <label>{t('concept.designation')}</label>
                    <input type="text" className="prop-input" style={{ width: 120 }} value={selectedEl.label}
                      onChange={e => store.updateElement(selectedEl.id, { label: e.target.value })}
                      placeholder={t('concept.placeholderLabel')} />
                  </div>
                  <div className="prop-row">
                    <label>{t('concept.color')}</label>
                    <div className="color-row">
                      {TEAM_COLORS.map(c => (
                        <div key={c.value}
                          className={`color-swatch${selectedEl.color === c.value ? ' active' : ''}`}
                          style={{ background: c.value }}
                          title={t(c.nameKey)}
                          onClick={() => store.updateElement(selectedEl.id, { color: c.value })} />
                      ))}
                    </div>
                  </div>
                  <div className="prop-row">
                    <label>{t('concept.size')}</label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {([1, 2, 3] as const).map(lvl => (
                        <button key={lvl}
                          className={`topbar-btn${(selectedEl.scale ?? 1) === lvl ? ' active' : ''}`}
                          style={{ padding: '3px 10px', fontSize: 12 }}
                          onClick={() => store.updateElement(selectedEl.id, { scale: lvl })}
                        >{lvl === 1 ? 'S' : lvl === 2 ? 'M' : 'L'}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {['cone', 'flag', 'ring'].includes(selectedEl.type) && (
                <div className="prop-row">
                  <label>{t('concept.color')}</label>
                  <div className="color-row">
                    {TEAM_COLORS.map(c => (
                      <div key={c.value}
                        className={`color-swatch${selectedEl.color === c.value ? ' active' : ''}`}
                        style={{ background: c.value }}
                        title={t(c.nameKey)}
                        onClick={() => store.updateElement(selectedEl.id, { color: c.value })} />
                    ))}
                  </div>
                </div>
              )}
              <div className="prop-row">
                <label>{t('concept.rotation')}</label>
                <input type="range" min={0} max={360} value={selectedEl.rotation}
                  style={{ width: 100 }}
                  onChange={e => store.updateElement(selectedEl.id, { rotation: Number(e.target.value) })} />
              </div>
              <div className="prop-row">
                <label>{t('concept.startTime')}</label>
                <input type="number" className="prop-input" step={0.1} min={0}
                  value={selectedEl.startTime ?? 0}
                  onChange={e => store.updateElement(selectedEl.id, { startTime: Math.max(0, Number(e.target.value)) })} />
              </div>
              <div className="prop-row">
                <label>{t('concept.endTime')}</label>
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
                }}>🗑️ {t('concept.deleteElement')}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
