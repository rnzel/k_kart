import React from "react";
import { adminAPI } from "../../utils/api.js";
import { FiCheck, FiX, FiClock, FiUsers, FiChevronLeft, FiChevronRight, FiEye } from "react-icons/fi";
import { getImageUrl } from "../../utils/imageUrl.js";
import IDViewModal from "../../components/IDViewModal.jsx";
import DangerModal from "../../components/DangerModal.jsx";

function SellerApplicationsSection() {
    const [applications, setApplications] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [message, setMessage] = React.useState({ type: '', text: '' });
    const [processing, setProcessing] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('pending');
    const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 });
    const [showIdModal, setShowIdModal] = React.useState(false);
    const [selectedApplication, setSelectedApplication] = React.useState(null);
    const [showRejectModal, setShowRejectModal] = React.useState(false);
    const [rejectionReason, setRejectionReason] = React.useState('');
    const [rejectionNote, setRejectionNote] = React.useState('');
    const [isCustomReason, setIsCustomReason] = React.useState(false);

    // Predefined rejection reasons
    const rejectionReasons = [
        'ID image is unclear or blurry',
        'Invalid or unsupported ID',
        'ID details are not readable',
        'ID is expired',
        'ID does not match account information',
        'Fake or suspicious ID',
        'Other'
    ];

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

    const handleReview = async (userId, status, reason = '', note = '') => {
        try {
            setProcessing(userId);
            
            const response = await adminAPI.reviewApplication(userId, status, reason, note);
            
            if (response.data.success) {
                // Update the application in the list with new status
                setApplications(prevApplications => 
                    prevApplications.map(app => 
                        app._id === userId 
                            ? { ...app, ...response.data.user }
                            : app
                    )
                );
                
                // Show success message
                setMessage({ type: 'success', text: `Application ${status} successfully!` });
                
                // Auto-hide success message after 3 seconds
                setTimeout(() => {
                    setMessage({ type: '', text: '' });
                }, 3000);
            } else {
                throw new Error(response.data.message || `Failed to ${status} application`);
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || `Failed to ${status} application`;
            setMessage({ type: 'danger', text: errorMessage });
            
            // Auto-hide error message after 5 seconds
            setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 5000);
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = (application) => {
        setSelectedApplication(application);
        setShowRejectModal(true);
        setRejectionReason('');
        setRejectionNote('');
        setIsCustomReason(false);
    };

    const confirmReject = async () => {
        if (selectedApplication) {
            const reason = isCustomReason ? rejectionNote : rejectionReason;
            await handleReview(selectedApplication._id, 'rejected', reason, rejectionNote);
            setShowRejectModal(false);
        }
    };

    const handleReasonChange = (e) => {
        const value = e.target.value;
        setRejectionReason(value);
        setIsCustomReason(value === 'Other');
        if (value !== 'Other') {
            setRejectionNote('');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <span className="badge bg-warning small">Pending</span>;
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

    const handleCloseModal = () => {
        setShowIdModal(false);
        setSelectedApplication(null);
    };

    return (
        <div className="container border border-black rounded p-4">
            <h2 className="text-primary mb-4">Seller Applications</h2>
            
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}
            
            {message.text && (
                <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
                    {message.text}
                    <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
                </div>
            )}
            
            {/* Tabs */}
            <ul className="nav nav-tabs mb-4">
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
                        className={`nav-link ${activeTab === 'approved' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                        onClick={() => setActiveTab('approved')}
                    >
                        Approved
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'rejected' ? 'active text-primary fw-semibold' : 'text-muted'}`}
                        onClick={() => setActiveTab('rejected')}
                    >

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
                                    <h5 className="mb-1">
                                        {application.firstName} {application.lastName}
                                        {(application.idImage || application.studentIdPicture) && (
                                            <button
                                                className="btn btn-outline-primary btn-sm ms-2"
                                                onClick={() => {
                                                    setSelectedApplication(application);
                                                    setShowIdModal(true);
                                                }}
                                                title="View ID"
                                            >
                                                <FiEye size={16} />
                                                <span className="ms-1">View ID</span>
                                            </button>
                                        )}
                                    </h5>
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
                            
                            
                            {/* Show Approve/Reject buttons only for pending applications */}
                            {activeTab === 'pending' && (
                                <div className="d-flex gap-2 mt-3">
                                    <button 
                                        className="btn btn-primary"
                                        style={{ width: "100%" }}
                                        onClick={() => handleReview(application._id, 'approved')}
                                        disabled={processing === application._id}
                                    >
                                        Approve
                                    </button>
                                    <button 
                                        className="btn btn-secondary"
                                        style={{ width: "100%" }}
                                        onClick={() => handleReject(application)}
                                        disabled={processing === application._id}
                                    >
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
            
            {/* ID View Modal */}
            <IDViewModal
                show={showIdModal}
                onHide={handleCloseModal}
                application={selectedApplication}
            />

            {/* Reject Confirmation Modal */}
            <DangerModal
                show={showRejectModal}
                onHide={() => setShowRejectModal(false)}
                onConfirm={confirmReject}
                title="Reject Seller Application"
                message={
                    <div>
                        <p>Are you sure you want to reject this seller application?</p>
                        <div className="mb-3">
                            <label className="form-label">Rejection Reason:</label>
                            <select
                                className="form-select"
                                value={rejectionReason}
                                onChange={handleReasonChange}
                            >
                                <option value="">Select a reason...</option>
                                {rejectionReasons.map((reason, index) => (
                                    <option key={index} value={reason}>{reason}</option>
                                ))}
                            </select>
                        </div>
                        {(isCustomReason || rejectionReason) && (
                            <div className="mb-3">
                                <label className="form-label">Additional Notes:</label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={isCustomReason ? rejectionNote : rejectionNote}
                                    onChange={(e) => setRejectionNote(e.target.value)}
                                    placeholder={isCustomReason ? "Please provide a custom reason..." : "Additional explanation (optional)"}
                                />
                            </div>
                        )}
                    </div>
                }
            />
        </div>
    );
}

export default SellerApplicationsSection;
