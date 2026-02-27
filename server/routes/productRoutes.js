const express = require("express")
const router = express.Router()
const { addProduct, getMyProducts, updateProduct, deleteProduct, getAllProducts } = require("../controllers/productController")
const { authenticateToken, requireSellerVerified } = require("../middleware/auth")
const { upload } = require("../config/multerStorage")

// Middleware to handle multer errors
const handleUpload = (fieldName, maxCount) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
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

// Route to get all products (public)
router.get("/", getAllProducts)

// Route to create a new product (verified sellers only)
router.post("/", authenticateToken, requireSellerVerified, handleUpload("productImages", 3), addProduct)

// Route to get all products for the authenticated seller (verified sellers only)
router.get("/my-products", authenticateToken, requireSellerVerified, getMyProducts)

// Route to update a product (verified sellers only)
router.put("/update-product/:id", authenticateToken, requireSellerVerified, handleUpload("productImages", 3), updateProduct)

// Route to delete a product (verified sellers only)
router.delete("/delete-product/:id", authenticateToken, requireSellerVerified, deleteProduct)

module.exports = router
