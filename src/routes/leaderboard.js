let Entry = require("../models/entry.model.js");

const router = require("express").Router();

router.route("/").get((req, res) => {
  Entry.find()
    .then((entries) => res.json(entries))
    .catch((err) => res.status(400).json("Error:" + err));
});

router.route("/update").post(async (req, res) => {
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
