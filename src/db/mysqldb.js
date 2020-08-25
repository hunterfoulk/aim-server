const mysql = require("mysql");
const config = require("../config");
// const PASS = process.env.MYSQLPASS;

//LOCALHOST
const pool = mysql.createConnection({
  user: "root",
  password: "Murphy01",
  database: "filesharing",
  host: "localhost",
  port: 3306,
  multipleStatements: true,
});

pool.connect(function (err) {
  if (err) {
    return console.error("error: " + err.message);
  }

  console.log("Connected to the MySQL server.");
});

module.exports = pool;
