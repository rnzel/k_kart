import React from "react";
import Navbar from "../components/Navbar.jsx";
import MyProfileSection from "./sections/MyProfileSection.jsx";
import MyOrdersSection from "./sections/MyOrdersSection.jsx";
import CartSection from "./sections/CartSection.jsx";
import MessagesSection from "./sections/MessagesSection.jsx";
import { FiUser, FiShoppingBag, FiShoppingCart, FiMessageCircle } from "react-icons/fi";

function UserDashboard() {
    const [activeSection, setActiveSection] = React.useState('profile');

    return (
        <div>
            <Navbar />

            <div className="container mt-4 d-flex flex-column gap-4">
                <div className="row">
                    {/* Desktop Sidebar - Hidden on mobile */}
                    <aside className="col-md-3 d-none d-md-block" style={{fontSize:'17px'}}>
                        <ul className="d-flex flex-column gap-3 list-unstyled p-3 justify-content-center">
                            <li className="item d-flex align-items-center font-weight-semibold mb-2">
                                <a 
                                    href="#profile" 
                                    className={`d-flex align-items-center text-decoration-none ${activeSection === 'profile' ? 'text-primary' : 'text-dark'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveSection('profile');
                                    }}
                                >
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiUser size={24} /></div>
                                    My Profile
                                </a>
                            </li>
                            <li className="item d-flex align-items-center font-weight-semibold mb-2">
                                <a 
                                    href="#orders" 
                                    className={`d-flex align-items-center text-decoration-none ${activeSection === 'orders' ? 'text-primary' : 'text-dark'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveSection('orders');
                                    }}
                                >
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiShoppingBag size={24} /></div>
                                    My Orders
                                </a>
                            </li>
                            <li className="item d-flex align-items-center font-weight-semibold mb-2">
                                <a 
                                    href="#cart" 
                                    className={`d-flex align-items-center text-decoration-none ${activeSection === 'cart' ? 'text-primary' : 'text-dark'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveSection('cart');
                                    }}
                                >
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiShoppingCart size={24} /></div>
                                    Cart
                                </a>
                            </li>
                            <li className="item d-flex align-items-center font-weight-semibold mb-2">
                                <a 
                                    href="#messages" 
                                    className={`d-flex align-items-center text-decoration-none ${activeSection === 'messages' ? 'text-primary' : 'text-dark'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveSection('messages');
                                    }}
                                >
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiMessageCircle size={24} /></div>
                                    Messages
                                </a>
                            </li>
                        </ul>
                    </aside>

                    <div className="col-md-9 p-3 pb-5 pb-md-3">
                        {activeSection === 'profile' && <MyProfileSection />}
                        {activeSection === 'orders' && <MyOrdersSection />}
                        {activeSection === 'cart' && <CartSection />}
                        {activeSection === 'messages' && <MessagesSection />}
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Nav - Mobile Only */}
            <nav className="d-md-none fixed-bottom bg-white border-top">
                <ul className="nav nav-justified py-2">
                    <li className="nav-item">
                        <button
                            className={`nav-link btn btn-link ${activeSection === 'profile' ? 'active text-primary' : 'text-dark'}`}
                            onClick={() => setActiveSection('profile')}
                        >
                            <FiUser size={24} />
                            <div className="small">Profile</div>
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link btn btn-link ${activeSection === 'orders' ? 'active text-primary' : 'text-dark'}`}
                            onClick={() => setActiveSection('orders')}
                        >
                            <FiShoppingBag size={24} />
                            <div className="small">Orders</div>
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link btn btn-link ${activeSection === 'cart' ? 'active text-primary' : 'text-dark'}`}
                            onClick={() => setActiveSection('cart')}
                        >
                            <FiShoppingCart size={24} />
                            <div className="small">Cart</div>
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link btn btn-link ${activeSection === 'messages' ? 'active text-primary' : 'text-dark'}`}
                            onClick={() => setActiveSection('messages')}
                        >
                            <FiMessageCircle size={24} />
                            <div className="small">Messages</div>
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    );
}

export default UserDashboard;
