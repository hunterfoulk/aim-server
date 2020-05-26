const router = require("express").Router();
const pool = require("../db/db");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

router.use(cookieParser());

const corsOptions = {
  origin: "http://localhost:3000",
};

router.use(cors(corsOptions), (req, res, next) => {
  console.log(req.method, req.url);

  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, PATCH, DELETE");
    return res.status(200).json({});
  }

  next();
});

const SECRET =
  "785bc0808e13150aa10d06e563676943d93548e49c93f32a46907b9a5599fd6ee72dd3edac14eef51c22432ce82e90f0187d24d3c44e673af2691e1950c4b265";

router.route("/").get(async (req, res) => {
  res.send("home-route");
});

// SIGNUP //

router.route("/signup").post(async (req, res) => {
  try {
    const random = Math.floor(Math.random(5) * 1000);
    const icon = random;
    const { username } = req.body;
    const { password } = req.body;

    const newUser = await pool.query(
      "INSERT INTO trellousers (username,password,icon) VALUES($1,$2,$3) RETURNING *",
      [username, password, icon]
    );
    res.json(newUser.rows[0]);
    console.log("account created and posted to database");
  } catch (err) {
    console.error(err.message);
  }
});

// LOGIN //
router.route("/login").post(async (req, res) => {
  try {
    const { username } = req.body;
    const { password } = req.body;

    const result = await pool.query(
      "SELECT * FROM trellousers WHERE username = $1 AND password = $2 ",
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
        icon: user.icon,
      };

      const token = jwt.sign(payload, SECRET);

      res.status(200).send({
        payload: payload,
        token: token,
      });
      console.log(payload, token);
    }
  } catch (error) {
    console.log("login error");
    res.status(400).send(error);
  }
});

// TASKS //
router.route("/tasks").get(async (req, res) => {
  try {
    const getTasks = await pool.query("SELECT * FROM tasks");

    res.json(getTasks.rows);
  } catch (error) {
    console.error(error.message);
  }
});

//create new task
router.route("/tasks").post(async (req, res) => {
  try {
    const { starter } = req.body; //obj
    const { users } = req.body; //array with starter as first index
    const { task } = req.body;

    const newTask = await pool.query(
      "INSERT INTO tasks (starter,task,users) VALUES($1,$2,$3) RETURNING *",
      [JSON.stringify(starter), task, JSON.stringify(users)]
    );
    res.status(200).send();
    res.json(newTask.rows);
    console.table("posted to database", newTask.rows);
  } catch (error) {
    console.error(error.message);
  }
});

router.route("/updateTask").get(async (req, res) => {
  try {
    const { task_id } = req.query;
    const { user } = req.query;
    console.log("task_id", task_id);
    console.log("user", user);

    const getUsers = await pool.query(
      "SELECT users FROM tasks WHERE task_id = $1",
      [task_id]
    );
    let users = JSON.stringify(getUsers.rows[0].users);
    let parsedUsers = JSON.parse(users);
    let parsedUser = JSON.parse(user);
    parsedUsers.push(parsedUser);
    console.log(parsedUsers);

    const updateTask = await pool.query(
      "UPDATE tasks SET users = $1 WHERE task_id = $2 RETURNING *",
      [JSON.stringify(parsedUsers), task_id]
    );

    console.log(updateTask.rows[0].users);
    res.status(200).json(updateTask.rows[0].users);
  } catch (error) {
    console.error(error.message);
  }
});

//update task boolean
router.route("/updatetasks").post(async (req, res) => {
  try {
    const { task_id } = req.body;

    const updateTask = await pool.query(
      "UPDATE tasks SET active = NOT active WHERE task_id = $1",
      [task_id]
    );
    res.status(200).json(updateTask.rows);
    console.table("updated in database", updateTask.rows);
  } catch (error) {
    console.error("server error", error.message);
  }
});

module.exports = router;
