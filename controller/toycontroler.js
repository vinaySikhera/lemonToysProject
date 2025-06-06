const express = require("express");
const AddToyScheema = require('../models/toyAddProductScheema');
const upload = require("../middleware/fileUpload");
const QRCode = require('qrcode');
const cloudinary = require('cloudinary')
const isAdmin = require('../middleware/isAdmin');
const isAdminOrSupplier = require('../middleware/isAdminOrSupplier');
const userModel = require('../models/userDetails');
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
    const { email, Category,role } = req.cookies;
    const user = await userModel.findOne({ email });
    if (!user) return res.status(401).send("Unauthorized");
    console.log("Logged in as:", user.name, "| Role:", user.role);
    try {
        let toys;

        if (query === 'undefined' || !query) {
            if (role === "Admin"){
                toys = await AddToyScheema.find();
                
            }
            else{
                toys = await AddToyScheema.find({
                  ProductOwner:user.name  
            });
            }
        } else {
            if (role === "Admin"){
                console.log(query)
                toys = await AddToyScheema.find({
                ProductName: { $regex: query, $options: 'i' } // case-insensitive partial match,
            });
            }
            else{
            toys = await AddToyScheema.find({
                ProductName: { $regex: query, $options: 'i' } // case-insensitive partial match,
                ,ProductOwner:user.name 
            });}
        }

        console.log("Search Results:", toys);
        res.json({ toys: toys, Category: Category }); // send JSON response
    } catch (error) {
        console.error("Error fetching toys:", error);
        res.status(500).json({ error: 'Server error' });
    }

});

toyControllerRoute.get('/search-user', async (req, res) => {
    const { query } = req.query;
    // console.log("Query:", query);
    try {
        let users;
        if (!query || !query.trim()) {
            users = await userModel.find();
        } else {
            const regex = new RegExp(query, 'i');
            const phoneAsNumber = Number(query);

            const orConditions = [
                { name: regex },
                { email: regex },
                { role: regex },
                { address: regex }
            ];

            if (!isNaN(phoneAsNumber)) {
                orConditions.push({ phone: phoneAsNumber }); // ✅ numeric match
            }

            users = await userModel.find({ $or: orConditions });
        }

        // console.log("Users found:", users.length);
        res.json(users);
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ error: 'Search error' });
    }
});

toyControllerRoute.get('/allusers-json', async (req, res) => {
    try {
        const users = await userModel.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

toyControllerRoute.get('/alltoys', async (req, res) => {
    try {
        const { email, Category, role } = req.cookies;

        if (!email) return res.status(401).redirect('/login');
        if (role === "Supplier") return res.status(401).redirect('/');

        const { price, category, page = 1, limit = 50, min, max } = req.query;
        const filter = {};

        // Step 2: Filtering
        if (min && max) {
            filter.Price = { $gte: Number(min), $lte: Number(max) };
        } else if (price) {
            filter.Price = { $lte: Number(price) };
        }

        if (category) {
            const categoryArray = category.split(',').map(cat => cat.trim());
            filter.Category = { $in: categoryArray };
        }

        // Step 3: Distinct categories
        const allCategories = await AddToyScheema.distinct("Category");
        //  step 3: Get all toys 
        const alltoys = await AddToyScheema.find();
        console.log(alltoys.length)
        // Step 4: Pagination
        const totalToys = await AddToyScheema.countDocuments(filter);
        const totalPages = Math.ceil(totalToys / limit);
        const getAllToys = await AddToyScheema.find(filter)
            .sort({ Price: (price || min || max) ? 1 : -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        // Step 5: Check if it's an API call
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({
                products: getAllToys,
                totalPages
            });
        }

        // Step 6: Render full page
        res.render('toylists', {
            allCategories,
            getAllToys,
            currentPage: Number(page),
            totalPages,
            totalToys,
            alltoys: alltoys, // Optional or remove if not needed
            price: price || '',
            min: min || '',
            max: max || '',
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
toyControllerRoute.get('/addtoys', isAdminOrSupplier, async (req, res) => {
    const role = req.cookies.role
    const allOwner = await userModel.find({ role: 'Supplier' }, 'name');
    // console.log(allOwner);

    res.render('addNewToy', { role, allOwner });
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
toyControllerRoute.get('/deleteToy/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log("this is id from -", id);
        const toy = await AddToyScheema.findById(id);
        console.log("found toy for delete purpose", toy)
        if (!toy) return res.status(404).json({ message: "Toy not found" });

        await AddToyScheema.findByIdAndDelete(id);
        res.status(200).redirect("/adminToys");
    } catch (error) {
        console.error("Delete failed", error);
        res.status(400).json({ message: "Data not deleted" });
    }
});

toyControllerRoute.get('/adminToys', isAdminOrSupplier, async (req, res) => {
    try {
        const { email } = req.cookies;
        const { price, category, page = 1, limit = 9 } = req.query;

        const user = await userModel.findOne({ email });
        if (!user) return res.status(401).send("Unauthorized");

        const filter = {};

        if (price) filter.Price = { $lte: Number(price) };
        if (category) filter.Category = category;

        // ✅ Filter by supplier's own products
        if (user.role.trim().toLowerCase() === 'supplier') {
            filter.ProductOwner = user.name.trim();
        }

        console.log("Logged in as:", user.name, "| Role:", user.role);
        console.log("Final filter:", filter);

        const allCategories = await AddToyScheema.distinct("Category");
        const totalToys = await AddToyScheema.countDocuments(filter);
        const totalPages = Math.ceil(totalToys / limit);

        const getAllToys = await AddToyScheema.find(filter)
            .sort({ Price: price ? 1 : -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.render('toyAdiminDashboard', {
            allCategories,
            getAllToys,
            currentPage: Number(page),
            totalPages,
            totalToys,
            price: price || '',
            category: category || '',
            user
        });

    } catch (error) {
        console.error("Error fetching toys:", error);
        res.status(500).send("Internal Server Error");
    }
});


toyControllerRoute.get('/editToy/:id', isAdminOrSupplier, async (req, res) => {
    try {
        const { email } = req.cookies;
        const user = await userModel.findOne({ email });
        const allOwner = await userModel.find({ role: 'Supplier' });

        const toy = await AddToyScheema.findById(req.params.id);
        if (!toy) return res.status(404).send("Toy not found");

        res.render('editToy', { toy, user, allOwner }); // ✅ pass user
    } catch (error) {
        console.error("Error fetching toy details:", error);
        res.status(500).send("Internal Server Error");
    }
});

toyControllerRoute.post('/updateToy/:id', isAdminOrSupplier, async (req, res) => {
    try {
        const { ProductName, Category, Price, ProductImageURL, MinimumOrderQuantity, ProductDescription, product_owner, PriceA, PriceB, PriceC, PriceD } = req.body;

        await AddToyScheema.findByIdAndUpdate(req.params.id, {
            ProductName,
            Category,
            Price,
            ProductImageURL,
            ProductDescription,
            MinimumOrderQuantity,
            ProductOwner: product_owner,
            PriceA,
            PriceB,
            PriceC,
            PriceD
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