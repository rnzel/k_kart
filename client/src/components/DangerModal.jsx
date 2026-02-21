import React, { useState } from "react";

function DangerModal ({ show, onHide, onConfirm, title, messsage }) {
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
        <>
            <div
                className="modal fade show"
                style={{ display: "block" }}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
            >
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header bg-primary text-white">
                            <h5 className="modal-title">{title}</h5>
                            <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={onHide} disabled={loading} />
                        </div>
                        <div className="modal-body">
                            <p className="mb-0">{messsage}</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={loading}>
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Loading...
                                    </>
                                ) : (
                                    "Confirm"
                                )}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={onHide} disabled={loading}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show" onClick={loading ? undefined : onHide} />
        </>
    )
}

export default DangerModal;
