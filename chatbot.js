const express = require('express');
const router = express.Router();

const userContexts = {}; // Map userId to conversation state, e.g. 'waiting_for_cin'

// Async function to find stagiaire by CIN from the database
async function findStagiaireByCin(cin) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM stagiaires WHERE cin = ?';
    db.query(sql, [cin], (err, results) => {
      if (err) {
        reject(err);
      } else if (results.length > 0) {
        resolve(results[0]);
      } else {
        resolve(null);
      }
    });
  });
}

// Format stagiaire information nicely
function formatStagiaireInfo(stagiaire) {
  return `📋 **Informations du stagiaire:**

👤 **Nom complet:** ${stagiaire.nom} ${stagiaire.prenom}
🆔 **CIN:** ${stagiaire.cin}
📧 **Email:** ${stagiaire.email}
📱 **Téléphone:** ${stagiaire.telephone}
🏫 **Institut:** ${stagiaire.institut}
🎓 **Spécialité:** ${stagiaire.specialite}
📅 **Date de début:** ${new Date(stagiaire.date_debut).toLocaleDateString('fr-FR')}
📅 **Date de fin:** ${new Date(stagiaire.date_fin).toLocaleDateString('fr-FR')}
📝 **Objet du stage:** ${stagiaire.objet_stage}
📊 **Statut:** ${new Date() > new Date(stagiaire.date_fin) ? 'Terminé' : 'En cours'}`;
}

// Your chatbot predefined keyword/response data
const chatData = [
  { keywords: ["bonjour", "hello", "salut", "bonsoir", "hey"], answer: "Bonjour ! Je suis StegBot, l'assistant virtuel du système de gestion des stagiaires. Comment puis-je vous aider ?" },
  { keywords: ["merci", "thank", "thanks"], answer: "Avec plaisir 😊 N'hésitez pas si vous avez d'autres questions !" },
  { keywords: ["au revoir", "bye", "goodbye"], answer: "Au revoir ! À bientôt pour gérer vos stagiaires !" },
  { keywords: ["aide", "help", "aider", "comment"], answer: "Je peux vous aider avec :\n• Rechercher un stagiaire par CIN\n• Ajouter un nouveau stagiaire\n• Générer des attestations\n• Questions sur le système\nQue souhaitez-vous faire ?" },
  { keywords: ["qui es tu", "who are you", "présente toi"], answer: "Je suis StegBot, l'assistant virtuel du système de gestion des stagiaires. Je peux vous aider à naviguer dans l'application et répondre à vos questions." },
  { keywords: ["ajouter stagiaire", "nouveau stagiaire", "add intern", "créer stagiaire"], answer: "Pour ajouter un nouveau stagiaire, vous devez remplir le formulaire avec :\n• CIN\n• Nom et prénom\n• Email et téléphone\n• Institut et spécialité\n• Dates de début et fin\n• Objet du stage" },
  { keywords: ["rechercher", "chercher", "trouver", "search", "find"], answer: "Vous pouvez rechercher des stagiaires par :\n• CIN (dites 'stagiaire' puis donnez le CIN)\n• Nom ou prénom\n• Email\n• Institut\n• Spécialité\nUtilisez la barre de recherche dans l'interface ou demandez-moi !" },
  { keywords: ["attestation", "certificat", "pdf", "document"], answer: "Pour générer une attestation de stage :\n1. Trouvez le stagiaire dans la liste\n2. Cliquez sur 'Générer attestation'\n3. Le PDF sera créé automatiquement\nL'attestation contiendra toutes les informations du stage." },
  { keywords: ["modifier", "éditer", "changer", "update", "edit"], answer: "Pour modifier un stagiaire :\n1. Trouvez le stagiaire dans la liste\n2. Cliquez sur 'Modifier'\n3. Changez les informations nécessaires\n4. Sauvegardez les modifications" },
  { keywords: ["supprimer", "effacer", "delete", "remove"], answer: "Pour supprimer un stagiaire :\n1. Trouvez le stagiaire dans la liste\n2. Cliquez sur 'Supprimer'\n3. Confirmez la suppression\n⚠️ Attention : cette action est irréversible !" },
  { keywords: ["problème", "erreur", "bug", "marche pas", "error"], answer: "Si vous rencontrez un problème :\n1. Vérifiez votre connexion internet\n2. Actualisez la page\n3. Vérifiez que tous les champs requis sont remplis\n4. Contactez l'administrateur si le problème persiste" },
  { keywords: ["connexion", "login", "mot de passe", "password"], answer: "Pour vous connecter :\n• Utilisez votre email et mot de passe\n• En cas d'oubli, contactez l'administrateur\n• Vérifiez que vos identifiants sont corrects" },
  { keywords: ["stagiaire", "intern", "étudiant", "stage"], answer: "Pour rechercher un stagiaire spécifique, donnez-moi son CIN.\n\nSinon, le système permet de gérer tous les aspects des stagiaires :\n• Informations personnelles\n• Détails du stage\n• Suivi des dates\n• Génération d'attestations\nQue voulez-vous savoir spécifiquement ?" },
  { keywords: ["cin", "numero", "identifiant", "carte"], answer: "Le CIN (Carte d'Identité Nationale) est l'identifiant unique de chaque stagiaire. Donnez-moi le CIN pour rechercher les informations d'un stagiaire." }
];

