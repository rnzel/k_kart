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
      return res.status(401).json({ message: "Unauthorized" });
    }

    const shop = await Shop.findOne({ owner });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.shop.toString() !== shop._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this product" });
    }

    const { productName, productDescription, productPrice, productStock, featuredImageIndex } = req.body;

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

    // ===== IMAGE HANDLING: Preserve existing images, add new ones, enforce 3-image limit =====
    const files = Array.isArray(req.files) ? req.files : [];
    const newImageFilenames = files.length > 0 ? files.map((file) => file.filename) : [];
    
    // Get current images or empty array
    const currentImages = product.productImages && Array.isArray(product.productImages) 
      ? [...product.productImages] 
      : [];

    // Parse removal/keep directives from form data
    let keepImages = null;
    let removeImages = null;

    if (req.body.keepImages) {
      try {
        keepImages = Array.isArray(req.body.keepImages)
          ? req.body.keepImages
          : JSON.parse(req.body.keepImages);
        if (!Array.isArray(keepImages)) {
          keepImages = null;
        }
      } catch (err) {
        keepImages = null;
      }
    }

    if (req.body.removeImages) {
      try {
        removeImages = Array.isArray(req.body.removeImages)
          ? req.body.removeImages
          : JSON.parse(req.body.removeImages);
        if (!Array.isArray(removeImages)) {
          removeImages = null;
        }
      } catch (err) {
        removeImages = null;
      }
    }

    // Determine which images to keep based on removal/keep directives
    let imagesToKeep = currentImages;

    if (removeImages && removeImages.length > 0) {
      // If removeImages provided, keep all EXCEPT those in removeImages
      imagesToKeep = currentImages.filter((filename) => !removeImages.includes(filename));
    } else if (keepImages && keepImages.length > 0) {
      // If keepImages provided, keep only those in keepImages
      imagesToKeep = keepImages.filter((filename) => currentImages.includes(filename));
    }
    // else: if neither is provided or both are empty, keep all current images (default behavior)

    // Calculate how many new images we can add (max 3 total)
    const availableSlots = Math.max(0, 3 - imagesToKeep.length);
    const newImagesToAdd = newImageFilenames.slice(0, availableSlots);

    // Determine which images to delete from GridFS
    const finalImageList = [...imagesToKeep, ...newImagesToAdd];
    const imagesToDelete = currentImages.filter((filename) => !finalImageList.includes(filename));

    // Delete GridFS files only for images that are truly removed
    for (const filename of imagesToDelete) {
      await deleteFileFromGridFS(filename);
    }

    // Update product images
    product.productImages = finalImageList;

    // Ensure featuredImageIndex stays valid
    if (product.productImages.length === 0) {
      product.featuredImageIndex = 0;
    } else if (product.featuredImageIndex >= product.productImages.length) {
      product.featuredImageIndex = 0;
    }

    // Handle explicit featuredImageIndex update
    if (featuredImageIndex !== undefined) {
      const newIndex = Number(featuredImageIndex);
      if (newIndex >= 0 && newIndex < product.productImages.length) {
        product.featuredImageIndex = newIndex;
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

    const shop = await Shop.findOne({ owner });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.shop.toString() !== shop._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this product" });
    }

    if (product.productImages && product.productImages.length > 0) {
      for (const filename of product.productImages) {
        await deleteFileFromGridFS(filename);
      }
    }

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

    const shop = await Shop.findOne({ owner });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

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
