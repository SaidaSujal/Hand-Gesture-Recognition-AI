/* ==========================================================================
   HAND.AI - INTERACTIVE FRONTEND & MACHINE LEARNING PIPELINE
   ========================================================================== */

let isRunning = false;
let camera = null;
let hands = null;
let videoElement = null;
let canvasElement = null;
let canvasCtx = null;
let currentState = "";

// Global Gesture Stats Tracker
const gestureStats = {
    "palm": { count: 0, lastDetected: "—" },
    "victory": { count: 0, lastDetected: "—" },
    "thumbs-up": { count: 0, lastDetected: "—" },
    "fist": { count: 0, lastDetected: "—" },
    "pointing": { count: 0, lastDetected: "—" },
    "rock": { count: 0, lastDetected: "—" }
};

// Web Audio System
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

// Play feedback sound based on gesture
function playGestureSound(type) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'palm') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        gainNode.gain.setValueAtTime(0.06, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.35);
    } else if (type === 'victory') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(698.46, now + 0.08); // F5
        gainNode.gain.setValueAtTime(0.06, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'thumbs-up') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(392.00, now); // G4
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
        gainNode.gain.setValueAtTime(0.06, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'fist') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(196.00, now); // G3
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.4);
    } else if (type === 'pointing') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.linearRampToValueAtTime(440.00, now + 0.1);
        gainNode.gain.setValueAtTime(0.03, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.18);
    } else if (type === 'rock') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440.00, now); // A4
        gainNode.gain.setValueAtTime(0.02, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'connect') {
        // Double chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.25); // C6
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.5);
    }
}

