// Sélecteur de note en étoiles (1 à 5). Réutilisable.
// Mode lecture seule si onChange n'est pas fourni.
function Etoiles({ valeur = 0, onChange }) {
  const lectureSeule = typeof onChange !== 'function';
  return (
    <span className="ef-stars" role={lectureSeule ? 'img' : 'radiogroup'} aria-label={`Note : ${valeur} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`ef-star ${n <= valeur ? 'pleine' : ''}`}
          onClick={lectureSeule ? undefined : () => onChange(n)}
          disabled={lectureSeule}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </span>
  );
}

export default Etoiles;
