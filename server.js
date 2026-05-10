require("dotenv").config();
const express = require("express");

const app = express();
const server = require("http").createServer(app);

app.use(express.json());
app.use(express.urlencoded({ limit: "100mb", extended: true }));

const PORT = process.env.PORT || 5001;
const ENV = process.env.NODE_ENV;

app.listen(PORT, () => {
  console.log(`Server is in ${ENV.toUpperCase()} mode`);
  console.log(`Server is live on http://localhost:${PORT}`);
});
