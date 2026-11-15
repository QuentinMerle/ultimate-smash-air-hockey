import lines from "./data/announcer-lines.json";
import { useStore } from "./store";
import { sound } from "./sound";
import { setOnBonusAnnounce } from "./utils";

const pickRandom = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return arr[Math.floor(Math.random() * arr.length)];
};

class VoiceAnnouncer {
  constructor() {
    this.cachedVoice = null;
    this.lastSpokenAt = 0;
    this.isSpeaking = false;
    this.speakTimer = null;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.resolveEnglishVoice();
      window.speechSynthesis.addEventListener?.("voiceschanged", () => {
        this.cachedVoice = null;
        this.resolveEnglishVoice();
      });
    }
  }

  resolveEnglishVoice() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return this.cachedVoice;

    const banned = [
      "Grandpa",
      "Grandma",
      "Fred",
      "Albert",
      "Ralph",
      "Bad News",
      "Whisper",
      "Zarvox",
      "Trinoids",
      "Google US English",
      "Google UK English Female",
      "Female",
      "Samantha",
      "Victoria",
      "Karen",
      "Moira",
      "Tessa",
      "Veena",
      "Fiona",
      "Ava",
      "Allison",
      "Susan",
      "Zira",
      "Flo",
      "Sandy",
      "Shelley",
      "Nicky",
      "Kathy",
      "Serena",
      "Kate",
      "Martha",
      "Catherine",
      "Princess",
      "Junior",
    ];
    const englishVoices = voices.filter((v) =>
      v.lang?.toLowerCase().startsWith("en")
    );
    const enPool = englishVoices.length > 0 ? englishVoices : voices;
    const cleanVoices = enPool.filter(
      (v) => !banned.some((b) => v.name.includes(b))
    );
    const pool = cleanVoices.length > 0 ? cleanVoices : enPool;

    const preferredNames = [
      "Google UK English Male",
      "Daniel",
      "Alex",
      "Aaron",
      "Evan",
      "Nathan",
      "Tom",
      "Oliver",
      "Lee",
      "Eddy",
      "Reed",
      "Rocko",
      "Microsoft Guy",
      "Microsoft Mark",
      "Microsoft David",
    ];
    for (const name of preferredNames) {
      const match = pool.find((v) => v.name.includes(name));
      if (match) {
        this.cachedVoice = match;
        return match;
      }
    }

    this.cachedVoice = pool[0] || enPool[0];
    return this.cachedVoice;
  }

  speak(text, { priority = "normal", withOrgan = false, crowdRoar = false } = {}) {
    if (!text) return;

    const state = useStore.getState();
    state.setCasterMessage(`🎙️ ${text.toUpperCase()}`);

    if (state.voiceMuted || state.soundMuted) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const now = performance.now();
    const synthBusy =
      this.isSpeaking ||
      window.speechSynthesis.speaking ||
      window.speechSynthesis.pending;

    if (priority !== "high") {
      if (synthBusy || now - this.lastSpokenAt < 3500) {
        return;
      }
    } else {
      if (this.speakTimer) {
        clearTimeout(this.speakTimer);
        this.speakTimer = null;
      }
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }

    this.lastSpokenAt = now;
    if (withOrgan) {
      sound.playStadiumOrganChord();
    }
    if (crowdRoar) {
      sound.playStadiumCrowdRoar(priority === "high");
    }

    const triggerSpeech = () => {
      try {
        const voice = this.resolveEnglishVoice();
        const utter = new SpeechSynthesisUtterance(text);
        if (voice) utter.voice = voice;
        utter.lang = voice?.lang || "en-GB";
        utter.pitch = 0.95;
        utter.rate = 1.16;
        utter.volume = 0.92;
        utter.onstart = () => {
          this.isSpeaking = true;
        };
        utter.onend = () => {
          this.isSpeaking = false;
        };
        utter.onerror = () => {
          this.isSpeaking = false;
        };
        window.speechSynthesis.speak(utter);
      } catch {
        this.isSpeaking = false;
      }
    };

    if (priority === "high") {
      this.speakTimer = setTimeout(() => {
        this.speakTimer = null;
        triggerSpeech();
      }, 45);
    } else {
      triggerSpeech();
    }
  }

  announceIntro() {
    this.speak(pickRandom(lines.intro), {
      priority: "high",
      withOrgan: true,
      crowdRoar: true,
    });
  }

  announceGo() {
    this.speak(pickRandom(lines.go), { priority: "high" });
  }

  announceBonus(bonusId) {
    if (bonusId === "SIGNATURE_SUPER" || bonusId === "ROCKET_PUCK") {
      this.speak("Signature Super armed! Strike the puck!", {
        priority: "normal",
        crowdRoar: true,
      });
      return;
    }
    const line = lines.bonus?.[bonusId];
    if (line) {
      this.speak(line, { priority: "normal" });
    }
  }

  announceRocketFire(superType = "blaze") {
    const typeLine = lines.superFire?.[superType] || pickRandom(lines.rocketFire);
    this.speak(typeLine, {
      priority: "high",
      withOrgan: true,
      crowdRoar: true,
    });
  }

  announceGoal(scorerPlayerId, speedKmh = 95) {
    const state = useStore.getState();
    const scorerName =
      scorerPlayerId === "playerOne" ? state.playerOneName : state.playerTwoName;

    if (state.endGame) {
      const winLine = pickRandom(lines.win);
      this.speak(`${scorerName} takes the crown! ${winLine}`, {
        priority: "high",
        withOrgan: true,
        crowdRoar: true,
      });
      return;
    }

    const isMatchPoint =
      state.playerOne === (state.winningScore || 7) - 1 ||
      state.playerTwo === (state.winningScore || 7) - 1;

    if (isMatchPoint) {
      const mpLine = pickRandom(lines.matchPoint);
      this.speak(`${speedKmh} K M H! ${mpLine}`, {
        priority: "high",
        withOrgan: true,
        crowdRoar: true,
      });
      return;
    }

    if (speedKmh >= 135) {
      const fastLine = pickRandom(lines.fastGoal);
      this.speak(`${fastLine} ${speedKmh} kilometers per hour!`, {
        priority: "high",
        withOrgan: true,
        crowdRoar: true,
      });
    } else {
      const goalLine = pickRandom(lines.goal);
      this.speak(`${goalLine} ${scorerName} scores!`, {
        priority: "high",
        withOrgan: true,
        crowdRoar: true,
      });
    }
  }

  announceHabit(habitKey, customText = null) {
    const fallback = pickRandom(lines.habits?.[habitKey]);
    const text = customText || fallback;
    if (text) {
      this.speak(text, { priority: "normal" });
    }
  }
}

export const announcer = new VoiceAnnouncer();

setOnBonusAnnounce((bonusId) => {
  announcer.announceBonus(bonusId);
});
