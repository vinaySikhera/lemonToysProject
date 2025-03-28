const mongoose = require("mongoose");

const toySchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    single_image: { type: String },
    minimum_order_quantity: { type: Number, default: 1 },
    price: { type: Number, required: true },
    price_type: { type: String, enum: ["pcs", "Dozen"], required: true },
    visibility_status: { type: String, enum: ["Approved", "Pending", "Rejected"], default: "Pending" },
    product_owner: { type: String },
    a_user_amount: { type: Number },
    b_user_amount: { type: Number },
    c_user_amount: { type: Number },
    d_user_amount: { type: Number },
    product_description: { type: String },
    qrCodeUrl: { type: String }
});

const AddToySchema = mongoose.model("Toy", toySchema);

module.exports = AddToySchema;
