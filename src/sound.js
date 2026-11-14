// Procedural Arcade Sound & Music Engine using Web Audio API (zero external audio asset overhead)

const BASS_PATTERN = [110, 0, 110, 130.81, 146.83, 0, 164.81, 130.81, 110, 0, 110, 98, 130.81, 0, 146.83, 164.81];
const ARP_PATTERN = [440, 523.25, 659.25, 523.25, 587.33, 698.46, 880, 698.46, 440, 523.25, 659.25, 783.99, 587.33, 659.25, 783.99, 880];

class ArcadeSoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicMuted = false;
    this.musicPaused = false;
    this.musicPlaying = false;
    this.fastTempo = false;
    this.musicTimer = null;
    this.stepIndex = 0;
    this.lastHitTime = 0;
    this.lastHoverTime = 0;
  }

  init() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = muted;
  }

  setMusicMuted(muted) {
    this.musicMuted = muted;
  }

  setMusicPaused(paused) {
    this.musicPaused = paused;
  }

  setFastTempo(fast) {
    if (this.fastTempo === fast) return;
    this.fastTempo = fast;
    if (this.musicPlaying) {
      this.restartMusicLoop();
    }
  }

  playTone({
    freq = 440,
    endFreq = null,
    type = "triangle",
    duration = 0.12,
    gain = 0.18,
    delay = 0,
    ignoreSfxMute = false,
  }) {
    if (!ignoreSfxMute && this.muted) return;
    const ctx = this.init();
    if (!ctx) return;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFreq),
        startTime + duration
      );
    }

    amp.gain.setValueAtTime(0.001, startTime);
    amp.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(amp);
    amp.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  restartMusicLoop() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    const stepMs = this.fastTempo ? 112 : 142;
    this.musicTimer = setInterval(() => {
      if (!this.musicPlaying || this.musicMuted || this.musicPaused) return;
      const ctx = this.init();
      if (!ctx || ctx.state !== "running") return;

      const idx = this.stepIndex % 16;
      this.stepIndex++;

      const bassFreq = BASS_PATTERN[idx];
      if (bassFreq > 0) {
        this.playTone({
          freq: bassFreq,
          type: "triangle",
          duration: 0.11,
          gain: 0.055,
          ignoreSfxMute: true,
        });
      }

      if (idx % 2 === 0) {
        const arpFreq = ARP_PATTERN[idx];
        this.playTone({
          freq: arpFreq,
          type: "square",
          duration: 0.07,
          gain: 0.018,
          ignoreSfxMute: true,
        });
      }

      // Crisp hi-hat accent on offbeats
      if (idx % 4 === 2) {
        this.playTone({
          freq: 1400,
          endFreq: 420,
          type: "triangle",
          duration: 0.035,
          gain: 0.018,
          ignoreSfxMute: true,
        });
      }
    }, stepMs);
  }

  startMusic() {
    if (typeof window === "undefined") return;
    this.init();
    if (this.musicPlaying) return;
    this.musicPlaying = true;
    this.musicPaused = false;
    this.stepIndex = 0;
    this.restartMusicLoop();
  }

  stopMusic() {
    this.musicPlaying = false;
    this.musicPaused = false;
    this.fastTempo = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  // Stadium N64 PA crowd roar + brass fanfare chord behind announcer lines
  playStadiumCrowdRoar(isBig = false) {
    if (this.muted) return;
    if (!this.ctx) this.init();
    if (!this.ctx || this.ctx.state !== "running") return;

    try {
      const duration = isBig ? 0.9 : 0.45;
      const sampleRate = this.ctx.sampleRate;
      const frameCount = Math.floor(sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(650, this.ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(1150, this.ctx.currentTime + duration * 0.4);
      filter.Q.value = 1.6;

      const gain = this.ctx.createGain();
      const peak = isBig ? 0.14 : 0.07;
      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(peak, this.ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch {
      // Ignore audio errors on restricted devices
    }
  }

  // Stadium NHL '94 organ chord stinger behind announcer lines
  playStadiumOrganChord() {
    if (this.muted) return;
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((f, idx) => {
      this.playTone({
        freq: f,
        type: "sawtooth",
        duration: 0.28,
        gain: 0.035,
        delay: idx * 0.03,
      });
    });
  }

  // UI Arcade sounds
  playUiHover() {
    if (this.muted) return;
    const now = performance.now();
    if (now - this.lastHoverTime < 65) return;
    this.lastHoverTime = now;
    this.playTone({
      freq: 520,
      endFreq: 660,
      type: "triangle",
      duration: 0.045,
      gain: 0.06,
    });
  }

  playUiClick() {
    if (this.muted) return;
    this.playTone({
      freq: 620,
      type: "square",
      duration: 0.055,
      gain: 0.09,
      delay: 0,
    });
    this.playTone({
      freq: 930,
      type: "square",
      duration: 0.08,
      gain: 0.09,
      delay: 0.04,
    });
  }

  playUiBack() {
    if (this.muted) return;
    this.playTone({
      freq: 480,
      endFreq: 260,
      type: "triangle",
      duration: 0.09,
      gain: 0.09,
    });
  }

  playPause() {
    if (this.muted) return;
    this.playTone({ freq: 523.25, type: "square", duration: 0.06, gain: 0.1, delay: 0 });
    this.playTone({ freq: 659.25, type: "square", duration: 0.06, gain: 0.1, delay: 0.06 });
    this.playTone({ freq: 523.25, type: "square", duration: 0.1, gain: 0.1, delay: 0.12 });
  }

  playRocketLock() {
    this.playTone({ freq: 440, endFreq: 880, type: "square", duration: 0.1, gain: 0.12, delay: 0 });
    this.playTone({ freq: 880, endFreq: 1320, type: "square", duration: 0.14, gain: 0.13, delay: 0.1 });
  }

  playRocketFire() {
    this.playTone({ freq: 900, endFreq: 160, type: "sawtooth", duration: 0.35, gain: 0.22 });
    this.playTone({ freq: 180, endFreq: 1400, type: "square", duration: 0.28, gain: 0.16, delay: 0.04 });
  }

  // Mario Kart style 3-2-1-GO!
  playCountdown(step) {
    if (step > 0) {
      this.playTone({
        freq: 440,
        type: "square",
        duration: 0.14,
        gain: 0.12,
      });
    } else {
      this.playTone({
        freq: 880,
        type: "square",
        duration: 0.35,
        gain: 0.16,
      });
      this.playTone({
        freq: 1320,
        type: "triangle",
        duration: 0.35,
        gain: 0.14,
      });
    }
  }

  // Puck collision impact
  playHit(speed = 5, isPaddle = false) {
    if (this.muted) return;
    const now = performance.now();
    if (now - this.lastHitTime < 45) return;
    this.lastHitTime = now;

    const clamped = Math.min(16, Math.max(1, speed));
    const ratio = clamped / 16;

    if (isPaddle) {
      this.playTone({
        freq: 220 + ratio * 180,
        endFreq: 90,
        type: "triangle",
        duration: 0.09,
        gain: 0.12 + ratio * 0.14,
      });
    } else {
      this.playTone({
        freq: 340 + ratio * 220,
        endFreq: 160,
        type: "sine",
        duration: 0.065,
        gain: 0.08 + ratio * 0.1,
      });
    }
  }

  // Mario Kart item box roulette tick
  playRouletteTick(index = 0) {
    const pitches = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0];
    const freq = pitches[index % pitches.length];
    this.playTone({
      freq,
      type: "square",
      duration: 0.05,
      gain: 0.07,
    });
  }

  // Item locked in!
  playItemReady() {
    this.playTone({ freq: 587.33, type: "square", duration: 0.08, gain: 0.11, delay: 0 });
    this.playTone({ freq: 783.99, type: "square", duration: 0.08, gain: 0.11, delay: 0.07 });
    this.playTone({ freq: 1046.5, type: "square", duration: 0.18, gain: 0.14, delay: 0.14 });
  }

  // Bonus activation sound
  playBonusActivate(bonusId) {
    switch (bonusId) {
      case "MEGA_PADDLE":
        [330, 392, 659, 523, 587, 784].forEach((f, i) =>
          this.playTone({
            freq: f,
            type: "square",
            duration: 0.07,
            gain: 0.11,
            delay: i * 0.055,
          })
        );
        break;
      case "SHRINK_FOE":
        this.playTone({
          freq: 920,
          endFreq: 140,
          type: "sawtooth",
          duration: 0.28,
          gain: 0.15,
        });
        break;
      case "ICE_WALL":
      case "FREEZE_FOE":
        [880, 1174, 1567].forEach((f, i) =>
          this.playTone({
            freq: f,
            type: "triangle",
            duration: 0.14,
            gain: 0.12,
            delay: i * 0.06,
          })
        );
        break;
      case "TURBO_SHOT":
        this.playTone({
          freq: 180,
          endFreq: 860,
          type: "sawtooth",
          duration: 0.22,
          gain: 0.18,
        });
        break;
      case "SIGNATURE_SUPER":
      case "ROCKET_PUCK":
        this.playRocketLock();
        break;
      default:
        [523, 659, 784, 1046].forEach((f, i) =>
          this.playTone({
            freq: f,
            type: "triangle",
            duration: 0.1,
            gain: 0.12,
            delay: i * 0.05,
          })
        );
        break;
    }
  }

  // Goal scored! Sub-bass thump + NHL Goal Horn + crisp pop + ascending arcade chord
  playGoal(isPlayerOne = true) {
    this.playTone({
      freq: 155,
      endFreq: 48,
      type: "triangle",
      duration: 0.16,
      gain: 0.24,
    });
    // NHL-style dual-tone goal horn blast
    this.playTone({
      freq: 110,
      type: "sawtooth",
      duration: 0.38,
      gain: 0.08,
      delay: 0.01,
    });
    this.playTone({
      freq: 164.81,
      type: "sawtooth",
      duration: 0.38,
      gain: 0.07,
      delay: 0.01,
    });
    this.playTone({
      freq: 880,
      endFreq: 1320,
      type: "sine",
      duration: 0.11,
      gain: 0.15,
      delay: 0.02,
    });

    const base = isPlayerOne ? [523.25, 659.25, 783.99, 1046.5] : [440, 392, 349.23, 311.13];
    base.forEach((f, i) => {
      this.playTone({
        freq: f,
        type: "sawtooth",
        duration: i === base.length - 1 ? 0.35 : 0.11,
        gain: 0.14,
        delay: 0.04 + i * 0.085,
      });
    });
  }

  // Victory fanfare (5-note ascending brass/square harmony + crowd cheer)
  playVictory() {
    this.playStadiumCrowdRoar(true);
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => {
      const dur = i === notes.length - 1 ? 0.45 : 0.12;
      const delay = i * 0.1;
      this.playTone({
        freq: f,
        type: "square",
        duration: dur,
        gain: 0.12,
        delay,
      });
      this.playTone({
        freq: f * 0.5,
        type: "triangle",
        duration: dur,
        gain: 0.11,
        delay,
      });
    });
  }

  // Defeat stinger (4-note descending retro horn)
  playDefeat() {
    this.playTone({
      freq: 140,
      endFreq: 52,
      type: "triangle",
      duration: 0.25,
      gain: 0.2,
    });
    const notes = [392.0, 349.23, 311.13, 261.63];
    notes.forEach((f, i) => {
      this.playTone({
        freq: f,
        type: "sawtooth",
        duration: i === notes.length - 1 ? 0.42 : 0.2,
        gain: 0.12,
        delay: i * 0.14,
      });
    });
  }
}

export const sound = new ArcadeSoundEngine();
