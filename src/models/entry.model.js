const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const entrySchema = new Schema({
  name: {
    type: String,
    trim: true
  },
  hits: {
    type: Number,
    trim: true
  },
  misses: {
    type: Number,
    trim: true
  },
  accuracy: {
    type: Number,
    trim: true
  }
});

const Entry = mongoose.model("Entry", entrySchema);

module.exports = Entry;
