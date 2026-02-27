const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

// Get all users with pagination (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const skip = (page - 1) * limit

        const [users, total] = await Promise.all([
            User.find()
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments()
        ])

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
        const { status } = req.body // 'approved' or 'rejected'
        const user = await User.findById(req.params.id)
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        
        if (status === 'approved') {
            user.role = 'seller'
            user.sellerStatus = 'approved'
            user.isVerified = true // Auto-verify when approved
        } else if (status === 'rejected') {
            user.sellerStatus = 'rejected'
        }
        
        await user.save()
        
        res.json({ message: `Application ${status} successfully`, user })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// Get current user application status
router.get('/my-application', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('sellerStatus applicationDate idImage studentIdPicture')
        res.json(user)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

module.exports = router
