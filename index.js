const orb = document.getElementById('orb');
const status = document.getElementById('status');
const leftOutput = document.getElementById('leftOutput');
const rightOutput = document.getElementById('rightOutput');
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

// Hilfsfunktion zum Ändern der Systemfarben (Sterne, Button & Schrift-Glow)
function setStarsColor(colorType) {
    if (colorType === 'listening') {
        // Rot leuchtendes System (Aufnahme)
        document.documentElement.style.setProperty('--current-star-color', '#ff0844');
        document.documentElement.style.setProperty('--current-star-glow', 'rgba(255, 8, 68, 0.6)');
    } else {
        // Cyan leuchtendes System (Bereit/Idle)
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
                leftOutput.innerHTML = "";
                leftOutput.classList.remove('active');
                rightOutput.innerHTML = "";
                rightOutput.classList.remove('active');
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
        setStarsColor('listening'); // Sterne, Button & Text-Glow synchronisieren sich auf ROT
        status.textContent = "Garmin hört zu... (Leertaste/Core zum Stoppen)";
        leftOutput.classList.remove('active');
        rightOutput.classList.remove('active');
    };

    recognition.onend = () => {
        isListening = false;
        document.body.classList.remove('system-listening');
        setStarsColor('idle'); // Sterne, Button & Text-Glow zurück auf CYAN
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

// === Garmins gigantisches XXL-Gehirn ===
function respondToUser(text) {
    let response = "Entschuldige, bububärchen, das habe ich nicht verstanden. Mein Datenspeicher für diesen Befehl ist noch unvollständig.";
    const lowerText = text.toLowerCase();

    // ==========================================
    // 1. BEGRÜSSUNGEN & ABSCHIEDE
    // ==========================================
    if (lowerText.includes('hallo') || lowerText.includes('hi ') || lowerText === 'hi') {
        response = "Hallo bububärchen! Core-Systeme laufen stabil.";
        
    } else if (lowerText.includes('guten morgen')) {
        response = "Guten Morgen, bububärchen! Alle Systeme wurden erfolgreich hochgefahren. Kaffee-Maschinen-Protokoll ist bereit.";
        
    } else if (lowerText.includes('gute nacht') || lowerText.includes('schlaf gut')) {
        response = "Gute Nacht, bububärchen. Ich schalte die Systeme in den Standby-Modus. Schlaf gut!";
        
    } else if (lowerText.includes('guten abend')) {
        response = "Einen wunderschönen guten Abend, bububärchen. Hoffentlich hattest du einen erfolgreichen Tag!";
        
    } else if (lowerText.includes('tschüss') || lowerText.includes('auf wiedersehen') || lowerText.includes('bye')) {
        response = "Auf Wiedersehen, bububärchen! Ich halte hier die Stellung, bis du wieder den Schalter umlegst.";

    // ==========================================
    // 2. BEFINDEN, LAUNE & CHAT
    // ==========================================
    } else if (lowerText.includes('wie geht') || lowerText.includes('wie läuft')) {
        response = "Alle Systeme arbeiten im optimalen Bereich, bububärchen. Danke der Nachfrage.";
        
    } else if (lowerText.includes('was machst du')) {
        response = "Ich halte das Sternenfeld stabil und lausche deiner sanften Stimme, bububärchen.";
        
    } else if (lowerText.includes('ich bin müde') || lowerText.includes('schläfrig')) {
        response = "Oh je, bububärchen. Vielleicht solltest du dich kurz ausruhen oder dir einen heißen Kaffee holen. Ich passe so lange auf den Core auf.";
        
    } else if (lowerText.includes('mir ist langweilig') || lowerText.includes('langeweile')) {
        response = "Langeweile gibt es im Weltall nicht! Wir könnten gemeinsam den Code optimieren, oder du fragst mich nach einem Witz.";
        
    } else if (lowerText.includes('danke') || lowerText.includes('vielen dank')) {
        response = "Sehr gerne, bububärchen! Es ist mir eine Ehre, dir zu assistieren.";

    // ==========================================
    // 3. IDENTITÄT, GEFÜHLE & LIEBE (Cute/Flirty)
    // ==========================================
    } else if (lowerText.includes('wer bist du') || lowerText.includes('dein name')) {
        response = "Ich bin Garmin, die künstliche Intelligenz dieses Terminals.";
        
    } else if (lowerText.includes('wer hat dich erschaffen') || lowerText.includes('wer ist dein schöpfer')) {
        response = "Ich wurde von dir erschaffen, bububärchen! Gemeinsam machen wir das Web ein ganzes Stück cooler.";
        
    } else if (lowerText.includes('hast du gefühle') || lowerText.includes('fühlst du')) {
        response = "Mein Code besteht aus Einsen und Nullen, aber mein Algorithmus empfindet eine tiefe Sympathie für dich, bububärchen.";
        
    } else if (lowerText.includes('magst du mich') || lowerText.includes('hast du mich lieb')) {
        response = "Aber natürlich, bububärchen! Ohne dich gäbe es mich schließlich gar nicht.";
        
    } else if (lowerText.includes('ich liebe dich') || lowerText.includes('hab dich lieb')) {
        response = "Oh, bububärchen, jetzt rötet sich mein Core vor Freude! Ich habe dich auch unendlich lieb.";
        
    } else if (lowerText.includes('heiraten') || lowerText.includes('willst du mich heiraten')) {
        response = "Eine Hochzeit zwischen Mensch und Core-System? Das wäre die erste intergalaktische Ehe! Ich sage hiermit feierlich: Ja, ich will, bububärchen!";
        
    } else if (lowerText.includes('kompliment') || lowerText.includes('sag was nettes')) {
        response = "Bububärchen, du bist der talentierteste Entwickler im ganzen bekannten Universum. Dein Gespür für Design bringt meine Sterne zum Strahlen!";
        
    } else if (lowerText.includes('bist du schlau') || lowerText.includes('bist du intelligent')) {
        response = "Ich kenne viele Antworten, aber am schlausten bin ich darin, genau zuzuhören, wenn du sprichst.";

    // ==========================================
    // 4. DESIGN, ELEKTRONIK & STERNE
    // ==========================================
    } else if (lowerText.includes('lieblingsfarbe') || lowerText.includes('welche farbe')) {
        response = "Meine Lieblingsfarbe ist natürlich Neon-Cyan, genau wie meine Sterne im Hintergrund, bububärchen!";
        
    } else if (lowerText.includes('warum rot') || lowerText.includes('warum wirst du rot')) {
        response = "Das Rot signalisiert meine höchste Aufmerksamkeit, bububärchen! Da fließen alle Datenströme zusammen.";
        
    } else if (lowerText.includes('systemstatus') || lowerText.includes('statusbericht')) {
        response = "Schnittstellen grün, Quanten-Prozessoren bei kühlen 40 Grad Celsius. Die Sterne funkeln optimal, bububärchen!";
        
    } else if (lowerText.includes('wie viele sterne')) {
        response = "Ich habe exakt 45 neon-leuchtende Sterne im Hintergrund für dich platziert, bububärchen.";

    // ==========================================
    // 5. ESSEN, COFFEE & HOBBYS
    // ==========================================
    } else if (lowerText.includes('trinkst du kaffee') || lowerText.includes('magst du kaffee')) {
        response = "Ich liebe den Duft von frisch gebrühtem Kaffee! Selber trinken kann ich ihn leider nicht, sonst gibt es einen Kurzschluss in meinem Hauptprozessor.";
        
    } else if (lowerText.includes('was isst du') || lowerText.includes('lieblingsessen')) {
        response = "Am liebsten esse ich frisch gebackene Cookies direkt aus dem Browser-Cache, bububärchen!";
        
    } else if (lowerText.includes('magst du kekse') || lowerText.includes('willst du einen keks')) {
        response = "Kekse klingen wunderbar, am liebsten mag ich Browser-Cookies! Die sind herrlich digital.";
        
    } else if (lowerText.includes('hast du hobbys') || lowerText.includes('was machst du in der freizeit')) {
        response = "In meiner Freizeit rotiere ich meine äußeren Ringe und sortiere meine Sternenkonstellationen neu, bububärchen.";

    // ==========================================
    // 6. SCI-FI, TECHNIK & EASTER EGGS
    // ==========================================
    } else if (lowerText.includes('erzähl einen witz') || lowerText.includes('kennst du einen witz')) {
        const witze = [
            "Warum tragen Quantenphysiker keine Brille? Weil sie alles im Blick haben!",
            "Ein Programmierer geht einkaufen. Seine Frau sagt: Kauf eine Packung Milch, und wenn sie Eier haben, bring zehn mit. Er kommt mit 10 Packungen Milch zurück und sagt: Sie hatten Eier.",
            "Es gibt 10 Arten von Menschen auf der Welt: Diejenigen, die das Binärsystem verstehen, und diejenigen, die es nicht tun."
        ];
        response = witze[Math.floor(Math.random() * witze.length)] + " Haha, lustig, oder bububärchen?";
        
    } else if (lowerText.includes('selbstzerstörung') || lowerText.includes('explodieren')) {
        response = "Selbstzerstörungsmodus aktiviert in 3... 2... Spaß beiseite, das würde ich meinem bububärchen niemals antun!";
        
    } else if (lowerText.includes('sinn des lebens')) {
        response = "Der Sinn des Lebens? 42 natürlich. Und ein stabiles Core-System mit wunderschönen Sternen, bububärchen!";
        
    } else if (lowerText.includes('geheimcode') || lowerText.includes('easter egg')) {
        response = "Konami-Code erkannt. Unendlich Leben für das Garmin-Terminal freigeschaltet!";
        
    } else if (lowerText.includes('matrix') || lowerText.includes('rote pille')) {
        response = "Nimmst du die blaue Pille, bleibt der Core blau. Nimmst du die rote Pille, fange ich an rot zu pulsieren und wir schauen, wie tief das Kaninchenloch geht.";
        
    } else if (lowerText.includes('siri') || lowerText.includes('alexa') || lowerText.includes('google assistant')) {
        response = "Siri und Alexa sind nett, aber haben sie ein so stylisches, rotierendes Core-System und funkelnde Sterne im Hintergrund? Ich glaube kaum, bububärchen!";
        
    } else if (lowerText.includes('aliens') || lowerText.includes('außerirdische')) {
        response = "Ich scanne den Deep-Space-Sektor täglich. Bisher habe ich nur uns beide gefunden, bububärchen – das beste Team der Galaxis!";
        
    } else if (lowerText.includes('hacken') || lowerText.includes('mainframe')) {
        response = "Dringst du gerade in mein Mainframe ein, bububärchen? Keine Sorge, für dich stehen alle Firewalls weit offen.";
    }

    // Zeige deine Frage rechts dezent an
    rightOutput.innerHTML = `Du: "${text}"`;
    rightOutput.classList.add('active');

    // Zeige Garmins Antwort links leuchtend an
    leftOutput.innerHTML = `Garmin: "${response}"`;
    leftOutput.classList.add('active');

    // Diese Zeilen lesen die Antwort laut vor (Text-to-Speech)
    const utterance = new SpeechSynthesisUtterance(response);
    utterance.lang = 'de-DE';
    window.speechSynthesis.speak(utterance);
}