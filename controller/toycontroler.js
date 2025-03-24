const express = require("express");
const { ToyScheema } = require('../models/toyProductsScheema')
const upload = require("../middleware/fileUpload")
const QRCode = require('qrcode');

const toyControlerRoute = express.Router();

toyControlerRoute.get('/', (req, res) => {
    res.render('index');
});

// get all toys 
toyControlerRoute.get('/alltoys', async (req, res) => {
    try {
        const { price, category, page = 1, limit = 6 } = req.query;
        const filter = {};

        if (price) {
            filter.price = { $lte: Number(price) };
        }
        if (category) {
            filter.category = category;
        }

        const allCategories = await ToyScheema.distinct("category");
        const totalToys = await ToyScheema.countDocuments(filter);
        const totalPages = Math.ceil(totalToys / limit);

        const getAllToys = await ToyScheema.find(filter)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ price: 1 });

        res.render('toylists', {
            allCategories,
            getAllToys,
            currentPage: Number(page),  // Convert page to number
            totalPages,
            totalToys,
            price: price || '',  // ✅ Ensure price is always defined
            category: category || '' // ✅ Ensure category is always defined
        });
    } catch (error) {
        console.error("Error fetching toys:", error);
        res.status(500).send("Internal Server Error");
    }
});


// add toys 
toyControlerRoute.get('/addtoys', (req, res) => {
    res.render('addToys')
})

toyControlerRoute.post('/addtoys', upload.single('imageUrl'), async (req, res) => {
    try {
        console.log(req.body);
        const { name, title, price, description, category, imageUrl } = req.body;

        // console.log(req.file.path)
        const getImage = req.file.path
        const toyUrl = `http://localhost:3003/toydetails/${name.replace(/\s/g, "-")}`;

        const qrCode = await QRCode.toDataURL(toyUrl);
        const addToyNewDetails = {
            name,
            title,
            price,
            description,
            category,
            imageUrl: getImage,
            qrCodeUrl: qrCode
        }
        const addToy = new ToyScheema(addToyNewDetails);
        await addToy.save();
        res.redirect('/toys/alltoys');
        // res.status(201).json({ message: "new data added" });

    } catch (error) {
        console.log("new data are not added", error)
        res.status(404).json({ message: "new data not added" })
    }
});

// updata toys 
toyControlerRoute.patch('/update/:id', async (req, res) => {
    const { id } = req.params;
    console.log(req.body);
    const { name, title, price, description, category, imageUrl } = req.body;
    console.log(id);
    try {
        await ToyScheema.findByIdAndUpdate(id, { name, title, price, description, category, imageUrl })
        res.status(201).json({ message: "data update successfully" })
    } catch (error) {
        res.status(404).json({ message: "data not update successfully" });
    }
});

// delete toys
toyControlerRoute.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    console.log(id);
    try {
        await ToyScheema.findByIdAndDelete(id)
        res.status(201).json({ message: "data delete successfully" })
    } catch (error) {
        res.status(400).json({ message: "data not deleted" });
    }
});

module.exports = toyControlerRoute;