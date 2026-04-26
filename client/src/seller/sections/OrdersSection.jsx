import React from "react";
import { FiPackage, FiTruck, FiCheckCircle, FiXCircle, FiClock, FiMapPin, FiMessageSquare, FiEye, FiRefreshCw, FiUser, FiPhone } from "react-icons/fi";
import { orderAPI } from "../../utils/api.js";
import { getImageUrl } from "../../utils/imageUrl.js";
import DangerModal from "../../components/DangerModal";
import SuccessModal from "../../components/SuccessModal";

function OrdersSection() {
    const [orders, setOrders] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [selectedOrder, setSelectedOrder] = React.useState(null);
    const [showCancelModal, setShowCancelModal] = React.useState(false);
    const [orderToCancel, setOrderToCancel] = React.useState(null);
    const [showSuccessModal, setShowSuccessModal] = React.useState(false);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [totalOrders, setTotalOrders] = React.useState(0);
    const [activeTab, setActiveTab] = React.useState('all');
    const [statusLoading, setStatusLoading] = React.useState(null); // Track which order is being updated
    const [successModalConfig, setSuccessModalConfig] = React.useState({ title: '', message: '' });
    const [showStatusConfirmModal, setShowStatusConfirmModal] = React.useState(false);
    const [statusToUpdate, setStatusToUpdate] = React.useState({ orderId: null, newStatus: '' });

    React.useEffect(() => {
        fetchOrders(1); // Reset to page 1 when tab changes
    }, [activeTab]);

    // Normalize status for filtering (handle both 'On-Delivery' from backend and 'on_delivery' from tab)
    const normalizeStatusForFilter = (status) => {
        if (!status) return '';
        return status.toLowerCase().replace(/[-]/g, '_');
    };

    const fetchOrders = async (page = 1) => {
        const safePage = typeof page === 'number' && Number.isFinite(page) ? page : 1;
        try {
            setLoading(true);
            setError(null);
            const response = await orderAPI.getSellerOrders(safePage, 10);
            
            if (response.success) {
                const data = Array.isArray(response.data) ? response.data : [];
                let filteredOrders = data;
                
                // Filter orders based on active tab
                if (activeTab !== 'all') {
                    filteredOrders = data.filter(order => {
                        const orderStatus = normalizeStatusForFilter(order.status);
                        const tabStatus = activeTab.toLowerCase();
                        return orderStatus === tabStatus;
                    });
                }
                
                setOrders(filteredOrders);
                setCurrentPage(safePage);
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

    const handleUpdateStatus = async (orderId, newStatus) => {
        setStatusLoading(orderId);
        try {
            const response = await orderAPI.updateOrderStatus(orderId, newStatus);
            if (response.success) {
                // Set dynamic success message based on action
                setSuccessModalConfig({
                    title: 'Order Status Updated',
                    message: `Order has been ${newStatus === 'Confirmed' ? 'confirmed' : newStatus === 'On-Delivery' ? 'marked as on delivery' : 'completed'} successfully.`
                });
                setShowSuccessModal(true);
                // Reset to 'all' tab to show the updated order
                setActiveTab('all');
                fetchOrders(); // Refresh orders
            } else {
                alert(response.message || 'Failed to update order status. Please try again.');
            }
        } catch (err) {
            console.error('Failed to update order status:', err);
            alert('Failed to update order status. Please try again.');
        } finally {
            setStatusLoading(null);
        }
    };

    const handleCancelOrder = (orderId) => {
        setOrderToCancel(orderId);
        setShowCancelModal(true);
    };

    const handleCancelOrderConfirm = async (orderId) => {
        try {
            const response = await orderAPI.cancelOrder(orderId);
            if (response.success) {
                setSuccessModalConfig({
                    title: 'Order Cancelled Successfully',
                    message: 'The order has been cancelled and the stock has been restored.'
                });
                setShowSuccessModal(true);
                // Reset to 'all' tab to show the updated order
                setActiveTab('all');
                fetchOrders(); // Refresh orders
            } else {
                alert(response.message || 'Failed to cancel order. Please try again.');
            }
        } catch (err) {
            console.error('Failed to cancel order:', err);
            alert('Failed to cancel order. Please try again.');
        }
    };

    // Handle status update with confirmation
    const handleStatusUpdateClick = (orderId, newStatus) => {
        setStatusToUpdate({ orderId, newStatus });
        setShowStatusConfirmModal(true);
    };

    const handleStatusUpdateConfirm = async () => {
        setShowStatusConfirmModal(false);
        await handleUpdateStatus(statusToUpdate.orderId, statusToUpdate.newStatus);
    };


    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return 'Pending';
            case 'confirmed': return 'Confirmed';
            case 'on_delivery': return 'On-Delivery';
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

// Normalize status to handle case inconsistencies (e.g., 'pending' vs 'Pending' vs 'On-Delivery' vs 'on_delivery')
const normalizeStatus = (status) => {
    if (!status) return '';
    const normalized = status.toLowerCase().replace(/[_-]/g, '');
    switch (normalized) {
        case 'pending': return 'Pending';
        case 'confirmed': return 'Confirmed';
        case 'ondelivery': return 'On-Delivery';
        case 'completed': return 'Completed';
        case 'cancelled': return 'Cancelled';
        default: return status; // Return as-is if not recognized
    }
};

const getAvailableStatuses = (currentStatus) => {
    const normalizedStatus = normalizeStatus(currentStatus);
    const statusFlow = {
        'Pending': ['Confirmed'],
        'Confirmed': ['On-Delivery'],
        'On-Delivery': ['Completed'],
        'Completed': [],
        'Cancelled': []
    };
    return statusFlow[normalizedStatus] || [];
};

    // Loading state
    if (loading) {
        return (
            <div className="container border border-black rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-primary mb-0">Orders</h2>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => fetchOrders(currentPage)}
                    >
                        <FiRefreshCw className="me-2" />
                        Refresh
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="row mb-4">
                    <div className="nav-tabs-wrapper">
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
                <h2 className="text-primary">Orders</h2>
                <div className="alert alert-danger mt-3" role="alert">
                    {error}
                </div>
                <button className="btn btn-primary" onClick={() => fetchOrders(currentPage)}>
                    Try Again
                </button>
            </div>
        );
    }

    // Empty state with shop guidance
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
                    return 'You have no pending orders at the moment';
                case 'confirmed':
                    return 'You have no confirmed orders at the moment';
                case 'on_delivery':
                    return 'You have no orders on delivery at the moment';
                case 'completed':
                    return 'You have no completed orders at the moment';
                case 'cancelled':
                    return 'You have no cancelled orders at the moment';
                default:
                    return 'You haven\'t received any orders yet';
            }
        };

        return (
            <div className="container border border-black rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-primary mb-0">Orders</h2>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => fetchOrders(currentPage)}
                    >
                        <FiRefreshCw className="me-2" />
                        Refresh
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="row mb-4">
                    <div className="nav-tabs-wrapper">
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
            </div>
        );
    }

    return (
        <>
            <div className="container border border-black rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-primary mb-0">Orders</h2>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => fetchOrders(currentPage)}
                    >
                        <FiRefreshCw className="me-2" />
                        Refresh
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="row mb-4">
                    <div className="nav-tabs-wrapper">
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
                    {Array.isArray(orders) && orders.length > 0 ? (
                        orders.map(order => (
                            <div key={order._id} className="col-12">
                                <div className="card border border-black rounded order-card">
                                    <div className="card-header bg-white p-3">
                                        <div className="d-flex flex-wrap align-items-center justify-content-between">
                                            <div className="d-flex flex-column">
                                                <span className="font-weight-semibold order-id-text">Order #{order.orderNumber}</span>
                                                <span className="small text-muted order-date-text">
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <span className={`badge bg-${getStatusColor(order.status)} text-white fs-small px-3 py-2 fw-semibold order-status-badge`}>
                                                {getStatusText(order.status)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="card-body p-4">
                                        <div className="row g-4">
                                            <div className="col-lg-8">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <h6 className="mb-0 fw-semibold text-dark">Items ({order.items.length})</h6>
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
                                                                                    className="img-fluid rounded-3 order-product-img"
                                                                                    style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                                                                                />
                                                                            ) : (
                                                                                <div 
                                                                                    className="bg-light rounded-3 d-flex align-items-center justify-content-center order-product-img"
                                                                                    style={{ width: '80px', height: '80px' }}
                                                                                >
                                                                                    <FiPackage size={32} className="text-secondary" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="col">
                                                                        <div className="d-flex flex-column h-100">
                                                                            <h6 className="mb-0 fw-semibold text-dark">{item.productName}</h6>
                                                                            <div className="d-flex justify-content-between align-items-center mt-auto">
                                                                                <span className="small text-muted">Qty: {item.quantity}</span>
                                                                                <span className="small fw-semibold text-primary">₱{item.price}</span>
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
                                                            <FiUser className="text-primary" size={20} />
                                                        </div>
                                                        <div>
                                                            <span className="fw-semibold text-dark">Buyer</span>
                                                            <span className="d-block text-muted small">
                                                                {order.buyer?.firstName} {order.buyer?.lastName}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {order.contactNumber && (
                                                        <div className="d-flex align-items-start gap-3 mb-2">
                                                            <div className="rounded-circle p-2">
                                                                <FiPhone className="text-primary" size={20} />
                                                            </div>
                                                            <div>
                                                                <span className="fw-semibold text-dark">Contact Number</span>
                                                                <a href={`tel:${order.contactNumber}`} className="d-block text-primary small">
                                                                    {order.contactNumber}
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="d-flex align-items-start gap-3 mb-2">
                                                        <div className="rounded-circle p-2">
                                                            <FiMapPin className="text-primary" size={20} />
                                                        </div>
                                                        <div>
                                                            <span className="fw-semibold text-dark">Pickup Location</span>
                                                            <span className="d-block text-muted small">{order.pickupLocation}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {order.note && (
                                                        <div className="d-flex align-items-start gap-3 mb-2">
                                                            <div className="rounded-circle p-2">
                                                                <FiMessageSquare className="text-primary" size={20} />
                                                            </div>
                                                        <div>
                                                            <span className="fw-semibold text-dark">Delivery Note</span>
                                                            <span className="d-block text-muted small">{order.note}</span>
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
                                                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                                                            <div className="btn-group-vertical" role="group">
                                                    {getAvailableStatuses(order.status).map(status => (
                                                        <button 
                                                            key={status}
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => {
                                                                if (status === 'Cancelled') {
                                                                    handleCancelOrder(order._id);
                                                                } else {
                                                                    handleStatusUpdateClick(order._id, status);
                                                                }
                                                            }}
                                                            disabled={loading || statusLoading === order._id}
                                                        >
                                                            {statusLoading === order._id ? (
                                                                <span className="spinner-border spinner-border-sm me-1" role="status">
                                                                    <span className="visually-hidden">Loading...</span>
                                                                </span>
                                                            ) : null}
                                                            {status === 'Confirmed' && 'Confirm Order'}
                                                            {status === 'On-Delivery' && 'Mark as On-Delivery'}
                                                            {status === 'Completed' && 'Mark as Completed'}
                                                            {status === 'Cancelled' && 'Cancel Order'}
                                                        </button>
                                                    ))}
                                                            </div>
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
                        ))
                    ) : !loading && (
                        <div className="col-12 text-center py-5">
                            <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
                                <FiPackage size={48} className="text-muted" />
                            </div>
                            <h5 className="text-dark fw-semibold">No orders found</h5>
                            <p className="text-muted">You don't have any orders {activeTab !== 'all' ? `in the ${activeTab} category` : 'yet'}.</p>
                        </div>
                    )}
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
                onConfirm={() => {
                    handleCancelOrderConfirm(orderToCancel);
                    setShowCancelModal(false);
                }}
                title="Cancel Order"
                message="Are you sure you want to cancel this order? This action cannot be undone."
            />

            <SuccessModal
                showModal={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title={successModalConfig.title}
                message={successModalConfig.message}
                buttonText="Close"
                onButtonClick={() => setShowSuccessModal(false)}
            />

            <DangerModal
                show={showStatusConfirmModal}
                onHide={() => setShowStatusConfirmModal(false)}
                onConfirm={handleStatusUpdateConfirm}
                title="Confirm Status Update"
                message={`Are you sure you want to update this order status to ${statusToUpdate.newStatus}?`}
            />
        </>
    );
}

export default OrdersSection;
