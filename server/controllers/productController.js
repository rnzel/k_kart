const mongoose = require('mongoose');
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const { getGridFSBucket } = require("../config/gridfsBucket");

// Helper function to delete file from GridFS by filename
const deleteFileFromGridFS = async (filename) => {
  try {
    const bucket = getGridFSBucket();
    const db = mongoose.connection.db;
    const filesCollection = db.collection('uploads.files');
    
    const file = await filesCollection.findOne({ filename });
    if (file) {
      await bucket.delete(file._id);
      console.log(`Deleted file: ${filename}`);
    }
  } catch (err) {
    console.error('Error deleting file from GridFS:', err);
  }
};

// Update product details
const updateProduct = async (req, res) => {
  try {
    const owner = req.user?.userId;
    const { id } = req.params;

    if (!owner) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized" 
      });
    }

    const shop = await Shop.findOne({ owner });
    if (!shop) {
      return res.status(404).json({ 
        success: false,
        message: "Shop not found" 
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found" 
      });
    }

    if (product.shop.toString() !== shop._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "Not authorized to update this product" 
      });
    }

    const { productName, productDescription, productPrice, productStock, featuredImageIndex } = req.body;

    // Validate and update product name
    if (productName !== undefined) {
      const trimmedName = productName.trim();
      if (!trimmedName) {
        return res.status(400).json({ 
          success: false,
          message: "Product name cannot be empty",
          errors: [{ field: 'productName', message: 'Product name is required' }]
        });
      }
      if (trimmedName.length < 2 || trimmedName.length > 50) {
        return res.status(400).json({ 
          success: false,
          message: "Product name must be between 2 and 50 characters",
          errors: [{ field: 'productName', message: 'Product name must be between 2 and 50 characters' }]
        });
      }
      product.productName = trimmedName;
    }

    // Update product description
    if (productDescription !== undefined) {
      const trimmedDesc = productDescription.trim();
      if (trimmedDesc.length > 500) {
        return res.status(400).json({ 
          success: false,
          message: "Product description cannot exceed 500 characters",
          errors: [{ field: 'productDescription', message: 'Description too long' }]
        });
      }
      product.productDescription = trimmedDesc;
    }

    // Validate and update product price
    if (productPrice !== undefined) {
      const price = Number(productPrice);
      if (Number.isNaN(price)) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid product price",
          errors: [{ field: 'productPrice', message: 'Price must be a valid number' }]
        });
      }
      if (price < 0) {
        return res.status(400).json({ 
          success: false,
          message: "Product price cannot be negative",
          errors: [{ field: 'productPrice', message: 'Price cannot be negative' }]
        });
      }
      if (price > 999999) {
        return res.status(400).json({ 
          success: false,
          message: "Product price cannot exceed 999,999",
          errors: [{ field: 'productPrice', message: 'Price too high' }]
        });
      }
      product.productPrice = price;
    }

    // Validate and update product stock
    if (productStock !== undefined) {
      const stock = Number(productStock);
      if (Number.isNaN(stock)) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid product stock",
          errors: [{ field: 'productStock', message: 'Stock must be a valid number' }]
        });
      }
      if (stock < 0) {
        return res.status(400).json({ 
          success: false,
          message: "Product stock cannot be negative",
          errors: [{ field: 'productStock', message: 'Stock cannot be negative' }]
        });
      }
      if (stock > 999999) {
        return res.status(400).json({ 
          success: false,
          message: "Product stock cannot exceed 999,999",
          errors: [{ field: 'productStock', message: 'Stock too high' }]
        });
      }
      product.productStock = stock;
    }

    // ===== IMAGE HANDLING: Preserve existing images, add new ones, enforce 3-image limit =====
    const files = Array.isArray(req.files) ? req.files : [];
    const newImageFilenames = files.length > 0 ? files.map((file) => file.filename) : [];
    
    // Get current images or empty array
    const currentImages = product.productImages && Array.isArray(product.productImages) 
      ? [...product.productImages] 
      : [];

    // Parse keepImages directive from form data
    let keepImages = currentImages; // Default to keeping all current images
    if (req.body.keepImages !== undefined) {
      try {
        const parsedKeepImages = Array.isArray(req.body.keepImages)
          ? req.body.keepImages
          : JSON.parse(req.body.keepImages);
        if (Array.isArray(parsedKeepImages)) {
          keepImages = parsedKeepImages.filter((filename) => currentImages.includes(filename));
        }
      } catch (err) {
        // If parsing fails, keep all current images
        console.warn('Failed to parse keepImages, keeping all current images:', err);
      }
    }

    // Calculate how many new images we can add (max 3 total)
    const availableSlots = Math.max(0, 3 - keepImages.length);
    const newImagesToAdd = newImageFilenames.slice(0, availableSlots);

    // Determine which images to delete from GridFS
    const finalImageList = [...keepImages, ...newImagesToAdd];
    const imagesToDelete = currentImages.filter((filename) => !finalImageList.includes(filename));

    // Update product images
    product.productImages = finalImageList;

    // Validate and update featured image index
    let newFeaturedIndex = product.featuredImageIndex || 0;
    if (featuredImageIndex !== undefined) {
      const newIndex = Number(featuredImageIndex);
      if (Number.isNaN(newIndex)) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid featured image index",
          errors: [{ field: 'featuredImageIndex', message: 'Featured image index must be a valid number' }]
        });
      }
      if (newIndex >= 0 && newIndex < product.productImages.length) {
        newFeaturedIndex = newIndex;
      } else if (product.productImages.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: "Featured image index is out of range",
          errors: [{ field: 'featuredImageIndex', message: 'Index must be between 0 and ' + (product.productImages.length - 1) }]
        });
      }
    }
    
    // Ensure featuredImageIndex stays valid
    if (product.productImages.length === 0) {
      newFeaturedIndex = 0;
    }
    
    product.featuredImageIndex = newFeaturedIndex;

    // Save product FIRST to ensure data is persisted before deleting old images
    // This prevents data loss if save fails
    const updatedProduct = await product.save();

    // Delete old images from GridFS AFTER successful save
    // This prevents losing images if save fails
    for (const filename of imagesToDelete) {
      await deleteFileFromGridFS(filename);
    }

    res.status(200).json({
      success: true,
      data: updatedProduct,
      message: "Product updated successfully"
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update product. Please try again.",
      errors: [{ field: 'server', message: 'Internal server error' }]
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const owner = req.user?.userId;
    const { id } = req.params;

    if (!owner) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized" 
      });
    }

    const shop = await Shop.findOne({ owner });
    if (!shop) {
      return res.status(404).json({ 
        success: false,
        message: "Shop not found" 
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found" 
      });
    }

    if (product.shop.toString() !== shop._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "Not authorized to delete this product" 
      });
    }

    if (product.productImages && product.productImages.length > 0) {
      for (const filename of product.productImages) {
        await deleteFileFromGridFS(filename);
      }
    }

    await Product.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete product. Please try again." 
    });
  }
};

