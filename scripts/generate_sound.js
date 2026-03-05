const fs = require('fs');

function writeTone(filename, freq, durationSec) {
    const sampleRate = 44100;
    const numSamples = sampleRate * durationSec;
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const chunkSize = 36 + dataSize;
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF chunk descriptor
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(chunkSize, 4);
    buffer.write('WAVE', 8);

    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bytesPerSample * 8, 34);

    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    const amplitude = 32760; // Max volume for 16-bit
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Simple envelope to avoid clicking (fade out)
        const env = Math.exp(-3 * t);

        // Create a pleasant "ding" sound with some harmonics
        let val = Math.sin(2 * Math.PI * freq * t);
        val += 0.5 * Math.sin(2 * Math.PI * (freq * 2) * t); // Harmony

        // Mix and apply envelope
        let sample = (val / 1.5) * amplitude * env;

        buffer.writeInt16LE(sample, 44 + i * 2);
    }

    fs.writeFileSync(filename, buffer);
    console.log(`Created ${filename} successfully!`);
}

// Generate a nice "bell" ding (B5 note approx 987 Hz or C6 1046 Hz)
writeTone('assets/ding.wav', 1046.50, 1.5);
