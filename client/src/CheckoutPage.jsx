import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiMapPin, FiMessageSquare, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { FiShoppingCart, FiEye, FiPlus, FiMinus } from "react-icons/fi";
import { getImageUrl } from "./utils/imageUrl.js";
import { cartAPI, orderAPI } from "./utils/api.js";
import DangerModal from "./components/DangerModal.jsx";
import SuccessModal from "./components/SuccessModal.jsx";
import Navbar from "./components/Navbar.jsx";
import StickySearchBar from "./components/StickySearchBar.jsx";
import api from "./utils/api.js";

function CheckoutPage() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get query parameters for single product checkout
    const queryParams = new URLSearchParams(location.search);
    const productId = queryParams.get('productId');
    const quantityParam = queryParams.get('quantity');
    
    // State management
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cart, setCart] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [pickupLocation, setPickupLocation] = useState('');
    const [note, setNote] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    // Get user information from localStorage
    const [userName, setUserName] = useState('');
    
    // Single product state (for direct checkout)
    const [singleProduct, setSingleProduct] = useState(null);
    const [singleProductQuantity, setSingleProductQuantity] = useState(parseInt(quantityParam) || 1);
    
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.firstName && user.lastName) {
            setUserName(`${user.firstName} ${user.lastName}`);
        }
        
        if (productId) {
            // Single product checkout - fetch product details
            fetchSingleProduct();
        } else {
            // Cart checkout - fetch cart
            fetchCart();
        }
    }, [productId]);

    const fetchSingleProduct = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Fetch product data from API
            const response = await api.get(`/api/products/${productId}`);
            
            if (response.data && response.data.success) {
                const productData = response.data.data;
                setSingleProduct(productData);
                
                // Auto-select the product for checkout
                setSelectedItems([productData._id]);
            } else {
                setError("Failed to load product. Please try again.");
            }
        } catch (err) {
            console.error("Error fetching product:", err);
            if (err.response?.status === 404) {
                setError("Product not found.");
            } else if (err.response?.status === 401) {
                setError("Please log in to view this product.");
            } else {
                setError("Failed to load product. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

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

    // Calculate totals for single product
    const singleProductTotal = singleProduct ? singleProduct.productPrice * singleProductQuantity : 0;

    // Calculate totals for cart
    const selectedItemsCount = cart
        .filter(item => selectedItems.includes(item._id))
        .reduce((sum, item) => sum + item.quantity, 0);
    const selectedItemsTotal = cart
        .filter(item => selectedItems.includes(item._id))
        .reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);

    const handleQuantityChange = (newQuantity) => {
        if (newQuantity < 1) return;
        if (newQuantity > (singleProduct?.productStock || 0)) return;
        setSingleProductQuantity(newQuantity);
    };

    const handleCheckout = () => {
        if (selectedItems.length === 0) {
            alert('Please select at least one item to checkout.');
            return;
        }
        // For single product, we proceed directly to checkout
        if (productId) {
            // Single product checkout
            if (!pickupLocation.trim()) {
                setCheckoutError('Please enter a pickup location before placing your order.');
                return;
            }
            handleSingleProductCheckout();
        } else {
            // Cart checkout - show modal (this would need to be implemented)
            alert('Cart checkout functionality would be implemented here.');
        }
    };

    const handleSingleProductCheckout = async () => {
        setCheckoutLoading(true);
        setCheckoutError(null);
        
        try {
            // For single product, we need to add it to cart first, then checkout
            const addToCartResponse = await cartAPI.addToCart(productId, singleProductQuantity);
            
            if (addToCartResponse.success) {
                // Now checkout from cart
                const checkoutResponse = await orderAPI.createOrder(
                    pickupLocation, 
                    note, 
                    [addToCartResponse.data.items.find(item => item.product.toString() === productId)?._id], 
                    contactNumber
                );
                
                if (checkoutResponse.success) {
                    if (checkoutResponse.data.createdOrders && checkoutResponse.data.createdOrders.length > 0) {
                        const successMsg = `Successfully created ${checkoutResponse.data.createdOrders.length} order(s)!`;
                        setSuccessMessage(successMsg);
                        setShowSuccessModal(true);
                        setCheckoutError(null);
                    } else {
                        setCheckoutError('No orders were created. Please try again.');
                    }
                } else {
                    setCheckoutError(checkoutResponse.message || 'Checkout failed. Please try again.');
                }
            } else {
                setCheckoutError(addToCartResponse.message || 'Failed to add item to cart.');
            }
        } catch (err) {
            console.error('Checkout failed:', err);
            setCheckoutError('Checkout failed. Please try again.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleGoBack = () => {
        if (productId) {
            navigate(`/product/${productId}`);
        } else {
            navigate('/dashboard');
        }
    };

    // Loading state
    if (loading) {
        return (
            <div>
                <Navbar />
                <StickySearchBar 
                    showBackButton={true}
                    onBackClick={handleGoBack}
                />
                <div className="container py-5">
                    <div className="d-flex justify-content-center align-items-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div>
                <Navbar />
                <StickySearchBar />
                <div className="container py-5">
                    <div className="row justify-content-center">
                        <div className="col-md-8">
                            <div className="alert alert-danger" role="alert">
                                {error}
                            </div>
                            <div className="text-center">
                                <button className="btn btn-primary" onClick={productId ? fetchSingleProduct : fetchCart}>
                                    Try Again
                                </button>
                                <button className="btn btn-secondary ms-2" onClick={handleGoBack}>
                                    Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Navbar />
            <StickySearchBar 
                showBackButton={true}
                onBackClick={handleGoBack}
            />
            
            <div className="container mt-4">
                <div className="border border-black">
                    <div className="row">
                        {/* Order Summary */}
                        <div className="col-lg-6 mb-4">
                            <div className="card">
                                <div className="card-header bg-light">
                                    <h5 className="mb-0">Order Summary</h5>
                                </div>
                                <div className="card-body">
                                    {userName && (
                                        <div className="mb-3 d-flex justify-content-between">
                                            <div>
                                                <h6 className="text-muted mb-2">Customer</h6>
                                            </div>
                                            <div className="fw-bold">{userName}</div>
                                        </div>
                                    )}
                                    
                                    {productId && singleProduct ? (
                                        // Single Product View
                                        <div className="d-flex align-items-start mb-3">
                                            <div style={{ width: "80px", height: "80px" }}>
                                                {singleProduct.productImages && singleProduct.productImages.length > 0 ? (
                                                    <img 
                                                        src={getImageUrl(singleProduct.productImages[0])} 
                                                        alt={singleProduct.productName}
                                                        className="img-fluid rounded"
                                                        style={{ height: "80px", width: "100%", objectFit: "cover" }}
                                                    />
                                                ) : (
                                                    <div 
                                                        className="bg-light rounded d-flex align-items-center justify-content-center"
                                                        style={{ height: "80px" }}
                                                    >
                                                        <FiShoppingCart size={24} className="text-secondary" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ms-3 flex-grow-1">
                                                <h6 className="mb-1">{singleProduct.productName}</h6>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-primary fw-bold">₱{singleProduct.productPrice}</span>
                                                    <div className="d-flex align-items-center">
                                                        <button 
                                                            className="btn btn-outline-secondary btn-sm"
                                                            onClick={() => handleQuantityChange(singleProductQuantity - 1)}
                                                            disabled={singleProductQuantity <= 1}
                                                        >
                                                            <FiMinus size={14} />
                                                        </button>
                                                        <input 
                                                            type="text" 
                                                            className="form-control form-control-sm text-center mx-2" 
                                                            value={singleProductQuantity}
                                                            readOnly
                                                            style={{ width: "60px" }}
                                                        />
                                                        <button 
                                                            className="btn btn-outline-secondary btn-sm"
                                                            onClick={() => handleQuantityChange(singleProductQuantity + 1)}
                                                            disabled={singleProductQuantity >= (singleProduct.productStock || 999)}
                                                        >
                                                            <FiPlus size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-muted small mt-1">
                                                    Quantity: {singleProductQuantity} | Total: ₱{singleProductTotal}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Cart Items View
                                        <div>
                                            <h6 className="text-muted mb-3">Selected Items ({selectedItemsCount})</h6>
                                            {cart
                                                .filter(item => selectedItems.includes(item._id))
                                                .map(item => (
                                                    <div key={item._id} className="d-flex align-items-start mb-3">
                                                        <div style={{ width: "60px", height: "60px" }}>
                                                            {item.productImages && item.productImages.length > 0 ? (
                                                                <img 
                                                                    src={getImageUrl(item.productImages[0])} 
                                                                    alt={item.productName}
                                                                    className="img-fluid rounded"
                                                                    style={{ height: "60px", width: "100%", objectFit: "cover" }}
                                                                />
                                                            ) : (
                                                                <div 
                                                                    className="bg-light rounded d-flex align-items-center justify-content-center"
                                                                    style={{ height: "60px" }}
                                                                >
                                                                    <FiShoppingCart size={20} className="text-secondary" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ms-3 flex-grow-1">
                                                            <h6 className="mb-1 text-truncate">{item.productName}</h6>
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <span className="text-primary fw-bold">₱{item.productPrice}</span>
                                                                <span className="text-muted small">x{item.quantity}</span>
                                                            </div>
                                                            <div className="text-muted small mt-1">
                                                                Total: ₱{item.productPrice * item.quantity}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                    
                                    <hr />
                                    
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted">Subtotal</span>
                                        <span>₱{productId ? singleProductTotal : selectedItemsTotal}</span>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted">Shipping</span>
                                        <span className="text-success">Free</span>
                                    </div>
                                    <hr />
                                    <div className="d-flex justify-content-between mb-4">
                                        <span className="fw-bold">Total</span>
                                        <span className="fw-bold text-primary" style={{ fontSize: '1.25rem' }}>
                                            ₱{productId ? singleProductTotal : selectedItemsTotal}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Checkout Form */}
                        <div className="col-lg-6 border">
                            <div className="card">
                                <div className="card-header bg-light">
                                    <h5 className="mb-0">Checkout</h5>
                                </div>
                                <div className="card-body">
                                    {/* Error Display */}
                                    {checkoutError && (
                                        <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                                            <FiAlertCircle className="me-2" />
                                            <div>{checkoutError}</div>
                                        </div>
                                    )}
                                    
                                    {/* Pickup Location Field */}
                                    <div className="mb-3">
                                        <label className="form-label fw-bold"> 
                                            <FiMapPin className="me-2" />
                                            Pickup Location
                                            <span className="text-primary"> *</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            className={`form-control ${pickupLocation.trim() && pickupLocation.trim().length > 200 ? 'is-invalid' : pickupLocation.trim() ? 'is-valid' : ''}`}
                                            value={pickupLocation}
                                            onChange={(e) => setPickupLocation(e.target.value)}
                                            placeholder="Enter specific location inside SorSU – Bulan Campus"
                                            maxLength="200"
                                            disabled={checkoutLoading}
                                        />
                                        <div className="form-text">Please enter a specific location inside SorSU – Bulan Campus for pickup (max 200 characters)</div>
                                        {!pickupLocation.trim() && (
                                            <div className="invalid-feedback">
                                                Pickup location is required
                                            </div>
                                        )}
                                        {pickupLocation.trim() && pickupLocation.trim().length > 200 && (
                                            <div className="invalid-feedback">
                                                Pickup location cannot exceed 200 characters
                                            </div>
                                        )}
                                        {pickupLocation.trim() && pickupLocation.trim().length <= 200 && (
                                            <div className="valid-feedback">
                                                <FiCheckCircle className="me-1" />Valid pickup location
                                            </div>
                                        )}
                                    </div>

                                    {/* Contact Number Field */}
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            <FiMessageSquare className="me-2" />
                                            Contact Number
                                            <span className="text-primary"> *</span>
                                        </label>
                                        <input 
                                            type="tel" 
                                            className={`form-control ${contactNumber.trim() && !/^[0-9]{10}$/.test(contactNumber) ? 'is-invalid' : contactNumber.trim() && /^[0-9]{10}$/.test(contactNumber) ? 'is-valid' : ''}`}
                                            value={contactNumber}
                                            onChange={(e) => setContactNumber(e.target.value)}
                                            placeholder="09XXXXXXXXX"
                                            pattern="[0-9]{10}"
                                            maxLength="10"
                                            disabled={checkoutLoading}
                                        />
                                        <div className="form-text">Enter your 10-digit mobile number (e.g., 09123456789)</div>
                                        {!contactNumber.trim() && (
                                            <div className="invalid-feedback">
                                                Contact number is required
                                            </div>
                                        )}
                                        {contactNumber.trim() && !/^[0-9]{10}$/.test(contactNumber) && (
                                            <div className="invalid-feedback">
                                                Please enter a valid 10-digit Philippine mobile number
                                            </div>
                                        )}
                                        {contactNumber.trim() && /^[0-9]{10}$/.test(contactNumber) && (
                                            <div className="valid-feedback">
                                                <FiCheckCircle className="me-1" />Valid contact number
                                            </div>
                                        )}
                                    </div>

                                    {/* Delivery Instructions Field */}
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            <FiMessageSquare className="me-2" />
                                            Delivery Instructions (Optional)
                                        </label>
                                        <textarea 
                                            className="form-control"
                                            rows="3"
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder="Any special instructions for delivery..."
                                            maxLength="500"
                                            disabled={checkoutLoading}
                                        ></textarea>
                                        <div className="form-text">Add any special instructions for delivery (optional, max 500 characters)</div>
                                    </div>

                                    {/* Information Alerts */}
                                    <div className="alert alert-info">
                                        <strong>Payment Method:</strong> Cash on Delivery (COD)
                                    </div>
                                    <div className="alert alert-warning">
                                        <strong>Note:</strong> Items will be delivered inside Sorsogon State University – Bulan Campus
                                    </div>

                                    {/* Checkout Button */}
                                    <div className="d-grid">
                                        <button 
                                            className="btn btn-primary py-3"
                                            onClick={handleCheckout}
                                            disabled={checkoutLoading || !pickupLocation.trim() || !contactNumber.trim() || !/^[0-9]{10}$/.test(contactNumber)}
                                        >
                                            {checkoutLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Processing Order...
                                                </>
                                            ) : (
                                                `Place Order - ₱${productId ? singleProductTotal : selectedItemsTotal}`
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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

export default CheckoutPage;