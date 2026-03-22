const express = require('express');
const router = express.Router();
const { searchSuggestions, searchProducts } = require('../controllers/searchController');

// Search suggestions endpoint (for autocomplete dropdown)
router.get('/suggestions', searchSuggestions);

// Main search results endpoint (for search results page)
router.get('/products', searchProducts);

module.exports = router;
