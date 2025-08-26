// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require("path");
const fs = require('fs');
const puppeteer = require("puppeteer"); // ✅ Added Puppeteer

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON

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

// Make db available globally for chatbot
global.db = db;

// Include chatbot routes AFTER db is defined
const chatRouter = require('./chatbot');
app.use('/', chatRouter);

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
  
  // Check if CIN already exists
  const checkQuery = 'SELECT id FROM stagiaires WHERE cin = ?';
  db.query(checkQuery, [cin], (checkErr, checkResults) => {
    if (checkErr) {
      console.error(checkErr);
      return res.json({ success: false, message: "Erreur lors de la vérification du CIN" });
    }
    
    if (checkResults.length > 0) {
      return res.json({ success: false, message: "Un stagiaire avec ce CIN existe déjà" });
    }
    
    // Insert new stagiaire
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
        res.json({ success: true, message: "Stagiaire ajouté avec succès !", id: result.insertId });
      });
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
      ORDER BY created_at DESC, nom ASC
    `;
    db.query(sql, [term, term, term, term, term, term], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: "Erreur de recherche", error: err.message });
      res.json({ success: true, data: results, count: results.length, searchTerm });
    });
  } else {
    const sql = `
      SELECT id, cin, nom, prenom, email, telephone, institut, specialite, date_debut, date_fin, objet_stage, created_at
      FROM stagiaires
      ORDER BY created_at DESC, nom ASC
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
  
  // Check if CIN already exists for another stagiaire
  const checkQuery = 'SELECT id FROM stagiaires WHERE cin = ? AND id != ?';
  db.query(checkQuery, [cin, id], (checkErr, checkResults) => {
    if (checkErr) {
      console.error(checkErr);
      return res.status(500).json({ success: false, message: "Erreur lors de la vérification du CIN" });
    }
    
    if (checkResults.length > 0) {
      return res.status(400).json({ success: false, message: "Un autre stagiaire avec ce CIN existe déjà" });
    }
    
    // Update stagiaire
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
    ORDER BY created_at DESC, nom ASC
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
    res.json({ success: true, data: stagiaire });
  });
});

// --- GET STAGIAIRE BY CIN ---
app.get('/api/stagiaire/cin/:cin', (req, res) => {
  const { cin } = req.params;
  const sql = 'SELECT * FROM stagiaires WHERE cin = ?';
  
  db.query(sql, [cin], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Stagiaire non trouvé' });
    }
    res.json({ success: true, data: results[0] });
  });
});

// --- GET DASHBOARD STATS ---
app.get('/api/dashboard/stats', (req, res) => {
  const statsQueries = [
    'SELECT COUNT(*) as total FROM stagiaires',
    'SELECT COUNT(*) as active FROM stagiaires WHERE date_fin >= CURDATE()',
    'SELECT COUNT(*) as completed FROM stagiaires WHERE date_fin < CURDATE()',
    'SELECT COUNT(*) as thisMonth FROM stagiaires WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())'
  ];

  Promise.all(statsQueries.map(query => 
    new Promise((resolve, reject) => {
      db.query(query, (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    })
  )).then(results => {
    res.json({
      success: true,
      stats: {
        total: results[0].total,
        active: results[1].active,
        completed: results[2].completed,
        thisMonth: results[3].thisMonth
      }
    });
  }).catch(err => {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Erreur lors du calcul des statistiques' });
  });
});

// --- GENERATE PDF WITH PUPPETEER ---
app.get("/api/generate-pdf/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Launch browser
    const browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // For server deployment
    });
    const page = await browser.newPage();

    // Load Angular form page (adjust route if needed)
    await page.goto(`http://localhost:4200/attestation/${id}`, {
      waitUntil: "networkidle0",
      timeout: 30000
    });

    // Save to file
    const filename = `attestation-${id}-${Date.now()}.pdf`;
    const filePath = path.join(pdfsDir, filename);

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    res.json({ 
      success: true, 
      url: `/pdfs/${filename}`,
      filename: filename 
    });
  } catch (err) {
    console.error("❌ PDF generation error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error generating PDF",
      error: err.message 
    });
  }
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📁 PDFs will be accessible at http://localhost:${PORT}/pdfs/`);
  console.log(`🤖 Chatbot endpoint: http://localhost:${PORT}/api/chatbot`);
});