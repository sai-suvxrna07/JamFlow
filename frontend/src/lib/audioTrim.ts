// Detects leading silence in a recorded clip so playback can start right on
// the first note instead of a beat (or more) of dead air before it. Without
// this, generated instruments look "in sync" on the timeline but audibly
// lag behind the actual first note the musician played.

const SILENCE_THRESHOLD_LINEAR = 0.02; // ~ -34 dBFS
const MAX_TRIM_SECONDS = 2;

export async function detectLeadingSilence(blob: Blob): Promise<number> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channel = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const maxSamples = Math.min(channel.length, MAX_TRIM_SECONDS * sampleRate);

    for (let i = 0; i < maxSamples; i++) {
      if (Math.abs(channel[i]) > SILENCE_THRESHOLD_LINEAR) {
        await ctx.close();
        return i / sampleRate;
      }
    }
    await ctx.close();
    return 0;
  } catch {
    // If decoding fails for any reason, fall back to no trim rather than blocking playback.
    return 0;
  }
}
