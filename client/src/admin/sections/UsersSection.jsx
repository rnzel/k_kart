import React from "react";
import { adminAPI } from "../../utils/api.js";
import { FiTrash2, FiClock, FiCheck, FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import DangerModal from "../../components/DangerModal";

function UsersSection() {
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 });
    const [currentUserId, setCurrentUserId] = React.useState(null);
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);
    const [userToDelete, setUserToDelete] = React.useState(null);

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
            <h2 className="text-primary mb-4">All Users</h2>
            
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
                <p className="text-muted text-center">No users found.</p>
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
                                    <th className="small">Seller Status</th>
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
                                            {getRoleBadge(user.role)}
                                        </td>
                                        <td>
                                            {getSellerStatusBadge(user.sellerStatus)}
                                        </td>
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
                                            {getRoleBadge(user.role)}
                                            {getSellerStatusBadge(user.sellerStatus)}
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
                messsage="Are you sure you want to delete this user? This action cannot be undone."
            />
        </div>
    );
}

export default UsersSection;
