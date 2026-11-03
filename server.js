const express = require("express");
const cors = require("cors");
const errorHandler = require("./helper/errorHandler");
const { databaseConnection } = require("./helper/commonFunctions");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const err = new Error("The CORS policy does not allow this origin");
    err.status = 403;
    return callback(err);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
};

databaseConnection();
app.use(cors(corsOptions));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use("/api/v1/user", require("./routes/user.route"));
app.use("/api/v1/clinics", require("./routes/clinic.route"));
app.use("/api/v1/patients", require("./routes/patient.route"));
app.use("/api/v1/visits", require("./routes/visit.route"));
app.use("/api/v1/expenses", require("./routes/expense.route"));
app.use("/api/v1/medicines", require("./routes/medicine.route"));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
