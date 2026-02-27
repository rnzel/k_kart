import React from "react";
import Navbar from "./components/Navbar.jsx";
import ProductCard from "./components/ProductCard.jsx";
import ShopCard from "./components/ShopCard.jsx";
import SearchDropdown from "./components/SearchDropdown.jsx";
import api from "./utils/api.js";
import { FiBox, FiSearch, FiChevronLeft, FiChevronRight } from "react-icons/fi";

function Marketplace() {
    const [shops, setShops] = React.useState([]);
    const [products, setProducts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [searchTerm, setSearchTerm] = React.useState("");
    const [showDropdown, setShowDropdown] = React.useState(false);
    const [cart, setCart] = React.useState([]);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const productsPerPage = 12;


    React.useEffect(() => {
        const fetchShops = async () => {
            try {
                const response = await api.get("/api/shops");
                const shops = Array.isArray(response.data) ? response.data : [];
                setShops(shops);
            } catch (err) {
                setError(err.response?.data?.error?.message || "Error fetching shops");
            } finally {
                setLoading(false);
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

    const handleSelectResult = (type, item) => {
        setShowDropdown(false);
        setSearchTerm("");
        // For now, just close the dropdown - you can add navigation here
        console.log(`Selected ${type}:`, item);
    };

    const handleDropdownClose = () => {
        setShowDropdown(false);
    };

    const addToCart = (product) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item._id === product._id);
            if (existingItem) {
                return prevCart.map((item) =>
                    item._id === product._id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    
    return ( 
        <div>
            <Navbar/>

            {/* Search Bar */}
            <div className="container mt-4">
                <div className="row justify-content-center">
                    <div className="col-md-8">
                        <div className="position-relative">
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">
                                    <FiSearch className="text-muted" />
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-start-0"
                                    placeholder="Search shops and products..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    onFocus={() => searchTerm.trim() && setShowDropdown(true)}
                                />
                            </div>
                            {showDropdown && (
                                <SearchDropdown 
                                    shops={shops}
                                    products={products}
                                    searchTerm={searchTerm}
                                    onSelect={handleSelectResult}
                                    onClickOutside={handleDropdownClose}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Shops Section - always visible */}
            <div className="container mt-4">
                <h2 className="text-primary mb-4">Shops</h2>
                {shops.length > 0 ? (
                    <div className="d-flex gap-3 overflow-auto pb-3" style={{ scrollbarWidth: "thin" }}>
                        {shops.map((shop) => (
                            <div key={shop._id} style={{ minWidth: "200px", width: "200px" }}>
                                <ShopCard shop={shop} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted">No shops available yet.</p>
                )}
            </div>

            <div className="container mt-4">
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

            {/* Footer */}
            <footer className="bg-dark text-white py-3 mt-5">
                <div className="text-center">
                    <p className="mb-0">&copy; {new Date().getFullYear()} <span className="text-bold">KampusKart</span>. All Rights Reserved.</p>
                </div>
            </footer>
        </div>
    );
}

export default Marketplace;
