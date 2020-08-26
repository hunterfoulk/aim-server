const router = require("express").Router();
const Busboy = require("busboy");
const pool = require("../db/mysqldb");
const config = require("../config");
const AWS = require("aws-sdk");
const busboyBodyParser = require("busboy-body-parser");
const busboy = require("connect-busboy");
const jwt = require("jsonwebtoken");
const mysql = require("mysql");
const moment = require("moment");
require("dotenv").config;
router.use(busboy());
router.use(busboyBodyParser());
const { cors, corsOptions } = require("../cors");

var whitelist = ["http://localhost:3000", "http://localhost:9000"];

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

router.route("/").get(async (req, res) => {
  res.send("home-route");
});

const _ = mysql.format;

router.get("/testroute", async (req, res) => {
  await pool.query(
    ` SELECT * FROM huntlistings.categories `,
    (error, results) => {
      if (error) throw error;
      console.table(results);
      res.json(results);
    }
  );
});

////////////////////////SIGNUP//////////////////////
router.post("/signup", async (req, res) => {
  const { email } = req.body;
  const { username } = req.body;
  const { password } = req.body;

  console.log("username", username);
  console.log("password", password);
  console.log("password", email);

  pool.query(
    `
      INSERT INTO users (email,username, password)
      VALUES('${_(email)}', '${_(username)}', '${_(password)}')
      `,
    (error, results) => {
      if (error) throw error;
      console.table(results);
      res.status(200).send("Account created");
    }
  );
});

const SECRET =
  "785bc0808e13150aa10d06e563676943d93548e49c93f32a46907b9a5599fd6ee72dd3edac14eef51c22432ce82e90f0187d24d3c44e673af2691e1950c4b265";
