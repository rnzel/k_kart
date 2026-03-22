import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProductCard from "./components/ProductCard.jsx";
import ShopCard from "./components/ShopCard.jsx";
import StickySearchBar from "./components/StickySearchBar.jsx";
import api, { cartAPI } from "./utils/api.js";
import { FiBox, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Toast from "./components/Toast.jsx";

function Marketplace() {
    const navigate = useNavigate();
    const [shops, setShops] = React.useState([]);
    const [products, setProducts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [shopsLoading, setShopsLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [searchTerm, setSearchTerm] = React.useState("");
    const [showDropdown, setShowDropdown] = React.useState(false);
    const [cartCount, setCartCount] = React.useState(0);
    const [addingProducts, setAddingProducts] = React.useState({});
    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [toast, setToast] = React.useState({ show: false, message: "" });
    const [showAllShops, setShowAllShops] = React.useState(false);
    const [shopsPage, setShopsPage] = React.useState(1);
    const productsPerPage = 12;
    const shopsPerPage = 8;
    const initialShopsLimit = 5;

    // Fetch cart count on mount
    React.useEffect(() => {
        fetchCartCount();
    }, []);

    const fetchCartCount = async () => {
        try {
            const response = await cartAPI.getCart();
            const items = response.data.items || [];
            setCartCount(items.length);
        } catch (err) {
            console.error('Failed to fetch cart:', err);
        }
    };

    React.useEffect(() => {
        const fetchShops = async () => {
            try {
                setShopsLoading(true);
                const response = await api.get("/api/shops");
                const shops = Array.isArray(response.data) ? response.data : [];
                setShops(shops);
            } catch (err) {
                setError(err.response?.data?.error?.message || "Error fetching shops");
            } finally {
                setShopsLoading(false);
            }
        };

        fetchShops();
    }, []);

    React.useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/api/products?page=${currentPage}&limit=${productsPerPage}`);
                const data = response.data;
                const productsData = Array.isArray(data.products) ? data.products : [];
                setProducts(productsData);
                setTotalPages(data.pagination?.totalPages || 1);
            } catch (err) {
                setError(err.response?.data?.message || "Error fetching products");
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [currentPage]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setShowDropdown(value.trim().length > 0);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            // Navigate to search page when Enter is pressed
            navigate(`/search/${encodeURIComponent(searchTerm.trim())}`);
            setShowDropdown(false);
        }
    };

    const handleSelectResult = (item, type) => {
        setShowDropdown(false);
        setSearchTerm("");
        // Navigate to search page with the selected item
        const searchQuery = item.name || item.searchTerm || item.shopName || item;
        navigate(`/search/${encodeURIComponent(searchQuery)}`);
    };

    const handleDropdownClose = () => {
        setShowDropdown(false);
    };

    const addToCart = async (product) => {
        // Set loading state for this product
        setAddingProducts(prev => ({ ...prev, [product._id]: true }));
        
        try {
            await cartAPI.addToCart(product._id, 1);
            setCartCount(prev => prev + 1);
            setToast({ show: true, message: `${product.productName} added to cart!` });
        } catch (err) {
            console.error('Failed to add to cart:', err);
            setToast({ show: true, message: err.response?.data?.message || 'Failed to add to cart' });
        } finally {
            // Clear loading state
            setAddingProducts(prev => ({ ...prev, [product._id]: false }));
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleCartClick = () => {
        navigate('/dashboard?section=cart');
    };

    const handleMessagesClick = () => {
        navigate('/dashboard?section=messages');
    };

    // Initial loading state - show Navbar and StickySearchBar like SearchPage
    const isInitialLoad = loading && shopsLoading && shops.length === 0 && products.length === 0;
    
    if (isInitialLoad) {
        return (
            <div>
                <Navbar />
                <StickySearchBar 
                    onCartClick={handleCartClick}
                    onMessagesClick={handleMessagesClick}
                />
                <div className="container py-5">
                    <div className="d-flex justify-content-center align-items-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="ms-3 mb-0">Loading marketplace...</p>
                    </div>
                </div>
            </div>
        );
    }

    
    return (
        <div>
            <Toast 
                show={toast.show} 
                message={toast.message} 
                type="success"
                onClose={() => setToast({ ...toast, show: false })} 
            />
            
            <Navbar/>

            {/* Sticky Search Bar */}
            <StickySearchBar
                placeholder="Search shops and products..."
                shops={shops}
                products={products}
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                onSelectResult={handleSelectResult}
                onClickOutside={handleDropdownClose}
                showDropdown={showDropdown}
                onCartClick={handleCartClick}
                onMessagesClick={handleMessagesClick}
                onKeyDown={handleKeyDown}
            />

            {/* Shops Section */}
            <div className="container mt-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-primary mb-0">Shops</h2>
                    {!showAllShops && shops.length > initialShopsLimit && (
                        <button 
                            className="btn btn-primary"
                            onClick={() => setShowAllShops(true)}
                        >
                            View All Shops
                        </button>
                    )}
                    {showAllShops && (
                        <button 
                            className="btn btn-secondary"
                            onClick={() => { setShowAllShops(false); setShopsPage(1); }}
                        >
                            Back
                        </button>
                    )}
                </div>
                {shopsLoading ? (
                    <div className="text-center mt-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading shops...</p>
                    </div>
                ) : shops.length > 0 ? (
                    <>
                        {showAllShops ? (
                            // Vertical grid view with pagination
                            <>
                                <div className="row g-3 shop-all-container">
                                    {shops.slice((shopsPage - 1) * shopsPerPage, shopsPage * shopsPerPage).map((shop) => (
                                        <div key={shop._id} className="col-6 col-md-4 col-lg-3">
                                            <ShopCard shop={shop} />
                                        </div>
                                    ))}
                                </div>
                                {Math.ceil(shops.length / shopsPerPage) > 1 && (
                                    <div className="d-flex justify-content-center align-items-center mt-4 gap-2">
                                        <button
                                            className="btn btn-outline-primary"
                                            onClick={() => setShopsPage(shopsPage - 1)}
                                            disabled={shopsPage === 1}
                                        >
                                            <FiChevronLeft />
                                        </button>
                                        <span className="text-muted">
                                            Page {shopsPage} of {Math.ceil(shops.length / shopsPerPage)}
                                        </span>
                                        <button
                                            className="btn btn-outline-primary"
                                            onClick={() => setShopsPage(shopsPage + 1)}
                                            disabled={shopsPage >= Math.ceil(shops.length / shopsPerPage)}
                                        >
                                            <FiChevronRight />
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            // Horizontal scroll view
                            <div className="d-flex overflow-auto pb-3 shop-cards-container justify-content-center" style={{ scrollbarWidth: "thin" }}>
                                {shops.slice(0, initialShopsLimit).map((shop) => (
                                    <ShopCard key={shop._id} shop={shop} />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-muted">No shops available yet.</p>
                )}
            </div>

            {/* Show Products section only when not in View All Shops mode */}
            {!showAllShops && (
                <>
                    <hr className="my-4"/>
                    <div className="container mt-4 mb-4">
                        <h2 className="text-primary mb-4">All Products</h2>

                        {loading && (
                            <div className="text-center mt-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p className="mt-2">Loading products...</p>
                            </div>
                        )}

                        {error && (
                            <div className="alert alert-danger mt-3" role="alert">
                                {error}
                            </div>
                        )}

                        {!loading && !error && products.length === 0 && (
                            <div className="text-center mt-5">
                                <FiBox size={64} className="text-secondary" />
                                <h4 className="mt-3 text-muted">No products found</h4>
                                <p className="text-muted">No products available yet. Check back later!</p>
                            </div>
                        )}

                        {!loading && products.length > 0 && (
                            <div>
                                <div className="row g-3">
                                    {products.map((product) => (
                                        <ProductCard 
                                            key={product._id} 
                                            product={product} 
                                            onAddToCart={addToCart}
                                            isAddingToCart={addingProducts[product._id] || false}
                                        />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="d-flex justify-content-center align-items-center mt-4 gap-2 mb-3">
                                        <button
                                            className="btn btn-outline-primary"
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                        >
                                            <FiChevronLeft />
                                        </button>
                                        <span className="text-muted">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            className="btn btn-outline-primary"
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                        >
                                            <FiChevronRight />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

        </div>
    );
}

export default Marketplace;
