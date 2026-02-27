import React from "react";
import { adminAPI } from "../../utils/api.js";
import { FiTrash2, FiClock, FiCheck, FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";

function UsersSection() {
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 });
    const [currentUserId, setCurrentUserId] = React.useState(null);

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
    }, []);

    const fetchUsers = async (page) => {
        try {
            setLoading(true);
            const response = await adminAPI.getUsers(page, 10);
            setUsers(response.data.users);
            setPagination(response.data.pagination);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            return;
        }
        
        try {
            await adminAPI.deleteUser(userId);
            // Remove the deleted user from the list
            setUsers(users.filter(user => user._id !== userId));
            alert("User deleted successfully");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete user");
        }
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin':
                return <span className="badge bg-danger small">Admin</span>;
            case 'seller':
                return <span className="badge bg-success small">Seller</span>;
            default:
                return <span className="badge bg-secondary small">Buyer</span>;
        }
    };

    const getSellerStatusBadge = (status) => {
        if (!status) return null;
        switch (status) {
            case 'pending':
                return <span className="badge bg-warning text-dark small ms-1"><FiClock size={10} className="me-1"/>Pending</span>;
            case 'approved':
                return <span className="badge bg-success small ms-1"><FiCheck size={10} className="me-1"/>Approved</span>;
            case 'rejected':
                return <span className="badge bg-danger small ms-1"><FiX size={10} className="me-1"/>Rejected</span>;
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
            <h2 className="text-primary mb-4">All Users</h2>
            
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {/* Desktop Table View */}
            <div className="d-none d-md-block">
                <div className="table-responsive">
                    <table className="table table-sm table-hover text-center">
                        <thead>
                            <tr>
                                <th className="font-weight-semibold">Name</th>
                                <th className="font-weight-semibold">Email</th>
                                <th className="font-weight-semibold">Role</th>
                                <th className="font-weight-semibold">Seller Status</th>
                                <th className="font-weight-semibold">Registered</th>
                                <th className="font-weight-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user._id}>
                                        <td className="small">{user.firstName} {user.lastName}</td>
                                        <td className="small">{user.email}</td>
                                        <td>{getRoleBadge(user.role)}</td>
                                        <td>{getSellerStatusBadge(user.sellerStatus)}</td>
                                        <td className="small">{new Date(user.dateRegistered || user.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            {/* Only show delete button if it's not the current user */}
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="d-md-none">
                {loading ? (
                    <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : (
                    users.map(user => (
                        <div key={user._id} className="card mb-3">
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                        <h6 className="mb-0 small">{user.firstName} {user.lastName}</h6>
                                        <small className="text-muted">{user.email}</small>
                                    </div>
                                    <div>
                                        {getRoleBadge(user.role)}
                                        {getSellerStatusBadge(user.sellerStatus)}
                                    </div>
                                </div>
                                <div className="d-flex gap-2 mt-2">
                                    {/* Only show delete button if it's not the current user */}
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
                    ))
                )}
            </div>

            {users.length === 0 && !loading && (
                <p className="text-muted text-center">No users found.</p>
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
            )}        </div>
    );
}

export default UsersSection;
