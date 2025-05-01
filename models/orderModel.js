// models/orderModel.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    price: Number,
    quantity: Number,
    image: String,
    qrCodeUrl: String,
    status: { type: String, default: 'Pending' }
});

module.exports = mongoose.model('Order', orderSchema);
