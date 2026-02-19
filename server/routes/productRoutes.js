const express = require("express");
const router = express.Router();
const { addProduct, getMyProducts, updateProduct, deleteProduct } = require("../controllers/productController");
const authenticateToken = require("../middleware/auth");

// Wrapper to handle the upload and call the controller
const handleProductUpload = (fieldName, maxCount) => {
    return (req, res, next) => {
        try {
            const upload = global.getProductUpload()
            const uploadMiddleware = upload.array(fieldName, maxCount)
            
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
};

// Route to create a new product for the authenticated seller's shop
router.post("/", authenticateToken, handleProductUpload("productImages", 3), addProduct);

// Route to get all products for the authenticated seller's shop
router.get("/my-products", authenticateToken, getMyProducts);

// Route to update a product
router.put("/update-product/:id", authenticateToken, handleProductUpload("productImages", 3), updateProduct);

// Route to delete a product
router.delete("/delete-product/:id", authenticateToken, deleteProduct);

module.exports = router;
