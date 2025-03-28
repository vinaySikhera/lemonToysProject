const mongoose = require('mongoose');

const addUsersScheema = new mongoose.Schema({
    userCategory: {
        type: String,
        required: false,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: false,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    profilePic: {
        type: String,
        required: false
    },
    address: {
        type: String,
        required: false,
        trim: true
    },
    about: {
        type: String,
        required: false,
        trim: true
    },
    status: {
        type: String,
        required: false,
        enum: ["Active", "Deactive"],
        trim: true
    },
    role: {
        type: String,
        required: false,
        trim: true
    }

}, { timestamps: true });

const AddUsersScheema = mongoose.model('users', addUsersScheema);

module.exports = {AddUsersScheema};