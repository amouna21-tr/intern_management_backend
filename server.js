const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MySQL Workbench DB
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',             // your MySQL username
  password: '0000',         // your MySQL password
  database: 'gestion_stagiaire' // your French DB name
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ MySQL Connected');
});

// Login API
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM utilisateurs WHERE email = ? AND password = ?",
    [email, password],
    (err, results) => {
      if (err) return res.json({ success: false, message: "Database error" });

      if (results.length > 0) {
        res.json({ success: true, message: "Login successful" });
      } else {
        res.json({ success: false, message: "Invalid credentials" });
      }
    }
  );
});

// Start server
app.listen(3000, () => {
  console.log("🚀 Backend running on http://localhost:3000");
});
