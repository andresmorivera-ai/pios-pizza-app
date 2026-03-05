const fs = require('fs');

function writeTone(filename, durationSec) {
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

    const amplitude = 24000; // Softer volume

    // Two frequencies for a relaxed melodic chime (e.g. C5 and E5)
    const freq1 = 523.25; // C5
    const freq2 = 659.25; // E5

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;

        // Very soft, relaxed envelope (slow attack, long smooth decay)
        const env = t < 0.1 ? (t / 0.1) : Math.exp(-2.5 * (t - 0.1));

        // Note 1 starts immediately
        let val1 = Math.sin(2 * Math.PI * freq1 * t) * Math.exp(-3 * t);

        // Note 2 comes in slightly delayed for an arpeggio effect
        let t2 = Math.max(0, t - 0.15);
        let val2 = Math.sin(2 * Math.PI * freq2 * t2) * Math.exp(-3 * t2);

        // Mix fundamental strings with a little bit of harmony to sound round and warm (like a wooden marimba/kalimba)
        let totalVal = (val1 + val2 * 0.8) +
            (Math.sin(2 * Math.PI * (freq1 * 2) * t) * 0.15 * Math.exp(-4 * t)) +
            (Math.sin(2 * Math.PI * (freq2 * 2) * t2) * 0.1 * Math.exp(-4 * t2));

        let sample = (totalVal / 2) * amplitude * env;

        buffer.writeInt16LE(sample, 44 + i * 2);
    }

    fs.writeFileSync(filename, buffer);
    console.log(`Created ${filename} successfully!`);
}

// Generate a relaxed, melodic, soft chime
writeTone('assets/kitchen_alarm.wav', 2.0);
