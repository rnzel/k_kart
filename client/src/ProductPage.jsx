import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiShoppingCart, FiBox, FiPlus, FiMinus, FiArrowLeft, FiShoppingBag, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { getImageUrl } from "./utils/imageUrl.js";
import { cartAPI, orderAPI } from "./utils/api.js";
import DangerModal from "./components/DangerModal.jsx";
import SuccessModal from "./components/SuccessModal.jsx";
import CheckoutModal from "./components/CheckoutModal.jsx";
import Navbar from "./components/Navbar.jsx";
import StickySearchBar from "./components/StickySearchBar.jsx";
import api from "./utils/api.js";
import './product-page-styles.css';

function ProductPage() {
    const { productId } = useParams();
    const navigate = useNavigate();
    
    // State management
    const [product, setProduct] = useState(null);
    const [shop, setShop] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    
    // Modal states
    const [showOutOfStockModal, setShowOutOfStockModal] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [pickupLocation, setPickupLocation] = useState('');
    const [note, setNote] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState(null);
    
    // Get user information from localStorage
    const [userName, setUserName] = useState('');
    
    // Initialize user name
    React.useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.firstName && user.lastName) {
            setUserName(`${user.firstName} ${user.lastName}`);
        }
    }, []);

    // Fetch product data
    useEffect(() => {
        fetchProductData();
    }, [productId]);

    const fetchProductData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Fetch real product data from API
            const response = await api.get(`/api/products/${productId}`);
            
            if (response.data && response.data.success) {
                const productData = response.data.data;
                setProduct(productData);
                setShop(productData.shop);
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

    // Handle quantity changes
    const handleQuantityChange = (newQuantity) => {
        if (newQuantity < 1) return;
        if (newQuantity > (product?.productStock || 0)) return;
        setQuantity(newQuantity);
    };

    // Add to cart functionality
    const handleAddToCart = async () => {
        if (!product) return;
        
        if (product.productStock <= 0) {
            setShowOutOfStockModal(true);
            return;
        }

        setIsAddingToCart(true);
        try {
            const response = await cartAPI.addToCart(product._id, quantity);
            if (response.success) {
                setSuccessMessage(`Added ${quantity} ${quantity > 1 ? 'items' : 'item'} to cart!`);
                setShowSuccessModal(true);
            } else {
                alert(response.message || "Failed to add to cart");
            }
        } catch (err) {
            console.error("Error adding to cart:", err);
            alert("Failed to add to cart. Please try again.");
        } finally {
            setIsAddingToCart(false);
        }
    };

    // Buy now functionality
    const handleBuyNow = () => {
        if (!product) return;
        
        if (product.productStock <= 0) {
            setShowOutOfStockModal(true);
            return;
        }
        
        // Show checkout modal
        setShowCheckoutModal(true);
    };

    // Handle checkout confirmation
    const handleCheckoutConfirm = async () => {
        // Validate pickup location is not empty
        if (!pickupLocation.trim()) {
            setCheckoutError('Please enter a pickup location before placing your order.');
            return;
        }
        
        // Validate contact number
        if (!contactNumber.trim()) {
            setCheckoutError('Please enter a contact number before placing your order.');
            return;
        }
        
        // Validate Philippine phone number format
        if (!/^09[0-9]{9}$/.test(contactNumber)) {
            setCheckoutError('Contact number must be an 11-digit Philippine number starting with 09 (e.g., 09123456789)');
            return;
        }
        
        setCheckoutLoading(true);
        setCheckoutError(null);
        
        try {
            // Create order directly without adding to cart first
            const response = await orderAPI.createOrder(pickupLocation, note, [{
                productId: product._id,
                quantity: quantity
            }], contactNumber);
            
            if (response.success) {
                if (response.data.createdOrders && response.data.createdOrders.length > 0) {
                    const successMsg = `Successfully created ${response.data.createdOrders.length} order(s)!`;
                    setSuccessMessage(successMsg);
                    setShowSuccessModal(true);
                    setShowCheckoutModal(false);
                    setPickupLocation(''); // Clear after successful order
                    setNote('');
                    setContactNumber('');
                    setCheckoutError(null);
                } else {
                    setCheckoutError('No orders were created. Please try again.');
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


    // Go back to marketplace
    const handleGoBack = () => {
        navigate('/marketplace');
    };

    // Loading state
    if (loading) {
        return (
            <div>
                <Navbar />
            <StickySearchBar 
                showBackButton={true}
                onBackClick={handleGoBack}
                showSuggestions={loading || error || !product ? false : true}
                placeholder="Search for products, shops, or categories..."
                onCartClick={() => navigate('/dashboard?section=cart')}
                onMessagesClick={() => navigate('/dashboard?section=messages')}
            />
                <div className="container py-5">
                    <div className="d-flex justify-content-center align-items-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading product...</span>
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
                <StickySearchBar showSuggestions={false} />
                <div className="container py-5">
                    <div className="row justify-content-center">
                        <div className="col-md-8">
                            <div className="alert alert-danger" role="alert">
                                {error}
                            </div>
                            <div className="text-center">
                                <button className="btn btn-primary" onClick={fetchProductData}>
                                    Try Again
                                </button>
                                <button className="btn btn-secondary ms-2" onClick={handleGoBack}>
                                    Back to Marketplace
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Product not found
    if (!product) {
        return (
            <div>
                <Navbar />
                <StickySearchBar showSuggestions={false} />
                <div className="container py-5">
                    <div className="row justify-content-center">
                        <div className="col-md-8 text-center">
                            <h2 className="text-danger">Product Not Found</h2>
                            <p className="text-muted">The product you're looking for doesn't exist or has been removed.</p>
                            <button className="btn btn-primary" onClick={handleGoBack}>
                                Back to Marketplace
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Get current main image
    const mainImage = product.productImages && product.productImages.length > 0 
        ? getImageUrl(product.productImages[selectedImageIndex])
        : null;

    // Get thumbnail images
    const thumbnailImages = product.productImages && product.productImages.length > 0 
        ? product.productImages.map((image, index) => ({
            url: getImageUrl(image),
            index: index
        }))
        : [];

    return (
        <div>
            <Navbar />
            <StickySearchBar 
                showBackButton={true}
                onBackClick={handleGoBack}
                showSuggestions={loading || error || !product ? false : true}
                placeholder="Search for products, shops, or categories..."
                onCartClick={() => navigate('/dashboard?section=cart')}
                onMessagesClick={() => navigate('/dashboard?section=messages')}
            />
            
            <div className="container mt-4">
                {/* Product Details Section */}
                <div className="mb-3">
                    <div className="row">
                        {/* Product Images */}
                        <div className="col-lg-6 mb-4">
                            {/* Main Image */}
                            <div className="position-relative">
                                {mainImage ? (
                                    <img 
                                        src={mainImage} 
                                        alt={product.productName}
                                        className="img-fluid w-100"
                                        style={{ height: "350px", objectFit: "cover" }}
                                    />
                                ) : (
                                    <div className="d-flex align-items-center justify-content-center bg-light" style={{ height: "500px" }}>
                                        <FiBox size={128} className="text-secondary" />
                                    </div>
                                )}
                                {/* Stock Badge */}
                                {product.productStock <= 0 && (
                                    <div className="position-absolute top-0 end-0 m-3">
                                        <span className="badge bg-danger fs-6">Out of Stock</span>
                                    </div>
                                )}
                                {product.productStock > 0 && product.productStock <= 5 && (
                                    <div className="position-absolute top-0 end-0 m-3">
                                        <span className="badge bg-warning text-dark fs-6">Low Stock</span>
                                    </div>
                                )}
                                {/* Left Navigation Button */}
                                {thumbnailImages.length > 1 && (
                                    <button
                                        className="btn btn-outline-primary position-absolute top-50 start-0 translate-middle-y ms-3"
                                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', border: 'none', width: '40px', height: '40px' }}
                                        onClick={() => setSelectedImageIndex((selectedImageIndex - 1 + thumbnailImages.length) % thumbnailImages.length)}
                                        aria-label="Previous image"
                                    >
                                        <FiChevronLeft size={24} />
                                    </button>
                                )}
                                {/* Right Navigation Button */}
                                {thumbnailImages.length > 1 && (
                                    <button
                                        className="btn btn-outline-primary position-absolute top-50 end-0 translate-middle-y me-3"
                                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', border: 'none', width: '40px', height: '40px' }}
                                        onClick={() => setSelectedImageIndex((selectedImageIndex + 1) % thumbnailImages.length)}
                                        aria-label="Next image"
                                    >
                                        <FiChevronRight size={24} />
                                    </button>
                                )}
                            </div>
                            
                            {/* Thumbnail Gallery */}
                            {thumbnailImages.length > 1 && (
                                <div className="p-3 border-top">
                                    <div className="row g-2">
                                        {thumbnailImages.map((image, index) => (
                                            <div key={index} className="col-4">
                                                <button
                                                    className={`w-100 border rounded overflow-hidden ${selectedImageIndex === index ? 'border-primary' : 'border-secondary'}`}
                                                    style={{ height: "80px", padding: 0 }}
                                                    onClick={() => setSelectedImageIndex(index)}
                                                >
                                                    <img 
                                                        src={image.url} 
                                                        alt={`Product image ${index + 1}`}
                                                        className="img-fluid h-100 w-100"
                                                        style={{ objectFit: "cover" }}
                                                    />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Product Details */}
                        <div className="col-lg-6">
                            <div className="card border border-black p-2">
                                <div className="card-body">
                                    {/* Shop Info */}
                                    <div className="d-flex align-items-center mb-3">
                                        {shop?.shopLogo ? (
                                            <img 
                                                src={getImageUrl(shop.shopLogo)} 
                                                alt={shop.shopName}
                                                className="rounded-circle me-3"
                                                style={{ width: "50px", height: "50px", objectFit: "cover" }}
                                            />
                                        ) : (
                                            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: "50px", height: "50px" }}>
                                                <FiShoppingBag size={24} className="text-white" />
                                            </div>
                                        )}
                                        <div>
                                            <h6 className="mb-1 fw-bold">{shop?.shopName || 'Unknown Shop'}</h6>
                                        </div>
                                        <button 
                                            className="btn btn-outline-primary ms-auto"
                                            onClick={() => navigate(`/shop/${shop?._id}`)}
                                        >
                                            Visit Shop
                                        </button>
                                    </div>

                                    <hr />

                                    {/* Product Title */}
                                    <h2 className="card-title mb-2">{product.productName}</h2>
                                    
                                    {/* Price and Stock */}
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div>
                                            <span className="h4 text-primary fw-bold">₱{product.productPrice.toLocaleString()}</span>
                                            <span className="text-muted ms-2">per pieces</span>
                                        </div>
                                        <div className="text-end">
                                            <span className={`badge ${product.productStock > 0 ? 'bg-success' : 'bg-danger'}`}>
                                                {product.productStock > 0 ? `${product.productStock} in stock` : 'Out of Stock'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="mb-4">
                                        <h6 className="text-muted mb-2">Description</h6>
                                        <p className="text-muted">{product.productDescription}</p>
                                    </div>

                                    {/* Quantity Selector */}
                                    <div className="mb-4">
                                        <h6 className="text-muted mb-2">Quantity</h6>
                                        <div className="d-flex align-items-center">
                                            <button 
                                                className="btn btn-outline-primary border-1"
                                                onClick={() => handleQuantityChange(quantity - 1)}
                                                disabled={quantity <= 1 || isAddingToCart}
                                            >
                                                <FiMinus />
                                            </button>
                                            <input 
                                                type="number"
                                                className="form-control border-0 text-center"
                                                value={quantity}
                                                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                                                min="1"
                                                max={product.productStock}
                                                style={{ width: "100px" }}
                                                disabled={isAddingToCart}
                                            />
                                            <button 
                                                className="btn btn-outline-primary border-1"
                                                onClick={() => handleQuantityChange(quantity + 1)}
                                                disabled={quantity >= (product.productStock || 0) || isAddingToCart}
                                            >
                                                <FiPlus />
                                            </button>
                                        </div>
                                        <small className="text-muted">
                                            Maximum quantity: {product.productStock}
                                        </small>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="d-flex gap-2">
                                        <button 
                                            className="btn btn-secondary w-100 d-flex align-items-center justify-content-center gap-2"
                                            onClick={handleAddToCart}
                                            disabled={product.productStock <= 0 || isAddingToCart}
                                        >
                                            {isAddingToCart ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                    Adding to Cart...
                                                </>
                                            ) : (
                                                <>
                                                    <FiShoppingCart size={16} />
                                                    Add to Cart - ₱{(product.productPrice * quantity).toLocaleString()}
                                                </>
                                            )}
                                        </button>
                                        
                                        <button 
                                            className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                                            onClick={handleBuyNow}
                                            disabled={product.productStock <= 0 || isAddingToCart}
                                        >
                                            Buy Now - ₱{(product.productPrice * quantity).toLocaleString()}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
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
                itemDetails={{
                    productName: product?.productName || 'Selected Product',
                    quantity: quantity,
                    price: product?.productPrice || 0,
                    total: product ? product.productPrice * quantity : 0
                }}
                userName={userName}
            />

            <SuccessModal
                showModal={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Added to Cart"
                message={successMessage}
                buttonText="Continue Shopping"
                onButtonClick={() => setShowSuccessModal(false)}
            />

            <DangerModal
                show={showOutOfStockModal}
                onHide={() => setShowOutOfStockModal(false)}
                onConfirm={() => setShowOutOfStockModal(false)}
                title="Out of Stock"
                message="This product is currently out of stock. Please try again later or contact the seller."
                confirmText="Close"
            />
        </div>
    );
}

export default ProductPage;
