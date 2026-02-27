const express = require('express')
const router = express.Router()
const { createShop, getMyShop, getAllShops, updateShop, deleteShop } = require('../controllers/shopController')
const authenticateToken = require('../middleware/auth')
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

// Route to get all shops (public)
router.get('/', getAllShops)

// Route to create a new shop
router.post('/', authenticateToken, handleUpload('shopLogo'), createShop)

// Route to get current user's shop
router.get('/my-shop', authenticateToken, getMyShop)

// Route to update shop details (ID parameter removed - uses JWT owner instead)
router.put('/update-shop', authenticateToken, handleUpload('shopLogo'), updateShop)

// Route to delete current user's shop
router.delete('/delete-shop', authenticateToken, deleteShop)

module.exports = router
