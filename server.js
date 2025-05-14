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
const orderModel = require('./models/orderModel');
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
// change only add to cart section 01-05-2025 
app.post('/add-to-cart', async (req, res) => {
    try {
        const { _id, quantity } = req.body;
        const email = req.cookies?.email;

        // Find the user
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Find the product (optional, only to validate existence)
        const product = await AddToySchema.findById(_id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if the cart item already exists
        const existingItem = await userCart.findOne({
            userId: user._id.toString(),
            productId: product._id.toString(),
        });

        if (existingItem) {
            existingItem.quantity += parseInt(quantity) || 1;
            await existingItem.save();
        } else {
            const newItem = new userCart({
                userId: user._id.toString(),
                productId: product._id.toString(),
                quantity: parseInt(quantity) || 1,
            });

            await newItem.save();
        }

        res.status(200).json({ message: 'Item added to cart!' });
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).json({ message: 'Failed to add item to cart' });
    }
});



app.post('/confirm-order', async (req, res) => {
    try {
        const { orderDetails } = req.body;

        if (!Array.isArray(orderDetails) || orderDetails.length === 0) {
            return res.status(400).json({ success: false, message: 'No order details provided.' });
        }

        const email = req.cookies?.email;
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found.' });
        }

        const userId = user._id;

        // Convert orderDetails to cartItems array
        const cartItems = await Promise.all(orderDetails.map(async item => {
            const product = await AddToySchema.findOne({ ProductName: item.name });

            if (!product) {
                throw new Error(`Product not found for name: ${item.name}`);
            }

            return {
                productId: product._id,
                quantity: Number(item.quantity) || 1
            };
        }));

        // Create and save a single order with all cartItems
        const newOrder = new orderModel({
            userId,
            cartItems,
            status: 'Pending'
        });

        const savedOrder = await newOrder.save();

        res.status(200).json({ success: true, message: 'Order confirmed!', data: savedOrder });

    } catch (err) {
        console.error('Error in /confirm-order:', err);
        res.status(500).json({ success: false, message: 'Server error during order confirmation.' });
    }
});


app.get('/placed-orders', isAdmin, async (req, res) => {
  try {
    const email = req.cookies?.email;
    const user = await userModel.findOne({ email });
    console.log('user', user);

    let query = {};
    if (user && user.role !== 'Admin') {
      query.userId = user._id; // Non-admin users see only their orders
    }

    const orders = await orderModel.find(query)
      .sort({ createdAt: -1 })
      .populate('cartItems.productId')
      .populate('userId'); // This already gives you name, email, etc.

    const formattedOrders = orders.map(order => {
      const userCategory = order.userId?.category || 'D';
      const username = order.userId?.name || 'Unknown User';

      const items = order.cartItems.map(ci => {
        const product = ci.productId;
        const basePrice = product?.Price || 0;
        const dynamicKey = 'Price' + userCategory;
        const finalPrice = product?.[dynamicKey] || basePrice;

        return {
          name: product?.ProductName || 'Unknown Product',
          image: product?.ProductImageURL || '',
          qrCodeUrl: product?.qrCodeUrl || '',
          quantity: ci.quantity,
          displayPrice: `${basePrice + finalPrice}`,
          unitPrice: finalPrice,
          productOwner: product?.ProductOwner,
          username: username // pulled directly from order.userId
        };
      });

      return {
        _id: order._id,
        status: order.status,
        createdAt: order.createdAt,
        items
      };
    });

    res.render('placedorder', { orders: formattedOrders, user });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).send('Internal Server Error');
  }
});



