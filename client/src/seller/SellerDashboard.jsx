import React from "react";
import Navbar from "../components/Navbar.jsx";
import MyShopSection from "./sections/MyShopSection.jsx";
import ProductsSection from "./sections/ProductsSection.jsx";
import OrdersSection from "./sections/OrdersSection.jsx";
import MessagesSection from "./sections/MessagesSection.jsx";
import { FiHome } from "react-icons/fi";
import { FiBox } from "react-icons/fi";
import { FiShoppingCart } from "react-icons/fi";
import { FiMessageCircle } from "react-icons/fi";


function SellerDashboard() {

    const [activeSection, setActiveSection] = React.useState('my-shop');
    
    return (
        <div>
            <Navbar />

            <div className="container mt-4 d-flex flex-column gap-4">
                <div className="row">
                    <aside className="col-md-3 seller-sidebar" style={{fontSize:'17px'}}>
                        <ul className="d-flex flex-column gap-3 list-unstyled p-3 justify-content-center">
                            <li className="item d-flex align-items-center font-weight-semibold mb-2">
                                <a 
                                    href="#my-shop" 
                                    className={`d-flex align-items-center text-decoration-none ${activeSection === 'my-shop' ? 'text-primary' : 'text-dark'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveSection('my-shop');
                                    }}
                                >
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiHome size={24} /></div>
                                    My Shop
                                </a>
                            </li>
                            <li className="item d-flex align-items-center font-weight-semibold mb-2">
                                <a 
                                    href="#products" 
                                    className={`d-flex align-items-center text-decoration-none ${activeSection === 'products' ? 'text-primary' : 'text-dark'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveSection('products');
                                    }}
                                >
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiBox size={24} /></div>
                                    Products
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
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiShoppingCart size={24} /></div>
                                    Orders
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

                    <div className="col-md-9 p-3">
                        {activeSection === 'my-shop' && (
                            <MyShopSection />
                        )}
                        {activeSection === 'products' && <ProductsSection />}
                        {activeSection === 'orders' && <OrdersSection />}
                        {activeSection === 'messages' && <MessagesSection />}
                    </div>
                </div>
            </div>
            </div>
    );
}

export default SellerDashboard;
