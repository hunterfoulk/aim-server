const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config;
const cookieParser = require("cookie-parser");
const serverless = require("serverless-http");

const app = express();

app.use(cookieParser());

app.use(
  cors({
    origin: "https://hungry-euler-ec6a3a.netlify.app",
    credentials: true,
  })
);

app.use(express.json());

const port = process.env.PORT || 9000;
app.listen(port, () => console.log(`Server running on port: ${port}`));

//connect to Mongo
const uri =
  "mongodb+srv://hunterfoulk:Murphy01@cluster0-sexjr.mongodb.net/test?retryWrites=true&w=majority";
mongoose.connect(uri, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true,
});
mongoose.set("useFindAndModify", false);
const connection = mongoose.connection;
connection.once("open", () => console.log("MongoDB connected successfully"));

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "https://hungry-euler-ec6a3a.netlify.app"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-type",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, PATCH, DELETE");
    return res.status(200).json({});
  }
  next();
});

//Routes
const leaderboardRoute = require("./routes/leaderboard");
app.use("/.netlify/functions/server/leaderboard", leaderboardRoute);

const airbnb = require("./routes/airbnb");
app.use("/.netlify/functions/server/airbnb", airbnb);

module.exports = app;
module.exports.handler = serverless(app);
