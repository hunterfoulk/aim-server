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
const { cors, corsOptions } = require("../cors");

var whitelist = ["http://localhost:3000"];

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

  const BUCKET_NAME = "airbnbbucket";
  const IAM_USER_KEY = config.iamUser;
  const IAM_USER_SECRET = config.iamSecret;

  router.route("/").get(async (req, res) => {
    res.send("home-route");
  });

  router.route("/register").post(async (req, res) => {
    try {
      const { email } = req.body;
      const { password } = req.body;
      const { name } = req.body;

      let defaultPic =
        "https://airbnbbucket.s3.us-east-2.amazonaws.com/youtubeusers/default.png";
      let defaultBanner =
        "https://airbnbbucket.s3.us-east-2.amazonaws.com/youtubeusers/defaultbanner.jpg";
      let subscribers = [];
      let likes = [];

      console.log("email", email);
      console.log("password", password);
      console.log("name", name);

      const newUsers = await pool.query(
        "INSERT INTO youtubeusers (email,name,password,pic,banner,subscribers,likes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [
          email,
          name,
          password,
          defaultPic,
          defaultBanner,
          JSON.stringify(subscribers),
          JSON.stringify(likes),
        ]
      );

      res.status(200).json(newUsers.rows);
      console.table("posted to database", newUsers.rows);
    } catch (error) {
      console.log(error.message);
    }
  });
});

