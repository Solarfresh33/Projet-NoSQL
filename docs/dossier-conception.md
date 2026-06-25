# Dossier de conception — GameShelf

**Persistance polyglotte autour d'une application de classification de jeux vidéo**
Cours NoSQL B3 · 2025-2026

---

## 0. Présentation

GameShelf est un « Letterboxd pour les jeux vidéo ». Les utilisateurs consultent
des fiches de jeux, leur attribuent une note, écrivent des critiques, organisent
des listes, suivent d'autres joueurs et reçoivent des recommandations.

Le cœur du projet n'est pas l'application mais la **répartition des données entre
quatre moteurs**, chacun choisi pour sa vocation. Le principe directeur :

> **Une donnée → la base dont le modèle correspond le mieux à la façon dont on
> l'interroge.** Les redondances sont assumées et maîtrisées (voir §3).

### Schéma d'architecture

```
                         ┌─────────────────────────────┐
                         │   Frontend (type Letterboxd) │
                         └───────────────┬──────────────┘
                                         │ HTTP/JSON
                         ┌───────────────▼──────────────┐
                         │   Application Node / Express  │
                         │   (server.js + routes/*.js)   │
                         └──┬───────┬─────────┬──────────┘
              ┌─────────────┘       │         │          └──────────────┐
              ▼                     ▼         ▼                         ▼
      ┌───────────────┐   ┌────────────────┐ ┌──────────────┐  ┌─────────────────┐
      │  PostgreSQL   │   │    MongoDB     │ │    Redis     │  │      Neo4j      │
      │ Relationnel   │   │   Document     │ │ Clé-valeur   │  │     Graphe      │
      ├───────────────┤   ├────────────────┤ ├──────────────┤  ├─────────────────┤
      │ users         │   │ games (fiches) │ │ cache fiches │  │ (:User)         │
      │ reviews       │   │ activity (feed)│ │ compteurs    │  │ (:Game)         │
      │ user_game_…   │   │                │ │ leaderboards │  │ FOLLOWS / RATED │
      │ lists / items │   │                │ │ trending TTL │  │ SIMILAR_TO …    │
      └───────────────┘   └────────────────┘ └──────────────┘  └─────────────────┘
        Source de vérité    Source de vérité    Dérivé/volatile     Dérivé (reflète
        users & inter-      des fiches jeux     (reconstructible)    notes + social)
        actions notées
```

L'**identifiant d'un jeu** (`_id` Mongo, ex. `650000000000000000000001`) est la
**clé de jointure logique** partagée par les quatre bases.

---

## 1. Modélisation par base

### 1.1 PostgreSQL (Relationnel) — source de vérité transactionnelle

**Pourquoi cette base ?** Les utilisateurs et leurs interactions notées exigent
de l'**intégrité référentielle** (un avis appartient à un user existant), des
**contraintes métier** (une seule note par user et par jeu, note bornée entre
0,5 et 5), des **transactions** et des **jointures**. C'est exactement le terrain
du relationnel.

**Tables :**

| Table | Rôle | Contraintes notables |
|-------|------|----------------------|
| `users` | comptes | `UNIQUE(username)`, `UNIQUE(email)` |
| `reviews` | note + critique d'un user sur un jeu | `UNIQUE(user_id, game_id)`, `CHECK(rating BETWEEN 0.5 AND 5)`, FK → users |
| `user_game_status` | statut (played/playing/backlog/abandoned) + heures | PK `(user_id, game_id)`, type ENUM, FK → users |
| `lists` | listes personnalisées | FK → users |
| `list_items` | jeux d'une liste, **ordonnés** | PK `(list_id, game_id)`, `position`, FK → lists `ON DELETE CASCADE` |

> Les **fiches** des jeux ne sont **pas** ici : on n'y stocke que `game_id` +
> un `game_title` dénormalisé (pour afficher sans requêter Mongo à chaque ligne).

Schéma relationnel (résumé) :

