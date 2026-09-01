import { useRSAStore } from './stores/useRSAStore';
import { Setup } from './components/Setup';
import { ProfileOnboarding } from './components/ProfileOnboarding';
import { CheckIn } from './components/CheckIn';
import { Landing } from './components/Landing';
import { Crisis } from './components/Crisis';
import { StepFlow } from './components/StepFlow';
import { Summary } from './components/Summary';
import { Journal } from './components/Journal';
import './App.css';

function App() {
  const { view, currentUser } = useRSAStore();

  return (
    <div className="app">
      {!currentUser ? (
        <>
          {view === 'setup' && <Setup />}
        </>
      ) : (
        <>
          {view === 'profile' && <ProfileOnboarding />}
          {view === 'checkin' && <CheckIn />}
          {view === 'landing' && <Landing />}
          {view === 'crisis' && <Crisis />}
          {view === 'flow' && <StepFlow />}
          {view === 'summary' && <Summary />}
          {view === 'journal' && <Journal />}
        </>
      )}
    </div>
  );
}

export default App;