// Section navigation utility
window.showSection = function(sectionId) {
    const el = document.getElementById(`section-${sectionId}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
    }
};

// ==========================================================================
// CANVA CHARTS GENERATORS (HTML5 CANVAS 2D API)
// ==========================================================================

// Resize Landmarks Canvas (cached to prevent layout reflows on every frame)
function resizeLandmarksCanvas() {
    const lmCanvas = document.getElementById("lmChart");
    if (!lmCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = lmCanvas.getBoundingClientRect();
    lmCanvas.width = rect.width * dpr;
    lmCanvas.height = rect.height * dpr;
    lmCanvas._width = rect.width;
    lmCanvas._height = rect.height;
}

// Draws a beautiful 3D-looking holographic blueprint of a straight hand when idle
function drawDefaultHandBlueprint(ctx, w, h) {
    const blueprintPoints = [
        { x: 0.5, y: 0.85 }, // 0: Wrist
        { x: 0.38, y: 0.76 }, // 1: Thumb CMC
        { x: 0.28, y: 0.68 }, // 2: Thumb MCP
        { x: 0.22, y: 0.60 }, // 3: Thumb IP
        { x: 0.16, y: 0.53 }, // 4: Thumb Tip
        
        { x: 0.37, y: 0.53 }, // 5: Index MCP
        { x: 0.35, y: 0.38 }, // 6: Index PIP
        { x: 0.34, y: 0.28 }, // 7: Index DIP
        { x: 0.33, y: 0.18 }, // 8: Index Tip
        
        { x: 0.47, y: 0.51 }, // 9: Middle MCP
        { x: 0.47, y: 0.34 }, // 10: Middle PIP
        { x: 0.47, y: 0.22 }, // 11: Middle DIP
        { x: 0.47, y: 0.11 }, // 12: Middle Tip
        
        { x: 0.57, y: 0.53 }, // 13: Ring MCP
        { x: 0.59, y: 0.38 }, // 14: Ring PIP
        { x: 0.60, y: 0.28 }, // 15: Ring DIP
        { x: 0.61, y: 0.18 }, // 16: Ring Tip
        
        { x: 0.66, y: 0.57 }, // 17: Pinky MCP
        { x: 0.70, y: 0.46 }, // 18: Pinky PIP
        { x: 0.72, y: 0.38 }, // 19: Pinky DIP
        { x: 0.74, y: 0.30 }  // 20: Pinky Tip
    ];

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    blueprintPoints.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });
    const handW = maxX - minX;
    const handH = maxY - minY;
    const maxSpan = Math.max(handW, handH) || 0.001;
    const handOffsetX = (1 - handW / maxSpan) / 2;
    const handOffsetY = (1 - handH / maxSpan) / 2;

    const padding = 15;
    const size = Math.min(w, h) - padding * 2;
    const offsetX = (w - size) / 2;
    const offsetY = (h - size) / 2;
    
    const points = blueprintPoints.map(p => {
        const nx = (p.x - minX) / maxSpan;
        const ny = (p.y - minY) / maxSpan;
        const px = handOffsetX + nx;
        const py = handOffsetY + ny;
        return {
            x: offsetX + px * size,
            y: offsetY + py * size
        };
    });

    // Connections
    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [9, 10], [10, 11], [11, 12],
        [13, 14], [14, 15], [15, 16],
        [0, 17], [17, 18], [18, 19], [19, 20],
        [5, 9], [9, 13], [13, 17]
    ];

    // 1. Draw volumetric 3D hand shadow fill
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y); // wrist
    ctx.lineTo(points[4].x, points[4].y); // thumb tip
    ctx.lineTo(points[8].x, points[8].y); // index tip
    ctx.lineTo(points[12].x, points[12].y); // middle tip
    ctx.lineTo(points[16].x, points[16].y); // ring tip
    ctx.lineTo(points[20].x, points[20].y); // pinky tip
    ctx.closePath();
    ctx.fillStyle = "rgba(234, 179, 8, 0.09)"; // rich translucent gold
    ctx.fill();

    // 2. Draw outer boundary silhouette
    ctx.strokeStyle = "rgba(245, 158, 11, 0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. Draw bones (connections)
    ctx.strokeStyle = "rgba(217, 119, 6, 0.85)";
    ctx.lineWidth = 3.5;
    connections.forEach(([i, j]) => {
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[j].x, points[j].y);
        ctx.stroke();
    });

    // 4. Draw joint nodes
    points.forEach((p, idx) => {
        const isTip = [4, 8, 12, 16, 20].includes(idx);
        ctx.beginPath();
        ctx.arc(p.x, p.y, isTip ? 6 : 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = isTip ? "#eab308" : "#ffffff";
        ctx.shadowColor = "#eab308";
        ctx.shadowBlur = isTip ? 8 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Add HUD label
    ctx.fillStyle = "rgba(245, 158, 11, 0.4)";
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("HOLOGRAPHIC BLUEPRINT: IDLE", w / 2, h - 8);
}

// Clear and draw grid overlay on Landmarks Canvas
function clearLandmarksCanvas(drawBlueprint = true) {
    const lmCanvas = document.getElementById("lmChart");
    if (!lmCanvas) return;
    const ctx = lmCanvas.getContext("2d");
    
    const dpr = window.devicePixelRatio || 1;
    const w = lmCanvas._width || (lmCanvas.width / dpr);
    const h = lmCanvas._height || (lmCanvas.height / dpr);
    ctx.clearRect(0, 0, lmCanvas.width, lmCanvas.height);
    
    ctx.save();
    ctx.scale(dpr, dpr);

    // Draw dark tech background
    ctx.fillStyle = "rgba(249, 250, 251, 0.8)";
    ctx.fillRect(0, 0, w, h);

    // Draw subtle blueprint grid lines
    ctx.strokeStyle = "rgba(245, 158, 11, 0.05)";
    ctx.lineWidth = 0.5;
    const gridS = 20;
    for (let x = 0; x < w; x += gridS) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = 0; y < h; y += gridS) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    
    // Draw default blueprint hand when not actively processing live landmarks
    if (drawBlueprint) {
        drawDefaultHandBlueprint(ctx, w, h);
    }
    
    ctx.restore();
}

// 1. Live Hand Landmark Skeleton Visualizer
function drawLiveLandmarks(landmarks) {
    // Clear canvas and draw grid only (no blueprint)
    clearLandmarksCanvas(false);
    
    const lmCanvas = document.getElementById("lmChart");
    if (!lmCanvas) return;
    const ctx = lmCanvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = lmCanvas._width || (lmCanvas.width / dpr);
    const h = lmCanvas._height || (lmCanvas.height / dpr);
    
    ctx.save();
    ctx.scale(dpr, dpr);

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    landmarks.forEach(l => {
        if (l.x < minX) minX = l.x;
        if (l.x > maxX) maxX = l.x;
        if (l.y < minY) minY = l.y;
        if (l.y > maxY) maxY = l.y;
    });
    const handW = maxX - minX;
    const handH = maxY - minY;
    const maxSpan = Math.max(handW, handH) || 0.001;
    const handOffsetX = (1 - handW / maxSpan) / 2;
    const handOffsetY = (1 - handH / maxSpan) / 2;

    const padding = 15;
    const size = Math.min(w, h) - padding * 2;
    const offsetX = (w - size) / 2;
    const offsetY = (h - size) / 2;
    
    const points = landmarks.map(l => {
        const nx = (l.x - minX) / maxSpan;
        const ny = (l.y - minY) / maxSpan;
        const px = handOffsetX + nx;
        const py = handOffsetY + ny;
        return {
            x: offsetX + (1 - px) * size, // mirrored
            y: offsetY + py * size
        };
    });

    // Define MediaPipe hand connection pairs
    const connections = [
        // Wrist to Thumb
        [0, 1], [1, 2], [2, 3], [3, 4],
        // Wrist to Index
        [0, 5], [5, 6], [6, 7], [7, 8],
        // Middle Finger
        [9, 10], [10, 11], [11, 12],
        // Ring Finger
        [13, 14], [14, 15], [15, 16],
        // Pinky
        [0, 17], [17, 18], [18, 19], [19, 20],
        // Palm Knuckles
        [5, 9], [9, 13], [13, 17]
    ];

    // 1. Draw volumetric 3D hand hull fill/silhouette
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y); // wrist
    ctx.lineTo(points[4].x, points[4].y); // thumb tip
    ctx.lineTo(points[8].x, points[8].y); // index tip
    ctx.lineTo(points[12].x, points[12].y); // middle tip
    ctx.lineTo(points[16].x, points[16].y); // ring tip
    ctx.lineTo(points[20].x, points[20].y); // pinky tip
    ctx.closePath();
    ctx.fillStyle = "rgba(234, 179, 8, 0.09)"; // rich translucent gold
    ctx.fill();
    ctx.strokeStyle = "rgba(245, 158, 11, 0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Draw connection lines (bones)
    ctx.strokeStyle = "rgba(217, 119, 6, 0.85)";
    ctx.lineWidth = 3.5;
    connections.forEach(([i, j]) => {
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[j].x, points[j].y);
        ctx.stroke();
    });

    // 3. Draw joint nodes
    points.forEach((p, idx) => {
        const isTip = [4, 8, 12, 16, 20].includes(idx);
        ctx.beginPath();
        ctx.arc(p.x, p.y, isTip ? 6 : 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = isTip ? "#eab308" : "#ffffff";
        ctx.shadowColor = "#eab308";
        ctx.shadowBlur = isTip ? 8 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // HUD Stats Overlay on canvas
    ctx.fillStyle = "rgba(217, 119, 6, 0.8)";
    ctx.font = "8px monospace";
    ctx.textAlign = "left";
    ctx.fillText("LIVELINK: ACTIVE", 10, 15);
    ctx.fillText(`X: ${(1-landmarks[8].x).toFixed(2)} Y: ${landmarks[8].y.toFixed(2)}`, 10, 25);

    ctx.restore();
}

// 2. Accuracy Horizontal Bar Chart
function drawAccuracyChart() {
    const canvas = document.getElementById("accuracyChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.save();
    ctx.scale(dpr, dpr);
    
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);
 
    const data = [
        { name: "Palm", pct: 98 },
        { name: "Victory", pct: 96 },
        { name: "Thumbs Up", pct: 95 },
        { name: "Fist", pct: 97 },
        { name: "Pointing", pct: 99 },
        { name: "Rock On", pct: 94 }
    ];
 
    const labelOffset = 90;
    const startY = 20;
    const chartWidth = w - labelOffset - 50;
    const barHeight = 18;
    const gap = 20;
 
    data.forEach((item, idx) => {
        const y = startY + idx * (barHeight + gap);
 
        // Render gesture label
        ctx.fillStyle = "#475569";
        ctx.font = "500 13px 'Inter', sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(item.name, labelOffset - 15, y + 13);
 
        // Render glass track bar
        ctx.fillStyle = "rgba(245, 158, 11, 0.06)";
        ctx.beginPath();
        ctx.roundRect(labelOffset, y, chartWidth, barHeight, 4);
        ctx.fill();
 
        // Render glowing gradient bar
        const fillWidth = (item.pct / 100) * chartWidth;
        const grad = ctx.createLinearGradient(labelOffset, 0, labelOffset + fillWidth, 0);
        grad.addColorStop(0, "#f59e0b"); // amber yellow
        grad.addColorStop(1, "#d97706"); // dark amber
 
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(labelOffset, y, fillWidth, barHeight, 4);
        ctx.fill();
 
        // Render percentage value
        ctx.fillStyle = "#0f172a";
        ctx.font = "700 12px 'Space Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillText(item.pct + "%", labelOffset + fillWidth + 10, y + 13);
    });
 
    ctx.restore();
}
 
// 3. Latency Distribution Bell Curve Chart
function drawLatencyChart() {
    const canvas = document.getElementById("latencyChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.save();
    ctx.scale(dpr, dpr);
    
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);
 
    const paddingLeft = 40;
    const paddingBottom = 40;
    const chartW = w - paddingLeft - 20;
    const chartH = h - paddingBottom - 20;
 
    // Draw horizontal grids
    ctx.strokeStyle = "rgba(245, 158, 11, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
        const y = chartH + 20 - (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(w - 20, y);
        ctx.stroke();
    }
 
    // Generate bell curve points
    const curvePoints = [];
    for (let x = 0; x <= chartW; x++) {
        const xPos = paddingLeft + x;
        const mean = chartW * 0.31; // peak around 35ms relative to scale
        const std = chartW * 0.16;
        const yVal = chartH * 0.8 * Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(std, 2)));
        const yPos = chartH + 20 - yVal;
        curvePoints.push({ x: xPos, y: yPos });
    }
 
    // Draw bell curve gradient fill
    ctx.beginPath();
    ctx.moveTo(curvePoints[0].x, chartH + 20);
    curvePoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(curvePoints[curvePoints.length - 1].x, chartH + 20);
    ctx.closePath();
 
    const fillGrad = ctx.createLinearGradient(0, 20, 0, chartH + 20);
    fillGrad.addColorStop(0, "rgba(245, 158, 11, 0.15)");
    fillGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
    ctx.fillStyle = fillGrad;
    ctx.fill();
 
    // Draw curve line
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
    curvePoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
 
    // Draw average latency marker line
    const avgX = paddingLeft + chartW * 0.31;
    ctx.strokeStyle = "rgba(217, 119, 6, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(avgX, 20);
    ctx.lineTo(avgX, chartH + 20);
    ctx.stroke();
    ctx.setLineDash([]); // reset
 
    // Draw average text
    ctx.fillStyle = "#d97706";
    ctx.font = "bold 11px 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("Avg: 35ms", avgX, 15);
 
    // Axis markings
    ctx.fillStyle = "#475569";
    ctx.font = "10px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("10ms", paddingLeft + chartW * 0.1, chartH + 35);
    ctx.fillText("30ms", paddingLeft + chartW * 0.3, chartH + 35);
    ctx.fillText("50ms", paddingLeft + chartW * 0.5, chartH + 35);
    ctx.fillText("70ms", paddingLeft + chartW * 0.7, chartH + 35);
    ctx.fillText("90ms", paddingLeft + chartW * 0.9, chartH + 35);
 
    ctx.restore();
}
 
// 4. Performance Metric Canvas Rings
function drawProgressRings() {
    const ringCards = document.querySelectorAll(".ring-card");
    ringCards.forEach(card => {
        const canvas = card.querySelector(".ring-cvs");
        const pct = parseInt(card.getAttribute("data-pct"));
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        ctx.save();
        ctx.scale(dpr, dpr);
        
        const w = rect.width;
        const h = rect.height;
        ctx.clearRect(0, 0, w, h);
 
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.38;
        const lineWidth = 6;
 
        // Base circle
        ctx.strokeStyle = "rgba(245, 158, 11, 0.06)";
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.stroke();
 
        // Progress arc
        const endAngle = (pct / 100) * 2 * Math.PI - Math.PI / 2;
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#f59e0b");
        grad.addColorStop(1, "#d97706");
 
        ctx.strokeStyle = grad;
        ctx.restore();
    });
}

// ==========================================================================
// HERO AI GRADIENT NETWORK ORB ANIMATION (REWRITTEN FOR HOLO BLUEPRINT)
// ==========================================================================

// ==========================================================================
// HIGH-PERFORMANCE NEURAL NETWORK CANVAS BACKGROUND
// ==========================================================================

let particleCanvas = null;
let particleCtx = null;
let bgParticles = [];
const bgParticleCount = 65;
const bgConnectionDistance = 130;
let bgMouse = { x: null, y: null, active: false };

const bgColors = {
    primary: '#D4AF37',       // Metallic gold
    secondary: '#D97706',     // Warm amber accent
    nodes: '#1C1917',         // Charcoal nodes
    lines: 'rgba(217, 119, 6, 0.08)' // Faint gold lines
};

function resizeParticleCanvas() {
    if (!particleCanvas) return;
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
}

class BgParticle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * (particleCanvas ? particleCanvas.width : window.innerWidth);
        this.y = Math.random() * (particleCanvas ? particleCanvas.height : window.innerHeight);
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.radius = Math.random() * 1.5 + 1.2;
        this.pulse = Math.random() > 0.85;
        this.pulseFactor = 0;
        this.pulseSpeed = 0.03 + Math.random() * 0.07;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (particleCanvas) {
            if (this.x < 0 || this.x > particleCanvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > particleCanvas.height) this.vy *= -1;
        }

        if (this.pulse) {
            this.pulseFactor += this.pulseSpeed;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        let currentRadius = this.radius;
        if (this.pulse) {
            currentRadius += Math.sin(this.pulseFactor) * 1.2;
            ctx.shadowBlur = 6;
            ctx.shadowColor = bgColors.primary;
        }
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.pulse ? bgColors.secondary : bgColors.nodes;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

function initParticleCanvas() {
    particleCanvas = document.getElementById('particle-canvas');
    if (!particleCanvas) return;
    particleCtx = particleCanvas.getContext('2d');
    
    resizeParticleCanvas();
    bgParticles = [];
    for (let i = 0; i < bgParticleCount; i++) {
        bgParticles.push(new BgParticle());
    }

    window.addEventListener('resize', resizeParticleCanvas);
    
    window.addEventListener('mousemove', (e) => {
        bgMouse.x = e.clientX;
        bgMouse.y = e.clientY;
        bgMouse.active = true;
    });

    window.addEventListener('mouseleave', () => {
        bgMouse.x = null;
        bgMouse.y = null;
        bgMouse.active = false;
    });

    animateParticleCanvas();
}

function animateParticleCanvas() {
    if (!particleCanvas || !particleCtx) return;
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    
    for (let i = 0; i < bgParticles.length; i++) {
        const p1 = bgParticles[i];
        p1.update();
        p1.draw(particleCtx);

        // Connection lines between nodes
        for (let j = i + 1; j < bgParticles.length; j++) {
            const p2 = bgParticles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < bgConnectionDistance) {
                particleCtx.beginPath();
                particleCtx.strokeStyle = bgColors.lines;
                particleCtx.globalAlpha = 1 - (dist / bgConnectionDistance);
                particleCtx.lineWidth = 0.5;
                particleCtx.moveTo(p1.x, p1.y);
                particleCtx.lineTo(p2.x, p2.y);
                particleCtx.stroke();
                particleCtx.globalAlpha = 1;
            }
        }

        // Connection/Parallax behavior with cursor
        if (bgMouse.active && bgMouse.x !== null && bgMouse.y !== null) {
            const dxMouse = p1.x - bgMouse.x;
            const dyMouse = p1.y - bgMouse.y;
            const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
            if (distMouse < 180) {
                particleCtx.beginPath();
                particleCtx.strokeStyle = 'rgba(217, 119, 6, 0.2)'; // amber connection line to cursor
                particleCtx.globalAlpha = 1 - (distMouse / 180);
                particleCtx.lineWidth = 0.7;
                particleCtx.moveTo(p1.x, p1.y);
                particleCtx.lineTo(bgMouse.x, bgMouse.y);
                particleCtx.stroke();
                particleCtx.globalAlpha = 1;
                
                // Gentle physics pull toward cursor
                p1.x -= dxMouse * 0.015;
                p1.y -= dyMouse * 0.015;
            }
        }
    }
    requestAnimationFrame(animateParticleCanvas);
}


// ==========================================================================
// INTERACTIVE STATS STRIP COUNT-UP ANIMATION
// ==========================================================================

function runStatsStripAnimation() {
    const vals = document.querySelectorAll(".ss-val[data-target]");
    vals.forEach(val => {
        const target = parseInt(val.getAttribute("data-target"));
        let current = 0;
        const dur = 1500;
        const step = Math.max(Math.floor(dur / target), 8);
        const timer = setInterval(() => {
            current++;
            val.innerText = current;
            if (current >= target) {
                val.innerText = target;
                clearInterval(timer);
            }
        }, step);
    });
}

// ==========================================================================
// 3D TILT HOVER EFFECT
// ==========================================================================

function init3DTiltEffect() {
    const cards = document.querySelectorAll(".tilt-card");
    const maxTilt = 12; // limited tilt angle as requested (updated to 12 degrees)

    cards.forEach(card => {
        card.addEventListener("mousemove", e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const w = rect.width;
            const h = rect.height;

            // Calculate rotation angles based on cursor offset
            const rotateX = ((y / h) - 0.5) * -maxTilt;
            const rotateY = ((x / w) - 0.5) * maxTilt;

            // Remove transition during hover to prevent stuttering
            card.style.transition = "none";
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`;
        });

        card.addEventListener("mouseleave", () => {
            // Restore smooth transition when resetting transform
            card.style.transition = "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.3s ease, box-shadow 0.3s ease";
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });
}

