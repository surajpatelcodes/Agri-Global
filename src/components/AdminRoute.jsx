import { Navigate, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const AdminRoute = ({ children }) => {
    const { role, loading } = useUserRole();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <LoadingSpinner text="Verifying admin access..." />
            </div>
        );
    }

    if (role !== 'admin') {
        // Redirect to home if logged in but not admin, or auth if not logged in
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return children;
};

export default AdminRoute;
