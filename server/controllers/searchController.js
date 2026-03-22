const Product = require('../models/Product');
const Shop = require('../models/Shop');

// Search suggestions endpoint
const searchSuggestions = async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query || query.trim().length < 1) {
      return res.status(200).json({
        success: true,
        data: {
          products: [],
          shops: [],
          categories: [],
          recentSearches: []
        }
      });
    }

    const searchTerm = query.trim();

    // Use MongoDB $regex for partial matching (.*term.*)
    // This allows searching "ball" to find "basketball", "ballpen", etc.
    const regex = { $regex: searchTerm, $options: 'i' };

    // Get active shop IDs
    const activeShops = await Shop.find({ 
      isDeleted: false
    }).select('_id').lean();
    
    const activeShopIds = activeShops.map(s => s._id);
    const activeShopIdSet = new Set(activeShops.map(s => s._id.toString()));

    // Get product suggestions - search both productName and productDescription
    const productResults = await Product.find({
      isDeleted: false,
      shop: { $in: activeShopIds },
      $or: [
        { productName: regex },
        { productDescription: regex }
      ]
    })
    .select('productName productPrice productImages featuredImageIndex shop')
    .populate({
      path: 'shop',
      select: 'shopName shopLogo',
      match: { isDeleted: false }
    })
    .limit(15)
    .lean();

    // Filter out products with deleted shops and format
    const products = productResults
      .filter(product => product.shop)
      .map(product => ({
        _id: product._id,
        productName: product.productName,
        productPrice: product.productPrice,
        productImages: product.productImages,
        featuredImageIndex: product.featuredImageIndex,
        shopId: product.shop._id,
        shopName: product.shop.shopName,
        shopLogo: product.shop.shopLogo
      }));

    // Get shop suggestions
    const shopResults = await Shop.find({
      isDeleted: false,
      shopName: regex
    })
    .select('shopName shopLogo _id')
    .limit(5)
    .lean();

    const shops = shopResults.map(shop => ({
      _id: shop._id,
      shopName: shop.shopName,
      shopLogo: shop.shopLogo
    }));

    // Get unique categories from matching products
    const categorySet = new Set();
    products.forEach(product => {
      if (product.productName) {
        // Extract potential category keywords from product names
        const words = product.productName.split(/\s+/);
        words.forEach(word => {
          if (word.toLowerCase().includes(searchTerm.toLowerCase()) && word.length > 2) {
            categorySet.add(word);
          }
        });
      }
    });
    const categories = Array.from(categorySet).slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        products,
        shops,
        categories,
        recentSearches: []
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform search. Please try again.'
    });
  }
};

// Main search results endpoint
const searchProducts = async (req, res) => {
  try {
    const { q: query } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchTerm = query.trim();
    const regex = { $regex: searchTerm, $options: 'i' };

    // Get active shop IDs
    const activeShops = await Shop.find({ 
      isDeleted: false
    }).select('_id').lean();
    const activeShopIds = activeShops.map(s => s._id);

    // Get products that match the search term in name or description
    const products = await Product.find({ 
      isDeleted: false,
      shop: { $in: activeShopIds },
      $or: [
        { productName: regex },
        { productDescription: regex }
      ]
    })
      .select('productName productDescription productPrice productStock productImages featuredImageIndex shop createdAt')
      .populate({
        path: 'shop',
        select: 'shopName shopLogo shopDescription shopLocation shopContact isDeleted',
        match: { isDeleted: false }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter out products with deleted shops
    const validProducts = products.filter(product => product.shop);

    // Get total count for pagination
    const totalProducts = await Product.countDocuments({ 
      isDeleted: false,
      shop: { $in: activeShopIds },
      $or: [
        { productName: regex },
        { productDescription: regex }
      ]
    });

    const totalPages = Math.ceil(totalProducts / limit);

    res.status(200).json({
      success: true,
      data: {
        products: validProducts,
        pagination: {
          total: totalProducts,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform search. Please try again.'
    });
  }
};

module.exports = { searchSuggestions, searchProducts };
