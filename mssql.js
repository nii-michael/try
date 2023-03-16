const express = require('express');
const mssql = require('mssql');
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

async function connect() {
  try {
    await pool.connect();
    console.log('Connected to database');
  } catch (err) {
    console.error('Error connecting to database:', err);
  }
}

connect();

// Validate ticket endpoint
app.post('/validate-ticket', async (req, res, next) => {
  try {
    const { ticketNo } = req.body;
    const connection = await pool.request();
    const result = await connection
      .input('ticketNo', mssql.NVarChar(50), ticketNo)
      .query('SELECT * FROM tickets WHERE TicketNumber = @ticketNo');

    if (result.recordset && result.recordset.length === 0) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).send('Ticket does not exist.');
    }

    if (result.recordset[0].Winner === 0) {
      return res.status(HTTP_STATUS_CODES.NOT_WIN).send('Not a winning ticket.');
    }

    if (result.recordset[0].Paid === 1) {
      return res.status(HTTP_STATUS_CODES.NOT_WP).send('Paid winning ticket.');
    }

    return res.status(HTTP_STATUS_CODES.OK).send('Winning ticket not paid.');
  } catch (err) {
    console.error(err);
    return next(err);
  }
});

// Capture pay details endpoint
app.post('/capture-pay-details', async (req, res, next) => {
  try {
    const { Surname, FirstName, PhoneNumber, PhoneNetwork, IdType, IdNumber, AmountPaid, method, ticket } = req.body;

    // Validate ticket
    const validateRes = await axios.post('http://desktop-gr6r3m1:5000/validate-ticket', { ticketNo: ticket });
    if (validateRes.status !== HTTP_STATUS_CODES.OK) {
      if (validateRes.status === HTTP_STATUS_CODES.NOT_FOUND) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).send('Ticket does not exist.');
      } else if (validateRes.status === HTTP_STATUS_CODES.NOT_WIN) {
        return res.status(HTTP_STATUS_CODES.NOT_WIN).send('Not a winning ticket.');
      } else if (validateRes.status === HTTP_STATUS_CODES.NOT_WP) {
        return res.status(HTTP_STATUS_CODES.NOT_WP).send('Paid winning ticket.');
      } else {
        return res.status(HTTP_STATUS_CODES.SERVER_ERROR).send('An error occurred while validating ticket.');
      }
    }

    // Update ticket payment details
    const connection = await pool.request();
    const result = await connection
      .input('surname', mssql.VarChar, Surname)
      .input('firstName', mssql.VarChar, FirstName)
      .input('phoneNumber', mssql.VarChar, PhoneNumber)
      .input('phoneNetwork', mssql.VarChar, PhoneNetwork)
      .input('idType', mssql.VarChar, IdType)
      .input('idNumber', mssql.VarChar, IdNumber)
      .input('amountPaid', mssql.Decimal, AmountPaid)
      .input('method', mssql.VarChar, method)
      .input('ticket', mssql.VarChar, ticket)
      .query( 'UPDATE tickets SET Surname = @surname, FirstName = @firstName, PhoneNumber = @phoneNumber, PhoneNetwork = @phoneNetwork, IdType = @idType, IdNumber = @idNumber, AmountPaid = @amountPaid, method = @method, Paid = 1, PaidDate_time = GETDATE() WHERE TicketNumber = @ticket ');
      if (result.rowsAffected[0] === 0) {
        return res.status(HTTP_STATUS_CODES.SERVER_ERROR).send('An error occurred while updating ticket payment details.');
      }
      
      return res.status(HTTP_STATUS_CODES.OK).send('Details captured successfully.');
    } catch (err) {
      console.error('Error executing update query:', err);
      return res.status(HTTP_STATUS_CODES.SERVER_ERROR).send(err.response.data);
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
      