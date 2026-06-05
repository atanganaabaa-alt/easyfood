// ============================================================
// Service de notification SMS / WhatsApp
// ------------------------------------------------------------
// ⚠️ VERSION SIMULÉE pour le développement (affiche les messages
// dans la console). Pour activer les vrais envois, branchez Twilio
// ou l'API SMS d'Orange dans la fonction envoyerNotification.
// ============================================================

// Envoie une notification à un numéro de téléphone.
// Ne fait jamais échouer la commande : en cas d'erreur, on logue et on continue.
async function envoyerNotification({ telephone, message }) {
  try {
    if (!telephone) return;

    // --- SIMULATION ---
    console.log(`📲 SMS vers ${telephone} : ${message}`);

    // Exemple de branchement réel avec Twilio (à adapter le moment venu) :
    // const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    // await client.messages.create({
    //   from: process.env.TWILIO_FROM, to: telephone, body: message,
    // });
  } catch (err) {
    console.error('⚠️ Échec de la notification (ignoré) :', err.message);
  }
}

module.exports = { envoyerNotification };
