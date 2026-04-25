import React from "react";
import { FiHome, FiShoppingBag, FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import api from "../../utils/api";
import { getImageUrl } from "../../utils/imageUrl.js";
import DangerModal from "../../components/DangerModal.jsx";

function MyShopSection() {
    const [shopExists, setShopExists] = React.useState(null);
    const [shopData, setShopData] = React.useState(null);
    const [fetchError, setFetchError] = React.useState(null);

    // Form state for creating/editing shop
    const [shopName, setShopName] = React.useState("");
    const [shopDescription, setShopDescription] = React.useState("");
    const [shopContact, setShopContact] = React.useState("");
    const [shopEmail, setShopEmail] = React.useState("");
    const [shopLocation, setShopLocation] = React.useState("");
    const [shopImage, setShopImage] = React.useState("");
    const [imagePreview, setImagePreview] = React.useState(null);
    const [imageName, setImageName] = React.useState("");
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);

    const [showForm, setShowForm] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const token = localStorage.getItem("token");

    // Check if shop exists on component mount
    React.useEffect(() => {
        const checkShopExists = async () => {
            try {
                const response = await api.get("/api/shops/my-shop");
                // Ensure we're setting the shop data correctly
                if (response.data && response.data._id) {
                    setShopData(response.data);
                    setShopExists(true);
                    setFetchError(null);
                } else {
                    setShopExists(false);
                    setFetchError(null);
                }
            } catch (err) {
                console.log('Shop fetch error details:', {
                    message: err.message,
                    status: err.response?.status,
                    statusText: err.response?.statusText,
                    data: err.response?.data
                });
                
                if (err.response && err.response.status === 404) {
                    // No shop found - this is expected if user hasn't created a shop
                    setShopExists(false);
                    setFetchError(null);
                } else if (err.response && err.response.status === 401) {
                    // Authentication error
                    setShopExists(false);
                    setFetchError('Authentication failed. Please log in again.');
                } else if (err.response && err.response.status === 403) {
                    // Forbidden - likely seller not approved
                    setShopExists(false);
                    setFetchError('Access denied. Your seller application may not be approved yet.');
                } else if (err.response && err.response.status >= 500) {
                    // Server error
                    setShopExists(false);
                    setFetchError('Server error. Please try again later.');
                } else {
                    // Network error or other
                    setShopExists(false);
                    setFetchError('Network error. Please check your connection.');
                }
            }
        };

        if (token) {
            checkShopExists();
        } else {
            setShopExists(false);
            setFetchError('Please log in to view your shop.');
        }
    }, [token]);

    const handleEditClick = () => {
        if (shopData && shopData._id) {
            setShopName(shopData.shopName || "");
            setShopDescription(shopData.shopDescription || "");
            setShopContact(shopData.shopContact || "");
            setShopEmail(shopData.shopEmail || "");
            setShopLocation(shopData.shopLocation || "");
            setShopImage("");
            setImagePreview(shopData.shopLogo ? getImageUrl(shopData.shopLogo) : null);
            setImageName("");
            setIsEditing(true);
            setShowForm(true);
        } else {
            setError("Shop data not loaded. Please refresh the page.");
        }
    };

    const handleCreateClick = () => {
        setShopName("");
        setShopDescription("");
        setShopImage("");
        setImagePreview(null);
        setImageName("");
        setIsEditing(false);
        setShowForm(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setShopImage(file);
            setImagePreview(URL.createObjectURL(file));
            setImageName(file.name);
        }
    };

    const handleRemoveImage = () => {
        setShopImage("");
        setImagePreview(null);
        setImageName("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        setError("");

        // Validate required fields
        if (!shopName.trim()) {
            setError("Shop name is required.");
            return;
        }

        if (!shopDescription.trim()) {
            setError("Shop description is required.");
            return;
        }

        if (!shopContact.trim()) {
            setError("Shop contact is required.");
            return;
        }

        if (!shopLocation.trim()) {
            setError("Shop location is required.");
            return;
        }

        // Validate Philippine phone number format
        const phoneRegex = /^(?:\+63|0)\d{10}$/;
        if (!phoneRegex.test(shopContact.trim())) {
            setError("Invalid Philippine phone number format. Use +63XXXXXXXXXX or 09XXXXXXXXX");
            return;
        }

        // Validate email format if provided (only if not empty)
        if (shopEmail.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shopEmail.trim())) {
            setError("Invalid email format.");
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append("shopName", shopName);
        formData.append("shopDescription", shopDescription);
        formData.append("shopContact", shopContact);
        formData.append("shopEmail", shopEmail);
        formData.append("shopLocation", shopLocation);
        if (shopImage) {
            formData.append("shopLogo", shopImage);
        }
        
        // Check if user removed the existing image (no new image, but had previous image)
        if (!shopImage && imagePreview === null && shopData?.shopLogo) {
            formData.append("removeLogo", "true");
        }

        if (isEditing && shopData && shopData._id) {
            // Update existing shop - use correct endpoint without ID
            api
                .put(`/api/shops/update-shop`, formData)
                .then((response) => {
                    setShopData(response.data);
                    setShowForm(false);
                    setIsEditing(false);
                    setShopName("");
                    setShopDescription("");
                    setShopImage("");
                    setImagePreview(null);
                    setLoading(false);
                })
                .catch((err) => {
                    setError(err.response?.data?.message || "Error updating shop");
                    setLoading(false);
                });
        } else {
            // Create new shop
            console.log('Creating shop with data:', {
                shopName,
                shopDescription,
                shopContact,
                shopEmail,
                shopLocation,
                hasImage: !!shopImage,
                imagePreview: !!imagePreview
            });

            api
                .post("/api/shops", formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                })
                .then((response) => {
                    console.log('Shop created successfully:', response.data);
                    api
                        .get("/api/shops/my-shop")
                        .then((res) => {
                            setShopData(res.data);
                        });
                    setShopExists(true);
                    setShowForm(false);
                    setShopName("");
                    setShopDescription("");
                    setShopImage("");
                    setImagePreview(null);
                    setLoading(false);
                })
                .catch((err) => {
                    console.error('Shop creation error details:', {
                        status: err.response?.status,
                        statusText: err.response?.statusText,
                        message: err.response?.data?.message,
                        errors: err.response?.data?.errors,
                        data: err.response?.data
                    });
                    
                    // Provide more specific error messages
                    if (err.response?.status === 400) {
                        if (err.response?.data?.errors && err.response.data.errors.length > 0) {
                            const firstError = err.response.data.errors[0];
                            setError(`${firstError.message} (${firstError.field || 'Field'})`);
                        } else if (err.response?.data?.message) {
                            setError(err.response.data.message);
                        } else {
                            setError("Invalid data. Please check all required fields.");
                        }
                    } else if (err.response?.status === 401) {
                        setError("Authentication failed. Please log in again.");
                    } else if (err.response?.status === 403) {
                        setError("Access denied. You must be an approved seller to create a shop.");
                    } else if (err.response?.status === 409) {
                        setError("You already have a shop. You can only have one shop per account.");
                    } else {
                        setError(err.response?.data?.message || "Error creating shop. Please try again.");
                    }
                    setLoading(false);
                });
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setIsEditing(false);
        setError("");
        setShopName("");
        setShopDescription("");
        setShopImage("");
        setImagePreview(null);
        setImageName("");
    };

    const checkDeleteShop = async () => {
        if (loading) return;
        if (!token) {
            setError("You must be logged in to delete your shop.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await api.delete("/api/shops/delete-shop");

            // Reset UI/state after deletion
            setShowDeleteModal(false);
            setShopExists(false);
            setShopData(null);

            setShowForm(false);
            setIsEditing(false);
            setShopName("");
            setShopDescription("");
            setShopImage("");
            setImagePreview(null);
        } catch (err) {
            setError(err.response?.data?.message || "Error deleting shop");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="container border border-black rounded p-4">
                <h2 className="text-primary">My Shop</h2>

                {error && !showForm && (
                    <div className="alert alert-danger mt-3" role="alert">
                        {error}
                    </div>
                )}

                {shopExists === null ? (
                    <div className="text-center mt-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading...</p>
                    </div>
                ) : fetchError ? (
                    <div className="mt-4">
                        <div className="alert alert-warning" role="alert">
                            <strong>Error:</strong> {fetchError}
                        </div>
                        {fetchError.includes('seller application') && (
                            <div className="text-center">
                                <p className="text-muted">You need to be an approved seller to create a shop.</p>
                                <button
                                    className="btn btn-primary"
                                    style={{ width: "100%" }}
                                    onClick={() => window.location.href = '/user'}
                                >
                                    Go to User Dashboard
                                </button>
                            </div>
                        )}
                    </div>
                ) : !shopExists && !showForm ? (
                    <div className="mt-4">
                        <div className="d-flex flex-column align-items-center justify-content-center mb-3">
                            <FiHome size={64} className="text-secondary" />
                            <h4 className="text-muted mt-3">No Shop Yet</h4>
                            <p className="text-muted">Create your shop to start receiving orders</p>
                        </div>
                        
                        <button
                            className="btn btn-primary"
                            style={{ width: "100%" }}
                            onClick={handleCreateClick}
                        >
                            Create Shop
                        </button>
                    </div>
                ) : !showForm ? (
                    <div className="mt-4">
                        <div className="d-flex flex-column align-items-center mb-4">
                            {shopData?.shopLogo ? (
                                <img
                                    src={getImageUrl(shopData.shopLogo)}
                                    alt={shopData.shopName}
                                    style={{
                                        width: "150px",
                                        height: "150px",
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                        border: "4px solid #db4444",
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: "150px",
                                        height: "150px",
                                        borderRadius: "50%",
                                        backgroundColor: "#ffff",
                                        border: "4px solid #db4444",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <FiShoppingBag size={64} className="text-primary" />
                                </div>
                            )}
                        </div>
                        <div className="text-center mb-4">
                            <h3 className="mb-2">{shopData?.shopName}</h3>
                            <p className="text-muted">{shopData?.shopDescription}</p>
                            
                            <div className="mt-3">
                                <div className="d-flex flex-column align-items-center gap-3">
                                    {/* Email */}
                                    <div className="d-flex align-items-center gap-2">
                                        <FiMail size={16} className="text-primary" />
                                        <a href={`mailto:${shopData?.shopEmail}`} className="text-decoration-none">
                                            <span className="text-primary fw-semibold">{shopData?.shopEmail}</span>
                                        </a>
                                    </div>
                                    
                                    {/* Location */}
                                    <div className="d-flex align-items-center gap-2">
                                        <FiMapPin size={16} className="text-secondary" />
                                        <span className="text-secondary">{shopData?.shopLocation}</span>
                                    </div>
                                    
                                    {/* Contact */}
                                    <div className="d-flex align-items-center gap-2">
                                        <FiPhone size={16} className="text-success" />
                                        <span className="text-success fw-semibold">{shopData?.shopContact}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-primary"
                                style={{ width: "100%" }}
                                onClick={handleEditClick}
                            >
                                Edit Shop
                            </button>

                            <button
                                className="btn btn-danger btn-secondary"
                                style={{ width: "100%" }}
                                onClick={() => setShowDeleteModal(true)}
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
                                <label
                                    htmlFor="shopName"
                                    className="form-label font-weight-semibold"
                                >
                                    Shop Name <span className="text-primary">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="shopName"
                                    value={shopName}
                                    maxLength={50}
                                    onChange={(e) => setShopName(e.target.value)}
                                />
                                <small className="text-muted">
                                    {shopName.length}/50 characters
                                </small>
                            </div>
                            <div className="mb-3">
                                <label
                                    htmlFor="shopDescription"
                                    className="form-label font-weight-semibold"
                                >
                                    Shop Description <span className="text-primary">*</span>
                                </label>
                                <textarea
                                    className="form-control"
                                    id="shopDescription"
                                    rows="3"
                                    value={shopDescription}
                                    maxLength={500}
                                    onChange={(e) => setShopDescription(e.target.value)}
                                ></textarea>
                                <small className="text-muted">
                                    {shopDescription.length}/500 characters
                                </small>
                            </div>
                            <div className="mb-3">
                                <label
                                    htmlFor="shopContact"
                                    className="form-label font-weight-semibold"
                                >
                                    Shop Contact <span className="text-primary">*</span>
                                </label>
                                <input
                                    type="tel"
                                    className="form-control"
                                    id="shopContact"
                                    value={shopContact}
                                    placeholder="09XXXXXXXXX"
                                    onChange={(e) => setShopContact(e.target.value)}
                                />
                            </div>
                            <div className="mb-3">
                                <label
                                    htmlFor="shopEmail"
                                    className="form-label font-weight-semibold"
                                >
                                    Shop Email (Optional)
                                </label>
                                <input
                                    type="email"
                                    className="form-control"
                                    id="shopEmail"
                                    value={shopEmail}
                                    placeholder="shop@example.com"
                                    onChange={(e) => setShopEmail(e.target.value)}
                                />
                            </div>
                            <div className="mb-3">
                                <label
                                    htmlFor="shopLocation"
                                    className="form-label font-weight-semibold"
                                >
                                    Shop Location <span className="text-primary">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="shopLocation"
                                    value={shopLocation}
                                    placeholder="Building, Room, Campus"
                                    onChange={(e) => setShopLocation(e.target.value)}
                                />
                            </div>
                            <div className="mb-3">
                                <label
                                    htmlFor="shopImage"
                                    className="form-label font-weight-semibold"
                                >
                                    Shop Logo
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="d-none"
                                    id="shopImage"
                                    onChange={handleImageChange}
                                />
                                {imagePreview && (
                                    <div className="d-flex justify-content-center mb-2">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            style={{
                                                width: "120px",
                                                height: "120px",
                                                borderRadius: "50%",
                                                objectFit: "cover",
                                                border: "2px solid #db4444",
                                            }}
                                        />
                                    </div>
                                )}
                                <label
                                    htmlFor="shopImage"
                                    className="form-control dashed-border"
                                    style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                                >
                                    {imagePreview ? (
                                        <div className="d-flex align-items-center justify-content-between w-100 border border-primary rounded p-2">
                                            <span>{imageName}</span>
                                            <div className="d-flex align-items-center gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-danger"
                                                    style={{ padding: "2px 6px", fontSize: "12px" }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleRemoveImage();
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        "Upload Shop Logo"
                                    )}
                                </label>
                            </div>
                            <div className="mt-4 d-flex gap-2">
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: "100%" }}
                                    disabled={loading}
                                >
                                    {loading
                                        ? isEditing
                                            ? "Updating..."
                                            : "Creating..."
                                        : isEditing
                                          ? "Update Shop"
                                          : "Create Shop"}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ width: "100%" }}
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

            <DangerModal
                show={showDeleteModal}
                onHide={() => setShowDeleteModal(false)}
                onConfirm={checkDeleteShop}
                title="Delete Shop"
                message="Are you sure you want to delete your shop? This action cannot be undone."
            />
        </>
    );
}

export default MyShopSection;
