import React from "react";
import { FiHome, FiShoppingBag } from "react-icons/fi";
import api from "../../utils/api";
import DangerModal from "../../components/DangerModal.jsx";

function MyShopSection() {
    const [shopExists, setShopExists] = React.useState(null);
    const [shopData, setShopData] = React.useState(null);

    // Form state for creating/editing shop
    const [shopName, setShopName] = React.useState("");
    const [shopDescription, setShopDescription] = React.useState("");
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
                } else {
                    setShopExists(false);
                }
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
        if (shopData && shopData._id) {
            setShopName(shopData.shopName || "");
            setShopDescription(shopData.shopDescription || "");
            setShopImage("");
            setImagePreview(shopData.shopLogo ? `/api/images/${shopData.shopLogo}` : null);
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

        if (!shopName.trim()) {
            setError("Shop name is required.");
            return;
        }

        if (!shopDescription.trim()) {
            setError("Shop description is required.");
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append("shopName", shopName);
        formData.append("shopDescription", shopDescription);
        if (shopImage) {
            formData.append("shopLogo", shopImage);
        }

        if (isEditing && shopData && shopData._id) {
            // Update existing shop - use ID from shopData
            api
                .put(`/api/shops/update-shop/${shopData._id}`, formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                })
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
            api
                .post("/api/shops", formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                })
                .then(() => {
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
                    setError(err.response?.data?.message || "Error creating shop");
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
                ) : !shopExists && !showForm ? (
                    <div className="mt-4">
                        <div className="d-flex flex-column align-items-center justify-content-center mb-3">
                            <FiHome size={48} className="text-secondary" />
                            <h3 className="text-center">No Shop Created Yet</h3>
                            <p className="text-center text-secondary">
                                You haven't created a shop yet. Start by creating your shop to
                                showcase your products!
                            </p>
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
                                    src={`/api/images/${shopData.shopLogo}`}
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
                messsage="Are you sure you want to delete your shop? This action cannot be undone."
            />
        </>
    );
}

export default MyShopSection;
