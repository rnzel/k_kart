import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function ProtectedRoute({ children }) {
    const location = useLocation();
    
    useEffect(() => {
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!token || !user) {
            // Redirect to login if not authenticated
            return;
        }
        
        // Check if user is on the root path and redirect based on role
        if (location.pathname === '/') {
            if (user.role === 'seller') {
                window.location.href = '/seller-dashboard';
            } else {
                window.location.href = '/dashboard';
            }
        }
    }, [location.pathname]);

    return children;
}

export default ProtectedRoute;