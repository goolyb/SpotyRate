# 🎧 SpotyRate — https://goolyb.github.io/SpotyRate

A tiny, offline web app that **rates your playlist** and shows its stats — grade, sound profile, top artists & genres, decades, and record tracks. Works with **Spotify, Apple Music, YouTube Music, SoundCloud** and any other service you can export to CSV. All processing happens in your browser; nothing is uploaded anywhere.

## Quick start

1. Get your playlist as a CSV (see the export guides below).
2. Open `index.html` in any browser (double-click is enough — no server needed).
3. Drag the CSV/TXT onto the page, or click **Выбрать файл**.
4. Get your score and stats. 🎉

The format is detected automatically from the column headers — you don't pick a service.

## 📥 How to export your playlist

### Spotify — via Exportify (includes audio features → full scoring)

1. Open **[exportify.net](https://exportify.net/)** and click **Get Started** / **Log in with Spotify**.
2. Authorize access — Exportify lists all your playlists.
3. Next to the playlist you want, click **Export** (the download icon).
4. A `.csv` file is downloaded — load that file in.

### Apple Music, YouTube Music, SoundCloud & others — via a converter

- **[Soundiiz](https://soundiiz.com/)** or **[TuneMyMusic](https://www.tunemymusic.com/)**: connect your service, pick the playlist, and export to **CSV / file**.
- **YouTube Music**: also works via **[Google Takeout](https://takeout.google.com/)** (playlist CSV).
- **Apple Music**: also works via the native export in the Music app — *File → Library → Export Playlist…* (a tab-separated `.txt`, also supported here).

> Services other than Spotify don't expose audio features, so the score falls back to popularity + diversity (see below).

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
└── docs/               # served as-is (e.g. via GitHub Pages)
    ├── index.html      # entry point — open this
    ├── css/
    │   └── style.css   # all styles
    └── js/
        └── app.js      # CSV parsing + format detection + rendering
```

## Expected CSV columns

Column names are matched case-insensitively against a list of aliases, so exports
from different services all work. The delimiter (comma or tab) is auto-detected.

| Field | Recognized headers |
|-------|--------------------|
| Track (required) | `Track Name`, `Title`, `Name`, `Song Title`, `Song`, `Track` |
| Artist (required) | `Artist Name(s)`, `Artist`, `Artists`, `Artist Name` |
| Album | `Album Name`, `Album`, `Album Title` |
| Date / year | `Release Date`, `Release Year`, `Year`, `Date` |
| Duration | `Duration (ms)`, `Duration`, `Time`, `Length` — accepts ms, seconds, or `mm:ss` |
| Genre | `Genres`, `Genre` |
| Popularity | `Popularity` (Spotify only) |
| Explicit | `Explicit` |
| Audio features | `Danceability`, `Energy`, `Loudness`, `Speechiness`, `Acousticness`, `Instrumentalness`, `Liveness`, `Valence`, `Tempo` (Spotify exports only) |

Only **Track** and **Artist** are required; everything else is used when present.
