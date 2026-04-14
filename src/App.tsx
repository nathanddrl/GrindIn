import { useGameLoop } from './hooks/useGameLoop';
import { useAutoSave } from './hooks/useAutoSave';

function App() {
  useGameLoop();
  useAutoSave();

  return (
    <>
    </>
  );
}

export default App;
