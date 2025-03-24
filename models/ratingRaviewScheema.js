const mongoose = require("mongoose");

const toyRatingReview = mongoose.Schema({
  userId: {
    type: String,
    required: true,
    trim: true
  },
  productId: {
    type: String,
    require: true,
    trim: true
  },
  rating: {
    type: Number,
    required: false,
    trim: true
  },
  review: {
    type: String,
    required: false,
    trim: true
  }
})

const RatingReview = mongoose.model('rating', toyRatingReview);
module.exports = RatingReview;