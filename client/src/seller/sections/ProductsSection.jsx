import React from "react";
import axios from "axios";
import { FiBox } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
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
    const [productStock, setProductStock] = React.useState("");
    const [loading, setLoading] = React.useState(false);
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
            if (!token) return;
            try {
                const response = await axios.get("/api/products/my-products", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                // Ensure response.data is an array
                const productsData = Array.isArray(response.data) ? response.data : [];
                setProducts(productsData);
                setProductExists(productsData.length > 0);
            } catch (err) {
                console.error("Error fetching products", err);
                setProducts([]);
                setProductExists(false);
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
        const newImages = productImages.filter((_, i) => i !== index);
        const newPreviews = productImagePreviews.filter((_, i) => i !== index);
        const newNames = productImageNames.filter((_, i) => i !== index);
        setProductImages(newImages);
        setProductImagePreviews(newPreviews);
        setProductImageNames(newNames);
        
        if (index === featuredImageIndex) {
            setFeaturedImageIndex(0);
        } else if (index < featuredImageIndex) {
            setFeaturedImageIndex(featuredImageIndex - 1);
        }
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

            const response = await axios.post("/api/products", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
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
        setProductImagePreviews(imagesArray.map(img => `/api/images/${img}`));
        setProductImageNames(imagesArray.map(() => ""));
        
        setFeaturedImageIndex(product.featuredImageIndex || 0);
        setIsEditing(true);
        setEditingProductId(product._id);
        setShowForm(true);
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
            await axios.delete(`/api/products/delete-product/${deletingProductId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

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

            productImages.forEach((file) => {
                formData.append("productImages", file);
            });

            const response = await axios.put(`/api/products/update-product/${editingProductId}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
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
            
            {!productExists && !showForm ? (
                <div className="mt-4">
                    <div className="d-flex flex-column align-items-center justify-content-center mb-3">
                        <FiBox size={48} className="text-secondary" />
                        <h3 className="text-center">No Products Added Yet</h3>
                        <p className="text-center text-secondary">
                            You haven't added any products yet. Start by adding your products to
                            showcase your products!
                        </p>
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
                                        ? `/api/images/${productImages[featuredIndex]}`
                                        : null;

                                return (
                                    <div className="col-md-4" key={product._id}>
                                        <div className="card h-100 border border-black">
                                            {displayImage ? (
                                                <img
                                                    src={displayImage}
                                                    className="card-img-top"
                                                    alt={product.productName}
                                                    style={{
                                                        height: "180px",
                                                        objectFit: "cover",
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className="d-flex align-items-center justify-content-center bg-light"
                                                    style={{ height: "180px" }}
                                                >
                                                    <FiBox size={48} className="text-secondary" />
                                                </div>
                                            )}
                                            <div className="card-body d-flex flex-column">
                                                <h5 className="card-title">{product.productName}</h5>
                                                {product.productDescription && (
                                                    <p className="card-text text-muted small flex-grow-1">
                                                        {product.productDescription.length > 80
                                                            ? `${product.productDescription.slice(0, 77)}...`
                                                            : product.productDescription}
                                                    </p>
                                                )}
                                                <div className="d-flex justify-content-between align-items-center mt-2">
                                                    <span className="fw-bold text-primary" style={{ fontSize: "1.2rem"}}>
                                                        ₱{product.productPrice}
                                                    </span>
                                                    <span className="text-muted small">
                                                        Stock: {product.productStock}
                                                    </span>
                                                </div>

                                                <div className="d-flex gap-2">
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ width: "100%" }}
                                                        onClick={() => handleEditClick(product)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ width: "100%" }}
                                                        onClick={() => handleDeleteClick(product._id)}
                                                    >
                                                        Delete
                                                    </button>
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
                            <div className="d-flex justify-content-center mb-2 gap-2">
                                {productImagePreviews.map((preview, index) => (
                                    <div key={index} style={{ position: "relative" }}>
                                        <img
                                            src={preview}
                                            alt={`Preview ${index + 1}`}
                                            onClick={() => setFeaturedImageIndex(index)}
                                            style={{
                                                width: "120px",
                                                height: "120px",
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
                            {isEditing ? "Update Product" : "Add Product"}
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
