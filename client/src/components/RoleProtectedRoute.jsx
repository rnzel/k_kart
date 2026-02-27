import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

/**
 * RoleProtectedRoute - Role-based route protection component
 * 
 * Access Rules:
 * - Admin (role: "admin") → /admin only
 * - Seller (role: "seller") with approved status → /seller-dashboard
 * - All other authenticated users (buyers, pending sellers) → marketplace/dashboard
 */

function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation()
  
  // Initialize user synchronously to avoid white screen on first render
  const [user, setUser] = useState(() => {
    try {
      const userData = localStorage.getItem('user')
      return userData ? JSON.parse(userData) : null
    } catch {
      return null
    }
  })

  // Listen for storage changes (e.g., from other tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const userData = localStorage.getItem('user')
        setUser(userData ? JSON.parse(userData) : null)
      } catch {
        setUser(null)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/" replace />
  }

  // Check if user has admin role
  if (user.role === 'admin') {
    if (allowedRoles.includes('admin')) {
      return children
    }
    // Admins can only access admin routes
    return <Navigate to="/admin" replace />
  }

  // Check if user has seller role
  if (user.role === 'seller') {
    // For seller dashboard access, must be approved
    if (allowedRoles.includes('seller')) {
      if (user.sellerStatus === 'approved') {
        return children
      }
      // Not approved - redirect to marketplace
      return <Navigate to="/marketplace" replace />
    }
    
    // For marketplace/dashboard, approved sellers can access
    if (allowedRoles.includes('buyer') || allowedRoles.includes('seller')) {
      if (user.sellerStatus === 'approved') {
        return children
      }
      // Not approved seller - will fall through to marketplace
    }
  }

  // For marketplace/dashboard routes - allow buyers and any non-approved sellers
  if (allowedRoles.includes('buyer') || allowedRoles.includes('seller')) {
    // Allow access to marketplace for all authenticated users except admin
    return children
  }

  // Default redirect
  return <Navigate to="/marketplace" replace />
}

export default RoleProtectedRoute
