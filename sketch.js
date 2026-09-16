/**
 * Hand and Sound
 * =====================================================================
 * Play tones and chords with one hand in front of the webcam.
 *
 *   - Move the hand LEFT  -> RIGHT   ->  changes the HEIGHT (pitch) of the tone.
 *   - The number of EXTENDED FINGERS chooses what is played:
 *
 *        1 finger   ->  single tone
 *        2 fingers  ->  major chord  (2 tones:  root + major third)
 *        3 fingers  ->  major chord  (3 tones:  major triad)
 *        4 fingers  ->  major chord  (4 tones:  major triad + octave)
 *        5 fingers  ->  minor chord  (5 tones:  minor seventh + octave)
 *        0 fingers  ->  silence (a fist)
 *
 * Libraries (loaded from CDN in index.html):
 *   - p5.js   : creates the canvas, captures the webcam, draws everything.
 *   - ml5.js  : HandPose model. Returns 21 landmark points per detected hand.
 *   - Tone.js : Web Audio synthesizer that actually produces the sound.
 *
 * Data flow each frame:
 *   webcam image --(ml5 HandPose)--> hand landmarks
 *                --> count extended fingers      --> which chord
 *                --> horizontal position of wrist --> root pitch (height)
 *                --> Tone.js plays the resulting notes
 *                --> p5 draws debug points + text on a white background.
 *
 * The webcam image itself is NOT drawn: the canvas stays white and shows
 * only the debug points (hand + fingertips) and the text output.
 *
 * Note on mirroring: the raw webcam image is not mirrored, so we flip the
 * x-coordinate (mirroredX = width - x) everywhere a point is drawn or used
 * for pitch. That makes the canvas behave like a mirror, which feels natural.
 * =====================================================================
 */

// ---------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------

// Pitch range that the hand maps onto, in MIDI note numbers.
// 48 = C3 (low, left edge)  ...  84 = C6 (high, right edge). 3 octaves.
const LOW_MIDI = 48;
const HIGH_MIDI = 84;

// Finger count -> chord definition.
// `intervals` are semitone offsets added on top of the root pitch.
//   major third = 4 semitones, perfect fifth = 7, octave = 12,
//   minor third = 3, minor seventh = 10.
const CHORDS = {
  1: { label: "single tone",     intervals: [0] },
  2: { label: "major (2 tones)", intervals: [0, 4] },
  3: { label: "major (3 tones)", intervals: [0, 4, 7] },
  4: { label: "major (4 tones)", intervals: [0, 4, 7, 12] },
  5: { label: "minor (5 tones)", intervals: [0, 3, 7, 10, 12] },
};

// HandPose landmark indices (MediaPipe Hands, 0..20).
const WRIST = 0;

// For each finger: the fingertip landmark and a middle-joint (PIP) landmark.
// A finger counts as "extended" when its tip is FARTHER from the wrist than
// its middle joint. This works for any hand rotation and is easy to read.
const FINGERS = [
  { name: "thumb",  tip: 4,  pip: 2  },
  { name: "index",  tip: 8,  pip: 6  },
  { name: "middle", tip: 12, pip: 10 },
  { name: "ring",   tip: 16, pip: 14 },
  { name: "pinky",  tip: 20, pip: 18 },
];

// ---------------------------------------------------------------------
// State
// ---------------------------------------------------------------------

let handPose;        // the ml5 HandPose model
let video;           // hidden webcam capture (only used for detection)
let hands = [];      // latest detection result (array of hand objects)

let synth;           // Tone.js polyphonic synthesizer
let audioReady = false; // becomes true after the first user click (required by browsers)

// Remember what is currently playing so we only re-trigger the synth when
// the chord actually changes (otherwise it would click on every frame).
let lastRootMidi = null;
let lastFingerCount = null;

// ---------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------

function preload() {
  // Load the HandPose model. We only ever track one hand.
  handPose = ml5.handPose({ maxHands: 1 });
}

