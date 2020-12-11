require('dotenv').config();
const express = require('express');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const shortId = require('shortid');
const validUrl = require('valid-url');
const cors = require('cors');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(cors());
app.use(express.json());
app.use('/public', express.static(`${process.cwd()}/public`));
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

//Connecting to MongoDB
const uri = process.env.MONGO_URI;
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 //Setting timeout to 5s instead of 30s
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

//Create URL Model
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original_url: String,
  short_url: String
});

//Create URL model and pass to schema
const URL = mongoose.model("URL", urlSchema);

//URL input + async function
app.post('/api/shorturl/new', async (req, res) => {
  let url = req.body.url_input
  let urlCode = shortId.generate()
  //URL validity check
  if (!validUrl.isWebUri(url)) {
    res.status(401).json({
      error: 'invalid URL'
    })
  } else {
    try {
      //URL db check
      let findOne = await URL.findOne({
        original_url: url
      })
      if (findOne) {
        res.json({
          original_url: findOne.original_url,
          short_url: findOne.short_url
        })
      } else {
        //create new URL and response if not in DB
        findOne = new URL({
          original_url: url,
          short_url: urlCode
        })
        await findOne.save()
        res.json({
          original_url: findOne.original_url,
          short_url: findOne.short_url
        })
      }
    //catch incase it breaks for some reason
    } catch (err) {
      console.error(err)
      res.status(500).json('gg you broke it')
    }
  }
})

//GET Existing URL
app.get('/api/shorturl/:short_url?', async (req, res) => {
  try {
    const urlParams = await URL.findOne({
      short_url: req.params.short_url
    })
    if (urlParams) {
      return res.redirect(urlParams.original_url)
    } else {
      return res.status(404).json('No URL found')
    }
    //error catch
  } catch (err) {
    console.log(err)
    res.status(500).json('Server Error')
  }
})

//App listening notification
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

//DB Connection success notice
const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error'));
connection.once('open', () => {
  console.log("MongoDB connection successful");
})