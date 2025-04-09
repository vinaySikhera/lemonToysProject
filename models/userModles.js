// // models/userModel.js

// const mongoose = require('mongoose');

// const cartItemSchema = new mongoose.Schema({
//     id: String,
//     name: String,
//     price: Number,
//     quantity: Number,
//     imageUrl: String,
//     qrCodeUrl: String
// });

// const userSchema = new mongoose.Schema({
//     email: String,
//     password: String,
//     role: String,
//     cart: [cartItemSchema]  // Add this line
// });
// const userCart = mongoose.model("Cart", userSchema);
// module.exports = userCart;
// models/Cart.js
const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: {
        type: String,
        // default: 'guest',
    },
    productId: String,
    name: String,
    price: Number,
    image: String,
    qrCodeUrl: String,
    quantity: {
        type: String,
        // default: 1,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Cart', cartSchema);
