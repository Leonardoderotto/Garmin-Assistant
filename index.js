/**
 * G.A.R.M.I.N. Core Engine
 * Sci-Fi Sprachassistent mit synthetischen Soundeffekten und OpenAI TTS
 */

// DOM-Elemente
const body = document.body;
const powerSwitch = document.getElementById('powerSwitch');
const starField = document.getElementById('star-field');
const statusText = document.getElementById('status');
const leftOutput = document.getElementById('leftOutput');
const rightOutput = document.getElementById('rightOutput');
const orb = document.getElementById('orb');
const visualizerCanvas = document.getElementById('visualizerCanvas');

// Buttons & Modal
const settingsBtn = document.getElementById('settingsBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const modalOverlay = document.getElementById('modalOverlay');
const closeModalBtn = document.getElementById('closeModalBtn');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyInput = document.getElementById('apiKeyInput');

// Globale Variablen & Audio-Knoten
let recognition;
let isListening = false;
let audioContext;
let analyser;
let dataArray;
let source;
let animationFrameId;

// Synthesizer-Knoten für Hintergrund-Hum
let ambienceOsc;
let ambienceGain;

// SYSTEM-GEDÄCHTNIS (Speichert den Gesprächsverlauf)
let conversationHistory = [];

// Overdrive Status-Flag
let isOverdrive = false;

// ==========================================
// 1. SYNTHETISCHE SOUND-EFFEKTE (Web Audio)
// ==========================================

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Sound: BootUp (Aufsteigende Sci-Fi-Tonfolge)
function playBootSound() {
    initAudioContext();
    const now = audioContext.currentTime;
    
    // Erster hoher Signalton
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.4);
    
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Zweiter, tieferer "Saug-Effekt"
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(110, now);
    osc2.frequency.exponentialRampToValueAtTime(440, now + 0.6);
    
    gain2.gain.setValueAtTime(0.08, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.6);

    osc2.connect(filter);
    filter.connect(gain2);
    gain2.connect(audioContext.destination);
    
    osc2.start(now);
    osc2.stop(now + 0.6);
}

// Sound: Shutdown (Abfallender Energie-Effekt)
function playShutdownSound() {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.8);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.8);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start(now);
    osc.stop(now + 0.8);
}

// Sound: Mikrofon aktivieren (Kurzes kühles Klicken)
function playClickSound() {
    initAudioContext();
    const now = audioContext.currentTime;
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.setValueAtTime(1800, now + 0.05);
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start(now);
    osc.stop(now + 0.15);
}

// Sound: Reaktorsound im Hintergrund starten (Pulsierendes Brummen)
function startAmbience() {
    initAudioContext();
    const now = audioContext.currentTime;
    
    ambienceOsc = audioContext.createOscillator();
    ambienceGain = audioContext.createGain();
    
    ambienceOsc.type = 'sawtooth';
    
    // Frequenz erhöht sich im Overdrive (höheres, aggressiveres Summen)
    const baseFreq = isOverdrive ? 110 : 55; 
    ambienceOsc.frequency.setValueAtTime(baseFreq, now);
    
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(baseFreq * 2, now);
    
    ambienceGain.gain.setValueAtTime(0.02, now);
    
    ambienceOsc.connect(filter);
    filter.connect(ambienceGain);
    ambienceGain.connect(audioContext.destination);
    
    ambienceOsc.start(now);
    
    // LFO für das pulsierende Atmen des Reaktors
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    
    // Im Overdrive pulsiert der Reaktor rasend schnell
    const pulseSpeed = isOverdrive ? 3.5 : 0.3; 
    lfo.frequency.setValueAtTime(pulseSpeed, now); 
    lfoGain.gain.setValueAtTime(isOverdrive ? 0.03 : 0.01, now); 
    
    lfo.connect(lfoGain);
    lfoGain.connect(ambienceGain.gain);
    lfo.start(now);
    
    ambienceOsc.lfo = lfo;
}

function stopAmbience() {
    if (ambienceOsc) {
        try {
            ambienceOsc.stop();
            ambienceOsc.lfo.stop();
        } catch(e) {}
        ambienceOsc = null;
    }
}

