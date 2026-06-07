// Mini-carte de suivi d'une livraison : position du restaurant et du livreur.
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Ajuste la vue pour englober les points fournis.
function AjusterVue({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    }
  }, [map, points]);
  return null;
}

function CarteSuivi({ restaurant, livreur }) {
  const points = [];
  if (restaurant?.lat != null && restaurant?.lng != null) {
    points.push([Number(restaurant.lat), Number(restaurant.lng)]);
  }
  if (livreur?.lat != null && livreur?.lng != null) {
    points.push([Number(livreur.lat), Number(livreur.lng)]);
  }
  if (points.length === 0) return null;

  return (
    <div className="ef-carte-suivi">
      <MapContainer center={points[0]} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AjusterVue points={points} />

        {restaurant?.lat != null && (
          <CircleMarker
            center={[Number(restaurant.lat), Number(restaurant.lng)]}
            radius={9}
            pathOptions={{ color: '#157a42', fillColor: '#1f9d57', fillOpacity: 0.9, weight: 3 }}
          >
            <Popup>{restaurant.nom || 'Restaurant'}</Popup>
          </CircleMarker>
        )}

        {livreur?.lat != null && (
          <CircleMarker
            center={[Number(livreur.lat), Number(livreur.lng)]}
            radius={10}
            pathOptions={{ color: '#111111', fillColor: '#111111', fillOpacity: 0.9, weight: 3 }}
          >
            <Popup>Votre livreur</Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}

export default CarteSuivi;
