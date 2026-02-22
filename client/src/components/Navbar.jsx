import { useState } from 'react'
import { Link, useNavigate } from "react-router-dom";
import { useLocation } from 'react-router-dom';
import { FiUser } from "react-icons/fi";
import { FiLogOut } from "react-icons/fi";
import { FiSearch } from 'react-icons/fi';

function Navbar() {
    const navigate = useNavigate();

    // Get user data from localStorage
    const user = JSON.parse(localStorage.getItem('user'));  
    
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

    // Close dropdown when clicking outside
    const handleClickOutside = (e) => {
        if (!e.target.closest('.user-avatar')) {
            setDropdownOpen(false);
        }
    };

    // Add event listener for click outside
    document.addEventListener('click', handleClickOutside);

    return (
        <nav className="navbar navbar-expand-lg navbar-light border-bottom">
            <div className="container d-flex justify-content-between align-items-center">
                <Link className="navbar-brand">KampusKart</Link> 

                {/* { location.pathname === '/dashboard' && (
                    <div>
                        <input className="d-flex search-bar rounded border border-black p-2" style={{ width: "700px"}} type="text" name="" id="" value="Search shops and products..."/>
                        <FiSearch 
                            className='postion-absolute'> 

                    </div>
                )} */}
                
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
                        <div className="position-absolute end-0 mt-2 bg-white border border-black rounded" style={{minWidth:'230px',zIndex:1000}}>
                            <div className="px-3 py-2 border-bottom">
                                <strong>{user?.firstName} {user?.lastName}</strong>
                                <div className="text-muted small">{user?.email}</div>
                            </div>

                            <div className='item d-flex align-items-center px-3'>
                                <div className="me-2 d-flex align-items-center justify-content-center"><FiUser size={18} /></div>
                                <Link to="/profile" className="dropdown-item px-3 py-2 w-100 text-start border-0 bg-transparent">
                                    Profile
                                </Link>
                            </div>

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
