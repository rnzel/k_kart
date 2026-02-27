const express = require('express')
const router = express.Router()
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  removeMultipleItems
} = require('../controllers/cartController')
const { authenticateToken, requireBuyerOrVerifiedSeller } = require('../middleware/auth')

// All routes require authentication and must be buyer or verified seller (not admin)
router.use(authenticateToken)
router.use(requireBuyerOrVerifiedSeller)

// GET /api/cart - Get user's cart
router.get('/', getCart)

// POST /api/cart/add - Add item to cart
router.post('/add', addToCart)

// PUT /api/cart/update/:itemId - Update cart item quantity
router.put('/update/:itemId', updateCartItem)

// DELETE /api/cart/remove/:itemId - Remove single item from cart
router.delete('/remove/:itemId', removeFromCart)

// DELETE /api/cart/clear - Clear entire cart
router.delete('/clear', clearCart)

// DELETE /api/cart/remove-multiple - Remove multiple items from cart
router.delete('/remove-multiple', removeMultipleItems)

module.exports = router
