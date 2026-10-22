# Clean-a-Doro 🍅

Eine kleine zweisprachige PWA für entspanntes Putzen im Pomodoro-Rhythmus.
A small bilingual cleaning Pomodoro progressive web app.

## Funktionen / Features

- Deutsch und Englisch / German and English
- Einstellbare Putzzeit und Pausen / Configurable cleaning sessions and breaks
- Standard: 10 Minuten putzen, 10 Minuten Pause; nach jeder 3. Runde 30 Minuten, nach jeder 6. Runde 60 Minuten Pause. Die längere Pause ersetzt die normale Pause.
- Start startet den Timer. Bei 00:00 wiederholt sich der Alarm; Start quittiert ihn und startet die nächste Phase. Stop / Abbruch beendet den Alarm und setzt den Ablauf zurück.
- Start begins the timer. At 00:00 the alert repeats until Start acknowledges it and starts the next phase. Stop resets the session.
- Drei synthetisch erzeugte Signaltöne und Lautstärkeregelung / Three synthesized alert sounds and volume control
- Lokale Speicherung, Offline-Cache, installierbare PWA / Local storage, offline cache, installable PWA
- Helles und dunkles Design (folgt der Systemeinstellung) / Light and dark theme following the system setting
- Optionale Benachrichtigung bei Phasenende, wenn die App im Hintergrund ist (Erlaubnis wird beim ersten Start abgefragt) / Optional notification when a phase ends while the app is in the background (permission is requested on first start)
- Eigenes Tomaten-Mopp-Logo / Tomato-and-mop logo

## Lokal starten / Run locally

Keine Installation oder Build-Werkzeuge erforderlich. / No dependencies or build step required.

```sh
python3 -m http.server 8080 --directory dist
```

Open http://localhost:8080 in your browser.

## Hosting

Den Inhalt von `dist/` auf einem HTTPS-Webserver bereitstellen. Alle Pfade sind relativ, daher ist auch Hosting in einem Unterverzeichnis möglich. Service Worker und PWA-Installation benötigen HTTPS (oder localhost).

Serve `dist/` over HTTPS. Relative paths support subdirectory hosting. Service workers and PWA installation require HTTPS or localhost.

## Hinweise / Limitations

Mobile Browser können Timer und Audio bei gesperrtem Bildschirm oder im Hintergrund aussetzen. Für zuverlässige Signaltöne die App geöffnet lassen. Verstrichene Zeit wird anhand der Uhrzeit geprüft. Nach Ablauf wartet die App auf Bestätigung; verpasste Phasen werden nicht automatisch übersprungen. Nach einem Neuladen ist Audio bis zur nächsten Berührung blockiert; ein offener Alarm wird dann wieder hörbar. Während Timer oder Alarm laufen, hält die App den Bildschirm wach (sofern der Browser die Wake Lock API unterstützt). Auf iPhones schaltet der Stummschalter auch die Signaltöne stumm.

Mobile browsers may suspend timers and audio in the background or while locked. Keep the app open for reliable alerts. Elapsed time is checked against the clock; completed phases wait for acknowledgment. After a reload, audio is blocked until the next tap; a pending alarm becomes audible again then. While the timer or alarm is active the app keeps the screen awake (where the Wake Lock API is supported). On iPhones the mute switch also silences the alerts.

Einstellungen und Timerstatus werden ausschließlich lokal im Browser gespeichert. / Settings and timer state are stored locally in the browser.

## Aufbau / Structure

- `dist/index.html`: Oberfläche / UI
- `dist/style.css`: Responsive Gestaltung / styling
- `dist/app.js`: Timer, Übersetzungen, Einstellungen und Audio / timer, translations, settings and audio
- `dist/sw.js`: Offline-Cache
- `dist/manifest.webmanifest`: PWA-Metadaten
- `dist/icon*`: Logo und App-Icons (`icon-maskable-*` mit Sicherheitsrand für Android / with safe zone for Android)

Der Code liegt bewusst unminifiziert in `dist/`, damit er ohne Build-Schritt lesbar und reviewbar bleibt. Bei geänderter Asset-Liste die Cache-Version in `sw.js` erhöhen. / Code in `dist/` is intentionally unminified. Bump the cache version in `sw.js` when the asset list changes.

Die Signaltöne entstehen per Web Audio API ohne fremde Audioaufnahmen. / Sounds use Web Audio synthesis without third-party recordings.
