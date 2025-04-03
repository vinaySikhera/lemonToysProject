module.exports = function (req, res, next) {
    const userRole = req.cookies.role; // Get the role from cookies

    if (!userRole) {
        return res.status(401).send("Unauthorized: No role found.");
    }

    if (userRole.toLowerCase() !== "admin") {
        return res.status(403).send("Forbidden: You do not have access.");
    }

    next(); // If the user is an Admin, continue to the route
};
