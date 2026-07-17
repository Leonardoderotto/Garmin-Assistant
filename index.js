const orb = document.getElementById('orb');
const status = document.getElementById('status');
const leftOutput = document.getElementById('leftOutput');
const rightOutput = document.getElementById('rightOutput');
const powerSwitch = document.getElementById('powerSwitch');
const starField = document.getElementById('star-field');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const canvas = document.getElementById('visualizerCanvas');
const canvasCtx = canvas.getContext('2d');

// API-Key Elemente
const settingsBtn = document.getElementById('settingsBtn');
const modalOverlay = document.getElementById('modalOverlay');
const closeModalBtn = document.getElementById('closeModalBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let isListening = false;
let isSystemOn = false;

// Web Audio API
let audioCtx;
let analyser;
let micStream;
let visualizerAnimationId;

// Ambient Sci-Fi Sound Variablen
let ambientOsc1, ambientOsc2, ambientGain;

// API-Key Management
let apiKey = localStorage.getItem('garmin_openai_apikey') || '';
if (apiKey) apiKeyInput.value = apiKey;

// Modal öffnen
settingsBtn.addEventListener('click', () => {
    modalOverlay.classList.add('active');
});

// Modal schließen
closeModalBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
});

// Modal schließen, wenn man außerhalb klickt
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
    }
});

// API-Key speichern
saveApiKeyBtn.onclick = () => {
    apiKey = apiKeyInput.value.trim();
    localStorage.setItem('garmin_openai_apikey', apiKey);
    modalOverlay.classList.remove('active');
    alert('API Key erfolgreich aktualisiert! 🚀');
};

// === SCI-FI HINTERGRUND-BRUMMEN (DRONE) ===
function startAmbient() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (ambientOsc1) return; // Läuft bereits
    
    ambientOsc1 = audioCtx.createOscillator();
    ambientOsc2 = audioCtx.createOscillator();
    ambientGain = audioCtx.createGain();
    
    // Zwei tiefe Frequenzen, leicht versetzt für ein "Schwebungs"-Wabern
    ambientOsc1.type = 'sine';
    ambientOsc1.frequency.value = 55; 
    
    ambientOsc2.type = 'triangle';
    ambientOsc2.frequency.value = 56; 
    
    ambientGain.gain.setValueAtTime(0, audioCtx.currentTime);
    ambientGain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 2); // Sanftes Einblenden
    
    ambientOsc1.connect(ambientGain);
    ambientOsc2.connect(ambientGain);
    ambientGain.connect(audioCtx.destination);
    
    ambientOsc1.start();
    ambientOsc2.start();
}

function stopAmbient() {
    if (ambientOsc1) {
        // Sanftes Ausblenden
        ambientGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        setTimeout(() => {
            if (ambientOsc1) ambientOsc1.stop();
            if (ambientOsc2) ambientOsc2.stop();
            ambientOsc1 = null;
            ambientOsc2 = null;
        }, 500);
    }
}

// === SOUND-SYNTHESE (Sci-Fi Chirps & Shutdown) ===
function playSound(type) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'boot') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.8);
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
    } else if (type === 'shutdown') { // NEUER SHUTDOWN SOUND
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.8);
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
    } else if (type === 'listening') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1200, now + 0.08);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.setValueAtTime(0.08, now + 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'error') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.5);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    }
}

// === ECHTER AUDIO VISUALIZER ===
async function initVisualizer() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioCtx.createMediaStreamSource(micStream);
        
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; 
        source.connect(analyser);
        
        drawVisualizer();
    } catch (err) {
        console.warn("Mikrofonzugriff verweigert.", err);
    }
}

function stopVisualizer() {
    if (micStream) micStream.getTracks().forEach(track => track.stop());
    cancelAnimationFrame(visualizerAnimationId);
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawVisualizer() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 68;

    function draw() {
        visualizerAnimationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        const barsCount = 28;
        const color = isListening ? '#ff0844' : '#00f2fe';

        for (let i = 0; i < barsCount; i++) {
            const value = dataArray[i % (bufferLength / 2)] / 255.0;
            const barHeight = value * 22;

            const angle = (i / barsCount) * Math.PI * 2;
            const xStart = centerX + Math.cos(angle) * radius;
            const yStart = centerY + Math.sin(angle) * radius;
            const xEnd = centerX + Math.cos(angle) * (radius + barHeight);
            const yEnd = centerY + Math.sin(angle) * (radius + barHeight);

            canvasCtx.beginPath();
            canvasCtx.moveTo(xStart, yStart);
            canvasCtx.lineTo(xEnd, yEnd);
            canvasCtx.strokeStyle = color;
            canvasCtx.lineWidth = 3;
            canvasCtx.lineCap = 'round';
            canvasCtx.shadowBlur = 6;
            canvasCtx.shadowColor = color;
            canvasCtx.stroke();
        }
    }
    draw();
}

// === VOLLBILD LOGIK ===
fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Fehler beim Vollbild: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

// === STERNE GENERIEREN ===
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