app.patch('/close-order/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await orderModel.findByIdAndUpdate(id, { status: 'Closed' }, { new: true });

        if (!updated) return res.status(404).json({ success: false, message: "Order not found." });

        res.json({ success: true, message: "Order closed." });
    } catch (err) {
        console.error("Error closing order:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});


app.get('/cart', async (req, res) => {
    const { email, role, Category } = req.cookies;

    if (!email) return res.status(401).redirect("/login");
    if (role === "Supplier") return res.status(401).redirect("/");

    try {
        const user = await userModel.findOne({ email });
        if (!user) return res.status(404).render("error", { message: "User not found" });

        const cartItems = await userCart.find({ userId: user._id });

        // Format cart with final price based on Category
        const formattedCart = await Promise.all(
            cartItems.map(async (item) => {
                const product = await AddToySchema.findById(item.productId);

                const basePrice = product?.Price || 0;
                console.log("basePrice in /cart", basePrice)
                const dynamicKey = 'Price' + Category;
                console.log("dynamicKey in /cart", dynamicKey)
                const dynamicPrice = product?.[dynamicKey] || 0;
                console.log("dynamicPrice in /cart", dynamicPrice)
                const finalPrice = basePrice + dynamicPrice;
                console.log("finalPrice in /cart", finalPrice)

                return {
                    _id: item._id, // cart item ID
                    name: product?.ProductName || "Unknown",
                    image: product?.ProductImageURL || "",
                    price: finalPrice, // 👈 Use computed price here
                    quantity: item.quantity,
                    qrCodeUrl: product?.qrCodeUrl || ""
                };
            })
        );

        res.render("addToCart", {
            cart: formattedCart,
            user: role
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

        const { name, phone, email, password, address, role, Category } = req.body;
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
            password,
            category: Category.toUpperCase()
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
        // console.log(allusers)

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

        const updateUser = await userModel.findByIdAndUpdate(id, {
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
        // console.log(pendingUsers)
        res.render('approveUser', { users: pendingUsers });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/update-visibility', async (req, res) => {
    const { userId, status, category } = req.body;

    try {
        await userModel.findByIdAndUpdate(userId, {
            VisibilityStatus: status,
            category: category
        });

        res.json({ message: `User status updated to ${status} and category to ${category}` });
    } catch (err) {
        console.error('Update failed:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.post('/update-cart', async (req, res) => {
    const { id, quantity } = req.body;
    try {
        await userCart.findByIdAndUpdate(id, {
            quantity: quantity
        }, { new: true })
        res.json({ message: `cart quantity updated ${quantity}` })
    } catch (error) {
        console.log('update failed in cart', error);
        res.status(500).json({ error: "failed to cart quantity" })
    }
})
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
        // console.log("Login request received:", identifier);

        const isPhone = !isNaN(identifier); // check if numeric
        const findUser = await userModel.findOne(
            isPhone
                ? { phone: Number(identifier) }
                : { email: identifier }
        );

        if (!findUser) {
            return res.status(400).json({ message: "User not found" });
        }

        if (findUser.VisibilityStatus === 'Pending') {
            return res.status(403).json({ message: "Your account is pending approval by admin." });
        }

        if (findUser.VisibilityStatus === 'Rejected') {
            return res.status(403).json({ message: "Your account was rejected by admin." });
        }

        if (password !== findUser.password) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        res.cookie('email', findUser.email, { httpOnly: true });
        res.cookie('role', findUser.role, { httpOnly: true });
        res.cookie('Category', findUser.category, { httpOnly: true });

        return res.status(200).json({ message: "Login successful" }); // ✅ for frontend handling

    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


// and same price calculation for toy details page
app.get('/toydetails/:id', async (req, res) => {
    try {
        const { email, role, Category } = req.cookies;
        if (!email) return res.status(401).redirect("/login");
        const toyId = req.params.id;
        const singleToy = await AddToySchema.findById(toyId);

        if (!singleToy) {
            return res.status(404).json({ message: 'Toy not found' });
        }

        // Final price calculation
        const dynamicKey = 'Price' + Category;
        console.log("dynamicKey", dynamicKey)
        const basePrice = singleToy.Price || 0;
        console.log("basePrice", basePrice)
        const dynamicPrice = singleToy[dynamicKey] || 0;
        console.log("dynamicPrice", dynamicPrice)
        const finalPrice = basePrice + dynamicPrice;
        console.log("finalPrice", finalPrice)

        // Find related toys
        const relatedToysRaw = await AddToySchema.find({
            category: singleToy.category,
            _id: { $ne: singleToy._id }
        }).limit(4);
 
        // Add finalPrice to each toy
        const relatedToys = relatedToysRaw.map(toy => {
            const basePrice = toy.Price || 0;
            const dynamicKey = 'Price' + Category;
            const dynamicPrice = toy[dynamicKey] || 0;
            const finalPrice = basePrice + dynamicPrice;

            return {
                ...toy.toObject(),
                finalPrice
            };
        });
        // Send all to EJS
        res.render('toydetails', {
            singleToy,
            relatedToys,
            finalPrice // Pass calculated price
        });
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