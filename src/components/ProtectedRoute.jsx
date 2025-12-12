import { Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

const ProtectedRoute = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [isApproved, setIsApproved] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const location = useLocation();
    const { toast } = useToast();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    setIsAuthenticated(false);
                    setLoading(false);
                    return;
                }

                setIsAuthenticated(true);

                // Check profile status
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('status')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error('Error fetching profile:', error);
                    // If error, default to false to be safe
                    setIsApproved(false);
                } else {
                    // If status is null/undefined, assume approved (legacy users) 
                    // OR strictly enforce 'approved'
                    // Based on migration, we set defaults to 'pending', so we should check for 'approved'
                    setIsApproved(profile?.status === 'approved');
                }
            } catch (error) {
                console.error('Auth check error:', error);
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            checkAuth();
        });

        return () => subscription.unsubscribe();
    }, []);

    // Handle unapproved users - sign out asynchronously
    useEffect(() => {
        if (!loading && isAuthenticated && !isApproved && !isSigningOut) {
            setIsSigningOut(true);

            const handleSignOut = async () => {
                try {
                    await supabase.auth.signOut();
                    toast({
                        title: "Access Denied",
                        description: "Your account is awaiting admin approval.",
                        variant: "destructive",
                    });
                } catch (error) {
                    console.error('Error signing out:', error);
                }
            };

            handleSignOut();
        }
    }, [loading, isAuthenticated, isApproved, isSigningOut, toast]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <LoadingSpinner text="Verifying access..." />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    if (!isApproved) {
        // Show loading while signing out
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <LoadingSpinner text="Signing out..." />
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
