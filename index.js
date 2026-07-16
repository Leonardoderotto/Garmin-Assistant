const orb = document.getElementById('orb');
const status = document.getElementById('status');
const output = document.getElementById('output');
const powerSwitch = document.getElementById('powerSwitch');
const starField = document.getElementById('star-field'); // NEU

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let isListening = false;
let isSystemOn = false;

// === NEU: Sterne automatisch im Hintergrund generieren ===
function createStars() {
    const starCount = 45; // Wie viele Punkte du haben willst
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        
        // Zufällige Größe zwischen 2px und 5px
        const size = Math.random() * 3 + 2;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        // Zufällige Position auf dem Bildschirm
        star.style.left = `${Math.random() * 100}vw`;
        star.style.top = `${Math.random() * 100}vh`;
        
        // Zufällige Verzögerung für die Animation, damit nicht alle synchron zucken
        star.style.animationDelay = `${Math.random() * 4}s`;
        star.style.animationDuration = `${Math.random() * 3 + 3}s`;
        
        starField.appendChild(star);
    }
}
// Sterne direkt beim Start aufbauen
createStars();


if (!SpeechRecognition) {
    status.textContent = "Spracherkennung wird nicht unterstützt.";
    powerSwitch.disabled = true;
} else {
    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // === GEÄNDERT: Schalter-Logik steuert jetzt auch das Background-Fading ===
    powerSwitch.addEventListener('change', (event) => {
        isSystemOn = event.target.checked;

        if (isSystemOn) {
            // Aktiviert das Sternenfeld im CSS via Body-Klasse
            document.body.classList.add('system-active');
            status.textContent = "Bereit. Tippe auf den Core.";
            orb.classList.add('active');
        } else {
            if (isListening) {
                recognition.stop();
            }
            // Deaktiviert das Sternenfeld
            document.body.classList.remove('system-active');
            status.textContent = "System offline";
            orb.classList.remove('active', 'listening');
            output.textContent = "";
        }
    });

    orb.addEventListener('click', () => {
        if (!isSystemOn) return;

        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (e) {
                console.log("Fehler beim Starten.");
            }
        }
    });

    recognition.onstart = () => {
        isListening = true;
        orb.classList.add('listening');
        status.textContent = "Garmin hört zu...";
        output.textContent = "";
    };

    recognition.onend = () => {
        isListening = false;
        orb.classList.remove('listening');
        if (isSystemOn) {
            status.textContent = "Bereit. Tippe auf den Core.";
        }
    };

    recognition.onresult = (event) => {
        const speechToText = event.results[0][0].transcript;
        output.textContent = `"${speechToText}"`;
        respondToUser(speechToText);
    };

    recognition.onerror = (event) => {
        if (event.error === 'no-speech' && isSystemOn) {
            status.textContent = "Kein Audio erkannt.";
        }
    };
}

function respondToUser(text) {
    let response = "Entschuldige, bububärchen, das habe ich nicht verstanden.";
    const lowerText = text.toLowerCase();

    if (lowerText.includes('hallo') || lowerText.includes('hi')) {
        response = "Hallo bububärchen! Core-Systeme laufen stabil.";
    } else if (lowerText.includes('wie geht') || lowerText.includes('wie läuft')) {
        response = "Alle Systeme arbeiten im optimalen Bereich, bububärchen. Danke der Nachfrage.";
    } else if (lowerText.includes('wer bist du') || lowerText.includes('dein name')) {
        response = "Ich bin Garmin, die künstliche Intelligenz dieses Terminals.";
    }

    const utterance = new SpeechSynthesisUtterance(response);
    utterance.lang = 'de-DE';
    window.speechSynthesis.speak(utterance);
}