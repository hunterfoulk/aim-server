const router = require("express").Router();
const cors = require("cors");
// var whitelist = ["http://localhost:3000", "https://hunterfoulk.com/"];
const nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
require("dotenv").config();

const corsOptions = {
  origin: "https://hunterfoulk.com",
  credentials: true,
};

router.use(cors(corsOptions), (req, res, next) => {
  console.log(req.method, req.url);

  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, PATCH, DELETE");
    return res.status(200).json({});
  }

  next();
});

router.route("/").get(async (req, res) => {
  res.send("home-route");
});

router.post("/sendemail", async (req, res) => {
  const { name } = req.body;
  const { email } = req.body;
  const { message } = req.body;
  console.log("this is the body", req.body);
  exports.handler = function (event, context, callback) {
    let mailOptions = {
      to: "hunterfoulkdev@gmail.com",
      from: "huntertehjakey@hotmail.com",
      subject: `New Inquiry (${name})`,
      html: `
      <table style="max-width: 700px; width: 100%;">
      <tr>
        <td>
        <h1 style="text-align: center; font-family: Arial; border-bottom: 1px solid black; padding-bottom: 10px; margin-bottom: 20px;">
          Inquiry
        </td>
      </tr>
     
      <tr>
        <td style="font-family: Arial; padding-top: 20px;">
          <span style="font-weight: bold">Name: </span>
          <span>${name}</span>
        </td>
      </tr>
      <tr>
        <td style="font-family: Arial; padding-top: 10px;">
          <span style="font-weight: bold">Email: </span>
          <span>${email}</span>
        </td>
      </tr>
      <tr>
        <td>
        <div style="font-family: Arial; width: 100%; box-sizing: border-box; padding: 0 10px; margin-top: 20px; border: 1px solid black; border-radius: 5px;">
          <p style="font-weight: bold">Message:</p>
          <p>${message}</p>
        </div>
        </td>
      </tr>
      <tr>
      </tr>
    </table>
    `,
    };

    let transporter = nodemailer.createTransport(
      smtpTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: "hunterfoulkdev@gmail.com",
          pass: "Hunterfoulk01",
        },
        tls: {
          ciphers: "SSLv3",
        },
      })
    );

    ransporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        const response = {
          statusCode: 500,
          body: JSON.stringify({
            error: error.message,
          }),
        };
        callback(null, response);
      }
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          message: `Email processed succesfully!`,
        }),
      };
      callback(null, response);
    });
  };
});

module.exports = router;
