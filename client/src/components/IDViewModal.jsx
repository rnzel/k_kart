import React from "react";
import { getImageUrl } from "../utils/imageUrl.js";

function IDViewModal({ show, onHide, application }) {
    if (!show || !application) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onHide();
        }
    };

    // Get the image data from either field
    const imageData = application.idImage || application.studentIdPicture;
    
    // Check if we have valid image data
    const hasValidImage = imageData && typeof imageData === 'string' && imageData.trim().length > 0;

    return (
        <>
            <div
                className="modal fade show"
                style={{ display: "block" }}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                onClick={handleBackdropClick}
            >
                <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
                    <div className="modal-content">
                        <div className="modal-header bg-primary text-white">
                            <div>
                                <h5 className="modal-title">{application.firstName} {application.lastName}</h5>
                                <p className="mb-0 small opacity-75">{application.email}</p>
                            </div>
                            <button 
                                type="button" 
                                className="btn-close btn-close-white" 
                                aria-label="Close" 
                                onClick={onHide} 
                            />
                        </div>
                        <div className="modal-body p-4">
                            <div className="text-center">
                                <h6 className="mb-3">Student ID Photo</h6>
                                {hasValidImage ? (
                                    <img 
                                        src={getImageUrl(imageData)} 
                                        alt="Student ID" 
                                        className="img-fluid rounded border border-black mb-3"
                                        style={{ 
                                            maxHeight: '60vh', 
                                            objectFit: 'contain',
                                            border: '2px solid #dee2e6'
                                        }}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            const fallback = document.createElement('div');
                                            fallback.className = 'text-muted text-center py-5';
                                            fallback.innerHTML = '<i class="bi bi-exclamation-triangle fs-1 mb-3"></i><br><span>Image could not be loaded</span>';
                                            e.target.parentNode.appendChild(fallback);
                                        }}
                                    />
                                ) : (
                                    <div className="text-muted text-center py-5">
                                        <i className="bi bi-exclamation-triangle fs-1 mb-3"></i>
                                        <br />
                                        <span>No ID image available</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show" onClick={onHide} />
        </>
    );
}

export default IDViewModal;
