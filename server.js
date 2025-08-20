// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON

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

// --- AJOUTER STAGIAIRE ---
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

// --- GET ALL STAGIAIRES ---
app.get('/api/stagiaires', (req, res) => {
  console.log('📋 Getting all stagiaires...');
  
  const searchTerm = req.query.search;
  
  if (searchTerm && searchTerm.trim() !== '') {
    // If there's a search term, use search functionality
    const term = `%${searchTerm.trim()}%`;
    const sql = `
      SELECT 
        id,
        cin,
        nom,
        prenom,
        email,
        telephone,
        institut,
        specialite,
        date_debut,
        date_fin,
        objet_stage,
        created_at
      FROM stagiaires
      WHERE cin LIKE ? 
         OR nom LIKE ? 
         OR prenom LIKE ? 
         OR email LIKE ?
         OR institut LIKE ?
         OR specialite LIKE ?
      ORDER BY nom ASC
    `;
    
    console.log('🔍 Searching for:', searchTerm);
    
    db.query(sql, [term, term, term, term, term, term], (err, results) => {
      if (err) {
        console.error('❌ Search error:', err);
        return res.status(500).json({ 
          success: false, 
          message: "Erreur de recherche",
          error: err.message 
        });
      }
      
      console.log(`✅ Found ${results.length} stagiaires matching "${searchTerm}"`);
      res.json({
        success: true,
        data: results,
        count: results.length,
        searchTerm: searchTerm
      });
    });
  } else {
    // No search term, get all stagiaires
    const sql = `
      SELECT 
        id,
        cin,
        nom,
        prenom,
        email,
        telephone,
        institut,
        specialite,
        date_debut,
        date_fin,
        objet_stage,
        created_at
      FROM stagiaires 
      ORDER BY nom ASC
    `;
    
    db.query(sql, (err, results) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: "Erreur de base de données",
          error: err.message 
        });
      }
      
      console.log(`✅ Retrieved ${results.length} stagiaires`);
      res.json({
        success: true,
        data: results,
        count: results.length
      });
    });
  }
});

// --- SEARCH STAGIAIRE (Separate endpoint - kept for compatibility) ---
app.get('/api/stagiaires/search', (req, res) => {
  console.log('🔍 Search endpoint called with query:', req.query);
  
  const termRaw = (req.query.search || '').trim();
  
  if (!termRaw) {
    console.log('⚠️ Empty search term, returning empty array');
    return res.json({
      success: true,
      data: [],
      count: 0,
      message: "Terme de recherche vide"
    });
  }

  const term = `%${termRaw}%`;
  const sql = `
    SELECT
      id,
      cin,
      nom,
      prenom,
      email,
      telephone,
      institut,
      specialite,
      date_debut,
      date_fin,
      objet_stage,
      created_at
    FROM stagiaires
    WHERE cin LIKE ?
       OR nom LIKE ?
       OR prenom LIKE ?
       OR email LIKE ?
       OR institut LIKE ?
       OR specialite LIKE ?
    ORDER BY nom ASC
  `;

  console.log('🔍 Executing search for term:', termRaw);

  db.query(sql, [term, term, term, term, term, term], (err, rows) => {
    if (err) {
      console.error('❌ Search error:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Erreur de base de données',
        error: err.message 
      });
    }
    
    console.log(`✅ Search completed: ${rows.length} results found`);
    res.json({
      success: true,
      data: rows,
      count: rows.length,
      searchTerm: termRaw
    });
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});