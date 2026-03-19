import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiShoppingCart, FiMessageCircle } from "react-icons/fi";
import api, { cartAPI } from "./utils/api.js";
import ShopHeader from "./components/ShopHeader.jsx";
import ShopProductsGrid from "./components/ShopProductsGrid.jsx";
import Toast from "./components/Toast.jsx";
import StickySearchBar from "./components/StickySearchBar.jsx";
import Navbar from "./components/Navbar.jsx";
import { FiBox } from "react-icons/fi";

function ShopPage() {
    const { shopId } = useParams();
    const navigate = useNavigate();
    const [shop, setShop] = React.useState(null);
    const [products, setProducts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [cartCount, setCartCount] = React.useState(0);
    const [addingProducts, setAddingProducts] = React.useState({});
    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [toast, setToast] = React.useState({ show: false, message: "" });
    const [searchTerm, setSearchTerm] = React.useState("");
    const [showDropdown, setShowDropdown] = React.useState(false);
    const productsPerPage = 12;

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

    useEffect(() => {
        const fetchShopData = async () => {
            try {
                setLoading(true);
                setError("");

                // Fetch shop details
                const shopResponse = await api.get(`/api/shops/${shopId}`);
                setShop(shopResponse.data);

                // Fetch shop products
                const productsResponse = await api.get(`/api/shops/${shopId}/products?page=${currentPage}&limit=${productsPerPage}`);
                setProducts(productsResponse.data.products || []);
                setTotalPages(productsResponse.data.pagination?.totalPages || 1);
            } catch (err) {
                console.error('Error fetching shop data:', err);
                if (err.response?.status === 404) {
                    setError("Shop not found");
                } else {
                    setError(err.response?.data?.message || "Error fetching shop data");
                }
            } finally {
                setLoading(false);
            }
        };

        if (shopId) {
            fetchShopData();
        }
    }, [shopId, currentPage]);

    const handleAddToCart = async (product) => {
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

    const handleBackClick = () => {
        navigate('/marketplace');
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setShowDropdown(value.trim().length > 0);
    };

    const handleSelectResult = (type, item) => {
        setShowDropdown(false);
        setSearchTerm("");
        if (type === 'product') {
            // Navigate to product details or handle selection
            console.log('Selected product:', item);
        }
    };

    const handleDropdownClose = () => {
        setShowDropdown(false);
    };

    if (loading) {
        return (
            <div className="min-vh-100 d-flex flex-column">
                <div className="container py-4">
                    <div className="text-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading shop...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-vh-100 d-flex flex-column">
                <div className="container py-4">
                    <div className="text-center">
                        <FiBox size={64} className="text-secondary mb-3" />
                        <h4 className="text-danger">Error</h4>
                        <p className="text-muted">{error}</p>
                        <button className="btn btn-primary" onClick={handleBackClick}>
                            Back to Marketplace
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="min-vh-100 d-flex flex-column">
                <div className="container py-4">
                    <div className="text-center">
                        <FiBox size={64} className="text-secondary mb-3" />
                        <h4 className="text-muted">Shop Not Found</h4>
                        <p className="text-muted">The shop you're looking for doesn't exist.</p>
                        <button className="btn btn-primary" onClick={handleBackClick}>
                            Back to Marketplace
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="shop-page">
            <Navbar />
            
            <Toast 
                show={toast.show} 
                message={toast.message} 
                type="success"
                onClose={() => setToast({ ...toast, show: false })} 
            />
            
            {/* Sticky Search Bar */}
            <StickySearchBar
                placeholder="Search products in this shop..."
                shops={[]} // No shops in shop context
                products={products} // Pass products from ShopPage
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                onSelectResult={handleSelectResult}
                onClickOutside={handleDropdownClose}
                showDropdown={showDropdown}
                onCartClick={handleCartClick}
                onMessagesClick={handleMessagesClick}
                cartCount={cartCount}
                showBackButton={true}
                onBackClick={handleBackClick}
            />
            
            {/* Shop Content */}
            <div className="container mt-4">
                <ShopHeader shop={shop} />
            </div>
                <hr className="my-4"/>
                <div className="container mt-4 mb-4">
                    <h2 className="text-primary mb-4">Shop Products</h2>

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
                            <p className="text-muted">This shop doesn't have any products available at the moment.</p>
                        </div>
                    )}

                    {!loading && products.length > 0 && (
                        <ShopProductsGrid 
                            products={products}
                            loading={loading}
                            error={error}
                            onAddToCart={handleAddToCart}
                            isAddingToCart={(productId) => addingProducts[productId] || false}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            </div>
        );
    }

export default ShopPage;