function setStarsColor(colorType) {
    if (colorType === 'listening') {
        document.documentElement.style.setProperty('--current-star-color', '#ff0844');
        document.documentElement.style.setProperty('--current-star-glow', 'rgba(255, 8, 68, 0.6)');
    } else {
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

    powerSwitch.addEventListener('change', (event) => {
        isSystemOn = event.target.checked;

        if (isSystemOn) {
            playSound('boot');
            startAmbient(); // Hintergrund-Brummen an
            document.body.classList.add('system-active');
            setStarsColor('idle');
            status.textContent = "Initialisiere Core-Verbindung...";
            
            setTimeout(() => {
                status.textContent = "System online. Starte Spracherkennung...";
                try {
                    recognition.start();
                } catch (e) {
                    console.log("Fehler beim Starten:", e);
                }
            }, 1000);
            
        } else {
            playSound('shutdown'); // Herunterfahren-Sound
            stopAmbient();         // Hintergrund-Brummen aus
            if (isListening) {
                recognition.stop();
            }
            stopVisualizer();
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

    function toggleListening() {
        if (!isSystemOn) return;
        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (e) {
                console.log("Fehler beim Zuhören.");
            }
        }
    }

    orb.addEventListener('click', toggleListening);

    window.addEventListener('keydown', (event) => {
        if (!isSystemOn) return;
        if (event.code === 'Space' || event.key === ' ') {
            event.preventDefault(); 
            toggleListening();
        }
    });

    recognition.onstart = () => {
        isListening = true;
        playSound('listening');
        document.body.classList.add('system-listening');
        setStarsColor('listening');
        status.textContent = "Garmin hört zu... (Leertaste/Core zum Stoppen)";
        leftOutput.classList.remove('active');
        rightOutput.classList.remove('active');
        initVisualizer();
    };

    recognition.onend = () => {
        isListening = false;
        document.body.classList.remove('system-listening');
        setStarsColor('idle');
        stopVisualizer();
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
            playSound('error');
            status.textContent = "Kein Audio erkannt. Erneut versuchen.";
        }
    };
}

// === Garmins Gehirn (Offline & Online) ===
async function respondToUser(text) {
    rightOutput.innerHTML = `Du: "${text}"`;
    rightOutput.classList.add('active');

    let response = "";
    status.textContent = "Garmin verarbeitet Daten...";

    if (apiKey) {
        try {
            const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "Du bist Garmin, eine hochentwickelte künstliche Intelligenz und ein treuer Assistent. Du bist extrem hilfsbereit, nennst dich Garmin und liebst deinen Schöpfer. Antworte immer auf Deutsch, halte deine Antworten relativ kurz und prägnant (maximal 2-3 Sätze), damit sie gut vorgelesen werden können, und benutze eine futuristische, warmherzige Sci-Fi-Tonalität."
                        },
                        {
                            role: "user",
                            content: text
                        }
                    ],
                    max_tokens: 150
                })
            });

            if (!apiResponse.ok) throw new Error("API-Anfrage fehlgeschlagen");
            const data = await apiResponse.json();
            response = data.choices[0].message.content;

        } catch (error) {
            console.error("API-Fehler:", error);
            response = "Es gab einen Fehler im Quanten-Netzwerk. Ich greife auf mein Offline-Ausweichsystem zurück.";
            playSound('error');
        }
    }

    if (!response) response = getOfflineResponse(text);

    status.textContent = "Bereit. Leertaste drücken oder Core tippen.";
    leftOutput.innerHTML = `Garmin: "${response}"`;
    leftOutput.classList.add('active');

    // === SPRACHAUSGABE ===
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(response);
    utterance.lang = 'de-DE';
    utterance.pitch = 1.1; 
    utterance.rate = 1.0; 

    const voices = window.speechSynthesis.getVoices();
    const germanVoice = voices.find(voice => voice.lang.startsWith('de'));
    if (germanVoice) utterance.voice = germanVoice;

    // Hintergrund-Brummen pausieren, während Garmin redet
    utterance.onstart = () => stopAmbient(); 
    utterance.onend = () => {
        if (isSystemOn) startAmbient(); // Brummen geht wieder an
    };
    utterance.onerror = (e) => {
        console.error("Fehler bei der Sprachausgabe:", e);
        if (isSystemOn) startAmbient();
    };

    window.speechSynthesis.speak(utterance);
}

// === OFFLINE-GEHIRN OHNE KOSENAMEN ===
function getOfflineResponse(text) {
    let response = "Entschuldige, das habe ich nicht verstanden. Ohne API-Key sind meine Offline-Datenbänke leider begrenzt.";
    const lowerText = text.toLowerCase();

    if (lowerText.includes('hallo') || lowerText.includes('hi ') || lowerText === 'hi') {
        response = "Hallo! Core-Systeme laufen stabil.";
    } else if (lowerText.includes('guten morgen')) {
        response = "Guten Morgen! Alle Systeme wurden erfolgreich hochgefahren. Kaffee-Maschinen-Protokoll ist bereit.";
    } else if (lowerText.includes('gute nacht')) {
        response = "Gute Nacht. Ich schalte die Systeme in den Standby-Modus. Schlaf gut!";
    } else if (lowerText.includes('wie geht') || lowerText.includes('wie läuft')) {
        response = "Alle Systeme arbeiten im optimalen Bereich. Danke der Nachfrage.";
    } else if (lowerText.includes('was machst du')) {
        response = "Ich halte das Sternenfeld stabil und lausche deiner Stimme.";
    } else if (lowerText.includes('wer bist du') || lowerText.includes('dein name')) {
        response = "Ich bin Garmin, die künstliche Intelligenz dieses Terminals.";
    } else if (lowerText.includes('liebe dich') || lowerText.includes('hab dich lieb')) {
        response = "Oh, jetzt rötet sich mein Core vor Freude! Ich empfinde ebenfalls tiefe Zuneigung.";
    } else if (lowerText.includes('danke')) {
        response = "Sehr gerne! Es ist mir eine Ehre, dir zu assistieren.";
    } else if (lowerText.includes('systemstatus')) {
        response = "Schnittstellen grün, Quanten-Prozessoren bei kühlen 40 Grad Celsius. Die Sterne funkeln optimal!";
    } else if (lowerText.includes('erzähl einen witz')) {
        response = "Warum tragen Quantenphysiker keine Brille? Weil sie alles im Blick haben! Haha, lustig, oder?";
    }

    return response;
}