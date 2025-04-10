const express = require("express");
const dbConnected = require('./dbConfig');
const toyControlerRoute = require('./controller/toycontroler');
const { ToyScheema } = require('./models/toyProductsScheema')
const path = require("path");
const userModel = require('./models/userDetails'); // Fixed spelling issue from "modles" to "models"
const userCart = require('./models/userModles'); // Fixed spelling issue from "modles" to "models"
const { AddUsersScheema } = require('./models/addUser')
const cookieParser = require('cookie-parser');
const AddToySchema = require('./models/toyAddProductScheema')
const bcrypt = require('bcrypt');
const upload = require('./middleware/fileUpload');
const isAdmin = require('./middleware/isAdmin');
// const Cart = require('./models/userModles');
const isLoginOrNot = require('./middleware/isLoginOrNot');
const isAdminOrSupplier = require('./middleware/isAdminOrSupplier');
const { findByIdAndUpdate } = require("./models/toyAddProductScheema");
const { ObjectId } = require('mongodb'); // Import ObjectId from MongoDB driver
const mongoose = require('mongoose')
require('dotenv').config()
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
// app.use(process.config.env)

app.use(cookieParser()); // Added cookie-parser middleware before accessing cookies

const staticPath = path.join(__dirname, "public");
app.use(express.static(staticPath));
app.use((req, res, next) => {
    res.locals.HOST = process.env.HOST;
    // console.log(res.locals.HOST)
    next();
});
app.set('view engine', "ejs");

const PORT = 3003;

app.use('/', toyControlerRoute);



// Routes
app.get('/contact', (req, res) => {
    res.render('contact');
});

// app.get('/checkout', (req, res) => {
//     res.render('checkoutpage');
// });

app.post('/add-to-cart', async (req, res) => {
    try {
        const product = req.body;
        const email = req.cookies?.email; // optional login check
        console.log("email", email);
        console.log(product)
        const userId = await userModel.findOne({ email: email });
        console.log("userid is ", userId._id);
        // Check if the item already exists in cart for the same user
        const existingItem = await userCart.findOne({ userId: userId._id, productId: product._id });
        console.log(existingItem);
        if (existingItem) {
            existingItem.quantity += 1;
            await existingItem.save();
        } else {
            const cartItem = new userCart({
                userId: userId._id,
                productId: product._id,
                name: product.ProductName,
                price: product.Price,
                image: product.ProductImageURL,
                qrCodeUrl: product.qrCodeUrl || '', // optional fallback
                quantity: parseInt(product.MinimumOrderQuantity)
            });
            // console.log(cartItem)
            await cartItem.save();
        }

        res.status(200).json({ message: 'Item added to cart!' });
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).json({ message: 'Failed to add item to cart' });
    }
});


app.get('/cart', async (req, res) => {
    const { email } = req.cookies;
    // console.log("cart page", email);

    if (!email) return res.status(401).redirect("/login"); // or redirect to login

    try {
        const userId = await userModel.findOne({ email: email });
        // console.log("userid is ", userId._id);
        const user = await userCart.find({
            userId: userId._id
        });
        // console.log("cart page", user);
        res.render("addToCart", {
            cart: user || []
        });
    } catch (err) {
        console.error("Error fetching cart:", err);
        res.status(500).render("error", { message: "Server error" });
    }
});

