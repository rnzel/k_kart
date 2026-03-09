import React from "react";
import { FiCheckCircle, FiX } from "react-icons/fi";

function SuccessModal({ 
    showModal, 
    onClose, 
    title = "Success",
    message = "Operation completed successfully",
    buttonText = "Close",
    onButtonClick,
    showCloseButton = true,
    loading = false
}) {
    if (!showModal) {
        return null;
    }

    const handleButtonClick = () => {
        if (onButtonClick) {
            onButtonClick();
        } else {
            onClose();
        }
    };

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-black">
                    <div className="modal-header border-black">
                        <h5 className="modal-title text-primary d-flex align-items-center">
                            {title}
                        </h5>
                        {showCloseButton && (
                            <button 
                                type="button" 
                                className="btn-close" 
                                onClick={onClose}
                                disabled={loading}
                            ></button>
                        )}
                    </div>
                    <div className="modal-body text-center">
                        <div className="mb-3">
                            <FiCheckCircle className="text-success " style={{ fontSize: '3rem' }} />
                        </div>
                        <p className="mb-0">{message}</p>
                    </div>
                    <div className="p-3">
                        <button 
                            type="button" 
                            className="btn btn-primary"
                            style={{ width: "100%" }}
                            onClick={handleButtonClick}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Processing...
                                </>
                            ) : (
                                buttonText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SuccessModal;