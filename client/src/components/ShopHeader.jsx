import React from "react";
import { getImageUrl } from "../utils/imageUrl.js";
import { FiUser, FiMapPin, FiPhone } from "react-icons/fi";

function ShopHeader({ shop }) {
    return (
        <div className="shop-header mb-4">
            <div className="row">
                {/* Shop Logo - Left Side */}
                <div className="col-md-3 text-start mb-3 mb-md-0">
                    <div 
                        className="shop-logo-container"
                        style={{
                            width: "120px",
                            height: "120px",
                            borderRadius: "50%",
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
                            <div className="d-flex align-items-center justify-content-center h-100">
                                <FiUser size={48} className="text-secondary" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Shop Name and Description - Left Aligned */}
                <div className="col-md-6 mb-3 mb-md-0">
                    <div className="shop-info text-start">
                        <h2 className="shop-name mb-2 text-start" style={{ color: "#db4444", fontSize: "1.8rem" }}>
                            {shop.shopName}
                        </h2>
                        
                        <div className="shop-description text-start">
                            <p className="text-muted mb-0 text-start" style={{ fontSize: "1rem", lineHeight: "1.5" }}>
                                {shop.shopDescription}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Shop Contact Details - Right Side */}
                <div className="col-md-3">
                    <div 
                        className="shop-contact-container p-3"
                        style={{
                            border: "1px solid black",
                            borderRadius: "8px",
                        }}
                    >
                        <h6 className="mb-3" style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                            CONTACT DETAILS
                        </h6>
                        
                        {shop.shopContact && (
                                <div className="d-flex align-items-center mb-2">
                                    <FiPhone size={16} className="text-primary me-2" />
                                    <a 
                                        href={`tel:${shop.shopContact}`}
                                        className="text-primary"
                                        style={{ 
                                            fontSize: "0.9rem",
                                            textDecoration: "underline",
                                            cursor: "pointer"
                                        }}
                                    >
                                        {shop.shopContact}
                                    </a>
                                </div>
                            )}

                        <div className="contact-info">
                            {shop.shopLocation && (
                                <div className="d-flex align-items-center mb-0">
                                    <FiMapPin size={16} className="text-primary me-2" />
                                    <span className="text-muted" style={{ fontSize: "0.9rem" }}>
                                        {shop.shopLocation}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ShopHeader;