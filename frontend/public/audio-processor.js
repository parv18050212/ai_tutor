/**
 * Audio Processor Worklet
 * Converts microphone audio (Float32) to PCM16 format for OpenAI Realtime API
 *
 * This runs in the AudioWorklet thread (separate from main thread)
 * for real-time audio processing without blocking the UI
 */

class PCM16Processor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 0;
    this.buffer = new Float32Array(0);
  }

  /**
   * Process audio samples
   * Called automatically by the browser for each audio frame (128 samples)
   *
   * @param {Float32Array[][]} inputs - Input audio channels
   * @param {Float32Array[][]} outputs - Output audio channels (unused here)
   * @param {Object} parameters - Parameters (unused here)
   * @returns {boolean} - true to keep processor alive
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];

    // Check if we have audio input
    if (!input || input.length === 0) {
      return true;  // Keep processor alive
    }

    const inputChannel = input[0];  // Get first channel (mono)

    if (inputChannel && inputChannel.length > 0) {
      // Convert Float32 samples to PCM16 (Int16)
      const pcm16 = new Int16Array(inputChannel.length);

      for (let i = 0; i < inputChannel.length; i++) {
        // Float32 range: -1.0 to 1.0
        // Int16 range: -32768 to 32767

        // Clamp and convert
        const sample = inputChannel[i];
        const clamped = Math.max(-1, Math.min(1, sample));
        pcm16[i] = Math.floor(clamped * 32767);
      }

      // Send PCM16 data to main thread
      this.port.postMessage(pcm16);
    }

    return true;  // Keep processor alive
  }
}

// Register the processor
registerProcessor('pcm16-processor', PCM16Processor);