function setup() {
  createCanvas(448, 256);

  // Webcam capture, sized to the canvas so landmark coordinates match the
  // canvas pixels. It is hidden because we only want the white background.
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  // Start continuous detection; `gotHands` is called whenever a result is ready.
  handPose.detectStart(video, gotHands);

  // Polyphonic synth (can play several notes at once) -> speakers.
  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.4 },
  }).toDestination();
  synth.volume.value = -10; // a little quieter, in decibels

  textFont("monospace");
}

// ml5 callback: store the most recent list of detected hands.
function gotHands(results) {
  hands = results;
}

// ---------------------------------------------------------------------
// Draw loop
// ---------------------------------------------------------------------

function draw() {
  background(255); // white background

  if (hands.length > 0) {
    const hand = hands[0];

    // 1. Which fingers are extended -> how many.
    const fingerStates = getFingerStates(hand);
    const fingerCount = fingerStates.filter((f) => f.extended).length;

    // 2. Horizontal position of the wrist -> root pitch (the "height").
    const wrist = hand.keypoints[WRIST];
    const handX = width - wrist.x; // mirrored, see header note
    const rootMidi = constrain(
      round(map(handX, 0, width, LOW_MIDI, HIGH_MIDI)),
      LOW_MIDI,
      HIGH_MIDI
    );

    // 3. Turn that into actual notes and play them.
    const notes = chordNotes(rootMidi, fingerCount);
    setSound(rootMidi, fingerCount);

    // 4. Visual feedback.
    drawPitchGuide(handX);
    drawHandDebug(hand, fingerStates);     // debug output: hand + finger points
    drawTextOutput(fingerCount, rootMidi, notes); // text output: height + tones
  } else {
    // No hand in view -> stop any sound and show a hint.
    setSound(null, null);
    drawNoHand();
  }

  drawScaleLabels();
  if (!audioReady) drawAudioHint();
}

// ---------------------------------------------------------------------
// Hand analysis
// ---------------------------------------------------------------------

/**
 * For every finger, decide whether it is extended.
 * Returns: [{ name, tip, extended }, ...] in thumb..pinky order.
 */
function getFingerStates(hand) {
  const wrist = hand.keypoints[WRIST];
  return FINGERS.map((f) => {
    const tip = hand.keypoints[f.tip];
    const pip = hand.keypoints[f.pip];
    const tipFromWrist = dist(tip.x, tip.y, wrist.x, wrist.y);
    const pipFromWrist = dist(pip.x, pip.y, wrist.x, wrist.y);
    return { name: f.name, tip, extended: tipFromWrist > pipFromWrist };
  });
}

// ---------------------------------------------------------------------
// Sound
// ---------------------------------------------------------------------

/** Build the note names for a chord, e.g. (60, 3) -> ["C4", "E4", "G4"]. */
function chordNotes(rootMidi, fingerCount) {
  const chord = CHORDS[fingerCount];
  if (!chord) return []; // 0 fingers (fist) or unknown -> silence
  return chord.intervals.map((semitones) => midiToNote(rootMidi + semitones));
}

/**
 * Make the synth play the chord for (rootMidi, fingerCount).
 * Only re-triggers when the pitch or finger count actually changed, so a
 * held pose keeps sounding smoothly instead of clicking every frame.
 * Pass (null, null) to stop all sound.
 */
function setSound(rootMidi, fingerCount) {
  if (rootMidi === lastRootMidi && fingerCount === lastFingerCount) return;
  lastRootMidi = rootMidi;
  lastFingerCount = fingerCount;

  if (!audioReady) return; // audio not unlocked yet

  synth.releaseAll(); // stop whatever was playing
  const notes = chordNotes(rootMidi, fingerCount);
  if (notes.length > 0) synth.triggerAttack(notes);
}

