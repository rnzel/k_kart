import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function ProtectedRoute({ children }) {
    const location = useLocation();
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
                    window.location.href = '/admin';
                } else if (user.role === 'seller' && user.sellerStatus === 'approved') {
                    window.location.href = '/seller-dashboard';
                } else {
                    window.location.href = '/marketplace';
                }
            }
        } catch {
            setIsAuthenticated(false);
        }
    }, [location.pathname]);

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
