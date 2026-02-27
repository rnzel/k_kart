import React from "react";
import { getImageUrl } from "../utils/imageUrl.js";
import { FiShoppingBag } from "react-icons/fi";

function ShopCard({ shop }) {
    return (
        <div className="shop-card-container border p-2 rounded">
            <div className="card-body d-flex flex-column align-items-center justify-content-center">
                {/* Shop Logo - Circular with border */}
                <div 
                    className="rounded-circle d-flex align-items-center justify-content-center mb-2 shop-card-logo"
                    style={{
                        width: "80px",
                        height: "80px",
                        border: "3px solid #db4444",
                        overflow: "hidden",
                        backgroundColor: "#f8f9fa"
                    }}
                >
                    {shop.shopLogo ? (
                        <img
                            src={getImageUrl(shop.shopLogo)}
                            alt={shop.shopName}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover"
                            }}
                        />
                    ) : (
                        <FiShoppingBag size={32} className="text-secondary" />
                    )}
                </div>
                {/* Shop Name */}
                <h6 className="card-title text-center mb-0 shop-card-name" style={{ fontSize: "0.9rem" }}>
                    {shop.shopName}
                </h6>
            </div>
        </div>
    );
}

export default ShopCard;
