import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export const AuthCleanup = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                // Clear any stale data
                localStorage.removeItem('sb-xkazdyvmexcofbrgzmua-auth-token');
                navigate('/auth');
            }
        });

        // Check for invalid session on mount
        const checkSession = async () => {
            try {
                const { error } = await supabase.auth.getSession();
                if (error && error.message.includes('refresh_token')) {
                    console.warn('Detected invalid refresh token, clearing session...');
                    await supabase.auth.signOut();
                    localStorage.clear(); // Force clear everything to be safe
                    navigate('/auth');
                }
            } catch (e) {
                console.error('Session check failed:', e);
            }
        };

        checkSession();

        return () => {
            subscription.unsubscribe();
        };
    }, [navigate]);

    return null;
};
