# P5.js: Hand and Sound

[Deutsch](README_DE.md)

Play tones and chords with one hand in front of the webcam. ml5.js
`handPose` tracks 21 hand landmarks, Tone.js produces the sound. The
horizontal hand position sets the pitch, the number of extended fingers
chooses the chord – a starting point for gesture-controlled instruments.

- **Left → right**: the wrist position sets the pitch (C3 … C6).
- **Number of extended fingers** chooses what is played:

| Fingers | Sound                                  |
|---------|----------------------------------------|
| 0       | silence (fist)                         |
| 1       | single tone                            |
| 2       | major, 2 tones (root + major third)    |
| 3       | major triad                            |
| 4       | major triad + octave                   |
| 5       | minor seventh + octave                 |

## Installation

Requirements: a webcam, speakers or headphones and a current browser
(Chrome or Edge recommended).

1. Open the folder in Visual Studio Code and start Live Server (click
   **Go Live** in the status bar).
2. Allow camera access in the browser.
3. Click into the canvas to enable sound (browsers block audio until a
   user gesture).
4. Press **f** to toggle fullscreen.

Libraries (loaded from a CDN in `index.html`): p5.js 1.11.0, ml5.js 1.x,
Tone.js 14.8.49.

## Coding Help

- **`sketch.js` → configuration**: `LOW_MIDI` / `HIGH_MIDI` set the pitch
  range the hand maps onto (MIDI 48–84). `CHORDS` defines the semitone
  intervals per finger count. `FINGERS` lists the tip and middle-joint
  landmark of each finger.
- **`setup()`**: starts the hidden webcam, runs `handPose.detectStart()`
  (results go to `hands` via `gotHands()`) and creates a `Tone.PolySynth`
  with a triangle oscillator. Change the envelope and `synth.volume` here.
- **`draw()`**: counts the extended fingers, maps the wrist x position to
  a root note, builds the chord and draws the feedback. The webcam image is
  not drawn; x coordinates are mirrored (`width - x`) so the canvas behaves
  like a mirror.
- **`getFingerStates()`**: a finger counts as extended when its tip is
  farther from the wrist than its middle joint.
- **`chordNotes()` / `setSound()`**: turn root and finger count into note
  names and play them. `setSound()` only re-triggers the synth when the
  chord changes, so a held pose does not click every frame.
- **`drawHandDebug()`, `drawTextOutput()`**: draw the landmarks (green
  fingertips = counted, red = wrist) and the finger count, chord, pitch and
  notes.
- **`mousePressed()`**: calls `Tone.start()` on the first click;
  `touchStarted()` does the same on touch screens. **`keyPressed()`**
  toggles fullscreen.
