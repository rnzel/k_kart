const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
    shopName: { type: String, required: true, maxlength: 50 },
    shopDescription: { type: String, required: true, maxlength: 500 },
    shopImage: { type: String },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

module.exports = mongoose.model("Shop", shopSchema);
