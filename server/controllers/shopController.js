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
        const { shopName, shopDescription } = req.body;
        const shopLogo = req.file ? req.file.filename : null;
        const owner = req.user.userId;

        if (!shopName || !shopName.trim()) {
            return res.status(400).json({ message: "Shop name is required" });
        }
        if (!shopDescription || !shopDescription.trim()) {
            return res.status(400).json({ message: "Shop description is required" });
        }

        const shop = await Shop.findOne({ owner });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        shop.shopName = shopName.trim();
        shop.shopDescription = shopDescription.trim();
        
        if (req.file) {
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
        const { shopName, shopDescription } = req.body;
        const shopLogo = req.file ? req.file.filename : null;
        const owner = req.user.userId;

        if (!shopName || !shopName.trim()) {
            return res.status(400).json({ message: "Shop name is required" });
        }
        if (!shopDescription || !shopDescription.trim()) {
            return res.status(400).json({ message: "Shop description is required" });
        }

        const existingShop = await Shop.findOne({ owner });
        if (existingShop) {
            return res.status(409).json({ message: "You already have a shop" });
        }

        const newShop = new Shop({
            shopName: shopName.trim(),
            shopDescription: shopDescription.trim(),
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

// Delete current user's shop (with cascade delete for products)
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

module.exports = { createShop, getMyShop, updateShop, deleteShop };
