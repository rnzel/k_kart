import React from "react";
import { FiMapPin, FiMessageSquare } from "react-icons/fi";

function CheckoutModal({ 
    showModal, 
    onClose, 
    onConfirm, 
    pickupLocation, 
    note, 
    onPickupLocationChange, 
    onNoteChange,
    loading = false
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
                        ></button>
                    </div>
                    <div className="modal-body">
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
                            />
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
                            ></textarea>
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
                            disabled={loading}
                        >
                            {loading ? 'Placing order...' : 'Place Order'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CheckoutModal;