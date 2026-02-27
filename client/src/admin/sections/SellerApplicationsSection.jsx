import React from "react";
import { adminAPI } from "../../utils/api.js";
import { FiCheck, FiX, FiClock, FiUsers, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { getImageUrl } from "../../utils/imageUrl.js";

function SellerApplicationsSection() {
    const [applications, setApplications] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [processing, setProcessing] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('pending');
    const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 });

    React.useEffect(() => {
        fetchApplications(1);
    }, [activeTab]);

    const fetchApplications = async (page) => {
        try {
            setLoading(true);
            const response = await adminAPI.getSellerApplications(activeTab, page, 10);
            setApplications(response.data.applications);
            setPagination(response.data.pagination);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to fetch applications");
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (userId, status) => {
        try {
            setProcessing(userId);
            await adminAPI.reviewApplication(userId, status);
            // Remove from current list
            setApplications(applications.filter(app => app._id !== userId));
            alert(`Application ${status} successfully!`);
        } catch (err) {
            alert(err.response?.data?.message || `Failed to ${status} application`);
        } finally {
            setProcessing(null);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <span className="badge bg-warning text-dark small">Pending</span>;
            case 'approved':
                return <span className="badge bg-success small">Approved</span>;
            case 'rejected':
                return <span className="badge bg-danger small">Rejected</span>;
            default:
                return <span className="badge bg-secondary small">{status}</span>;
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            fetchApplications(newPage);
        }
    };

    return (
        <div className="container border border-black rounded p-4">
            <h2 className="text-primary mb-4">Seller Applications</h2>
            
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}
            
            {/* Tabs */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        <FiClock size={14} className="me-1" />
                        Pending
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'approved' ? 'active' : ''}`}
                        onClick={() => setActiveTab('approved')}
                    >
                        <FiCheck size={14} className="me-1" />
                        Approved
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'rejected' ? 'active' : ''}`}
                        onClick={() => setActiveTab('rejected')}
                    >
                        <FiX size={14} className="me-1" />
                        Rejected
                    </button>
                </li>
            </ul>

            {loading ? (
                <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : applications.length === 0 ? (
                <div className="text-center py-5">
                    <FiUsers size={48} className="text-muted mb-3" />
                    <h5 className="text-muted">No {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Applications</h5>
                    <p className="text-muted">There are no {activeTab} seller applications.</p>
                </div>
            ) : (
                applications.map(application => (
                    <div key={application._id} className="card mb-3">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <h5 className="mb-1 small">{application.firstName} {application.lastName}</h5>
                                    <p className="text-muted mb-1 small">{application.email}</p>
                                    <small className="text-muted">
                                        Applied on: {application.applicationDate 
                                            ? new Date(application.applicationDate).toLocaleDateString()
                                            : new Date(application.createdAt).toLocaleDateString()}
                                    </small>
                                </div>
                                <div>
                                    {getStatusBadge(application.sellerStatus)}
                                </div>
                            </div>
                            
                            <div className="row mt-3">
                                <div className="col-md-6">
                                    <h6 className="mb-2 small">ID Picture:</h6>
                                    {(application.idImage || application.studentIdPicture) && (
                                        <img 
                                            src={getImageUrl(application.idImage || application.studentIdPicture)} 
                                            alt="ID" 
                                            className="img-fluid rounded"
                                            style={{ maxHeight: '150px', objectFit: 'cover' }}
                                        />
                                    )}
                                </div>
                            </div>
                            
                            {/* Show Approve/Reject buttons only for pending applications */}
                            {activeTab === 'pending' && (
                                <div className="d-flex gap-2 mt-3">
                                    <button 
                                        className="btn btn-success btn-sm"
                                        onClick={() => handleReview(application._id, 'approved')}
                                        disabled={processing === application._id}
                                    >
                                        <FiCheck size={14} className="me-1" />
                                        Approve
                                    </button>
                                    <button 
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleReview(application._id, 'rejected')}
                                        disabled={processing === application._id}
                                    >
                                        <FiX size={14} className="me-1" />
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}

            {/* Pagination */}
            {!loading && pagination.pages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                    <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                    >
                        <FiChevronLeft size={14} /> Previous
                    </button>
                    <span className="text-muted small">
                        Page {pagination.page} of {pagination.pages} ({pagination.total} applications)
                    </span>
                    <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                    >
                        Next <FiChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default SellerApplicationsSection;
