const cors = require("cors");

const corsOptions = (whitelist) => {
  return {
    origin: function (origin, callback) {
      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true);
        console.log("whitelist success", whitelist);
      } else {
        callback(new Error("Not allowed by CORS"));
        console.log("whitelist fail", whitelist);
      }
    },
    credentials: true,
  };
};

module.exports = { cors, corsOptions };
