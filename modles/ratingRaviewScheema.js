const mongoose = require("mongoose");

const toyRatingReview = mongoose.Schema({
    rating: {
        type: Number,
        required: false,
        trim: true
    },
    review:{
      type:String,
      required:false,
      trim:true
    }
})

const RatingReview=mongoose.model('rating',toyRatingReview);
module.exports=RatingReview