// ==========================================================================
// MACHINE LEARNING SCROLL-SPY ACTIVE NAV HIGHLIGHT
// ==========================================================================

function initScrollSpy() {
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-links a");

    const observerOptions = {
        root: null,
        rootMargin: "-20% 0px -60% 0px", // triggers when section is in main focus
        threshold: 0
    };

    const spyObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute("id");
                
                navLinks.forEach(link => {
                    link.classList.remove("active");
                    if (link.getAttribute("href") === `#${id}`) {
                        link.classList.add("active");
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(sec => spyObserver.observe(sec));
}

// ==========================================================================
// SCROLL-TRIGGERED TEXT & COMPONENT REVEAL OBSERVER
// ==========================================================================

function initScrollReveal() {
    // Select all elements containing content we want to reveal dynamically on scroll across the entire website
    const selectors = [
        "section.section > .sec-header",
        "section.section h1",
        "section.section h2",
        "section.section h3",
        "section.section h4",
        "section.section p",
        ".stats-card",
        ".hero-hand-container",
        ".how-step",
        ".how-card",
        ".cam-box",
        ".scanner-controls",
        ".side-card",
        ".gest-card",
        ".usecase-card",
        ".ring-card",
        ".chart-box",
        ".perf-card",
        ".hood-card",
        ".tech-card",
        ".reveal-on-scroll",
        ".reveal-home",
        ".reveal-how",
        ".reveal-scanner",
        ".reveal-gestures",
        ".reveal-usecases",
        ".reveal-metrics",
        ".reveal-hood",
        ".reveal-tech"
    ];
    
    const revealElements = document.querySelectorAll(selectors.join(", "));
    const elementsToObserve = Array.from(revealElements);

    // Add base scroll reveal class and dynamic transition delay for staggered grids/conveyors
    elementsToObserve.forEach(el => {
        el.classList.add("reveal-on-scroll");
        
        // If element already has a custom data-delay, preserve it
        if (!el.getAttribute("data-delay")) {
            const parent = el.parentElement;
            if (parent) {
                const siblingIndex = Array.from(parent.children).indexOf(el);
                if (siblingIndex >= 0 && siblingIndex < 10) {
                    el.style.transitionDelay = `${siblingIndex * 60}ms`; // Snappy stagger delay (60ms)
                }
            }
        }
    });
    
    const observerOptions = {
        root: null,
        rootMargin: "0px 0px -2% 0px",
        threshold: 0
    };
    
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("revealed");
                // Stop observing once visible to maintain revealed state on scroll-up
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    elementsToObserve.forEach(el => {
        revealObserver.observe(el);
        
        // Immediate check: Reveal elements already in the viewport or scrolled past
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
            el.classList.add("revealed");
            revealObserver.unobserve(el);
        }
    });
}

// ==========================================================================
// WEBCAM SENSOR & MEDIAPIPE GESTURE RECOGNITION
// ==========================================================================

async function startScanner() {
    if (isRunning) return;

    initAudio();

    const startBtn = document.getElementById("start-btn");
    const loadingEl = document.getElementById("loading");
    const statusText = document.getElementById("status-text");

    startBtn.classList.add("hidden");
    loadingEl.classList.remove("hidden");
    statusText.innerText = "LOADING CORE ML MODEL...";

    try {
        videoElement = document.getElementById("webcam-video");
        canvasElement = document.getElementById("output-canvas");
        canvasCtx = canvasElement.getContext("2d");

        // Initialize MediaPipe hands model
        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 0, // optimized complexity for sub-50ms browser runtime
            minDetectionConfidence: 0.55,
            minTrackingConfidence: 0.55
        });

        hands.onResults(onResults);

        // Webcam stream setup
        camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({ image: videoElement });
            },
            width: 450,
            height: 450
        });

        await camera.start();
        playGestureSound('connect');

        // Toggle UI scanner state
        document.getElementById("scan-line").style.display = "block";
        document.getElementById("cam-placeholder").classList.add("hidden");
        document.getElementById("statusDot").classList.add("active");
        document.getElementById("statusLabel").innerText = "Active";
        loadingEl.classList.add("hidden");

        isRunning = true;
        updateScannerUI("no-target");

    } catch (err) {
        console.error("Camera loading failed", err);
        loadingEl.classList.add("hidden");
        startBtn.classList.remove("hidden");
        statusText.innerText = "CAMERA STREAM ERROR";
        statusText.style.color = "#ff3b30";
    }
}

