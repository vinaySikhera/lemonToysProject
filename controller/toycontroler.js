const express = require("express");
const AddToyScheema = require('../models/toyAddProductScheema');
const upload = require("../middleware/fileUpload");
const QRCode = require('qrcode');
const cloudinary = require('cloudinary')
const isAdmin = require('../middleware/isAdmin');
const isAdminOrSupplier = require('../middleware/isAdminOrSupplier');
const toyControllerRoute = express.Router();

cloudinary.config({
    cloud_name: 'dghkslcr1',
    api_key: '682495838963169',
    api_secret: 'SKq91G4JlTq6dqjNHF3FvNOkbcE' // Click 'View API Keys' above to copy your API secret
});

// Middleware for validating toy input
const validateToyInput = (req, res, next) => {
    const { name, category, price, minimum_order_quantity } = req.body;
    // console.log(name, category, price, minimum_order_quantity)
    if (!name || !category || !price || !minimum_order_quantity) {
        return res.status(400).json({ message: "All fields are required!" });
    }
    next();
};

// Home Page
toyControllerRoute.get('/', async (req, res) => {
    try {
        const { price, category, page = 1, limit = 9 } = req.query;
        const filter = {};
        if (price) filter.Price = { $lte: Number(price) };
        if (category) filter.Category = category;
        const allCategories = await AddToyScheema.distinct("Category");
        const totalToys = await AddToyScheema.countDocuments(filter);
        const totalPages = Math.ceil(totalToys / limit);
        const getAllToys = await AddToyScheema.find(filter)
            .sort({ Price: price ? 1 : -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        // console.log(getAllToys)
        res.render('index', {
            allCategories,
            getAllToys,
            currentPage: Number(page),
            totalPages,
            totalToys,
            price: price || '',
            category: category || ''
        });
    } catch (error) {
        console.error("Error fetching toys:", error);
        res.status(500).send("Internal Server Error");
    }
    // res.render('index');
});
toyControllerRoute.get('/search-product', async (req, res) => {
    const { query } = req.query;
    console.log("Search Query:", query);

    try {
        let toys;

        if (query === 'undefined' || !query) {
            toys = await AddToyScheema.find();
        } else {
            toys = await AddToyScheema.find({
                ProductName: { $regex: query, $options: 'i' } // case-insensitive partial match
            });
        }

        console.log("Search Results:", toys);
        res.json(toys); // send JSON response
    } catch (error) {
        console.error("Error fetching toys:", error);
        res.status(500).json({ error: 'Server error' });
    }

});
toyControllerRoute.get('/alltoys', async (req, res) => {
    try {
        const { email, Category } = req.cookies;
        if (!email) {
            return res.status(401).redirect('/login');
        }

        const { price, category, page = 1, limit = 16 } = req.query;
        const filter = {};

        // Price filter
        if (price) filter.Price = { $lte: Number(price) };

        // Category filter (support multiple)
        if (category) {
            const categoryArray = category.split(',').map(cat => cat.trim());
            filter.Category = { $in: categoryArray };
        }

        // Distinct categories for filter UI
        const allCategories = await AddToyScheema.distinct("Category");

        // Total count & paginated data
        const totalToys = await AddToyScheema.countDocuments(filter);
        const totalPages = Math.ceil(totalToys / limit);
        const getAllToys = await AddToyScheema.find(filter)
            .sort({ Price: price ? 1 : -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.render('toylists', {
            allCategories,
            getAllToys,
            currentPage: Number(page),
            totalPages,
            totalToys,
            price: price || '',
            category: category || '',
            Category: Category || ''
        });

    } catch (error) {
        console.error("Error fetching toys:", error);
        res.status(500).send("Internal Server Error");
    }
});
toyControllerRoute.get('/api/toys', async (req, res) => {
    try {
        const { email, Category } = req.cookies;
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        const price = req.query.price ? parseFloat(req.query.price) : null;
        const category = req.query.category;

        const filter = {};

        if (price) filter.Price = { $lte: price };
        if (category) {
            const categoryArray = category.split(',').map(cat => cat.trim());
            filter.Category = { $in: categoryArray };
        };

        const totalToys = await AddToyScheema.countDocuments(filter);
        const totalPages = Math.ceil(totalToys / limit);

        const products = await AddToyScheema.find(filter)
            .sort({ createdAt: -1 }) // Optional: latest first
            .skip(skip)
            .limit(limit);

        res.json({
            products,
            currentPage: page,
            totalPages,
            totalToys,
            Category: Category || ''
        });
    } catch (err) {
        console.error('API Error fetching toys:', err);
        res.status(500).json({ message: 'Server error fetching toys' });
    }
});


// Add new toy
toyControllerRoute.get('/addtoys', isAdminOrSupplier, (req, res) => {
    const role = req.cookies.role
    // console.log(role);
    res.render('addNewToy', { role });
});

const uploadFile = async (url, name) => {
    const uploadResult = await cloudinary.uploader
        .upload(
            url, {
            public_id: name.toString(),
        }
        )
        .catch((error) => {
            console.log(error);
        });
    // console.log(uploadResult.url)
    return uploadResult.url
}

toyControllerRoute.post('/addtoys', upload.single('single_image'), validateToyInput, async (req, res) => {
    try {
        const { name, category, minimum_order_quantity, price, price_type, visibility_status, product_owner, a_user_amount, b_user_amount, c_user_amount, d_user_amount, product_description } = req.body;
        // console.log("00000000000000000000000000000000", visibility_status)
        const getImage = req.file ? req.file.path : null;
        const toyUrl = `http://localhost:3003/toydetails/${encodeURIComponent(name)}`;
        const qrCode = await QRCode.toDataURL(toyUrl);
        // console.log(getImage)
        uploadImage = await uploadFile(getImage, name)
        const addToy = new AddToyScheema({
            ProductName: name,
            Category: category,
            ProductImageURL: uploadImage.toString(),
            MinimumOrderQuantity: minimum_order_quantity,
            Price: price,
            PriceType: price_type,
            VisibilityStatus: visibility_status,
            ProductOwner: product_owner,
            PriceA: a_user_amount,
            PriceB: b_user_amount,
            PriceC: c_user_amount,
            PriceD: d_user_amount,
            ProductDescription: product_description,
            qrCodeUrl: qrCode
        });

        await addToy.save().then((user) => {
            // console.log('toy added:', user);
        })
            .catch((error) => {
                console.error('Error adding toy:', error);
            });

        res.redirect('/adminToys');
        // res.status(202).json({ message: "New data consoled" });
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

toyControllerRoute.get('/adminToys', isAdmin, async (req, res) => {
    try {
        // Extracting price, category, page, and limit from the query parameters
        const { price, category, page = 1, limit = 9 } = req.query;

        const filter = {};
        // Apply filter for price and category if provided
        if (price) filter.Price = { $lte: Number(price) };
        if (category) filter.Category = category;

        // Fetch distinct categories for the filter options
        const allCategories = await AddToyScheema.distinct("Category");

        // Count the total number of toys matching the filter
        const totalToys = await AddToyScheema.countDocuments(filter);

        // Calculate total pages for pagination
        const totalPages = Math.ceil(totalToys / limit);

        // Fetch the filtered and paginated toys
        const getAllToys = await AddToyScheema.find(filter)
            .sort({ Price: price ? 1 : -1, _id: -1 })  // Sorting by price if it's provided
            .skip((page - 1) * limit) // Skip the results based on the page number
            .limit(Number(limit));   // Limit the number of results per page

        // console.log(getAllToys)
        // Render the page with the fetched data
        res.render('toyAdiminDashboard', {
            allCategories,
            getAllToys,
            currentPage: Number(page),
            totalPages,
            totalToys,
            price: price || '',
            category: category || ''
        });
    } catch (error) {
        console.error("Error fetching toys:", error);
        res.status(500).send("Internal Server Error");
    }
});

toyControllerRoute.get('/editToy/:id', isAdminOrSupplier, async (req, res) => {
    try {
        const toy = await AddToyScheema.findById(req.params.id);
        if (!toy) return res.status(404).send("Toy not found");

        res.render('editToy', { toy });
    } catch (error) {
        console.error("Error fetching toy details:", error);
        res.status(500).send("Internal Server Error");
    }
});

toyControllerRoute.post('/updateToy/:id', isAdminOrSupplier, async (req, res) => {
    try {
        const { ProductName, Category, Price, ProductImageURL } = req.body;
        await AddToyScheema.findByIdAndUpdate(req.params.id, {
            ProductName,
            Category,
            Price,
            ProductImageURL
        });

        res.redirect('/adminToys');
    } catch (error) {
        console.error("Error updating toy:", error);
        res.status(500).send("Internal Server Error");
    }
});

toyControllerRoute.get('/viewToys/:id', isAdminOrSupplier, async (req, res) => {
    try {
        const { id } = req.params;
        const toys = await AddToyScheema.findById(id);
        if (!toys) {
            return res.status(404).json({ message: "toys not found in your database" })
        }
        // console.log(viewUser);
        res.render('viewToy', { toys });

    } catch (error) {
        res.status(404).json({ message: "viewUser not found here", error })
    }
});




toyControllerRoute.get('/approveToys', isAdmin, async (req, res) => {
    try {
        // Extracting price, category, page, and limit from the query parameters
        const { price, category, page = 1, limit = 9, VisibilityStatus } = req.query;
        // console.log(VisibilityStatus)

        // Initialize the filter object
        const filter = {};

        // Apply filter for price and category if provided
        if (price) filter.Price = { $lte: Number(price) };
        if (category) filter.Category = category;
        if (VisibilityStatus) filter.VisibilityStatus = VisibilityStatus;

        // Fetch distinct categories for the filter options
        const allCategories = await AddToyScheema.distinct("Category");

        // Count the total number of toys matching the filter
        const totalToys = await AddToyScheema.countDocuments(filter);

        // Calculate total pages for pagination
        const totalPages = Math.ceil(totalToys / limit);

        // Fetch the filtered and paginated toys
        const getAllToys = await AddToyScheema.find(filter)
            .sort({ Price: price ? 1 : -1, _id: -1 })  // Sorting by price if it's provided
            .skip((page - 1) * limit) // Skip the results based on the page number
            .limit(Number(limit));   // Limit the number of results per page

        // console.log(getAllToys)
        // Render the page with the fetched data
        res.render('approveToys', {
            allCategories,
            getAllToys,
            currentPage: Number(page),
            totalPages,
            totalToys,
            price: price || '',
            category: category || ''
        });
    } catch (error) {
        console.error("Error fetching toys:", error);
        res.status(500).send("Internal Server Error");
    }
});

toyControllerRoute.get('/pendingToys', isAdmin, async (req, res) => {
    try {
        // Extracting price, category, page, and limit from the query parameters
        const { price, category, page = 1, limit = 9, VisibilityStatus } = req.query;

        // Initialize the filter object
        const filter = {};

        // Apply filter for price and category if provided
        if (price) filter.Price = { $lte: Number(price) };
        if (category) filter.Category = category;
        if (VisibilityStatus) filter.VisibilityStatus = VisibilityStatus;

        // Fetch distinct categories for the filter options
        const allCategories = await AddToyScheema.distinct("Category");

        // Count the total number of toys matching the filter
        const totalToys = await AddToyScheema.countDocuments(filter);

        // Calculate total pages for pagination
        const totalPages = Math.ceil(totalToys / limit);

        // Fetch the filtered and paginated toys
        const getAllToys = await AddToyScheema.find(filter)
            .sort({ Price: price ? 1 : -1, _id: -1 })  // Sorting by price if it's provided
            .skip((page - 1) * limit) // Skip the results based on the page number
            .limit(Number(limit));   // Limit the number of results per page

        // console.log(getAllToys)
        // Render the page with the fetched data
        res.render('pendingToys', {
            allCategories,
            getAllToys,
            currentPage: Number(page),
            totalPages,
            totalToys,
            price: price || '',
            category: category || ''
        });
    } catch (error) {
        console.error("Error fetching toys:", error);
        res.status(500).send("Internal Server Error");
    }
});
toyControllerRoute.get('/rejectToys', isAdmin, async (req, res) => {
    try {
        // Extracting price, category, page, and limit from the query parameters
        const { price, category, page = 1, limit = 16, VisibilityStatus } = req.query;
        // console.log(VisibilityStatus)
        // Initialize the filter object
        const filter = {};

        // Apply filter for price and category if provided
        if (price) filter.Price = { $lte: Number(price) };
        if (category) filter.Category = category;
        if (VisibilityStatus) filter.VisibilityStatus = VisibilityStatus;

        // Fetch distinct categories for the filter optio
        const allCategories = await AddToyScheema.distinct("Category");

        // Count the total number of toys matching the filter
        const totalToys = await AddToyScheema.countDocuments(filter);

        // Calculate total pages for pagination
        const totalPages = Math.ceil(totalToys / limit);

        // Fetch the filtered and paginated toys
        const getAllToys = await AddToyScheema.find(filter)
            .sort({ Price: price ? 1 : -1, _id: -1 })  // Sorting by price if it's provided
            .skip((page - 1) * limit) // Skip the results based on the page number
            .limit(Number(limit));   // Limit the number of results per page

        // console.log(getAllToys)
        // Render the page with the fetched data
        res.render('rejectToys', {
            allCategories,
            getAllToys,
            currentPage: Number(page),
            totalPages,
            totalToys,
            price: price || '',
            category: category || ''
        });
    } catch (error) {
        console.error("Error fetching toys:", error);
        res.status(500).send("Internal Server Error");
    }
});


module.exports = toyControllerRoute;
