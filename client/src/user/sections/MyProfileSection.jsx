import React from "react";
import api from "../../utils/api.js";
import SellerApplicationForm from "../../components/SellerApplicationForm.jsx";
import { FiSave, FiLock, FiX, FiClock, FiCheck } from "react-icons/fi";

export default function MyProfileSection() {
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState({ type: "", text: "" });
    const [error, setError] = React.useState("");
    const [showPasswordForm, setShowPasswordForm] = React.useState(false);
    
    const [user, setUser] = React.useState({
        firstName: "",
        lastName: "",
        email: ""
    });

    const [passwordData, setPasswordData] = React.useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [showSellerForm, setShowSellerForm] = React.useState(false);
    const [applicationStatus, setApplicationStatus] = React.useState(null);

    const openSellerAppModal = () => {
        setShowSellerForm(true);
    };

    React.useEffect(() => {
        fetchUserProfile();
        fetchApplicationData();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await api.get("/api/auth/me", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const userData = response.data;
            setUser(userData);
        } catch (err) {
            console.error("Error fetching profile:", err);
        }
    };

    const fetchApplicationData = async () => {
        try {
            const response = await api.get("/api/admin/my-application");
            setApplicationStatus(response.data);
        } catch (err) {
            console.error("Error fetching application data:", err);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError("");
        
        if (!user.firstName.trim()) {
            setError("First name is required.");
            return;
        }

        if (!user.lastName.trim()) {
            setError("Last name is required.");
            return;
        }

        if (!user.email.trim()) {
            setError("Email is required.");
            return;
        }

        if (!/\S+@\S+\.\S+/.test(user.email)) {
            setError("Email is invalid.");
            return;
        }

        setLoading(true);
        setMessage({ type: "", text: "" });

        try {
            const token = localStorage.getItem("token");
            const response = await api.put("/api/auth/profile", user, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setUser(response.data.user);
            
            // Update localStorage so Navbar avatar updates immediately
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = { ...currentUser, ...response.data.user };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            setMessage({ type: "success", text: "Profile updated successfully!" });
        } catch (err) {
            setMessage({ type: "danger", text: err.response?.data?.error?.message || "Error updating profile" });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: "danger", text: "New passwords do not match!" });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setMessage({ type: "danger", text: "Password must be at least 6 characters!" });
            return;
        }

        setLoading(true);
        setMessage({ type: "", text: "" });

        try {
            const token = localStorage.getItem("token");
            await api.put("/api/auth/change-password", {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setShowPasswordForm(false);
            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setMessage({ type: "success", text: "Password changed successfully!" });
        } catch (err) {
            setMessage({ type: "danger", text: err.response?.data?.error?.message || "Error changing password" });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setUser({ ...user, [e.target.name]: e.target.value });
    };

    const handlePasswordInputChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return (
                    <div className="alert alert-warning mb-3">
                        <FiClock className="me-2" />
                        Your seller application is pending review.
                    </div>
                );
            case 'approved':
                return (
                    <div className="alert alert-success mb-3">
                        <FiCheck className="me-2" />
                        You are already a seller!
                    </div>
                );
            case 'rejected':
                return (
                    <div className="alert alert-danger mb-3">
                        <div className="align-items-center">
                            <div className="mb-3"> 
                                <FiX className="me-2" />
                                Your seller application was rejected.
                            </div>
                            {applicationStatus?.rejectionReason && (
                                <div className="mb-2">
                                    <strong>Reason:</strong> {applicationStatus.rejectionReason}
                                </div>
                            )}
                            {applicationStatus?.rejectionNote && (
                                <div className="mb-3">
                                    <strong>Note:</strong> {applicationStatus.rejectionNote}
                                </div>
                            )}
                            <button 
                                className="btn btn-primary"
                                style={{ width: "100%" }}
                                onClick={openSellerAppModal}
                            >
                                Apply Again
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            {/* Profile Container */}
            <div className="container border border-black rounded p-4">
                <h2 className="text-primary mb-4">My Profile</h2>

                {message.text && (
                    <div className={`alert alert-${message.type} alert-dismissible`} role="alert">
                        {message.text}
                        <button type="button" className="btn-close" onClick={() => setMessage({ type: "", text: "" })}></button>
                    </div>
                )}

                <form onSubmit={showPasswordForm ? handlePasswordChange : handleSave}>
                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    {!showPasswordForm && (
                        <>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label font-weight-semibold">First Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="firstName"
                                        value={user.firstName || ""}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label font-weight-semibold">Last Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="lastName"
                                        value={user.lastName || ""}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label font-weight-semibold">Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    name="email"
                                    value={user.email || ""}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </>
                    )}

                    {showPasswordForm ? (
                        <>
                            <div className="mb-3">
                                <label className="form-label font-weight-semibold">Current Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    name="currentPassword"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordInputChange}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label font-weight-semibold">New Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    name="newPassword"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordInputChange}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label font-weight-semibold">Confirm New Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    name="confirmPassword"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordInputChange}
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <div className="mt-4">
                            <button 
                                type="button" 
                                className="btn btn-outline-primary"
                                onClick={() => setShowPasswordForm(true)}
                            >
                                Change Password
                            </button>
                        </div>
                    )}

                    <div className="d-flex gap-2 mt-4">
                        {showPasswordForm ? (
                            <>
                                <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
                                    {loading ? "Changing..." : "Save"}
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    style={{ width: "100%" }}
                                    onClick={() => {
                                        setShowPasswordForm(false);
                                        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                                        setMessage({ type: "", text: "" });
                                    }}
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
                                {loading ? "Saving..." : "Edit Profile"}
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Seller Application Section - Conditional Rendering */}
            <div className="mt-4">
                {/* If user is already a seller, show approval status */}
                {user?.role === 'seller' && (
                    <div className="alert alert-success">
                        <FiCheck className="me-2" />
                        You are already a seller!
                    </div>
                )}

                {/* Show status badge if there's an application status */}
                {applicationStatus?.sellerStatus && user?.role !== 'seller' && (
                    <>{getStatusBadge(applicationStatus.sellerStatus)}</>
                )}

                {/* Show original application form if no application exists and user is not a seller */}
                {!applicationStatus?.sellerStatus && user?.role !== 'seller' && (
                    <div className="alert alert-info">
                        <div className="mb-3">
                            <strong>Are you an Entrepreneurship Student?</strong> Join our marketplace as a seller and start selling your products to fellow students.
                        </div>
                        <button className="btn btn-primary" style={{ width: "100%" }} onClick={openSellerAppModal}>
                            Apply as Seller
                        </button>
                    </div>
                )}
            </div>

            {/* SellerApplicationForm modal at root level */}
            <SellerApplicationForm 
                show={showSellerForm}
                onHide={() => setShowSellerForm(false)}
                onApplicationSubmitted={() => {
                    // Optional callback when application is submitted
                    setShowSellerForm(false);
                }}
            />
        </>
    );
}