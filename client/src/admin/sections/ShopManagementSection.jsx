import React from "react";
import { FiShoppingBag, FiUser, FiCheckCircle, FiXCircle, FiClock, FiEye, FiRefreshCw, FiSearch } from "react-icons/fi";
import { shopAPI } from "../../utils/api.js";
import { getImageUrl } from "../../utils/imageUrl.js";

function ShopManagementSection() {
    const [shops, setShops] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [totalShops, setTotalShops] = React.useState(0);

    React.useEffect(() => {
        fetchShops(1);
    }, []);

    const fetchShops = async (page = 1) => {
        try {
            setLoading(true);
            setError(null);
            const response = await shopAPI.getAllShops(page, 10);
            
            if (response.success) {
                setShops(response.data);
                setCurrentPage(page);
                setTotalPages(response.pagination?.totalPages || 1);
                setTotalShops(response.pagination?.totalShops || 0);
            } else {
                setError(response.message || 'Failed to load shops');
            }
        } catch (err) {
            console.error('Failed to fetch shops:', err);
            setError('Failed to load shops. Please check your internet connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return 'Pending';
            case 'approved': return 'Approved';
            case 'rejected': return 'Rejected';
            default: return status;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'approved': return 'success';
            case 'rejected': return 'danger';
            default: return 'secondary';
        }
    };

    const filteredShops = shops.filter(shop => 
        shop.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.owner?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.owner?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.shopDescription.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Loading state
    if (loading) {
        return (
            <div className="container border border-black rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-primary mb-0">Shop Management</h2>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => fetchShops(currentPage)}
                    >
                        <FiRefreshCw className="me-2" />
                        Refresh
                    </button>
                </div>

                <div className="d-flex justify-content-center align-items-center mt-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading shops...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="container border border-black rounded p-4">
                <h2 className="text-primary">Shop Management</h2>
                <div className="alert alert-danger mt-3" role="alert">
                    {error}
                </div>
                <button className="btn btn-primary" onClick={fetchShops}>
                    Try Again
                </button>
            </div>
        );
    }

    // Empty state
    if (shops.length === 0) {
        return (
            <div className="container border border-black rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-primary mb-0">Shop Management</h2>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => fetchShops(currentPage)}
                    >
                        <FiRefreshCw className="me-2" />
                        Refresh
                    </button>
                </div>

                <div className="d-flex flex-column align-items-center justify-content-center mt-4">
                    <FiShoppingBag size={64} className="text-secondary" />
                    <h4 className="text-muted mt-3">No shops found</h4>
                    <p className="text-muted">No shops have been created yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container border border-black rounded p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-primary mb-0">Shop Management</h2>
                <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => fetchShops(currentPage)}
                >
                    <FiRefreshCw className="me-2" />
                    Refresh
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
                <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                        <FiSearch className="text-muted" />
                    </span>
                    <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Search shops by name, owner, or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>


            {/* Shops Table */}
            <div className="table-responsive">
                <table className="table table-hover">
                    <thead className="table-light">
                        <tr>
                            <th>Shop Logo</th>
                            <th>Shop Name</th>
                            <th>Owner</th>
                            <th>Status</th>
                            <th>Products</th>
                            <th>Created Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredShops.map(shop => (
                            <tr key={shop._id}>
                                <td>
                                    {shop.shopLogo ? (
                                        <img 
                                            src={getImageUrl(shop.shopLogo)} 
                                            alt={shop.shopName}
                                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '50%' }}
                                        />
                                    ) : (
                                        <div 
                                            className="bg-light rounded-circle d-flex align-items-center justify-content-center"
                                            style={{ width: '50px', height: '50px' }}
                                        >
                                            <FiShoppingBag size={24} className="text-secondary" />
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <div>
                                        <strong>{shop.shopName}</strong>
                                        <br />
                                        <small className="text-muted">{shop.shopDescription}</small>
                                    </div>
                                </td>
                                <td>
                                    {shop.owner ? (
                                        <div>
                                            <div>{shop.owner.firstName} {shop.owner.lastName}</div>
                                            <small className="text-muted">{shop.owner.email}</small>
                                        </div>
                                    ) : (
                                        <span className="text-muted">No owner assigned</span>
                                    )}
                                </td>
                                <td>
                                    <span className={`badge bg-${getStatusColor(shop.status)} text-white`}>
                                        {getStatusText(shop.status)}
                                    </span>
                                </td>
                                <td>
                                    <span className="badge bg-primary">{shop.productsCount || 0}</span>
                                </td>
                                <td>
                                    {new Date(shop.createdAt).toLocaleDateString()}
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
                        Page {currentPage} of {totalPages} ({totalShops} shops)
                    </span>
                    <div className="d-flex gap-2">
                        <button 
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => fetchShops(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>
                        <button 
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => fetchShops(currentPage + 1)}
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

export default ShopManagementSection;