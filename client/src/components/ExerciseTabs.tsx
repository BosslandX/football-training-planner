import { useStore } from '../store/useStore';

export function ExerciseTabs() {
  const exercises = useStore(s => s.exercises);
  const currentIndex = useStore(s => s.currentExerciseIndex);
  const currentConceptName = useStore(s => s.concept.name);
  const switchExercise = useStore(s => s.switchExercise);
  const addExercise = useStore(s => s.addExercise);
  const removeExercise = useStore(s => s.removeExercise);

  const tabCount = Math.max(exercises.length, 1);

  return (
    <div className="exercise-tabs">
      {Array.from({ length: tabCount }, (_, i) => {
        const name = i === currentIndex
          ? (currentConceptName || `Übung ${i + 1}`)
          : (exercises[i]?.concept.name || `Übung ${i + 1}`);
        return (
          <button
            key={i}
            className={`exercise-tab ${i === currentIndex ? 'active' : ''}`}
            onClick={() => switchExercise(i)}
          >
            {name}
            {tabCount > 1 && (
              <span
                className="exercise-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`"${name}" löschen?`)) {
                    removeExercise(i);
                  }
                }}
                title="Übung löschen"
              >×</span>
            )}
          </button>
        );
      })}
      <button
        className="exercise-tab exercise-tab-add"
        onClick={addExercise}
        title="Neue Übung hinzufügen"
      >+</button>
    </div>
  );
}
