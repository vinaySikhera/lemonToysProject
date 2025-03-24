const express = require("express");
const dbConnected = require('./dbConfig');
const toyControlerRoute = require('./controller/toycontroler');
const { ToyScheema } = require('./models/toyProductsScheema')
const path = require("path");
const userModel = require('./models/userDetails'); // Fixed spelling issue from "modles" to "models"
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

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

app.get('/checkout', (req, res) => {
    res.render('checkoutpage');
});

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
        const { role, name, email, password } = req.body;

        // Check if the user already exists
        const isUserAlready = await userModel.findOne({ email });
        if (isUserAlready) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Use bcrypt for secure password hashing instead of Cryptr
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const userDetails = {
            role,
            name,
            email,
            password: hashedPassword
        };

        const addNewUser = new userModel(userDetails);
        await addNewUser.save(); // Ensuring user is saved before redirecting

        res.redirect('/login'); // Removed extra res.json() to avoid multiple responses
    } catch (error) {
        console.error('Error registering new user:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// LOGIN ROUTE
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        console.log("Login request received:", email, role);

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

        if (findUser.role.toLowerCase() !== role.toLowerCase()) {
            console.log("Invalid role:", findUser.role, role);
            return res.status(400).json({ message: "Invalid role" });
        }

        res.cookie('email', email, { httpOnly: true });
        res.cookie('role', role, { httpOnly: true });
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
        const singleToy = await ToyScheema.findById(req.params.id);
        if (!singleToy) {
            return res.status(404).json({ message: 'Toy not found' });
        }

        // Find related products by category, excluding the current product
        const relatedToys = await ToyScheema.find({
            category: singleToy.category, // Match the category
            _id: { $ne: singleToy._id }   // Exclude the current toy
        }).limit(4); // Limit the number of related products shown

        res.render('toydetails', { singleToy, relatedToys });
    } catch (error) {
        console.log('Error fetching toy details:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.get('/faq', (req, res) => {
    res.render('faq')
})

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
