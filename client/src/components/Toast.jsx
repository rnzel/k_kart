import React, { useEffect } from "react";
import { FiCheck, FiX, FiInfo, FiAlertTriangle } from "react-icons/fi";

function Toast({ message, type = "success", show, onClose, duration = 3000 }) {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    if (!show) return null;

    const getIcon = () => {
        switch (type) {
            case "success":
                return <FiCheck size={20} />;
            case "error":
                return <FiX size={20} />;
            case "warning":
                return <FiAlertTriangle size={20} />;
            case "info":
            default:
                return <FiInfo size={20} />;
        }
    };

    const getTypeStyles = () => {
        switch (type) {
            case "success":
                return "bg-success text-white";
            case "error":
                return "bg-danger text-white";
            case "warning":
                return "bg-warning text-dark";
            case "info":
            default:
                return "bg-info text-white";
        }
    };

    return (
        <div 
            className="position-fixed top-0 end-0 m-3 d-flex align-items-center gap-2 px-3 py-2 rounded shadow-lg"
            style={{ 
                zIndex: 9999,
                animation: "fadeIn 0.3s ease-in-out",
                backgroundColor: type === "success" ? "#db4444" : type === "error" ? "#dc3545" : "#17a2b8",
                color: "white",
                maxWidth: "300px"
            }}
        >
            <span>{getIcon()}</span>
            <span className="flex-grow-1">{message}</span>
            <button 
                className="btn btn-sm p-0 border-0"
                style={{ background: "transparent", color: "white" }}
                onClick={onClose}
            >
                <FiX size={18} />
            </button>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

export default Toast;
