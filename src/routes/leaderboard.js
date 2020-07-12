const router = require("express").Router();
const { cors, corsOptions } = require("../cors");
var whitelist = [
  "http://localhost:3000",
  "https://keen-pike-e36229.netlify.app",
];

router.use(cors(corsOptions(whitelist)), (req, res, next) => {
  console.log("cors fired");
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

let Entry = require("../models/entry.model.js");

router.route("/").get((req, res) => {
  Entry.find()
    .then((entries) => res.json(entries))
    .catch((err) => res.status(400).json("Error:" + err));
});

router.post("/update", cors(corsOptions(whitelist)), async (req, res) => {
  let name = req.body.name;
  let hits = req.body.hits;
  let misses = req.body.misses;
  let accuracy = req.body.accuracy;

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
        accuracy: accuracy,
      }
    );

    //log new entry
    doc = await Entry.findOne({ name: name });
    console.log(doc);
    res.status(200).json("Entry edit successful");
  } catch (error) {
    const newEntry = new Entry({ name, hits, misses, accuracy });
    newEntry
      .save()
      .then(() => res.json("entry created"))
      .catch((err) => res.status(400).json("Error:" + error));
  }
});

module.exports = router;
