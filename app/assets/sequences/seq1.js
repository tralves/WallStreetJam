scheduleNote = (beatNumber, time) => {
    // console.log(beatNumber, time);
    // Stores the time and voices of the next note to be played.
    // used to send the note and it's voices to NS.
    const noteToBePlayed = {
        note: beatNumber,
        time: time,
        delay: time - audioCtx.currentTime,
        voices: []
    };

    // stop at 256 beats
    if (beatNumber >= 256) {
        setTimeout(stop);
    }

    if (beatNumber % 4 === 0) {
        playSample(voiceBuffers[0], time);
        noteToBePlayed.voices.push({
            index: 0,
            name: voiceBuffers[0].name,
            duration: voiceBuffers[0].buffer.duration
        });
    }

    if (beatNumber % 4 === 2) {
        playSample(voiceBuffers[1], time);
        noteToBePlayed.voices.push({
            index: 1,
            name: voiceBuffers[1].name,
            duration: voiceBuffers[1].buffer.duration
        });
    }

    playSample(voiceBuffers[2], time);
    noteToBePlayed.voices.push({
        index: 2,
        name: voiceBuffers[2].name,
        duration: voiceBuffers[2].buffer.duration
    });

    if (beatNumber === 128) {
        const voice = voiceBuffers[3];
        const audioBuffer = voice.buffer;

        // create source
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;

        // create gain node
        const gainNode = audioCtx.createGain();
        voice.gain = gainNode;
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

        // create low-pass filter
        const lowPassFilter = audioCtx.createBiquadFilter();
        lowPassFilter.type = "lowpass";
        lowPassFilter.frequency.value = lowPassFilter.frequency.maxValue * 0.25;
        voice.lowPassFilter = lowPassFilter;

        // Connect source => gain => low-pass => dest
        source.connect(lowPassFilter);
        lowPassFilter.connect(gainNode);
        gainNode.connect(analyser);

        // play!
        source.start();
        voice.source = source;
        source.onended = () => (voice.source = null);

        noteToBePlayed.voices.push({
            index: 3,
            name: voiceBuffers[3].name,
            on: true
        });
    }

    if (beatNumber === 192 && voiceBuffers[3].gain) {
        const gainNode = voiceBuffers[3].gain;
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(
            0.75,
            audioCtx.currentTime + (200 - 192) * (60.0 / tempo)
        );
    }

    if (beatNumber === 192 && voiceBuffers[3].lowPassFilter) {
        const lowPassFilterNode = voiceBuffers[3].lowPassFilter;
        lowPassFilterNode.frequency.setValueAtTime(
            lowPassFilterNode.frequency.maxValue * 0.25,
            audioCtx.currentTime
        );
        lowPassFilterNode.frequency.linearRampToValueAtTime(
            lowPassFilterNode.frequency.maxValue,
            audioCtx.currentTime + (256 - 192) * (60.0 / tempo)
        );
    }

    if (beatNumber === 30 && voiceBuffers[3].source) {
        voiceBuffers[3].source.stop();
        noteToBePlayed.voices.push({
            index: 3,
            name: voiceBuffers[3].name,
            on: false
        });
    }

    // emit voicesPlaying
    window.nsWebViewBridge && window.nsWebViewBridge.emit('nextNote', noteToBePlayed);
};