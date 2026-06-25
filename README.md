# 🎮 GameShelf : Persistance polyglotte (Projet NoSQL B3)

**GameShelf** est un « Letterboxd pour les jeux vidéo » : on y consulte des
fiches de jeux, on les note, on écrit des critiques, on construit des listes,
on suit d'autres joueurs et on reçoit des recommandations.

L'application n'est qu'un **support** : l'objet du projet est la **persistance
polyglotte**, c'est-à-dire la répartition intelligente des données entre
**quatre bases**, chacune utilisée pour ce qu'elle fait de mieux.

| Base | Famille | Ce qu'elle stocke ici |
|------|---------|------------------------|
| **PostgreSQL** | Relationnel | Utilisateurs, reviews, statuts de jeu, listes (données transactionnelles, intégrité référentielle) |
| **MongoDB** | Document | Fiches de jeux (schéma variable), flux d'activité hétérogène |
| **Redis** | Clé-valeur (mémoire) | Cache de fiches, compteurs de vues, classements (sorted sets), trending avec TTL |
| **Neo4j** | Graphe | Réseau social (FOLLOWS), recommandations, jeux similaires |

> 📄 La justification détaillée de chaque choix est dans
> [`docs/dossier-conception.md`](docs/dossier-conception.md) (livrable noté principal).

---

## 🚀 Lancer le projet (machine vierge)

Pré-requis : **Docker** + **Docker Compose**.

```bash
# 1. Cloner le dépôt
git clone <url-du-repo> && cd Projet-NoSQL

# 2. (optionnel) copier les variables d'environnement par défaut
cp .env.example .env

# 3. Tout démarrer et peupler (build de l'app + 4 bases)
docker compose up --build
```

L'ensemble se lance et **se peuple automatiquement** :

- **PostgreSQL** et **MongoDB** s'auto-initialisent via leurs scripts montés
  dans `/docker-entrypoint-initdb.d` au premier démarrage.
- **Neo4j** et **Redis** sont peuplés par l'application au démarrage
  (`RUN_SEED=true`), à partir des données déjà présentes dans les autres bases.

Une fois lancé :

| Service | URL / accès |
|---------|-------------|
| 🌐 Application GameShelf | http://localhost:3000 |
| 🩺 Healthcheck des 4 bases | http://localhost:3000/api/health |
| 🍃 Neo4j Browser | http://localhost:7474 (`neo4j` / `gameshelf123`) |
| 🐘 PostgreSQL | `localhost:5432` (`gameshelf` / `gameshelf`) |
| 🍀 MongoDB | `localhost:27017` (`gameshelf` / `gameshelf`) |
| 🔴 Redis | `localhost:6379` |

Vérifier que **les 4 bases répondent** :

```bash
curl http://localhost:3000/api/health
# {"postgres":"ok","mongo":"ok","redis":"ok","neo4j":"ok"}
```

---

## 🗂️ Structure du dépôt

```
Projet-NoSQL/
├── docker-compose.yml         # Les 4 bases + l'app, en un seul fichier
├── .env.example               # Variables d'environnement
├── app/                       # Application Node.js / Express
│   ├── db/                    # Un module de connexion par base
│   │   ├── postgres.js  mongo.js  redis.js  neo4j.js
│   ├── routes/                # Une famille de routes par base
│   │   ├── games.js           # MongoDB (+ cache Redis)
│   │   ├── reviews.js lists.js# PostgreSQL
│   │   ├── social.js          # Neo4j
│   │   ├── leaderboard.js     # Redis
│   │   └── feed.js            # MongoDB
│   ├── public/                # Frontend (type Letterboxd)
│   ├── seed.js                # Peuple Neo4j + Redis au démarrage
│   └── server.js              # Connexion aux 4 bases + montage des routes
├── seeds/
│   ├── postgres/01-schema.sql 02-seed.sql   # Schéma + données SQL
│   ├── mongo/01-seed-games.js 02-seed-activity.js
│   └── neo4j/seed.cypher
└── docs/dossier-conception.md # Modélisation, répartition, requêtes, schémas
```

---

## 🔎 Exemples d'API (chacune montre une base)

```bash
# MongoDB — liste / recherche / filtre par genre
curl "http://localhost:3000/api/games?genre=RPG"
curl "http://localhost:3000/api/games/stats/by-genre"          # agrégation
curl "http://localhost:3000/api/games/650000000000000000000001" # fiche + cache Redis + compteur de vues

# PostgreSQL — reviews d'un jeu (jointure)
curl "http://localhost:3000/api/reviews/game/650000000000000000000002"

# Redis — classements (sorted sets) + trending (TTL)
curl "http://localhost:3000/api/leaderboard/top-rated"
curl "http://localhost:3000/api/leaderboard/trending"

# Neo4j — recommandations & amis d'amis (parcours de graphe)
curl "http://localhost:3000/api/social/1/recommendations"
curl "http://localhost:3000/api/social/1/suggestions"

# MongoDB — flux d'activité hétérogène
curl "http://localhost:3000/api/feed"
```

Créer une review (écrit dans **Postgres**, met à jour le classement **Redis**,
journalise dans **Mongo** et reflète la note dans **Neo4j**) :

```bash
curl -X POST http://localhost:3000/api/reviews -H 'Content-Type: application/json' \
  -d '{"userId":2,"gameId":"650000000000000000000001","gameTitle":"The Witcher 3: Wild Hunt","rating":4.5,"body":"Top","liked":true,"username":"bob"}'
```

---

## 🧰 Versions des images

- `postgres:17` · `mongo:8` · `redis:8` · `neo4j:2025.05-community`
- Application : `node:22-alpine`

## 👥 Équipe

Projet réalisé dans le cadre du cours NoSQL B3 (2025-2026).
