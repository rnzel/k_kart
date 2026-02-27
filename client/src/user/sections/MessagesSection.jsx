import React from "react";

function MessagesSection() {
    return (
        <div className="container border border-black rounded p-4">
            <h2 className="text-primary">Messages</h2>
            <div
                className="alert alert-info d-flex align-items-center"
                role="alert"
                style={{ marginTop: "20px" }}
            >
                <i className="bi bi-info-circle me-2"></i>
                <p className="mb-0">This section is under construction.</p>
            </div>
        </div>
    );
}

export default MessagesSection;
