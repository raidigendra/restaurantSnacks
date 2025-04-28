const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const Detail = require('./models/detail');
const fs = require('fs');
const dir = './uploads';

// Connect to MongoDB with error handling
mongoose.connect('mongodb://localhost/uploadFiles')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      callback(null, './uploads');
    },
    filename: (req, file, callback) => {
      callback(null, 'image-' + Date.now() + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.gif') {
      return callback(new Error('Only image files are allowed'));
    }
    callback(null, true);
  }
});

const app = express();

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static('uploads'));

// Routes
app.get('/', (req, res) => {
  Detail.find({}).sort({ added_date: -1 })
    .then(data => {
      res.render('index', { data: data });
    })
    .catch(err => {
      console.error('Error fetching images:', err);
      res.render('index', { data: [] });
    });
});

// Recent uploads page
app.get('/recent', (req, res) => {
  Detail.find({})
    .sort({ added_date: -1 })
    .limit(12)
    .then(data => {
      res.render('recent', { data: data });
    })
    .catch(err => {
      console.error('Error fetching recent images:', err);
      res.render('recent', { data: [] });
    });
});

// Handle image upload
app.post('/upload', upload.array('images'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No images uploaded' });
    }

    // Get the next unique ID
    const lastDetail = await Detail.findOne().sort({ unique_id: -1 });
    const uniqueId = lastDetail ? lastDetail.unique_id + 1 : 1;

    // Create new detail with uploaded images
    const detail = new Detail({
      unique_id: uniqueId,
      Name: req.body.title,
      images: req.files.map(file => file.filename)
    });

    await detail.save();
    res.redirect('/');
  } catch (err) {
    console.error('Error uploading images:', err);
    res.status(500).json({ success: false, message: 'Error uploading images' });
  }
});

// Handle delete
app.post('/delete', async (req, res) => {
  try {
    const detail = await Detail.findById(req.body.prodId);
    if (!detail) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    // Delete associated image files
    for (const image of detail.images) {
      const imagePath = `./uploads/${image}`;
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete the database record
    await Detail.findByIdAndRemove(req.body.prodId);
    res.redirect('/recent');
  } catch (err) {
    console.error('Error deleting record:', err);
    res.status(500).json({ success: false, message: 'Error deleting record' });
  }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`You can access the application at: http://localhost:${port}`);
});