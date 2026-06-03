# CineMatch

Application web de recommandation de films personnalisée. Elle analyse vos notes pour vous suggérer des films adaptés à vos goûts grâce à des algorithmes de machine learning.

---

## Fonctionnalités

- Catalogue de 150 films avec posters, synopsis, note TMDB
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
│   ├── seed_data.py          # 150 films préconfigurés
│   ├── fetch_posters.py      # Script de récupération des posters TMDB
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
│       │   ├── MovieDetail.tsx# Détail d'un film
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

## Installation et lancement

### Prérequis
- Python 3.9+
- Node.js 18+

### 1. Installer les dépendances backend

```bash
cd backend
pip install -r requirements.txt
```

### 2. Installer les dépendances frontend

```bash
cd frontend
npm install
```

### 3. Lancer l'application

```bash
bash start.sh
```

Ouvrir **http://localhost:5173** dans le navigateur.

> L'API est disponible sur **http://localhost:8000** · Documentation interactive : **http://localhost:8000/docs**

---

## Récupérer les posters (optionnel)

Les films ont déjà des posters par défaut. Pour les mettre à jour via l'API TMDB :

1. Créer un compte gratuit sur [themoviedb.org](https://www.themoviedb.org) et obtenir une clé API
2. Lancer le script :

```bash
cd backend
python3 fetch_posters.py TA_CLE_API
```

---

## API — Principaux endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/movies` | Liste des films (filtres : genre, search, year, sort, limit) |
| GET | `/movies/:id` | Détail d'un film |
| GET | `/movies/:id/similar` | Films similaires (contenu) |
| POST | `/users` | Créer un utilisateur |
| POST | `/users/:id/ratings` | Noter un film |
| GET | `/recommendations/:id` | Recommandations personnalisées |
| GET | `/recommendations/:id/sections` | Recommandations par sections |
