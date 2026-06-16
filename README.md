# 🎧 SpotyRate https://goolyb.github.io/SpotyRate

A tiny, offline web app that **rates your Spotify playlist** and shows its stats — grade, sound profile, top artists & genres, decades, and record tracks. All processing happens in your browser; nothing is uploaded anywhere.

## Quick start

1. Get your playlist as a CSV (see the Exportify guide below).
2. Open `index.html` in any browser (double-click is enough — no server needed).
3. Drag the CSV onto the page, or click **Выбрать файл**.
4. Get your score and stats. 🎉

## 📥 How to export your playlist (Exportify)

1. Open **[exportify.net](https://exportify.net/)** and click **Get Started** / **Log in with Spotify**.
2. Authorize access — Exportify lists all your playlists.
3. Next to the playlist you want, click **Export** (the download icon).
4. A `.csv` file is downloaded — load that file into SpotyRate.

> Nothing leaves your machine: the file is read locally in the browser.

## How the score works

The grade is **not** AI — it's a deterministic formula computed in the browser:

```
score = 30% popularity  + 30% diversity (unique artists)
      + 20% energy balance (optimum ~0.6)  + 20% positivity (valence)
```

If your export has **no audio features** (Spotify deprecated that API in late 2024, so newer Exportify exports may lack Energy/Valence columns), the app detects it, hides the sound profile, and scores on popularity + diversity instead.

The numeric score maps to a letter grade (`A+` … `E`).

## Project structure

```
playlist-rater/
├── index.html      # entry point — open this
├── css/
│   └── style.css   # all styles
└── js/
    └── app.js      # CSV parsing + rendering + animations
```

## Expected CSV columns

Required: `Track Name`, `Artist Name(s)`.
Optional (used when present): `Album Name`, `Release Date`, `Duration (ms)`, `Popularity`, `Explicit`, `Genres`, `Danceability`, `Energy`, `Loudness`, `Speechiness`, `Acousticness`, `Instrumentalness`, `Liveness`, `Valence`, `Tempo`.
