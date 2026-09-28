# P5.js: Hand and Sound

[English](readme.md)

Mit einer Hand vor der Webcam Töne und Akkorde spielen. ml5.js `handPose`
erkennt 21 Punkte der Hand, Tone.js erzeugt den Klang. Die horizontale
Position der Hand bestimmt die Tonhöhe, die Anzahl gestreckter Finger den
Akkord – ein Ausgangspunkt für gestengesteuerte Instrumente.

- **Links → rechts**: Die Position des Handgelenks bestimmt die Tonhöhe
  (C3 … C6).
- **Anzahl gestreckter Finger** bestimmt, was gespielt wird:

| Finger | Klang                                  |
|--------|----------------------------------------|
| 0      | Stille (Faust)                         |
| 1      | einzelner Ton                          |
| 2      | Dur, 2 Töne (Grundton + grosse Terz)   |
| 3      | Dur-Dreiklang                          |
| 4      | Dur-Dreiklang + Oktave                 |
| 5      | Moll-Septakkord + Oktave               |

## Installation

Voraussetzungen: eine Webcam, Lautsprecher oder Kopfhörer und ein aktueller
Browser (Chrome oder Edge empfohlen).

Bibliotheken (über ein CDN in `index.html` geladen): p5.js 1.11.0,
ml5.js 1.x, Tone.js 14.8.49.

## Ausführen

1. Den Ordner in Visual Studio Code öffnen und Live Server starten (in der
   Statusleiste auf **Go Live** klicken).
2. Im Browser den Zugriff auf die Kamera erlauben.
3. In die Zeichenfläche klicken, um den Ton einzuschalten (Browser
   blockieren Audio bis zu einer Benutzeraktion).
4. Mit **f** den Vollbildmodus ein- und ausschalten.

## Coding-Hilfe

- **`sketch.js` → Konfiguration**: `LOW_MIDI` / `HIGH_MIDI` legen den
  Tonbereich fest, auf den die Hand abgebildet wird (MIDI 48–84). `CHORDS`
  definiert die Halbtonintervalle pro Fingeranzahl. `FINGERS` enthält pro
  Finger den Punkt der Fingerspitze und des Mittelgelenks.
- **`setup()`**: startet die versteckte Webcam, ruft
  `handPose.detectStart()` auf (Resultate landen über `gotHands()` in
  `hands`) und erstellt einen `Tone.PolySynth` mit Dreieck-Oszillator.
  Hüllkurve und `synth.volume` hier ändern.
- **`draw()`**: zählt die gestreckten Finger, rechnet die x-Position des
  Handgelenks in einen Grundton um, baut den Akkord und zeichnet das
  Feedback. Das Webcam-Bild wird nicht gezeichnet; die x-Koordinaten werden
  gespiegelt (`width - x`), damit sich die Zeichenfläche wie ein Spiegel
  verhält.
- **`getFingerStates()`**: Ein Finger gilt als gestreckt, wenn seine Spitze
  weiter vom Handgelenk entfernt ist als sein Mittelgelenk.
- **`chordNotes()` / `setSound()`**: machen aus Grundton und Fingeranzahl
  Notennamen und spielen sie. `setSound()` löst den Synth nur neu aus, wenn
  sich der Akkord ändert, damit eine gehaltene Pose nicht in jedem Frame
  klickt.
- **`drawHandDebug()`, `drawTextOutput()`**: zeichnen die Handpunkte (grüne
  Fingerspitzen = gezählt, rot = Handgelenk) sowie Fingeranzahl, Akkord,
  Tonhöhe und Noten.
- **`mousePressed()`**: ruft beim ersten Klick `Tone.start()` auf;
  `touchStarted()` macht dasselbe auf Touchscreens. **`keyPressed()`**
  schaltet den Vollbildmodus um.
