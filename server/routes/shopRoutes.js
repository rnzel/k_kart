const express = require('express')
const router = express.Router()
const { createShop, getMyShop, getAllShops, updateShop, deleteShop } = require('../controllers/shopController')
const { authenticateToken, requireSellerVerified } = require('../middleware/auth')
const { upload } = require('../config/multerStorage')

// Middleware to handle multer errors
const handleUpload = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
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
  }
}

// Route to get all shops (public - accessible to everyone)
router.get('/', getAllShops)

// Route to create a new shop (verified sellers only)
router.post('/', authenticateToken, requireSellerVerified, handleUpload('shopLogo'), createShop)

// Route to get current user's shop (verified sellers only)
router.get('/my-shop', authenticateToken, requireSellerVerified, getMyShop)

// Route to update shop details (verified sellers only)
router.put('/update-shop', authenticateToken, requireSellerVerified, handleUpload('shopLogo'), updateShop)

// Route to delete current user's shop (verified sellers only)
router.delete('/delete-shop', authenticateToken, requireSellerVerified, deleteShop)

module.exports = router
