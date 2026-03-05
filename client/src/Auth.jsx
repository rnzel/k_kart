import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./utils/api";

function Auth() {
    // General states
    const [activeTab, setActiveTab] = useState('login');
    const [accountType, setAccountType] = useState('buyer');
    const [studentIdPhotoName, setStudentIdPhotoName] = useState('ID Picture');

    // Login form states
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const navigate = useNavigate();

    // Register form states
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [studentIdPicture, setStudentIdPicture] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    
    const [loading, setLoading] = useState(false);
    
    // Handle login form submission
    const handleLogin = async (e) => {
        e.preventDefault();
        
        // Clear previous errors
        setLoginError('');
        
        // Basic validation
        if (!loginEmail || !loginPassword) {
            setLoginError('Please enter both email and password.');
            return;
        }
        
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(loginEmail)) {
            setLoginError('Please enter a valid email address.');
            return;
        }
        
        setLoading(true);
        
        try {
            const response = await api.post(`/api/auth/login`, {
                email: loginEmail,
                password: loginPassword 
            });
            
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            // Redirect based on user role and sellerStatus
            const user = response.data.user;
            if (user.role === 'seller' && user.sellerStatus === 'approved') {
                navigate('/seller-dashboard');
            } else if (user.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/marketplace');
            }
        } catch (error) {
            // Handle different types of errors
            if (error.response) {
                // Server responded with error status
                setLoginError(error.response.data?.error || 'Invalid email or password. Please try again.');
            } else if (error.request) {
                // Network error
                setLoginError('Network error. Please check your connection and try again.');
            } else {
                // Other error
                setLoginError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle register form submission
    const handleRegister = async (e) => {
        e.preventDefault();
        
        // Clear previous errors
        setError('');
        
        // Basic validation
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            setError('Please fill in all required fields.');
            return;
        }
        
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        
        // Password validation
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (accountType === 'seller' && !studentIdPicture) {
            setError('Please upload your ID picture');
            return;
        }

        setLoading(true);
        
        try {
            // Check if email is already in use
            const emailCheckResponse = await api.post(`/api/auth/check-email`, { email });
            
            if (emailCheckResponse.data.exists) {
                setError('Email is already in use');
                setLoading(false);
                return;
            }
            
            // Email is available, proceed with registration
            await api.post(`/api/auth/register`, {
                firstName,
                lastName,
                email,
                password,
                role: accountType,
                studentIdPicture: accountType === 'seller' ? studentIdPicture : undefined
            });
            
            if (accountType === 'seller') {
                setSuccessMessage('Your seller application has been submitted. Please wait for admin approval.');
            } else {
                setSuccessMessage('Account created successfully! Please login.');
            }
            setActiveTab('login');
        } catch (err) {
            // Handle different types of errors
            if (err.response) {
                // Server responded with error status
                setError(err.response.data?.error || 'Registration failed. Please try again.');
            } else if (err.request) {
                // Network error
                setError('Network error. Please check your connection and try again.');
            } else {
                // Other error
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };
    
    // Handle file input change 
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setStudentIdPhotoName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setStudentIdPicture(reader.result);
            };
            reader.readAsDataURL(file);
        }
        else {
            setStudentIdPhotoName('ID Picture');
            setStudentIdPicture(null);
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <div className="bg-white p-4 rounded w-100 w-md-50 w-lg-25 border border-black" style={{ maxWidth: '345px' }}>
                <div className="mb-3 text-center">
                    <h1>Kampuskart</h1>
                    <p className="text-muted mb-4">Your Campus Marketplace-Hub</p>
                </div>
                <div className="mb-4 d-flex gap-2">
                    <button 
                        className={`btn btn-outline-secondary w-100 ${activeTab === 'login' ? 'active' : ''}`}
                        onClick={() => setActiveTab('login')}
                    >Login</button>
                    <button 
                        className={`btn btn-outline-secondary w-100 ${activeTab === 'register' ? 'active' : ''}`}
                        onClick={() => setActiveTab('register')}
                    >Register</button>
                </div>
                
                {/* Login */}
                { activeTab === 'login' && (
                    <form onSubmit={handleLogin}>
                        <div className="mb-3">
                            <input type="email" className="form-control" id="loginEmail" placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required/>
                        </div>
                        <div className="mb-3">
                            <input type="password" className="form-control" id="loginPassword" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required/>
                        </div>
                        {successMessage && <div className="alert alert-success py-2 mb-3 small">{successMessage}</div>}
                        {loginError && <div className="alert alert-danger py-2 mb-3 small">{loginError}</div>}
                        <button type="submit" className="btn btn-primary w-100" disabled={loading}>{loading ? "Logging in..." : "Log In"}</button>
                    </form>
                )}
                

                {/* Register */}
                { activeTab === 'register' && (
                    <form onSubmit={handleRegister}>
                        <div className="mb-3 d-flex gap-2">
                            <input type="text" className="form-control" id="firstName" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required/>
                            <input type="text" className="form-control" id="lastName" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required/>
                        </div>
                        <div className="mb-3">
                            <input type="email" className="form-control" id="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
                        </div>
                        <div className="mb-3">
                            <input type="password" className="form-control" id="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required/>
                        </div>
                        <div className="mb-3">
                            <input type="password" className="form-control" id="confirmPassword" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required/>
                        </div>
                        {error && <div className="alert alert-danger py-2 mb-3 small">{error}</div>}
                        <div className="mb-3">
                            <p className="small">Account Type</p>
                            <div className="d-flex gap-2">
                                <button 
                                    type="button"
                                    className={`btn btn-outline-secondary w-100 ${accountType === 'buyer' ? 'active' : ''}`}
                                    onClick={() => setAccountType('buyer')}
                                >Buyer</button>
                                <button 
                                    type="button"
                                    className={`btn btn-outline-secondary w-100 ${accountType === 'seller' ? 'active' : ''}`}
                                    onClick={() => setAccountType('seller')}
                                >Seller</button>
                            </div>
                        </div>
                        {accountType === 'seller' && (
                            <div className="bg-light p-3 rounded mb-3">
                                <div className="mb-3">
                                    <input type="file" className="d-none" id="studentIdPicture" accept="image/*" onChange={handleFileChange}/>
                                    <label htmlFor="studentIdPicture" className="form-control dashed-border" style={{ cursor: 'pointer' }}>{ studentIdPhotoName }</label>
                                </div>
                                <p className="text-muted small text-center">Upload a clear photo of your ID to verify your an Entrepreneurship Student</p>
                            </div>
                        )}
                        <button type="submit" className="btn btn-primary w-100" disabled={loading}>{loading ? "Creating Account..." : "Create Account"}</button>
                    </form>
                )}
                
            </div>
        </div>
    )
}

export default Auth;
