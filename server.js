const express = require("express");
const dbConnected = require('./dbConfig');
const toyControlerRoute = require('./controller/toycontroler');
const { render } = require("ejs");


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.set('view engine', "ejs");
const PORT = 3003

app.use('/toys', toyControlerRoute)

app.get('/addtoys', (req, res) => {
    res.render('addToys');
});

app.listen(PORT, () => {
    dbConnected()
    console.log(`Example app listening on port ${PORT}`);

});
