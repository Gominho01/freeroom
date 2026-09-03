import { AuthForm } from './components/AuthForm';
import { RoomsPage } from './pages/RoomsPage';
import { useAuthStore } from './store/auth';
import './App.css';

function App() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  if (!token || !user) {
    return <AuthForm />;
  }

  return <RoomsPage />;
}

export default App;
