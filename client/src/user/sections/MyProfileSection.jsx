import React from "react";
import api from "../../utils/api.js";
import { FiSave, FiLock, FiX } from "react-icons/fi";

function MyProfileSection() {
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

    React.useEffect(() => {
        fetchUserProfile();
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
                                <label className="form-label">First Name</label>
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
                                <label className="form-label">Last Name</label>
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
                            <label className="form-label">Email</label>
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
                            <label className="form-label">Current Password</label>
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
                            <label className="form-label">New Password</label>
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
                            <label className="form-label">Confirm New Password</label>
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
                                {loading ? "Changing..." : "Change Password"}
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
    );
}

export default MyProfileSection;
