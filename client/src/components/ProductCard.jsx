import React from "react";
import { getImageUrl } from "../utils/imageUrl.js";
import { FiBox, FiShoppingCart } from "react-icons/fi";

function ProductCard({ product, onAddToCart, isAddingToCart }) {
    const featuredIndex = product.featuredImageIndex || 0;
    const productImages = Array.isArray(product.productImages) ? product.productImages : [];
    const displayImage = productImages.length > 0
        ? getImageUrl(productImages[featuredIndex])
        : null;

    const isDisabled = product.productStock <= 0 || isAddingToCart;

    return (
        <div className="col-6 col-md-4 col-lg-3">
            <div className="card h-100 border border-black">
                {displayImage ? (
                    <img
                        src={displayImage}
                        className="card-img-top"
                        alt={product.productName}
                        style={{
                            height: "150px",
                            objectFit: "cover",
                        }}
                    />
                ) : (
                    <div
                        className="d-flex align-items-center justify-content-center bg-light"
                        style={{ height: "150px" }}
                    >
                        <FiBox size={64} className="text-secondary" />
                    </div>
                )}
                <div className="card-body d-flex flex-column p-2">
                    <h6 className="card-title mb-1 text-truncate">{product.productName}</h6>
                    {product.productDescription && (
                        <p className="card-text text-muted small flex-grow-1 mb-1 text-truncate" style={{ fontSize: "0.85rem" }}>
                            {product.productDescription.length > 40
                                ? `${product.productDescription.slice(0, 37)}...`
                                : product.productDescription}
                        </p>
                    )}
                    <div className="mt-auto">
                        <div className="d-flex justify-content-between align-items-center mt-1 mb-2">
                            <span className="fw-bold text-primary" style={{ fontSize: "1.1rem" }}>
                                ₱{product.productPrice}
                            </span>
                            <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                                {product.productStock > 0 ? `Stock: ${product.productStock}` : 'Out of Stock'}
                            </span>
                        </div>

                        <button
                            className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                            onClick={() => onAddToCart(product)}
                            disabled={isDisabled}
                        >
                            {isAddingToCart ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <FiShoppingCart size={16} />
                                    Add to Cart
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductCard;
