import { useStore } from './store/useStore';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { FieldCanvas } from './components/FieldCanvas';
import { AnimationBar } from './components/AnimationBar';
import { ConceptPanel } from './components/ConceptPanel';
import './styles.css';

export default function App() {
  const showConcept = useStore(s => s.showConcept);

  return (
    <div className="app">
      <TopBar />
      <div className="main">
        <Sidebar />
        <div className="canvas-area">
          <FieldCanvas />
          <AnimationBar />
        </div>
        {showConcept && <ConceptPanel />}
      </div>
    </div>
  );
}
