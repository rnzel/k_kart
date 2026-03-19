import React from "react";
import { FiSearch, FiShoppingCart, FiMessageCircle, FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import SearchDropdown from "./SearchDropdown.jsx";
import { cartAPI } from "../utils/api.js";

function StickySearchBar({ 
    placeholder = "Search shops and products...", 
    shops = [], 
    products = [],
    searchTerm: externalSearchTerm,
    onSearchChange,
    onSelectResult,
    onClickOutside,
    showDropdown: externalShowDropdown,
    onCartClick,
    onMessagesClick,
    standalone = true, // New prop to control if it should include its own container
    showBackButton = false, // New prop to show back button
    onBackClick // New prop for back button handler
}) {
    const navigate = useNavigate();
    const [cartCount, setCartCount] = React.useState(0);

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

    const handleCartClick = () => {
        if (onCartClick) {
            onCartClick();
        } else {
            navigate('/dashboard?section=cart');
        }
    };

    const handleMessagesClick = () => {
        if (onMessagesClick) {
            onMessagesClick();
        } else {
            navigate('/dashboard?section=messages');
        }
    };

    const searchBarContent = (
        <div className="position-relative d-flex gap-2">
            {showBackButton && (
                <button 
                    className="btn btn-outline-primary position-relative" 
                    type="button"
                    onClick={onBackClick}
                    title="Go back"
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
                    value={externalSearchTerm || ""}
                    onChange={onSearchChange}
                    onFocus={() => externalSearchTerm && externalSearchTerm.trim().length > 0 && externalShowDropdown}
                />
            </div>
            <button 
                className="btn btn-outline-primary position-relative" 
                type="button"
                onClick={handleCartClick}
            >
                <FiShoppingCart size={20} />
                {cartCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                        {cartCount}
                    </span>
                )}
            </button>
            <button 
                className="btn btn-outline-primary position-relative" 
                type="button"
                onClick={handleMessagesClick}
            >
                <FiMessageCircle size={20} />
            </button>
            {externalShowDropdown && (
                <SearchDropdown 
                    shops={shops}
                    products={products}
                    searchTerm={externalSearchTerm || ""}
                    onSelect={onSelectResult}
                    onClickOutside={onClickOutside}
                />
            )}
        </div>
    );

    if (standalone) {
        return (
            <div style={{ position: 'sticky', top: 0, zIndex: 1000, backgroundColor: 'white', borderBottom: '1px solid #dee2e6' }}>
                <div className="container py-3">
                    <div className="row justify-content-center">
                        <div className="col-md-8">
                            {searchBarContent}
                        </div>
                    </div>
                </div>
            </div>
        );
    } else {
        return searchBarContent;
    }
}

export default StickySearchBar;