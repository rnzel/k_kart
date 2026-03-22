import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiSearch, FiFilter, FiArrowLeft } from 'react-icons/fi';
import { searchAPI } from './utils/api';
import { saveRecentSearch } from './utils/searchUtils';
import StickySearchBar from './components/StickySearchBar';
import ProductCard from './components/ProductCard';
import ShopCard from './components/ShopCard';
import Navbar from './components/Navbar';
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
    const [activeTab, setActiveTab] = useState('products');
    const [sortBy, setSortBy] = useState('relevance');
    const [showPricesDropdown, setShowPricesDropdown] = useState(true);
    const [filters, setFilters] = useState({
        priceRange: [0, 10000],
        categories: [],
        shops: []
    });
    
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

    const performSearch = async (query) => {
        if (!query.trim()) return;
        
        // Save the search term to recent searches
        saveRecentSearch(query);
        
        setIsLoading(true);
        setError(null);
        
        try {
            console.log('Performing search for:', query);
            const response = await searchAPI.searchProducts(query);
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
        // Don't navigate immediately - just update local input
        // Navigation will happen on Enter key or form submit
        setInputValue(newQuery);
    };

    // Handle Enter key press to trigger search
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            navigate(`/search/${encodeURIComponent(inputValue.trim())}`);
        }
    };

    const handleBack = () => {
        navigate(-1);
    };

    const getFilteredResults = () => {
        const results = searchResults[activeTab] || [];
        
        // Apply filters based on active tab
        return results.filter(item => {
            // Price filter for products
            if (activeTab === 'products' && item.productPrice) {
                const price = item.productPrice;
                if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
                    return false;
                }
            }
            
            // Category filter
            if (filters.categories.length > 0) {
                if (activeTab === 'products' && item.category) {
                    if (!filters.categories.includes(item.category)) return false;
                }
                if (activeTab === 'shops' && item.categories) {
                    if (!item.categories.some(cat => filters.categories.includes(cat))) return false;
                }
            }
            
            return true;
        });
    };

    const getSortedResults = () => {
        const results = getFilteredResults();
        
        return [...results].sort((a, b) => {
            switch (sortBy) {
                case 'price-low':
                    return (a.productPrice || 0) - (b.productPrice || 0);
                case 'price-high':
                    return (b.productPrice || 0) - (a.productPrice || 0);
                case 'name':
                    return (a.name || a.shopName || '').localeCompare(b.name || b.shopName || '');
                case 'newest':
                    return new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0);
                default:
                    return 0;
            }
        });
    };

    const sortedResults = getSortedResults();

    return (
        <div className="search-page">
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
                    <div className="d-flex flex-wrap gap-3 align-items-center">
                        <div className='text-muted'>
                            Sort by
                        </div>
                        {/* Sort Options */}
                        <div>
                            <button 
                                className={`btn ${sortBy === 'relevance' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => setSortBy('relevance')}
                            >
                                Relevance
                            </button>

                            <button 
                                className={`btn ${sortBy === 'newest' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => setSortBy('newest')}
                            >
                                Latest
                            </button>
                        </div>
                        <div className="dropdown">
                            <button 
                                className="btn btn-outline-secondary dropdown-toggle"
                                type="button"
                                data-bs-toggle="dropdown"
                            >
                                {sortBy === 'relevance' ? 'Prices' : 
                                        sortBy === 'price-low' ? 'Price: Low to High' :
                                        sortBy === 'price-high' ? 'Price: High to Low' :
                                        'Prices'}
                            </button>
                            <ul className="dropdown-menu">
                                <li><button className="dropdown-item" onClick={() => setSortBy('price-low')}>Price: Low to High</button></li>
                                <li><button className="dropdown-item" onClick={() => setSortBy('price-high')}>Price: High to Low</button></li>
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

                {/* Loading State */}
                {isLoading && (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-3">Searching for "{searchQuery}"...</p>
                    </div>
                )}

                {/* Search Results */}
                {!isLoading && !error && (
                    <div className="search-results">
                        {/* Products Only Section */}
                        <div className="mb-5">
                            
                            {(searchResults.products && searchResults.products.length > 0) ? (
                                <>
                                    <div className="row g-3">
                                        {searchResults.products.map((product) => (
                                            <div key={product._id}>
                                                <ProductCard 
                                                    product={product}
                                                    showShopInfo={true}
                                                    showCategory={true}
                                                />
                                            </div>
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