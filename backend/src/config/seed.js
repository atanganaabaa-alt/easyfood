// ============================================================
// EasyFood - Données de démo (Sprint 1)
// Insère des comptes, des restaurants et des plats d'exemple
// pour pouvoir tester l'application immédiatement.
//
// Utilisation :
//   node src/config/seed.js
// (la base doit déjà exister et le schéma être chargé)
// ============================================================
const pool = require('./db');
const bcrypt = require('bcryptjs');

// Mot de passe commun à tous les comptes de démo.
const MOT_DE_PASSE_DEMO = 'easyfood123';

// Comptes de démonstration pour chaque rôle.
const UTILISATEURS = [
  { nom: 'Awa Tchamba', email: 'client@easyfood.cm', telephone: '+237 690 00 00 01', role: 'client' },
  { nom: 'Mama Africa', email: 'resto@easyfood.cm', telephone: '+237 690 00 00 02', role: 'restaurateur' },
  { nom: 'Jean Livreur', email: 'livreur@easyfood.cm', telephone: '+237 690 00 00 03', role: 'livreur' },
  { nom: 'Admin EasyFood', email: 'admin@easyfood.cm', telephone: '+237 690 00 00 04', role: 'admin' },
];

// Restaurants de démo (rattachés au restaurateur via son email).
const RESTAURANTS = [
  {
    nom: 'Chez Mama Africa',
    adresse: 'Akwa, Douala',
    description: 'Cuisine camerounaise authentique, faite maison avec amour.',
    logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
    horaires: 'Lun-Dim : 09h - 22h',
    categorie: 'Cuisine camerounaise',
    note: 4.8,
    delai_min: 25,
    delai_max: 35,
    frais_livraison: 500,
    distance_km: 1.8,
    latitude: 4.0511,
    longitude: 9.7679,
    plats: [
      { nom: 'Ndolè aux crevettes', description: 'Le plat national, sauce d\'arachide et crevettes.', prix: 3000, photo_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500' },
      { nom: 'Poisson braisé + bobolo', description: 'Poisson grillé, sauce piment, accompagné de bobolo.', prix: 3500, photo_url: 'https://images.unsplash.com/photo-1535140728325-a4d3707eee61?w=500' },
      { nom: 'Poulet DG', description: 'Poulet sauté aux plantains et légumes.', prix: 4000, photo_url: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500' },
      { nom: 'Eru + water fufu', description: 'Plat traditionnel du Sud-Ouest.', prix: 2500, photo_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500', disponible: false },
    ],
  },
  {
    nom: 'Le Grill du Soleil',
    adresse: 'Bastos, Yaoundé',
    description: 'Spécialiste des grillades et du soya bien épicé.',
    logo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600',
    horaires: 'Mar-Dim : 11h - 23h',
    categorie: 'Grillades',
    note: 4.6,
    delai_min: 30,
    delai_max: 45,
    frais_livraison: 700,
    distance_km: 3.2,
    latitude: 3.8951,
    longitude: 11.5021,
    plats: [
      { nom: 'Soya de bœuf', description: 'Brochettes de bœuf marinées et grillées.', prix: 1500, photo_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500' },
      { nom: 'Plantain mûr frit', description: 'Accompagnement sucré et fondant.', prix: 1000, photo_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500' },
      { nom: 'Poulet entier braisé', description: 'Poulet entier mariné, sauce maison.', prix: 5000, photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=500' },
    ],
  },
  {
    nom: 'Le Goût d\'Ici',
    adresse: 'Bonamoussadi, Douala',
    description: 'Plats traditionnels à petits prix, préparés minute.',
    logo_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
    horaires: 'Lun-Sam : 10h - 21h',
    categorie: 'Cuisine camerounaise',
    note: 4.4,
    delai_min: 20,
    delai_max: 30,
    frais_livraison: 400,
    distance_km: 2.3,
    latitude: 4.0928,
    longitude: 9.7376,
    plats: [
      { nom: 'Okok sucré', description: 'Spécialité du Centre, à base de feuilles de manioc.', prix: 2000, photo_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500' },
      { nom: 'Riz sauté', description: 'Riz sauté aux légumes et morceaux de poulet.', prix: 2500, photo_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500' },
      { nom: 'Brochettes de poisson', description: 'Brochettes grillées, sauce épicée maison.', prix: 1800, photo_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500' },
    ],
  },
];

async function seed() {
  try {
    console.log('🌱 Insertion des données de démo...');

    // On hache le mot de passe une seule fois (identique pour tous les comptes de démo).
    const hash = await bcrypt.hash(MOT_DE_PASSE_DEMO, 10);

    // On garde l'id du restaurateur pour rattacher ses restaurants.
    let restaurateurId = null;

    for (const u of UTILISATEURS) {
      // ON CONFLICT : si l'email existe déjà, on récupère simplement la ligne existante.
      const result = await pool.query(
        `INSERT INTO users (nom, email, mot_de_passe, telephone, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET nom = EXCLUDED.nom
         RETURNING id, role`,
        [u.nom, u.email, hash, u.telephone, u.role]
      );
      if (result.rows[0].role === 'restaurateur') {
        restaurateurId = result.rows[0].id;
      }
      console.log(`  👤 ${u.role.padEnd(13)} ${u.email}`);
    }

    if (!restaurateurId) {
      throw new Error('Restaurateur de démo introuvable.');
    }

    // Rattache le livreur de démo à l'équipe du restaurateur de démo.
    await pool.query(
      `UPDATE users SET employeur_id = $1 WHERE email = 'livreur@easyfood.cm'`,
      [restaurateurId]
    );

    for (const r of RESTAURANTS) {
      const resResto = await pool.query(
        `INSERT INTO restaurants
           (nom, adresse, description, logo_url, horaires, categorie, note, delai_min, delai_max, frais_livraison, distance_km, latitude, longitude, proprietaire_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [r.nom, r.adresse, r.description, r.logo_url, r.horaires, r.categorie || null,
         r.note, r.delai_min, r.delai_max, r.frais_livraison, r.distance_km,
         r.latitude, r.longitude, restaurateurId]
      );
      const restaurantId = resResto.rows[0].id;
      console.log(`  🏠 Restaurant : ${r.nom}`);

      for (const p of r.plats) {
        await pool.query(
          `INSERT INTO plats (nom, description, prix, photo_url, disponible, restaurant_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [p.nom, p.description, p.prix, p.photo_url, p.disponible !== false, restaurantId]
        );
        console.log(`     🍽️  ${p.nom}`);
      }
    }

    console.log('\n✅ Données de démo insérées avec succès !');
    console.log(`🔑 Tous les comptes utilisent le mot de passe : ${MOT_DE_PASSE_DEMO}`);
  } catch (err) {
    console.error('❌ Erreur lors de l\'insertion des données de démo :', err.message);
    process.exitCode = 1;
  } finally {
    // On ferme proprement la connexion pour que le script se termine.
    await pool.end();
  }
}

seed();
