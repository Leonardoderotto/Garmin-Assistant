const orb = document.getElementById('orb');
const status = document.getElementById('status');
const output = document.getElementById('output');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    status.textContent = "Spracherkennung wird auf diesem Gerät nicht unterstützt.";
} else {
    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    orb.addEventListener('click', () => {
        try {
            recognition.start();
        } catch (e) {
            console.log("Erkennung läuft bereits.");
        }
    });

    recognition.onstart = () => {
        orb.classList.add('listening');
        status.textContent = "Ich höre dir zu...";
        output.textContent = "";
    };

    recognition.onspeechend = () => {
        recognition.stop();
    };

    recognition.onend = () => {
        orb.classList.remove('listening');
        status.textContent = "Tippe auf den Kreis, um zu sprechen";
    };

    recognition.onresult = (event) => {
        const speechToText = event.results[0][0].transcript;
        output.textContent = `"${speechToText}"`;
        respondToUser(speechToText);
    };
}

function respondToUser(text) {
    let response = "Entschuldige, bububärchen, das habe ich nicht verstanden.";
    const lowerText = text.toLowerCase();

    if (lowerText.includes('hallo') || lowerText.includes('hi')) {
        response = "Hallo bububärchen! Schön, dich zu hören.";
    } else if (lowerText.includes('wie geht') || lowerText.includes('wie läuft')) {
        response = "Mir geht es fantastisch im GitHub-Universum! Und dir, bububärchen?";
    } else if (lowerText.includes('wer bist du') || lowerText.includes('dein name')) {
        response = "Ich bin Garmin, dein minimalistischer Sprachassistent.";
    }

    const utterance = new SpeechSynthesisUtterance(response);
    utterance.lang = 'de-DE';
    window.speechSynthesis.speak(utterance);
}