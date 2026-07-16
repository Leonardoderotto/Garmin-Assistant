const orb = document.getElementById('orb');
const status = document.getElementById('status');
const output = document.getElementById('output');
const powerSwitch = document.getElementById('powerSwitch');
const starField = document.getElementById('star-field');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let isListening = false;
let isSystemOn = false;

// Sterne automatisch im Hintergrund generieren
function createStars() {
    const starCount = 45;
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        
        const size = Math.random() * 3 + 2;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        star.style.left = `${Math.random() * 100}vw`;
        star.style.top = `${Math.random() * 100}vh`;
        
        star.style.animationDelay = `${Math.random() * 4}s`;
        star.style.animationDuration = `${Math.random() * 3 + 3}s`;
        
        starField.appendChild(star);
    }
}
createStars();


if (!SpeechRecognition) {
    status.textContent = "Spracherkennung wird nicht unterstützt.";
    powerSwitch.disabled = true;
} else {
    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // === GEÄNDERT: Schalter-Logik startet jetzt sofort die Spracherkennung ===
    powerSwitch.addEventListener('change', (event) => {
        isSystemOn = event.target.checked;

        if (isSystemOn) {
            document.body.classList.add('system-active');
            orb.classList.add('active');
            status.textContent = "System startet...";
            
            // NEU: Sofortige Spracherkennung beim Einschalten triggern
            setTimeout(() => {
                try {
                    recognition.start();
                } catch (e) {
                    console.log("Fehler beim automatischen Starten der Erkennung:", e);
                }
            }, 300); // Eine winzige Verzögerung, damit die Einschalt-Animation flüssig durchläuft
            
        } else {
            if (isListening) {
                recognition.stop();
            }
            document.body.classList.remove('system-active');
            status.textContent = "System offline";
            orb.classList.remove('active', 'listening');
            output.textContent = "";
        }
    });

    // Funktion zum Umschalten (Toggle) der Spracherkennung im laufenden Betrieb
    function toggleListening() {
        if (!isSystemOn) return;

        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (e) {
                console.log("Fehler beim Starten der Erkennung.");
            }
        }
    }

    // Klick-Steuerung über den Orb
    orb.addEventListener('click', toggleListening);

    // Tastatur-Steuerung über die Leertaste
    window.addEventListener('keydown', (event) => {
        if (!isSystemOn) return;

        if (event.code === 'Space' || event.key === ' ') {
            event.preventDefault(); 
            toggleListening();
        }
    });

    recognition.onstart = () => {
        isListening = true;
        orb.classList.add('listening');
        status.textContent = "Garmin hört zu... (Leertaste/Core zum Stoppen)";
        output.textContent = "";
    };

    recognition.onend = () => {
        isListening = false;
        orb.classList.remove('listening');
        if (isSystemOn) {
            status.textContent = "Bereit. Leertaste drücken oder Core tippen.";
        }
    };

    recognition.onresult = (event) => {
        const speechToText = event.results[0][0].transcript;
        output.textContent = `"${speechToText}"`;
        respondToUser(speechToText);
    };

    recognition.onerror = (event) => {
        if (event.error === 'no-speech' && isSystemOn) {
            status.textContent = "Kein Audio erkannt. Erneut versuchen.";
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