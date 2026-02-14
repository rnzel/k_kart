import React from "react";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import { FiHome } from "react-icons/fi";
import { FiBox } from "react-icons/fi";
import { FiShoppingCart } from "react-icons/fi";
import { FiMessageCircle } from "react-icons/fi";
import { FiShoppingBag } from "react-icons/fi";


function SellerDashboard() {

    const [activeSection, setActiveSection] = React.useState('my-shop');
    const [shopExists, setShopExists] = React.useState(null);
    const [shopData, setShopData] = React.useState(null);
    
    // Form state for creating/editing shop
    const [ shopName, setShopName ] = React.useState('');
    const [ shopDescription, setShopDescription ] = React.useState('');
    const [ shopImage, setShopImage ] = React.useState('');
    const [ imagePreview, setImagePreview ] = React.useState(null);

    const [ showForm, setShowForm ] = React.useState(false);
    const [ isEditing, setIsEditing ] = React.useState(false);
    const [ loading, setLoading ] = React.useState(false);
    const [ error, setError ] = React.useState('');

    const token = localStorage.getItem('token');

    // Check if shop exists on component mount
    React.useEffect(() => {
        const checkShopExists = async () => {
            try {
                const response = await axios.get('/api/shops/my-shop', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                setShopData(response.data);
                setShopExists(true);
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    setShopExists(false);
                } else {
                    setShopExists(false);
                }
            }
        };
        
        if (token) {
            checkShopExists();
        }
    }, [token]);

    const handleEditClick = () => {
        if (shopData) {
            setShopName(shopData.shopName || '');
            setShopDescription(shopData.shopDescription || '');
            setShopImage('');
            setImagePreview(shopData.shopImage ? `/${shopData.shopImage}` : null);
            setIsEditing(true);
            setShowForm(true);
        }
    };

    const handleCreateClick = () => {
        setShopName('');
        setShopDescription('');
        setShopImage('');
        setImagePreview(null);
        setIsEditing(false);
        setShowForm(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setShopImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!shopName || !shopDescription) {
            setError('Please fill in all required fields');
            return;
        }
        
        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('shopName', shopName);
        formData.append('shopDescription', shopDescription);
        if (shopImage) {
            formData.append('shopImage', shopImage);
        }

        if (isEditing && shopData) {
            // Update existing shop
            axios.put(`/api/shops/update/${shopData._id}`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            })
            .then(response => {
                setShopData(response.data);
                setShowForm(false);
                setIsEditing(false);
                setShopName('');
                setShopDescription('');
                setShopImage('');
                setImagePreview(null);
                setLoading(false);
            })
            .catch(err => {
                setError(err.response?.data?.message || 'Error updating shop');
                setLoading(false);
            });
        } else {
            // Create new shop
            axios.post('/api/shops', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            })
            .then(response => {
                axios.get('/api/shops/my-shop', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }).then(res => {
                    setShopData(res.data);
                });
                setShopExists(true);
                setShowForm(false);
                setShopName('');
                setShopDescription('');
                setShopImage('');
                setImagePreview(null);
                setLoading(false);
            })
            .catch(err => {
                setError(err.response?.data?.message || 'Error creating shop');
                setLoading(false);
            });
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setIsEditing(false);
        setError('');
        setShopName('');
        setShopDescription('');
        setShopImage('');
        setImagePreview(null);
    };

    return (
        <div>
            <Navbar />

            <div className="container mt-4 d-flex flex-column gap-4">
                <div className="row">
                    <aside className="col-md-3 seller-sidebar" style={{fontSize:'17px'}}>
                        <ul className="d-flex flex-column gap-3 list-unstyled p-3 justify-content-center">
                            <li className="item d-flex align-items-center font-weight-semibold mb-2">
                                <a 
                                    href="#my-shop" 
                                    className={`d-flex align-items-center text-decoration-none ${activeSection === 'my-shop' ? 'text-primary' : 'text-dark'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveSection('my-shop');
                                    }}
                                >
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiHome size={24} /></div>
                                    My Shop
                                </a>
                            </li>
                            <li className="item d-flex align-items-center font-weight-semibold mb-2">
                                <a 
                                    href="#products" 
                                    className={`d-flex align-items-center text-decoration-none ${activeSection === 'products' ? 'text-primary' : 'text-dark'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveSection('products');
                                    }}
                                >
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiBox size={24} /></div>
                                    Products
                                </a>
                            </li>
                            <li className="item d-flex align-items-center font-weight-semibold mb-2">
                                <a 
                                    href="#orders" 
                                    className={`d-flex align-items-center text-decoration-none ${activeSection === 'orders' ? 'text-primary' : 'text-dark'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveSection('orders');
                                    }}
                                >
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiShoppingCart size={24} /></div>
                                    Orders
                                </a>
                            </li>
                            <li className="item d-flex align-items-center font-weight-semibold mb-2">
                                <a 
                                    href="#messages" 
                                    className={`d-flex align-items-center text-decoration-none ${activeSection === 'messages' ? 'text-primary' : 'text-dark'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveSection('messages');
                                    }}
                                >
                                    <div className="me-2 d-flex align-items-center justify-content-center"><FiMessageCircle size={24} /></div>
                                    Messages
                                </a>
                            </li>
                        </ul>
                    </aside>

                    <div className="col-md-9 p-3">
                        {activeSection === 'my-shop' && (
                            <div className="container border border-black rounded p-4">
                                <h2 className="text-primary">My Shop</h2>
                            
                                {shopExists === null ? (
                                    <div className="text-center mt-4">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="mt-2">Loading...</p>
                                    </div>
                                ) : !shopExists && !showForm ? (
                                    <div className="mt-4">
                                        <div>
                                            <div className="d-flex align-items-center justify-content-center mb-3" style={{ borderRadius: '8px' }}>
                                                <FiHome size={48} className="text-secondary" />
                                            </div>
                                            <h3 className="text-center">No Shop Created Yet</h3>
                                            <p className="text-center text-secondary">You haven't created a shop yet. Start by creating your shop to showcase your products!</p>
                        
                                        </div>
                                        <button 
                                            className="btn btn-primary" 
                                            style={{ width: '100%'}}
                                            onClick={handleCreateClick}
                                        >
                                            Create Shop
                                        </button>
                                    </div>
                                ) : !showForm ? (
                                    <div className="mt-4">
        
                                        <div className="d-flex flex-column align-items-center mb-4">
                                            {shopData?.shopImage ? (
                                                <img 
                                                    src={`/${shopData.shopImage}`} 
                                                    alt={shopData.shopName} 
                                                    style={{ 
                                                        width: '150px', 
                                                        height: '150px', 
                                                        borderRadius: '50%', 
                                                        objectFit: 'cover',
                                                        border: '4px solid #db4444'
                                                    }} 
                                                />
                                            ) : (
                                                <div 
                                                    style={{ 
                                                        width: '150px', 
                                                        height: '150px', 
                                                        borderRadius: '50%', 
                                                        backgroundColor: '#ffff',
                                                        border: '4px solid #db4444',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <FiShoppingBag size={64} className="text-primary" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-center mb-4">
                                            <h3 className="mb-2">{shopData?.shopName}</h3>
                                            <p className="text-muted">{shopData?.shopDescription}</p>
                                        </div>

                                        
                                        <div className="d-flex gap-2">
                                            <button 
                                            className="btn btn-primary" 
                                            style={{ width: '100%'}}
                                            onClick={handleEditClick}
                                            >
                                                Edit Shop
                                            </button>

                                            <button
                                                className="btn btn-danger btn-secondary"
                                                style={{ width: '100%'}}
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete your shop? This action cannot be undone.')) {
                                                        setLoading(true);
                                                        axios.delete('/api/shops', {
                                                            headers: {
                                                                'Authorization': `Bearer ${token}`
                                                            }
                                                        })
                                                        .then(() => {
                                                            setShopExists(false);
                                                            setShopData(null);
                                                            setShowForm(false);
                                                            setLoading(false);
                                                        })
                                                        .catch(err => {
                                                            setError(err.response?.data?.message || 'Error deleting shop');
                                                            setLoading(false);
                                                        });
                                                    }
                                                }}
                                                disabled={loading}
                                            >
                                                Delete Shop
                                            </button>
                                        </div>

                                    </div>
                                ) : null}

                                {showForm && (
                                    <div className="mt-4">
                                        {error && (
                                            <div className="alert alert-danger" role="alert">
                                                {error}
                                            </div>
                                        )}
                                        <form onSubmit={handleSubmit}>
                                            <div className="mb-3">
                                                <label htmlFor="shopName" className="form-label font-weight-semibold">Shop Name <span className="text-primary">*</span></label>
                                                <input 
                                                    type="text" 
                                                    className="form-control" 
                                                    id="shopName" 
                                                    value={shopName} 
                                                    maxLength={50}
                                                    onChange={(e) => setShopName(e.target.value)} 
                                                />
                                                <small className="text-muted">{shopName.length}/50 characters</small>
                                            </div>
                                            <div className="mb-3">
                                                <label htmlFor="shopDescription" className="form-label font-weight-semibold">Shop Description <span className="text-primary">*</span></label>
                                                <textarea 
                                                    className="form-control" 
                                                    id="shopDescription" 
                                                    rows="3" 
                                                    value={shopDescription} 
                                                    maxLength={500}
                                                    onChange={(e) => setShopDescription(e.target.value)}
                                                ></textarea>
                                                <small className="text-muted">{shopDescription.length}/500 characters</small>
                                            </div>
                                            <div className="mb-3">
                                                <label htmlFor="shopImage" className="form-label font-weight-semibold">Shop Logo</label>
                                                {imagePreview && (
                                                    <div className="d-flex justify-content-center mb-3">
                                                        <img 
                                                            src={imagePreview} 
                                                            alt="Shop Logo Preview" 
                                                            style={{ 
                                                                width: '120px', 
                                                                height: '120px', 
                                                                borderRadius: '50%', 
                                                                objectFit: 'cover',
                                                                border: '3px solid #db4444'
                                                            }} 
                                                        />
                                                    </div>
                                                )}
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="form-control" 
                                                    id="shopImage" 
                                                    onChange={handleImageChange}
                                                />
                                            </div>
                                            <div className="d-flex gap-2">
                                                <button 
                                                    type="submit" 
                                                    className="btn btn-primary" 
                                                    style={{ width: '100%' }}
                                                    disabled={loading}
                                                >
                                                    {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Shop' : 'Create Shop')}
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className="btn btn-secondary"
                                                    style={{ width: '100%'}}
                                                    onClick={handleCancel}
                                                    disabled={loading}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeSection === 'products' && (
                            <div className="container border border-black rounded p-4">
                                <h2 className="text-primary">Products</h2>
                                <div className="alert alert-info d-flex align-items-center" role="alert" style={{ marginTop: "20px" }}> 
                                    <i className="bi bi-info-circle me-2"></i>
                                    <p className="mb-0">This section is under construction.</p>
                                </div>  
                            </div>
                        )}
                        {activeSection === 'orders' && (
                            <div className="container border border-black rounded p-4">
                                <h2 className="text-primary">Orders</h2>
                                <div className="alert alert-info d-flex align-items-center" role="alert" style={{ marginTop: "20px" }}>
                                    <i className="bi bi-info-circle me-2"></i>
                                    <p className="mb-0">This section is under construction.</p>
                                </div>
                            </div>
                        )}
                        {activeSection === 'messages' && (
                            <div className="container border border-black rounded p-4">
                                <h2 className="text-primary">Messages</h2>   
                                <div className="alert alert-info d-flex align-items-center" role="alert" style={{ marginTop: "20px" }}>
                                    <i className="bi bi-info-circle me-2"></i>
                                    <p className="mb-0">This section is under construction.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SellerDashboard;
