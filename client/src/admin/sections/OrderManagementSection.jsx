import React from "react";
import { FiPackage, FiTruck, FiCheckCircle, FiXCircle, FiClock, FiUser, FiDollarSign, FiEye, FiRefreshCw, FiSearch, FiShoppingBag } from "react-icons/fi";
import { orderAPI } from "../../utils/api.js";
import { getImageUrl } from "../../utils/imageUrl.js";

function OrderManagementSection() {
    const [orders, setOrders] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [totalOrders, setTotalOrders] = React.useState(0);

    React.useEffect(() => {
        fetchOrders(1);
    }, []);

    const fetchOrders = async (page = 1) => {
        try {
            setLoading(true);
            setError(null);
            const response = await orderAPI.getAllOrders(page, 10);
            
            if (response.success) {
                setOrders(response.data);
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

    const filteredOrders = orders.filter(order => 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.buyer?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.buyer?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.seller?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.seller?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Loading state
    if (loading) {
        return (
            <div className="container border border-black rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-primary mb-0">Order Management</h2>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => fetchOrders(currentPage)}
                    >
                        <FiRefreshCw className="me-2" />
                        Refresh
                    </button>
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
                <h2 className="text-primary">Order Management</h2>
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
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-primary mb-0">Order Management</h2>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => fetchOrders(currentPage)}
                    >
                        <FiRefreshCw className="me-2" />
                        Refresh
                    </button>
                </div>

                <div className="d-flex flex-column align-items-center justify-content-center mt-4">
                    <FiPackage size={64} className="text-secondary" />
                    <h4 className="text-muted mt-3">No orders found</h4>
                    <p className="text-muted">No orders have been placed yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container border border-black rounded p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-primary mb-0">Order Management</h2>
                <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => fetchOrders(currentPage)}
                >
                    <FiRefreshCw className="me-2" />
                    Refresh
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
                <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                        <FiSearch className="text-muted"/>
                    </span>
                    <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Search orders by order number, buyer, seller, or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>


            {/* Orders Table */}
            <div className="table-responsive">
                <table className="table table-hover">
                    <thead className="table-light">
                        <tr>
                            <th>Order #</th>
                            <th>Buyer</th>
                            <th>Seller</th>
                            <th>Items</th>
                            <th>Total Amount</th>
                            <th>Status</th>
                            <th>Pickup Location</th>
                            <th>Created Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order._id}>
                                <td>
                                    <strong className="text-primary">#{order.orderNumber}</strong>
                                </td>
                                <td>
                                    {order.buyer ? (
                                        <div>
                                            <div>{order.buyer.firstName} {order.buyer.lastName}</div>
                                            <small className="text-muted">{order.buyer.email}</small>
                                        </div>
                                    ) : (
                                        <span className="text-muted">No buyer info</span>
                                    )}
                                </td>
                                <td>
                                    {order.seller ? (
                                        <div>
                                            <div>{order.seller.firstName} {order.seller.lastName}</div>
                                            <small className="text-muted">{order.seller.email}</small>
                                        </div>
                                    ) : (
                                        <span className="text-muted">No seller info</span>
                                    )}
                                </td>
                                <td>
                                    <span className="badge bg-secondary">{order.items.length}</span>
                                </td>
                                <td>
                                    <strong className="text-primary">₱{order.totalAmount.toLocaleString()}</strong>
                                </td>
                                <td>
                                    <span className={`badge bg-${getStatusColor(order.status)} text-white`}>
                                        {getStatusText(order.status)}
                                    </span>
                                </td>
                                <td>
                                    <small className="text-muted">{order.pickupLocation}</small>
                                </td>
                                <td>
                                    {new Date(order.createdAt).toLocaleDateString()}
                                </td>
                                <td>
                                    <button className="btn btn-outline-primary btn-sm">
                                        <FiEye className="me-1" />
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
    );
}

export default OrderManagementSection;