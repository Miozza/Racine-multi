# Prompt — Refonte visuelle « System » (façon Solo Leveling)

Copie tout le bloc ci-dessous et envoie-le à Claude Code (ou dis simplement :
« applique `PROMPT_REFONTE_SYSTEM.md` »). Il a été vérifié contre le code actuel
de ce repo (Racine V4.5.18) : tous les blocs à remplacer existent tels quels.

But : donner à Racine l'identité d'une **fenêtre « System »** (registre Solo
Leveling), plus lisible et grand public, **sans changer aucune fonctionnalité**.
Uniquement du CSS (`styles.css`), `index.html`, et l'ajout de 3 fichiers de
police. Ne touche NI `app.js`, NI les fichiers `data/`, NI aucun texte d'UI.

---

```
Applique un remaniement visuel « System » (esthétique fenêtre de Solo Leveling),
plus lisible et grand public, à l'app Racine. Contrainte stricte : UNIQUEMENT du
CSS (styles.css), index.html, et l'ajout de fichiers de police. NE touche PAS
app.js, ni les fichiers data/, ni aucune logique/texte d'UI. Travaille sur une
nouvelle branche design/system-solo-leveling créée depuis main.

ÉTAPE 1 — Polices Rajdhani (licence OFL) dans assets/fonts/
Télécharge 3 woff2 « latin » de Rajdhani et nomme-les exactement
rajdhani-latin-500.woff2, rajdhani-latin-600.woff2, rajdhani-latin-700.woff2 :
  500 : https://fonts.gstatic.com/s/rajdhani/v17/LDI2apCSOBg7S-QT7pb0EPOreec.woff2
  600 : https://fonts.gstatic.com/s/rajdhani/v17/LDI2apCSOBg7S-QT7pbYF_Oreec.woff2
  700 : https://fonts.gstatic.com/s/rajdhani/v17/LDI2apCSOBg7S-QT7pa8FvOreec.woff2
Si ces URLs échouent, récupère la CSS via
https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700 (avec un
User-Agent de navigateur récent pour obtenir du woff2) et prends UNIQUEMENT les
blocs @font-face « latin » (unicode-range commençant par U+0000-00FF). Vérifie
que chaque fichier commence bien par les octets « wOF2 ».

ÉTAPE 2 — styles.css

2a) Juste APRÈS le bloc « @font-face { font-family: 'Orbitron'; ... } », ajoute :

@font-face {
  font-family: 'Rajdhani'; font-style: normal; font-weight: 500; font-display: swap;
  src: url('assets/fonts/rajdhani-latin-500.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Rajdhani'; font-style: normal; font-weight: 600; font-display: swap;
  src: url('assets/fonts/rajdhani-latin-600.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Rajdhani'; font-style: normal; font-weight: 700; font-display: swap;
  src: url('assets/fonts/rajdhani-latin-700.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

2b) Dans :root, remplace la ligne
  --font-hud:  'Orbitron', monospace;
par :
  --font-hud:  'Rajdhani', 'Orbitron', sans-serif;
  --font-display: 'Orbitron', 'Rajdhani', sans-serif;
  --sl-edge:   rgba(96,205,255,.30);
  --sl-edge2:  rgba(96,205,255,.55);
  --sl-sheen:  rgba(120,220,255,.06);
  --sl-glow:   rgba(0,180,255,.28);

2c) Dans :root, remplace
  --text2:     #c8dcf5;
  --muted:     #9bbbd8;
par
  --text2:     #cfe1f7;
  --muted:     #a8c4e0;

2d) Remplace le bloc « html, body { ... } » ET le bloc « body::before » (scanlines)
qui le suit immédiatement, par :

html, body {
  background: var(--bg); color: var(--text); font-family: var(--font-main);
  font-size: 16px; line-height: 1.5; max-width: 100%; overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}
body {
  background:
    radial-gradient(135% 75% at 50% -12%, rgba(30,144,255,.12), transparent 58%),
    radial-gradient(120% 65% at 100% 108%, rgba(124,58,255,.07), transparent 55%),
    var(--bg);
  background-attachment: fixed;
}
body::before {
  content: ''; position: fixed; inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 3px,
    rgba(0,0,0,.028) 3px, rgba(0,0,0,.028) 4px);
  pointer-events: none; z-index: 999;
}

2e) Remplace le bloc « .block { ... } » (le conteneur de carte d'exercice,
background var(--panel2)) par :

.block {
  background: linear-gradient(180deg, var(--sl-sheen), transparent 34%), var(--panel2);
  border: 1px solid var(--sl-edge); border-radius: 12px; overflow: hidden; position: relative;
  box-shadow: inset 0 1px 0 rgba(150,225,255,.07), 0 10px 26px -16px var(--sl-glow);
}

2f) Remplace le bloc « .racine-gate-card{ ... } » par :

.racine-gate-card{
  position:relative; width:100%; max-width:520px;
  background: linear-gradient(180deg, rgba(120,220,255,.07), transparent 30%), var(--panel);
  border:1px solid var(--sl-edge2); border-radius:16px; padding:24px;
  margin-top:max(20px, env(safe-area-inset-top, 0px));
  box-shadow: inset 0 1px 0 rgba(150,225,255,.10), 0 0 40px -10px var(--sl-glow), 0 24px 60px -30px rgba(0,0,0,.8);
}
.racine-gate-card::after{
  content:'';position:absolute;inset:8px;pointer-events:none;
  --l:16px;--t:2px;--c:var(--sl-edge2);
  background:
    linear-gradient(var(--c),var(--c)) 0 0/var(--l) var(--t) no-repeat,
    linear-gradient(var(--c),var(--c)) 0 0/var(--t) var(--l) no-repeat,
    linear-gradient(var(--c),var(--c)) 100% 0/var(--l) var(--t) no-repeat,
    linear-gradient(var(--c),var(--c)) 100% 0/var(--t) var(--l) no-repeat,
    linear-gradient(var(--c),var(--c)) 0 100%/var(--l) var(--t) no-repeat,
    linear-gradient(var(--c),var(--c)) 0 100%/var(--t) var(--l) no-repeat,
    linear-gradient(var(--c),var(--c)) 100% 100%/var(--l) var(--t) no-repeat,
    linear-gradient(var(--c),var(--c)) 100% 100%/var(--t) var(--l) no-repeat;
}

ÉTAPE 3 — index.html
À côté des lignes « <link rel="preload" as="font" ... > », ajoute :
  <link rel="preload" as="font" type="font/woff2" href="assets/fonts/rajdhani-latin-600.woff2" crossorigin/>

ÉTAPE 4 — service-worker.js
Bump le CACHE_NAME (ex. "racine-v4.5" -> "racine-v4.6") pour que la nouvelle
police et le CSS soient servis frais dès le prochain chargement.

ÉTAPE 5 — Vérification
Ouvre l'app en local. Attendu :
- écran d'accueil / onboarding : cadre à équerres cyan aux 4 coins + halo cyan ;
- titres et labels HUD en Rajdhani (plus fins et lisibles qu'Orbitron) ;
- légère lueur cyan + voile lumineux en haut des cartes ;
- fond en aurore bleue discrète au lieu d'un noir plat, grain de scanlines réduit.
Rien d'autre ne doit changer (aucune fonctionnalité, aucun texte).

ÉTAPE 6 — Commit + push de la branche design/system-solo-leveling.
```

---

## Notes

- **Rien de fonctionnel ne change** : ce sont des tokens CSS, la carte d'accueil,
  les cartes d'exercice, le fond, et un préchargement de police.
- Le token `--font-hud` pilote ~150 éléments : le changer bascule toute la
  typographie HUD d'un coup. Orbitron reste disponible via `--font-display`.
- Après application, **rechargement forcé** (le bump du `CACHE_NAME` s'en charge)
  pour voir la nouvelle police immédiatement.
- Cette refonte correspond aux passes 1 (profondeur/lisibilité) + 2 (fonte +
  cadre « System ») déjà réalisées et validées visuellement.