// Enhanced matching function with better scoring
function findBestMatch(userMessage) {
  const message = userMessage.toLowerCase().trim();
  let bestMatch = null;
  let highestScore = 0;

  for (const item of chatData) {
    let score = 0;
    let matchedKeywords = 0;

    for (const keyword of item.keywords) {
      if (message.includes(keyword)) {
        matchedKeywords++;
        score += keyword.length;
        if (message === keyword) {
          score += 10;
        }
      }
    }

    if (matchedKeywords > 0) {
      score = score * matchedKeywords;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }
  }

  return bestMatch ? bestMatch.answer : null;
}

// Context-aware responses based on recent activity
function getContextualResponse(userMessage) {
  const message = userMessage.toLowerCase();

  if (message.includes('combien') && message.includes('stagiaire')) {
    return "Pour connaître le nombre total de stagiaires, consultez le tableau de bord ou la liste des stagiaires.";
  }
  if (message.includes('derniers') && message.includes('stagiaire')) {
    return "Les derniers stagiaires ajoutés apparaissent en haut de la liste. Vous pouvez aussi trier par date d'ajout.";
  }
  if (message.includes('statut') && message.includes('stage')) {
    return "Le statut d'un stage dépend des dates : 'En cours' si la date de fin n'est pas dépassée, 'Terminé' sinon.";
  }
  return null;
}

// Check if input looks like a CIN (numeric, reasonable length)
function looksLikeCin(input) {
  const trimmed = input.trim();
  return /^\d{6,20}$/.test(trimmed); // 6-20 digits
}

// Main chatbot endpoint with conversation state management
router.post('/api/chatbot', async (req, res) => {
  try {
    if (!req.body || typeof req.body.message !== 'string') {
      return res.status(400).json({
        error: "Message requis",
        reply: "Veuillez envoyer un message valide."
      });
    }
    
    const userId = req.body.userId || 'guest';
    const userMessage = req.body.message.trim();

    if (!userMessage) {
      return res.json({
        reply: "Je n'ai pas reçu de message. StegBot est là pour vous aider avec la gestion des stagiaires !"
      });
    }

    // Check if awaiting CIN input
    if (userContexts[userId] === 'waiting_for_cin') {
      userContexts[userId] = null; // Reset context
      
      if (!looksLikeCin(userMessage)) {
        return res.json({
          reply: "Le CIN doit contenir uniquement des chiffres (6-20 caractères). Veuillez réessayer avec un CIN valide."
        });
      }

      try {
        const stagiaire = await findStagiaireByCin(userMessage);
        if (stagiaire) {
          return res.json({
            reply: formatStagiaireInfo(stagiaire),
            stagiaire: stagiaire // Optional: send raw data for frontend use
          });
        } else {
          return res.json({ 
            reply: `❌ Aucun stagiaire trouvé avec le CIN: ${userMessage}\n\nVérifiez le numéro et réessayez, ou tapez 'stagiaire' pour rechercher un autre CIN.` 
          });
        }
      } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({ 
          reply: "❌ Une erreur est survenue lors de la recherche du stagiaire. Veuillez réessayer." 
        });
      }
    }

    // If message contains 'stagiaire' or looks like a direct CIN search request
    if (userMessage.toLowerCase().includes('stagiaire') || 
        (userMessage.toLowerCase().includes('recherche') && userMessage.toLowerCase().includes('cin'))) {
      userContexts[userId] = 'waiting_for_cin';
      return res.json({ 
        reply: "🔍 Pour rechercher un stagiaire, donnez-moi son CIN (numéro de carte d'identité)." 
      });
    }

    // If user directly provides what looks like a CIN
    if (looksLikeCin(userMessage)) {
      try {
        const stagiaire = await findStagiaireByCin(userMessage);
        if (stagiaire) {
          return res.json({
            reply: formatStagiaireInfo(stagiaire),
            stagiaire: stagiaire
          });
        } else {
          return res.json({ 
            reply: `❌ Aucun stagiaire trouvé avec le CIN: ${userMessage}\n\nVérifiez le numéro ou tapez 'aide' pour voir les autres options.` 
          });
        }
      } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({ 
          reply: "❌ Une erreur est survenue lors de la recherche. Veuillez réessayer." 
        });
      }
    }

    // Try contextual responses
    let response = getContextualResponse(userMessage);

    // If no contextual response, try pattern matching
    if (!response) {
      response = findBestMatch(userMessage);
    }

    // Default fallback
    if (!response) {
      response = `Désolé, je n'ai pas compris votre question "${userMessage}". 

Je peux vous aider avec :
• 🔍 Rechercher un stagiaire (tapez 'stagiaire' puis donnez le CIN)
• ➕ Ajouter/modifier/supprimer des stagiaires
• 📋 Générer des attestations
• ❓ Questions sur le système

Pouvez-vous reformuler votre question ?`;
    }

    res.json({
      reply: response,
      timestamp: new Date().toISOString(),
      processed: true
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      error: "Erreur serveur",
      reply: "❌ Une erreur est survenue. Veuillez réessayer ou contacter l'administrateur.",
      timestamp: new Date().toISOString()
    });
  }
});

// Optional help endpoint
router.get('/api/chatbot/help', (req, res) => {
  const helpTopics = chatData.map(item => ({
    keywords: item.keywords.slice(0, 3),
    description: item.answer.split('\n')[0]
  }));

  res.json({
    success: true,
    message: "Voici les sujets sur lesquels je peux vous aider :",
    topics: helpTopics
  });
});

// Optional stats endpoint
router.get('/api/chatbot/stats', (req, res) => {
  res.json({
    success: true,
    totalResponses: chatData.length,
    categories: [
      "Salutations",
      "Aide générale", 
      "Gestion stagiaires",
      "Recherche par CIN",
      "Attestations",
      "Problèmes techniques"
    ],
    lastUpdate: new Date().toISOString()
  });
});

module.exports = router;