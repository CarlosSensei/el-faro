const SOUNDS = {
  dodge: [240, 530, .18, 'sine'],
  sword: [490, 145, .16, 'triangle'],
  armor: [620, 260, .24, 'triangle'],
  charge: [80, 135, .58, 'sine'],
  slam: [145, 42, .34, 'triangle'],
  light: [360, 940, .42, 'sine'],
  victory: [440, 880, .85, 'triangle'],
} as const;

const MASTER_VOLUME = .22;

export class GameSound {
  private context?: AudioContext;
  private output?: GainNode;
  private enabled = false;
  private disposed = false;

  async setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.output) this.output.gain.value = enabled ? MASTER_VOLUME : 0;
    if (!enabled || this.disposed) return false;

    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.output = this.context.createGain();
        this.output.gain.value = MASTER_VOLUME;
        this.output.connect(this.context.destination);
      }
      await this.context.resume();
      if (this.enabled) this.play('light');
      return this.enabled && !this.disposed;
    } catch (error) {
      console.warn('No se pudo activar el audio del juego.', error);
      this.enabled = false;
      return false;
    }
  }

  play(name: keyof typeof SOUNDS) {
    const { context, output } = this;
    if (!this.enabled || !output || context?.state !== 'running') return;
    const [start, end, duration, type] = SOUNDS[name];
    const now = context.currentTime;
    const voice = context.createOscillator();
    const envelope = context.createGain();
    voice.type = type;
    voice.frequency.setValueAtTime(start, now);
    voice.frequency.exponentialRampToValueAtTime(end, now + duration);
    envelope.gain.setValueAtTime(.001, now);
    envelope.gain.exponentialRampToValueAtTime(.43, now + .025);
    envelope.gain.exponentialRampToValueAtTime(.001, now + duration);
    voice.connect(envelope);
    envelope.connect(output);
    voice.onended = () => {
      voice.disconnect();
      envelope.disconnect();
    };
    voice.start(now);
    voice.stop(now + duration);
  }

  dispose() {
    this.disposed = true;
    this.enabled = false;
    void this.context?.close().catch(error => {
      console.warn('No se pudo cerrar el contexto de audio.', error);
    });
  }
}
