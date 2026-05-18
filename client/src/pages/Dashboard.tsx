import { useAuthStore } from '../store/authStore';
import { Button } from '@/components/ui/button';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const user = useAuthStore(s => s.user);
  const clearUser = useAuthStore(s => s.clearUser);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      clearUser();
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p>Welcome, {user?.displayName}</p>
      <Button onClick={handleLogout} className="mt-4" variant="destructive">Logout</Button>
    </div>
  );
}
