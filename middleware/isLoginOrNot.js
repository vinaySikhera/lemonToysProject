function isLoginOrNot(req, res, next) {
    const userRole = req.cookies.role;
    const userEmail = req.cookies.email;

    // If user is already logged in, prevent accessing login page
    if (userRole || userEmail) {
        return res.status(403).send("Forbidden: Already logged in.");
    }

    next(); // Proceed if no login info is found
}

module.exports = isLoginOrNot;