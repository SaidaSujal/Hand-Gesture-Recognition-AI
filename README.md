# 🖐️ Hand Gesture Recognition AI

<div align="center">

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-0097A7?style=for-the-badge&logo=google&logoColor=white)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)

**Real-time hand gesture detection — running entirely in your browser. No server. No installation. Zero data leaves your device.**

[🚀 Live Demo](https://handai.netlify.app) · [📁 View Source](https://github.com/SaidaSujal/Hand-Gesture-Recognition-AI) · [🐛 Report Bug](https://github.com/SaidaSujal/Hand-Gesture-Recognition-AI/issues)

</div>

---

## 📌 Overview

**Hand Gesture Recognition AI** is a browser-based application that uses Google's MediaPipe and TensorFlow.js to detect and classify hand gestures in real-time through your webcam.

The entire AI pipeline — from capturing the webcam feed to classifying gestures — runs **100% on-device** via WebAssembly and WebGL. No video is sent to any server. No backend required.

---

## ✨ Features

- **Real-Time Detection** — Processes your webcam feed at 30+ FPS with sub-50ms latency
- **On-Device AI** — All ML inference runs locally in the browser via WebAssembly; no cloud dependency
- **Zero Setup** — Open the link and go. No installs, no sign-up, no downloads
- **21-Point Hand Tracking** — MediaPipe extracts 21 3D landmarks per hand for precise gesture analysis
- **Privacy-First** — Frames are processed in memory and immediately discarded. Nothing is stored or transmitted
- **Responsive UI** — Works on desktop and mobile browsers with live gesture history tracking

---

## 🤚 Supported Gestures

| Gesture | Symbol | Description |
|---|---|---|
| Open Palm | ✋ | All five fingers fully extended |
| Fist | ✊ | All fingers curled into a closed fist |
| Pointing Up | ☝️ | Index finger extended, others curled |
| Thumbs Up | 👍 | Thumb pointing upward |
| Peace / Victory | ✌️ | Index and middle fingers extended |
| Rock On | 🤘 | Index and pinky fingers extended |

---

## ⚙️ How It Works

The app runs a 4-stage AI pipeline entirely inside the browser:

```
📷 Capture  →  🧠 Detect  →  📐 Analyze  →  ⚡ Classify
```

1. **Capture** — WebRTC (`MediaDevices API`) streams live webcam at 30 FPS
2. **Detect** — MediaPipe's neural network locates the hand and extracts 21 3D landmark coordinates
3. **Analyze** — Geometric math computes finger angles, joint distances, and bend ratios from the landmarks
4. **Classify** — A heuristic classifier maps the computed ratios to one of the 6 supported gestures and updates the UI

All steps run in-browser via WebAssembly and WebGL — no server round-trip.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Hand Tracking & Landmarks | [MediaPipe Hands](https://mediapipe.dev/) |
| ML Inference Engine | [TensorFlow.js](https://www.tensorflow.org/js) |
| Camera Access | WebRTC (MediaDevices API) |
| Performance | WebAssembly, WebGL |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Deployment | [Netlify](https://netlify.com) |
| Version Control | Git / GitHub |

---

## 🚀 Run Locally

No build step required. It's plain HTML/CSS/JS.

```bash
# Clone the repository
git clone https://github.com/SaidaSujal/Hand-Gesture-Recognition-AI.git

# Navigate into the project folder
cd Hand-Gesture-Recognition-AI

# Serve locally (required for webcam access)
npx serve .
```

Then open `http://localhost:3000` in your browser.

> ⚠️ **Important:** Opening `index.html` directly as a `file://` URL will **block webcam access** in most browsers. You must use a local server (`localhost`) or HTTPS for the camera API to work.

---

## 🌐 Browser Compatibility

| Browser | Support |
|---|---|
| Chrome / Edge | ✅ Full support (recommended) |
| Firefox | ✅ Supported |
| Safari (macOS) | ⚠️ May require enabling WebRTC permissions |
| Safari (iOS) | ⚠️ Limited — camera access varies by iOS version |
| Mobile Chrome/Edge | ✅ Generally supported |

---

## ⚠️ Known Limitations

- Accuracy degrades under poor or uneven lighting conditions
- Gestures may misclassify if the hand is partially out of frame or at extreme angles
- Currently detects one hand at a time
- Some gestures (e.g. Rock On vs Pointing) can be confused if fingers are bent ambiguously

---

## 📁 Project Structure

```
Hand-Gesture-Recognition-AI/
├── index.html       # App shell and layout
├── style.css        # Styling and responsive design
├── script.js        # Webcam access, MediaPipe integration, gesture logic
├── LICENSE          # MIT License
└── README.md        # This file
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free to use, modify, and distribute.

---

<div align="center">

Made with ❤️ by [Saida Sujal](https://github.com/SaidaSujal)

⭐ Star this repo if you found it useful!

</div>
