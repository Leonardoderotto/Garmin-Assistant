/**
 * Genisiz Core Engine
 * Ein hochentwickelter Sci-Fi Sprachassistent mit Konversationsgedächtnis
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

// Audio & Web Speech API Variablen
let recognition;
let synth = window.speechSynthesis;
let isListening = false;
let audioContext;
let analyser;
let dataArray;
let source;
let animationFrameId;

// SYSTEM-GEDÄCHTNIS (Speichert den Gesprächsverlauf)
let conversationHistory = [];

// 1. STERNENHIMMEL GENERIEREN
function createStarField() {
    starField.innerHTML = '';
    const starCount = 70;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        
        // Zufällige Positionierung & Größe
        const size = Math.random() * 2 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}vw`;
        star.style.top = `${Math.random() * 100}vh`;
        
        // Versetzte Animationen für natürlicheres Funkeln
        star.style.animationDelay = `${Math.random() * 4}s`;
        star.style.animationDuration = `${3 + Math.random() * 4}s`;
        
        starField.appendChild(star);
    }
}

// 2. POWER SWITCH (BOOT-SEQUENZ)
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
    
    // API Key prüfen
    const apiKey = localStorage.getItem('genisiz_openai_key');
    
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
    // Falls noch gesprochen wird oder zugehört wird, stoppen
    stopListening();
    if (synth && synth.speaking) {
        synth.cancel();
    }
    
    // Gedächtnis beim System-Shutdown komplett löschen
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

// 3. EINSTELLUNGEN & MODAL (API KEY)
settingsBtn.addEventListener('click', () => {
    // Geladenen Key anzeigen falls vorhanden
    const savedKey = localStorage.getItem('genisiz_openai_key');
    if (savedKey) apiKeyInput.value = savedKey;
    modalOverlay.classList.add('active');
});

closeModalBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
});

// Modal schließen beim Klick außerhalb
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
    }
});

saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('genisiz_openai_key', key);
        modalOverlay.classList.remove('active');
        if (body.classList.contains('system-active')) {
            statusText.textContent = "System bereit.";
            writeTerminalText(leftOutput, "Verbindung zum kognitiven Kern erfolgreich hergestellt.");
        }
    } else {
        localStorage.removeItem('genisiz_openai_key');
        alert("API-Key entfernt.");
    }
});

// 4. VOLLBILD STEUERUNG
fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Fehler beim Aktivieren des Vollbildmodus: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

// 5. SCHREIBEFFEKT FÜR TERMINAL-AUSGABE
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

// 6. ANIMIERTER AUDIO-VISUALIZER (CANVAS)
const canvasCtx = visualizerCanvas.getContext('2d');

function setupVisualizer(stream) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 64; // Kleine Fourier-Transformation für übersichtliche Sci-Fi-Balken
    
    source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    drawVisualizer();
}

function drawVisualizer() {
    if (!isListening) return;
    
    animationFrameId = requestAnimationFrame(drawVisualizer);
    analyser.getByteFrequencyData(dataArray);
    
    const width = visualizerCanvas.width = visualizerCanvas.offsetWidth;
    const height = visualizerCanvas.height = visualizerCanvas.offsetHeight;
    
    canvasCtx.clearRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 65; // Passt sich dem Orb an
    const barCount = dataArray.length;
    
    // Zeichne kreisförmige Sci-Fi Frequenzbalken
    for (let i = 0; i < barCount; i++) {
        const value = dataArray[i];
        const percent = value / 255;
        const barHeight = percent * 25; // Maximale Ausschlagshöhe
        
        const angle = (i / barCount) * Math.PI * 2;
        
        // Startpunkt auf dem inneren Kreis
        const startX = centerX + Math.cos(angle) * radius;
        const startY = centerY + Math.sin(angle) * radius;
        
        // Endpunkt nach außen hin
        const endX = centerX + Math.cos(angle) * (radius + barHeight);
        const endY = centerY + Math.sin(angle) * (radius + barHeight);
        
        // Farbverlauf von Neon-Rot zu Orange
        canvasCtx.strokeStyle = `rgb(${180 + percent * 75}, 8, 68)`;
        canvasCtx.lineWidth = 3;
        canvasCtx.lineCap = 'round';
        
        canvasCtx.beginPath();
        canvasCtx.moveTo(startX, startY);
        canvasCtx.lineTo(endX, endY);
        canvasCtx.stroke();
    }
}

// 7. INTELLIGENTE SPRACHERKENNUNG & OPENAI ANTWORT
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    
    recognition.onstart = () => {
        isListening = true;
        body.classList.add('system-listening');
        statusText.textContent = "Zuhören...";
        leftOutput.textContent = "";
        rightOutput.textContent = "";
        
        // Systemfarben im CSS dynamisch auf Rot (Listening) setzen
        body.style.setProperty('--current-star-color', 'var(--neon-red)');
        body.style.setProperty('--current-star-glow', 'var(--neon-red-glow)');
        
        // Mikrofon streamen für Visualizer
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(setupVisualizer)
            .catch(err => console.warn("Visualizer ohne echtes Mikrofon-Feedback: ", err));
    };
    
    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        statusText.textContent = "Eingabe wird verarbeitet...";
        await writeTerminalText(leftOutput, `DU: "${transcript}"`);
        
        // Sende die Anfrage an ChatGPT
        processQuery(transcript);
    };
    
    recognition.onerror = (event) => {
        console.error("Spracherkennungsfehler: ", event.error);
        statusText.textContent = "Fehler bei der Erkennung.";
        stopListening();
    };
    
    recognition.onend = () => {
        stopListening();
    };
} else {
    console.warn("Web Speech API (SpeechRecognition) wird von diesem Browser nicht unterstützt.");
}

function stopListening() {
    isListening = false;
    body.classList.remove('system-listening');
    if (powerSwitch.checked) {
        statusText.textContent = "Bereit.";
        // Systemfarben wieder zurück auf Cyan setzen
        body.style.setProperty('--current-star-color', 'var(--neon-cyan)');
        body.style.setProperty('--current-star-glow', 'var(--neon-glow)');
    }
    
    if (recognition) recognition.stop();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    // Canvas leeren
    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;
    canvasCtx.clearRect(0, 0, width, height);
}

// Klick auf den Core steuert Sprachaufnahme
orb.addEventListener('click', () => {
    if (!body.classList.contains('system-active')) return;
    
    if (synth && synth.speaking) {
        synth.cancel(); // Abbrechen, falls Genisiz gerade noch spricht
    }
    
    if (isListening) {
        stopListening();
    } else {
        if (recognition) {
            recognition.start();
        } else {
            alert("Spracherkennung wird auf Ihrem Browser leider nicht unterstützt (Empfohlen: Chrome/Edge).");
        }
    }
});

// 8. CHATGPT API ANFRAGE & ANTWORT-VERARBEITUNG WITH CONTEXT MEMORY
async function processQuery(query) {
    const apiKey = localStorage.getItem('genisiz_openai_key');
    if (!apiKey) {
        await writeTerminalText(rightOutput, "SYSTEM: Fehler. Kein OpenAI API-Schlüssel konfiguriert. Bitte öffne die Einstellungen oben links.");
        speak("Bitte füge einen API-Schlüssel in den Einstellungen hinzu.");
        return;
    }
    
    statusText.textContent = "Kognitiver Kern arbeitet...";
    
    // 1. Deine aktuelle Frage im Verlauf speichern
    conversationHistory.push({ role: 'user', content: query });
    
    // 2. Gedächtnis-Limitierung (Gegen zu hohe Token-Kosten)
    // Hält die letzten 10 Nachrichten (5 Fragen + 5 Antworten) im Kopf
    if (conversationHistory.length > 10) {
        conversationHistory.shift();
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
                // 3. System-Prompt + den gesamten bisherigen Verlauf mitsenden
                messages: [
                    { 
                        role: 'system', 
                        content: 'Du bist Genisiz, ein hochentwickelter KI-Assistent mit einer präzisen, leicht kühlen, aber extrem loyalen und hilfsbereiten Sci-Fi-Persönlichkeit (ähnlich wie J.A.R.V.I.S.). Antworte stets prägnant, intelligent und auf Deutsch. Vermeide zu lange Absätze.' 
                    },
                    ...conversationHistory
                ],
                max_tokens: 150
            })
        });
        
        if (!response.ok) {
            throw new Error(`API-Fehler: ${response.status}`);
        }
        
        const data = await response.json();
        const reply = data.choices[0].message.content;
        
        // 4. Genisiz' Antwort ebenfalls ins Gedächtnis aufnehmen
        conversationHistory.push({ role: 'assistant', content: reply });
        
        statusText.textContent = "Antwort empfangen.";
        await writeTerminalText(rightOutput, `GENISIZ: "${reply}"`);
        
        // Genisiz spricht die Antwort aus
        speak(reply);
        
    } catch (error) {
        console.error(error);
        statusText.textContent = "Verbindungsfehler.";
        writeTerminalText(rightOutput, "SYSTEM: Verbindung zum kognitiven Server fehlgeschlagen.");
        speak("Verbindung fehlgeschlagen.");
        
        // Bei Fehlern die unvollständige Anfrage entfernen, um das Gedächtnis sauber zu halten
        conversationHistory.pop();
    }
}

// 9. TEXT-TO-SPEECH (STIMMAUSGABE)
function speak(text) {
    if (!synth) return;
    
    // Vorherige Sprachausgaben abbrechen
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.pitch = 0.85; // Leicht tiefere, mechanischere Sci-Fi-Stimme
    utterance.rate = 1.05;  // Minimal schnellerer, präziserer Sprachfluss
    
    // Finde eine passende deutsche Stimme (falls verfügbar)
    const voices = synth.getVoices();
    const deVoice = voices.find(voice => voice.lang.startsWith('de') && voice.name.includes('Google')) || 
                    voices.find(voice => voice.lang.startsWith('de'));
    if (deVoice) {
        utterance.voice = deVoice;
    }
    
    utterance.onstart = () => {
        statusText.textContent = "Übertragung...";
    };
    
    utterance.onend = () => {
        if (powerSwitch.checked) {
            statusText.textContent = "Bereit.";
        }
    };
    
    synth.speak(utterance);
}

// Stimmen im Hintergrund laden für besseren Support in diversen Browsern
if (synth && synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = () => {};
}