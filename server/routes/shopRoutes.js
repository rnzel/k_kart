const express = require('express')
const router = express.Router()
const { createShop, getMyShop, updateShop, deleteShop } = require('../controllers/shopController')
const authenticateToken = require('../middleware/auth')

// Wrapper to handle the upload and call the controller
const handleShopUpload = (fieldName) => {
    return (req, res, next) => {
        try {
            const upload = global.getShopUpload()
            const uploadMiddleware = upload.single(fieldName)
            
            uploadMiddleware(req, res, (err) => {
                if (err) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return res.status(400).json({ message: 'File size exceeds 5MB limit' })
                    }
                    if (err.message === 'Only image files are allowed!') {
                        return res.status(400).json({ message: err.message })
                    }
                    return res.status(400).json({ message: err.message })
                }
                next()
            })
        } catch (err) {
            return res.status(500).json({ message: 'Upload not initialized. Please try again.' })
        }
    }
}

// Route to create a new shop
router.post('/', authenticateToken, handleShopUpload('shopLogo'), createShop)

// Route to get current user's shop
router.get('/my-shop', authenticateToken, getMyShop)

// Route to update shop details
router.put('/update-shop/:id', authenticateToken, handleShopUpload('shopLogo'), updateShop)

// Route to delete current user's shop
router.delete('/delete-shop', authenticateToken, deleteShop)

module.exports = router;
