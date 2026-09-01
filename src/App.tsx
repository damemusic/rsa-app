import { useRSAStore } from './stores/useRSAStore';
import { Landing } from './components/Landing';
import { Crisis } from './components/Crisis';
import { StepFlow } from './components/StepFlow';
import { Summary } from './components/Summary';
import { Journal } from './components/Journal';
import './App.css';

function App() {
  const { view } = useRSAStore();

  return (
    <div className="app">
      {view === 'landing' && <Landing />}
      {view === 'crisis' && <Crisis />}
      {view === 'flow' && <StepFlow />}
      {view === 'summary' && <Summary />}
      {view === 'journal' && <Journal />}
    </div>
  );
}

export default App;