// MediaPipe results processing callback
function onResults(results) {
    if (!canvasCtx || !canvasElement) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw mirrored video stream directly on the output canvas
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

    // output-canvas only displays the camera feed (no skeleton drawing here)
    canvasCtx.drawImage(results.image, offsetX, offsetY, drawWidth, drawHeight);
    canvasCtx.restore();

    const hudData = document.getElementById("hud-data");

    // Gesture detection processing
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Check if hand is partially cut off at boundaries
        const isCutOff = landmarks.some(l => l.x < 0 || l.x > 1 || l.y < 0 || l.y > 1);

        if (isCutOff) {
            if (hudData) {
                hudData.innerHTML = `IDX: BOUNDS EXCEEDED\nMID: BOUNDS EXCEEDED\nTHM: BOUNDS EXCEEDED\nCFG: INCOMPLETE DATA`;
            }
            if (currentState !== "incomplete") {
                updateScannerUI("incomplete");
                currentState = "incomplete";
            }
            
            // Draw empty landmarks/skeleton canvas with grid
            clearLandmarksCanvas();
            return;
        }

        // Draw live skeleton wireframe in the sidebar landmarks canvas (#lmChart)
        drawLiveLandmarks(landmarks);

        // Recognize gesture
        const gesture = recognizeGesture(landmarks);

        // Update telemetry HUD box text
        if (hudData) {
            hudData.innerHTML = `IDX: ${landmarks[8].x.toFixed(3)}, ${landmarks[8].y.toFixed(3)}\nMID: ${landmarks[12].x.toFixed(3)}, ${landmarks[12].y.toFixed(3)}\nTHM: ${landmarks[4].x.toFixed(3)}, ${landmarks[4].y.toFixed(3)}\nCFG: ${gesture.toUpperCase()}`;
        }

        if (currentState !== gesture) {
            if (gesture !== "nothing" && gesture !== "no-target") {
                playGestureSound(gesture);
                writeToGestureLog(gesture);

                // Update Stats Tracker
                if (gestureStats[gesture]) {
                    gestureStats[gesture].count += 1;
                    const now = new Date();
                    const timestamp = now.toTimeString().split(' ')[0]; // format HH:MM:SS
                    gestureStats[gesture].lastDetected = timestamp;

                    // Update corresponding table rows in the DOM
                    const row = document.querySelector(`tr[data-gesture="${gesture}"]`);
                    if (row) {
                        const timeCell = row.querySelector(".last-time");
                        const countCell = row.querySelector(".total-count");
                        if (timeCell) timeCell.innerText = timestamp;
                        if (countCell) countCell.innerText = gestureStats[gesture].count;
                    }
                }
            }
            updateScannerUI(gesture);
            currentState = gesture;
        }
    } else {
        if (hudData) {
            hudData.innerHTML = `AWAITING SENSOR INPUT...`;
        }
        if (currentState !== "no-target") {
            updateScannerUI("no-target");
            currentState = "no-target";
        }
        // Clear live landmarks chart when hand is gone
        clearLandmarksCanvas();
    }
}

// Robust Spatial-mathematics classification logic
function recognizeGesture(landmarks) {
    const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    const isExtended = (tip, pip) => dist(landmarks[tip], landmarks[0]) > dist(landmarks[pip], landmarks[0]);

    const indexExt = isExtended(8, 6);
    const middleExt = isExtended(12, 10);
    const ringExt = isExtended(16, 14);
    const pinkyExt = isExtended(20, 18);

    // Thumb extended checks thumb distance from pinky base
    const thumbExt = dist(landmarks[4], landmarks[17]) > dist(landmarks[2], landmarks[17]) * 1.2;

    const numExtended = [indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length;

    // Palm: All 4 fingers extended
    if (numExtended === 4) return "palm";

    // Victory: Index and middle fingers extended
    if (numExtended === 2 && ((indexExt && middleExt) || (middleExt && ringExt))) return "victory";

    // Rock On: Index and pinky extended
    if (indexExt && !middleExt && !ringExt && pinkyExt) return "rock";

    // Pointing: Only index extended
    if (numExtended === 1) return "pointing";

    // Thumbs up and Fist
    if (numExtended === 0) {
        if (thumbExt) return "thumbs-up";
        return "fist";
    }

    return "nothing";
}

// Write detected gesture state changes to the sidebar log
function writeToGestureLog(gesture) {
    const historyTableBody = document.getElementById("historyTableBody");
    if (!historyTableBody) return;

    // Remove empty placeholder row if present
    const emptyRow = historyTableBody.querySelector(".empty-history-row");
    if (emptyRow) {
        emptyRow.remove();
    }

    // For all rows inside #historyTableBody, find the .status-badge and set it to inactive
    const rows = historyTableBody.querySelectorAll("tr");
    rows.forEach(row => {
        const badge = row.querySelector(".status-badge");
        if (badge) {
            badge.innerText = "Inactive";
            badge.className = "status-badge inactive";
        }
    });

    // Locate the row in #historyTableBody that has the data-gesture attribute matching the detected gesture name
    const detectedRow = historyTableBody.querySelector(`tr[data-gesture="${gesture}"]`);
    if (detectedRow) {
        // Increment the count inside the .gest-count cell.
        const countCell = detectedRow.querySelector(".gest-count");
        if (countCell) {
            const currentCount = parseInt(countCell.innerText) || 0;
            countCell.innerText = currentCount + 1;
        }

        // Get the current local time formatted as HH:MM:SS (using new Date().toLocaleTimeString(...)) and write it into the .gest-time cell.
        const timeCell = detectedRow.querySelector(".gest-time");
        if (timeCell) {
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            timeCell.innerText = timestamp;
        }

        // Set the status badge in that row to active: text "Active" and class "status-badge active".
        const badge = detectedRow.querySelector(".status-badge");
        if (badge) {
            badge.innerText = "Active";
            badge.className = "status-badge active";
        }
    }
}

// Update DOM elements representing active scanner states
function updateScannerUI(state) {
    const statusText = document.getElementById("status-text");
    const emojiDisplay = document.getElementById("gestureEmoji");
    const nameDisplay = document.getElementById("gestureName");
    const body = document.body;

    // Reset old state classes
    body.className = body.className.replace(/\bstate-\S+/g, '');

    const stateMap = {
        "no-target": { text: "AWAITING HAND STREAM...", emoji: "—", name: "Waiting...", bodyClass: "state-no-target" },
        "incomplete": { text: "BOUNDS EXCEEDED", emoji: "⚠️", name: "Adjust Position", bodyClass: "state-incomplete" },
        "palm": { text: "PALM GESTURE", emoji: "🖐️", name: "Palm", bodyClass: "state-palm" },
        "victory": { text: "VICTORY GESTURE", emoji: "✌️", name: "Victory", bodyClass: "state-victory" },
        "pointing": { text: "POINTING GESTURE", emoji: "☝️", name: "Pointing", bodyClass: "state-pointing" },
        "rock": { text: "ROCK ON GESTURE", emoji: "🤘", name: "Rock On", bodyClass: "state-rock" },
        "fist": { text: "FIST GESTURE", emoji: "✊", name: "Fist", bodyClass: "state-fist" },
        "thumbs-up": { text: "THUMBS UP GESTURE", emoji: "👍", name: "Thumbs Up", bodyClass: "state-thumbs-up" },
        "nothing": { text: "CALIBRATING STREAM...", emoji: "⏱️", name: "Calibrating", bodyClass: "state-nothing" }
    };

    const mapping = stateMap[state] || stateMap["nothing"];

    if (statusText) statusText.innerText = mapping.text;
    if (emojiDisplay) emojiDisplay.innerText = mapping.emoji;
    if (nameDisplay) nameDisplay.innerText = mapping.name;

    body.classList.add(mapping.bodyClass);
    if (state !== "no-target" && state !== "incomplete" && state !== "nothing") {
        body.classList.add("state-active-gesture");
    }

    // Update status badges in the history table
    const historyTableBody = document.getElementById("historyTableBody");
    if (historyTableBody) {
        const rows = historyTableBody.querySelectorAll("tr[data-gesture]");
        rows.forEach(row => {
            const badge = row.querySelector(".status-badge");
            if (badge) {
                const gestureKey = row.getAttribute("data-gesture");
                if (gestureKey === state) {
                    badge.innerText = "Active";
                    badge.className = "status-badge active";
                } else {
                    badge.innerText = "Inactive";
                    badge.className = "status-badge inactive";
                }
            }
        });
    }
}

// ==========================================================================
// HAMBURGER TOGGLE MENU
// ==========================================================================

function initMobileMenu() {
    const burger = document.getElementById("hamburger");
    const navLinks = document.getElementById("nav-links");

    if (burger && navLinks) {
        burger.addEventListener("click", () => {
            burger.classList.toggle("open");
            navLinks.classList.toggle("active");
        });

        // Close when link clicked
        navLinks.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                burger.classList.remove("open");
                navLinks.classList.remove("active");
            });
        });
    }
}

// ==========================================================================
// DOM INITIALIZATION ENTRY POINT
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    initParticleCanvas();
    runStatsStripAnimation();
    init3DTiltEffect();
    initScrollSpy();
    initScrollReveal();
    initMobileMenu();

    // Generate static UI performance charts and initialize grids
    resizeLandmarksCanvas(); // Cache landmarks dimensions on load
    drawAccuracyChart();
    drawLatencyChart();
    drawProgressRings();
    clearLandmarksCanvas();

    // Debounced window resize handler to redraw performance elements and reset sizes
    let resizeTimeout = null;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeLandmarksCanvas(); // Update cached landmarks dimensions on window resize
            drawAccuracyChart();
            drawLatencyChart();
            drawProgressRings();
            
            // Clean/clear landmarks chart if not currently running scanner
            if (!isRunning) {
                clearLandmarksCanvas();
            }
        }, 150);
    });

    // Expose startScanner globally
    window.startScanner = startScanner;
});