// Create a new product for the current seller's shop
const addProduct = async (req, res) => {
  try {
    const owner = req.user?.userId;

    if (!owner) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized" 
      });
    }
    
    const { productName, productDescription, productPrice, productStock, featuredImageIndex } = req.body;
    const files = Array.isArray(req.files) ? req.files : [];
    const imageFilenames = files.slice(0, 3).map((file) => file.filename);

    // Validate product name
    const trimmedName = productName ? productName.trim() : '';
    if (!trimmedName) {
      return res.status(400).json({ 
        success: false,
        message: "Product name is required",
        errors: [{ field: 'productName', message: 'Product name is required' }]
      });
    }
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return res.status(400).json({ 
        success: false,
        message: "Product name must be between 2 and 50 characters",
        errors: [{ field: 'productName', message: 'Product name must be between 2 and 50 characters' }]
      });
    }

    // Validate product price
    const priceNum = Number(productPrice);
    if (Number.isNaN(priceNum)) {
      return res.status(400).json({ 
        success: false,
        message: "Product price is required and must be a valid number",
        errors: [{ field: 'productPrice', message: 'Product price is required' }]
      });
    }
    if (priceNum < 0) {
      return res.status(400).json({ 
        success: false,
        message: "Product price cannot be negative",
        errors: [{ field: 'productPrice', message: 'Price cannot be negative' }]
      });
    }
    if (priceNum > 999999) {
      return res.status(400).json({ 
        success: false,
        message: "Product price cannot exceed 999,999",
        errors: [{ field: 'productPrice', message: 'Price too high' }]
      });
    }

    // Validate product stock
    const stockNum = productStock !== undefined ? Number(productStock) : 0;
    if (Number.isNaN(stockNum)) {
      return res.status(400).json({ 
        success: false,
        message: "Product stock must be a valid number",
        errors: [{ field: 'productStock', message: 'Stock must be a valid number' }]
      });
    }
    if (stockNum < 0) {
      return res.status(400).json({ 
        success: false,
        message: "Product stock cannot be negative",
        errors: [{ field: 'productStock', message: 'Stock cannot be negative' }]
      });
    }
    if (stockNum > 999999) {
      return res.status(400).json({ 
        success: false,
        message: "Product stock cannot exceed 999,999",
        errors: [{ field: 'productStock', message: 'Stock too high' }]
      });
    }

    // Validate featured image index
    const featuredIndex = featuredImageIndex !== undefined ? Number(featuredImageIndex) : 0;
    if (Number.isNaN(featuredIndex)) {
      return res.status(400).json({ 
        success: false,
        message: "Featured image index must be a valid number",
        errors: [{ field: 'featuredImageIndex', message: 'Featured image index must be a valid number' }]
      });
    }

    const shop = await Shop.findOne({ owner });
    if (!shop) {
      return res.status(404).json({ 
        success: false,
        message: "Shop not found" 
      });
    }

    const newProduct = new Product({
      productName: trimmedName,
      productDescription: productDescription ? productDescription.trim() : "",
      productPrice: priceNum,
      productStock: stockNum,
      productImages: imageFilenames,
      featuredImageIndex: featuredIndex,
      shop: shop._id,
    });

    const savedProduct = await newProduct.save();
    res.status(201).json({
      success: true,
      data: savedProduct,
      message: "Product created successfully"
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      success: false,
      message: "Failed to create product. Please try again.",
      errors: [{ field: 'server', message: 'Internal server error' }]
    });
  }
};