/** MIDI number -> note name, e.g. 60 -> "C4". */
function midiToNote(midi) {
  return Tone.Frequency(midi, "midi").toNote();
}

/** MIDI number -> frequency in Hz, e.g. 60 -> 261.6. */
function midiToFreq(midi) {
  return Tone.Frequency(midi, "midi").toFrequency();
}

// ---------------------------------------------------------------------
// Drawing: debug points
// ---------------------------------------------------------------------

/** Debug output: draw the hand point (wrist) and the finger points (tips). */
function drawHandDebug(hand, fingerStates) {
  noStroke();

  // All 21 landmarks as faint gray dots, for context.
  fill(190);
  for (const kp of hand.keypoints) {
    circle(width - kp.x, kp.y, 4);
  }

  // Fingertips: green when extended (counted), gray when folded.
  for (const f of fingerStates) {
    fill(f.extended ? color(30, 180, 90) : color(160));
    circle(width - f.tip.x, f.tip.y, 9);
  }

  // The hand point = wrist, drawn in red and labelled.
  const wrist = hand.keypoints[WRIST];
  fill(220, 30, 30);
  circle(width - wrist.x, wrist.y, 11);
  fill(220, 30, 30);
  textSize(10);
  textAlign(CENTER, TOP);
  text("hand", width - wrist.x, wrist.y + 8);
}

/** Faint vertical line showing where the hand sits on the pitch range. */
function drawPitchGuide(handX) {
  stroke(0, 35);
  line(handX, 0, handX, height);
  noStroke();
}

// ---------------------------------------------------------------------
// Drawing: text output
// ---------------------------------------------------------------------

/** Text output: current finger count, chord, height (pitch) and tones. */
function drawTextOutput(fingerCount, rootMidi, notes) {
  const chord = CHORDS[fingerCount];

  fill(20);
  noStroke();
  textSize(13);
  textAlign(LEFT, TOP);

  const x = 10;
  const lineHeight = 18;
  let y = 10;

  text("Fingers: " + fingerCount, x, y);
  y += lineHeight;

  text("Chord:   " + (chord ? chord.label : "— (fist = silence)"), x, y);
  y += lineHeight;

  text(
    "Height:  " + midiToNote(rootMidi) + "  (" + round(midiToFreq(rootMidi)) + " Hz)",
    x,
    y
  );
  y += lineHeight;

  text("Tones:   " + (notes.length > 0 ? notes.join("  ") : "—"), x, y);
}

/** Message shown when no hand is detected. */
function drawNoHand() {
  fill(120);
  noStroke();
  textSize(14);
  textAlign(CENTER, CENTER);
  text("Show one hand to the camera", width / 2, height / 2);
}

/** Small labels reminding which side is low / high pitch. */
function drawScaleLabels() {
  fill(150);
  noStroke();
  textSize(11);
  textAlign(LEFT, BOTTOM);
  text("left = low", 8, height - 6);
  textAlign(RIGHT, BOTTOM);
  text("right = high", width - 8, height - 6);
}

/** Browsers block audio until the user interacts: prompt for a click. */
function drawAudioHint() {
  fill(0, 150);
  noStroke();
  rectMode(CORNER);
  rect(0, height / 2 - 16, width, 32);
  fill(255);
  textSize(13);
  textAlign(CENTER, CENTER);
  text("Click to enable sound", width / 2, height / 2);
}

// ---------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------

// Start the Web Audio engine on the first click (required by all browsers).
async function mousePressed() {
  if (!audioReady) {
    await Tone.start();
    audioReady = true;
    // Force a re-trigger so the current pose sounds immediately.
    lastRootMidi = null;
    lastFingerCount = null;
    console.log("Audio enabled");
  }
}

// Same behaviour for touch screens.
function touchStarted() {
  mousePressed();
}

// Press "f" to toggle fullscreen.
function keyPressed() {
  if (key === "f" || key === "F") {
    fullscreen(!fullscreen());
  }
}
