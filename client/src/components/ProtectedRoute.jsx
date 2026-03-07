import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    
    useEffect(() => {
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (!token || !userData) {
            setIsAuthenticated(false);
            return;
        }
        
        try {
            const user = JSON.parse(userData);
            
            if (!user) {
                setIsAuthenticated(false);
                return;
            }
            
            setIsAuthenticated(true);
            
            // Check if user is on the root path and redirect based on role
            if (location.pathname === '/') {
                if (user.role === 'admin') {
                    navigate('/admin', { replace: true });
                } else if (user.role === 'seller' && user.sellerStatus === 'approved') {
                    navigate('/seller-dashboard', { replace: true });
                } else {
                    navigate('/marketplace', { replace: true });
                }
            }
        } catch {
            setIsAuthenticated(false);
        }
    }, [location.pathname, navigate]);

    // Show nothing while checking authentication
    if (isAuthenticated === null) {
        return null;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;
