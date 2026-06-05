// Route d'upload d'images (logos de restaurants, photos de plats).
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = require('express').Router();
const protect = require('../middlewares/auth.middleware');

// Dossier de destination des fichiers importés.
const dossierUploads = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(dossierUploads)) {
  fs.mkdirSync(dossierUploads, { recursive: true });
}

// Stockage sur disque avec un nom de fichier unique (timestamp + aléatoire).
const stockage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dossierUploads),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const nomUnique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, nomUnique);
  },
});

// On n'accepte que les images (jpg, png, webp, gif).
const TYPES_AUTORISES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const filtre = (req, file, cb) => {
  if (TYPES_AUTORISES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.'));
  }
};

const upload = multer({
  storage: stockage,
  fileFilter: filtre,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
});

// POST /api/upload : importe une image et renvoie son URL absolue.
router.post('/', protect, (req, res) => {
  // On gère l'erreur manuellement pour renvoyer un message clair au client.
  upload.single('image')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? "L'image dépasse la taille maximale (5 Mo)."
        : err.message;
      return res.status(400).json({ message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier reçu.' });
    }
    // URL absolue accessible par le frontend (ex: http://localhost:5000/uploads/xxx.jpg).
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(201).json({ url });
  });
});

module.exports = router;
