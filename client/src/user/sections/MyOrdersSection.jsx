import React from "react";
import { FiPackage, FiTruck, FiCheckCircle, FiXCircle, FiClock, FiMapPin, FiMessageSquare, FiEye, FiRefreshCw, FiPhone } from "react-icons/fi";
import { orderAPI } from "../../utils/api.js";
import { getImageUrl } from "../../utils/imageUrl.js";
import DangerModal from "../../components/DangerModal";
import SuccessModal from "../../components/SuccessModal";

function MyOrdersSection() {
    const [orders, setOrders] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [selectedOrder, setSelectedOrder] = React.useState(null);
    const [showCancelModal, setShowCancelModal] = React.useState(false);
    const [orderToCancel, setOrderToCancel] = React.useState(null);
    const [showSuccessModal, setShowSuccessModal] = React.useState(false);
    const [cancelLoading, setCancelLoading] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('all');
    const [searchTerm, setSearchTerm] = React.useState("");
    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [totalOrders, setTotalOrders] = React.useState(0);

    React.useEffect(() => {
        fetchOrders(1); // Reset to page 1 when tab changes
    }, [activeTab]);

    const fetchOrders = async (page = 1) => {
        try {
            setLoading(true);
            setError(null);
            const response = await orderAPI.getMyOrders(page, 10);
            
            if (response.success) {
                let filteredOrders = response.data;
                
                // Filter orders based on active tab
                if (activeTab !== 'all') {
                    filteredOrders = response.data.filter(order => {
                        const orderStatus = order.status.toLowerCase();
                        const tabStatus = activeTab.toLowerCase();
                        return orderStatus === tabStatus;
                    });
                }
                
                setOrders(filteredOrders);
                setCurrentPage(page);
                setTotalPages(response.pagination?.totalPages || 1);
                setTotalOrders(response.pagination?.totalOrders || 0);
            } else {
                setError(response.message || 'Failed to load orders');
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err);
            setError('Failed to load orders. Please check your internet connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = (orderId) => {
        setOrderToCancel(orderId);
        setShowCancelModal(true);
    };

    const handleCancelOrderConfirm = async (orderId) => {
        try {
            setCancelLoading(true);
            const response = await orderAPI.cancelOrder(orderId);
            if (response.success) {
                setShowSuccessModal(true);
                setShowCancelModal(false);
                fetchOrders(); // Refresh orders
            } else {
                alert(response.message || 'Failed to cancel order. Please try again.');
            }
        } catch (err) {
            console.error('Failed to cancel order:', err);
            alert('Failed to cancel order. Please try again.');
        } finally {
            setCancelLoading(false);
        }
    };


    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return 'Pending';
            case 'confirmed': return 'Confirmed';
            case 'on_delivery': return 'On Delivery';
            case 'completed': return 'Completed';
            case 'cancelled': return 'Cancelled';
            default: return status;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending':
            case 'pending': return 'warning';
            case 'Confirmed':
            case 'confirmed': return 'info';
            case 'On-Delivery':
            case 'on_delivery': return 'primary';
            case 'Completed':
            case 'completed': return 'success';
            case 'Cancelled':
            case 'cancelled': return 'danger';
            default: return 'secondary';
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="container border border-black rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-primary mb-0">My Orders</h2>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={fetchOrders}
                    >
                        <FiRefreshCw className="me-2" />
                        Refresh
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="row mb-4">
                    <div>
                        <ul className="nav nav-tabs">
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'all' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('all')}
                                >
                                    All
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'pending' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('pending')}
                                >
                                    Pending
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'confirmed' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('confirmed')}
                                >
                                    Confirmed
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'on_delivery' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('on_delivery')}
                                >
                                    On Delivery
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'completed' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('completed')}
                                >
                                    Completed
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'cancelled' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('cancelled')}
                                >
                                    Cancelled
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="d-flex justify-content-center align-items-center mt-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading orders...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="container border border-black rounded p-4">
                <h2 className="text-primary">My Orders</h2>
                <div className="alert alert-danger mt-3" role="alert">
                    {error}
                </div>
                <button className="btn btn-primary" onClick={fetchOrders}>
                    Try Again
                </button>
            </div>
        );
    }

    // Empty state
    if (orders.length === 0) {
        const getEmptyStateMessage = () => {
            switch (activeTab) {
                case 'pending':
                    return 'No pending orders';
                case 'confirmed':
                    return 'No confirmed orders';
                case 'on_delivery':
                    return 'No orders on delivery';
                case 'completed':
                    return 'No completed orders';
                case 'cancelled':
                    return 'No cancelled orders';
                default:
                    return 'No orders yet';
            }
        };

        const getEmptyStateDescription = () => {
            switch (activeTab) {
                case 'pending':
                    return 'Your pending orders will appear here';
                case 'confirmed':
                    return 'Your confirmed orders will appear here';
                case 'on_delivery':
                    return 'Your orders on delivery will appear here';
                case 'completed':
                    return 'Your completed orders will appear here';
                case 'cancelled':
                    return 'Your cancelled orders will appear here';
                default:
                    return 'Start shopping to see your orders here';
            }
        };

        return (
            <div className="container border border-black rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-primary mb-0">My Orders</h2>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={fetchOrders}
                    >
                        <FiRefreshCw className="me-2" />
                        Refresh
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="row mb-4">
                    <div>
                        <ul className="nav nav-tabs">
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'all' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('all')}
                                >
                                    All
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'pending' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('pending')}
                                >
                                    Pending
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'confirmed' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('confirmed')}
                                >
                                    Confirmed
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'on_delivery' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('on_delivery')}
                                >
                                    On Delivery
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'completed' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('completed')}
                                >
                                    Completed
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'cancelled' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('cancelled')}
                                >
                                    Cancelled
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="d-flex flex-column align-items-center justify-content-center mt-4">
                    <FiPackage size={64} className="text-secondary" />
                    <h4 className="text-muted mt-3">{getEmptyStateMessage()}</h4>
                    <p className="text-muted">{getEmptyStateDescription()}</p>
                </div>
                {activeTab === 'all' && (
                    <button 
                        className="btn btn-primary"
                        style={{ width: "100%" }}
                        onClick={() => window.location.href = '/marketplace'}
                    >
                        Start Shopping
                    </button>
                )}
            </div>
        );
    }

    return (
        <>
            <div className="container border border-black rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-primary mb-0">My Orders</h2>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={fetchOrders}
                    >
                        <FiRefreshCw className="me-2" />
                        Refresh
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="row mb-4">
                    <div>
                        <ul className="nav nav-tabs">
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'all' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('all')}
                                >
                                    All
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'pending' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('pending')}
                                >
                                    Pending
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'confirmed' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('confirmed')}
                                >
                                    Confirmed
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'on_delivery' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('on_delivery')}
                                >
                                    On Delivery
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'completed' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('completed')}
                                >
                                    Completed
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'cancelled' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                    onClick={() => setActiveTab('cancelled')}
                                >
                                    Cancelled
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="row g-4">
                    {orders.map(order => (
                        <div key={order._id} className="col-12">
                            <div className="card border rounded">
                                <div className="card-header bg-white p-3">
                                    <div className="row align-items-center">
                                        <div className="col-md-6 col-lg-7">
                                            <div className="d-flex align-items-center gap-3">
                                                <span className={`badge bg-${getStatusColor(order.status)} text-white fs-small px-3 py-2 fw-semibold`}>
                                                    {getStatusText(order.status)}
                                                </span>
                                                <div>
                                                    <span className="font-weight-semibold fs-8">Order #{order.orderNumber}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6 col-lg-5 text-md-end">
                                            <div className="d-flex flex-column align-items-md-end">
                                                <span className="small">
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="card-body p-4">
                                    <div className="row g-4">
                                        <div className="col-lg-8">
                                            <div className="d-flex align-items-center justify-content-between mb-3">
                                                <h6 className="mb-0 fw-semibold text-dark">Items ({order.items.length})</h6>
                                                <span className="badge bg-light text-dark fw-normal">
                                                    {order.items.length === 1 ? '1 item' : `${order.items.length} items`}
                                                </span>
                                            </div>
                                            <div className="row g-3">
                                                {order.items.map((item, index) => (
                                                    <div key={index} className="col-12">
                                                        <div className="card border rounded-3 p-3 h-100">
                                                            <div className="row g-3">
                                                                <div className="col-auto">
                                                                    <div className="position-relative">
                                                                        {item.product?.productImages && item.product.productImages.length > 0 ? (
                                                                            <img 
                                                                                src={getImageUrl(item.product.productImages[0])} 
                                                                                alt={item.productName}
                                                                                className="img-fluid rounded-3"
                                                                                style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                                                                            />
                                                                        ) : (
                                                                            <div 
                                                                                className="bg-light rounded-3 d-flex align-items-center justify-content-center"
                                                                                style={{ width: '80px', height: '80px' }}
                                                                            >
                                                                                <FiPackage size={32} className="text-secondary" />
                                                                            </div>
                                                                        )}
                                                                        {item.quantity > 1 && (
                                                                            <span className="position-absolute top-0 start-100 translate-middle badge bg-primary rounded-pill">
                                                                                x{item.quantity}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="col">
                                                                    <div className="d-flex flex-column h-100">
                                                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                                                            <h6 className="mb-0 fw-semibold text-dark">{item.productName}</h6>
                                                                            <span className="badge bg-primary-subtle text-primary fw-semibold px-2 py-1">
                                                                                ₱{item.price}
                                                                            </span>
                                                                        </div>
                                                                        <div className="d-flex flex-wrap gap-2 mt-auto">
                                                                            <span className="badge bg-light text-dark fw-normal">Qty: {item.quantity}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="col-lg-4">
                                            <div className="d-flex align-items-center justify-content-between mb-3">
                                                <h6 className="mb-0 fw-semibold text-dark">Order Details</h6>
                                                <span className="badge bg-primary text-white fw-bold">COD</span>
                                            </div>
                                            
                                            <div className="card border rounded-3 p-3 mb-3">
                                                <div className="d-flex align-items-start gap-3 mb-2">
                                                    <div className="rounded-circle p-2">
                                                        <FiMapPin className="text-primary" size={20} />
                                                    </div>
                                                    <div>
                                                        <span className="fw-semibold text-dark">Pickup Location</span>
                                                        <p className="mb-0 text-muted small mt-1">{order.pickupLocation}</p>
                                                    </div>
                                                </div>
                                                
                                                {order.note && (
                                                    <div className="d-flex align-items-start gap-3 mb-2">
                                                        <div className="rounded-circle p-2">
                                                            <FiMessageSquare className="text-primary" size={20} />
                                                        </div>
                                                        <div>
                                                            <span className="fw-semibold text-dark">Delivery Note</span>
                                                            <p className="mb-0 text-muted small mt-1">{order.note}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {order.contactNumber && (
                                                    <div className="d-flex align-items-start gap-3">
                                                        <div className="rounded-circle p-2">
                                                            <FiPhone className="text-primary" size={20} />
                                                        </div>
                                                        <div>
                                                            <span className="fw-semibold text-dark">Contact Number</span>
                                                            <p className="mb-0 text-muted small mt-1">{order.contactNumber}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <div className="d-flex">
                                                <div>
                                                    <div className="mt-2">
                                                        <span className="fw-bold text-primary">Total Amount: ₱{order.totalAmount}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="d-flex">
                                                {(order.status === 'pending' || order.status === 'Pending') && (
                                                    <button 
                                                        className="btn btn-primary"
                                                        onClick={() => handleCancelOrder(order._id)}
                                                    >
                                                        Cancel Order
                                                    </button>
                                                )}
                                                {order.status === 'completed' && (
                                                    <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-2">
                                                        <FiCheckCircle className="me-1" /> Order Completed
                                                    </span>
                                                )}
                                                {order.status === 'cancelled' && (
                                                    <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-2">
                                                        <FiXCircle className="me-1" /> Order Cancelled
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-4">
                        <span className="text-muted small">
                            Page {currentPage} of {totalPages} ({totalOrders} orders)
                        </span>
                        <div className="d-flex gap-2">
                            <button 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => fetchOrders(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>
                            <button 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => fetchOrders(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <DangerModal
                show={showCancelModal}
                onHide={() => setShowCancelModal(false)}
                onConfirm={() => handleCancelOrderConfirm(orderToCancel)}
                title="Cancel Order"
                message="Are you sure you want to cancel this order? This action cannot be undone."
                loading={cancelLoading}
            />

            <SuccessModal
                showModal={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Order Cancelled Successfully"
                message="Your order has been cancelled"
                buttonText="Close"
                onButtonClick={() => setShowSuccessModal(false)}
            />
        </>
    );
}

export default MyOrdersSection;