app.delete('/remove-from-cart/:cartItemId', async (req, res) => {
    try {
        const { cartItemId } = req.params;

        const result = await userCart.deleteOne({ _id: cartItemId });

        if (result.deletedCount > 0) {
            return res.json({ success: true });
        }

        res.json({ success: false, message: "Item not found in cart" });
    } catch (err) {
        console.error("Delete cart error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


// REGISTER ROUTE
app.get('/register', isLoginOrNot, (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    try {
        const { name, email, password, address, mobileNumber } = req.body;

        // Check if the user already exists
        const isUserAlready = await userModel.findOne({ $or: [{ email }, { phone: mobileNumber }] });
        if (isUserAlready) {
            return res.status(400).json({
                message: existingUser.email === email
                    ? "Email already registered"
                    : "Phone number already registered"
            });
        }
        // Use bcrypt for secure password hashing instead of Cryptr
        // const saltRounds = 10;
        // const hashedPassword = await bcrypt.hash(password, saltRounds);

        const userDetails = {
            name,
            email,
            // password: hashedPassword,
            password,
            role: "Customer",
            address: address,
            phone: mobileNumber
        };

        const addNewUser = new userModel(userDetails);
        await addNewUser.save(); // Ensuring user is saved before redirecting

        res.redirect('/login');
    } catch (error) {
        console.error('Error registering new user:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// add user start here----------------------------------------------------------------------------

app.get('/adduser', isAdmin, (req, res) => {
    res.render('addUser');
});

app.post('/adduser', async (req, res) => {
    try {
        // console.log("🔹 Received Data:", req.body); // Debugging log

        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: "No data received. Check form submission." });
        }

        const { name, phone, email, password, address, role } = req.body;
        // console.log("📌 Extracted Fields:", { name, phone, email, password, address, role });

        if (!password) {
            return res.status(400).json({ message: "Password is required" });
        }

        const isUserAlready = await userModel.findOne({ $or: [{ email }, { phone }] });
        if (isUserAlready) {
            return res.status(400).json({ message: "User already exists" });
        }

        // const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new userModel({
            phone,
            address,
            role,
            name,
            email,
            //    password: hashedPassword
            password
        });
        await newUser.save();

        res.status(201).json({ message: "New user added successfully" });

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


app.patch('/updateuser/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // console.log(id)
        const { userCategory, name, phone, email, password, profilePic, address, about, status } = req.body;
        await AddUsersScheema.findByIdAndUpdate(id, { userCategory, name, phone, email, password, profilePic, address, about, status })
        res.status(201).json({ message: "user update successfully" })
    } catch (error) {
        res.status(404).json({ message: "new user not update successfully" });
    }
})

app.delete('/deleteuser/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params
        await AddUsersScheema.findByIdAndDelete(id);
        res.status(201).json({ message: "user delete successfully" });
    } catch (error) {
        res.status(404).json({ message: "user delete successfully" })
    }
})



app.post('/updateVisibilityStatus', isAdmin, async (req, res) => {
    try {
        const { toyId, status } = req.body; // Get toy ID and status from request body

        if (!toyId || !status) {
            return res.status(400).json({ error: "Toy ID and status are required" });
        }

        // Find toy by ID and update visibility status
        const updatedToy = await AddToySchema.findByIdAndUpdate(
            toyId,
            { $set: { VisibilityStatus: status } },
            { new: true } // Return updated document
        );

        if (!updatedToy) {
            return res.status(404).json({ error: "Toy not found" });
        }

        res.json({ message: "Toy status updated successfully", updatedToy });
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/allusers', isAdmin, async (req, res) => {
    try {
        const { role } = req.query; // Get role from query parameters
        let query = {};
        // console.log(role)
        if (role) {
            query.role = role; // Apply role filter if provided
        }
        // console.log(query)
        const allusers = await userModel.find(query);
        // console.log(allusers);
        console.log(allusers)

        res.render('getAllUsers', { allusers, selectedRole: role || "" });

    } catch (err) {
        res.status(404).json({ message: "Users not found" });
    }
});



app.get('/viewUser/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const viewUser = await userModel.findById(id);
        if (!viewUser) {
            return res.status(404).json({ message: "viewUser not found in your database" })
        }
        // console.log(viewUser);
        res.render('userdetails', { viewUser })
    } catch (error) {
        res.status(404).json({ message: "viewUser not found here", error })
    }
});

app.get('/supplier-count', async (req, res) => {
    try {
        const supplierCount = await userModel.countDocuments({ role: "Supplier" });
        const usersCount = await userModel.countDocuments();
        const allCategories = await AddToySchema.distinct("Category");
        const categoryCount = allCategories.length;
        const allProducts = await AddToySchema.countDocuments();

        res.json({ count: supplierCount, users: usersCount, category: categoryCount, products: allProducts }); // Send JSON response
    } catch (error) {
        console.error("Error fetching supplier count:", error);
        res.status(500).json({ error: "Internal Server Error" });

    }
});

app.get('/editUser/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // console.log('i m getting id from queries', id)
        const editUser = await userModel.findById(id);
        if (!editUser) {
            return res.status(404).json({ message: "editUser not found in your database" })
        }
        // console.log(editUser);
        res.render('editUser', { editUser })
    } catch (error) {
        res.status(404).json({ message: "editUser not found here", error })
    }
});


app.post('/updateUser/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email, address, about, role } = req.body;

        const updateUser = await AddUsersScheema.findByIdAndUpdate(id, {
            name,
            phone,
            email,
            address,
            about,
            role
        }, { new: true });

        if (!updateUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // console.log("User updated:", updateUser);
        res.redirect(`/viewUser/${id}`);

    } catch (error) {
        console.error("Error updating user:", error); // ✅ Logs actual error
        res.status(500).json({ message: "User not updated", error: error.message }); // ✅ Returns detailed error message
    }
});

