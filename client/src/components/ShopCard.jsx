import React from "react";
import { getImageUrl } from "../utils/imageUrl.js";
import { FiShoppingBag } from "react-icons/fi";

function ShopCard({ shop }) {
    return (
        <div className="card h-100 border border-black">
            {shop.shopLogo ? (
                <img
                    src={getImageUrl(shop.shopLogo)}
                    className="card-img-top"
                    alt={shop.shopName}
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
                    <FiShoppingBag size={64} className="text-secondary" />
                </div>
            )}
            <div className="card-body d-flex flex-column p-2">
                <h6 className="card-title mb-1 text-truncate">{shop.shopName}</h6>
            </div>
        </div>
    );
}

export default ShopCard;
