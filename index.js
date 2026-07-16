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

// Hilfsfunktion zum Ändern der Sternenfarbe
function setStarsColor(colorType) {
    if (colorType === 'listening') {
        // Rot leuchtende Sterne
        document.documentElement.style.setProperty('--current-star-color', '#ff0844');
        document.documentElement.style.setProperty('--current-star-glow', 'rgba(255, 8, 68, 0.6)');
    } else {
        // Cyan leuchtende Sterne (Standard)
        document.documentElement.style.setProperty('--current-star-color', '#00f2fe');
        document.documentElement.style.setProperty('--current-star-glow', 'rgba(0, 242, 254, 0.6)');
    }
}

if (!SpeechRecognition) {
    status.textContent = "Spracherkennung wird nicht unterstützt.";
    powerSwitch.disabled = true;
} else {
    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // Schalter-Logik mit ausgefeilter "Entwicklungs"-Animation
    powerSwitch.addEventListener('change', (event) => {
        isSystemOn = event.target.checked;

        if (isSystemOn) {
            // Erst die Hintergrundsterne & Außenringe triggern (Entwicklungsphase)
            document.body.classList.add('system-active');
            setStarsColor('idle');
            status.textContent = "Initialisiere Core-Verbindung...";
            
            // Core baut sich schrittweise nach den Ringen auf
            setTimeout(() => {
                status.textContent = "System online. Starte Spracherkennung...";
                try {
                    recognition.start();
                } catch (e) {
                    console.log("Fehler beim automatischen Starten der Erkennung:", e);
                }
            }, 1000); // 1 Sekunde für den Aufbau der Ringe zum Core
            
        } else {
            if (isListening) {
                recognition.stop();
            }
            // Sanfter Abbau-Effekt
            status.textContent = "System fährt herunter...";
            document.body.classList.remove('system-listening', 'system-active');
            
            setTimeout(() => {
                status.textContent = "System offline";
                output.textContent = "";
            }, 800);
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
        document.body.classList.add('system-listening');
        setStarsColor('listening'); // Sterne synchronisieren sich auf ROT
        status.textContent = "Garmin hört zu... (Leertaste/Core zum Stoppen)";
        output.textContent = "";
    };

    recognition.onend = () => {
        isListening = false;
        document.body.classList.remove('system-listening');
        setStarsColor('idle'); // Sterne synchronisieren sich zurück auf CYAN
        if (isSystemOn) {
            status.textContent = "Bereit. Leertaste drücken oder Core tippen.";
        }
    };

    recognition.onresult = (event) => {
        const speechToText = event.results[0][0].transcript;
        respondToUser(speechToText);
    };

    recognition.onerror = (event) => {
        if (event.error === 'no-speech' && isSystemOn) {
            status.textContent = "Kein Audio erkannt. Erneut versuchen.";
        }
    };
}

// === Garmins Gehirn (Hier antwortet er dir!) ===
function respondToUser(text) {
    let response = "Entschuldige, bububärchen, das habe ich nicht verstanden.";
    const lowerText = text.toLowerCase();

    if (lowerText.includes('hallo') || lowerText.includes('hi')) {
        response = "Hallo bububärchen! Core-Systeme laufen stabil.";
    } else if (lowerText.includes('wie geht') || lowerText.includes('wie läuft')) {
        response = "Alle Systeme arbeiten im optimalen Bereich, bububärchen. Danke der Nachfrage.";
    } else if (lowerText.includes('wer bist du') || lowerText.includes('dein name')) {
        response = "Ich bin Garmin, die künstliche Intelligenz dieses Terminals.";
    } else if (lowerText.includes('lieblingsfarbe') || lowerText.includes('welche farbe')) {
        response = "Meine Lieblingsfarbe ist natürlich Neon-Cyan, genau wie meine Sterne im Hintergrund, bububärchen!";
    }

    // Zeige die Antwort auf dem Bildschirm an!
    output.innerHTML = `
        <span style="opacity: 0.5; font-size: 0.9rem;">Du: "${text}"</span><br>
        <span style="color: #ffffff; text-shadow: 0 0 10px var(--neon-glow); font-weight: bold; font-style: normal; display: block; margin-top: 5px;">
            Garmin: "${response}"
        </span>
    `;

    // Diese Zeilen lesen die Antwort laut vor (Text-to-Speech)
    const utterance = new SpeechSynthesisUtterance(response);
    utterance.lang = 'de-DE';
    window.speechSynthesis.speak(utterance);
}