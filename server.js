// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require("path");
const fs = require('fs');

const app = express();
const chatRouter = require('./chatbot');


// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON
app.use('/', chatRouter);

// Create pdfs directory if it doesn't exist
const pdfsDir = path.join(__dirname, 'pdfs');
if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir, { recursive: true });
  console.log('📁 Created pdfs directory');
}

// Serve static PDF files from pdfs directory
app.use("/pdfs", express.static(pdfsDir));

// Connect to MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'gestion_stagiaire'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ MySQL Connected');
});

// --- LOGIN API ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const query = "SELECT * FROM utilisateurs WHERE email = ? AND password = ?";
  db.query(query, [email, password], (err, results) => {
    if (err) return res.json({ success: false, message: "Database error" });
    if (results.length > 0) {
      res.json({ success: true, message: "Login successful" });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  });
});

// --- ADD STAGIAIRE ---
app.post('/api/ajouter-stagiaire', (req, res) => {
  const { cin, nom, prenom, email, telephone, institut, specialite, dateDebut, dateFin, objetStage } = req.body;
  const query = `
    INSERT INTO stagiaires
    (cin, nom, prenom, email, telephone, institut, specialite, date_debut, date_fin, objet_stage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(query, [cin, nom, prenom, email, telephone, institut, specialite, dateDebut, dateFin, objetStage], 
    (err, result) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: "Erreur lors de l'ajout du stagiaire" });
      }
      res.json({ success: true, message: "Stagiaire ajouté avec succès !" });
    });
});

// --- GET ALL STAGIAIRES (with optional search) ---
app.get('/api/stagiaires', (req, res) => {
  const searchTerm = req.query.search;
  if (searchTerm && searchTerm.trim() !== '') {
    const term = `%${searchTerm.trim()}%`;
    const sql = `
      SELECT id, cin, nom, prenom, email, telephone, institut, specialite, date_debut, date_fin, objet_stage, created_at
      FROM stagiaires
      WHERE cin LIKE ? OR nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR institut LIKE ? OR specialite LIKE ?
      ORDER BY nom ASC
    `;
    db.query(sql, [term, term, term, term, term, term], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: "Erreur de recherche", error: err.message });
      res.json({ success: true, data: results, count: results.length, searchTerm });
    });
  } else {
    const sql = `
      SELECT id, cin, nom, prenom, email, telephone, institut, specialite, date_debut, date_fin, objet_stage, created_at
      FROM stagiaires
      ORDER BY nom ASC
    `;
    db.query(sql, (err, results) => {
      if (err) return res.status(500).json({ success: false, message: "Erreur de base de données", error: err.message });
      res.json({ success: true, data: results, count: results.length });
    });
  }
});

// --- GET STAGIAIRE BY ID ---
app.get('/api/stagiaires/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM stagiaires WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'Intern not found' });
    res.json(results[0]);
  });
});

// --- UPDATE STAGIAIRE ---
app.put('/api/stagiaires/:id', (req, res) => {
  const { id } = req.params;
  const { cin, nom, prenom, email, telephone, institut, specialite, dateDebut, dateFin, objetStage } = req.body;
  const sql = `
    UPDATE stagiaires
    SET cin = ?, nom = ?, prenom = ?, email = ?, telephone = ?, institut = ?, specialite = ?, date_debut = ?, date_fin = ?, objet_stage = ?
    WHERE id = ?
  `;
  db.query(sql, [cin, nom, prenom, email, telephone, institut, specialite, dateDebut, dateFin, objetStage, id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: "Erreur lors de la modification du stagiaire" });
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Stagiaire non trouvé" });
    res.json({ success: true, message: "Stagiaire modifié avec succès !" });
  });
});

// --- DELETE STAGIAIRE ---
app.delete('/api/stagiaires/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM stagiaires WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: "Erreur lors de la suppression" });
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Stagiaire non trouvé" });
    res.json({ success: true, message: "Stagiaire supprimé avec succès !" });
  });
});

// --- SEARCH STAGIAIRE ---
app.get('/api/stagiaires/search', (req, res) => {
  const termRaw = (req.query.search || '').trim();
  if (!termRaw) return res.json({ success: true, data: [], count: 0, message: "Terme de recherche vide" });

  const term = `%${termRaw}%`;
  const sql = `
    SELECT id, cin, nom, prenom, email, telephone, institut, specialite, date_debut, date_fin, objet_stage, created_at
    FROM stagiaires
    WHERE cin LIKE ? OR nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR institut LIKE ? OR specialite LIKE ?
    ORDER BY nom ASC
  `;
  db.query(sql, [term, term, term, term, term, term], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Erreur de base de données', error: err.message });
    res.json({ success: true, data: rows, count: rows.length, searchTerm: termRaw });
  });
});

// --- GET STAGIAIRE DATA FOR FRONTEND PDF ---
app.get('/api/attestation/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM stagiaires WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'Stagiaire non trouvé' });

    const stagiaire = results[0];

    // Only send stagiaire data, frontend handles PDF generation
    res.json({ success: true, data: stagiaire });
  });
});

// --- START SERVER ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📁 PDFs will be accessible at http://localhost:${PORT}/pdfs/`);
});
