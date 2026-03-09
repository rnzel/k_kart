import React, { useState } from "react";

function DangerModal ({ show, onHide, onConfirm, title, message }) {
    const [loading, setLoading] = useState(false);

    if (!show) return null;

    const handleConfirm = async () => {
        try {
            setLoading(true);
            await onConfirm();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-black">
                    <div className="modal-header border-black">
                        <h5 className="modal-title text-primary">{title}</h5>
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={onHide}
                            disabled={loading}
                        ></button>
                    </div>
                    <div className="modal-body">
                        <p className="mb-0">{message}</p>
                    </div>
                    <div className="d-flex gap-2 p-3">
                        <button 
                            type="button" 
                            style={{ width: "100%" }}
                            className="btn btn-primary"
                            onClick={handleConfirm}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Loading...
                                </>
                            ) : (
                                'Confirm'
                            )}
                        </button>
                        <button 
                            type="button" 
                            style={{ width: "100%" }}
                            className="btn btn-secondary"
                            onClick={onHide}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DangerModal;
