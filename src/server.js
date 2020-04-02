const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config;

const serverless = require("serverless-http");

const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT;
app.listen(port, () => console.log(`Server running on port: ${port}`));

//connect to Mongo
const uri =
  "mongodb+srv://hunterfoulk:Murphy01@cluster0-sexjr.mongodb.net/test?retryWrites=true&w=majority";
mongoose.connect(uri, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true
});
mongoose.set("useFindAndModify", false);
const connection = mongoose.connection;
connection.once("open", () => console.log("MongoDB connected successfully"));

//Cors
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, PATCH, DELETE");
    return res.status(200).json({});
  }
  next();
});

//Router
const router = express.Router();

let Entry = require("./models/entry.model.js");
app.use("/.netlify/functions/server", router);

router.route("/").get((req, res) => {
  Entry.find()
    .then(entries => res.json(entries))
    .catch(err => res.status(400).json("Error:" + err));
});

router.route("/update").post(async (req, res) => {
  let name = req.body.name;
  let hits = req.body.hits;
  let misses = req.body.misses;
  let accuracy = req.body.accuracy;
  console.log("fired");

  try {
    let current = await Entry.findOne({ name: name });
    console.log(current);

    if (current.hits > hits) {
      hits = current.hits;
    }
    //find and update
    let doc = await Entry.findOneAndUpdate(
      { name: name },
      {
        hits: hits,
        misses: misses,
        accuracy: accuracy
      }
    );

    //log new entry
    doc = await Entry.findOne({ name: name });
    console.log(doc);
    res.status(200).json("Entry edit successful");
  } catch (error) {
    console.log("No entry by that name.");
    const newEntry = new Entry({ name, hits, misses, accuracy });
    newEntry
      .save()
      .then(() => res.json("entry created"))
      .catch(err => res.status(400).json("Error:" + error));
  }
});

module.exports = app;

module.exports.handler = serverless(app);
