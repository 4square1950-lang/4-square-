// Web Audio API Synthesizer for playground sound effects
class SoundFX {
  private ctx: AudioContext | null = null;
  // Sound effects OFF by default per user specification
  public enabled: boolean = false;
  public volume: number = 0.65;

  private initCtx() {
    if (typeof window === 'undefined') return;

    if (!this.ctx) {
      try {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          this.ctx = new AudioCtxClass();
        }
      } catch {
        this.ctx = null;
      }
    }

    if (this.ctx) {
      try {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      } catch {}
    }
  }

  // Classic hollow rubber four square playground ball bounce sound (Voit 8.5" style)
  public playBallBounce(volumeMultiplier = 1.0) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;

      const now = this.ctx.currentTime;
      const masterVol = Math.max(0.001, this.volume * volumeMultiplier * 0.45);

      // 1. Hollow rubber body resonance (fundamental 135Hz to 75Hz)
      const oscBody = this.ctx.createOscillator();
      const gainBody = this.ctx.createGain();
      oscBody.type = 'sine';
      oscBody.frequency.setValueAtTime(138, now);
      oscBody.frequency.exponentialRampToValueAtTime(74, now + 0.12);

      gainBody.gain.setValueAtTime(masterVol * 0.9, now);
      gainBody.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

      oscBody.connect(gainBody);
      gainBody.connect(this.ctx.destination);
      oscBody.start(now);
      oscBody.stop(now + 0.14);

      // 2. Rubber tension ping (280Hz hollow overtone)
      const oscPing = this.ctx.createOscillator();
      const gainPing = this.ctx.createGain();
      oscPing.type = 'triangle';
      oscPing.frequency.setValueAtTime(285, now);
      oscPing.frequency.exponentialRampToValueAtTime(120, now + 0.08);

      gainPing.gain.setValueAtTime(masterVol * 0.45, now);
      gainPing.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      oscPing.connect(gainPing);
      gainPing.connect(this.ctx.destination);
      oscPing.start(now);
      oscPing.stop(now + 0.1);

      // 3. Crisp asphalt contact tap
      const tapOsc = this.ctx.createOscillator();
      const tapGain = this.ctx.createGain();
      tapOsc.type = 'sine';
      tapOsc.frequency.setValueAtTime(420, now);
      tapOsc.frequency.exponentialRampToValueAtTime(180, now + 0.025);

      tapGain.gain.setValueAtTime(masterVol * 0.35, now);
      tapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      tapOsc.connect(tapGain);
      tapGain.connect(this.ctx.destination);
      tapOsc.start(now);
      tapOsc.stop(now + 0.035);
    } catch {
      // Audio context may be restricted before user gesture
    }
  }

  // Hand slap / strike on rubber ball (warm palm impact with hollow rubber punch)
  public playHandStrike(isVolley = false) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;

      const now = this.ctx.currentTime;
      const strikeVol = Math.max(0.001, this.volume * (isVolley ? 0.42 : 0.32));

      // 1. Fleshy palm slap (filtered gentle noise burst, not harsh static)
      const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * 0.04));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Soft shaped noise curve
        const env = 1 - i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * env;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isVolley ? 950 : 650, now);
      filter.Q.setValueAtTime(1.2, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(strikeVol * 0.6, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.055);

      // 2. Ball internal pressure punch (rich low-mid thump)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isVolley ? 220 : 165, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.09);

      oscGain.gain.setValueAtTime(strikeVol * 0.9, now);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignore
    }
  }

  // Official tournament referee whistle: dual tuned acoustic chambers (Fox 40 Classic)
  public playWhistle() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;

      const now = this.ctx.currentTime;
      const playChamberBeep = (startTime: number, duration: number) => {
        if (!this.ctx) return;
        try {
          const wVol = Math.max(0.001, this.volume * 0.28);

          // Chamber 1 (2840 Hz)
          const osc1 = this.ctx.createOscillator();
          const gain1 = this.ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(2840, startTime);
          osc1.frequency.linearRampToValueAtTime(2890, startTime + duration * 0.4);
          osc1.frequency.linearRampToValueAtTime(2820, startTime + duration);

          gain1.gain.setValueAtTime(0.0001, startTime);
          gain1.gain.linearRampToValueAtTime(wVol * 0.55, startTime + 0.012);
          gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

          osc1.connect(gain1);
          gain1.connect(this.ctx.destination);
          osc1.start(startTime);
          osc1.stop(startTime + duration + 0.015);

          // Chamber 2 (3120 Hz - acoustic beating harmonic)
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(3120, startTime);
          osc2.frequency.linearRampToValueAtTime(3170, startTime + duration * 0.4);
          osc2.frequency.linearRampToValueAtTime(3090, startTime + duration);

          gain2.gain.setValueAtTime(0.0001, startTime);
          gain2.gain.linearRampToValueAtTime(wVol * 0.45, startTime + 0.012);
          gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

          osc2.connect(gain2);
          gain2.connect(this.ctx.destination);
          osc2.start(startTime);
          osc2.stop(startTime + duration + 0.015);
        } catch {}
      };

      // Two sharp official referee whistle blasts
      playChamberBeep(now, 0.11);
      playChamberBeep(now + 0.14, 0.16);
    } catch {
      // Ignore
    }
  }

  // Crowd cheer on point / victory / great volley
  public playCheer() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;

      const now = this.ctx.currentTime;
      const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * 0.55));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.7;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(1100, now + 0.25);
      filter.frequency.exponentialRampToValueAtTime(500, now + 0.55);
      filter.Q.setValueAtTime(1.0, now);

      const gain = this.ctx.createGain();
      const cheerVol = Math.max(0.001, this.volume * 0.22);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(cheerVol, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.57);
    } catch {
      // Ignore
    }
  }

  public playCoinEarned() {
    this.playCheer();
  }

  // Crowd "aww" on out / error
  public playAww() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(290, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.38);

      const awwVol = Math.max(0.001, this.volume * 0.14);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(awwVol, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.42);
    } catch {
      // Ignore
    }
  }

  // Soft pleasant UI tap chime (no harsh clipping clicks)
  public playClick() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.038);

      const clickVol = Math.max(0.001, this.volume * 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(clickVol, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Ignore
    }
  }

  // Smooth air displacement whoosh for card transitions
  public playWhoosh() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
      gain.gain.setValueAtTime(this.volume * 0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch {
      // Ignore
    }
  }

  // Realistic Car Door Handle Latch Click & Hinge Open
  public playCarDoorOpen() {
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;
      const now = this.ctx.currentTime;
      const vol = Math.max(0.001, this.volume * 0.4);

      // Handle latch spring click
      const oscLatch = this.ctx.createOscillator();
      const gainLatch = this.ctx.createGain();
      oscLatch.type = 'triangle';
      oscLatch.frequency.setValueAtTime(1200, now);
      oscLatch.frequency.exponentialRampToValueAtTime(450, now + 0.04);
      gainLatch.gain.setValueAtTime(vol * 0.5, now);
      gainLatch.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      oscLatch.connect(gainLatch);
      gainLatch.connect(this.ctx.destination);
      oscLatch.start(now);
      oscLatch.stop(now + 0.06);

      // Hinge swing friction
      const oscHinge = this.ctx.createOscillator();
      const gainHinge = this.ctx.createGain();
      oscHinge.type = 'sine';
      oscHinge.frequency.setValueAtTime(180, now + 0.02);
      oscHinge.frequency.linearRampToValueAtTime(240, now + 0.18);
      gainHinge.gain.setValueAtTime(0.0001, now);
      gainHinge.gain.linearRampToValueAtTime(vol * 0.25, now + 0.05);
      gainHinge.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      oscHinge.connect(gainHinge);
      gainHinge.connect(this.ctx.destination);
      oscHinge.start(now + 0.02);
      oscHinge.stop(now + 0.25);
    } catch {}
  }

  // Heavy, solid automotive car door slam & latch sound
  public playCarDoorSlam() {
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;
      const now = this.ctx.currentTime;
      const vol = Math.max(0.001, this.volume * 0.6);

      // Heavy bass chassis thud (hollow steel door frame)
      const oscThud = this.ctx.createOscillator();
      const gainThud = this.ctx.createGain();
      oscThud.type = 'sine';
      oscThud.frequency.setValueAtTime(110, now);
      oscThud.frequency.exponentialRampToValueAtTime(45, now + 0.18);
      gainThud.gain.setValueAtTime(vol * 0.9, now);
      gainThud.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      oscThud.connect(gainThud);
      gainThud.connect(this.ctx.destination);
      oscThud.start(now);
      oscThud.stop(now + 0.22);

      // Metal latch catch click
      const oscClick = this.ctx.createOscillator();
      const gainClick = this.ctx.createGain();
      oscClick.type = 'triangle';
      oscClick.frequency.setValueAtTime(820, now);
      oscClick.frequency.exponentialRampToValueAtTime(320, now + 0.06);
      gainClick.gain.setValueAtTime(vol * 0.7, now);
      gainClick.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      oscClick.connect(gainClick);
      gainClick.connect(this.ctx.destination);
      oscClick.start(now);
      oscClick.stop(now + 0.08);
    } catch {}
  }

  // Dual-tone automotive horn honk
  public playCarHorn() {
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;
      const now = this.ctx.currentTime;
      const vol = Math.max(0.001, this.volume * 0.35);

      // Low tone ~415 Hz (G#4) + High tone ~495 Hz (B4)
      [415, 495].forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(vol * 0.5, now + 0.02);
        gain.gain.setValueAtTime(vol * 0.5, now + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now);
        osc.stop(now + 0.26);
      });
    } catch {}
  }

  // Rubber tire friction screech on sharp turn or evasive swerve
  public playTireScreech() {
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;
      const now = this.ctx.currentTime;
      const vol = Math.max(0.001, this.volume * 0.25);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.linearRampToValueAtTime(1400, now + 0.08);
      osc.frequency.linearRampToValueAtTime(800, now + 0.22);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  }

  // Metallic bumper bump & vehicle collision impact
  public playCarCollision() {
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;
      const now = this.ctx.currentTime;
      const vol = Math.max(0.001, this.volume * 0.65);

      // Low metal impact
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);

      // Higher metallic crunch
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(540, now);
      osc2.frequency.exponentialRampToValueAtTime(90, now + 0.15);
      gain2.gain.setValueAtTime(vol * 0.7, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.18);
    } catch {}
  }

  // Engine acceleration rev
  public playEngineRev() {
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;
      const now = this.ctx.currentTime;
      const vol = Math.max(0.001, this.volume * 0.3);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(85, now);
      osc.frequency.linearRampToValueAtTime(195, now + 0.4);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.55);
    } catch {}
  }

  // School Loudspeaker PA chime (High School intercom dual-tone ding-dong)
  public playSchoolPAChime() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;
      const now = this.ctx.currentTime;
      const vol = Math.max(0.001, this.volume * 0.45);

      // Tone 1: High chime
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.linearRampToValueAtTime(vol, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      // Tone 2: Warm resolving tone
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440.0, now + 0.22); // A4
      gain2.gain.setValueAtTime(0.0001, now + 0.22);
      gain2.gain.linearRampToValueAtTime(vol * 0.9, now + 0.26);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.22);
      osc2.stop(now + 0.8);
    } catch {}
  }

  // Gymnasium Shot Clock Buzzer (180Hz square/sawtooth electric arena buzzer)
  public playShotClockBuzzer() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;
      const now = this.ctx.currentTime;
      const vol = Math.max(0.001, this.volume * 0.55);

      const osc = this.ctx.createOscillator();
      const oscLow = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(185, now);
      oscLow.type = 'square';
      oscLow.frequency.setValueAtTime(92, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.02);
      gain.gain.setValueAtTime(vol, now + 0.65);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

      osc.connect(gain);
      oscLow.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      oscLow.start(now);
      osc.stop(now + 0.9);
      oscLow.stop(now + 0.9);
    } catch {}
  }

  // Referee Whistle (dual piercing high frequencies with trill)
  public playRefereeWhistle() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;
      const now = this.ctx.currentTime;
      const vol = Math.max(0.001, this.volume * 0.4);

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(2650, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2950, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.015);
      gain.gain.setValueAtTime(vol * 0.9, now + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch {}
  }


  // Synthesized Playground Background Music
  private musicInterval: number | null = null;
  public isPlayingMusic: boolean = false;
  public tracks = ['Serve It Straight', 'Asphalt Anthem', 'Echoes of Ottawa', 'Campfire Bop'];
  public currentTrackIndex = 0;

  public startMusic() {
    if (this.isPlayingMusic) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'closed') return;
      this.isPlayingMusic = true;

      const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0];
      let noteIdx = 0;

      this.musicInterval = window.setInterval(() => {
        if (!this.ctx || !this.enabled || !this.isPlayingMusic || this.ctx.state === 'closed') return;
        try {
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(notes[noteIdx % notes.length], now);

          const mVol = Math.max(0.0001, this.volume * 0.04);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(mVol, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 0.38);

          noteIdx++;
        } catch {}
      }, 380);
    } catch {}
  }

  public stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  public nextTrack(): string {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    return this.tracks[this.currentTrackIndex];
  }

  public speakAnnouncer(text: string) {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.05;
        u.pitch = 1.0;
        u.volume = 1.0;
        window.speechSynthesis.speak(u);
      }
    } catch {}
  }
}

export const soundFX = new SoundFX();