/////////////////////////LOGIN////////////////////////
router.post("/login", async (req, res) => {
  const { email } = req.body;
  const { password } = req.body;

  try {
    pool.query(
      `
      SELECT user_id, email,username
      FROM users
      WHERE email = '${_(email)}' AND password = '${_(password)}'
      `,
      (error, results) => {
        if (error) throw error;
        const validCredentials = results.length > 0;
        if (validCredentials) {
          console.log("Account found");
          const user = {
            user_id: results[0].user_id,
            email: results[0].email,
            username: results[0].username,
          };
          console.table(results);
          const token = jwt.sign(user, SECRET);

          res.status(200).send({ user, token });
        } else {
          console.log("Invalid Credentials");
          res.status(409).end();
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.end();
  }
});

router.get("/users", async (req, res) => {
  pool.query(`SELECT * FROM users`, (error, results) => {
    if (error) throw error;

    console.table(results);

    const users = {
      user_id: results[0].user_id,
      username: results[0].username,
    };

    res.status(200).send(users);
  });
});

///////////////////////////////////////UPLOAD FILE////////////////////////////////////

// const BUCKET_NAME = "airbnbbucket";
// const IAM_USER_KEY = config.iamUser;
// const IAM_USER_SECRET = config.iamSecret;

function uploadToS3(file) {
  let s3bucket = new AWS.S3({
    accessKeyId: IAM_USER_KEY,
    secretAccessKey: IAM_USER_SECRET,
    Bucket: BUCKET_NAME,
  });
  s3bucket.createBucket(function () {
    const path = require("path");

    const name = file.name;
    let newName = path.parse(name).name;
    var params = {
      Bucket: BUCKET_NAME,
      Key: `filesharing/${newName}`,
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
      // console.log(data);
    });
  });
}
router.route("/upload").post(async (req, res) => {
  const { user_id } = req.body;
  const date = moment().format("YYYY-MM-DD  H:mm:ss");
  const payload = req.files;

  // console.log(payload);
  const keys = Object.keys(payload);
  let arr = [];
  keys.forEach((key, i) => {
    arr.push(payload[key]);
  });

  console.log("server array", arr);
  arr.forEach((file) => {
    const path = require("path");
    const name = file.name;
    let newName = path.parse(name).name;

    console.log("NAME", newName);
    const formatByte = (bytes) => {
      let mb = bytes / (1024 * 1024);
      return mb.toFixed(2);
    };
    const size = formatByte(file.size);
    let mimetype = file.mimetype;
    console.log("file type", file.mimetype);

    // if (file.mimetype === "application/x-zip-compressed") {
    //   mimetype = ".zip";
    //   console.log("NEW MIMETYPE", mimetype);
    // }
    var busboy = new Busboy({ headers: req.headers });
    busboy.on("finish", function () {
      console.log("Upload finished");
      console.log(file);
      uploadToS3(file);
    });
    req.pipe(busboy);

    let link = `https://airbnbbucket.s3.us-east-2.amazonaws.com/filesharing/${newName}`;

    pool.query(
      `
              INSERT INTO files (user_id,title,type,size,date,file)  VALUES('${_(
                user_id
              )}', '${_(newName)}', '${_(mimetype)}', '${_(size)}', '${_(
        date
      )}', '${_(link)}')`,
      (error, results) => {
        if (error) console.log(error);
        // res.send("Upload Succes!");
        res.end();
      }
    );
  });
});
router.route("/myfiles").get(async (req, res) => {
  const { user_id } = req.query;
  pool.query(
    `SELECT * FROM files WHERE user_id ='${_(user_id)}' `,
    (error, results) => {
      if (error) console.log(error);
      // console.log(results);
      res.send(results);
    }
  );
});

const BUCKET_NAME = "airbnbbucket";
const IAM_USER_KEY = config.iamUser;
const IAM_USER_SECRET = config.iamSecret;

router.route("/download").get(async (req, res) => {
  const { files } = req.query;
  const { file_id } = req.query;

  let newFile = `filesharing/${files}`;
  console.log("new files", newFile);
  var AWS = require("aws-sdk");
  AWS.config.update({
    accessKeyId: IAM_USER_KEY,
    secretAccessKey: IAM_USER_SECRET,
    region: "us-east-2",
  });
  var s3 = new AWS.S3();
  var options = {
    Bucket: "airbnbbucket",
    Key: newFile,
  };

  res.attachment(newFile);
  var fileStream = s3.getObject(options).createReadStream();
  fileStream.pipe(res);

  pool.query(
    `SELECT * FROM files WHERE file_id ='${_(file_id)}' `,
    (error, results) => {
      if (error) console.log(error);
      let stars = results[0].stars;
      stars++;
      console.log("stars", stars);
      // res.send(results);

      pool.query(
        `UPDATE files SET stars = '${_(stars)}' WHERE file_id ='${_(file_id)}' `
      );
    }
  );
});

router.route("/deletefile").post(async (req, res) => {
  const { file_id } = req.body;

  console.log("file id", file_id);

  pool.query(
    `DELETE FROM files WHERE file_id ='${_(file_id)}' `,
    (error, results) => {
      if (error) console.log(error);

      res.send(results);
    }
  );
});

router.route("/results/:searchterm").get(async (req, res) => {
  const { searchterm } = req.query;
  console.log("search term", searchterm);
  let newTerm = decodeURIComponent(searchterm);

  pool.query(
    `SELECT * FROM files WHERE title LIKE "%${_(searchterm)}%" `,
    (error, results) => {
      if (error) console.log(error);
      console.log("results", results);

      res.send(results);
    }
  );
});

router.route("/current/:file_id").get(async (req, res) => {
  const { file_id } = req.query;
  console.log("file id", file_id);

  /////get file/////
  pool.query(
    `SELECT * FROM files WHERE file_id = "${_(file_id)}" `,
    (error, results) => {
      if (error) console.log(error);

      console.log("user id", results[0].user_id);

      const user_id = results[0].user_id;

      /////get comments/////
      pool.query(
        `SELECT * FROM files a JOIN comments b ON a.file_id = ${_(
          file_id
        )} AND b.file_id = ${_(
          file_id
        )} JOIN users c ON b.user_id = c.user_id  `,
        (error, newresults) => {
          if (error) console.log(error);

          console.log("new results", newresults);

          ///get username of file poster/////
          pool.query(
            `SELECT username FROM users WHERE user_id = "${_(user_id)}" `,
            (error, user) => {
              if (error) console.log(error);

              // console.log("results", results[0]);
              // console.log("user results", user[0]);
              // console.log("COMMENTS RESULTS", comments);

              res.send({
                results: results[0],
                user: user[0],
                newresults: newresults,
                // names: commenterNames,
              });
            }
          );
        }
      );
    }
  );
});

router.route("/postcomment").post(async (req, res) => {
  const { user_id } = req.body;
  const { file_id } = req.body;
  const { comment } = req.body;
  console.log(user_id);
  console.log(file_id);
  console.log(comment);

  pool.query(
    `
      INSERT INTO comments (user_id,file_id,comment)
      VALUES('${_(user_id)}', '${_(file_id)}', '${_(comment)}')
      `,
    (error, results) => {
      if (error) throw error;
      console.table(results);
      res.status(200);
    }
  );
});

// router.route("/postcomment").post(async (req, res) => {
//   const { file_id } = req.query;

//   console.log("fetch comment file id", file_id);
// });

module.exports = router;
