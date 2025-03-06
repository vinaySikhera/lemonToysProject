const express = require("express");
const { ToyScheema } = require('../modles/toyProductsScheema')

const toyControlerRoute = express.Router();

toyControlerRoute.get('/', (req, res) => {
    res.render('index');
});

toyControlerRoute.post('/addtoys', async (req, res) => {
    console.log(req.body);
    try {
        const addToy = new ToyScheema(req.body);
        await addToy.save();
        res.status(201).json({ message: "new data added" });

    } catch (error) {
        console.log("new data are not added", error)
        res.status(404).json({ message: "new data not added" })
    }
});

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