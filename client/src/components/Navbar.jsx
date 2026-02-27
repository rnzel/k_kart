import { useState, useEffect } from 'react'
import { Link, useNavigate } from "react-router-dom";
import { FiUser, FiLogOut, FiShoppingBag, FiShield } from "react-icons/fi";

function Navbar() {
    const navigate = useNavigate();

    // State to track user data - triggers re-render when updated
    const [user, setUser] = useState(() => {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
        } catch {
            return null;
        }
    });
    
    // Get user initials (first letter of firstName + first letter of lastName)
    const userInitials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : '';

    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    // Close dropdown when clicking outside - with proper cleanup
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.user-avatar')) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        
        // Cleanup event listener on component unmount
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // Listen for storage changes (e.g., from other tabs) and profile updates
    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const userData = localStorage.getItem('user');
                setUser(userData ? JSON.parse(userData) : null);
            } catch {
                setUser(null);
            }
        };

        // Check for updates every 500ms (polling for profile changes)
        const interval = setInterval(handleStorageChange, 500);

        // Also listen to storage event for cross-tab sync
        window.addEventListener('storage', handleStorageChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    return (
        <nav className="navbar navbar-expand-lg navbar-light border-bottom" style={{ zIndex: 1050 }}>
            <div className="container d-flex justify-content-between align-items-center">
                <Link to="/marketplace" className="navbar-brand">KampusKart</Link> 
                
                {/* User Avatar with Dropdown */}
                <div className="position-relative">
                    <div 
                        className="user-avatar d-flex rounded-circle bg-primary text-white fw-bold align-items-center justify-content-center" 
                        style={{width:40,height:40,borderRadius:'50%',cursor:'pointer'}}
                        onClick={toggleDropdown}
                    >
                        {userInitials}
                    </div>
                    
                    {/* Dropdown Menu */}
                    {dropdownOpen && (
                        <div className="position-absolute end-0 mt-2 bg-white border border-black rounded" style={{minWidth:'230px',zIndex:1050}}>
                            <div className="px-3 py-2 border-bottom">
                                <strong>{user?.firstName} {user?.lastName}</strong>
                                <div className="text-muted small">{user?.email}</div>
                            </div>

                            {/* Hide Profile for admin users */}
                            {user?.role !== 'admin' && (
                                <div className='item d-flex align-items-center px-3'>
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiUser size={18} /></div>
                                    <Link to="/dashboard" className="dropdown-item px-3 py-2 w-100 text-start border-0 bg-transparent">
                                        Profile
                                    </Link>
                                </div>
                            )}

                            {user?.role === 'seller' && (
                                <div className='item d-flex align-items-center px-3'>
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiShoppingBag size={18} /></div>
                                    <Link to="/seller-dashboard" className="dropdown-item px-3 py-2 w-100 text-start border-0 bg-transparent">
                                        Seller Dashboard
                                    </Link>
                                </div>
                            )}

                            <div className='item d-flex align-items-center px-3'>
                                <div className="me-2 d-flex align-items-center justify-content-center text-danger"><FiLogOut size={18} /></div>
                                <button className="dropdown-item px-3 py-2 text-danger w-100 text-start border-0 bg-transparent" onClick={handleLogout}>
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
