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

    React.useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await orderAPI.getMyOrders();
            
            if (response.success) {
                setOrders(response.data);
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
            case 'pending': return 'warning';
            case 'confirmed': return 'info';
            case 'on_delivery': return 'primary';
            case 'completed': return 'success';
            case 'cancelled': return 'danger';
            default: return 'secondary';
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="container border border-black rounded p-4">
                <h2 className="text-primary">My Orders</h2>
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
        return (
            <div className="container border border-black rounded p-4">
                <h2 className="text-primary">My Orders</h2>
                <div className="d-flex flex-column align-items-center justify-content-center mt-4">
                    <FiPackage size={64} className="text-secondary" />
                    <h4 className="text-muted mt-3">No Orders Yet</h4>
                    <p className="text-muted">Start shopping to see your orders here</p>
                </div>
                <button 
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                    onClick={() => window.location.href = '/marketplace'}
                >
                    Start Shopping
                </button>
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

                <div className="row g-3">
                    {orders.map(order => (
                        <div key={order._id} className="col-12">
                            <div className="card border rounded-3">
                                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center gap-3">
                                        <span className={`badge bg-${getStatusColor(order.status)}`}>
                                            {getStatusText(order.status)}
                                        </span>
                                        <span className="fw-bold">Order #{order.orderNumber}</span>
                                        <span className="text-muted small">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="fw-bold text-primary">₱{order.totalAmount}</span>
                                        <span className="text-muted">from</span>
                                        <span className="fw-bold">{order.seller?.firstName} {order.seller?.lastName}</span>
                                    </div>
                                </div>
                                
                                <div className="card-body">
                                    <div className="row">
                                        <div className="col-md-8">
                                            <h6 className="mb-3">Items ({order.items.length})</h6>
                                            <div className="row g-2">
                                                {order.items.map((item, index) => (
                                                    <div key={index} className="col-12">
                                                        <div className="d-flex align-items-center gap-3 p-2 border rounded">
                                                            {item.product?.productImages && item.product.productImages.length > 0 ? (
                                                                <img 
                                                                    src={getImageUrl(item.product.productImages[0])} 
                                                                    alt={item.productName}
                                                                    className="img-fluid"
                                                                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                                                                />
                                                            ) : (
                                                                <div 
                                                                    className="bg-light rounded d-flex align-items-center justify-content-center"
                                                                    style={{ width: '60px', height: '60px' }}
                                                                >
                                                                    <FiPackage size={24} className="text-secondary" />
                                                                </div>
                                                            )}
                                                            <div className="flex-grow-1">
                                                                <h6 className="mb-1">{item.productName}</h6>
                                                                <p className="mb-1 text-muted small">Qty: {item.quantity}</p>
                                                                <p className="mb-0 fw-bold text-primary">₱{item.price}</p>
                                                                {item.contactNumber && (
                                                                    <div className="d-flex align-items-center gap-2 mt-1">
                                                                        <FiPhone size={14} className="text-muted" />
                                                                        <span className="text-muted small">Contact: {item.contactNumber}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="col-md-4">
                                            <h6 className="mb-3">Order Details</h6>
                                            <div className="d-flex align-items-start gap-2 mb-2">
                                                <FiMapPin className="text-primary mt-1" />
                                                <div>
                                                    <span className="fw-bold">Pickup Location:</span>
                                                    <p className="mb-0 text-muted">{order.pickupLocation}</p>
                                                </div>
                                            </div>
                                            
                                            {order.note && (
                                                <div className="d-flex align-items-start gap-2 mb-2">
                                                    <FiMessageSquare className="text-primary mt-1" />
                                                    <div>
                                                        <span className="fw-bold">Delivery Note:</span>
                                                        <p className="mb-0 text-muted">{order.note}</p>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {order.contactNumber && (
                                                <div className="d-flex align-items-start gap-2 mb-2">
                                                    <FiPhone className="text-primary mt-1" />
                                                    <div>
                                                        <span className="fw-bold">Contact Number:</span>
                                                        <p className="mb-0 text-muted">{order.contactNumber}</p>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <span className="badge bg-secondary">COD</span>
                                                <span className="text-muted">Cash on Delivery</span>
                                            </div>

                                            <div className="mt-3">
                                                {order.status === 'Pending' && (
                                                    <button 
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={() => handleCancelOrder(order._id)}
                                                    >
                                                        Cancel Order
                                                    </button>
                                                )}
                                                {order.status === 'completed' && (
                                                    <span className="badge bg-success">Order Completed</span>
                                                )}
                                                {order.status === 'cancelled' && (
                                                    <span className="badge bg-danger">Order Cancelled</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
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