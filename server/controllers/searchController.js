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
    const sortParam = req.query.sort || 'relevance';

    if (!query || query.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchTerm = query.trim();
    const regex = { $regex: searchTerm, $options: 'i' };
    const regexOptions = { $options: 'i' };

    // Get active shop IDs
    const activeShops = await Shop.find({ 
      isDeleted: false
    }).select('_id').lean();
    const activeShopIds = activeShops.map(s => s._id);

    // Determine sort order based on sort parameter
    let sortOrder = {};
    switch (sortParam) {
      case 'latest':
        // Sort by newest first (createdAt descending)
        sortOrder = { createdAt: -1 };
        break;
      case 'price_asc':
        // Sort by price: low to high
        sortOrder = { productPrice: 1 };
        break;
      case 'price_desc':
        // Sort by price: high to low
        sortOrder = { productPrice: -1 };
        break;
      case 'relevance':
      default:
        // Relevance sorting: 
        // Exact matches in productName (starts with search term) first,
        // then partial matches in productName,
        // then matches in productDescription
        // Use aggregation to add a relevance score field
        const productsWithScore = await Product.aggregate([
          {
            $match: {
              isDeleted: false,
              shop: { $in: activeShopIds },
              $or: [
                { productName: regex },
                { productDescription: regex }
              ]
            }
          },
          {
            $addFields: {
              // Calculate relevance score: exact match in name = 3, partial in name = 2, match in description = 1
              nameMatchExact: {
                $cond: [
                  { $regexMatch: { input: '$productName', regex: `^${searchTerm}`, options: 'i' } },
                  1,
                  0
                ]
              },
              nameMatchPartial: {
                $cond: [
                  { $and: [
                    { $regexMatch: { input: '$productName', regex: searchTerm, options: 'i' } },
                    { $not: { $regexMatch: { input: '$productName', regex: `^${searchTerm}`, options: 'i' } } }
                  ]},
                  1,
                  0
                ]
              },
              descMatch: {
                $cond: [
                  { $and: [
                    { $regexMatch: { input: '$productDescription', regex: searchTerm, options: 'i' } },
                    { $not: { $regexMatch: { input: '$productName', regex: searchTerm, options: 'i' } } }
                  ]},
                  1,
                  0
                ]
              }
            }
          },
          {
            $addFields: {
              relevanceScore: {
                $add: [
                  { $multiply: ['$nameMatchExact', 100] },
                  { $multiply: ['$nameMatchPartial', 50] },
                  { $multiply: ['$descMatch', 10] }
                ]
              }
            }
          },
          { $sort: { relevanceScore: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: limit }
        ]);

        // Get total count for pagination (without skip/limit)
        const totalProducts = await Product.countDocuments({ 
          isDeleted: false,
          shop: { $in: activeShopIds },
          $or: [
            { productName: regex },
            { productDescription: regex }
          ]
        });

        const totalPages = Math.ceil(totalProducts / limit);

        // Populate shop data for the aggregated results
        const populatedProducts = await Product.populate(productsWithScore, {
          path: 'shop',
          select: 'shopName shopLogo shopDescription shopLocation shopContact isDeleted',
          match: { isDeleted: false }
        });

        // Filter out products with deleted shops
        const validProducts = populatedProducts.filter(product => product.shop);

        // Remove the temporary fields from response
        const cleanProducts = validProducts.map(product => ({
          _id: product._id,
          productName: product.productName,
          productDescription: product.productDescription,
          productPrice: product.productPrice,
          productStock: product.productStock,
          productImages: product.productImages,
          featuredImageIndex: product.featuredImageIndex,
          shop: product.shop,
          createdAt: product.createdAt
        }));

        return res.status(200).json({
          success: true,
          data: {
            products: cleanProducts,
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
    }

    // Get products that match the search term in name or description (for non-relevance sorts)
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
      .sort(sortOrder)
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
