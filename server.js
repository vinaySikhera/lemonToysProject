const express = require("express");
const dbConnected = require('./dbConfig');
const toyControlerRoute = require('./controller/toycontroler');
const { ToyScheema } = require('./models/toyProductsScheema')
const path = require("path");
const userModel = require('./models/userDetails'); // Fixed spelling issue from "modles" to "models"
const { AddUsersScheema } = require('./models/addUser')
const cookieParser = require('cookie-parser');
const AddToySchema = require('./models/toyAddProductScheema')
const bcrypt = require('bcrypt');
const upload = require('./middleware/fileUpload');
const { findByIdAndUpdate } = require("./models/toyAddProductScheema");
const { ObjectId } = require('mongodb'); // Import ObjectId from MongoDB driver
const mongoose = require('mongoose')
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.use(cookieParser()); // Added cookie-parser middleware before accessing cookies

const staticPath = path.join(__dirname, "public");
app.use(express.static(staticPath));
app.set('view engine', "ejs");

const PORT = 3003;

app.use('/toys', toyControlerRoute);

// Routes
app.get('/contact', (req, res) => {
    res.render('contact');
});

// app.get('/checkout', (req, res) => {
//     res.render('checkoutpage');
// });

app.get('/cart', async (req, res) => {
    try {
        // Extract only email and role from cookies (Remove password check)
        const { email, role } = req.cookies;
        // If email or role is missing, redirect to login
        if (!email || !role) {
            console.log("Missing email or role in cookies. Redirecting to login...");
            return res.redirect('/login');
        }

        // Find the user in the database
        const user = await userModel.findOne({ email });
        if (!user) {
            console.log("User not found in database. Redirecting to login...");
            return res.redirect('/login');
        }

        // Fix role validation (Case-insensitive check)
        if (user.role.toLowerCase() !== role.toLowerCase()) {
            console.log(`Role mismatch: Expected ${user.role}, Got ${role}. Redirecting to login...`);
            return res.redirect('/login');
        }

        // If all checks pass, render the cart page
        let cart = [];
        res.render('addToCart', { cart });
    } catch (error) {
        console.error('Authorization error:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


// REGISTER ROUTE
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if the user already exists
        const isUserAlready = await userModel.findOne({ email });
        if (isUserAlready) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Use bcrypt for secure password hashing instead of Cryptr
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const userDetails = {
            name,
            email,
            password: hashedPassword,
            role: "Customer"
        };

        const addNewUser = new userModel(userDetails);
        await addNewUser.save(); // Ensuring user is saved before redirecting

        res.redirect('/login'); // Removed extra res.json() to avoid multiple responses
    } catch (error) {
        console.error('Error registering new user:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// add user start here----------------------------------------------------------------------------

app.get('/adduser', (req, res) => {
    res.render('addUser');
});

app.post('/adduser', upload.single('profilePic'), async (req, res) => {
    try {
        const { userCategory, name, phone, email, password, profilePic, address, about, status, role } = req.body;
        console.log(req.body)
        // Check if the user already exists
        const isUserAlready = await AddUsersScheema.findOne({ email });
        if (isUserAlready) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Use bcrypt for secure password hashing instead of Cryptr
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const getImage = req.file.path;
        // const getImage = req.file ? `/uploads/${req.file.filename}` : null;

        const userDetails = {
            userCategory,
            phone,
            profilePic: getImage,
            address,
            status,
            about,
            role,
            name,
            email,
            password: hashedPassword
        };
        const addNewUser = new AddUsersScheema(userDetails);
        await addNewUser.save(); // Ensuring user is saved before redirecting
        res.json({ message: "new user added successfully" })
        // res.redirect('/login'); // Removed extra res.json() to avoid multiple responses
    } catch (error) {
        console.error('Error registering new user:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.patch('/updateuser/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(id)
        const { userCategory, name, phone, email, password, profilePic, address, about, status } = req.body;
        await AddUsersScheema.findByIdAndUpdate(id, { userCategory, name, phone, email, password, profilePic, address, about, status })
        res.status(201).json({ message: "user update successfully" })
    } catch (error) {
        res.status(404).json({ message: "new user not update successfully" });
    }
})

app.delete('/deleteuser/:id', async (req, res) => {
    try {
        const { id } = req.params
        await AddUsersScheema.findByIdAndDelete(id);
        res.status(201).json({ message: "user delete successfully" });
    } catch (error) {
        res.status(404).json({ message: "user delete successfully" })
    }
})


app.get('/allusers', async (req, res) => {
    try {
        const { role } = req.query; // Get role from query parameters
        let query = {};

        if (role) {
            query.role = role; // Apply role filter if provided
        }

        const allusers = await AddUsersScheema.find(query);
        console.log(allusers);

        res.render('getAllUsers', { allusers, selectedRole: role || "" });

    } catch (err) {
        res.status(404).json({ message: "Users not found" });
    }
});



app.get('/viewUser/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const viewUser = await AddUsersScheema.findById(id);
        if (!viewUser) {
            return res.status(404).json({ message: "viewUser not found in your database" })
        }
        console.log(viewUser);
        res.render('userdetails', { viewUser })
    } catch (error) {
        res.status(404).json({ message: "viewUser not found here", error })
    }
});


app.get('/editUser/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const editUser = await AddUsersScheema.findById(id);
        if (!editUser) {
            return res.status(404).json({ message: "editUser not found in your database" })
        }
        console.log(editUser);
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

        console.log("User updated:", updateUser);
        res.redirect(`/viewUser/${id}`);

    } catch (error) {
        console.error("Error updating user:", error); // ✅ Logs actual error
        res.status(500).json({ message: "User not updated", error: error.message }); // ✅ Returns detailed error message
    }
});

// add user end functionally here--------------------------------------------------------------------------------------------//////

// show all user for dash board-----------------------------
app.get('/alltoys', (req, res) => {
    res.render('allToysDashboard')
})
// here start for dashboard purpose and 


// LOGIN ROUTE
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Login request received:", email);

        const findUser = await userModel.findOne({ email });
        if (!findUser) {
            console.log("User not found");
            return res.status(400).json({ message: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, findUser.password);
        if (!isPasswordValid) {
            console.log("Invalid credentials");
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // if (findUser.role.toLowerCase() !== role.toLowerCase()) {
        //     console.log("Invalid role:", findUser.role, role);
        //     return res.status(400).json({ message: "Invalid role" });
        // }

        res.cookie('email', email, { httpOnly: true });
        res.cookie('role', findUser.role, { httpOnly: true });
        console.log("Redirecting to /cart...");

        return res.redirect('/cart');
        // return res.json({ message: "Login successful", redirect: "/cart" });

    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


app.get('/toydetails/:id', async (req, res) => {
    try {
        console.log(req.params.id);
        const toyId = req.params.id;
        // console.log(new ObjectId(toyId))
        const singleToy = await AddToySchema.findById(toyId);
        // const singleToy = await AddToySchema.findOne({ ProductName:"009 GUN"});
        // const singleToy = await AddToySchema.findOne({ _id:new ObjectId('67e538a9bf7ce9253fcd471c')});
        // const singleToy = await AddToySchema.findOne({_id:toyId});

        console.log(singleToy)
        // If the toy is not found, return a 404 response
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
app.get('/dashboard', (req, res) => {
    res.render('dashboard')
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
app.post('/logout', (req, res) => {
    res.clearCookie('email');
    res.clearCookie('role');


    res.redirect('/login');
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
