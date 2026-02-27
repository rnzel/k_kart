import React from "react";
import { FiBox } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import api from "../../utils/api";
import { getImageUrl } from "../../utils/imageUrl.js";
import DangerModal from "../../components/DangerModal.jsx";

function ProductsSection() {
    const [productExists, setProductExists] = React.useState(false);
    const [products, setProducts] = React.useState([]);
    const [showForm, setShowForm] = React.useState(false);
    const [productName, setProductName] = React.useState("");
    const [productDescription, setProductDescription] = React.useState("");
    const [productPrice, setProductPrice] = React.useState("");
    const [productImages, setProductImages] = React.useState([]);
    const [productImagePreviews, setProductImagePreviews] = React.useState([]);
    const [productImageNames, setProductImageNames] = React.useState([]);
    const [keepImages, setKeepImages] = React.useState([]);
    const [productStock, setProductStock] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [loadingProducts, setLoadingProducts] = React.useState(true);
    const [error, setError] = React.useState("");
    const [featuredImageIndex, setFeaturedImageIndex] = React.useState(0);
    const [isEditing, setIsEditing] = React.useState(false);
    const [editingProductId, setEditingProductId] = React.useState(null);
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);
    const [deletingProductId, setDeletingProductId] = React.useState(null);

    const token = localStorage.getItem("token");

    // Cleanup object URLs to prevent memory leaks
    React.useEffect(() => {
        return () => {
            productImagePreviews.forEach((preview) => {
                URL.revokeObjectURL(preview);
            });
        };
    }, [productImagePreviews]);

    React.useEffect(() => {
        const fetchProducts = async () => {
            if (!token) {
                setLoadingProducts(false);
                return;
            }
            try {
                const response = await api.get("/api/products/my-products");
                // Ensure response.data is an array
                const productsData = Array.isArray(response.data) ? response.data : [];
                setProducts(productsData);
                setProductExists(productsData.length > 0);
            } catch (err) {
                console.error("Error fetching products", err);
                setProducts([]);
                setProductExists(false);
            } finally {
                setLoadingProducts(false);
            }
        };

        fetchProducts();
    }, [token]);
    
    const handleCreateClick = () => {
        setProductName("");
        setProductDescription("");
        setProductPrice("");
        setProductImages([]);
        setProductImagePreviews([]);
        setProductImageNames([]);
        setKeepImages([]);  // Reset keepImages for new product
        setFeaturedImageIndex(0);
        setIsEditing(false);
        setEditingProductId(null);
        setShowForm(true);
    };
    
    const handleCancel = () => {
        setShowForm(false);
        setIsEditing(false);
        setEditingProductId(null);
        setProductName("");
        setProductDescription("");
        setProductPrice("");
        setProductImages([]);
        setProductImagePreviews([]);
        setProductImageNames([]);
        setKeepImages([]);  // Reset keepImages
        setError("");
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files || []);
        
        const remainingSlots = 3 - productImages.length;
        
        if (remainingSlots <= 0) {
            setError("You can upload a maximum of 3 images.");
            return;
        }
        
        const newFiles = files.slice(0, remainingSlots);
        
        if (files.length > remainingSlots) {
            setError(`You can only add ${remainingSlots} more image(s). Maximum is 3.`);
        } else {
            setError("");
        }

        const updatedImages = [...productImages, ...newFiles];
        setProductImages(updatedImages);

        const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
        const updatedPreviews = [...productImagePreviews, ...newPreviews];
        setProductImagePreviews(updatedPreviews);

        const newNames = newFiles.map((file) => file.name);
        const updatedNames = [...productImageNames, ...newNames];
        setProductImageNames(updatedNames);
        
        e.target.value = "";
    };

    const handleRemoveImage = (index) => {
        // Check if this is an existing image (productImageNames[index] is empty) or a new one
        const isExistingImage = productImageNames[index] === "";
        
        if (isExistingImage && isEditing) {
            // Remove from keepImages - marks it for deletion on server
            const removedImageName = productImagePreviews[index];
            const filenameFromUrl = removedImageName.split('/').pop(); // Extract filename from URL
            setKeepImages(prev => prev.filter(img => img !== filenameFromUrl));
        }
        
        const newImages = productImages.filter((_, i) => i !== index);
        const newPreviews = productImagePreviews.filter((_, i) => i !== index);
        const newNames = productImageNames.filter((_, i) => i !== index);
        setProductImages(newImages);
        setProductImagePreviews(newPreviews);
        setProductImageNames(newNames);
        
        // Fix: Ensure featuredImageIndex stays valid after removing images
        if (newPreviews.length === 0) {
            // No images left, reset to 0
            setFeaturedImageIndex(0);
        } else if (index === featuredImageIndex) {
            // Removed the featured image, select the first one
            setFeaturedImageIndex(0);
        } else if (index < featuredImageIndex) {
            // Removed an image before the featured one, adjust index
            setFeaturedImageIndex(featuredImageIndex - 1);
        }
        // If index > featuredImageIndex, no change needed
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!productName.trim()) {
            setError("Product name is required.");
            return;
        }

        if (!productPrice || Number.isNaN(Number(productPrice))) {
            setError("Valid product price is required.");
            return;
        }

        if (!productStock || Number.isNaN(Number(productStock))) {
            setError("Valid product stock is required.");
            return;
        }

        if (!token) {
            setError("You must be logged in to add a product.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("productName", productName.trim());
            formData.append("productDescription", productDescription.trim());
            formData.append("productPrice", productPrice);
            formData.append("productStock", productStock);
            formData.append("featuredImageIndex", featuredImageIndex);

            productImages.forEach((file) => {
                formData.append("productImages", file);
            });
            // NOTE: keepImages is NOT sent on product create - only on update

            const response = await api.post("/api/products", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            setProducts((prev) => [response.data, ...prev]);
            setProductExists(true);
            setShowForm(false);
            setProductName("");
            setProductDescription("");
            setProductPrice("");
            setProductStock("");
            setProductImages([]);
            setProductImagePreviews([]);
            setProductImageNames([]);
        } catch (err) {
            setError(err.response?.data?.message || "Error adding product.");
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (product) => {
        setProductName(product.productName || "");
        setProductDescription(product.productDescription || "");
        setProductPrice(product.productPrice?.toString() || "");
        setProductStock(product.productStock?.toString() || "");
        setProductImages([]);
        
        // Ensure productImages is an array before mapping
        const imagesArray = Array.isArray(product.productImages) ? product.productImages : [];
        setProductImagePreviews(imagesArray.map(img => getImageUrl(img)));
        setProductImageNames(imagesArray.map(() => ""));
        
        setFeaturedImageIndex(product.featuredImageIndex || 0);
        setIsEditing(true);
        setEditingProductId(product._id);
        setShowForm(true);
        setKeepImages(imagesArray);
    };

    const handleRemoveExistingImage = (filename) => {
        setKeepImages(prev => prev.filter(img => img !== filename));
    };

    const handleDeleteClick = (productId) => {
        setDeletingProductId(productId);
        setShowDeleteModal(true);
    };

    const confirmDeleteProduct = async () => {
        if (!token || !deletingProductId) return;

        setLoading(true);
        setError("");

        try {
            await api.delete(`/api/products/delete-product/${deletingProductId}`);

            setProducts(products.filter(p => p._id !== deletingProductId));
            setShowDeleteModal(false);
            setDeletingProductId(null);
            
            const updatedProducts = products.filter(p => p._id !== deletingProductId);
            setProductExists(updatedProducts.length > 0);
        } catch (err) {
            setError(err.response?.data?.message || "Error deleting product.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();

        if (!productName.trim()) {
            setError("Product name is required.");
            return;
        }

        if (!productPrice || Number.isNaN(Number(productPrice))) {
            setError("Valid product price is required.");
            return;
        }

        if (!productStock || Number.isNaN(Number(productStock))) {
            setError("Valid product stock is required.");
            return;
        }

        if (!token) {
            setError("You must be logged in to update a product.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("productName", productName.trim());
            formData.append("productDescription", productDescription.trim());
            formData.append("productPrice", productPrice);
            formData.append("productStock", productStock);
            formData.append("featuredImageIndex", featuredImageIndex);
            formData.append("keepImages", JSON.stringify(keepImages));

            productImages.forEach((file) => {
                formData.append("productImages", file);
            });

            const response = await api.put(`/api/products/update-product/${editingProductId}`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            setProducts(products.map(p => p._id === editingProductId ? response.data : p));
            setShowForm(false);
            setIsEditing(false);
            setEditingProductId(null);
            setProductName("");
            setProductDescription("");
            setProductPrice("");
            setProductStock("");
            setProductImages([]);
            setProductImagePreviews([]);
            setProductImageNames([]);
        } catch (err) {
            setError(err.response?.data?.message || "Error updating product.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container border border-black rounded p-4">
            <h2 className="text-primary">Products</h2>

            {error && !showForm && (
                <div className="alert alert-danger mt-3" role="alert">
                    {error}
                </div>
            )}

            {loadingProducts ? (
                <div className="text-center mt-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading products...</p>
                </div>
            ) : !productExists && !showForm ? (
                <div className="mt-4">
                    <div className="d-flex flex-column align-items-center justify-content-center mb">
                        <FiBox size={64} className="text-secondary" />
                        <h4 className="text-muted mt-3">No Products Yet</h4>
                        <p className="text-muted">Start adding products to your shop</p>
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ width: "100%" }}
                        onClick={handleCreateClick}
                    >
                        Add Product
                    </button>
                </div>
            ) : null}

            {productExists && !showForm && products.length > 0 && (
                <>
                    <div className="mt-4">
                        <div className="row g-3">
                            {products.map((product) => {
                                const featuredIndex = product.featuredImageIndex || 0;
                                const productImages = Array.isArray(product.productImages) ? product.productImages : [];
                                const displayImage =
                                    productImages.length > 0
                                        ? getImageUrl(productImages[featuredIndex])
                                        : null;

                                return (
                                    <div className="col-6 col-md-4 col-lg-3" key={product._id}>
                                        <div className="card h-100 border border-black">
                                            {displayImage ? (
                                                <img
                                                    src={displayImage}
                                                    className="card-img-top"
                                                    alt={product.productName}
                                                    style={{
                                                        height: "120px",    
                                                        objectFit: "cover",
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className="d-flex align-items-center justify-content-center bg-light"
                                                    style={{ height: "120px" }}
                                                >
                                                    <FiBox size={32} className="text-secondary" />
                                                </div>
                                            )}
                                            <div className="card-body d-flex flex-column p-2">
                                                <h6 className="card-title mb-1 text-truncate">{product.productName}</h6>
                                                {product.productDescription && (
                                                    <p className="card-text text-muted small flex-grow-1 mb-1 text-truncate">
                                                        {product.productDescription.length > 40
                                                            ? `${product.productDescription.slice(0, 37)}...`
                                                            : product.productDescription}
                                                    </p>
                                                )}
                                                <div className="mt-auto">
                                                    <div className="d-flex justify-content-between align-items-center mt-1 mb-2">
                                                        <span className="fw-bold text-primary" style={{ fontSize: "1rem"}}>
                                                            ₱{product.productPrice}
                                                        </span>
                                                        <span className="text-muted" style={{ fontSize: "0.75rem"}}>
                                                            Stock: {product.productStock}
                                                        </span>
                                                    </div>

                                                    <div className="d-flex justify-content-center gap-2">
                                                        <button
                                                            className="btn btn-primary w-100"
                                                            onClick={() => handleEditClick(product)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary w-100"
                                                            onClick={() => handleDeleteClick(product._id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="mt-4">
                        <button
                            className="btn btn-primary"
                            style={{ width: "100%" }}
                            onClick={handleCreateClick}
                            disabled={loading}
                        >
                            Add Product
                        </button>
                    </div>
                </>
            )}

            {showForm && (
                <form className="mt-4" onSubmit={isEditing ? handleUpdateSubmit : handleSubmit}>
                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}
                    <div className="mb-3">
                        <label htmlFor="productName" className="form-label font-weight-semibold">
                            Product Name <span className="text-primary">*</span>
                        </label>
                        <input
                            type="text"
                            className="form-control"
                            id="productName"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                        />
                    </div>

                    <div className="mb-3">
                        <label
                            htmlFor="productDescription"
                            className="form-label font-weight-semibold"
                        >
                            Product Description
                        </label>
                        <textarea
                            className="form-control"
                            id="productDescription"
                            value={productDescription}
                            onChange={(e) => setProductDescription(e.target.value)}
                        />
                    </div>

                    <div className="mb-3 d-flex gap-2">
                        <div style={{ width: "100%" }}>
                            <label htmlFor="productPrice" className="form-label font-weight-semibold">
                                Product Price (₱) <span className="text-primary">*</span>
                            </label>
                            <input
                                type="number"
                                className="form-control"
                                id="productPrice"
                                value={productPrice}
                                onChange={(e) => setProductPrice(e.target.value)}
                            />
                        </div>

                        <div style={{ width: "100%" }}>
                            <label htmlFor="productStock" className="form-label font-weight-semibold">
                                Product Stock <span className="text-primary">*</span>
                            </label>
                            <input
                                type="number"
                                className="form-control"
                                id="productStock"
                                value={productStock}
                                onChange={(e) => setProductStock(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label htmlFor="productImage" className="form-label font-weight-semibold">
                            Product Images (up to 3)
                        </label>
                        <input
                            type="file"
                            className="d-none"
                            id="productImage"
                            multiple
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                        {productImagePreviews.length > 0 && (
                            <div className="d-flex justify-content-center mb-2 gap-2 flex-wrap">
                                {productImagePreviews.map((preview, index) => (
                                    <div key={index} style={{ position: "relative" }}>
                                        <img
                                            src={preview}
                                            alt={`Preview ${index + 1}`}
                                            onClick={() => setFeaturedImageIndex(index)}
                                            style={{
                                                width: "100px",
                                                height: "100px",
                                                objectFit: "cover",
                                                borderRadius: "4px",
                                                border: index === featuredImageIndex ? "3px solid #db4444" : "1px solid #db4444",
                                                cursor: "pointer",
                                            }}
                                        />
                                        {index === featuredImageIndex && (
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: "4px",
                                                    right: "4px",
                                                    backgroundColor: "#db4444",
                                                    borderRadius: "50%",
                                                    padding: "4px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                <FaStar size={12} color="#fff" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <label
                            htmlFor="productImage"
                            className="form-control dashed-border"
                            style={{ cursor: "pointer", minHeight: "38px", padding: "8px" }}
                        >
                            {productImageNames.length > 0 ? (
                                <div className="d-flex flex-wrap gap-2 align-items-center">
                                    {productImageNames.map((name, index) => (
                                        <div key={index} className="d-flex align-items-center gap-1 border border-primary rounded p-2">
                                            <span style={{ fontSize: "14px" }}>
                                            {name.length > 10 ? `${name.slice(0, 12)}....` : name}
                                        </span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-danger"
                                                style={{ padding: "2px 6px", fontSize: "12px"}}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleRemoveImage(index);
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    {productImageNames.length < 3 && (
                                        <div
                                            className="dashed-border"
                                            style={{
                                                width: "80px",
                                                height: "40px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer",
                                                borderRadius: "4px",
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                document.getElementById("productImage").click();
                                            }}
                                        >
                                            <span style={{ color: "#db4444", fontSize: "20px", fontWeight: "bold" }}>+</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                "Upload Product Image"
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
                            {loading ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update Product" : "Add Product")}
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
            )}

            <DangerModal
                show={showDeleteModal}
                onHide={() => setShowDeleteModal(false)}
                onConfirm={confirmDeleteProduct}
                title="Delete Product"
                messsage="Are you sure you want to delete this product? This action cannot be undone."
            />
        </div>
    );
}

export default ProductsSection;
