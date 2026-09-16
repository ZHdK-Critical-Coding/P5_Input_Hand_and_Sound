# P5 -> Hand and Sound

Play tones and chords with one hand in front of the webcam. ml5.js `handPose`
tracks 21 hand landmarks, Tone.js produces the sound.

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

The webcam image is not drawn: the canvas stays white and shows the hand
points (green fingertips = counted), the current chord, pitch and notes.
The view is mirrored so it behaves like a mirror.

## How to Use

1. Start Live Server (click **Go Live** in the VS Code status bar).
2. Allow camera access in the browser.
3. Click into the canvas to enable sound (browsers block audio until a user gesture).
4. Press **f** to toggle fullscreen.

## Customizing

- `LOW_MIDI` / `HIGH_MIDI` — the pitch range the hand maps onto.
- `CHORDS` — semitone intervals per finger count.

## Libraries

- p5.js 1.11.0, ml5.js 1, Tone.js 14.8 (loaded from CDN in `index.html`)
