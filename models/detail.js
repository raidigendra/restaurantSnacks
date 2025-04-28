let mongoose = require('mongoose');
let Schema = mongoose.Schema;
 
detailSchema = new Schema({
    unique_id: Number,
    Name: String,
    images: [String],  // Array of image filenames
    added_date: {
        type: Date,
        default: Date.now
    } 
}),
Detail = mongoose.model('Detail', detailSchema);

module.exports = Detail;