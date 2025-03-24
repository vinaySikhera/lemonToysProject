const express = require('express');
const { RatingReview } = require('../modles/ratingRaviewScheema');

const ratingReviewControl = express.Router();

ratingReviewControl.post('/rate', (req, res) => {
    const ratingReviewPayload = req.body;
    const ratingsave = new RatingReview(ratingReviewPayload);
    ratingsave.save();
})


module.exports = ratingReviewControl;
