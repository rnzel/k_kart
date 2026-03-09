import React from "react";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../../utils/imageUrl.js";
import { FiTrash2, FiShoppingCart, FiMinus, FiPlus, FiArrowLeft, FiShoppingBag } from "react-icons/fi";
import { cartAPI, orderAPI } from "../../utils/api.js";
import CheckoutModal from "../../components/CheckoutModal.jsx";
import DangerModal from "../../components/DangerModal.jsx";
import SuccessModal from "../../components/SuccessModal.jsx";

function CartSection() {
    const navigate = useNavigate();
    const [cart, setCart] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [selectedItems, setSelectedItems] = React.useState([]);

    // Fetch cart from backend
    React.useEffect(() => {
        fetchCart();
    }, []);

    const fetchCart = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await cartAPI.getCart();
            
            if (response.success) {
                const cartData = response.data;
                setCart(cartData.items || []);
                // Initially select all items
                setSelectedItems((cartData.items || []).map(item => item._id));
                
                // Handle removed items notification
                if (response.removedItemsCount > 0) {
                    // Products were removed from cart (likely deleted)
                    const removedCount = response.removedItemsCount;
                    alert(`${removedCount} item(s) were removed from your cart because they are no longer available.`);
                }
            } else {
                setError(response.message || 'Failed to load cart');
            }
        } catch (err) {
            console.error('Failed to fetch cart:', err);
            setError('Failed to load cart. Please check your internet connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    // Group cart items by shop
    const groupedByShop = React.useMemo(() => {
        const groups = {};
        cart.forEach(item => {
            // Use consistent shop identification
            const shopId = item.shop?._id || item.shop || 'unknown';
            const shopName = item.shopName || 'Unknown Shop';
            const shopLogo = item.shopLogo || null;
            
            if (!groups[shopId]) {
                groups[shopId] = {
                    shopName,
                    shopLogo,
                    items: [],
                    selectedItems: []
                };
            }
            groups[shopId].items.push(item);
            if (selectedItems.includes(item._id)) {
                groups[shopId].selectedItems.push(item._id);
            }
        });
        return groups;
    }, [cart, selectedItems]);

    const shopGroups = Object.entries(groupedByShop);

    // Calculate totals
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);

    // Calculate selected totals
    const selectedItemsCount = cart
        .filter(item => selectedItems.includes(item._id))
        .reduce((sum, item) => sum + item.quantity, 0);
    const selectedItemsTotal = cart
        .filter(item => selectedItems.includes(item._id))
        .reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);

    // Handle select all
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedItems(cart.map(item => item._id));
        } else {
            setSelectedItems([]);
        }
    };

    // Handle select shop
    const handleSelectShop = (shopId, itemIds, isSelected) => {
        if (isSelected) {
            // Deselect all items from this shop
            setSelectedItems(prev => prev.filter(id => !itemIds.includes(id)));
        } else {
            // Select all items from this shop
            setSelectedItems(prev => [...prev, ...itemIds.filter(id => !prev.includes(id))]);
        }
    };

    // Handle individual item selection
    const handleSelectItem = (itemId) => {
        if (selectedItems.includes(itemId)) {
            setSelectedItems(selectedItems.filter(id => id !== itemId));
        } else {
            setSelectedItems([...selectedItems, itemId]);
        }
    };

    const updateQuantity = async (itemId, newQuantity) => {
        if (newQuantity < 1) {
            try {
                const response = await cartAPI.removeFromCart(itemId);
                if (response.success) {
                    setCart(response.data.items);
                    setSelectedItems(prev => prev.filter(id => id !== itemId));
                } else {
                    alert(response.message || 'Failed to remove item');
                }
            } catch (err) {
                console.error('Failed to remove item:', err);
                alert('Failed to remove item. Please try again.');
            }
        } else {
            try {
                const response = await cartAPI.updateCartItem(itemId, newQuantity);
                if (response.success) {
                    setCart(response.data.items);
                } else {
                    // Show specific error message
                    if (response.message.includes('Not enough stock')) {
                        alert('Cannot update quantity: Not enough stock available');
                    } else if (response.message.includes('deleted')) {
                        alert('Cannot update quantity: Product is no longer available');
                    } else {
                        alert(response.message || 'Failed to update quantity');
                    }
                }
            } catch (err) {
                console.error('Failed to update quantity:', err);
                alert('Failed to update quantity. Please try again.');
            }
        }
    };

    const handleRemoveItemConfirm = async () => {
        if (!itemToRemove) return;
        
        try {
            const response = await cartAPI.removeFromCart(itemToRemove);
            if (response.success) {
                setCart(response.data.items);
                setSelectedItems(prev => prev.filter(id => id !== itemToRemove));
            } else {
                alert(response.message || 'Failed to remove item');
            }
        } catch (err) {
            console.error('Failed to remove item:', err);
            alert('Failed to remove item. Please try again.');
        } finally {
            setShowRemoveModal(false);
            setItemToRemove(null);
        }
    };

    const handleDeleteSelectedItemsConfirm = async () => {
        try {
            const response = await cartAPI.removeMultipleItems(selectedItems);
            if (response.success) {
                setCart(response.data.items);
                setSelectedItems([]);
            } else {
                alert(response.message || 'Failed to remove items');
            }
        } catch (err) {
            console.error('Failed to remove items:', err);
            alert('Failed to remove items. Please try again.');
        } finally {
            setShowDeleteModal(false);
        }
    };

    const removeItem = async (itemId) => {
        setItemToRemove(itemId);
        setShowRemoveModal(true);
    };

    const removeSelectedItems = async () => {
        setShowDeleteModal(true);
    };

    const continueShopping = () => {
        navigate('/marketplace');
    };

    // Modal state for delete and remove confirmations
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);
    const [showRemoveModal, setShowRemoveModal] = React.useState(false);
    const [itemToRemove, setItemToRemove] = React.useState(null);

    const [showCheckoutModal, setShowCheckoutModal] = React.useState(false);
    const [pickupLocation, setPickupLocation] = React.useState('');
    const [note, setNote] = React.useState('');
    const [contactNumber, setContactNumber] = React.useState('');
    const [checkoutLoading, setCheckoutLoading] = React.useState(false);
    const [checkoutError, setCheckoutError] = React.useState(null);
    const [showSuccessModal, setShowSuccessModal] = React.useState(false);
    const [successMessage, setSuccessMessage] = React.useState('');

    const handleCheckout = () => {
        if (selectedItems.length === 0) {
            alert('Please select at least one item to checkout.');
            return;
        }
        setShowCheckoutModal(true);
    };

    const handleCheckoutConfirm = async () => {
        // Validate pickup location is not empty
        if (!pickupLocation.trim()) {
            setCheckoutError('Please enter a pickup location before placing your order.');
            return;
        }
        
        setCheckoutLoading(true);
        setCheckoutError(null);
        
        try {
            // Send selected items to the backend
            const response = await orderAPI.createOrder(pickupLocation, note, selectedItems, contactNumber);
            
            if (response.success) {
                if (response.data.createdOrders && response.data.createdOrders.length > 0) {
                    const successMsg = `Successfully created ${response.data.createdOrders.length} order(s)!`;
                    setSuccessMessage(successMsg);
                    setShowSuccessModal(true);
                    setShowCheckoutModal(false);
                    setPickupLocation(''); // Clear after successful order
                    setNote('');
                    setCheckoutError(null);
                    fetchCart(); // Refresh cart
                } else {
                    setCheckoutError('No orders were created. Please try again.');
                }
                
                if (response.data.failedOrders && response.data.failedOrders.length > 0) {
                    const failedMessages = response.data.failedOrders.map(f => 
                        `${f.sellerName}: ${f.error}`
                    ).join('\n');
                    alert(`Some orders failed:\n${failedMessages}`);
                }
            } else {
                setCheckoutError(response.message || 'Checkout failed. Please try again.');
            }
        } catch (err) {
            console.error('Checkout failed:', err);
            setCheckoutError('Checkout failed. Please try again.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="container border border-black rounded p-4">
                <h2 className="text-primary">Shopping Cart</h2>
                <div className="d-flex justify-content-center align-items-center mt-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading cart...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="container border border-black rounded p-4">
                <h2 className="text-primary">Shopping Cart</h2>
                <div className="alert alert-danger mt-3" role="alert">
                    {error}
                </div>
                <button className="btn btn-primary" onClick={fetchCart}>
                    Try Again
                </button>
            </div>
        );
    }

    // Empty Cart State
    if (cart.length === 0) {
        return (
            <div className="container border border-black rounded p-4">
                <h2 className="text-primary">Shopping Cart</h2>
                <div className="d-flex flex-column align-items-center justify-content-center mt-4">
                    <FiShoppingCart size={64} className="text-secondary" />
                    <h4 className="text-muted mt-3">Your Cart is Empty</h4>
                    <p className="text-muted">Start adding items to your cart</p>
                </div>
                <button 
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                    onClick={continueShopping}
                >
                    Start Shopping
                </button>
            </div>
        );
    }

    // Render cart item card
    const renderCartItem = (item) => (
        <div key={item._id} className="col-12">
            <div className={`card p-2 border rounded-3 cart-item-card ${selectedItems.includes(item._id) ? 'border-primary' : ''}`}>
                <div className="row align-items-center">
                    {/* Checkbox */}
                    <div className="col-auto">
                        <div className="form-check">
                            <input 
                                type="checkbox" 
                                className="form-check-input"
                                id={`item-${item._id}`}
                                checked={selectedItems.includes(item._id)}
                                onChange={() => handleSelectItem(item._id)}
                            />
                        </div>
                    </div>

                    {/* Product Image */}
                    <div className="col-3 col-md-3 col-lg-2">
                        {item.productImages && item.productImages.length > 0 ? (
                            <img 
                                src={getImageUrl(item.productImages[0])} 
                                alt={item.productName}
                                className="img-fluid rounded"
                                style={{ height: '80px', width: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div 
                                className="bg-light rounded d-flex align-items-center justify-content-center"
                                style={{ height: '80px' }}
                            >
                                <FiShoppingCart size={24} className="text-secondary" />
                            </div>
                        )}
                    </div>

                    {/* Product Details */}
                    <div className="col-5 col-md-6 col-lg-6">
                        <h6 className="mb-1 text-truncate">{item.productName}</h6>
                        <div className="mt-2">
                            <span className="fw-bold text-primary">₱{item.productPrice}</span>
                            {item.productStock !== undefined && (
                                <span className={`badge ms-2 ${item.quantity > item.productStock ? 'bg-danger' : 'bg-success'}`}>
                                    {item.productStock} in stock
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="col-4 col-md-3 col-lg-2 mt-2 mt-md-0 d-flex justify-content-end">
                        <div className="d-flex align-items-center justify-content-between justify-content-md-center">
                            <div className="input-group" style={{ maxWidth: '100px' }}>
                                <button 
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => updateQuantity(item._id, item.quantity - 1)}
                                    disabled={loading}
                                >
                                    <FiMinus size={14} />
                                </button>
                                <input 
                                    type="text" 
                                    className="form-control form-control-sm text-center" 
                                    value={item.quantity}
                                    readOnly
                                />
                                <button 
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => updateQuantity(item._id, item.quantity + 1)}
                                    disabled={loading || item.quantity >= (item.productStock || 999)}
                                >
                                    <FiPlus size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subtotal & Remove Row */}
                <div className="row mt-3 pt-3 border-top">
                    <div className="col-6">
                        <span className="text-muted">Subtotal: </span>
                        <span className="fw-bold">₱{item.productPrice * item.quantity}</span>
                    </div>
                    <div className="col-6 text-end">
                        <button 
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => removeItem(item._id)}
                            disabled={loading}
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="container border border-black rounded p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="text-primary mb-0">Shopping Cart ({totalItems} items)</h4>
            </div>

            {/* Select All Row */}
            <div className="d-flex align-items-center mb-3 p-2 bg-light rounded">
                <div className="form-check">
                    <input 
                        type="checkbox" 
                        className="form-check-input"
                        id="selectAll"
                        checked={selectedItems.length === cart.length && cart.length > 0}
                        onChange={handleSelectAll}
                    />
                    <label className="form-check-label font-weight-semibold" htmlFor="selectAll">
                        All ({cart.length})
                    </label>
                </div>
                    {selectedItems.length > 0 && (
                        <button 
                            className="btn btn-outline-primary btn-sm ms-auto"
                            onClick={removeSelectedItems}
                            disabled={loading}
                        >
                            Delete ({selectedItems.length})
                        </button>
                    )}
            </div>

            {/* Grouped by Shop */}
            <div className="row g-3">
                {shopGroups.map(([shopId, shopGroup]) => {
                    const shopTotal = shopGroup.items.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
                    const shopSelectedTotal = shopGroup.items
                        .filter(item => selectedItems.includes(item._id))
                        .reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
                    const allShopSelected = shopGroup.items.every(item => selectedItems.includes(item._id));
                    const someShopSelected = shopGroup.items.some(item => selectedItems.includes(item._id));

                    return (
                        <div key={shopId} className="col-12">
                            {/* Shop Header */}
                            <div className="d-flex align-items-center gap-2 mb-2 p-2 bg-light rounded">
                                <div className="form-check">
                                    <input 
                                        type="checkbox" 
                                        className="form-check-input"
                                        id={`shop-${shopId}`}
                                        checked={allShopSelected}
                                        ref={el => {
                                            if (el) el.indeterminate = someShopSelected && !allShopSelected;
                                        }}
                                        onChange={() => handleSelectShop(shopId, shopGroup.items.map(i => i._id), allShopSelected)}
                                    />
                                </div>
                                {shopGroup.shopLogo ? (
                                    <img 
                                        src={getImageUrl(shopGroup.shopLogo)} 
                                        alt={shopGroup.shopName}
                                        style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <FiShoppingBag className="text-primary" size={18} />
                                )}
                                <span className="fw-bold text-primary">{shopGroup.shopName}</span>
                                <span className="text-muted small">({shopGroup.items.length} items)</span>
                                {someShopSelected && (
                                    <span className="ms-auto fw-bold text-primary">
                                        ₱{shopSelectedTotal}
                                    </span>
                                )}
                            </div>

                            {/* Shop Items */}
                            {shopGroup.items.map(item => renderCartItem(item))}

                            {/* Shop Subtotal */}
                            <div className="d-flex justify-content-end mb-3 px-2">
                                <span className="text-muted">
                                    Shop Total: <span className="fw-bold">₱{shopTotal}</span>
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Order Summary Section */}
            <div className="mt-4">
                <div className="card border border-black rounded p-4 order-summary-card" style={{ maxWidth: '100%' }}>
                    <h5 className="mb-4">Order Summary</h5>
                    
                    <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Total Items</span>
                        <span>{totalItems}</span>
                    </div>
                    
                    <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Cart Total</span>
                        <span>₱{totalPrice}</span>
                    </div>

                    {selectedItems.length > 0 && selectedItems.length < cart.length && (
                        <>
                            <div className="d-flex justify-content-between mb-2 text-primary mb-0">
                                <span>Selected ({selectedItemsCount} items)</span>
                                <span>₱{selectedItemsTotal}</span>
                            </div>
                        </>
                    )}
                    
                    <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Shipping</span>
                        <span className="text-success">Free</span>
                    </div>
                    
                    <hr />
                    
                    <div className="d-flex justify-content-between mb-4">
                        <span className="fw-bold">Selected Total</span>
                        <span className="fw-bold text-primary" style={{ fontSize: '1.25rem' }}>₱{selectedItemsTotal}</span>
                    </div>

                    <button 
                        className="btn btn-primary w-100 py-2"
                        onClick={handleCheckout}
                        disabled={selectedItems.length === 0 || loading}
                    >
                        {loading ? 'Processing...' : `Checkout (${selectedItemsCount})`}
                    </button>

                    {selectedItems.length === 0 && (
                        <p className="text-muted small text-center mt-2">
                            Please select items to checkout
                        </p>
                    )}
                </div>
            </div>

            {/* Checkout Modal */}
            <CheckoutModal
                showModal={showCheckoutModal}
                onClose={() => {
                    setShowCheckoutModal(false);
                    setCheckoutError(null);
                }}
                onConfirm={handleCheckoutConfirm}
                pickupLocation={pickupLocation}
                note={note}
                contactNumber={contactNumber}
                onPickupLocationChange={setPickupLocation}
                onNoteChange={setNote}
                onContactNumberChange={setContactNumber}
                loading={checkoutLoading}
                error={checkoutError}
            />

            {/* Delete Selected Items Modal */}
            <DangerModal
                show={showDeleteModal}
                onHide={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteSelectedItemsConfirm}
                title="Delete Selected Items"
                message={`Are you sure you want to delete ${selectedItems.length} selected item(s) from your cart? This action cannot be undone.`}
                confirmText="Delete Items"
                loading={loading}
            />

            {/* Remove Single Item Modal */}
            <DangerModal
                show={showRemoveModal}
                onHide={() => {
                    setShowRemoveModal(false);
                    setItemToRemove(null);
                }}
                onConfirm={handleRemoveItemConfirm}
                title="Remove Item"
                message="Are you sure you want to remove this item from your cart? This action cannot be undone."
                confirmText="Remove Item"
                loading={loading}
            />

            {/* Success Modal */}
            <SuccessModal
                showModal={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Order Placed Successfully"
                message={successMessage}
                buttonText="Continue Shopping"
                onButtonClick={() => {
                    setShowSuccessModal(false);
                    navigate('/marketplace');
                }}
            />
        </div>
    );
}

export default CartSection;
