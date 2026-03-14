import { useStore } from '../store/useStore';
import { t, useLocale } from '../i18n';

export function ExerciseTabs() {
  useLocale(s => s.locale);
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
          ? (currentConceptName || t('exercises.exercise', { n: i + 1 }))
          : (exercises[i]?.concept.name || t('exercises.exercise', { n: i + 1 }));
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
                  if (confirm(t('exercises.confirmDelete', { name }))) {
                    removeExercise(i);
                  }
                }}
                title={t('exercises.deleteExercise')}
              >×</span>
            )}
          </button>
        );
      })}
      <button
        className="exercise-tab exercise-tab-add"
        onClick={addExercise}
        title={t('exercises.addExercise')}
      >+</button>
    </div>
  );
}
