# CineMatch

Application web de recommandation de films personnalisée. Elle analyse vos notes pour vous suggérer des films adaptés à vos goûts grâce à des algorithmes de machine learning.

---

## Fonctionnalités

- Catalogue de plusieurs milliers de films **et séries** importés depuis TMDB (posters, synopsis, casting, note)
- Onglet Films / Séries et chargement progressif du catalogue
- Système de notation (1 à 5 étoiles)
- Recommandations personnalisées basées sur vos goûts
- Filtres par genre, année, durée, langue
- Recherche par titre ou réalisateur
- Page de détail avec films similaires
- Onboarding pour calibrer les goûts d'un nouvel utilisateur

---

## Stack technique

| Côté | Technologie |
|------|-------------|
| Backend | Python · FastAPI · SQLAlchemy · SQLite |
| Frontend | React · TypeScript · Vite · Tailwind CSS |
| Algorithmes | NumPy · scikit-learn |
| Posters | API TMDB |

---

## Algorithmes de recommandation

Le moteur utilise trois algorithmes combinés :

### 1. Filtrage collaboratif (`collaborative.py`)
*"Les utilisateurs similaires à vous ont aussi aimé..."*

- Construit une matrice utilisateur × film à partir des notes
- Calcule la similarité cosinus entre utilisateurs (après centrage des notes)
- Prédit les notes pour les films non vus en faisant une moyenne pondérée

### 2. Filtrage par contenu (`content_based.py`)
*"Ce film ressemble à ceux que vous avez aimés..."*

- Vectorise les attributs de chaque film (genres × 3, réalisateur × 2, casting) via TF-IDF
- Ajoute l'année et la durée comme features numériques normalisées
- Calcule la similarité cosinus entre films

### 3. Hybride (`hybrid.py`)
*Combinaison dynamique des deux approches selon le nombre de notes :*

| Notes de l'utilisateur | Collaboratif | Contenu |
|------------------------|-------------|---------|
| Moins de 5             | 10 %        | 90 %    |
| Entre 5 et 20          | 40 %        | 60 %    |
| Plus de 20             | 70 %        | 30 %    |

Les nouveaux utilisateurs (cold start) reçoivent les films les plus populaires en attendant d'avoir assez de notes.

---

## Structure du projet

```
cinematch/
├── backend/
│   ├── main.py               # Point d'entrée FastAPI + seed DB
│   ├── models.py             # Modèles SQLAlchemy (Movie, User, Rating)
│   ├── database.py           # Connexion SQLite
│   ├── seed_data.py          # 150 films de démarrage (sans clé API)
│   ├── import_tmdb.py        # Import massif films + séries depuis l'API TMDB
│   ├── .env.example          # Modèle pour la clé TMDB
│   ├── requirements.txt
│   └── routers/
│       ├── movies.py         # GET /movies, /movies/:id, /movies/:id/similar
│       ├── users.py          # POST /users, GET /users/:id/ratings
│       └── recommendations.py# GET /recommendations/:id
│   └── algorithms/
│       ├── collaborative.py
│       ├── content_based.py
│       └── hybrid.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx       # Page d'accueil avec recommandations
│       │   ├── Discover.tsx   # Catalogue avec filtres
│       │   ├── MovieDetail.tsx# Détail d'un film ou d'une série
│       │   ├── Profile.tsx    # Profil utilisateur et historique
│       │   ├── Login.tsx      # Connexion / création de compte
│       │   └── Onboarding.tsx # Calibration des goûts
│       ├── components/
│       ├── services/api.ts    # Appels HTTP vers le backend
│       ├── store/userStore.ts # État global (Zustand)
│       └── types/
└── start.sh                   # Lance backend + frontend en une commande
```

---

## Installation rapide (5 minutes)

La base de données avec les **7 000 films et séries est incluse** dans le dépôt
(`backend/cinematch.db`). Pas besoin de clé API pour démarrer.

### 1. Télécharger le projet

**Option A — sans Git** : sur la page GitHub, cliquer sur le bouton vert **« Code »** →
**« Download ZIP »**, puis décompresser le dossier.

**Option B — avec Git** :

```bash
git clone https://github.com/hossam095/cinematch.git
cd cinematch
```

### 2. Installer ce qu'il faut (une seule fois)

Prérequis : **Python 3.10 ou plus** et **Node.js 18 ou plus**.
- macOS : `brew install python node` (ou Anaconda pour Python)
- Windows : installer Python depuis python.org (cocher « Add to PATH ») et Node.js depuis nodejs.org

Puis, dans le dossier du projet :

```bash
cd backend
pip install -r requirements.txt
cd ../frontend
npm install
cd ..
```

### 3. Lancer

```bash
bash start.sh
```

Ouvrir **http://localhost:5173** dans le navigateur. C'est tout : le catalogue complet est déjà là.

> Sur Windows sans `bash`, lancer les deux commandes dans deux terminaux :
> `cd backend && python -m uvicorn main:app --port 8000` puis `cd frontend && npm run dev`.

> L'API est disponible sur **http://localhost:8000** · Documentation interactive : **http://localhost:8000/docs**

---

## Mettre à jour le catalogue (optionnel)

Seulement si tu veux rafraîchir les titres depuis TMDB, ou activer les **teasers vidéo**
sur les pages de films (ils nécessitent une clé) :

1. Créer un compte gratuit sur [themoviedb.org](https://www.themoviedb.org), puis
   **Paramètres → API** et copier la clé (« API Key » ou « API Read Access Token »).
2. Créer le fichier `backend/.env` (jamais commité) :

```bash
cd backend
cp .env.example .env     # puis coller la clé : TMDB_API_KEY=...
```

3. Lancer l'import (≈ 5 à 10 minutes) :

```bash
python3 import_tmdb.py                      # 4 500 films + 2 500 séries
python3 import_tmdb.py --movies 2000 --tv 1000
python3 import_tmdb.py --lang fr-FR         # titres et synopsis en français
```

Le script peut être relancé : les titres déjà présents sont mis à jour, pas dupliqués.

> Les teasers déjà consultés sont mémorisés dans la base, ils restent visibles sans clé.

---

## API — Principaux endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/movies` | Liste des titres (filtres : media_type=movie\|tv, genre, search, year, language, runtime_max, sort, limit, offset). Le total est renvoyé dans l'en-tête `X-Total-Count` |
| GET | `/movies/:id` | Détail d'un film ou d'une série |
| GET | `/movies/:id/similar` | Titres similaires (contenu) |
| POST | `/users` | Créer un utilisateur |
| POST | `/users/:id/ratings` | Noter un film |
| GET | `/recommendations/:id` | Recommandations personnalisées |
| GET | `/recommendations/:id/sections` | Recommandations par sections |
