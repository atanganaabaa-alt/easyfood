// Carte interactive (OpenStreetMap via Leaflet) affichant les restaurants
// et la position du client. Cliquer sur la carte définit la position du client.
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import { formaterFrais } from '../utils/format';

// Recentre la carte quand la position du client change.
function Recentrer({ position }) {
  const map = useMap();
  if (position) {
    map.setView([position.lat, position.lng], 12, { animate: true });
  }
  return null;
}

// Capte les clics sur la carte pour définir la position du client.
function ClicCarte({ onChoisir }) {
  useMapEvents({
    click(e) {
      onChoisir({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function CarteRestaurants({ restaurants, position, onChoisirPosition, meilleurId }) {
  // Centre par défaut : Douala. Sinon la position du client.
  const centre = position ? [position.lat, position.lng] : [4.0483, 9.7043];
  const avecCoords = restaurants.filter((r) => r.latitude != null && r.longitude != null);

  return (
    <div className="ef-carte">
      <MapContainer center={centre} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recentrer position={position} />
        <ClicCarte onChoisir={onChoisirPosition} />

        {/* Position du client */}
        {position && (
          <CircleMarker
            center={[position.lat, position.lng]}
            radius={9}
            pathOptions={{ color: '#111111', fillColor: '#111111', fillOpacity: 0.9 }}
          >
            <Popup>Vous êtes ici</Popup>
          </CircleMarker>
        )}

        {/* Restaurants */}
        {avecCoords.map((r) => {
          const estMeilleur = r.id === meilleurId;
          return (
            <CircleMarker
              key={r.id}
              center={[Number(r.latitude), Number(r.longitude)]}
              radius={estMeilleur ? 11 : 8}
              pathOptions={{
                color: estMeilleur ? '#157a42' : '#1f9d57',
                fillColor: estMeilleur ? '#1f9d57' : '#ffffff',
                fillOpacity: estMeilleur ? 0.9 : 1,
                weight: 3,
              }}
            >
              <Popup>
                <strong>{r.nom}</strong>
                <br />
                {Number(r.note).toFixed(1)} ★ · {formaterFrais(r.frais_livraison)}
                {r.distance_km != null && <> · {Number(r.distance_km).toFixed(1)} km</>}
                <br />
                <Link to={`/restaurants/${r.id}`}>Voir le menu</Link>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default CarteRestaurants;
