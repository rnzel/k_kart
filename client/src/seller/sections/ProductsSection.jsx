import React from "react";
import { FiBox } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { productAPI } from "../../utils/api";
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

    // Helper function to validate product data
    const validateProductData = () => {
        if (!productName.trim()) {
            return "Product name is required.";
        }

        if (!productPrice || Number.isNaN(Number(productPrice)) || Number(productPrice) < 0) {
            return "Valid product price is required (must be a non-negative number).";
        }

        if (!productStock || Number.isNaN(Number(productStock)) || Number(productStock) < 0) {
            return "Valid product stock is required (must be a non-negative number).";
        }

        if (featuredImageIndex < 0 || featuredImageIndex >= (productImagePreviews.length || 1)) {
            return "Invalid featured image selection.";
        }

        return null;
    };

    // Helper function to validate image files
    const validateImageFiles = (files) => {
        if (!files || files.length === 0) {
            return "No files selected.";
        }

        for (const file of files) {
            // Check file type
            if (!file.type.startsWith('image/')) {
                return "Only image files are allowed.";
            }

            // Check file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                return "File size too large. Maximum allowed size is 5MB.";
            }

            // Check filename for security
            if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
                return "Invalid filename. Please use a different file name.";
            }
        }

        return null;
    };

    // Helper function to fix featured image index when removing images
    const fixFeaturedImageIndex = (newPreviewLength, removedIndex) => {
        if (newPreviewLength === 0) {
            setFeaturedImageIndex(0);
        } else if (removedIndex === featuredImageIndex) {
            // Removed the featured image, select the first one
            setFeaturedImageIndex(0);
        } else if (removedIndex < featuredImageIndex) {
            // Removed an image before the featured one, adjust index
            setFeaturedImageIndex(featuredImageIndex - 1);
        }
        // If removedIndex > featuredImageIndex, no change needed
    };

    // Helper function to reset form state
    const resetFormState = () => {
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
        setKeepImages([]);
        setError("");
    };

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
                const result = await productAPI.getMyProducts();
                if (result.success) {
                    setProducts(result.data || []);
                    setProductExists((result.data || []).length > 0);
                } else {
                    console.error("Error fetching products:", result.message);
                    setProducts([]);
                    setProductExists(false);
                }
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
        
        // Validate files before processing
        const validationError = validateImageFiles(files);
        if (validationError) {
            setError(validationError);
            return;
        }
        
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
        // Handle keepImages for existing images during edit mode
        if (isEditing && productImageNames[index] === "") {
            // This is an existing image, remove from keepImages
            const removedImageName = productImagePreviews[index];
            const filenameFromUrl = removedImageName.split('/').pop();
            setKeepImages(prev => prev.filter(img => img !== filenameFromUrl));
        }
        
        // Remove from state arrays
        const newImages = productImages.filter((_, i) => i !== index);
        const newPreviews = productImagePreviews.filter((_, i) => i !== index);
        const newNames = productImageNames.filter((_, i) => i !== index);
        
        setProductImages(newImages);
        setProductImagePreviews(newPreviews);
        setProductImageNames(newNames);
        
        // Fix featuredImageIndex to stay valid
        fixFeaturedImageIndex(newPreviews.length, index);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Enhanced validation
        const validationError = validateProductData();
        if (validationError) {
            setError(validationError);
            return;
        }

        if (!token) {
            setError("You must be logged in to add a product.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const productData = {
                productName: productName.trim(),
                productDescription: productDescription.trim(),
                productPrice: Number(productPrice),
                productStock: Number(productStock),
                featuredImageIndex: featuredImageIndex
            };

            const result = await productAPI.createProduct(productData, productImages);

            if (result.success) {
                setProducts((prev) => [result.data, ...prev]);
                setProductExists(true);
                setShowForm(false);
                resetFormState();
            } else {
                setError(result.message);
            }
        } catch (err) {
            console.error('Error adding product:', err);
            setError(err.response?.data?.message || "Error adding product. Please try again.");
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
        
        // Validate featuredImageIndex bounds
        const validFeaturedIndex = Math.max(0, Math.min(imagesArray.length - 1, product.featuredImageIndex || 0));
        setFeaturedImageIndex(validFeaturedIndex);
        
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
            const result = await productAPI.deleteProduct(deletingProductId);

            if (result.success) {
                setProducts(products.filter(p => p._id !== deletingProductId));
                setShowDeleteModal(false);
                setDeletingProductId(null);
                
                const updatedProducts = products.filter(p => p._id !== deletingProductId);
                setProductExists(updatedProducts.length > 0);
            } else {
                setError(result.message);
            }
        } catch (err) {
            console.error('Error deleting product:', err);
            setError(err.response?.data?.message || "Error deleting product. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();

        // Enhanced validation
        const validationError = validateProductData();
        if (validationError) {
            setError(validationError);
            return;
        }

        if (!token) {
            setError("You must be logged in to update a product.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const productData = {
                productName: productName.trim(),
                productDescription: productDescription.trim(),
                productPrice: Number(productPrice),
                productStock: Number(productStock),
                featuredImageIndex: featuredImageIndex
            };

            const result = await productAPI.updateProduct(editingProductId, productData, productImages, keepImages);

            if (result.success) {
                setProducts(products.map(p => p._id === editingProductId ? result.data : p));
                setShowForm(false);
                resetFormState();
            } else {
                setError(result.message);
            }
        } catch (err) {
            console.error('Error updating product:', err);
            setError(err.response?.data?.message || "Error updating product. Please try again.");
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
                            maxLength={50}
                            onChange={(e) => setProductName(e.target.value)}
                        />
                        <small className="text-muted">
                            {productName.length}/50 characters
                        </small>
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
                            rows="3"
                            value={productDescription}
                            maxLength={500}
                            onChange={(e) => setProductDescription(e.target.value)}
                        />
                        <small className="text-muted">
                            {productDescription.length}/500 characters
                        </small>
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
                                        <div key={`image-name-${index}`} className="d-flex align-items-center gap-1 border border-primary rounded p-2">
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
                                            key="add-image-button"
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
                message="Are you sure you want to delete this product? This action cannot be undone."
            />
        </div>
    );
}

export default ProductsSection;