router.route("/login").post(async (req, res) => {
  const SECRET =
    "785bc0808e13150aa10d06e563676943d93548e49c93f32a46907b9a5599fd6ee72dd3edac14eef51c22432ce82e90f0187d24d3c44e673af2691e1950c4b265";
  try {
    const { email } = req.body;
    const { password } = req.body;

    const result = await pool.query(
      "SELECT * FROM youtubeusers WHERE email = $1 AND password = $2",
      [email, password]
    );

    const user = result.rows[0];
    console.table(user);

    if (!user) {
      res.statusMessage(401).send({
        error: "Login failed! Check log in credentials",
      });
    } else {
      const payload = {
        email: email,
        password: password,
        pic: user.pic,
        name: user.name,
        about: user.about,
        banner: user.banner,
        subcount: user.subcount,
        subscribers: user.subscribers,
        user_id: user.user_id,
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

const BUCKET_NAME = "airbnbbucket";
const IAM_USER_KEY = config.iamUser;
const IAM_USER_SECRET = config.iamSecret;

// update profile pic
function updateUserData(arg) {
  let s3bucket = new AWS.S3({
    accessKeyId: IAM_USER_KEY,
    secretAccessKey: IAM_USER_SECRET,
    Bucket: BUCKET_NAME,
  });
  s3bucket.createBucket(function () {
    var params = {
      Bucket: BUCKET_NAME,
      Key: `youtubeclonepics/${arg.name}`,
      Body: arg.data,
      ACL: "public-read",
      ContentType: arg.mimetype,
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

///////// ****************** UPLOAD PROFILE *************** /////////////////
router.route("/update").post(async (req, res) => {
  try {
    const { name } = req.body;
    const { about } = req.body;
    const { user_id } = req.body;

    console.log("user_id", user_id);
    console.log("name", name);
    console.log("about", about);

    var busboy = new Busboy({ headers: req.headers });
    const banner = req.files.bannerFile;
    const pic = req.files.picFile;

    busboy.on("finish", async function () {
      console.log("Upload finished");
      console.log("avatar upload", pic);
      console.log("banner upload", banner);
      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      if (banner && pic) {
        updateUserData(banner);
        updateUserData(pic);
        const newBanner = `https://airbnbbucket.s3.us-east-2.amazonaws.com/youtubeclonepics/${banner.name}`;
        const newPic = `https://airbnbbucket.s3.us-east-2.amazonaws.com/youtubeclonepics/${pic.name}`;

        const updateUser = await pool.query(
          "UPDATE youtubeusers SET banner = $1, pic = $2, name = $3, about = $4 WHERE user_id = $5",
          [newBanner, newPic, name, about, parseInt(user_id)]
        );

        console.log(updateUser.rows[0]);

        const newUserData = await pool.query(
          "SELECT * FROM youtubeusers WHERE user_id = $1 ",
          [user_id]
        );

        let user = newUserData.rows[0];

        const payload = {
          user_id: user.user_id,
          banner: user.banner,
          pic: user.pic,
          name: user.name,
          about: user.about,
          subcount: user.subcount,
          subscribers: user.subscribers,
        };

        res.status(200).send({ payload: payload });

        console.log("avatar", pic);
        console.log("banner", banner);
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      } else if (banner) {
        updateUserData(banner);

        const newBanner = `https://airbnbbucket.s3.us-east-2.amazonaws.com/youtubeclonepics/${banner.name}`;

        const updateUser = await pool.query(
          "UPDATE youtubeusers SET banner = $1,  name = $2, about = $3 WHERE user_id = $4",
          [newBanner, name, about, parseInt(user_id)]
        );

        console.log(updateUser.rows[0]);

        const newUserData = await pool.query(
          "SELECT * FROM youtubeusers WHERE user_id = $1 ",
          [user_id]
        );

        let user = newUserData.rows[0];

        const payload = {
          user_id: user.user_id,
          banner: user.banner,
          pic: user.pic,
          name: user.name,
          about: user.about,
          subcount: user.subcount,
          subscribers: user.subscribers,
          likes: user.likes,
        };

        res.status(200).send({ payload: payload });

        console.log("banner", banner);
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      } else if (pic) {
        updateUserData(pic);

        const newPic = `https://airbnbbucket.s3.us-east-2.amazonaws.com/youtubeclonepics/${pic.name}`;

        const updateUser = await pool.query(
          "UPDATE youtubeusers SET pic = $1, name = $2, about = $3 WHERE user_id = $4",
          [newPic, name, about, parseInt(user_id)]
        );

        console.log(updateUser.rows[0]);

        const newUserData = await pool.query(
          "SELECT * FROM youtubeusers WHERE user_id = $1 ",
          [user_id]
        );

        let user = newUserData.rows[0];

        const payload = {
          user_id: user.user_id,
          banner: user.banner,
          pic: user.pic,
          name: user.name,
          about: user.about,
          subcount: user.subcount,
          subscribers: user.subscribers,
          likes: user.likes,
        };

        res.status(200).send({ payload: payload });

        console.log("if statement avatar", pic);

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      } else {
        const updateUser = await pool.query(
          "UPDATE youtubeusers SET name = $1, about = $2 WHERE user_id = $3",
          [name, about, parseInt(user_id)]
        );

        console.log(updateUser.rows[0]);

        const newUserData = await pool.query(
          "SELECT * FROM youtubeusers WHERE user_id = $1 ",
          [user_id]
        );

        let user = newUserData.rows[0];

        const payload = {
          user_id: user.user_id,
          banner: user.banner,
          pic: user.pic,
          name: user.name,
          about: user.about,
          subcount: user.subcount,
          subscribers: user.subscribers,
          likes: user.likes,
        };

        res.status(200).send({ payload: payload });
      }
    });
    req.pipe(busboy);
  } catch (error) {
    console.error("server update error", error);
  }
});

/////////////// ****************** UPLOAD VIDEO *************** //////////////////
function uploadVideo(video) {
  let s3bucket = new AWS.S3({
    accessKeyId: IAM_USER_KEY,
    secretAccessKey: IAM_USER_SECRET,
    Bucket: BUCKET_NAME,
  });
  s3bucket.createBucket(function () {
    var params = {
      Bucket: BUCKET_NAME,
      Key: `youtubevideos/${video.name}`,
      Body: video.data,
      ACL: "public-read",
      ContentType: video.mimetype,
    };
    console.log("this is the video metadeta", params);
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

router.route("/upload").post(async (req, res) => {
  try {
    const { title } = req.body;
    const { description } = req.body;
    const { user_id } = req.body;
    const { uploader } = req.body;
    const { uploaderPic } = req.body;
    let comments = [];

    console.log("video title", title);
    console.log("video description", description);
    console.log("video user_id", user_id);

    var busboy = new Busboy({ headers: req.headers });
    const video = req.files.videoFile;

    busboy.on("finish", function () {
      console.log("Upload finished");

      console.log("busboy video", video);
      uploadVideo(video);
    });
    req.pipe(busboy);

    const link = `https://airbnbbucket.s3.us-east-2.amazonaws.com/youtubevideos/${video.name}`;

    const newVideo = await pool.query(
      "INSERT INTO videos (title,description,comments,link,user_id,uploader,uploaderpic) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [
        title,
        description,
        JSON.stringify(comments),
        link,
        parseInt(user_id),
        uploader,
        uploaderPic,
      ]
    );

    res.status(200).json(newVideo.rows);
    console.log(newVideo.rows);
  } catch (error) {
    console.log(error, "server upload video error");
  }
});

// router.route("/allvideos").get(async (req, res) => {
//   try {
//     const getVideos = await pool.query(
//       "SELECT * FROM youtubeusers JOIN videos ON youtubeusers.user_id = videos.user_id"
//     );

//     res.json(getVideos.rows);
//     console.log(getVideos.rows);
//   } catch (error) {
//     console.log(error, "server join error");
//   }
// });

router.route("/myvideos").get(async (req, res) => {
  try {
    const { user_id } = req.query;
    const getVideos = await pool.query(
      "SELECT * FROM videos WHERE user_id = $1 ORDER BY video_id",
      [user_id]
    );

    res.json(getVideos.rows);
    // console.log(getVideos.rows);
  } catch (error) {
    console.log(error, "server join error");
  }
});

router.route("/allvideos").get(async (req, res) => {
  try {
    const getVideos = await pool.query(
      "SELECT * FROM videos ORDER BY video_id"
    );

    res.json(getVideos.rows);
    // console.log(getVideos.rows);
  } catch (error) {
    console.log(error, "server join error");
  }
});

/////////////// ****************** ADD NEW COMMENTS *************** //////////////////
router.route("/updatecomments").get(async (req, res) => {
  try {
    const { video_id } = req.query;
    const { comment } = req.query;
    console.log("post id", video_id);
    console.log("post comment", comment);

    const getComments = await pool.query(
      "SELECT comments FROM videos WHERE video_id = $1",
      [video_id]
    );
    let comments = JSON.stringify(getComments.rows[0].comments);
    let parsedComments = JSON.parse(comments);
    let parsedComment = JSON.parse(comment);
    parsedComments.push(parsedComment);
    console.log(comments);
    console.log(parsedComments);

    const updateComments = await pool.query(
      "UPDATE videos SET comments = $1 WHERE video_id = $2 ",
      [JSON.stringify(parsedComments), video_id]
    );
    console.log(updateComments.rows[0]);
    res.status(200).json(updateComments.rows[0]);
  } catch (error) {
    console.error(error.message);
  }
});

router.route("/currentvideo").get(async (req, res) => {
  try {
    const { videoContent } = req.query;
    console.log("vid content", videoContent);

    const getVideo = await pool.query(
      "SELECT * FROM videos WHERE video_id = $1",
      [videoContent]
    );

    console.log(getVideo.rows[0]);
    res.status(200).json(getVideo.rows[0]);
  } catch (error) {
    console.error(error.message);
  }
});

router.route("/updatelikes").post(async (req, res) => {
  try {
    const { video_id } = req.body;
    const { user_id } = req.body;
    const { newLikedVid } = req.body;
    const { newLikes } = req.body;
    console.log("new liked vid", newLikedVid);
    console.log("new likes", newLikes);

    const getLikes = await pool.query(
      "SELECT likes FROM youtubeusers WHERE user_id = $1",
      [user_id]
    );
    let likes = JSON.stringify(getLikes.rows[0].likes);
    let parsedLikes = JSON.parse(likes);
    // let parsedVid = JSON.parse(newLikedVid);
    parsedLikes.push(newLikedVid);
    console.log("parsed", parsedLikes);
    // console.log("parsed like", parsedVid);
    console.log(getLikes.rows[0].likes);

    const updateUser = await pool.query(
      "UPDATE youtubeusers SET likes = $1 WHERE user_id = $2 ",
      [JSON.stringify(parsedLikes), user_id]
    );

    const updateVideo = await pool.query(
      "UPDATE videos SET likes = $1 WHERE video_id = $2 ",
      [newLikes, video_id]
    );

    const userData = await pool.query(
      "SELECT * FROM youtubeusers WHERE user_id = $1 ",
      [user_id]
    );
    console.log("update users", updateUser);
    let user = userData.rows[0];

    const payload = {
      email: user.email,
      password: user.password,
      pic: user.pic,
      name: user.name,
      about: user.about,
      banner: user.banner,
      subcount: user.subcount,
      subscribers: user.subscribers,
      user_id: user.user_id,
      likes: user.likes,
    };
    console.log(updateVideo.rows[0]);
    res.status(200).send({ payload: payload });
  } catch (error) {
    console.error("server update likes error", error);
  }
});

module.exports = router;
