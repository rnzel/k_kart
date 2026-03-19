const mongoose = require("mongoose");

// Limit product images array to a maximum of 3 entries
const imageLimit = (val) => !val || val.length <= 3;

const ProductSchema = new mongoose.Schema(
  {
    productName: { 
      type: String, 
      required: true, 
      maxlength: 50,
      index: true
    },
    productDescription: { type: String, maxlength: 500 },
    productPrice: { 
      type: Number, 
      required: true,
      index: true
    },
    productStock: { 
      type: Number, 
      default: 0, 
      min: 0,
      index: true
    },
    productImages: {
      type: [String],
      validate: {
        validator: imageLimit,
        message: "Product can have at most 3 images",
      },
    },
    featuredImageIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    shop: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Shop", 
      required: true,
      index: true
    },
    isDeleted: { 
      type: Boolean, 
      default: false,
      index: true
    }
  },
  { 
    timestamps: true,
    // Compound index for shop and product queries
    index: { shop: 1, isDeleted: 1 }
  }
);

module.exports = mongoose.model("Product", ProductSchema);