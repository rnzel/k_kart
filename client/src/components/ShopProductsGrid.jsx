import React from "react";
import { FiBox, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import ProductCard from "./ProductCard.jsx";

function ShopProductsGrid({ 
    products, 
    loading, 
    error,
    onAddToCart, 
    isAddingToCart, 
    currentPage, 
    totalPages, 
    onPageChange,
    emptyTitle = "No products found",
    emptyDescription = "This shop doesn't have any products available at the moment."
}) {
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            onPageChange(newPage);
        }
    };

    return (
        <div className="container mt-4 mb-4">
            {loading && (
                <div className="text-center mt-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading products...</p>
                </div>
            )}

            {error && (
                <div className="alert alert-danger mt-3" role="alert">
                    {error}
                </div>
            )}

            {!loading && !error && (!products || products.length === 0) && (
                <div className="text-center mt-5">
                    <FiBox size={64} className="text-secondary" />
                    <h4 className="mt-3 text-muted">{emptyTitle}</h4>
                    <p className="text-muted">{emptyDescription}</p>
                </div>
            )}

            {!loading && !error && products && products.length > 0 && (
                <div>
                    <div className="row g-3">
                        {products.map((product) => (
                            <ProductCard 
                                key={product._id} 
                                product={product} 
                                onAddToCart={onAddToCart}
                                isAddingToCart={isAddingToCart(product._id)}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="d-flex justify-content-center align-items-center mt-4 gap-2">
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <FiChevronLeft />
                            </button>
                            <span className="text-muted">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                <FiChevronRight />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ShopProductsGrid;
