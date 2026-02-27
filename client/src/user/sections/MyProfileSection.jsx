import React from "react";
import api, { adminAPI } from "../../utils/api.js";
import { FiSave, FiLock, FiX, FiShoppingBag, FiClock, FiCheck, FiX as FiXIcon } from "react-icons/fi";

function MyProfileSection() {
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState({ type: "", text: "" });
    const [error, setError] = React.useState("");
    const [showPasswordForm, setShowPasswordForm] = React.useState(false);
    const [showSellerForm, setShowSellerForm] = React.useState(false);
    const [idImage, setIdImage] = React.useState(null);
    const [uploading, setUploading] = React.useState(false);
    const [applicationStatus, setApplicationStatus] = React.useState(null);
    
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

    React.useEffect(() => {
        fetchUserProfile();
        fetchApplicationStatus();
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

    const fetchApplicationStatus = async () => {
        try {
            const response = await adminAPI.getMyApplication();
            setApplicationStatus(response.data);
        } catch (err) {
            console.error("Error fetching application status:", err);
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

    return (
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

            {/* Seller Application Section */}
            <hr className="my-4" />
            
            <div className="mt-4">
                <h5 className="mb-3">Become a Seller</h5>
                
                {user.role === 'seller' ? (
                    <div className="alert alert-success">
                        <FiCheck className="me-2" />
                        You are already a seller!
                    </div>
                ) : applicationStatus?.sellerApplicationStatus === 'pending' ? (
                    <div className="alert alert-warning">
                        <FiClock className="me-2" />
                        Your seller application is pending review.
                    </div>
                ) : applicationStatus?.sellerApplicationStatus === 'rejected' ? (
                    <div>
                        <div className="alert alert-danger mb-3">
                            <FiXIcon className="me-2" />
                            Your seller application was rejected. You can apply again.
                        </div>
                        <button 
                            className="btn btn-primary"
                            onClick={() => setShowSellerForm(true)}
                        >
                            <FiShoppingBag className="me-2" />
                            Apply Again
                        </button>
                    </div>
                ) : (
                    <button 
                        className="btn btn-outline-primary"
                        onClick={() => setShowSellerForm(true)}
                    >
                        <FiShoppingBag className="me-2" />
                        Apply to be a Seller
                    </button>
                )}

                {showSellerForm && (
                    <div className="mt-3 p-3 border rounded">
                        <h6>Submit Seller Application</h6>
                        <p className="text-muted small">Please upload a photo of your ID for verification.</p>
                        
                        <div className="mb-3">
                            <label className="form-label">Upload ID Image</label>
                            <input 
                                type="file" 
                                className="form-control" 
                                accept="image/*"
                                onChange={(e) => setIdImage(e.target.files[0])}
                            />
                        </div>

                        {idImage && (
                            <div className="mb-3">
                                <img 
                                    src={URL.createObjectURL(idImage)} 
                                    alt="ID Preview" 
                                    className="img-fluid rounded" 
                                    style={{ maxHeight: '200px' }}
                                />
                            </div>
                        )}

                        <div className="d-flex gap-2">
                            <button 
                                className="btn btn-primary"
                                onClick={async () => {
                                    if (!idImage) {
                                        alert("Please upload an ID image");
                                        return;
                                    }
                                    try {
                                        setUploading(true);
                                        // For now, we'll use a simple approach - convert to base64
                                        const reader = new FileReader();
                                        reader.onloadend = async () => {
                                            try {
                                                await adminAPI.applySeller(reader.result);
                                                alert("Application submitted successfully!");
                                                setShowSellerForm(false);
                                                setIdImage(null);
                                                fetchApplicationStatus();
                                                // Update user in localStorage
                                                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                                                localStorage.setItem('user', JSON.stringify(currentUser));
                                            } catch (err) {
                                                alert(err.response?.data?.message || "Error submitting application");
                                            } finally {
                                                setUploading(false);
                                            }
                                        };
                                        reader.readAsDataURL(idImage);
                                    } catch (err) {
                                        alert("Error uploading image");
                                        setUploading(false);
                                    }
                                }}
                                disabled={uploading}
                            >
                                {uploading ? "Submitting..." : "Submit Application"}
                            </button>
                            <button 
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowSellerForm(false);
                                    setIdImage(null);
                                }}
                                disabled={uploading}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyProfileSection;
