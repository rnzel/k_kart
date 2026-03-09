import React from "react";
import { adminAPI } from "../../utils/api.js";
import { FiTrash2, FiClock, FiCheck, FiX, FiChevronLeft, FiChevronRight, FiUsers, FiSearch } from "react-icons/fi";
import DangerModal from "../../components/DangerModal";

// Custom debounce hook
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = React.useState(value);

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

function UsersSection() {
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 });
    const [currentUserId, setCurrentUserId] = React.useState(null);
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);
    const [userToDelete, setUserToDelete] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('all');
    const [searchTerm, setSearchTerm] = React.useState("");
    const [currentPage, setCurrentPage] = React.useState(1);
    
    // Debounce search term to avoid excessive API calls
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    React.useEffect(() => {
        // Get current user ID from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                setCurrentUserId(user.id);
            } catch (e) {
                console.error('Failed to parse user data');
            }
        }
        fetchUsers(1);
    }, [activeTab]);

    // Handle search changes with debounced term
    React.useEffect(() => {
        fetchUsers(1);
    }, [debouncedSearchTerm, activeTab]);

    const fetchUsers = async (page) => {
        try {
            setLoading(true);
            const role = activeTab === 'all' ? null : activeTab;
            const response = await adminAPI.getUsers(page, 10, role, debouncedSearchTerm);
            setUsers(response.data.users);
            setPagination(response.data.pagination);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        setUserToDelete(userId);
        setShowDeleteModal(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        
        try {
            await adminAPI.deleteUser(userToDelete);
            // Remove the deleted user from the list
            setUsers(users.filter(user => user._id !== userToDelete));
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete user");
        }
    };

    const getRoleBadge = (role, shopName, activeTab) => {
        switch (role) {
            case 'admin':
                return <span className="badge bg-danger small">Admin</span>;
            case 'seller':
                return (
                    <div>
                        <span className="badge bg-success small">Seller</span>
                        {/* For Sellers tab, shop name is shown in separate column, so don't show it here */}
                        {activeTab !== 'seller' && shopName && (
                            <span className="badge bg-light text-dark small ms-1 border">
                                {shopName}
                            </span>
                        )}
                    </div>
                );
            default:
                return <span className="badge bg-secondary small">Buyer</span>;
        }
    };

    const getSellerStatusBadge = (status) => {
        if (!status) return null;
        switch (status) {
            case 'pending':
                return <span className="badge bg-warning small ms-1">Pending</span>;
            case 'approved':
                return <span className="badge bg-success small ms-1">Approved</span>;
            case 'rejected':
                return <span className="badge bg-danger small ms-1">Rejected</span>;
            default:
                return null;
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            fetchUsers(newPage);
        }
    };

    return (
        <div className="container border border-black rounded p-4">
            <h2 className="text-primary mb-4">Users</h2>
            
            {/* Tabs with Search Bar */}
            <div className="row mb-4">
                <div className="col-lg-8">
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
                                className={`nav-link ${activeTab === 'buyer' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                onClick={() => setActiveTab('buyer')}
                            >
                                Buyers
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'seller' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                                onClick={() => setActiveTab('seller')}
                            >
                                Sellers
                            </button>
                        </li>
                    </ul>
                </div>
                <div className="col-lg-4">
                    <div className="position-relative d-flex gap-2">
                        <div className="input-group flex-grow-1">
                            <span className="input-group-text bg-white border-end-0">
                                <FiSearch className="text-muted" />
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {/* Responsive User List */}
            {loading ? (
                <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-5">
                    <FiUsers size={48} className="text-muted mb-3" />
                    <h5 className="text-muted">No {activeTab === 'all' ? 'Users' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + ' Users'}</h5>
                    <p className="text-muted">There are no {activeTab === 'all' ? 'users' : activeTab} in this category.</p>
                </div>
            ) : (
                <div className="user-list-container">
                    {/* Desktop/Tablet Table Layout */}
                    <div className="table-responsive d-none d-lg-block">
                        <table className="table table-hover align-middle">
                            <thead>
                                <tr>
                                    <th className="small">Name</th>
                                    <th className="small">Email</th>
                                    <th className="small">Role</th>
                                    {activeTab === 'seller' && <th className="small">Shop</th>}
                                    {activeTab === 'all' && <th className="small">Seller Status</th>}
                                    <th className="small">Registered</th>
                                    <th className="small text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user._id}>
                                        <td>
                                            <div className="small text-truncate" title={`${user.firstName} ${user.lastName}`}>
                                                {user.firstName} {user.lastName}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="small text-muted text-truncate" title={user.email}>
                                                {user.email}
                                            </div>
                                        </td>
                                        <td>
                                            {getRoleBadge(user.role, user.shopName, activeTab)}
                                        </td>
                                        {activeTab === 'seller' && (
                                            <td>
                                                {user.shopName ? (
                                                    <span className="badge bg-light text-dark small border">
                                                        {user.shopName}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted small">No shop</span>
                                                )}
                                            </td>
                                        )}
                                        {activeTab === 'all' && (
                                            <td>
                                                {getSellerStatusBadge(user.sellerStatus)}
                                            </td>
                                        )}
                                        <td>
                                            <div className="small text-muted text-nowrap">
                                                {new Date(user.dateRegistered || user.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            {user._id !== currentUserId && (
                                                <button 
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => handleDeleteUser(user._id)}
                                                    title="Delete User"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="d-lg-none">
                        {users.map(user => (
                            <div key={user._id} className="user-item-card card mb-3">
                                <div className="card-body p-3">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <h6 className="mb-0 small">{user.firstName} {user.lastName}</h6>
                                            <small className="text-muted">{user.email}</small>
                                        </div>
                                        <div className="text-end">
                                            {getRoleBadge(user.role, user.shopName, activeTab)}
                                            {activeTab === 'seller' && user.shopName && (
                                                <div className="mt-1">
                                                    <span className="badge bg-light text-dark small border">
                                                        {user.shopName}
                                                    </span>
                                                </div>
                                            )}
                                            {activeTab === 'all' && getSellerStatusBadge(user.sellerStatus)}
                                        </div>
                                    </div>
                                    <div className="row small text-muted mb-2">
                                        <div className="col-6">
                                            <strong>Registered:</strong> {new Date(user.dateRegistered || user.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="d-flex gap-2">
                                        {user._id !== currentUserId && (
                                            <button 
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => handleDeleteUser(user._id)}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pagination */}
            {!loading && pagination.pages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                    <button 
                        className="btn btn-outline-primary"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                    >
                        <FiChevronLeft size={14} /> Previous
                    </button>
                    <span className="text-muted">
                        Page {pagination.page} of {pagination.pages} ({pagination.total} users)
                    </span>
                    <button 
                        className="btn btn-outline-primary"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                    >
                        Next <FiChevronRight size={14} />
                    </button>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DangerModal
                show={showDeleteModal}
                onHide={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                }}
                onConfirm={confirmDeleteUser}
                title="Delete User"
                message="Are you sure you want to delete this user? This action cannot be undone."
            />
        </div>
    );
}

export default UsersSection;
