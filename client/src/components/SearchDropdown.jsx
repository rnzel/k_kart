import React from "react";
import { getImageUrl } from "../utils/imageUrl.js";
import { FiShoppingBag, FiBox } from "react-icons/fi";

function SearchDropdown({ shops, products, searchTerm, onSelect, onClickOutside }) {
    const dropdownRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClickOutside();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClickOutside]);

    const filteredShops = shops.filter((shop) =>
        shop.shopName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredProducts = products.filter((product) =>
        product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.productDescription && product.productDescription.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const hasResults = filteredShops.length > 0 || filteredProducts.length > 0;
    const hasSearchTerm = searchTerm.trim().length > 0;

    return (
        <div
            ref={dropdownRef}
            className="position-absolute w-100 bg-white border border-black rounded-bottom mt-2"
            style={{
                zIndex: 1000,
                maxHeight: "400px",
                overflowY: "auto",
                top: "100%",
                left: 0,
            }}
        >
            {/* No results message */}
            {!hasResults && hasSearchTerm && (
                <div className="p-3 text-center text-muted">
                    <p className="mb-0">No results found for "{searchTerm}"</p>
                </div>
            )}

            {/* Shops Section */}
            {filteredShops.length > 0 && (
                <div>
                    <div className="px-3 py-2 bg-light border-bottom">
                        <small className="text-muted fw-bold">Shops</small>
                    </div>
                    {filteredShops.map((shop) => (
                        <div
                            key={shop._id}
                            className="d-flex align-items-center p-2 border-bottom"
                            style={{ cursor: "pointer" }}
                            onClick={() => onSelect("shop", shop)}
                        >
                            {shop.shopLogo ? (
                                <img
                                    src={getImageUrl(shop.shopLogo)}
                                    alt={shop.shopName}
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        objectFit: "cover",
                                        borderRadius: "4px",
                                    }}
                                />
                            ) : (
                                <div
                                    className="d-flex align-items-center justify-content-center bg-light"
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        borderRadius: "4px",
                                    }}
                                >
                                    <FiShoppingBag size={20} className="text-secondary" />
                                </div>
                            )}
                            <span className="ms-2 text-truncate">{shop.shopName}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Products Section */}
            {filteredProducts.length > 0 && (
                <div>
                    <div className="px-3 py-2 bg-light border-bottom">
                        <small className="text-muted fw-bold">Products</small>
                    </div>
                    {filteredProducts.map((product) => (
                        <div
                            key={product._id}
                            className="d-flex align-items-center p-2 border-bottom"
                            style={{ cursor: "pointer" }}
                            onClick={() => onSelect("product", product)}
                        >
                            {product.productImages && product.productImages.length > 0 ? (
                                <img
                                    src={getImageUrl(product.productImages[0])}
                                    alt={product.productName}
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        objectFit: "cover",
                                        borderRadius: "4px",
                                    }}
                                />
                            ) : (
                                <div
                                    className="d-flex align-items-center justify-content-center bg-light"
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        borderRadius: "4px",
                                    }}
                                >
                                    <FiBox size={20} className="text-secondary" />
                                </div>
                            )}
                            <div className="ms-2 overflow-hidden">
                                <div className="text-truncate">{product.productName}</div>
                                <small className="text-muted">₱{product.productPrice}</small>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SearchDropdown;
