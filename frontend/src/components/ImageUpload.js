// Composant réutilisable d'import d'image : zone de dépôt + aperçu.
// Importe le fichier vers le backend et renvoie l'URL via onChange.
import { useRef, useState } from 'react';
import api from '../services/api';
import './ImageUpload.css';

function ImageUpload({ value, onChange, label }) {
  const inputRef = useRef(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [surVol, setSurVol] = useState(false);

  // Envoie le fichier choisi au backend.
  const envoyer = async (fichier) => {
    if (!fichier) return;
    setErreur('');
    setChargement(true);
    try {
      const formData = new FormData();
      formData.append('image', fichier);
      const { data } = await api.post('/upload', formData);
      onChange(data.url);
    } catch (err) {
      setErreur(err.response?.data?.message || "Échec de l'import. Réessayez.");
    } finally {
      setChargement(false);
    }
  };

  // Sélection via le bouton / clic sur la zone.
  const surSelection = (e) => {
    const fichier = e.target.files?.[0];
    envoyer(fichier);
  };

  // Glisser-déposer.
  const surDepot = (e) => {
    e.preventDefault();
    setSurVol(false);
    const fichier = e.dataTransfer.files?.[0];
    envoyer(fichier);
  };

  return (
    <div className="ef-upload">
      {label && <label className="ef-label">{label}</label>}

      <div className="ef-upload-row">
        {/* Zone de dépôt / import */}
        <div
          className={`ef-dropzone ${surVol ? 'survol' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setSurVol(true); }}
          onDragLeave={() => setSurVol(false)}
          onDrop={surDepot}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp, image/gif"
            onChange={surSelection}
            hidden
          />
          <div className="ef-dropzone-icone" aria-hidden="true">⬆</div>
          <p className="ef-dropzone-texte">
            {chargement ? 'Import en cours...' : 'Glissez une image ici ou cliquez pour importer'}
          </p>
          <p className="ef-dropzone-hint">JPG, PNG ou WEBP — 5 Mo max</p>
        </div>

        {/* Aperçu de l'image importée */}
        {value && (
          <div className="ef-upload-apercu">
            <img src={value} alt="Aperçu" />
            <button
              type="button"
              className="ef-upload-retirer"
              onClick={() => onChange('')}
              aria-label="Retirer l'image"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {erreur && <p className="ef-upload-erreur">{erreur}</p>}
    </div>
  );
}

export default ImageUpload;
