function isAdminOrSupplier(req, res, next) {
    const userRole = req.cookies.role;

    if (!userRole) {
        return res.status(401).send("Unauthorized: No role found.");
    }
    const allowedRoles = ["Admin", "Supplier"];
    if (!allowedRoles.includes(userRole)) {
        return res.status(403).send("Forbidden: You do not have access.");
    }
    next();
}
module.exports = isAdminOrSupplier;