import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiSearch, FiArrowLeft } from 'react-icons/fi';
import { searchAPI } from './utils/api';
import { saveRecentSearch } from './utils/searchUtils';
import StickySearchBar from './components/StickySearchBar';
import ShopCard from './components/ShopCard';
import Navbar from './components/Navbar';
import './SearchPage.css';

const ShopSearchPage = () => {
    const { query } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    // Get search query from URL params or location state
    const searchQuery = query || location.state?.searchQuery || '';
    
    const [searchResults, setSearchResults] = useState({
        shops: []
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('relevance');
    
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
            console.log('Performing shop search for:', query);
            const response = await searchAPI.getSuggestions(query);
            console.log('Shop search response:', response);
            
            if (response.success) {
                setSearchResults(response.data);
            } else {
                setError(response.message || 'Failed to load search results');
            }
        } catch (err) {
            console.error('Shop search error:', err);
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
            navigate(`/shop-search/${encodeURIComponent(inputValue.trim())}`);
        }
    };

    const handleBack = () => {
        navigate(-1);
    };

    const getFilteredResults = () => {
        const results = searchResults.shops || [];
        
        // Apply filters based on active tab
        return results.filter(shop => {
            // Add any shop-specific filters here in the future
            return true;
        });
    };

    const getSortedResults = () => {
        const results = getFilteredResults();
        
        return [...results].sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return (a.shopName || '').localeCompare(b.shopName || '');
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
                        placeholder="Search shops..."
                        searchTerm={inputValue}
                        onSearchChange={(e) => handleSearch(e.target.value)}
                        onSelectResult={(item, type) => {
                            if (type === 'shop') {
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
                    <h2 className="mb-3">
                        Shop related to "<span className='text-primary'>{searchQuery}</span>"
                    </h2>
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
                        <p className="mt-3">Searching for shops "{searchQuery}"...</p>
                    </div>
                )}

                {/* Search Results */}
                {!isLoading && !error && searchResults.shops && searchResults.shops.length > 0 && (
                    <div className="search-results">
                        <div className="row g-4">
                            {searchResults.shops.map((shop) => (
                                <div key={shop._id} className="col-lg-4 col-md-6 col-sm-12">
                                    <ShopCard shop={shop} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* No Results Message - only show after search is complete and no results */}
                {!isLoading && !error && searchQuery && (!searchResults.shops || searchResults.shops.length === 0) && (
                    <div className="text-center py-5">
                        <div className="mb-4">
                            <FiSearch size={64} className="text-muted" />
                        </div>
                        <h4 className="text-muted mb-3">No shops found</h4>
                        <p className="text-muted mb-4">
                            Try adjusting your search terms or browse all shops
                        </p>
                        <div className="d-flex gap-2 justify-content-center">
                            <button className="btn btn-primary" onClick={() => navigate('/shops')}>
                                Browse All Shops
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShopSearchPage;