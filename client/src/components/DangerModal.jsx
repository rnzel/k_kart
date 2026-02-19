import React from "react";

function DangerModal ({ show, onHide, onConfirm, title, messsage }) {
    if (!show) return null;

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
                            <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={onHide} />
                        </div>
                        <div className="modal-body">
                            <p className="mb-0">{messsage}</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-primary" onClick={onConfirm}>
                                Confirm
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={onHide}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show" onClick={onHide} />
        </>
    )
}

export default DangerModal;