const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Shop = require('../models/Shop')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

// Get all users with pagination (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role, search } = req.query
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const skip = (page - 1) * limit
        
        let query = {}
        
        // Filter by role if provided
        if (role) {
            query.role = role
        }
        
        // Filter by search term if provided
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i')
            query.$or = [
                { firstName: { $regex: searchRegex } },
                { lastName: { $regex: searchRegex } },
                { email: { $regex: searchRegex } }
            ]
            
            // For sellers, also search shop names
            if (role === 'seller' || !role) {
                const matchingShops = await Shop.find({ 
                    shopName: { $regex: searchRegex } 
                }).select('owner')
                
                if (matchingShops.length > 0) {
                    const shopOwnerIds = matchingShops.map(shop => shop.owner)
                    query.$or.push({ _id: { $in: shopOwnerIds } })
                }
            }
        }
        
        // Get total count for pagination
        const total = await User.countDocuments(query)
        
        // Get users with pagination
        let users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
        
        // For sellers, fetch their shop names
        if (users.length > 0) {
            try {
                const sellerIds = users
                    .filter(user => user.role === 'seller')
                    .map(user => user._id)
                
                if (sellerIds.length > 0) {
                    const shops = await Shop.find({ owner: { $in: sellerIds } })
                        .select('owner shopName')
                    
                    const shopMap = new Map()
                    shops.forEach(shop => {
                        shopMap.set(shop.owner.toString(), shop.shopName)
                    })
                    
                    // Convert users to plain objects and add shop names
                    users = users.map(user => {
                        const userObj = user.toObject()
                        if (user.role === 'seller' && shopMap.has(user._id.toString())) {
                            userObj.shopName = shopMap.get(user._id.toString())
                        }
                        return userObj
                    })
                }
            } catch (shopError) {
                console.error('Error fetching shop names:', shopError)
                // Continue without shop names if there's an error
            }
        }

        res.json({
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        })
    } catch (err) {
        console.error('Error fetching users:', err)
        res.status(500).json({ message: err.message })
    }
})

// Delete user (admin only)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        
        // Prevent admin from deleting themselves
        if (user._id.toString() === req.user.userId.toString()) {
            return res.status(400).json({ message: 'You cannot delete your own account' })
        }
        
        await User.findByIdAndDelete(req.params.id)
        
        res.json({ message: 'User deleted successfully' })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// Get all seller applications - filter by status (admin only)
router.get('/seller-applications', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.query
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const skip = (page - 1) * limit
        
        let query = {}
        
        // Filter by status if provided, otherwise get all non-null (pending/approved/rejected)
        if (status) {
            query.sellerStatus = status
        } else {
            query.sellerStatus = { $in: ['pending', 'approved', 'rejected'] }
        }
        
        const [applications, total] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort({ applicationDate: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(query)
        ])

        res.json({
            applications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// Approve or reject seller application (admin only)
router.patch('/seller-applications/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status, rejectionReason, rejectionNote } = req.body
        
        // Validate status parameter
        if (!status || (status !== 'approved' && status !== 'rejected')) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid status. Must be "approved" or "rejected"' 
            })
        }
        
        const user = await User.findById(req.params.id)
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            })
        }
        
        // Update user based on status
        if (status === 'approved') {
            user.role = 'seller'
            user.sellerStatus = 'approved'
            user.isVerified = true
            // Clear rejection fields when approving
            user.rejectionReason = undefined
            user.rejectionNote = undefined
        } else if (status === 'rejected') {
            user.sellerStatus = 'rejected'
            user.rejectionReason = rejectionReason || undefined
            user.rejectionNote = rejectionNote || undefined
        }
        
        await user.save()
        
        // Return success response with updated user data
        res.json({ 
            success: true,
            message: `Application ${status} successfully`,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                sellerStatus: user.sellerStatus,
                isVerified: user.isVerified,
                applicationDate: user.applicationDate,
                rejectionReason: user.rejectionReason,
                rejectionNote: user.rejectionNote
            }
        })
    } catch (err) {
        console.error('Error updating seller application:', err)
        res.status(500).json({ 
            success: false,
            message: 'Failed to update application status',
            error: err.message 
        })
    }
})

// Get current user application status
router.get('/my-application', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('sellerStatus applicationDate idImage studentIdPicture rejectionReason rejectionNote')
        res.json(user)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// Apply to become a seller
router.post('/apply-seller', authenticateToken, async (req, res) => {
    try {
        const { idImage } = req.body
        
        // Validate image data
        if (!idImage) {
            return res.status(400).json({ 
                success: false,
                message: 'ID image is required' 
            })
        }
        
        const user = await User.findById(req.user.userId)
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            })
        }
        
        // Check if user is already a seller
        if (user.role === 'seller') {
            return res.status(400).json({ 
                success: false,
                message: 'You are already a seller' 
            })
        }
        
        // Update user with application data
        user.sellerStatus = 'pending'
        user.idImage = idImage
        user.applicationDate = new Date()
        
        await user.save()
        
        res.json({ 
            success: true,
            message: 'Seller application submitted successfully',
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                sellerStatus: user.sellerStatus,
                applicationDate: user.applicationDate
            }
        })
    } catch (err) {
        console.error('Error submitting seller application:', err)
        res.status(500).json({ 
            success: false,
            message: 'Failed to submit application',
            error: err.message 
        })
    }
})

module.exports = router
