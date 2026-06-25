-- =============================================================================
-- GameShelf — Schéma PostgreSQL (Relationnel)
-- Données fortement structurées et transactionnelles : intégrité référentielle,
-- contraintes d'unicité, jointures. C'est le "registre de vérité" pour tout ce
-- qui concerne les utilisateurs et leurs interactions notées avec les jeux.
-- =============================================================================

-- Les jeux eux-mêmes (fiches riches) vivent dans MongoDB. Ici on ne garde que
-- l'identifiant du jeu (game_id = ObjectId Mongo sous forme de chaîne) pour
-- relier une review / un statut / une liste à un jeu sans dupliquer la fiche.

-- ---------------------------------------------------------------------------
-- Utilisateurs
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    bio           TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Reviews / critiques : une note + un texte d'un user sur un jeu
-- Contrainte métier forte : un utilisateur ne peut noter un jeu qu'une fois.
-- ---------------------------------------------------------------------------
CREATE TABLE reviews (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id    VARCHAR(48) NOT NULL,                 -- ObjectId Mongo de la fiche jeu
    game_title VARCHAR(255) NOT NULL,                -- dénormalisé pour l'affichage rapide
    rating     NUMERIC(2,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5.0),
    body       TEXT,
    liked      BOOLEAN     NOT NULL DEFAULT FALSE,   -- le "coeur" Letterboxd
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, game_id)
);

-- ---------------------------------------------------------------------------
-- Statut de jeu pour un utilisateur (joué / en cours / à jouer / abandonné)
-- ---------------------------------------------------------------------------
CREATE TYPE game_status AS ENUM ('played', 'playing', 'backlog', 'abandoned');

CREATE TABLE user_game_status (
    user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id     VARCHAR(48) NOT NULL,
    game_title  VARCHAR(255) NOT NULL,
    status      game_status NOT NULL,
    hours_played INTEGER     NOT NULL DEFAULT 0 CHECK (hours_played >= 0),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, game_id)
);

-- ---------------------------------------------------------------------------
-- Listes personnalisées ("Mes RPG préférés", "À finir en 2026"...)
-- ---------------------------------------------------------------------------
CREATE TABLE lists (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    is_public   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Éléments d'une liste, avec position (ordre maîtrisé par l'utilisateur)
CREATE TABLE list_items (
    list_id    INTEGER     NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    game_id    VARCHAR(48) NOT NULL,
    game_title VARCHAR(255) NOT NULL,
    position   INTEGER     NOT NULL DEFAULT 0,
    added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (list_id, game_id)
);

-- ---------------------------------------------------------------------------
-- Index orientés requêtes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_reviews_game   ON reviews (game_id);
CREATE INDEX idx_reviews_user   ON reviews (user_id);
CREATE INDEX idx_status_game    ON user_game_status (game_id);
CREATE INDEX idx_list_items_pos ON list_items (list_id, position);
