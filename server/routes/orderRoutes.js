const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const orderController = require('../controllers/orderController');

// POST /api/orders/checkout - Create orders from cart
router.post('/checkout', auth.auth, orderController.createOrder);

// GET /api/orders/my-orders - Get buyer's orders
router.get('/my-orders', auth.auth, orderController.getMyOrders);

// GET /api/orders/seller-orders - Get seller's orders
router.get('/seller-orders', auth.auth, orderController.getSellerOrders);

// PATCH /api/orders/:id/status - Update order status (seller only)
router.patch('/:id/status', auth.auth, orderController.updateOrderStatus);

// PATCH /api/orders/:id/cancel - Cancel order (buyer only)
router.patch('/:id/cancel', auth.auth, orderController.cancelOrder);

module.exports = router;