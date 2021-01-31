# WallStreet<i>Jam</i>

A NativeScript-Vue demo app that plays a sound sequence with 4 tracks, using Web Audio APIs.
The sequence is played from a webview, but overall controlled in NativeScript.

## Demo

[![{N}-Vue and Web Audio APIs demo app
](https://i.ytimg.com/vi/ue5gIMBBdnA/hqdefault.jpg?sqp=-oaymwEZCNACELwBSFXyq4qpAwsIARUAAIhCGAFwAQ==&rs=AOn4CLD5MOFLzOO1a3Obcnqej7Y9IQZP5A)](https://www.youtube.com/watch?v=ue5gIMBBdnA)

## Getting started

### Prerequisites

- [Nodejs](https://nodejs.org/)
- [yarn](https://yarnpkg.com/)
- NativeScript CLI >= 7.1
  ```bash
  npm install -g nativescript
  ```
- Setup for [macOS (iOS and Android development)](https://docs.nativescript.org/start/ns-setup-os-x)
- Setup for [Windows (Android development)](https://docs.nativescript.org/start/ns-setup-win)
- Setup for [Linux (Android development)](https://docs.nativescript.org/start/ns-setup-linux)

### Running the code

1. Clone this repo:

```bash
git clone https://github.com/tralves/WallStreetJam
cd WallStreetJam
```

2. Run the app:

```bash
ns run android
```

### ...or, use the pre-built APK

which can be found [here](https://github.com/tralves/WallStreetJam/tree/master/builds).

## Approach

In this project we decided to use the Web Audio APIs because it is:
- Much easier to use than purely native APIs;
- Cross-platform;
- Powerful (supports filters, analyser, etc.);
- Fast enough;
- Potential code sharing with web app;

We used a WebView to play the sounds, but every thing else is done in NativeScript.
This way we get the benefits of using the native platform for UI, for instance.

### The WebView

The sound is played from an **invisible** WebView inside the {N} app. We used the
`@nota/nativescript-webview-ext`(https://github.com/Notalib/nativescript-webview-ext) WebView
component for it's additional features regarding the NativeScript/WebView communication.

Most of the sound loading and sequence processing code lives in [`assets/webPlayer.js`](https://github.com/tralves/WallStreetJam/blob/master/app/assets/webPlayer.js).
We extracted the specific sequence code to the file [`assets/sequences/seq1.js`](https://github.com/tralves/WallStreetJam/blob/master/app/assets/sequences/seq1.js). The idea
is that we could eventually load different sequences easier.

In `webPlayer.js` we have of the scheduler code (adapted from [here](https://mdn.github.io/webaudio-examples/step-sequencer/)),
that implements the note looper. At each note, the `scheduleNote()` function is called.
This function is implemented in the sequence file (`seq1.js`).

> Actually, it would be even better to create an abstract sequence notation, but that seemed
too complex for this one example. Also, abstracting from one single case would probably lead
to the wrong abstraction.


We used the web page at `assets/test.html` to test and develop the sound faster. This
web page uses the same JS code imported in the app.

### NativeScript <--> WebView communication

#### Loading assets and scripts
As soon as the WebView is ready, the app [loads](https://github.com/tralves/WallStreetJam/blob/ede785a32b723e3d74cc50ee619dc3411207f5a5/app/components/Home.vue#L186) into it:
- Audio resources;
- `webPlayer.js`;
- `seq1.js`;

Then, it executes the `setVoiceBuffers()` function to load the audio buffers. This function
is implemented in `webPlayer.js`.

#### NativeScript -> WebView

The App also sends to the WebView:
- [`PlayStop()`](https://github.com/tralves/WallStreetJam/blob/ede785a32b723e3d74cc50ee619dc3411207f5a5/app/components/Home.vue#L137): play/stop the sequence.
- Set the BPMs here (https://github.com/tralves/WallStreetJam/blob/ede785a32b723e3d74cc50ee619dc3411207f5a5/app/components/Home.vue#L143);
- Request analyser data [here](https://github.com/tralves/WallStreetJam/blob/ede785a32b723e3d74cc50ee619dc3411207f5a5/app/components/Home.vue#L225). This data will be used to render the frequency graph.

#### WebView -> NativeScript

The WebView sends the events to NativeScript:

- `@started`: The sequence started;
- `@stopped`: The sequence stopped;
- `@nextNote`: Tells {N} when the next note will be and which voices will be played so we can set
the notes animation.