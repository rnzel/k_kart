const express = require('express')
const multer = require('multer')
const router = express.Router()
const { createShop, getMyShop, updateShop, deleteShop } = require('../controllers/shopController')
const authenticateToken = require('../middleware/auth')

// Multer setup for handling multipart/form-data (for image uploads)
const storage = multer.diskStorage({ 
    destination: (req, file, cb) => { cb(null, 'uploads/') },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname) }
})
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true)
    } else {
        cb(new Error('Only image files are allowed'), false)
    }
}

const upload = multer({ storage, fileFilter })

// Route to create a new shop
router.post('/', authenticateToken, upload.single('shopImage'), createShop)

// Route to get current user's shop
router.get('/my-shop', authenticateToken, getMyShop)

// Route to update shop details (including optional image update)
router.put('/update/:id', authenticateToken, upload.single('shopImage'), updateShop)

// Route to delete current user's shop
router.delete('/', authenticateToken, deleteShop)

module.exports = router;

