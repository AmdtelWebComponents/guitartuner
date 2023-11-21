document.addEventListener('DOMContentLoaded', () => {
    // Access the microphone
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(handleSuccess)
        .catch(handleError);

    // Change the tuning based on user selection
    window.changeTuning = () => {
        const tuningSelect = document.getElementById('tuning');
        const selectedTuning = tuningSelect.value;
        // Adjust pitch frequencies or other tuning-related logic as needed
        console.log('Selected Tuning:', selectedTuning);
    };
});

function handleSuccess(stream) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);

    microphone.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function updatePitch() {
        analyser.getByteTimeDomainData(dataArray);

        const pitch = getPitch(dataArray, audioContext.sampleRate);
        const statusElement = document.getElementById('status');
        const centDiffElement = document.getElemendById('cent-diff');
        const arrowElement = document.getElementById('arrow');
	const noteLabelsElement = document.getElementById('note-labels');

        if (pitch) {
            // Display the pitch or other relevant information in the UI
            statusElement.innerText = `Detected Pitch: ${pitch.toFixed(2)} Hz`;
            
            // Calculate cent difference (you may need to adjust this based on your tuning logic)
            const centDiff = calculateCentDifference(pitch, 440); // 440 Hz is the reference pitch (A4)
            centDiffElement.innerText = centDiff.toFixed(2) + ' cents';

            // Rotate the arrow based on the pitch
            const rotationAngle = mapPitchToAngle(pitch);
            arrowElement.style.transform = `translate(-50%, -50%) rotate(${rotationAngle}deg)`;

	    // Update note labels
	    updateNoteLabels(noteLabelsElement, pitch);
        } else {
            statusElement.innerText = 'No pitch detected';
            centDiffElement.innerText = '0 cents';
            arrowElement.style.transform = `translate(-50%, -50%) rotate(0deg)`;
	    noteLabelsElement.innerHTML = '';
        }


        requestAnimationFrame(updatePitch);
    }

    updatePitch();
}

function getPitch(dataArray, sampleRate) {
    const threshold = 0.1; // Adjust as needed
    const correlations = new Float32Array(dataArray.length);

    for (let delay = 0; delay < dataArray.length; delay++) {
        let sum = 0;

        for (let i = 0; i < dataArray.length - delay; i++) {
            sum += (dataArray[i] - 128) * (dataArray[i + delay] - 128);
        }

        correlations[delay] = sum;
    }

    let pitchIndex = 0;
    let pitchValue = correlations[0];

    for (let i = 1; i < correlations.length; i++) {
        if (correlations[i] > pitchValue) {
            pitchValue = correlations[i];
            pitchIndex = i;
        }
    }

    if (pitchIndex === 0) {
	// Avoid division by zero
	return null;
    }

    let pitch = sampleRate / pitchIndex;

    // Filter out pitches below the threshold
    if (pitchValue > threshold) {
        return pitch;
    } else {
        return null;
    }
}

    updatePitch();
}

function calculateCentDifference(currentPitch, targetPitch) {
    const centsPerOctave = 1200; // There are 1200 cents in an octave
    return Math.log2(currentPitch / targetPitch) * centsPerOctave;
}

function mapPitchToAngle(pitch) {
    // Map the pitch to an angle within the range of 0 to 360 degrees
    const pitchRange = 1200; // 1200 cents cover one octave
    const angleRange = 360; // 360 degrees in a circle

    // Assuming the pitch range is from 0 to 1200 cents (adjust as needed)
    const mappedAngle = (pitch % pitchRange) / pitchRange * angleRange;

    return mappedAngle;
}

function updateNoteLabels(noteLabelsElement, pitch) {
    const notes = [
        'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
    ];

    const noteIndex = Math.round(pitchToMidiNoteNumber(pitch)) % 12;
    const numNotes = notes.length;

    noteLabelsElement.innerHTML = '';

    for (let i = 0; i < numNotes; i++) {
        const angle = (i / numNotes) * 360;
        const noteLabel = createNoteLabel(angle, notes[(noteIndex + i) % numNotes]);
        noteLabelsElement.appendChild(noteLabel);
    }
}

function createNoteLabel(angle, note) {
    const label = document.createElement('div');
    label.className = 'note-label';
    label.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
    label.innerHTML = `<span style="font-size: 10px; position: absolute; top: -12px; left: 50%; transform: translateX(-50%)">${note}</span>`;
    return label;
}

function pitchToMidiNoteNumber(pitch) {
    return 69 + 12 * Math.log2(pitch / 440);
}
