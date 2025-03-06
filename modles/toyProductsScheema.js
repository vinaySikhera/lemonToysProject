const mongoose = require("mongoose");

const toyProductsScheema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    imageUrl: {
        type: String,
        require: false,
        trim: true
    }
})

const ToyScheema = mongoose.model("toys", toyProductsScheema);

module.exports = {ToyScheema}