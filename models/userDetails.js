const mongoose = require('mongoose');

const userScheema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: Number,
        required: false,
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        require: false,
        trim: true
    },
    category: {
        type: String,
        required: false,
        trim: true,
        enum: ["A", "B", "C", "D"],
        default: "D"
    },
    VisibilityStatus: {
        type: String,
        enum: ["Approved", "Pending", "Rejected"],
        default: "Pending"
    },
})

const UserDetails = mongoose.model('userdetails', userScheema);
module.exports = UserDetails;