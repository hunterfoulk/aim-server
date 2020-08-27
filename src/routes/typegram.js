const { cors, corsOptions } = require("../cors");
const router = require("express").Router();
const Busboy = require("busboy");
const pool = require("../db/db");
const config = require("../config");
const AWS = require("aws-sdk");
const busboyBodyParser = require("busboy-body-parser");
const busboy = require("connect-busboy");
const jwt = require("jsonwebtoken");
require("dotenv").config;
router.use(busboy());
router.use(busboyBodyParser());

var whitelist = "https://typegram.netlify.app";

router.use(cors(corsOptions(whitelist)), (req, res, next) => {
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, PATCH, DELETE");
    return res.status(200).json({});
  }
  console.log("cors fired");
  next();
});

const SECRET =
  "785bc0808e13150aa10d06e563676943d93548e49c93f32a46907b9a5599fd6ee72dd3edac14eef51c22432ce82e90f0187d24d3c44e673af2691e1950c4b265";

router.route("/").get(async (req, res) => {
  res.send("home-route");
});

const BUCKET_NAME = "airbnbbucket";
const IAM_USER_KEY = config.iamUser;
const IAM_USER_SECRET = config.iamSecret;

//signup s3 post
function uploadToS3(file) {
  let s3bucket = new AWS.S3({
    accessKeyId: IAM_USER_KEY,
    secretAccessKey: IAM_USER_SECRET,
    Bucket: BUCKET_NAME,
  });
  s3bucket.createBucket(function () {
    var params = {
      Bucket: BUCKET_NAME,
      Key: `instaclonefolder/${file.name}`,
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

// update profile pic
function uploadProfilePicToS3(file) {
  let s3bucket = new AWS.S3({
    accessKeyId: IAM_USER_KEY,
    secretAccessKey: IAM_USER_SECRET,
    Bucket: BUCKET_NAME,
  });
  s3bucket.createBucket(function () {
    var params = {
      Bucket: BUCKET_NAME,
      Key: `instacloneprofilepics/${file.name}`,
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

//picture s3 post
function postUploadToS3(file) {
  let s3bucket = new AWS.S3({
    accessKeyId: IAM_USER_KEY,
    secretAccessKey: IAM_USER_SECRET,
    Bucket: BUCKET_NAME,
  });
  s3bucket.createBucket(function () {
    var params = {
      Bucket: BUCKET_NAME,
      Key: `instacloneposts/${file.name}`,
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

router.route("/posts").get(async (req, res) => {
  try {
    const getPosts = await pool.query("SELECT * FROM posts ORDER BY post_id");

    res.json(getPosts.rows);
  } catch (error) {
    console.error(error.message);
  }
});

router.route("/accountfeed").get(async (req, res) => {
  try {
    const { user_id } = req.query;
    console.log(user_id);

    const getPosts = await pool.query(
      "SELECT * FROM posts WHERE user_id = $1",
      [user_id]
    );
    res.json(getPosts.rows);
  } catch (error) {
    console.error(error.message);
  }
});

router.route("/posts").post(async (req, res) => {
  try {
    const { poster } = req.body;
    const { caption } = req.body;
    const { userId } = req.body;

    var busboy = new Busboy({ headers: req.headers });
    const file = req.files.img;

    busboy.on("finish", function () {
      console.log("Upload finished");

      console.log(file);
      uploadProfilePicToS3(file);
    });
    req.pipe(busboy);
    let users = [];
    let comments = [];

    const newPost = await pool.query(
      "INSERT INTO posts (poster,caption,user_id,img,users,comments) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      [
        poster,
        caption,
        parseInt(userId),
        `https://airbnbbucket.s3.us-east-2.amazonaws.com/instacloneprofilepics/${file.name}`,
        JSON.stringify(users),
        JSON.stringify(comments),
      ]
    );

    res.json(newPost.rows).end();

    console.table("posted to database", newPost.rows);
  } catch (error) {
    console.log(error.message);
  }
});

router.route("/signup").post(async (req, res) => {
  try {
    const { username } = req.body;
    const { password } = req.body;

    var busboy = new Busboy({ headers: req.headers });
    const file = req.files.img;

    busboy.on("finish", function () {
      console.log("Upload finished");

      console.log(file);
      uploadToS3(file);
    });
    req.pipe(busboy);
    let bio = "";
    let website = "";
    let name = "";

    const newUsers = await pool.query(
      "INSERT INTO instagramusers (username,password,img,bio,name,website) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      [
        username,
        password,
        `https://airbnbbucket.s3.us-east-2.amazonaws.com/instaclonefolder/${file.name}`,
        bio,
        name,
        website,
      ]
    );
    res.status(200).json(newUsers.rows);
    console.table("posted to database", newUsers.rows);
  } catch (error) {
    console.log(error.message);
  }
});

router.route("/login").post(async (req, res) => {
  try {
    const { username } = req.body;
    const { password } = req.body;

    const result = await pool.query(
      "SELECT * FROM instagramusers WHERE username = $1 AND password =$2",
      [username, password]
    );

    const user = result.rows[0];
    console.table(user);

    if (!user) {
      res.statusMessage(401).send({
        error: "Login failed! Check log in credentials",
      });
    } else {
      const payload = {
        username: username,
        password: password,
        user_id: user.user_id,
        img: user.img,
        bio: user.bio,
        website: user.website,
        name: user.name,
        likes: user.likes,
      };

      const token = jwt.sign(payload, SECRET);
      res.status(200).send({
        payload: payload,
        token: token,
      });
      console.log(payload, token);
    }
  } catch (error) {
    console.error("server login error", error);
  }
});

router.route("/updatelikes").get(async (req, res) => {
  try {
    const { postId } = req.query;
    const { newLikes } = req.query;
    const { user } = req.query;
    console.log("post_id", postId);
    console.log("new likes", newLikes);
    console.log("new user", user);

    const getUsers = await pool.query(
      "SELECT users FROM posts WHERE post_id = $1",
      [postId]
    );
    let users = JSON.stringify(getUsers.rows[0].users);
    let parsedUsers = JSON.parse(users);
    let parsedUser = JSON.parse(user);
    parsedUsers.push(parsedUser);

    const updatePost = await pool.query(
      "UPDATE posts SET likes = $1, users = $2 WHERE post_id = $3 ",
      [newLikes, JSON.stringify(parsedUsers), postId]
    );

    console.log(updatePost.rows[0]);
    res.status(200).json(updatePost.rows[0]);
  } catch (error) {
    console.error(error.message);
  }
});

router.route("/updatecomments").get(async (req, res) => {
  try {
    const { post_id } = req.query;
    const { comment } = req.query;
    console.log("post id", post_id);
    console.log("post comment", comment);

    const getComments = await pool.query(
      "SELECT comments FROM posts WHERE post_id = $1",
      [post_id]
    );
    let comments = JSON.stringify(getComments.rows[0].comments);
    let parsedComments = JSON.parse(comments);
    let parsedComment = JSON.parse(comment);
    parsedComments.push(parsedComment);
    console.log(comments);
    console.log(parsedComments);

    const updateComments = await pool.query(
      "UPDATE posts SET comments = $1 WHERE post_id = $2 ",
      [JSON.stringify(parsedComments), post_id]
    );
    console.log(updateComments.rows[0]);
    res.status(200).json(updateComments.rows[0]);
  } catch (error) {
    console.error(error.message);
  }
});

router.route("/updatepic").post(async (req, res) => {
  try {
    const { user_id } = req.body;

    var busboy = new Busboy({ headers: req.headers });
    const file = req.files.img;
    console.log("server img", file);
    console.log("server user id", user_id);

    busboy.on("finish", function () {
      console.log("Upload finished");

      console.log(file);
      uploadProfilePicToS3(file);
    });
    req.pipe(busboy);

    const updatePic = await pool.query(
      "UPDATE instagramusers SET img = $1 WHERE user_id = $2",
      [
        `https://airbnbbucket.s3.us-east-2.amazonaws.com/instacloneprofilepics/${file.name}`,
        parseInt(user_id),
      ]
    );
    console.log(updatePic.rows[0]);

    const newPic = await pool.query(
      "SELECT * FROM instagramusers WHERE user_id = $1 ",
      [user_id]
    );

    let user = newPic.rows[0];

    const payload = {
      username: user.username,
      password: user.password,
      user_id: user.user_id,
      img: user.img,
    };

    res.status(200).send({ payload: payload });
    console.log("payload", payload);
  } catch (error) {
    console.error(error.message);
  }
});

router.route("/getuser").get(async (req, res) => {
  try {
    const { user_id } = req.query;

    const getUser = await pool.query(
      "SELECT * FROM instagramusers WHERE user_id = $1",
      [user_id]
    );

    console.log(getUser.rows[0]);
    res.status(200).json(getUser.rows[0]);
  } catch (error) {
    console.error(error.message);
  }
});

router.route("/updatemisc").post(async (req, res) => {
  try {
    const { bio } = req.body;
    const { website } = req.body;
    const { name } = req.body;
    const { user_id } = req.body;
    console.log("bio", bio);
    console.log("name", name);
    console.log("website", website);
    console.log("user_id", user_id);

    if (bio && website && name) {
      const updateMisc = await pool.query(
        "UPDATE instagramusers SET bio = $1, website = $2, name = $3 WHERE user_id = $4",
        [bio, website, name, parseInt(user_id)]
      );

      console.log(updateMisc.rows[0]);

      const newMisc = await pool.query(
        "SELECT * FROM instagramusers WHERE user_id = $1 ",
        [user_id]
      );

      let user = newMisc.rows[0];

      const payload = {
        username: user.username,
        password: user.password,
        user_id: user.user_id,
        img: user.img,
        bio: user.bio,
        website: user.website,
        name: user.name,
      };

      res.status(200).send({ payload: payload });
      console.log("payload", payload);
      ////////////////////////////////////////////////////////////////////////////////////////////////
    } else if (name === "" && bio === "") {
      const updateMisc = await pool.query(
        "UPDATE instagramusers SET website = $1 WHERE user_id = $2",
        [website, parseInt(user_id)]
      );

      console.log(updateMisc.rows[0]);

      const newMisc = await pool.query(
        "SELECT * FROM instagramusers WHERE user_id = $1 ",
        [user_id]
      );

      let user = newMisc.rows[0];

      const payload = {
        username: user.username,
        password: user.password,
        user_id: user.user_id,
        img: user.img,
        bio: user.bio,
        website: user.website,
        name: user.name,
      };

      res.status(200).send({ payload: payload });
      console.log("payload", payload);
      ///////////////////////////////////////////////////////////////////////////////////////////////////
    } else if (website === "" && name === "") {
      const updateMisc = await pool.query(
        "UPDATE instagramusers SET bio = $1 WHERE user_id = $2",
        [bio, parseInt(user_id)]
      );

      console.log(updateMisc.rows[0]);

      const newMisc = await pool.query(
        "SELECT * FROM instagramusers WHERE user_id = $1 ",
        [user_id]
      );

      let user = newMisc.rows[0];

      const payload = {
        username: user.username,
        password: user.password,
        user_id: user.user_id,
        img: user.img,
        bio: user.bio,
        website: user.website,
        name: user.name,
      };

      res.status(200).send({ payload: payload });
      console.log("payload", payload);
      ////////////////////////////////////////////////////////////////////////////////////////////////
    } else if (bio === "" && website === "") {
      const updateMisc = await pool.query(
        "UPDATE instagramusers SET name = $1 WHERE user_id = $2",
        [name, parseInt(user_id)]
      );

      console.log(updateMisc.rows[0]);

      const newMisc = await pool.query(
        "SELECT * FROM instagramusers WHERE user_id = $1 ",
        [user_id]
      );

      let user = newMisc.rows[0];

      const payload = {
        username: user.username,
        password: user.password,
        user_id: user.user_id,
        img: user.img,
        bio: user.bio,
        website: user.website,
        name: user.name,
      };

      res.status(200).send({ payload: payload });
      console.log("payload", payload);
      /////////////////////////////////////////////////////////////////////////////////////////////////
    } else if (bio && name) {
      const updateMisc = await pool.query(
        "UPDATE instagramusers SET bio = $1, name = $2 WHERE user_id = $3",
        [bio, name, parseInt(user_id)]
      );

      console.log(updateMisc.rows[0]);

      const newMisc = await pool.query(
        "SELECT * FROM instagramusers WHERE user_id = $1 ",
        [user_id]
      );

      let user = newMisc.rows[0];

      const payload = {
        username: user.username,
        password: user.password,
        user_id: user.user_id,
        img: user.img,
        bio: user.bio,
        website: user.website,
        name: user.name,
      };

      res.status(200).send({ payload: payload });
      console.log("payload", payload);
      /////////////////////////////////////////////////////////////////////////////////////////////////
    } else if (bio && website) {
      const updateMisc = await pool.query(
        "UPDATE instagramusers SET bio = $1, website = $2 WHERE user_id = $3",
        [bio, website, parseInt(user_id)]
      );

      console.log(updateMisc.rows[0]);

      const newMisc = await pool.query(
        "SELECT * FROM instagramusers WHERE user_id = $1 ",
        [user_id]
      );

      let user = newMisc.rows[0];

      const payload = {
        username: user.username,
        password: user.password,
        user_id: user.user_id,
        img: user.img,
        bio: user.bio,
        website: user.website,
        name: user.name,
      };

      res.status(200).send({ payload: payload });
      console.log("payload", payload);
      /////////////////////////////////////////////////////////////////////////////////////////////////
    } else if (website && name) {
      const updateMisc = await pool.query(
        "UPDATE instagramusers SET website = $1, name = $2 WHERE user_id = $3",
        [website, name, parseInt(user_id)]
      );

      console.log(updateMisc.rows[0]);

      const newMisc = await pool.query(
        "SELECT * FROM instagramusers WHERE user_id = $1 ",
        [user_id]
      );

      let user = newMisc.rows[0];

      const payload = {
        username: user.username,
        password: user.password,
        user_id: user.user_id,
        img: user.img,
        bio: user.bio,
        website: user.website,
        name: user.name,
      };

      res.status(200).send({ payload: payload });
      console.log("payload", payload);
    }
  } catch (error) {
    console.log("server error", error);
  }
});

module.exports = router;
