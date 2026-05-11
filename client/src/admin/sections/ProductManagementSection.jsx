import React from "react";
import { FiPackage, FiShoppingBag, FiDollarSign, FiTag, FiEye, FiRefreshCw, FiSearch } from "react-icons/fi";
import { productAPI } from "../../utils/api.js";
import { getImageUrl } from "../../utils/imageUrl.js";

function ProductManagementSection() {
    const [products, setProducts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [totalProducts, setTotalProducts] = React.useState(0);

    React.useEffect(() => {
        fetchProducts(1);
    }, []);

    const fetchProducts = async (page = 1) => {
        try {
            setLoading(true);
            setError(null);
            const response = await productAPI.getAllProducts(page, 10);
            
            if (response.success) {
                setProducts(Array.isArray(response.data) ? response.data : []);
                setCurrentPage(page);
                setTotalPages(response.pagination?.totalPages || 1);
                setTotalProducts(response.pagination?.total || 0);
            } else {
                setProducts([]);
                setError(response.message || 'Failed to load products');
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
            setError('Failed to load products. Please check your internet connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(product => 
        product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.shop?.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.productDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.productCategory.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Loading state
    if (loading) {
        return (
            <div className="container border border-black rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-primary mb-0">Product Management</h2>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => fetchProducts(currentPage)}
                    >
                        <FiRefreshCw className="me-2" />
                        Refresh
                    </button>
                </div>

                <div className="d-flex justify-content-center align-items-center mt-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading products...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="container border border-black rounded p-4">
                <h2 className="text-primary">Product Management</h2>
                <div className="alert alert-danger mt-3" role="alert">
                    {error}
                </div>
                <button className="btn btn-primary" onClick={fetchProducts}>
                    Try Again
                </button>
            </div>
        );
    }

    // Empty state
    if (products.length === 0) {
        return (
            <div className="container border border-black rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-primary mb-0">Product Management</h2>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => fetchProducts(currentPage)}
                    >
                        <FiRefreshCw className="me-2" />
                        Refresh
                    </button>
                </div>

                <div className="d-flex flex-column align-items-center justify-content-center mt-4">
                    <FiPackage size={64} className="text-secondary" />
                    <h4 className="text-muted mt-3">No products found</h4>
                    <p className="text-muted">No products have been created yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container border border-black rounded p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-primary mb-0">Product Management</h2>
                <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => fetchProducts(currentPage)}
                >
                    <FiRefreshCw className="me-2" />
                    Refresh
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
                <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                        <FiSearch className="text-muted" />
                    </span>
                    <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Search products by name, shop, description, or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>


            {/* Products Table */}
            <div className="table-responsive">
                <table className="table table-hover">
                    <thead className="table-light">
                        <tr>
                            <th>Product Image</th>
                            <th>Product Name</th>
                            <th>Shop</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th>Created Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(product => (
                            <tr key={product._id}>
                                <td>
                                    {product.productImages && product.productImages.length > 0 ? (
                                        <img 
                                            src={getImageUrl(product.productImages[0])} 
                                            alt={product.productName}
                                            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
                                        />
                                    ) : (
                                        <div 
                                            className="bg-light rounded d-flex align-items-center justify-content-center"
                                            style={{ width: '60px', height: '60px' }}
                                        >
                                            <FiPackage size={24} className="text-secondary" />
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <div>
                                        <strong>{product.productName}</strong>
                                        <br />
                                        <small className="text-muted">{product.productDescription}</small>
                                    </div>
                                </td>
                                <td>
                                    {product.shop ? (
                                        <div>
                                            <div>{product.shop.shopName}</div>
                                            <small className="text-muted">{product.shop.owner?.firstName} {product.shop.owner?.lastName}</small>
                                        </div>
                                    ) : (
                                        <span className="text-muted">No shop assigned</span>
                                    )}
                                </td>
                                <td>
                                    <span className="badge bg-secondary">{product.productCategory}</span>
                                </td>
                                <td>
                                    <strong className="text-primary">₱{product.productPrice.toLocaleString()}</strong>
                                </td>
                                <td>
                                    <span className={`badge ${product.productStock > 0 ? 'bg-success' : 'bg-danger'}`}>
                                        {product.productStock}
                                    </span>
                                </td>
                                <td>
                                    <span className={`badge ${product.isDeleted ? 'bg-danger' : 'bg-success'}`}>
                                        {product.isDeleted ? 'Deleted' : 'Active'}
                                    </span>
                                </td>
                                <td>
                                    {new Date(product.createdAt).toLocaleDateString()}
                                </td>
                                <td>
                                    <button className="btn btn-outline-primary btn-sm">
                                        <FiEye className="me-1" />
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-4">
                    <span className="text-muted small">
                        Page {currentPage} of {totalPages} ({totalProducts} products)
                    </span>
                    <div className="d-flex gap-2">
                        <button 
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => fetchProducts(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>
                        <button 
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => fetchProducts(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProductManagementSection;