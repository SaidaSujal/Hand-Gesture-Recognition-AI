let isRunning = false;
let camera;
let hands;
let videoElement;
let canvasElement;
let canvasCtx;
let currentState = "";

// --- Advanced UI Features ---

// 1. Custom Cursor Logic
const cursor = document.getElementById('cursor');

document.addEventListener('mousemove', (e) => {
    if (cursor) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }
});

function attachCursorHover() {
    document.querySelectorAll('button, a').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover-effect'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover-effect'));
    });
}
document.addEventListener('DOMContentLoaded', attachCursorHover);

// 2. Audio Synthesis System
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'connect') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } else if (type === 'detect') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.02, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    }
}

// --- Main Application Logic ---

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.add('hidden-section');
        sec.classList.remove('active-section');
    });
    
    const target = document.getElementById(`section-${sectionId}`);
    target.classList.remove('hidden-section');
    target.classList.add('active-section');

    document.querySelectorAll('.nav-links a').forEach(link => link.classList.remove('active'));
    document.getElementById(`nav-${sectionId}`).classList.add('active');
}

async function init() {
    if (isRunning) return;
    
    initAudio();
    
    document.getElementById("start-btn").classList.add("hidden");
    document.getElementById("loading").classList.remove("hidden");

    try {
        videoElement = document.getElementById('webcam-video');
        canvasElement = document.getElementById('output-canvas');
        canvasCtx = canvasElement.getContext('2d');

        hands = new Hands({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }});
        
        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 0, // Optimized for maximum performance
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        hands.onResults(onResults);

        camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({image: videoElement});
            },
            width: 450,
            height: 450
        });
        
        await camera.start();
        playSound('connect');

        document.getElementById("scanner-line").style.display = "block";
        document.getElementById("placeholder-icon").style.display = "none";
        document.getElementById("loading").classList.add("hidden");
        
        isRunning = true;
        updateUI("no-target");
        
    } catch (e) {
        console.error("Error loading camera", e);
        document.getElementById("loading").classList.add("hidden");
        document.getElementById("start-btn").classList.remove("hidden");
        document.getElementById("status-text").innerText = "CAMERA ERROR";
        document.getElementById("status-text").style.color = "#ff3333";
    }
}

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    
    const w = canvasElement.width;
    const h = canvasElement.height;
    
    const videoRatio = results.image.width / results.image.height;
    const canvasRatio = w / h;
    let drawWidth = w;
    let drawHeight = h;
    let offsetX = 0;
    let offsetY = 0;

    if (videoRatio > canvasRatio) {
        drawWidth = h * videoRatio;
        offsetX = (w - drawWidth) / 2;
    } else {
        drawHeight = w / videoRatio;
        offsetY = (h - drawHeight) / 2;
    }
    
    canvasCtx.drawImage(results.image, offsetX, offsetY, drawWidth, drawHeight);
    canvasCtx.restore();
    
    const hudData = document.getElementById("hud-data");

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // 1. Check for Incomplete Data (Hand partially out of frame)
        // If any landmark is out of the 0.0 - 1.0 bounding box, it's partially out
        const isOut = landmarks.some(l => l.x < 0 || l.x > 1 || l.y < 0 || l.y > 1);
        
        if (isOut) {
            hudData.innerHTML = `INCOMPLETE DATA...<br>ADJUST POSITION`;
            if (currentState !== "incomplete") {
                updateUI("incomplete");
                currentState = "incomplete";
            }
            return; // Stop processing gestures if data is incomplete
        }
        
        const gesture = recognizeGesture(landmarks);
        
        // Update HUD
        hudData.innerHTML = `
            IDX: ${landmarks[8].x.toFixed(3)}, ${landmarks[8].y.toFixed(3)}<br>
            MID: ${landmarks[12].x.toFixed(3)}, ${landmarks[12].y.toFixed(3)}<br>
            THM: ${landmarks[4].x.toFixed(3)}, ${landmarks[4].y.toFixed(3)}<br>
            CFG: <span style="color:#fff">${gesture.toUpperCase()}</span>
        `;
        
        if (currentState !== gesture) {
            if (gesture !== "nothing" && gesture !== "no-target") {
                playSound('detect');
            }
            updateUI(gesture);
            currentState = gesture;
        }
    } else {
        hudData.innerHTML = `AWAITING SENSOR INPUT...`;
        if (currentState !== "no-target") {
            updateUI("no-target");
            currentState = "no-target";
        }
    }
}

function recognizeGesture(landmarks) {
    // Robust extension check: Tip is further from the wrist (0) than the PIP joint.
    // This works regardless of hand rotation or tilt.
    const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    const isExtended = (tip, pip) => dist(landmarks[tip], landmarks[0]) > dist(landmarks[pip], landmarks[0]);
    
    const indexExt = isExtended(8, 6);
    const middleExt = isExtended(12, 10);
    const ringExt = isExtended(16, 14);
    const pinkyExt = isExtended(20, 18);
    // Thumb: A thumb is extended if its tip (4) is significantly further from the pinky base (17) than its own base (2) is.
    // This is mathematically robust against all angles and rotations!
    const thumbExt = dist(landmarks[4], landmarks[17]) > dist(landmarks[2], landmarks[17]) * 1.2;
    
    const numExtended = [indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length;
    
    // PALM: All 4 fingers extended
    if (numExtended === 4) return "palm";
    
    // VICTORY: Exactly 2 adjacent fingers extended (Handles MediaPipe finger confusion)
    if (numExtended === 2 && ((indexExt && middleExt) || (middleExt && ringExt))) return "victory";
    
    // ROCK ON: Index and Pinky up
    if (indexExt && !middleExt && !ringExt && pinkyExt) return "rock";

    // POINTING: Exactly one finger extended (Highly robust to any orientation or finger mix-up)
    if (numExtended === 1) return "pointing";

    // THUMBS UP & FIST
    if (numExtended === 0) {
        if (thumbExt) return "thumbs-up";
        return "fist";
    }
    
    return "nothing"; 
}

function updateUI(className) {
    const statusText = document.getElementById("status-text");
    const body = document.body;

    body.className = '';

    const stateMap = {
        "no-target": "NO TARGET DETECTED",
        "incomplete": "INCOMPLETE DATA",
        "victory": "VICTORY",
        "palm": "PALM",
        "pointing": "POINTING",
        "rock": "ROCK ON",
        "fist": "FIST",
        "thumbs-up": "THUMBS UP",
        "thumbs-down": "THUMBS DOWN",
        "nothing": "SCANNING..."
    };

    statusText.innerText = stateMap[className] || "SCANNING...";

    if (className === "no-target") {
        body.classList.add("state-no-target");
    } else if (className === "incomplete") {
        body.classList.add("state-incomplete");
    } else if (className !== "nothing") {
        // Generic active state for the new gestures
        body.classList.add(`state-${className}`);
        body.classList.add("state-active-gesture"); // Generic class for glowing
    } else {
        body.classList.add("state-nothing");
    }
}
