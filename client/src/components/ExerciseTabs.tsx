import { useStore } from '../store/useStore';

export function ExerciseTabs() {
  const exercises = useStore(s => s.exercises);
  const currentIndex = useStore(s => s.currentExerciseIndex);
  const currentConceptName = useStore(s => s.concept.name);
  const switchExercise = useStore(s => s.switchExercise);

  if (exercises.length <= 1) return null;

  return (
    <div className="exercise-tabs">
      {exercises.map((ex, i) => {
        const name = i === currentIndex
          ? (currentConceptName || `Übung ${i + 1}`)
          : (ex.concept.name || `Übung ${i + 1}`);
        return (
          <button
            key={i}
            className={`exercise-tab ${i === currentIndex ? 'active' : ''}`}
            onClick={() => switchExercise(i)}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
