const Shop = require("../models/Shop");
const { getGridFS } = require("../config/gridfs");

// Update shop details 
const updateShop = async (req, res) => {
    try {
        const { shopName, shopDescription } = req.body;
        const shopLogo = req.file ? req.file.filename : null;
        const owner = req.user.userId;

        // Validate input
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

        // Only update fields that are provided
        shop.shopName = shopName.trim();
        shop.shopDescription = shopDescription.trim();
        
        if (req.file) {
            // Delete old image from GridFS if exists
            if (shop.shopLogo) {
                try {
                    const gfs = getGridFS();
                    await gfs.files.deleteOne({ filename: shop.shopLogo });
                } catch (err) {
                    console.error('Error deleting old image from GridFS:', err);
                }
            }
            shop.shopLogo = req.file.filename; // Store filename from GridFS
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

        // Validate input
        if (!shopName || !shopName.trim()) {
            return res.status(400).json({ message: "Shop name is required" });
        }
        if (!shopDescription || !shopDescription.trim()) {
            return res.status(400).json({ message: "Shop description is required" });
        }

        // Check if user already has a shop
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

// Delete current user's shop
const deleteShop = async (req, res) => {
    try {
        const owner = req.user.userId;
        
        const shop = await Shop.findOne({ owner });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        // Delete the shop logo from GridFS if it exists
        if (shop.shopLogo) {
            try {
                const gfs = getGridFS();
                await gfs.files.deleteOne({ filename: shop.shopLogo });
            } catch (err) {
                console.error('Error deleting image from GridFS:', err);
            }
        }

        await Shop.findByIdAndDelete(shop._id);
        res.status(200).json({ message: "Shop deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createShop, getMyShop, updateShop, deleteShop };
