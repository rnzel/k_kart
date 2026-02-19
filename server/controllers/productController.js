const Product = require("../models/Product");
const Shop = require("../models/Shop");
const { getGridFS } = require("../config/gridfs");

// Update product details
const updateProduct = async (req, res) => {
  try {
    const owner = req.user?.userId;
    const { id } = req.params;

    if (!owner) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find the seller's shop
    const shop = await Shop.findOne({ owner });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Verify the product belongs to the seller's shop
    if (product.shop.toString() !== shop._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this product" });
    }

    const { productName, productDescription, productPrice, productStock, featuredImageIndex } = req.body;

    // Update fields if provided
    if (productName !== undefined) {
      if (!productName.trim()) {
        return res.status(400).json({ message: "Product name cannot be empty" });
      }
      product.productName = productName.trim();
    }

    if (productDescription !== undefined) {
      product.productDescription = productDescription.trim();
    }

    if (productPrice !== undefined) {
      if (Number.isNaN(Number(productPrice))) {
        return res.status(400).json({ message: "Invalid product price" });
      }
      product.productPrice = Number(productPrice);
    }

    if (productStock !== undefined) {
      if (Number.isNaN(Number(productStock))) {
        return res.status(400).json({ message: "Invalid product stock" });
      }
      product.productStock = Number(productStock);
    }

    if (featuredImageIndex !== undefined) {
      const maxIndex = product.productImages ? product.productImages.length - 1 : 0;
      const newIndex = Number(featuredImageIndex);
      if (newIndex >= 0 && newIndex <= maxIndex) {
        product.featuredImageIndex = newIndex;
      }
    }

    // Handle new image uploads
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      // Remove old images from GridFS
      if (product.productImages && product.productImages.length > 0) {
        try {
          const gfs = getGridFS();
          for (const filename of product.productImages) {
            await gfs.files.deleteOne({ filename });
          }
        } catch (err) {
          console.error('Error deleting old images from GridFS:', err);
        }
      }

      // Add new images (replace all) - store filenames from GridFS
      const newImageFilenames = files.slice(0, 3).map((file) => file.filename);
      product.productImages = newImageFilenames;

      // Reset featuredImageIndex if it exceeds new array length
      if (product.featuredImageIndex >= product.productImages.length) {
        product.featuredImageIndex = 0;
      }
    }

    const updatedProduct = await product.save();
    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const owner = req.user?.userId;
    const { id } = req.params;

    if (!owner) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find the seller's shop
    const shop = await Shop.findOne({ owner });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Verify the product belongs to the seller's shop
    if (product.shop.toString() !== shop._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this product" });
    }

    // Remove images from GridFS
    if (product.productImages && product.productImages.length > 0) {
      try {
        const gfs = getGridFS();
        for (const filename of product.productImages) {
          await gfs.files.deleteOne({ filename });
        }
      } catch (err) {
        console.error('Error deleting images from GridFS:', err);
      }
    }

    // Delete the product
    await Product.findByIdAndDelete(id);

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new product for the current seller's shop
const addProduct = async (req, res) => {
  try {
    const owner = req.user?.userId;

    if (!owner) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { productName, productDescription, productPrice, productStock, featuredImageIndex } = req.body;

    if (!productName || !productName.trim()) {
      return res.status(400).json({ message: "Product name is required" });
    }

    if (!productPrice || Number.isNaN(Number(productPrice))) {
      return res.status(400).json({ message: "Valid product price is required" });
    }

    // Find the seller's shop
    const shop = await Shop.findOne({ owner });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // Collect up to 3 image filenames from GridFS (if configured with array upload)
    const files = Array.isArray(req.files) ? req.files : [];
    const imageFilenames = files.slice(0, 3).map((file) => file.filename);

    const newProduct = new Product({
      productName: productName.trim(),
      productDescription: productDescription ? productDescription.trim() : "",
      productPrice: Number(productPrice),
      productStock: productStock ? Number(productStock) : 0,
      productImages: imageFilenames,
      featuredImageIndex: featuredImageIndex ? Number(featuredImageIndex) : 0,
      shop: shop._id,
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all products for the current seller's shop
const getMyProducts = async (req, res) => {
  try {
    const owner = req.user?.userId;

    if (!owner) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const shop = await Shop.findOne({ owner });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const products = await Product.find({ shop: shop._id }).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addProduct, getMyProducts, updateProduct, deleteProduct };
