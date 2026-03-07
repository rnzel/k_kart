const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
const cartController = require('../controllers/cartController');

// GET /api/cart - Get user's cart
router.get('/', auth.auth, cartController.getCart);

// POST /api/cart/add - Add item to cart
router.post('/add', auth.auth, validation.validateCartItem, cartController.addToCart);

// PATCH /api/cart/update/:itemId - Update cart item quantity
router.patch('/update/:itemId', auth.auth, validation.validateCartItem, cartController.updateCartItem);

// DELETE /api/cart/remove/:itemId - Remove item from cart
router.delete('/remove/:itemId', auth.auth, cartController.removeFromCart);

// DELETE /api/cart/clear - Clear entire cart
router.delete('/clear', auth.auth, cartController.clearCart);

// POST /api/cart/remove-multiple - Remove multiple items from cart
router.post('/remove-multiple', auth.auth, cartController.removeMultipleItems);

module.exports = router;