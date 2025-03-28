const express = require("express");
const AddToyScheema = require('../models/toyAddProductScheema');
const upload = require("../middleware/fileUpload");
const QRCode = require('qrcode');

const toyControllerRoute = express.Router();

// Middleware for validating toy input
const validateToyInput = (req, res, next) => {
    const { name, category, price, minimum_order_quantity } = req.body;
    if (!name || !category || !price || !minimum_order_quantity) {
        return res.status(400).json({ message: "All fields are required!" });
    }
    next();
};

// Home Page
toyControllerRoute.get('/', (req, res) => {
    res.render('index');
});

// Get all toys with pagination & filtering
toyControllerRoute.get('/alltoys', async (req, res) => {
    try {
        const { price, category, page = 1, limit = 6 } = req.query;
        const filter = {};
        if (price) filter.price = { $lte: Number(price) };
        if (category) filter.category = category;

        const allCategories = await AddToyScheema.distinct("category");
        const totalToys = await AddToyScheema.countDocuments(filter);
        const totalPages = Math.ceil(totalToys / limit);

        const getAllToys = await AddToyScheema.find(filter)
            .sort({ price: price ? 1 : -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.render('toylists', {
            allCategories, getAllToys, currentPage: Number(page),
            totalPages, totalToys, price: price || '', category: category || ''
        });
    } catch (error) {
        console.error("Error fetching toys:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Add new toy
toyControllerRoute.get('/addtoys', (req, res) => {
    res.render('addToys');
});

toyControllerRoute.post('/addtoys', upload.single('single_image'), validateToyInput, async (req, res) => {
    try {
        const { name, category, minimum_order_quantity, price, price_type, visibility_status, product_owner, a_user_amount, b_user_amount, c_user_amount, d_user_amount, product_description } = req.body;

        const getImage = req.file ? req.file.path : null;
        const toyUrl = `http://localhost:3003/toydetails/${encodeURIComponent(name)}`;
        const qrCode = await QRCode.toDataURL(toyUrl);

        const addToy = new AddToyScheema({
            name,
            category,
            single_image: getImage,
            minimum_order_quantity,
            price, price_type,
            visibility_status,
            product_owner,
            a_user_amount,
            b_user_amount,
            c_user_amount,
            d_user_amount,
            product_description,
            qrCodeUrl: qrCode
        });

        await addToy.save();
        res.redirect('/toys/alltoys');
    } catch (error) {
        console.error("New data not added", error);
        res.status(500).json({ message: "New data not added" });
    }
});

// Update toy
toyControllerRoute.patch('/update/:id', upload.single('single_image'), async (req, res) => {
    const { id } = req.params;
    try {
        const toy = await AddToyScheema.findById(id);
        if (!toy) return res.status(404).json({ message: "Toy not found" });

        const updatedData = { ...req.body };
        if (req.file) updatedData.single_image = req.file.path;

        await AddToyScheema.findByIdAndUpdate(id, updatedData, { new: true });
        res.status(200).json({ message: "Data updated successfully" });
    } catch (error) {
        console.error("Update failed", error);
        res.status(400).json({ message: "Data not updated" });
    }
});

// Delete toy
toyControllerRoute.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const toy = await AddToyScheema.findById(id);
        if (!toy) return res.status(404).json({ message: "Toy not found" });

        await AddToyScheema.findByIdAndDelete(id);
        res.status(200).json({ message: "Data deleted successfully" });
    } catch (error) {
        console.error("Delete failed", error);
        res.status(400).json({ message: "Data not deleted" });
    }
});

module.exports = toyControllerRoute;
