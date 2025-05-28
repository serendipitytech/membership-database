import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function RequireAuth({ children, adminOnly = false }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      if (adminOnly) {
        const { data: isAdmin, error } = await supabase.rpc('is_admin', { user_id: user.id });
        if (error || !isAdmin) {
          navigate('/not-authorized');
          return;
        }
      }
      setAllowed(true);
      setLoading(false);
    }
    check();
  }, [adminOnly, navigate]);

  if (loading) return <div className="flex items-center justify-center h-screen text-lg">Loading...</div>;
  if (!allowed) return null;
  return children;
} 