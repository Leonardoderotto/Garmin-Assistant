const orb = document.getElementById('orb');
const status = document.getElementById('status');
const output = document.getElementById('output');
const powerSwitch = document.getElementById('powerSwitch'); // NEU: Der Schalter

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Zustandsspeicher
let isListening = false; // Hören wir gerade zu?
let isSystemOn = false;  // Ist der Assistent eingeschaltet?

if (!SpeechRecognition) {
    status.textContent = "Spracherkennung wird auf diesem Gerät nicht unterstützt.";
    powerSwitch.disabled = true; // Schalter deaktivieren
} else {
    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // === NEU: Logik für den An-/Aus-Schalter ===
    powerSwitch.addEventListener('change', (event) => {
        isSystemOn = event.target.checked;

        if (isSystemOn) {
            status.textContent = "Tippe auf den Kreis, um zu sprechen";
            orb.classList.add('active'); // Orb aktivieren (visuell)
        } else {
            // Wenn ausgeschaltet wird, während er zuhört: Stop!
            if (isListening) {
                recognition.stop();
            }
            status.textContent = "System ist AUS";
            orb.classList.remove('active', 'listening'); // Alles zurücksetzen
            output.textContent = "";
        }
    });

    // === GEÄNDERT: Logik für den Kreis-Klick (Toggle) ===
    orb.addEventListener('click', () => {
        // Nur wenn das System ÜBERHAUPT an ist
        if (!isSystemOn) return;

        if (isListening) {
            // Wenn er zuhört -> Beenden (NEU)
            recognition.stop();
        } else {
            // Wenn er nicht zuhört -> Starten
            try {
                recognition.start();
            } catch (e) {
                console.log("Erkennung konnte nicht gestartet werden.");
            }
        }
    });

    recognition.onstart = () => {
        isListening = true; // Zustand ändern
        orb.classList.add('listening');
        status.textContent = "Ich höre dir zu (erneut tippen zum Stoppen)...";
        output.textContent = "";
    };

    // Wird aufgerufen, wenn du aufhörst zu sprechen ODER .stop() aufgerufen wird
    recognition.onend = () => {
        isListening = false; // Zustand zurücksetzen
        orb.classList.remove('listening');
        
        // Status nur ändern, wenn das System noch an ist
        if (isSystemOn) {
            status.textContent = "Tippe auf den Kreis, um zu sprechen";
        }
    };

    // Wird aufgerufen, wenn du erfolgreich zu Ende gesprochen hast
    recognition.onresult = (event) => {
        const speechToText = event.results[0][0].transcript;
        output.textContent = `"${speechToText}"`;
        respondToUser(speechToText);
    };

    // Fehlerbehandlung (z.B. wenn kein Ton kommt)
    recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
            status.textContent = "Ich habe nichts gehört. Tippe erneut.";
        }
        console.error("Speech recognition error", event.error);
    };
}

function respondToUser(text) {
    let response = "Entschuldige, bububärchen, das habe ich nicht verstanden.";
    const lowerText = text.toLowerCase();

    if (lowerText.includes('hallo') || lowerText.includes('hi')) {
        response = "Hallo bububärchen! Schön, dich zu hören.";
    } else if (lowerText.includes('wie geht') || lowerText.includes('wie läuft')) {
        response = "Mir geht es fantastisch im Code-Universum! Und dir, bububärchen?";
    } else if (lowerText.includes('wer bist du') || lowerText.includes('dein name')) {
        response = "Ich bin Garmin, dein minimalistischer Sprachassistent.";
    }

    const utterance = new SpeechSynthesisUtterance(response);
    utterance.lang = 'de-DE';
    window.speechSynthesis.speak(utterance);
}