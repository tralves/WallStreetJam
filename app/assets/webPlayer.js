console.log("webPlayer.js starting!");

const audioCtx = new AudioContext();

// setup analyser
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;
var bufferLength = analyser.frequencyBinCount;
var dataArray = new Uint8Array(bufferLength);
analyser.connect(audioCtx.destination);

// array of voices { name, filepath, buffer }
let voiceBuffers = [];

let isPlaying = false;

// load voice buffers
async function setVoiceBuffers(voices) {
    voiceBuffers = await Promise.all(
        voices.map(async voice => {
            return {
                ...voice,
                buffer: await loadSample(voice.filepath)
            };
        })
    );

    return voiceBuffers;
}

function playStop() {
    isPlaying = !isPlaying;

    if (isPlaying) {
        play();
    } else {
        stop();
    }
}

function play() {
    // start playing
    // check if context is in suspended state (autoplay policy)
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }

    currentNote = 0;
    nextNoteTime = audioCtx.currentTime;
    scheduler(); // kick off scheduling
    // emit 'started' event to NS
    window.nsWebViewBridge && window.nsWebViewBridge.emit('started');
}

function stop() {
    clearTimeout(timerID);
    voiceBuffers.forEach(voice => {
        if (voice.source) {
            voice.source.stop();
        }
    });
    // emit 'stopped' event to NS
    window.nsWebViewBridge && window.nsWebViewBridge.emit('stopped');
}

function getFreqData() {
    analyser.getByteFrequencyData(dataArray);
    return [...dataArray];
}

// Scheduling ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// adapted from https://mdn.github.io/webaudio-examples/step-sequencer/
let tempo = 256;

const lookahead = 50.0; // How frequently to call scheduling function (in milliseconds)
const scheduleAheadTime = 0.2; // How far ahead to schedule audio (sec)

let currentNote = 0; // The note we are currently playing
let nextNoteTime = 0.0; // when the next note is due.
function nextNote() {
    const secondsPerBeat = 60.0 / tempo;
    nextNoteTime += secondsPerBeat; // Add beat length to last beat time
    // Advance the beat number
    currentNote++;
}

let timerID;
function scheduler() {
    // while there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        scheduleNote(currentNote, nextNoteTime);
        nextNote();
    }
    timerID = window.setTimeout(scheduler, lookahead);
}

// ------ sample load
async function loadSample(filepath) {
    let response;
    try {
        response = await fetch(filepath);
    } catch (e) {
        console.error(`Error loading file ${filepath}: ${e}`);
        throw new Error(e);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer;
}

// play sample once
function playSample(voice, when) {
    const sampleSource = audioCtx.createBufferSource();
    sampleSource.buffer = voice.buffer;
    // sampleSource.playbackRate.setValueAtTime(1, audioCtx.currentTime);
    sampleSource.connect(analyser);
    sampleSource.start(when);
    voice.source = sampleSource;
    sampleSource.onended = () => voice.source = null;
    return sampleSource;
}

// ------ test noise
// expose noteDuration & band frequency
let noiseDuration = 0.1;
let bandHz = 1000;

function playNoise() {
    const bufferSize = audioCtx.sampleRate * noiseDuration; // set the time of the note
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate); // create an empty buffer
    const data = buffer.getChannelData(0); // get data

    // fill the buffer with noise
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    // create a buffer source for our created data
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = bandHz;

    // connect our graph
    noise.connect(bandpass).connect(analyser);
    noise.start();
}
