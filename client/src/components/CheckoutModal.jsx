import React from "react";
import { FiMapPin, FiMessageSquare, FiAlertCircle } from "react-icons/fi";

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
    error = null
}) {
    if (!showModal) {
        return null;
    }

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
                        {error && (
                            <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                                <FiAlertCircle className="me-2" />
                                <div>{error}</div>
                            </div>
                        )}
                        
                        <div className="mb-3">
                            <label className="form-label fw-bold"> 
                                <FiMapPin className="me-2" />
                                Pickup Location
                                <span className="text-primary"> *</span>
                            </label>
                            <input 
                                type="text" 
                                className="form-control"
                                value={pickupLocation}
                                onChange={(e) => onPickupLocationChange(e.target.value)}
                                placeholder="Enter specific location inside SorSU – Bulan Campus"
                                required
                                disabled={loading}
                            />
                            <div className="form-text">Please enter a specific location inside SorSU – Bulan Campus for pickup</div>
                        </div>
                        <div className="mb-3">
                            <label className="form-label fw-bold">
                                <FiMessageSquare className="me-2" />
                                Contact Number
                                <span className="text-primary"> *</span>
                            </label>
                            <input 
                                type="tel" 
                                className="form-control"
                                value={contactNumber}
                                onChange={(e) => onContactNumberChange(e.target.value)}
                                placeholder="09XXXXXXXXX"
                                pattern="[0-9]{10}"
                                maxLength="10"
                                required
                                disabled={loading}
                            />
                            <div className="form-text">Enter your 10-digit mobile number (e.g., 09123456789)</div>
                        </div>
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
                                disabled={loading}
                            ></textarea>
                            <div className="form-text">Add any special instructions for delivery (optional)</div>
                        </div>
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
                            disabled={loading || !pickupLocation.trim() || !contactNumber.trim() || !/^[0-9]{10}$/.test(contactNumber)}
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
