const express = require('express');
const mssql = require('mssql');
const sql = require('mssql');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');


dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const HTTP_STATUS_CODES = {
  OK: 200,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  NOT_WIN: 444,
  NOT_WP: 433
};

app.use(cors());
app.use(express.json());

const pool = new mssql.ConnectionPool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  options: {
    trustServerCertificate: true,
    enableArithAbort: true // recommended option for SQL Server
  }
});

pool.connect()
  .then((pool) => {
    console.log('Connected to database');
  })
  .catch((err) => {
    console.error('Error connecting to database:', err);
  });

//add columns
app.post('/add-columns', async (req, res, next) => {
  try {
    const connection = await pool.request();
    await connection.query(`
    ALTER TABLE tickets
ADD Surname VARCHAR(255),
    FirstName VARCHAR(255),
    PhoneNumber VARCHAR(255),
    PhoneNetwork VARCHAR(255),
    IdType VARCHAR(255),
    IdNumber VARCHAR(255),
    AmountPaid DECIMAL(10,2),
    method VARCHAR(255),
    PaidDate_Time DATETIME
`);

    return res.status(HTTP_STATUS_CODES.OK).send('New columns added to table.');
  } catch (err) {
    console.error(err);
    return next(err);
  }
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error processing request:', err);
  return res.status(HTTP_STATUS_CODES.SERVER_ERROR).send('An error occurred while processing your request. Please try again.');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

