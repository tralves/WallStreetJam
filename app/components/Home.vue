<template>
  <Page actionBarHidden="true" class="ns-dark dark-page">
    <GridLayout rows="70 300 50 100 * 1" columns="* * * *" padding="20">
      <Label class="h1 m-t-20 fas" colSpan="4">
        <FormattedString>
          <Span>WallStreet</Span>
          <Span style="font-style: italic; color: #f6a21d">Jam </Span>
          <Span style="font-size: 12; color: #fe4a49">&nbsp;&nbsp;</Span>
          <Span style="font-size: 12; color: #2ed8b1">&nbsp;&nbsp;</Span>
          <Span style="font-size: 12; color: #3772ff"></Span>
        </FormattedString>
      </Label>
      <Label
        v-for="(freq, index) in freqs"
        :key="index"
        ref="bar"
        class="freq-bar"
        row="1"
        width="2%"
        :marginLeft="3.125 * index + '%'"
        height="1"
        colSpan="4"
        horizontalAlignment="left"
        verticalAlignment="center"
      />
      <Label
        v-for="(sound, index) in sounds"
        :key="'b-' + sound.name"
        ref="voiceBall"
        class="voice-ball"
        row="2"
        :col="index"
      />
      <Label
        v-for="(sound, index) in sounds"
        :key="'n-' + sound.name"
        class="voice-name"
        row="2"
        :col="index"
        :text="sound.name"
      />
      <Label
        col="3"
        row="3"
        class="h4"
        :text="`${bpm} BPM`"
        verticalAlignment="center"
        horizontalAlignment="right"
      />
      <Slider
        col="0"
        colSpan="3"
        row="3"
        :value="bpm"
        minValue="40"
        maxValue="256"
        height="50"
        @valueChange="updateBpm"
      />
      <Button
        class="play-btn -outline fas m-t-20"
        :text="state === 'playing' ? '' : ''"
        @tap="playStop"
        col="0"
        colSpan="4"
        row="4"
        :isEnabled="ready"
      />
      <WebViewExt
        ref="webPlayer"
        width="0"
        height="0"
        visibility="collapsed"
        colSpan="4"
        row="5"
        src="?"
        @loadFinished="loadWebPlayer"
        @webConsole="webPlayerConsole"
        @started="playerStarted"
        @stopped="playerStopped"
        @nextNote="animateVoices"
      />
    </GridLayout>
  </Page>
</template>

<script>
export default {
  data() {
    return {
      state: "stopped",
      ready: false,
      bpm: 256,
      sounds: [
        {
          name: "1017",
          file: "1017.mp3",
          playing: false,
        },
        {
          name: "1045",
          file: "1045.mp3",
          playing: false,
        },
        {
          name: "1086",
          file: "1086.mp3",
          playing: false,
        },
        {
          name: "whiteNoise1Min",
          file: "whiteNoise1Min.mp3",
          playing: false,
        },
      ],
      freqs: new Array(32).fill(0),
    };
  },
  created() {},
  methods: {
    playerStarted() {
      this.state = "playing";
      this.graphIntervalId = setInterval(this.updateGraph, 50);
    },
    playerStopped() {
      this.state = "stopped";
      this.$refs.voiceBall.forEach((ball) => {
        ball.nativeView.animate({
          backgroundColor: "#fe4a49",
          scale: { x: 1, y: 1 },
          duration: 100,
        });
      });
    },
    playStop() {
      const webPlayerComp = this.$refs.webPlayer.nativeView;
      webPlayerComp.executeJavaScript(`playStop();`);
    },
    updateBpm(e) {
      const webPlayerComp =
        this.$refs.webPlayer && this.$refs.webPlayer.nativeView;
      this.bpm = e.value;
      webPlayerComp && webPlayerComp.executeJavaScript(`tempo = ${e.value};`);
    },
    animateVoices(e) {
      e.data.voices.forEach((voice) => {
        const view = this.$refs.voiceBall[voice.index].nativeView;

        if (voice.duration) {
          view.backgroundColor = "#fe4a49";
          view.scaleX = 1;
          view.scaleY = 1;
          view;

          view
            .animate({
              backgroundColor: "#f6a21d",
              scale: { x: 2, y: 2 },
              delay: parseInt(e.data.delay * 1000, 10),
              duration: 100,
            })
            .then(() => {
              view.animate({
                backgroundColor: "#fe4a49",
                scale: { x: 1, y: 1 },
                delay: voice.duration,
                duration: Math.min(voice.duration, 100),
              });
            });
        } else if (voice.on) {
          view.animate({
            backgroundColor: "#f6a21d",
            scale: { x: 2, y: 2 },
            delay: parseInt(e.data.delay * 1000, 10),
            duration: 100,
          });
        } else if (voice.on === false) {
          view.animate({
            backgroundColor: "#fe4a49",
            scale: { x: 1, y: 1 },
            duration: 100,
          });
        }
      });
    },
    async loadWebPlayer(event) {
      console.log("loadWebPlayer!");
      const webPlayerComp = event.object;

      // load sounds
      this.sounds.forEach((sound) => {
        webPlayerComp.registerLocalResource(
          sound.file,
          `~/assets/sounds/${sound.file}`
        );
        console.log("registered " + sound.file);
      });

      // load webPlayer script
      webPlayerComp.autoLoadJavaScriptFile(
        "webPlayer",
        "~/assets/webPlayer.js"
      );

      // load sequence script
      webPlayerComp.autoLoadJavaScriptFile(
        "seq1",
        "~/assets/sequences/seq1.js"
      );

      await sleep(500);

      // load voice buffers
      const samples = this.sounds.map((sound) => {
        return { name: sound.name, filepath: "x-local://" + sound.file };
      });
      await webPlayerComp.executePromise(
        `setVoiceBuffers(${JSON.stringify(samples)});`
      );

      this.ready = true;
    },
    async updateGraph() {
      const webPlayerComp = this.$refs.webPlayer.nativeView;
      const data = await webPlayerComp.executeJavaScript(`getFreqData(); `);

      // if stopped, wait for graph to reach 0 and then stop.
      if (this.state === "stopped" && data.every((v) => v == 0)) {
        clearInterval(this.graphIntervalId);
      }

      // update graph data
      const bar = this.$refs.bar;
      for (let i = 0; i < 32; i++) {
        bar[i].nativeView.height =
          (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2] + data[i * 4 + 3]) /
            5 +
          1;
      }
    },
    webPlayerConsole({ eventName, data }) {
      console.log(eventName, data);
    },
  },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
</script>

<style scoped lang="scss">
// Custom styles
.dark-page {
  background-color: #000;
  background-image: url("~/assets/dot_pattern.png");
}

.h1 {
  color: #fe4a49;
  font-weight: bold;
}

.freq-bar {
  background-color: #fe4a49;
  background-image: linear-gradient(
    0deg,
    rgba(254, 74, 73, 1) 0%,
    rgba(246, 162, 29, 1) 50%,
    rgba(254, 74, 73, 1) 100%
  );
}

.voice-ball {
  horizontal-align: center;
  text-align: center;
  vertical-align: top;
  width: 10;
  height: 10;
  border-radius: 5;
  background-color: #fe4a49;
}

.voice-name {
  horizontal-align: center;
  text-align: center;
  vertical-align: bottom;
  font-size: 12;
  font-weight: bold;
  color: #fe4a49;
}

.-rounded-lg {
  padding: 0;
}

.play-btn {
  vertical-align: center;
  width: 100;
  height: 100;
  border-radius: 50;
}
</style>
