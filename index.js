const express = require("express");
const app = express();
app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path");
const { request } = require("http");
const dbPath = path.join(__dirname, "user.db");

app.use(cors());
const PORT = 3000;

let db;
//sqlite setup

const initilizeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log("Error :", error);
  }
};

initilizeDbAndServer();

//Registered Route

app.post("/register", async (request, response) => {
  const { username, password } = request.body;
  const hashedPass = await bcrypt.hash(password, 10);

  const checkingUserQuery = `select * from user where username = '${username}'`;

  const isUserFound = await db.get(checkingUserQuery);
  if (isUserFound === undefined) {
    const userInsertQuery = `
            insert into user (username, password) values('${username}','${hashedPass}')
        `;
    const dbResponse = await db.run(userInsertQuery);
    response.status(201);
    response.send({ message: "User registered successfully" });
  } else {
    response.status(400);
    return response.send({ error: "Username already exists" });
  }
});

//login Route

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const findingUserQuery = `
        select * from user where username = '${username}'
    `;

  const user = await db.get(findingUserQuery);
  if (user === undefined) {
    response.status(400);
    return response.send({ error: "User not found, Please Registered." });
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (isPasswordMatch) {
    const token = await jwt.sign({ username: user.username }, "private-key", {
      expiresIn: "1h",
    });

    response.status(200);
    response.json({ token, message: "Login successful" });
  } else {
    response.status(401);
    response.send({ error: "Invalid username and password" });
  }
});

// Home page

app.get("/home", async (request, response) => {
  let jwtToken = request.headers["authorization"];
  if (jwtToken !== undefined) {
    jwtToken = jwtToken.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    return response.json({ message: "1Invalid Token" });
  }

  jwt.verify(jwtToken, "private-key", async (error, payload) => {
    if (error) return response.status(403).json({ message: "2Inavlid Token" });
    const allUsersQuery = `
          select * from user
      `;
    const usersData = await db.all(allUsersQuery);
    response.status(200);
    const filteredUserData = usersData.map((each) => {
      return each.username;
    });
    return response.send({
      userInfo: filteredUserData,
      loginUser: payload.username,
    });
  });
});
