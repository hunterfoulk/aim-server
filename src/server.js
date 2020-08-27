const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config;
const cookieParser = require("cookie-parser");
const serverless = require("serverless-http");
const busboyBodyParser = require("busboy-body-parser");
const busboy = require("connect-busboy");
const pool = require("./db/mysqldb");

const app = express();

app.use(busboy());
app.use(busboyBodyParser());

app.use(cookieParser());

app.use(express.json());

const port = process.env.PORT || 9000;
app.listen(port, () => console.log(`Server running on port: ${port}`));
pool.on("connection", () => console.log("MySQL pool connected"));

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

//Routes
const leaderboardRoute = require("./routes/leaderboard");
app.use("/.netlify/functions/server/leaderboard", leaderboardRoute);

const airbnb = require("./routes/airbnb");
app.use("/.netlify/functions/server/airbnb", airbnb);

const trello = require("./routes/trello");
app.use("/.netlify/functions/server/trello", trello);

const portfolio = require("./routes/portfolio");
app.use("/.netlify/functions/server/portfolio", portfolio);

const typegram = require("./routes/typegram");
app.use("/.netlify/functions/server/typegram", typegram);

const youtube = require("./routes/youtube");
app.use("/.netlify/functions/server/youtube", youtube);

// const filesharing = require("./routes/filesharing");
// app.use("/.netlify/functions/server/filesharing", filesharing);

module.exports = app;
module.exports.handler = serverless(app);
