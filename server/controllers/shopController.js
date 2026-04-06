const mongoose = require('mongoose');
const Shop = require("../models/Shop");
const Product = require("../models/Product");
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

// Update shop details 
const updateShop = async (req, res) => {
    try {
        const { shopName, shopDescription, shopContact, shopEmail, shopLocation } = req.body;
        const shopLogo = req.file ? req.file.filename : null;
        const owner = req.user.userId;

        if (!shopName || !shopName.trim()) {
            return res.status(400).json({ message: "Shop name is required" });
        }
        if (!shopDescription || !shopDescription.trim()) {
            return res.status(400).json({ message: "Shop description is required" });
        }
        if (!shopContact || !shopContact.trim()) {
            return res.status(400).json({ message: "Shop contact is required" });
        }

        // Validate Philippine phone number format
        const phoneRegex = /^(?:\+63|0)\d{10}$/;
        if (!phoneRegex.test(shopContact.trim())) {
            return res.status(400).json({ message: "Invalid Philippine phone number format. Use +63XXXXXXXXXX or 09XXXXXXXXX" });
        }
        if (!shopLocation || !shopLocation.trim()) {
            return res.status(400).json({ message: "Shop location is required" });
        }
        
        // Validate email if provided
        if (shopEmail && shopEmail.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(shopEmail.trim())) {
                return res.status(400).json({ message: "Invalid email format" });
            }
        }

        const shop = await Shop.findOne({ owner });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        shop.shopName = shopName.trim();
        shop.shopDescription = shopDescription.trim();
        shop.shopContact = shopContact.trim();
        shop.shopLocation = shopLocation.trim();

        // Check if user wants to remove the logo
        const removeLogo = req.body.removeLogo === "true";
        
        if (removeLogo && shop.shopLogo) {
            await deleteFileFromGridFS(shop.shopLogo);
            shop.shopLogo = null;
        } else if (req.file) {
            // If uploading a new image, delete the old one first
            if (shop.shopLogo) {
                await deleteFileFromGridFS(shop.shopLogo);
            }
            shop.shopLogo = req.file.filename;
        }

        await shop.save();
        res.status(200).json(shop);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new shop
const createShop = async (req, res) => {
    try {
        const { shopName, shopDescription, shopContact, shopEmail, shopLocation } = req.body;
        const shopLogo = req.file ? req.file.filename : null;
        const owner = req.user.userId;

        if (!shopName || !shopName.trim()) {
            return res.status(400).json({ message: "Shop name is required" });
        }
        if (!shopDescription || !shopDescription.trim()) {
            return res.status(400).json({ message: "Shop description is required" });
        }
        if (!shopContact || !shopContact.trim()) {
            return res.status(400).json({ message: "Shop contact is required" });
        }

        // Validate Philippine phone number format
        const phoneRegex = /^(?:\+63|0)\d{10}$/;
        if (!phoneRegex.test(shopContact.trim())) {
            return res.status(400).json({ message: "Invalid Philippine phone number format. Use +63XXXXXXXXXX or 09XXXXXXXXX" });
        }
        if (!shopLocation || !shopLocation.trim()) {
            return res.status(400).json({ message: "Shop location is required" });
        }
        
        // Validate email if provided
        if (shopEmail && shopEmail.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(shopEmail.trim())) {
                return res.status(400).json({ message: "Invalid email format" });
            }
        }

        const existingShop = await Shop.findOne({ owner });
        if (existingShop) {
            return res.status(409).json({ message: "You already have a shop" });
        }

        const newShop = new Shop({
            shopName: shopName.trim(),
            shopDescription: shopDescription.trim(),
            shopContact: shopContact.trim(),
            shopLocation: shopLocation.trim(),
            shopLogo,
            owner
        });

        await newShop.save();
        res.status(201).json(newShop);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get current user's shop
const getMyShop = async (req, res) => {
    try {
        const owner = req.user.userId;
        const shop = await Shop.findOne({ owner });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        res.status(200).json(shop);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
const deleteShop = async (req, res) => {
    try {
        const owner = req.user.userId;
        
        const shop = await Shop.findOne({ owner });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        // Find and delete all products associated with this shop
        const products = await Product.find({ shop: shop._id });
        
        // Delete all product images from GridFS
        for (const product of products) {
            if (product.productImages && product.productImages.length > 0) {
                for (const filename of product.productImages) {
                    await deleteFileFromGridFS(filename);
                }
            }
        }
        
        // Delete all products
        await Product.deleteMany({ shop: shop._id });

        // Delete shop logo from GridFS
        if (shop.shopLogo) {
            await deleteFileFromGridFS(shop.shopLogo);
        }

        await Shop.findByIdAndDelete(shop._id);
        res.status(200).json({ message: "Shop deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all shops (public)
const getAllShops = async (req, res) => {
    try {
        const shops = await Shop.find();
        
        // Get product count for each shop
        const shopsWithProductCount = await Promise.all(
            shops.map(async (shop) => {
                const productCount = await Product.countDocuments({ shop: shop._id });
                return {
                    ...shop.toObject(),
                    productsCount: productCount
                };
            })
        );
        
        res.status(200).json(shopsWithProductCount);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get shop by ID (public)
const getShopById = async (req, res) => {
    try {
        const { shopId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(shopId)) {
            return res.status(400).json({ message: "Invalid shop ID" });
        }

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        res.status(200).json(shop);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get products by shop ID (public)
const getProductsByShopId = async (req, res) => {
    try {
        const { shopId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        if (!mongoose.Types.ObjectId.isValid(shopId)) {
            return res.status(400).json({ message: "Invalid shop ID" });
        }

        // Check if shop exists
        const shop = await Shop.findById(shopId);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        // Get products for this shop
        const products = await Product.find({ shop: shopId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const totalProducts = await Product.countDocuments({ shop: shopId });
        const totalPages = Math.ceil(totalProducts / limit);

        res.status(200).json({
            products,
            pagination: {
                currentPage: page,
                totalPages,
                totalProducts,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createShop, getMyShop, getAllShops, updateShop, deleteShop, getShopById, getProductsByShopId };
