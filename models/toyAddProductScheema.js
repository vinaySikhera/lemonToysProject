const mongoose = require("mongoose");

const toySchema = new mongoose.Schema({
    ProductName: { type: String, required: true },
    Category: { type: String, required: true },
    ProductImageURL: { type: String },
    MinimumOrderQuantity: { type: Number, default: 1 },
    Price: { type: Number, required: true },
    PriceType: { type: String, enum: ["pcs", "Dozen"], required: true },
    VisibilityStatus: { type: String, enum: ["Approved", "Pending", "Rejected"], default: "Pending" },
    ProductOwner: { type: String },
    PriceA: { type: Number },
    PriceB: { type: Number },
    PriceC: { type: Number },
    PriceD: { type: Number },
    ProductDescription: { type: String },
    qrCodeUrl: { type: String }
});

const AddToySchema = mongoose.model("products", toySchema);

module.exports = AddToySchema;