const router = require("express").Router();
const AWS = require("aws-sdk");
const config = require("../config");
require("dotenv").config;
const pool = require("../db/db");
const jwt = require("jsonwebtoken");

const SECRET =
  "785bc0808e13150aa10d06e563676943d93548e49c93f32a46907b9a5599fd6ee72dd3edac14eef51c22432ce82e90f0187d24d3c44e673af2691e1950c4b265";

const BUCKET_NAME = "airbnbbucket";
const IAM_USER_KEY = config.iamUser;
const IAM_USER_SECRET = config.iamSecret;

function uploadToS3(file) {
  let s3bucket = new AWS.S3({
    accessKeyId: IAM_USER_KEY,
    secretAccessKey: IAM_USER_SECRET,
    Bucket: BUCKET_NAME,
  });
  s3bucket.createBucket(function () {
    var params = {
      Bucket: BUCKET_NAME,
      Key: `airbnbfolder/${file.name}`,
      Body: file.data,
      ACL: "public-read",
      ContentType: file.mimetype,
    };
    console.log("this is the image metadeta", params);
    s3bucket.upload(params, function (err, data) {
      if (err) {
        console.log("error in callback");
        console.log(err);
      }
      console.log("success");
      console.log(data);
    });
  });
}

//middleware
const auth = async (req, res, next) => {
  const token = req.cookies.access_token;
  res.header(
    "Access-Control-Allow-Origin",
    "https://hungry-euler-ec6a3a.netlify.app"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-type",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  console.log("cookies", token);

  try {
    const userAuth = jwt.verify(token, SECRET);
    res.user = userAuth;
  } catch (error) {
    res.status(400);
    throw error;
  }
  next();
  res.status(200);
};

router.route("/").get(async (req, res) => {
  res.send("home-route");
});

router.route("/houses").get(async (req, res) => {
  try {
    const getHouses = await pool.query("SELECT * FROM house");
    res.json(getHouses.rows);
  } catch (err) {
    console.error(err.message);
  }
});

router.route("/houses").post(auth, async (req, res) => {
  try {
    const { location } = req.body;
    const { beds } = req.body;
    const { baths } = req.body;
    const { price } = req.body;
    const { owner } = req.body;

    var busboy = new Busboy({ headers: req.headers });
    const file = req.files.img;

    busboy.on("finish", function () {
      console.log("Upload finished");

      console.log(file);
      uploadToS3(file);
    });
    req.pipe(busboy);

    const newHouse = await pool.query(
      "INSERT INTO house (owner,location,beds,baths,price,img) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      [
        owner,
        location,
        beds,
        baths,
        price,
        `https://airbnbbucket.s3.us-east-2.amazonaws.com/airbnbfolder/${file.name}`,
      ]
    );

    res.json(newHouse.rows);

    console.log("posted to database");
  } catch (err) {
    console.error(err.message);
  }
});

//signup
router.route("/signup").post(async (req, res) => {
  try {
    const { email } = req.body;
    const { username } = req.body;
    const { password } = req.body;

    const newUser = await pool.query(
      "INSERT INTO users (email,username,password) VALUES($1,$2,$3) RETURNING *",
      [email, username, password]
    );
    res.json(newUser.rows[0]);
    console.log("account created and posted to database");
  } catch (err) {
    console.error(err.message);
  }
});

//login
router.route("/login").post(async (req, res) => {
  try {
    const { email } = req.body;
    const { username } = req.body;
    const { password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND username = $2 AND password = $3",
      [email, username, password]
    );
    const user = result.rows[0];
    console.table(user);

    if (!user) {
      res.status(401).send({
        error: "Login failed! Check log in credentials",
      });
    } else {
      const payload = {
        email: email,
        username: username,
        user_id: user.user_id,
      };
      console.log("made it here");
      const token = jwt.sign(payload, SECRET);

      res.cookie("access_token", token, {
        maxAGE: 10000,
        httpOnly: false,
        secure: false,
      });

      res.status(200).send({
        payload: payload,
      });
      console.log(payload, token);
    }
  } catch (error) {
    console.log("login error");
    res.status(400).send(error);
  }
});

module.exports = router;