// Get all products for the current seller's shop
const getMyProducts = async (req, res) => {
  try {
    const owner = req.user?.userId;

    if (!owner) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized" 
      });
    }

    const shop = await Shop.findOne({ owner });
    if (!shop) {
      return res.status(404).json({ 
        success: false,
        message: "Shop not found" 
      });
    }

    const products = await Product.find({ shop: shop._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: products,
      message: "Products retrieved successfully"
    });
  } catch (error) {
    console.error('Error getting my products:', error);
    res.status(500).json({ 
      success: false,
      message: "Failed to retrieve products. Please try again." 
    });
  }
};

// Get all products (public) with pagination
const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Get all shop IDs that exist and are not deleted
    const activeShops = await Shop.find({ 
      $or: [
        { isDeleted: false },
        { isDeleted: { $exists: false } }
      ]
    }).select('_id').lean();
    const activeShopIds = activeShops.map(s => s._id);

    // Get products that have active shops
    const products = await Product.find({ 
      isDeleted: false,
      shop: { $in: activeShopIds }
    })
      .select('productName productDescription productPrice productStock productImages featuredImageIndex shop createdAt')
      .populate({
        path: 'shop',
        select: 'shopName shopLogo shopDescription',
        match: { 
          $or: [
            { isDeleted: false },
            { isDeleted: { $exists: false } }
          ]
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter out products with deleted shops or no shop
    const validProducts = products.filter(product => product.shop);

    // Get the actual count of products that would be returned
    const validProductsCount = await Product.countDocuments({ 
      isDeleted: false,
      shop: { $in: activeShopIds }
    });

    res.status(200).json({
      success: true,
      data: validProducts,
      pagination: {
        total: validProductsCount,
        page,
        limit,
        totalPages: Math.ceil(validProductsCount / limit)
      },
      message: "Products retrieved successfully"
    });
  } catch (error) {
    console.error('Error in getAllProducts:', error);
    res.status(500).json({ 
      success: false,
      message: "Failed to retrieve products. Please try again.",
      errors: [{ field: 'server', message: 'Internal server error' }]
    });
  } 
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate('shop', 'shopName shopLogo shopDescription shopLocation shopContact isDeleted');

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }

    if (product.isDeleted) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get product. Please try again.',
      errors: [{ field: 'server', message: 'Internal server error' }]
    });
  }
};

// Get product stock by ID
const getProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }

    if (product.isDeleted) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }

    res.status(200).json({
      success: true,
      stock: product.productStock,
      productName: product.productName
    });
  } catch (error) {
    console.error('Error getting product stock:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get product stock. Please try again.',
      errors: [{ field: 'server', message: 'Internal server error' }]
    });
  }
};

// Get products by shop ID (public)
const getProductsByShopId = async (req, res) => {
  try {
    const { shopId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Validate shop ID format
    if (!shopId || !mongoose.Types.ObjectId.isValid(shopId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid shop ID format',
        errors: [{ field: 'shopId', message: 'Invalid shop ID format' }]
      });
    }

    // Check if shop exists and is not deleted
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ 
        success: false,
        message: 'Shop not found' 
      });
    }

    if (shop.isDeleted) {
      return res.status(404).json({ 
        success: false,
        message: 'Shop not found' 
      });
    }

    // Get products for this shop
    const products = await Product.find({ 
      shop: shopId,
      isDeleted: false
    })
      .select('productName productDescription productPrice productStock productImages featuredImageIndex shop createdAt')
      .populate({
        path: 'shop',
        select: 'shopName shopLogo shopDescription',
        match: { 
          $or: [
            { isDeleted: false },
            { isDeleted: { $exists: false } }
          ]
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter out products with deleted shops (shouldn't happen with the query above, but just in case)
    const validProducts = products.filter(product => product.shop);

    // Get the actual count of products that would be returned
    const validProductsCount = await Product.countDocuments({ 
      shop: shopId,
      isDeleted: false
    });

    res.status(200).json({
      success: true,
      data: validProducts,
      pagination: {
        total: validProductsCount,
        page,
        limit,
        totalPages: Math.ceil(validProductsCount / limit)
      },
      message: "Products retrieved successfully"
    });
  } catch (error) {
    console.error('Error getting products by shop ID:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve products. Please try again.',
      errors: [{ field: 'server', message: 'Internal server error' }]
    });
  }
};

module.exports = { addProduct, getMyProducts, updateProduct, deleteProduct, getAllProducts, getProductStock, getProductById, getProductsByShopId };
