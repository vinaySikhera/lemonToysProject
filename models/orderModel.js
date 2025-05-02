// models/orderModel.js
// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//     userId: mongoose.Schema.Types.ObjectId,
//     name: String,
//     price: Number,
//     quantity: Number,
//     image: String,
//     qrCodeUrl: String,
//     status: { type: String, default: 'Pending' }
// });

// module.exports = mongoose.model('Order', orderSchema);
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userdetails',
        required: true,
    },
    cartItems: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'products',
                required: true,
            },
            quantity: {
                type: Number,
                default: 1,
                min: 1,
            },
        }
    ],
    status: {
        type: String,
        enum: ['Pending', 'Closed'],
        default: 'Pending',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Order', orderSchema);