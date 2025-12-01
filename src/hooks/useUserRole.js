import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = () => {
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session?.user) {
                    setRole(null);
                    setLoading(false);
                    return;
                }

                // Check if the user has an admin role using the secure RPC function
                const { data: hasAdminRole, error } = await supabase
                    .rpc('has_role', {
                        _user_id: session.user.id,
                        _role: 'admin'
                    });

                if (error) {
                    console.error('Error fetching user role:', error);
                    setRole(null);
                } else {
                    setRole(hasAdminRole ? 'admin' : 'user');
                }
            } catch (error) {
                console.error('Error in useUserRole:', error);
                setRole(null);
            } finally {
                setLoading(false);
            }
        };

        fetchRole();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchRole();
        });

        return () => subscription.unsubscribe();
    }, []);

    return { role, loading, isAdmin: role === 'admin' };
};