```
users(id PK, username U, email U, password_hash, bio, created_at)
   │1
   ├──< reviews(id PK, user_id FK, game_id, game_title, rating CHECK, body, liked, created_at)  UNIQUE(user_id,game_id)
   ├──< user_game_status(user_id FK, game_id, status ENUM, hours_played, …)  PK(user_id,game_id)
   └──< lists(id PK, user_id FK, name, description, is_public, created_at)
              │1
              └──< list_items(list_id FK, game_id, game_title, position)  PK(list_id,game_id)
```

### 1.2 MongoDB (Document) — fiches au schéma variable

**Pourquoi cette base ?** Une fiche de jeu a un schéma **fortement hétérogène** :
un jeu PC a une configuration requise, une exclu Switch non ; certains ont des
DLC, d'autres pas ; le multijoueur, l'accessibilité, la controverse de lancement…
sont des champs présents seulement sur certains jeux. Modéliser ça en SQL
imposerait des dizaines de colonnes nulles ou des tables annexes. Le **document**
embarque toute la fiche dans un seul objet, sans jointure.

**Collection `games`** — exemple montrant l'hétérogénéité :

```jsonc
// The Witcher 3 : a pcRequirements + dlc[]
{ "_id": "650000000000000000000001", "title": "The Witcher 3: Wild Hunt",
  "genres": ["RPG","Open World","Action"], "platforms": ["PC","PS5","Switch"],
  "pcRequirements": { "minimum": { "cpu": "i5-2500K", "ram": "6 GB" } },
  "dlc": [ { "name": "Blood and Wine", "releaseDate": "2016-05-31" } ] }

// Hades : ni pcRequirements ni dlc, mais un champ runBased
{ "_id": "650000000000000000000003", "title": "Hades",
  "genres": ["Roguelite","Action"], "runBased": true }

// Disco Elysium : champ noCombat, voiceActing — propres à ce jeu
{ "_id": "650000000000000000000008", "title": "Disco Elysium",
  "noCombat": true, "voiceActing": "The Final Cut (intégral)" }
```

**Collection `activity`** — flux d'activité **polymorphe** : la structure dépend
du `type` d'évènement (`review`, `status_change`, `list_add`, `follow`). Un
`follow` n'a pas de `gameId` ; un `status_change` a `from`/`to`. Encore un cas
où le schéma figé du relationnel serait inadapté.

**Index :** `{genres:1}`, `{platforms:1}`, index **texte** sur `title`+`description`.

### 1.3 Redis (Clé-valeur en mémoire) — volatil, rapide, classements

