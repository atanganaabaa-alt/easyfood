// Composant racine : affiche la barre de navigation et déclare les routes.
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Accueil from './pages/Accueil';
import Inscription from './pages/Inscription';
import Connexion from './pages/Connexion';
import Restaurants from './pages/Restaurants';
import RestaurantDetail from './pages/RestaurantDetail';
import TableauRestaurateur from './pages/TableauRestaurateur';
import Panier from './pages/Panier';
import Checkout from './pages/Checkout';
import MesCommandes from './pages/MesCommandes';
import CommandesRestaurateur from './pages/CommandesRestaurateur';
import TableauLivreur from './pages/TableauLivreur';
import { useAuth } from './context/AuthContext';

// Garde de route : réserve une page à un rôle précis (ici le restaurateur).
function RouteProtegee({ children, role }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/connexion" replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/restaurants" element={<Restaurants />} />
          <Route path="/restaurants/:id" element={<RestaurantDetail />} />
          <Route path="/panier" element={<Panier />} />
          <Route
            path="/checkout"
            element={
              <RouteProtegee>
                <Checkout />
              </RouteProtegee>
            }
          />
          <Route
            path="/mes-commandes"
            element={
              <RouteProtegee>
                <MesCommandes />
              </RouteProtegee>
            }
          />
          <Route
            path="/restaurateur"
            element={
              <RouteProtegee role="restaurateur">
                <TableauRestaurateur />
              </RouteProtegee>
            }
          />
          <Route
            path="/restaurateur/commandes"
            element={
              <RouteProtegee role="restaurateur">
                <CommandesRestaurateur />
              </RouteProtegee>
            }
          />
          <Route
            path="/livreur"
            element={
              <RouteProtegee role="livreur">
                <TableauLivreur />
              </RouteProtegee>
            }
          />
          {/* Toute URL inconnue ramène à l'accueil. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