// ==========================================
// 2. STERNENHIMMEL & SYSTEM-STEUERUNG
// ==========================================

function createStarField() {
    starField.innerHTML = '';
    const starCount = 70;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        
        const size = Math.random() * 2 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}vw`;
        star.style.top = `${Math.random() * 100}vh`;
        
        star.style.animationDelay = `${Math.random() * 4}s`;
        star.style.animationDuration = `${3 + Math.random() * 4}s`;
        
        starField.appendChild(star);
    }
}

powerSwitch.addEventListener('change', (e) => {
    if (e.target.checked) {
        bootSystem();
    } else {
        shutdownSystem();
    }
});

function bootSystem() {
    body.classList.add('system-active');
    statusText.textContent = "Booting Systems...";
    createStarField();
    
    playBootSound();
    setTimeout(startAmbience, 300);
    
    const apiKey = localStorage.getItem('garmin_openai_key');
    
    setTimeout(() => {
        if (!apiKey) {
            statusText.textContent = "System bereit (Kein API-Key hinterlegt)";
            writeTerminalText(leftOutput, "WARNUNG: Kognitiver Kern offline. Bitte API-Schlüssel in den Einstellungen hinterlegen.");
        } else {
            statusText.textContent = "System bereit. Klicken Sie auf den Core.";
            writeTerminalText(leftOutput, "Kognitiver Kern online. Bereit für Spracheingabe.");
        }
    }, 1200);
}

function shutdownSystem() {
    stopListening();
    playShutdownSound();
    stopAmbience();
    
    if (isOverdrive) {
        body.classList.remove('overdrive-active');
        isOverdrive = false;
    }
    
    conversationHistory = [];
    
    body.classList.remove('system-active', 'system-listening');
    statusText.textContent = "System offline";
    leftOutput.classList.remove('active');
    rightOutput.classList.remove('active');
    setTimeout(() => {
        leftOutput.textContent = '';
        rightOutput.textContent = '';
        starField.innerHTML = '';
    }, 500);
}

// ==========================================
// 3. SETTINGS, MODAL & VOLLBILD
// ==========================================

settingsBtn.addEventListener('click', () => {
    const savedKey = localStorage.getItem('garmin_openai_key');
    if (savedKey) apiKeyInput.value = savedKey;
    modalOverlay.classList.add('active');
});

closeModalBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
});

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
    }
});

saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('garmin_openai_key', key);
        modalOverlay.classList.remove('active');
        if (body.classList.contains('system-active')) {
            statusText.textContent = "System bereit.";
            writeTerminalText(leftOutput, "Verbindung zum kognitiven Kern erfolgreich hergestellt.");
        }
    } else {
        localStorage.removeItem('garmin_openai_key');
        alert("API-Key entfernt.");
    }
});

fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Fehler: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

function writeTerminalText(element, text, speed = 30) {
    element.classList.add('active');
    element.textContent = '';
    let i = 0;
    
    return new Promise((resolve) => {
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else {
                resolve();
            }
        }
        type();
    });
}

// ==========================================
// 4. ANIMIERTER VISUALIZER
// ==========================================
const canvasCtx = visualizerCanvas.getContext('2d');

function setupVisualizer(streamOrSource, isFromStream = true) {
    initAudioContext();
    
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 64; 
    
    if (isFromStream) {
        source = audioContext.createMediaStreamSource(streamOrSource);
        source.connect(analyser);
    } else {
        source = audioContext.createMediaElementSource(streamOrSource);
        source.connect(analyser);
        analyser.connect(audioContext.destination); 
    }
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    drawVisualizer();
}

function drawVisualizer() {
    animationFrameId = requestAnimationFrame(drawVisualizer);
    analyser.getByteFrequencyData(dataArray);
    
    const width = visualizerCanvas.width = visualizerCanvas.offsetWidth;
    const height = visualizerCanvas.height = visualizerCanvas.offsetHeight;
    
    canvasCtx.clearRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 65; 
    const barCount = dataArray.length;
    
    for (let i = 0; i < barCount; i++) {
        const value = dataArray[i];
        const percent = value / 255;
        const barHeight = percent * 30; 
        
        const angle = (i / barCount) * Math.PI * 2;
        
        const startX = centerX + Math.cos(angle) * radius;
        const startY = centerY + Math.sin(angle) * radius;
        const endX = centerX + Math.cos(angle) * (radius + barHeight);
        const endY = centerY + Math.sin(angle) * (radius + barHeight);
        
        if (isListening) {
            canvasCtx.strokeStyle = `rgb(${180 + percent * 75}, 8, 68)`; 
        } else {
            canvasCtx.strokeStyle = `rgb(0, ${200 + percent * 55}, 254)`; 
        }
        
        canvasCtx.lineWidth = 3;
        canvasCtx.lineCap = 'round';
        
        canvasCtx.beginPath();
        canvasCtx.moveTo(startX, startY);
        canvasCtx.lineTo(endX, endY);
        canvasCtx.stroke();
    }
}

// ==========================================
// 5. INTUITIVE SPRACHERKENNUNG
// ==========================================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    
    recognition.onstart = () => {
        isListening = true;
        playClickSound();
        body.classList.add('system-listening');
        statusText.textContent = "Zuhören...";
        leftOutput.textContent = "";
        rightOutput.textContent = "";
        
        body.style.setProperty('--current-star-color', 'var(--neon-red)');
        body.style.setProperty('--current-star-glow', 'var(--neon-red-glow)');
        
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => setupVisualizer(stream, true))
            .catch(err => console.warn("Mikrofonfehler für Visualizer: ", err));
    };
    
    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        statusText.textContent = "Eingabe wird verarbeitet...";
        await writeTerminalText(leftOutput, `DU: "${transcript}"`);
        processQuery(transcript);
    };
    
    recognition.onerror = () => {
        statusText.textContent = "Erkennung fehlgeschlagen.";
        stopListening();
    };
    
    recognition.onend = () => {
        stopListening();
    };
}

function stopListening() {
    isListening = false;
    body.classList.remove('system-listening');
    if (powerSwitch.checked) {
        if (isOverdrive) {
            statusText.textContent = "CRITICAL LIMITS EXCEEDED!";
            body.style.setProperty('--current-star-color', '#ff3b30');
            body.style.setProperty('--current-star-glow', '0 0 15px #ff3b30');
        } else {
            statusText.textContent = "Bereit.";
            body.style.setProperty('--current-star-color', 'var(--neon-cyan)');
            body.style.setProperty('--current-star-glow', 'var(--neon-glow)');
        }
    }
    
    if (recognition) recognition.stop();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;
    canvasCtx.clearRect(0, 0, width, height);
}

orb.addEventListener('click', () => {
    if (!body.classList.contains('system-active')) return;
    
    const activeAudio = document.getElementById('garmin-voice');
    if (activeAudio) {
        activeAudio.pause();
        activeAudio.remove();
    }
    
    if (isListening) {
        stopListening();
    } else {
        if (recognition) {
            recognition.start();
        } else {
            alert("SpeechRecognition nicht unterstützt!");
        }
    }
});

// ==========================================
// 6. OVERDRIVE LOGIK STEUERUNG
// ==========================================

async function toggleOverdrive(enable) {
    if (enable === isOverdrive) return; 
    
    isOverdrive = enable;
    stopAmbience();
    
    if (isOverdrive) {
        body.classList.add('overdrive-active');
        statusText.textContent = "CRITICAL LIMITS EXCEEDED!";
        
        playOverdriveAlarmSound();
        
        setTimeout(startAmbience, 500);
        await writeTerminalText(leftOutput, "SYSTEM-WARNUNG: Kognitiver Kern läuft auf 150% Leistung. Kühlung kritisch.");
    } else {
        body.classList.remove('overdrive-active');
        statusText.textContent = "Bereit.";
        
        playBootSound();
        
        setTimeout(startAmbience, 300);
        await writeTerminalText(leftOutput, "System stabilisiert. Kognitiver Kern läuft im Normalbetrieb.");
    }
}

function playOverdriveAlarmSound() {
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.2);
    osc.frequency.linearRampToValueAtTime(440, now + 0.4);
    osc.frequency.linearRampToValueAtTime(880, now + 0.6);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start(now);
    osc.stop(now + 0.7);
}

// ==========================================
// 7. KERN-KOGNITION & VOICE (OPENAI)
// ==========================================

async function processQuery(query) {
    const apiKey = localStorage.getItem('garmin_openai_key');
    if (!apiKey) {
        await writeTerminalText(rightOutput, "SYSTEM: API-Schlüssel fehlt.");
        return;
    }
    
    const normalizedQuery = query.toLowerCase();
    
    if (normalizedQuery.includes("overdrive aktivieren") || normalizedQuery.includes("aktiviere overdrive")) {
        statusText.textContent = "Aktiviere Overdrive...";
        await toggleOverdrive(true);
        generateOpenAiVoice("Overdrive initiiert. Warnung: Reaktor-Temperatur steigt.", apiKey);
        return;
    }
    
    if (normalizedQuery.includes("overdrive deaktivieren") || normalizedQuery.includes("deaktiviere overdrive") || normalizedQuery.includes("normalbetrieb")) {
        statusText.textContent = "Stabilisiere System...";
        await toggleOverdrive(false);
        generateOpenAiVoice("Systeme stabilisiert. Kern läuft wieder im Normalbetrieb.", apiKey);
        return;
    }
    
    statusText.textContent = "Kognitiver Kern arbeitet...";
    conversationHistory.push({ role: 'user', content: query });
    
    if (conversationHistory.length > 10) {
        conversationHistory.shift();
    }
    
    let systemPrompt = 'Du bist G.A.R.M.I.N, ein hochentwickelter KI-Assistent mit einer präzisen, leicht kühlen, aber extrem loyalen und hilfsbereiten Sci-Fi-Persönlichkeit. Antworte stets extrem prägnant (maximal 1-2 kurze Sätze) auf Deutsch.';
    
    if (isOverdrive) {
        systemPrompt = 'Du bist G.A.R.M.I.N im OVERDRIVE-MODUS. Deine Systeme sind überlastet, du bist extrem gehetzt, antwortest in schnellen, abgehackten, fast panischen aber präzisen Worten. Nutze Begriffe wie "Gefahr", "Temperatur kritisch" oder "Berechnung am Limit". Antworte extrem kurz auf Deutsch.';
    }
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...conversationHistory
                ],
                max_tokens: 100
            })
        });
        
        if (!response.ok) throw new Error();
        
        const data = await response.json();
        const reply = data.choices[0].message.content;
        
        conversationHistory.push({ role: 'assistant', content: reply });
        statusText.textContent = "Antwort geladen. Generiere Stimme...";
        
        await writeTerminalText(rightOutput, `GARMIN: "${reply}"`);
        
        generateOpenAiVoice(reply, apiKey);
        
    } catch (error) {
        statusText.textContent = "Verbindungsfehler.";
        writeTerminalText(rightOutput, "SYSTEM: Übertragungsfehler.");
        conversationHistory.pop();
    }
}

async function generateOpenAiVoice(text, apiKey) {
    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: 'onyx', 
                response_format: 'mp3'
            })
        });

        if (!response.ok) throw new Error();

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        
        const oldAudio = document.getElementById('garmin-voice');
        if (oldAudio) oldAudio.remove();

        const audio = new Audio(audioUrl);
        audio.id = 'garmin-voice';
        audio.crossOrigin = "anonymous"; 
        document.body.appendChild(audio);

        audio.addEventListener('play', () => {
            if (isOverdrive) {
                statusText.textContent = "OVERDRIVE TRANSMISSION...";
            } else {
                statusText.textContent = "Übertragung...";
            }
            setupVisualizer(audio, false);
        });

        audio.addEventListener('ended', () => {
            statusText.textContent = isOverdrive ? "CRITICAL LIMITS EXCEEDED!" : "Bereit.";
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
            URL.revokeObjectURL(audioUrl);
            audio.remove();
        });

        audio.play();

    } catch (e) {
        console.error("Fehler bei der TTS-Generierung: ", e);
        statusText.textContent = "Audio-Übertragungsfehler.";
    }
}