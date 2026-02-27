import React from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import UsersSection from "./sections/UsersSection.jsx";
import SellerApplicationsSection from "./sections/SellerApplicationsSection.jsx";
import { FiUsers, FiFileText } from "react-icons/fi";

function AdminDashboard() {
    const [searchParams] = useSearchParams();
    const sectionParam = searchParams.get('section');
    
    const [activeSection, setActiveSection] = React.useState(() => {
        if (sectionParam === 'users' || sectionParam === 'applications') {
            return sectionParam;
        }
        return 'users';
    });

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
                                    href="#users" 
                                    className={`d-flex align-items-center text-decoration-none ${activeSection === 'users' ? 'text-primary' : 'text-dark'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveSection('users');
                                    }}
                                >
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiUsers size={24} /></div>
                                    Users
                                </a>
                            </li>
                            <li className="item d-flex align-items-center font-weight-semibold mb-2">
                                <a 
                                    href="#applications" 
                                    className={`d-flex align-items-center text-decoration-none ${activeSection === 'applications' ? 'text-primary' : 'text-dark'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveSection('applications');
                                    }}
                                >
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiFileText size={24} /></div>
                                    Seller Applications
                                </a>
                            </li>
                        </ul>
                    </aside>

                    <div className="col-md-9 p-3 pb-5 pb-md-3">
                        {activeSection === 'users' && <UsersSection />}
                        {activeSection === 'applications' && <SellerApplicationsSection />}
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Nav - Mobile Only */}
            <nav className="d-md-none fixed-bottom bg-white border-top">
                <ul className="nav nav-justified py-2">
                    <li className="nav-item">
                        <button
                            className={`nav-link btn btn-link ${activeSection === 'users' ? 'active text-primary' : 'text-dark'}`}
                            onClick={() => setActiveSection('users')}
                        >
                            <FiUsers size={24} />
                            <div className="small">Users</div>
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link btn btn-link ${activeSection === 'applications' ? 'active text-primary' : 'text-dark'}`}
                            onClick={() => setActiveSection('applications')}
                        >
                            <FiFileText size={24} />
                            <div className="small">Applications</div>
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    );
}

export default AdminDashboard;