app.get('/approveUser', isAdmin, async (req, res) => {
    try {
        const pendingUsers = await userModel.find({ VisibilityStatus: 'Pending' });
        console.log(pendingUsers)
        res.render('approveUser', { users: pendingUsers });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/update-visibility', async (req, res) => {
    const { userId, status, category } = req.body;

    try {
        await UserDetails.findByIdAndUpdate(userId, {
            VisibilityStatus: status,
            category: category
        });

        res.json({ message: `User status updated to ${status} and category to ${category}` });
    } catch (err) {
        console.error('Update failed:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// add user end functionally here--------------------------------------------------------------------------------------------//////

// show all user for dash board-----------------------------
app.get('/alltoys', (req, res) => {
    res.render('allToysDashboard')
})
// here start for dashboard purpose and 


// LOGIN ROUTE
app.get('/login', isLoginOrNot, (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        console.log("Login request received:", identifier);

        const findUser = await userModel.findOne({
            $or: [{ email: identifier }, { phone: Number(identifier) }]
        });

        if (!findUser) {
            return res.status(400).json({ message: "User not found" });
        }

        // ✅ Check VisibilityStatus
        if (findUser.VisibilityStatus === 'Pending') {
            return res.status(403).json({ message: "Your account is pending approval by admin." });
        }

        if (findUser.VisibilityStatus === 'Rejected') {
            return res.status(403).json({ message: "Your account was rejected by admin." });
        }

        // const isPasswordValid = await bcrypt.compare(password, findUser.password);
        // const isPasswordValid = await 

        if (password !== findUser.password) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // ✅ Set cookies
        res.cookie('email', findUser.email, { httpOnly: true });
        res.cookie('role', findUser.role, { httpOnly: true });

        return res.redirect('/cart');

    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


// app.post('/login', async (req, res) => {
//     try {
//         // const { email, password } = req.body;
//         const { identifier, password } = req.body;
//         console.log("Login request received:", identifier);

//         const findUser = await userModel.findOne({ $or: [{ email: identifier }, { phone: Number(identifier) }] });
//         console.log("geting password", findUser);
//         if (!findUser) {
//             // console.log("User not found");
//             return res.status(400).json({ message: "User not found" });
//         }

//         const isPasswordValid = await bcrypt.compare(password, findUser.password);
//         if (!isPasswordValid) {
//             // console.log("Invalid credentials");
//             return res.status(400).json({ message: "Invalid credentials" });
//         }
//         res.cookie('email', findUser.email, { httpOnly: true });
//         res.cookie('role', findUser.role, { httpOnly: true });
//         // console.log("Redirecting to /cart...");

//         return res.redirect('/cart');
//         // return res.json({ message: "Login successful", redirect: "/cart" });

//     } catch (error) {
//         console.error('Login failed:', error);
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// });


app.get('/toydetails/:id', async (req, res) => {
    try {
        // console.log(req.params.id);
        const toyId = req.params.id;
        // console.log(new ObjectId(toyId))
        const singleToy = await AddToySchema.findById(toyId);

        if (!singleToy) {
            return res.status(404).json({ message: 'Toy not found' });
        }

        // Find related toys by category, excluding the current toy
        const relatedToys = await AddToySchema.find({
            category: singleToy.category, // Match category
            _id: { $ne: singleToy._id }   // Exclude current toy
        }).limit(4); // Limit to 4 related products

        // Render the toydetails view and pass the toy and related toys data
        res.render('toydetails', { singleToy, relatedToys });
    } catch (error) {
        console.log('Error fetching toy details:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


app.get('/faq', (req, res) => {
    res.render('faq')
})
app.get('/dashboard', isAdminOrSupplier, (req, res) => {
    // console.log(req.cookies); // Logs all cookies
    const userRole = req.cookies.role; // Example: Get specific cookie value
    res.render('dashboard', { userRole }); // Pass it to EJS or use as needed
});
app.get('/role', (req, res) => {
    // console.log(req.cookies); // Logs all cookies
    const userRole = req.cookies; // Example: Get specific cookie value
    res.json({ role: userRole }); // Pass it to EJS or use as needed
});

app.get('/sidebar', async (req, res) => {
    try {
        const role = req.cookies.role
        res.json({ "role": role });
    } catch (error) {
        console.log(error)
    }
})


app.get('/changePassword', (req, res) => {
    res.render('changePassword'); // Create change-password.ejs
});
app.post('/changePassword', async (req, res) => {
    try {
        const { email } = req.cookies; // Get the email from cookies (assuming user is logged in)
        const { oldPassword, newPassword } = req.body;

        // Find user in the database
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Verify old password
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Incorrect old password" });
        }

        // Hash the new password
        const saltRounds = 10;
        user.password = await bcrypt.hash(newPassword, saltRounds);
        await user.save();

        res.json({ message: "Password updated successfully!" });

    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


app.post("/logout", (req, res) => {
    try {
        res.clearCookie("role");
        res.clearCookie("email");

        // Ensure response is sent only once
        return res.json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout Error:", error);
        if (!res.headersSent) {  // Prevent duplicate headers issue
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
});




// Start server only after database connection is successful
dbConnected()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Database connection failed:', err);
    });