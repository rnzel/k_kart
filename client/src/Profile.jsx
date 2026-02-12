import react from 'react'
import Navbar from './components/Navbar.jsx'

function Profile() {

    return (
        <div>
            <Navbar />  
        
            <div className="container mt-4">
                <h1>User Profile</h1>

                <div className="alert alert-info d-flex align-items-center" role="alert"  style={{ marginTop: "20px" }} >

                    <i className="bi bi-info-circle me-2"></i>
                        
                    <p className="mb-0">This page is under construction.</p>
                </div>
            </div>
        </div>
    );
}   

export default Profile;