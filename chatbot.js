// chatbot.js
const express = require('express');
const router = express.Router();

// Enhanced chatbot with database-aware responses
const chatData = [
  { 
    keywords: ["bonjour", "hello", "salut", "bonsoir", "hey"], 
    answer: "Bonjour ! Je suis StegBot, l'assistant virtuel du système de gestion des stagiaires. Comment puis-je vous aider ?" 
  },
  { 
    keywords: ["merci", "thank", "thanks"], 
    answer: "Avec plaisir 😊 N'hésitez pas si vous avez d'autres questions !" 
  },
  { 
    keywords: ["au revoir", "bye", "goodbye"], 
    answer: "Au revoir ! À bientôt pour gérer vos stagiaires !" 
  },
  { 
    keywords: ["aide", "help", "aider", "comment"], 
    answer: "Je peux vous aider avec :\n• Ajouter un nouveau stagiaire\n• Rechercher des stagiaires\n• Générer des attestations\n• Questions sur le système\nQue souhaitez-vous faire ?" 
  },
  { 
    keywords: ["qui es tu", "who are you", "présente toi"], 
    answer: "Je suis StegBot, l'assistant virtuel du système de gestion des stagiaires. Je peux vous aider à naviguer dans l'application et répondre à vos questions." 
  },
  {
    keywords: ["ajouter stagiaire", "nouveau stagiaire", "add intern", "créer stagiaire"],
    answer: "Pour ajouter un nouveau stagiaire, vous devez remplir le formulaire avec :\n• CIN\n• Nom et prénom\n• Email et téléphone\n• Institut et spécialité\n• Dates de début et fin\n• Objet du stage"
  },
  {
    keywords: ["rechercher", "chercher", "trouver", "search", "find"],
    answer: "Vous pouvez rechercher des stagiaires par :\n• CIN\n• Nom ou prénom\n• Email\n• Institut\n• Spécialité\nUtilisez la barre de recherche dans l'interface !"
  },
  {
    keywords: ["attestation", "certificat", "pdf", "document"],
    answer: "Pour générer une attestation de stage :\n1. Trouvez le stagiaire dans la liste\n2. Cliquez sur 'Générer attestation'\n3. Le PDF sera créé automatiquement\nL'attestation contiendra toutes les informations du stage."
  },
  {
    keywords: ["modifier", "éditer", "changer", "update", "edit"],
    answer: "Pour modifier un stagiaire :\n1. Trouvez le stagiaire dans la liste\n2. Cliquez sur 'Modifier'\n3. Changez les informations nécessaires\n4. Sauvegardez les modifications"
  },
  {
    keywords: ["supprimer", "effacer", "delete", "remove"],
    answer: "Pour supprimer un stagiaire :\n1. Trouvez le stagiaire dans la liste\n2. Cliquez sur 'Supprimer'\n3. Confirmez la suppression\n⚠️ Attention : cette action est irréversible !"
  },
  {
    keywords: ["problème", "erreur", "bug", "marche pas", "error"],
    answer: "Si vous rencontrez un problème :\n1. Vérifiez votre connexion internet\n2. Actualisez la page\n3. Vérifiez que tous les champs requis sont remplis\n4. Contactez l'administrateur si le problème persiste"
  },
  {
    keywords: ["connexion", "login", "mot de passe", "password"],
    answer: "Pour vous connecter :\n• Utilisez votre email et mot de passe\n• En cas d'oubli, contactez l'administrateur\n• Vérifiez que vos identifiants sont corrects"
  },
  {
    keywords: ["stagiaire", "intern", "étudiant", "stage"],
    answer: "Le système permet de gérer tous les aspects des stagiaires :\n• Informations personnelles\n• Détails du stage\n• Suivi des dates\n• Génération d'attestations\nQue voulez-vous savoir spécifiquement ?"
  },
  {
    keywords:["les horaires","temps","heure de travail"],
    answer:"les horaires sont de 9h à 16h , du lundi au vendredi"
  }
];

// Enhanced matching function with better scoring
function findBestMatch(userMessage) {
  const message = userMessage.toLowerCase().trim();
  let bestMatch = null;
  let highestScore = 0;
  
  for (const item of chatData) {
    let score = 0;
    let matchedKeywords = 0;
    
    // Check each keyword
    for (const keyword of item.keywords) {
      if (message.includes(keyword)) {
        matchedKeywords++;
        // Longer keywords get higher scores
        score += keyword.length;
        // Exact matches get bonus points
        if (message === keyword) {
          score += 10;
        }
      }
    }
    
    // Calculate final score
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

// Get conversation context from database (optional feature)
function getContextualResponse(userMessage, req) {
  const message = userMessage.toLowerCase();
  
  // Context-aware responses based on recent activity
  if (message.includes('combien') && message.includes('stagiaire')) {
    return "Pour connaître le nombre total de stagiaires, consultez le tableau de bord ou la liste des stagiaires.";
  }
  
  if (message.includes('derniers') && message.includes('stagiaire')) {
    return "Les derniers stagiaires ajoutés apparaissent en haut de la liste. Vous pouvez aussi trier par date d'ajout.";
  }
  
  return null;
}

// Main chatbot endpoint
router.post('/api/chatbot', (req, res) => {
  try {
    // Validate request
    if (!req.body || typeof req.body.message !== 'string') {
      return res.status(400).json({ 
        error: "Message requis", 
        reply: "Veuillez envoyer un message valide." 
      });
    }

    const userMessage = req.body.message.trim();
    
    // Handle empty messages
    if (!userMessage) {
      return res.json({ 
        reply: "Je n'ai pas reçu de message. StegBot est là pour vous aider avec la gestion des stagiaires !" 
      });
    }

    // Try contextual response first
    let response = getContextualResponse(userMessage, req);
    
    // If no contextual response, use pattern matching
    if (!response) {
      response = findBestMatch(userMessage);
    }
    
    // Default fallback response
    if (!response) {
      response = `Désolé, je n'ai pas compris votre question "${userMessage}". 
      
Je peux vous aider avec :
• Ajouter/modifier/supprimer des stagiaires
• Rechercher dans la base de données
• Générer des attestations
• Questions sur le système

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
      reply: "Une erreur est survenue. Veuillez réessayer ou contacter l'administrateur.",
      timestamp: new Date().toISOString()
    });
  }
});

// Optional: Get chatbot help/commands
router.get('/api/chatbot/help', (req, res) => {
  const helpTopics = chatData.map(item => ({
    keywords: item.keywords.slice(0, 3), // Show first 3 keywords
    description: item.answer.split('\n')[0] // First line as description
  }));
  
  res.json({
    success: true,
    message: "Voici les sujets sur lesquels je peux vous aider :",
    topics: helpTopics
  });
});

// Optional: Chatbot statistics (for admin)
router.get('/api/chatbot/stats', (req, res) => {
  res.json({
    success: true,
    totalResponses: chatData.length,
    categories: [
      "Salutations",
      "Aide générale", 
      "Gestion stagiaires",
      "Recherche",
      "Attestations",
      "Problèmes techniques"
    ],
    lastUpdate: new Date().toISOString()
  });
});

module.exports = router;