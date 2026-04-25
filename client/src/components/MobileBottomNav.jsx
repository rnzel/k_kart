import { Link, useLocation } from "react-router-dom";
import { FiUser, FiShoppingBag, FiShoppingCart, FiMessageCircle, FiHome } from "react-icons/fi";

function MobileBottomNav() {
    const location = useLocation();
    const path = location.pathname;

    const isActive = (targetPath) => {
        if (targetPath === '/dashboard') {
            return path === '/dashboard' || path.startsWith('/dashboard?');
        }
        return path === targetPath;
    };

    const getNavClass = (targetPath) => {
        return isActive(targetPath) ? 'active text-primary' : 'text-dark';
    };

    return (
        <>
            {/* Spacer for mobile bottom navigation */}
            <div className="d-md-none" style={{ height: '80px' }}></div>
            
            {/* Sticky Bottom Nav - Mobile Only */}
            <nav className="d-md-none fixed-bottom bg-white border-top" style={{ zIndex: 1050 }}>
                <ul className="nav nav-justified py-2">
                    <li className="nav-item">
                        <Link
                            to="/marketplace"
                            className={`nav-link btn btn-link ${getNavClass('/marketplace')}`}
                        >
                            <FiHome size={22} />
                            <div className="small">Home</div>
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link
                            to="/dashboard?section=orders"
                            className={`nav-link btn btn-link ${getNavClass('/dashboard')}`}
                        >
                            <FiShoppingBag size={22} />
                            <div className="small">Orders</div>
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link
                            to="/dashboard?section=cart"
                            className={`nav-link btn btn-link ${getNavClass('/dashboard')}`}
                        >
                            <FiShoppingCart size={22} />
                            <div className="small">Cart</div>
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link
                            to="/dashboard?section=messages"
                            className={`nav-link btn btn-link ${getNavClass('/dashboard')}`}
                        >
                            <FiMessageCircle size={22} />
                            <div className="small">Messages</div>
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link
                            to="/dashboard?section=profile"
                            className={`nav-link btn btn-link ${getNavClass('/dashboard')}`}
                        >
                            <FiUser size={22} />
                            <div className="small">Profile</div>
                        </Link>
                    </li>
                </ul>
            </nav>
        </>
    );
}

export default MobileBottomNav;
