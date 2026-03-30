const express = require("express")
const router = express.Router()
const { addProduct, getMyProducts, updateProduct, deleteProduct, getAllProducts, getProductById, getProductStock, getProductsByShopId } = require("../controllers/productController")
const { authenticateToken, requireSellerVerified } = require("../middleware/auth")
const { upload, handleMulterError } = require("../config/multerStorage")
const { validateProduct, handleValidationErrors, validateObjectId } = require('../middleware/inputValidation')
const PerformanceService = require('../services/performance')

// Middleware to handle multer errors
const handleUpload = (fieldName, maxCount) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        // Use the enhanced error handler
        return handleMulterError(err, req, res, next);
      }
      next()
    })
  }
}

// Route to get all products (public)
router.get("/", getAllProducts)

// Route to get all products for the authenticated seller (verified sellers only)
router.get("/my-products", authenticateToken, requireSellerVerified, getMyProducts)

// Route to get products by shop ID (public)
router.get("/shop/:shopId", validateObjectId('shopId'), handleValidationErrors, getProductsByShopId)

// Route to get a single product by ID (public)
router.get("/:id", validateObjectId('id'), handleValidationErrors, getProductById)

// Route to create a new product (verified sellers only)
router.post("/", 
  authenticateToken, 
  requireSellerVerified, 
  handleUpload("productImages", 3),
  validateProduct,
  handleValidationErrors,
  addProduct
)

// Route to update a product (verified sellers only)
router.put("/update-product/:id", 
  authenticateToken, 
  requireSellerVerified, 
  validateObjectId('id'),
  handleUpload("productImages", 3),
  validateProduct,
  handleValidationErrors,
  updateProduct
)

// Add multer error handling middleware after all routes
router.use(handleMulterError)

// Route to delete a product (verified sellers only)
router.delete("/delete-product/:id", authenticateToken, requireSellerVerified, validateObjectId('id'), handleValidationErrors, deleteProduct)

// Route to get product stock by ID (public)
router.get("/:id/stock", validateObjectId('id'), handleValidationErrors, getProductStock)

module.exports = router
