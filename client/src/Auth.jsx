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
    const [studentIdNumber, setStudentIdNumber] = useState('');
    const [studentIdPicture, setStudentIdPicture] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    
    const [loading, setLoading] = useState(false);
    
    // Handle login form submission
    const handleLogin = (e) => {
        e.preventDefault();
        setLoading(true);
        setLoginError('');
        api.post(`/api/auth/login`, {
            email: loginEmail,
            password: loginPassword 
        })
        .then(response => {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            // Redirect based on user role
            if (response.data.user.role === 'seller') {
                navigate('/seller-dashboard');
            } else {
                navigate('/dashboard');
            }
        })
        .catch(error => {
            setLoginError(error.response?.data?.error || 'Login failed. Please try again.');
        }) 
        .finally(() => {
            setLoading(false);
        });
    };

    // Handle register form submission
    const handleRegister = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        // Password validation
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }
        
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        if (accountType === 'seller' && !studentIdPicture) {
            setError('Please upload your Student ID picture');
            setLoading(false);
            return;
        }

        // Check if email is already in use
        api.post(`/api/auth/check-email`, { email })
            .then((response) => {
                if (response.data.exists) {
                    setError('Email is already in use');
                    setLoading(false);
                    return;
                }
                // Email is available, proceed with registration
                api.post(`/api/auth/register`, {
                    firstName,
                    lastName,
                    email,
                    password,
                    role: accountType,
                    studentIdNumber: accountType === 'seller' ? studentIdNumber : undefined,
                    studentIdPicture: accountType === 'seller' ? studentIdPicture : undefined
                })
                .then(() => {
                    setSuccessMessage('Account created successfully! Please login.');
                    setActiveTab('login');
                })
                .catch((err) => {
                    setError(err.response?.data?.error || 'Registration failed. Please try again.');
                })
                .finally(() => {
                    setLoading(false);
                });
            })
            .catch(() => {
                setError('Something went wrong. Please try again.');
                setLoading(false);
            });
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
                                    <input type="text" className="form-control" id="studentIdNumber" placeholder="Student ID Number" value={studentIdNumber} onChange={(e) => setStudentIdNumber(e.target.value)} required/>
                                </div>
                                <div className="mb-3">
                                    <input type="file" className="d-none" id="studentIdPicture" accept="image/*" onChange={handleFileChange}/>
                                    <label htmlFor="studentIdPicture" className="form-control dashed-border" style={{ cursor: 'pointer' }}>{ studentIdPhotoName }</label>
                                </div>
                                <p className="text-muted small text-center">Upload a clear photo of your Student ID to verify you're an Entrepreneurship student</p>
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
