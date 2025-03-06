const mongoose = require('mongoose');

const dbConnected = async() => {
    try {
        await mongoose.connect('mongodb://localhost:27017')
        console.log('database  connected')
    } catch (error) {
        console.log("data base is not connect ", error);
    }
}
module.exports=dbConnected;