**Pourquoi cette base ?** Tout ce qui doit être **très rapide**, **volatile** ou
**expirable**, et tout ce qui est un **classement**. Aucune de ces données n'est
une source de vérité : elles sont **reconstructibles** depuis Postgres/Mongo
(c'est ce que fait `seed.js`).

| Clé | Structure Redis | Usage |
|-----|-----------------|-------|
| `cache:game:<id>` | String (JSON) + `EX 3600` | **Cache** d'une fiche Mongo (TTL 1 h) |
| `game:views:<id>` | String / `INCR` | **Compteur de vues** temps réel, atomique |
| `leaderboard:rating` | **Sorted Set** (score = note moy.) | Classement « mieux notés » en O(log N) |
| `leaderboard:reviews` | **Sorted Set** (score = nb reviews) | Classement « plus reviewés » |
| `trending:week` | **Sorted Set** + `EXPIRE 7j` | Tendance hebdo, **donnée expirable (TTL)** |
| `game:title` | **Hash** (id → titre) | Affichage des classements sans rejointure |
| `stats:reviews:total` | String / `INCR` | Compteur global temps réel |

### 1.4 Neo4j (Graphe) — relations et recommandations

**Pourquoi cette base ?** Les questions « **amis d'amis** » et « les joueurs qui
ont aimé ce que j'aime ont aussi aimé… » sont des **parcours de relations** sur
plusieurs sauts. En SQL elles deviennent des auto-jointures coûteuses ; en
Cypher, elles s'écrivent et s'exécutent naturellement.

**Modèle de graphe :**

```
(:User {id, username})
   -[:FOLLOWS]->(:User)                  réseau social
   -[:RATED {rating}]->(:Game)           goûts (reflète les reviews Postgres)

(:Game {id, title})
   -[:HAS_GENRE]->(:Genre {name})        classification
   -[:ON_PLATFORM]->(:Platform {name})   disponibilité
   -[:SIMILAR_TO]->(:Game)               similarité éditoriale (symétrique)
```

**Contraintes d'unicité** (= index) sur `User.id`, `Game.id`, `Genre.name`,
`Platform.name`.

---

## 2. Tableau de répartition des données

| Donnée | Base élue | Pourquoi cette base | Présence ailleurs (redondance) |
|--------|-----------|---------------------|--------------------------------|
| Comptes utilisateurs | **PostgreSQL** | Unicité email/username, intégrité | `id`+`username` répliqués dans Neo4j (`:User`) |
| Reviews (note + texte) | **PostgreSQL** | 1 par user/jeu, note bornée, transactions | note reflétée dans Neo4j (`RATED`), event dans Mongo (`activity`), agrégat dans Redis (`leaderboard`) |
| Statuts & heures de jeu | **PostgreSQL** | Contrainte 1 statut/user/jeu, agrégats | — |
| Listes ordonnées | **PostgreSQL** | Ordre (`position`), FK CASCADE | — |
| **Fiches de jeux** | **MongoDB** | Schéma hétérogène, document riche | `id`+`title` répliqués partout comme clé/affichage |
| Flux d'activité | **MongoDB** | Documents polymorphes selon le type | alimenté depuis Postgres/Neo4j |
| Cache de fiches | **Redis** | Lecture sub-ms, expirable (TTL) | copie volatile de Mongo |
| Compteurs de vues / stats | **Redis** | `INCR` atomique temps réel | — (volatil) |
| Classements | **Redis** | Sorted sets natifs O(log N) | dérivé des reviews Postgres |
| Trending hebdo | **Redis** | Donnée **expirable** (TTL 7 j) | — |
| Réseau social (follows) | **Neo4j** | Parcours « amis d'amis » | event `follow` dupliqué dans Mongo feed |
| Recommandations | **Neo4j** | Parcours collaboratif multi-sauts | s'appuie sur `RATED` (reflet des reviews) |
| Jeux similaires | **Neo4j** | Relations entre jeux + genres partagés | — |

### Gestion de la cohérence / redondance

La règle : **une seule source de vérité par donnée**, les autres copies sont des
**projections** au service de la requête.

- L'`id` du jeu (ObjectId Mongo) est la **clé partagée** : un seul identifiant
  relie une fiche (Mongo), ses reviews (Postgres), ses classements (Redis) et son
  nœud (Neo4j). Pas d'identifiants divergents.
- Quand une review est créée (`POST /api/reviews`), l'application écrit dans la
  source de vérité (**Postgres**) **puis** met à jour les projections :
  `leaderboard` (Redis), `activity` (Mongo), relation `RATED` (Neo4j), et
  **invalide** le cache `cache:game:<id>`. La logique est visible dans
  `app/routes/reviews.js`.
- Les données **Redis et Neo4j sont reconstructibles** : `app/seed.js` les
  régénère depuis Postgres/Mongo au démarrage. Une perte de Redis n'est donc pas
  une perte de données.

---

## 3. Requêtes représentatives par base

### 3.1 PostgreSQL — CRUD, jointures, agrégats, contraintes

```sql
-- Jointure : toutes les reviews d'un jeu avec leur auteur
SELECT r.rating, r.body, u.username
FROM reviews r JOIN users u ON u.id = r.user_id
WHERE r.game_id = '650000000000000000000002'
ORDER BY r.created_at DESC;

-- Agrégat : note moyenne et nombre d'avis par jeu
SELECT game_id, ROUND(AVG(rating),2) AS avg, COUNT(*) AS n
FROM reviews GROUP BY game_id;

-- UPSERT respectant la contrainte d'unicité (1 review par user/jeu)
INSERT INTO reviews (user_id, game_id, game_title, rating, body, liked)
VALUES (2, '650000000000000000000001', 'The Witcher 3: Wild Hunt', 4.5, 'Top', TRUE)
ON CONFLICT (user_id, game_id)
DO UPDATE SET rating = EXCLUDED.rating, body = EXCLUDED.body;

-- Liste ordonnée (position) avec son propriétaire
SELECT li.position, li.game_title
FROM list_items li JOIN lists l ON l.id = li.list_id
WHERE l.id = 1 ORDER BY li.position;
```

### 3.2 MongoDB — filtre sur tableaux, agrégation, index texte

```js
// Filtrer les jeux d'un genre (match dans un tableau)
db.games.find({ genres: "RPG" })

// Recherche plein texte (index texte sur title+description)
db.games.find({ $text: { $search: "open world" } })

// Agrégation : nombre de jeux par genre (éclatement du tableau)
db.games.aggregate([
  { $unwind: "$genres" },
  { $group: { _id: "$genres", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// Flux d'activité polymorphe, le plus récent d'abord
db.activity.find().sort({ createdAt: -1 }).limit(20)
```

### 3.3 Redis — sorted sets, compteurs, TTL

```redis
# Classement « mieux notés » (score décroissant)
ZADD leaderboard:rating 4.67 650000000000000000000001
ZREVRANGE leaderboard:rating 0 9 WITHSCORES

# Compteur de vues atomique
INCR game:views:650000000000000000000001

# Cache d'une fiche avec expiration (TTL 1 h)
SET cache:game:650000000000000000000001 "{...json...}" EX 3600

# Donnée expirable : trending de la semaine (TTL 7 jours)
ZADD trending:week 42 650000000000000000000002
EXPIRE trending:week 604800
TTL trending:week
```

### 3.4 Neo4j — parcours de relations (Cypher)

```cypher
// Amis d'amis : suggestions de comptes à suivre (2 sauts)
MATCH (me:User {id: 1})-[:FOLLOWS]->(:User)-[:FOLLOWS]->(fof:User)
WHERE fof <> me AND NOT (me)-[:FOLLOWS]->(fof)
RETURN fof.username, count(*) AS mutual ORDER BY mutual DESC;

// Recommandation collaborative : « ceux qui aiment ce que j'aime
// ont aussi aimé… » (jeux non encore notés par moi)
MATCH (me:User {id: 1})-[:RATED]->(:Game)<-[:RATED]-(other:User)
MATCH (other)-[r:RATED]->(reco:Game)
WHERE r.rating >= 4.5 AND NOT (me)-[:RATED]->(reco)
RETURN reco.title, count(*) AS endorsements
ORDER BY endorsements DESC LIMIT 10;

// Jeux partageant le plus de genres avec un jeu donné
MATCH (g:Game {id: '650000000000000000000005'})-[:HAS_GENRE]->(gen)<-[:HAS_GENRE]-(other:Game)
WHERE other <> g
RETURN other.title, count(gen) AS shared ORDER BY shared DESC;
```

---

## 4. Mise en place (reproductibilité)

- **`docker-compose.yml`** unique démarre les 4 bases (`postgres:17`, `mongo:8`,
  `redis:8`, `neo4j:2025.05-community`) + l'application Node, avec `healthcheck`
  et `depends_on: service_healthy` pour un ordre de démarrage fiable.
- **Auto-peuplement** :
  - Postgres et Mongo via les scripts montés dans `/docker-entrypoint-initdb.d`
    (`seeds/postgres/*.sql`, `seeds/mongo/*.js`).
  - Neo4j et Redis via `app/seed.js` au démarrage (`RUN_SEED=true`), à partir des
    deux bases précédentes → une seule source de vérité par donnée.
- **Connexion réelle** vérifiable : `GET /api/health` interroge les 4 bases.

```
docker compose up --build      # tout se lance et se peuple sur une machine vierge
curl localhost:3000/api/health # {"postgres":"ok","mongo":"ok","redis":"ok","neo4j":"ok"}
```

---

## 5. Synthèse des choix

| Critère de la donnée | Base retenue |
|----------------------|--------------|
| Intégrité, transactions, contraintes, jointures | **PostgreSQL** |
| Schéma variable / document riche auto-suffisant | **MongoDB** |
| Vitesse, volatilité, TTL, classements | **Redis** |
| Relations profondes, recommandations, parcours | **Neo4j** |

Aucune base n'est décorative : chacune porte des données qui **lui
correspondent** et est interrogée par des requêtes **représentatives de sa
force**.
