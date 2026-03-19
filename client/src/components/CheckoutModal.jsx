import React from "react";
import { FiMapPin, FiMessageSquare, FiAlertCircle, FiCheckCircle } from "react-icons/fi";

function CheckoutModal({ 
    showModal, 
    onClose, 
    onConfirm, 
    pickupLocation, 
    note, 
    contactNumber,
    onPickupLocationChange, 
    onNoteChange,
    onContactNumberChange,
    loading = false,
    error = null,
    itemDetails = null,
    userName = null
}) {
    if (!showModal) {
        return null;
    }

    // Validation states
    const isPickupLocationValid = pickupLocation.trim().length > 0 && pickupLocation.trim().length <= 200;
    const isContactNumberValid = /^09[0-9]{9}$/.test(contactNumber);
    const isFormValid = isPickupLocationValid && isContactNumberValid;

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-black">
                    <div className="modal-header border-black">
                        <h5 className="modal-title text-primary">Checkout</h5>
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={onClose}
                            disabled={loading}
                        ></button>
                    </div>
                    <div className="modal-body">
                        {/* Error Display */}
                        {error && (
                            <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                                <FiAlertCircle className="me-2" />
                                <div>{error}</div>
                            </div>
                        )}
                        
                        {/* Pickup Location Field */}
                        <div className="mb-3">
                            <label className="form-label fw-bold"> 
                                <FiMapPin className="me-2" />
                                Pickup Location
                                <span className="text-primary"> *</span>
                            </label>
                            <input 
                                type="text" 
                                className={`form-control ${pickupLocation.trim() && !isPickupLocationValid ? 'is-invalid' : pickupLocation.trim() && isPickupLocationValid ? 'is-valid' : ''}`}
                                value={pickupLocation}
                                onChange={(e) => onPickupLocationChange(e.target.value)}
                                placeholder="Enter specific location inside SorSU – Bulan Campus"
                                maxLength="200"
                                disabled={loading}
                            />
                            <div className="form-text">Please enter a specific location inside SorSU – Bulan Campus</div>
                            {!isPickupLocationValid && pickupLocation.trim() && (
                                <div className="invalid-feedback">
                                    Pickup location is required and cannot exceed 200 characters
                                </div>
                            )}
                        </div>

                        {/* Contact Number Field */}
                        <div className="mb-3">
                            <label className="form-label fw-bold">
                                <FiMessageSquare className="me-2" />
                                Contact Number
                                <span className="text-primary"> *</span>
                            </label>
                            <input 
                                type="tel" 
                                className={`form-control ${contactNumber.trim() && !isContactNumberValid ? 'is-invalid' : contactNumber.trim() && isContactNumberValid ? 'is-valid' : ''}`}
                                value={contactNumber}
                                onChange={(e) => onContactNumberChange(e.target.value)}
                                placeholder="09XXXXXXXXX"
                                pattern="[0-9]{11}"
                                maxLength="11"
                                disabled={loading}
                            />
                            <div className="form-text">Enter your 11-digit mobile number starting with 09 (e.g., 09123456789)</div>
                            {!isContactNumberValid && contactNumber.trim() && (
                                <div className="invalid-feedback">
                                    Please enter a valid 11-digit mobile number
                                </div>
                            )}
                            {isContactNumberValid && (
                                <div className="valid-feedback">
                                    <FiCheckCircle className="me-1" />Valid contact number
                                </div>
                            )}
                        </div>

                        {/* Delivery Instructions Field */}
                        <div className="mb-3">
                            <label className="form-label fw-bold">
                                <FiMessageSquare className="me-2" />
                                Delivery Instructions (Optional)
                            </label>
                            <textarea 
                                className="form-control"
                                rows="3"
                                value={note}
                                onChange={(e) => onNoteChange(e.target.value)}
                                placeholder="Any special instructions for delivery..."
                                maxLength="500"
                                disabled={loading}
                            ></textarea>
                            <div className="form-text">Add any special instructions for delivery (optional, max 500 characters)</div>
                        </div>

                        {/* Order Summary */}
                        {itemDetails && (
                            <div className="mb-3">
                                <h6 className="fw-bold text-primary">Order Summary</h6>
                                <div className="border rounded p-3 bg-light">
                                    {userName && (
                                        <div className="mb-2 d-flex justify-content-between">
                                            <span>Customer:</span>
                                            <span className="fw-bold">{userName}</span>
                                        </div>
                                    )}
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Product:</span>
                                        <span className="fw-bold">{itemDetails.productName}</span>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Quantity:</span>
                                        <span className="fw-bold">{itemDetails.quantity}</span>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Price per item:</span>
                                        <span className="fw-bold">₱{itemDetails.price}</span>
                                    </div>
                                    <div className="d-flex justify-content-between mb-0">
                                        <span className="fw-bold">Total:</span>
                                        <span className="fw-bold text-primary">₱{itemDetails.total}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Information Alerts */}
                        <div className="alert alert-info">
                            <strong>Payment Method:</strong> Cash on Delivery (COD)
                        </div>
                        <div className="alert alert-warning">
                            <strong>Note:</strong> Items will be delivered inside Sorsogon State University – Bulan Campus
                        </div>
                    </div>
                    <div className="modal-footer border-black">
                        <button 
                            type="button" 
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-primary"
                            onClick={onConfirm}
                            disabled={loading || !isFormValid}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Placing Order...
                                </>
                            ) : (
                                'Place Order'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CheckoutModal;
