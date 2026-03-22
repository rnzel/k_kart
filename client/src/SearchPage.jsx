import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiSearch, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { searchAPI, cartAPI } from './utils/api';
import { saveRecentSearch } from './utils/searchUtils';
import StickySearchBar from './components/StickySearchBar';
import ProductCard from './components/ProductCard';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import './SearchPage.css';

const SearchPage = () => {
    const { query } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    // Get search query from URL params or location state
    const searchQuery = query || location.state?.searchQuery || '';
    
    const [searchResults, setSearchResults] = useState({
        products: [],
        pagination: {
            total: 0,
            page: 1,
            limit: 12,
            totalPages: 1
        }
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Sorting state
    const [sortBy, setSortBy] = useState('relevance');
    const [priceSortOrder, setPriceSortOrder] = useState('asc');
    
    // Cart state
    const [addingProducts, setAddingProducts] = useState({});
    const [toast, setToast] = useState({ show: false, message: "" });
    
    // Track the last searched query to prevent duplicate searches
    const lastSearchedQuery = useRef('');

    // Local state for the search input (separate from URL to prevent auto-search)
    const [inputValue, setInputValue] = useState(searchQuery);

    useEffect(() => {
        // Only perform search if the query is different from the last searched query
        if (searchQuery && searchQuery !== lastSearchedQuery.current) {
            lastSearchedQuery.current = searchQuery;
            performSearch(searchQuery);
        }
    }, [searchQuery]);

    // Re-run search when sort option changes
    useEffect(() => {
        if (searchQuery) {
            performSearch(searchQuery);
        }
    }, [sortBy, priceSortOrder]);

    const performSearch = async (query) => {
        if (!query.trim()) return;
        
        // Save the search term to recent searches
        saveRecentSearch(query);
        
        setIsLoading(true);
        setError(null);
        
        try {
            console.log('Performing search for:', query, 'with sort:', sortBy, priceSortOrder);
            
            // Determine the actual sort parameter to send
            let sortParam = sortBy;
            if (sortBy === 'price') {
                sortParam = priceSortOrder === 'asc' ? 'price_asc' : 'price_desc';
            }
            
            const response = await searchAPI.searchProducts(query, 1, 12, sortParam);
            console.log('Search response:', response);
            
            if (response.success) {
                setSearchResults(response.data);
            } else {
                setError(response.message || 'Failed to load search results');
            }
        } catch (err) {
            console.error('Search error:', err);
            setError('An error occurred while searching. Please check the console for details.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (newQuery) => {
        setInputValue(newQuery);
    };

    // Handle Enter key press to trigger search
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            navigate(`/search/${encodeURIComponent(inputValue.trim())}`);
        }
    };

    // Handle sort option change
    const handleSortChange = (newSort) => {
        setSortBy(newSort);
    };

    // Add to cart function
    const addToCart = async (product) => {
        setAddingProducts(prev => ({ ...prev, [product._id]: true }));
        
        try {
            await cartAPI.addToCart(product._id, 1);
            setToast({ show: true, message: `${product.productName} added to cart!` });
        } catch (err) {
            console.error('Failed to add to cart:', err);
            setToast({ show: true, message: err.response?.data?.message || 'Failed to add to cart' });
        } finally {
            setAddingProducts(prev => ({ ...prev, [product._id]: false }));
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div>
                <Navbar />
                <StickySearchBar 
                    placeholder="Search products, shops, and categories..."
                    searchTerm={inputValue}
                    onSearchChange={(e) => handleSearch(e.target.value)}
                    onSelectResult={(item, type) => {
                        if (type === 'product') {
                            navigate(`/product/${item._id}`);
                        } else if (type === 'shop') {
                            navigate(`/shop/${item._id}`);
                        }
                    }}
                    onCartClick={() => navigate('/cart')}
                    onMessagesClick={() => navigate('/messages')}
                    showBackButton={true}
                    showSuggestions={false}
                    onKeyDown={handleKeyDown}
                />
                <div className="container py-5">
                    <div className="d-flex justify-content-center align-items-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="ms-3 mb-0">Searching for "{searchQuery}"...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="search-page">
            <Toast 
                show={toast.show} 
                message={toast.message} 
                type="success"
                onClose={() => setToast({ ...toast, show: false })} 
            />
            
            {/* Navbar - hide when loading */}
            {!isLoading && <Navbar />}
            
            {/* Sticky Search Bar - hide when loading */}
            {!isLoading && (
                <div className="search-page-header">
                    <StickySearchBar 
                        placeholder="Search products, shops, and categories..."
                        searchTerm={inputValue}
                        onSearchChange={(e) => handleSearch(e.target.value)}
                        onSelectResult={(item, type) => {
                            if (type === 'product') {
                                navigate(`/product/${item._id}`);
                            } else if (type === 'shop') {
                                navigate(`/shop/${item._id}`);
                            }
                        }}
                        onCartClick={() => navigate('/cart')}
                        onMessagesClick={() => navigate('/messages')}
                        showBackButton={true}
                        showSuggestions={false}
                        onKeyDown={handleKeyDown}
                    />
                </div>
            )}

            {/* Search Results Content */}
            <div className="container py-4">
                {/* Search Info */}
                <div className="search-info mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h2 className="mb-0">
                            Search Results for "<span className='text-primary'>{searchQuery}</span>"
                        </h2>
                    </div>
                    
                    {/* Sort Options */}
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                        <span className='text-muted fw-medium me-1'>Sort by:</span>
                        
                        {/* Relevance Button */}
                        <button 
                            className={`btn btn-sm ${sortBy === 'relevance' ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => handleSortChange('relevance')}
                        >
                            Relevance
                        </button>

                        {/* Latest Button */}
                        <button 
                            className={`btn btn-sm ${sortBy === 'latest' ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => handleSortChange('latest')}
                        >
                            Latest
                        </button>

                        {/* Price Dropdown */}
                        <div className="btn-group">
                            <button 
                                className={`btn btn-sm ${sortBy === 'price' ? 'btn-primary' : 'btn-outline-secondary'} dropdown-toggle`}
                                type="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                            >
                                Price
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end">
                                <li>
                                    <button 
                                        className={`dropdown-item ${sortBy === 'price' && priceSortOrder === 'asc' ? 'active' : ''}`}
                                        onClick={() => {
                                            handleSortChange('price');
                                            setPriceSortOrder('asc');
                                        }}
                                    >
                                        Price: Low to High
                                    </button>
                                </li>
                                <li>
                                    <button 
                                        className={`dropdown-item ${sortBy === 'price' && priceSortOrder === 'desc' ? 'active' : ''}`}
                                        onClick={() => {
                                            handleSortChange('price');
                                            setPriceSortOrder('desc');
                                        }}
                                    >
                                        Price: High to Low
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                )}

                {/* Search Results */}
                {!isLoading && !error && (
                    <div className="search-results">
                        <div className="mb-5">
                            
                            {(searchResults.products && searchResults.products.length > 0) ? (
                                <>
                                    <div className="row g-3">
                                        {searchResults.products.map((product) => (
                                            <ProductCard 
                                                key={product._id} 
                                                product={product}
                                                onAddToCart={addToCart}
                                                isAddingToCart={addingProducts[product._id] || false}
                                            />
                                        ))}
                                    </div>
                                    
                                    {/* Pagination Info */}
                                    {searchResults.pagination && searchResults.pagination.total > 0 && (
                                        <div className="text-center text-muted mt-4">
                                            Showing {searchResults.products.length} of {searchResults.pagination.total} products
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-5">
                                    <div className="mb-4">
                                        <FiSearch size={64} className="text-muted" />
                                    </div>
                                    <h4 className="text-muted mb-3">No products found</h4>
                                    <p className="text-muted mb-4">
                                        Try adjusting your search terms or browse our marketplace
                                    </p>
                                    <div className="d-flex gap-2 justify-content-center">
                                        <button className="btn btn-primary" onClick={() => navigate('/marketplace')}>
                                            Browse Marketplace
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
