const mongoose = require("mongoose");

// Limit product images array to a maximum of 3 entries
const imageLimit = (val) => !val || val.length <= 3;

const ProductSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, maxlength: 50 },
    productDescription: { type: String, maxlength: 500 },
    productPrice: { type: Number, required: true },
    productStock: { type: Number, default: 0, min: 0 },
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
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);