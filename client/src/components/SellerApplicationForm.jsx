import React from "react";
import { adminAPI } from "../utils/api.js";
import { FiShoppingBag, FiClock, FiCheck, FiX as FiXIcon } from "react-icons/fi";

function SellerApplicationForm({ show, onHide, onApplicationSubmitted }) {
    const [idImage, setIdImage] = React.useState(null);
    const [uploading, setUploading] = React.useState(false);
    const [applicationStatus, setApplicationStatus] = React.useState(null);
    const [user, setUser] = React.useState(null);
    const [idImageName, setIdImageName] = React.useState('ID Picture');

    React.useEffect(() => {
        fetchApplicationData();
    }, []);

    const fetchApplicationData = async () => {
        try {
            const response = await adminAPI.getMyApplication();
            const data = response.data;
            setUser(data);
            setApplicationStatus(data);
        } catch (err) {
            console.error("Error fetching application data:", err);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIdImageName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setIdImage(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setIdImageName('ID Picture');
            setIdImage(null);
        }
    };

    const handleSubmit = async () => {
        if (!idImage) {
            alert("Please upload an ID image");
            return;
        }

        try {
            setUploading(true);
            await adminAPI.applySeller(idImage);
            alert("Application submitted successfully!");
            onHide();
            setIdImage(null);
            fetchApplicationData();
            
            // Call optional callback
            if (onApplicationSubmitted) {
                onApplicationSubmitted();
            }
        } catch (err) {
            alert(err.response?.data?.message || "Error submitting application");
        } finally {
            setUploading(false);
        }
    };


    // Default: Show modal
    if (!show) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onHide();
        }
    };

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
                                <h5 className="modal-title">Apply to be a Seller</h5>
                                <p className="mb-0 small opacity-75">Upload your ID to verify you're an Entrepreneurship Student</p>
                            </div>
                            <button 
                                type="button" 
                                className="btn-close btn-close-white" 
                                aria-label="Close" 
                                onClick={onHide} 
                            />
                        </div>
                        <div className="modal-body p-4">
                            <div className="mb-3">
                                <input type="file" className="d-none" id="idImage" accept="image/*" onChange={handleFileChange}/>
                                <label htmlFor="idImage" className="form-control dashed-border" style={{ cursor: 'pointer' }}>{ idImageName }</label>
                            </div>
                            
                            {idImage && (
                                <div className="d-flex justify-content-center align-items-center mb-3">
                                    <img 
                                        src={idImage} 
                                        alt="ID Preview" 
                                        className="img-fluid rounded border border-black"
                                        style={{ 
                                            maxHeight: '300px', 
                                            objectFit: 'contain',
                                            maxWidth: '100%'
                                        }}
                                    />
                                </div>
                            )}

                            <div className="d-flex gap-2">
                                <button 
                                    className="btn btn-primary"
                                    style={{ width: "100%" }}
                                    onClick={handleSubmit}
                                    disabled={uploading}
                                >
                                    {uploading ? "Submitting..." : "Submit Application"}
                                </button>
                                <button 
                                    className="btn btn-secondary"
                                    style={{ width: "100%" }}
                                    onClick={() => {
                                        onHide();
                                        setIdImage(null);
                                        setIdImageName('ID Picture');
                                    }}
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show" onClick={onHide} />
        </>
    );
}

export default SellerApplicationForm;