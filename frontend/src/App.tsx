import { AuthForm } from './components/AuthForm';
import { AvatarPreview } from './components/AvatarPreview';
import { useAuthStore } from './store/auth';
import './App.css';

function App() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!token || !user) {
    return <AuthForm />;
  }

  return (
    <div className="signed-in">
      <AvatarPreview seed={user.avatarSeed} size={48} />
      <p>Signed in as {user.name}</p>
      <button type="button" className="link-button" onClick={logout}>
        Log out
      </button>
    </div>
  );
}

export default App;
