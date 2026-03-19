import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './custom-bootstrap.css'
import Auth from './Auth.jsx'
import Marketplace from './Marketplace.jsx'
import ShopPage from './ShopPage.jsx'
import ProductPage from './ProductPage.jsx'
import CheckoutPage from './CheckoutPage.jsx'
import SellerDashboard from './seller/SellerDashboard.jsx'
import UserDashboard from './user/UserDashboard.jsx'
import AdminDashboard from './admin/AdminDashboard.jsx'
import RoleProtectedRoute from './components/RoleProtectedRoute.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route - Login page */}
        <Route path="/" element={<Auth />} />
        
        {/* Marketplace - accessible to buyers and verified sellers only */}
        <Route path="/marketplace" element={
          <RoleProtectedRoute allowedRoles={['buyer', 'seller']}>
            <Marketplace />
          </RoleProtectedRoute>
        } />
 Dashboard - accessible        
        {/* User to buyers and verified sellers only */}
        <Route path="/dashboard" element={
          <RoleProtectedRoute allowedRoles={['buyer', 'seller']}>
            <UserDashboard />
          </RoleProtectedRoute>
        } />
        
        {/* Seller Dashboard - verified sellers ONLY */}
        <Route path="/seller-dashboard" element={
          <RoleProtectedRoute allowedRoles={['seller']}>
            <SellerDashboard />
          </RoleProtectedRoute>
        } />
        
        {/* Admin Dashboard - admin ONLY */}
        <Route path="/admin" element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </RoleProtectedRoute>
        } />

        {/* Shop Page - accessible to buyers and verified sellers only */}
        <Route path="/shop/:shopId" element={
          <RoleProtectedRoute allowedRoles={['buyer', 'seller']}>
            <ShopPage />
          </RoleProtectedRoute>
        } />

        {/* Product Page - accessible to buyers and verified sellers only */}
        <Route path="/product/:productId" element={
          <RoleProtectedRoute allowedRoles={['buyer', 'seller']}>
            <ProductPage />
          </RoleProtectedRoute>
        } />

        {/* Checkout Page - accessible to buyers and verified sellers only */}
        <Route path="/checkout" element={
          <RoleProtectedRoute allowedRoles={['buyer', 'seller']}>
            <CheckoutPage />
          </RoleProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
