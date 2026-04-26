import React, { useState, useEffect, useRef } from "react";
import { FiSearch, FiShoppingCart, FiMessageCircle, FiArrowLeft, FiX, FiHome, FiBox } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { cartAPI, searchAPI } from "../utils/api.js";
import { debounce, getRecentSearches, saveRecentSearch, clearRecentSearches } from "../utils/searchUtils.js";

function StickySearchBar({ 
    placeholder = "Search shops and products...", 
    searchTerm: externalSearchTerm,
    onSearchChange,
    onSelectResult,
    onClickOutside,
    showDropdown: externalShowDropdown,
    onCartClick,
    onMessagesClick,
    standalone = true,
    showBackButton = false,
    onBackClick,
    onKeyDown,
    showSuggestions = true,
    cartCount: externalCartCount,
    showRecentSearches = true
}) {
    const navigate = useNavigate();
    const [internalCartCount, setInternalCartCount] = React.useState(0);
    const [searchQuery, setSearchQuery] = useState(externalSearchTerm || "");
    const [suggestions, setSuggestions] = useState(null);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);
    const inputRef = useRef(null);

    // Initialize recent searches from localStorage
    React.useEffect(() => {
        setRecentSearches(getRecentSearches());
    }, []);

    // Fetch cart count on mount
    React.useEffect(() => {
        if (typeof externalCartCount !== 'number') {
            fetchCartCount();
        }
    }, [externalCartCount]);

    const fetchCartCount = async () => {
        try {
            const response = await cartAPI.getCart();
            const items = response?.data?.items || [];
            setInternalCartCount(items.length);
        } catch (err) {
            console.error('Failed to fetch cart:', err);
            setInternalCartCount(0);
        }
    };

    const effectiveCartCount = typeof externalCartCount === 'number'
        ? externalCartCount
        : internalCartCount;

    // Handle external search term changes
    React.useEffect(() => {
        if (externalSearchTerm !== searchQuery) {
            setSearchQuery(externalSearchTerm || "");
        }
    }, [externalSearchTerm]);

    // Handle external dropdown visibility
    React.useEffect(() => {
        if (!externalShowDropdown && isDropdownVisible) {
            setIsDropdownVisible(false);
            setActiveIndex(-1);
        }
    }, [externalShowDropdown]);

    // Handle external search term changes and trigger new search
    React.useEffect(() => {
        if (externalSearchTerm !== searchQuery) {
            setSearchQuery(externalSearchTerm || "");
            if (externalSearchTerm && externalSearchTerm.trim().length > 0) {
                // Only trigger search if showSuggestions is enabled
                if (showSuggestions) {
                    debouncedSearch(externalSearchTerm);
                    // Only show dropdown if it was already visible or explicitly requested via externalShowDropdown
                    if (isDropdownVisible || externalShowDropdown) {
                        setIsDropdownVisible(true);
                    }
                }
            } else {
                // Reset suggestions for empty term but DON'T automatically show dropdown
                // unless explicitly requested via externalShowDropdown
                if (showSuggestions || showRecentSearches) {
                    setSuggestions({
                        products: [],
                        shops: [],
                        categories: [],
                        recentSearches: showRecentSearches ? getRecentSearches() : []
                    });
                    
                    if (externalShowDropdown) {
                        setIsDropdownVisible(true);
                    }
                }
            }
        }
    }, [externalSearchTerm, showSuggestions, showRecentSearches, externalShowDropdown]);

    // Debounced search function
    const debouncedSearch = debounce(async (query) => {
        if (!query || query.trim().length < 1) {
            setIsLoading(false);
            setSuggestions(null);
            return;
        }

        setIsLoading(true);
        try {
            console.log('StickySearchBar: Searching for:', query);
            const response = await searchAPI.getSuggestions(query);
            console.log('StickySearchBar: Search response:', response);
            
            if (response.success) {
                setSuggestions(response.data);
            } else {
                console.error('Search error:', response.message);
                setSuggestions(null);
            }
        } catch (error) {
            console.error('Search API error:', error);
            setSuggestions(null);
        } finally {
            setIsLoading(false);
        }
    }, 300);

    // Handle search input change
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        // Don't save while typing - only save when user performs a search
        // (clicks on a suggestion or presses Enter)
        
        if (onSearchChange) {
            onSearchChange(e);
        }

        // Only trigger search suggestions if showSuggestions is enabled
        if (showSuggestions) {
            debouncedSearch(query);
            setIsDropdownVisible(true);
        }
    };

    // Handle search input focus
    const handleInputFocus = () => {
        if (!showSuggestions && !showRecentSearches) {
            setIsDropdownVisible(false);
            return;
        }

        if (searchQuery && searchQuery.trim().length > 0) {
            setIsDropdownVisible(true);
            // Trigger search for existing query only if showSuggestions is enabled
            if (showSuggestions) {
                debouncedSearch(searchQuery);
            }
        } else {
            // Show dropdown content when input is empty
            if (showSuggestions || showRecentSearches) {
                setSuggestions({
                    products: [],
                    shops: [],
                    categories: [],
                    recentSearches: showRecentSearches ? getRecentSearches() : []
                });
                setIsDropdownVisible(true);
            } else {
                setIsDropdownVisible(false);
            }
        }
    };

    // Handle search input blur
    const handleInputBlur = (e) => {
        // Delay hiding dropdown to allow click on suggestions
        setTimeout(() => {
            if (!inputRef.current || !inputRef.current.contains(e.relatedTarget)) {
                setIsDropdownVisible(false);
                setActiveIndex(-1);
                if (onClickOutside) {
                    onClickOutside();
                }
            }
        }, 200);
    };

    // Handle product suggestion click - navigate to product page
    const handleProductClick = (product) => {
        navigate(`/product/${product._id}`);
        setSearchQuery(product.productName);
        setIsDropdownVisible(false);
        setActiveIndex(-1);
    };

    // Handle shop suggestion click - navigate to shop page
    const handleShopClick = (shop) => {
        navigate(`/shop/${shop._id}`);
        setSearchQuery(shop.shopName);
        setIsDropdownVisible(false);
        setActiveIndex(-1);
    };

    // Handle suggestion click
    const handleSuggestionClick = (item, type) => {
        if (onSelectResult) {
            onSelectResult(item, type);
        } else {
            // Default behavior: navigate to search results
            const searchQuery = item.name || item.searchTerm || item.shopName || item;
            navigate(`/search/${encodeURIComponent(searchQuery)}`);
        }
        setSearchQuery(item.name || item.searchTerm || item.shopName || item);
        setIsDropdownVisible(false);
        setActiveIndex(-1);
    };

    // Handle recent search click
    const handleRecentSearchClick = (searchTerm) => {
        // Save the search term again to move it to the top of recent searches
        saveRecentSearch(searchTerm);
        
        // Navigate to search page with the recent search term
        navigate(`/search/${encodeURIComponent(searchTerm)}`);
        setSearchQuery(searchTerm);
        setIsDropdownVisible(false);
        setActiveIndex(-1);
    };

    // Handle back button - go to marketplace
    const handleBackClick = () => {
        if (onBackClick) {
            onBackClick();
        } else {
            navigate('/marketplace');
        }
    };

    // Handle clear search
    const handleClearSearch = () => {
        setSearchQuery("");
        if (onSearchChange) {
            onSearchChange({ target: { value: "" } });
        }
        debouncedSearch("");
        setIsDropdownVisible(false);
        setActiveIndex(-1);
    };

    // Handle clear recent searches
    const handleClearRecentSearches = (e) => {
        e?.stopPropagation(); // Prevent triggering other click events
        clearRecentSearches();
        // Update state to reflect the changes
        setRecentSearches([]);
        // Refresh suggestions to show updated recent searches
        if (searchQuery.trim().length === 0) {
            setSuggestions({
                products: [],
                shops: [],
                categories: [],
                recentSearches: []
            });
        }
    };

    // Handle keyboard navigation
    const handleInternalKeyDown = (e) => {
        if (!isDropdownVisible) return;

        const query = searchQuery.trim();
        
        // Generate combined suggestions list for navigation
        const generateAllSuggestions = () => {
            const allSuggestions = [];
            const seen = new Set();
            
            // Add products
            if (suggestions?.products) {
                suggestions.products.forEach(product => {
                    if (product.productName && !seen.has(product.productName)) {
                        allSuggestions.push({
                            type: 'product',
                            data: product,
                            text: product.productName
                        });
                        seen.add(product.productName);
                    }
                });
            }
            
            // Add shops
            if (suggestions?.shops) {
                suggestions.shops.forEach(shop => {
                    if (shop.shopName && !seen.has(shop.shopName)) {
                        allSuggestions.push({
                            type: 'shop',
                            data: shop,
                            text: shop.shopName
                        });
                        seen.add(shop.shopName);
                    }
                });
            }
            
            // Add recent searches (only if enabled and no query)
            if (showRecentSearches && !query) {
                const recentSearches = getRecentSearches();
                recentSearches.forEach(search => {
                    if (!seen.has(search)) {
                        allSuggestions.push({
                            type: 'recent',
                            data: search,
                            text: search
                        });
                        seen.add(search);
                    }
                });
            }
            
            return allSuggestions.slice(0, 8); // Limit to 8 suggestions
        };

        const allSuggestions = generateAllSuggestions();
        const totalSuggestions = allSuggestions.length;

        if (totalSuggestions === 0) return;

        switch (e.key) {
            case "ArrowUp":
                e.preventDefault();
                setActiveIndex((prev) => {
                    if (prev <= 0) return totalSuggestions - 1;
                    return prev - 1;
                });
                break;
            case "ArrowDown":
                e.preventDefault();
                setActiveIndex((prev) => {
                    if (prev >= totalSuggestions - 1) return 0;
                    return prev + 1;
                });
                break;
            case "Enter":
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < totalSuggestions) {
                    const suggestion = allSuggestions[activeIndex];
                    if (suggestion) {
                        if (suggestion.type === 'product') {
                            handleProductClick(suggestion.data);
                        } else if (suggestion.type === 'shop') {
                            handleShopClick(suggestion.data);
                        } else if (suggestion.type === 'recent') {
                            navigate(`/search/${encodeURIComponent(suggestion.text)}`);
                            setSearchQuery(suggestion.text);
                        } else {
                            navigate(`/search?q=${encodeURIComponent(suggestion.text)}`);
                            setSearchQuery(suggestion.text);
                        }
                        setIsDropdownVisible(false);
                        setActiveIndex(-1);
                    }
                }
                break;
            case "Escape":
                setIsDropdownVisible(false);
                setActiveIndex(-1);
                break;
            default:
                break;
        }
    };

    // Handle input keydown (combines internal navigation and external handler)
    const handleInputKeyDown = (e) => {
        // Save completed searches when pressing Enter (for flows where parent handles navigation)
        if (e.key === 'Enter') {
            const trimmedQuery = searchQuery.trim();
            if (showRecentSearches && trimmedQuery.length > 0 && activeIndex === -1) {
                saveRecentSearch(trimmedQuery);
                setRecentSearches(getRecentSearches());
            }
        }

        // Call external handler first if provided
        if (onKeyDown) {
            onKeyDown(e);
        }
        
        // Then handle internal navigation
        handleInternalKeyDown(e);
    };

    // Highlight matching text in suggestions
    const highlightMatch = (text, query) => {
        if (!query || !text) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    };

    // Render suggestions dropdown
    const renderSuggestions = () => {
        if (!isDropdownVisible) return null;
        if (!showSuggestions && !showRecentSearches) return null;

        const query = searchQuery.trim();
        const hasQuery = query.length > 0;
        
        // Get products and shops from the new API response structure
        const products = suggestions?.products || [];
        const shops = suggestions?.shops || [];
        const categories = suggestions?.categories || [];
        
        // Use state for recent searches to ensure UI stays synchronized
        const currentRecentSearches = recentSearches;

        // Generate combined suggestions for display (limit to 8)
        const displayProducts = products.slice(0, 5);
        const displayShops = shops.slice(0, 3);

        // When there's a query but no products/shops found, still show "Search in Shops" option
        const showOnlyShopSearch = hasQuery && !isLoading && displayProducts.length === 0 && displayShops.length === 0;

        return (
            <div 
                className="position-absolute w-100 rounded border border-black bg-white"
                style={{ 
                    zIndex: 1050,
                    left: 0,
                    marginTop: '4px',
                    maxHeight: '400px',
                    overflowY: 'auto'
                }}
            >
                {/* Loading indicator */}
                {isLoading && (
                    <div className="p-3 text-center text-muted">
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Searching...
                    </div>
                )}

                {/* Show "Search in Shops" when there's a query */}
                {showSuggestions && hasQuery && !isLoading && (
                    <div 
                        className="d-flex align-items-center p-3 clickable-suggestion"
                        onClick={() => {
                            // Save search term to recent searches
                            saveRecentSearch(query);
                            navigate(`/shop-search/${encodeURIComponent(query)}`);
                            setIsDropdownVisible(false);
                            setActiveIndex(-1);
                        }}
                        style={{ 
                            cursor: 'pointer',
                            borderBottom: (displayProducts.length > 0 || displayShops.length > 0) ? '1px solid #dee2e6' : 'none'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                        <div className="me-3">
                            <FiHome className="text-primary" size={20} />
                        </div>
                        <div className="flex-grow-1">
                            <div className="text-dark">
                                Search "{query}" in Shops
                            </div>
                        </div>
                    </div>
                )}

                {/* Show product suggestions */}
                {showSuggestions && !isLoading && displayProducts.length > 0 && (
                    <div className="p-2">
                        <div className="px-2 py-1 text-muted small fw-bold">Products</div>
                        {displayProducts.map((product, index) => {
                            const isActive = activeIndex === index;
                            
                            return (
                                <div
                                    key={`product-${product._id || index}`}
                                    className={`p-2 clickable-suggestion ${isActive ? 'bg-light' : ''}`}
                                    onClick={() => handleProductClick(product)}
                                    style={{ 
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        transition: 'background-color 0.2s ease'
                                    }}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onMouseLeave={(e) => {
                                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <div className="d-flex align-items-center">
                                        <FiBox className="text-muted me-2" size={16} />
                                        <div 
                                            className="text-dark flex-grow-1"
                                            dangerouslySetInnerHTML={{ 
                                                __html: highlightMatch(product.productName, query)
                                            }}
                                        />
                                        {product.shopName && (
                                            <small className="text-muted ms-2">{product.shopName}</small>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Show shop suggestions */}
                {showSuggestions && !isLoading && displayShops.length > 0 && (
                    <div className="p-2" style={{ borderTop: displayProducts.length > 0 ? '1px solid #dee2e6' : 'none' }}>
                        <div className="px-2 py-1 text-muted small fw-bold">Shops</div>
                        {displayShops.map((shop, index) => {
                            const isActive = activeIndex === (displayProducts.length + index);
                            
                            return (
                                <div
                                    key={`shop-${shop._id || index}`}
                                    className={`p-2 clickable-suggestion ${isActive ? 'bg-light' : ''}`}
                                    onClick={() => handleShopClick(shop)}
                                    style={{ 
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        transition: 'background-color 0.2s ease'
                                    }}
                                    onMouseEnter={() => setActiveIndex(displayProducts.length + index)}
                                    onMouseLeave={(e) => {
                                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <div className="d-flex align-items-center">
                                        <FiHome className="text-muted me-2" size={16} />
                                        <div 
                                            className="text-dark"
                                            dangerouslySetInnerHTML={{ 
                                                __html: highlightMatch(shop.shopName, query)
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Show recent searches when query is empty - horizontal layout */}
                {showRecentSearches && !hasQuery && !isLoading && currentRecentSearches.length > 0 && (
                    <div className="p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-bold text-muted">Recent Searches</span>
                            {currentRecentSearches.length > 0 && (
                                <button 
                                    className="btn btn-sm text-primary fw-bold" 
                                    onClick={handleClearRecentSearches}
                                    title="Clear recent searches"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                            {currentRecentSearches.slice(0, 10).map((search, index) => (
                                <div
                                    key={index}
                                    className="badge bg-light text-muted p-2 clickable-suggestion"
                                    onClick={() => handleRecentSearchClick(search)}
                                    style={{ 
                                        cursor: 'pointer',
                                        borderRadius: '20px',
                                        border: '1px solid #dee2e6',
                                        transition: 'all 0.2s ease',
                                        fontSize: '14px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#e9ecef';
                                        e.currentTarget.style.borderColor = '#db4444';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                                        e.currentTarget.style.borderColor = '#dee2e6';
                                    }}
                                >
                                    {search}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state: Show message when no recent searches and no other results */}
                {showRecentSearches && !hasQuery && !isLoading && currentRecentSearches.length === 0 && (
                    <div className="p-3 text-center text-muted">
                        No recent searches
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="sticky-top" style={{ 
            backgroundColor: 'white', 
            zIndex: 1000,
            top: '0',
        }}>
            <div className="container py-3">
                <div className="position-relative">
                    <div className="d-flex gap-2">
                        {showBackButton && (
                            <button 
                                className="btn btn-outline-primary position-relative" 
                                type="button"
                                onClick={handleBackClick}
                                title="Go to Marketplace"
                            >
                                <FiArrowLeft size={20} />
                            </button>
                        )}
                        <div className="input-group flex-grow-1">
                            <span className="input-group-text bg-white border-end-0">
                                <FiSearch className="text-muted" />
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                placeholder={placeholder}
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onFocus={handleInputFocus}
                                onBlur={handleInputBlur}
                                onKeyDown={handleInputKeyDown}
                                ref={inputRef}
                            />
                            {searchQuery && searchQuery.trim().length > 0 && (
                                <button 
                                    className="btn btn-outline-secondary border-start-0"
                                    type="button"
                                    onClick={handleClearSearch}
                                    title="Clear search"
                                >
                                    <FiX size={16} />
                                </button>
                            )}
                        </div>
                        <button 
                            className="btn btn-outline-primary position-relative" 
                            type="button"
                            onClick={onCartClick || (() => navigate('/cart'))}
                        >
                            <FiShoppingCart size={20} />
                            {effectiveCartCount > 0 && (
                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                    {effectiveCartCount}
                                </span>
                            )}
                        </button>
                        <button 
                            className="btn btn-outline-primary position-relative" 
                            type="button"
                            onClick={onMessagesClick || (() => navigate('/messages'))}
                        >
                            <FiMessageCircle size={20} />
                        </button>
                    </div>
                    {renderSuggestions()}
                </div>
            </div>
        </div>
    );
}

export default StickySearchBar;
