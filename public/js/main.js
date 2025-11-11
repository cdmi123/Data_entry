'use strict';

const videoEl = document.getElementById('video');
const canvasEl = document.getElementById('canvas');
const statusEl = document.getElementById('status');
const cameraSelect = document.getElementById('cameraSelect');
const maxResBtn = document.getElementById('maxResBtn');
const resInfo = document.getElementById('resInfo');
const restartBtn = document.getElementById('restartBtn');
const rotateBtn = document.getElementById('rotateBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const zoomSlider = document.getElementById('zoomSlider');

let currentStream = null;
let currentDeviceId = null;
let rotateQuarterTurns = 0;
let preferMaxRes = true;

async function populateCameras() {
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		const cams = devices.filter(d => d.kind === 'videoinput');
		cameraSelect.innerHTML = '';
		cams.forEach((d, i) => {
			const opt = document.createElement('option');
			opt.value = d.deviceId;
			opt.textContent = d.label || `Camera ${i + 1}`;
			cameraSelect.appendChild(opt);
		});
		if (!currentDeviceId && cams.length) {
			currentDeviceId = cams.find(d => /back|rear|environment/i.test(d.label))?.deviceId || cams[0].deviceId;
			cameraSelect.value = currentDeviceId;
		}
	} catch (e) {}
}

async function getBestStream() {
	const base = {
		deviceId: currentDeviceId ? { exact: currentDeviceId } : undefined,
		facingMode: currentDeviceId ? undefined : { ideal: 'environment' },
		advanced: [{ focusMode: 'continuous' }]
	};
	const candidates = preferMaxRes ? [
		{ width: { exact: 3840 }, height: { exact: 2160 } },
		{ width: { exact: 2560 }, height: { exact: 1440 } },
		{ width: { exact: 1920 }, height: { exact: 1080 } },
		{ width: { ideal: 1280 }, height: { ideal: 720 } }
	] : [
		{ width: { ideal: 1920 }, height: { ideal: 1080 } },
		{ width: { ideal: 1280 }, height: { ideal: 720 } }
	];
	let lastErr;
	for (const res of candidates) {
		try {
			return await navigator.mediaDevices.getUserMedia({ video: { ...base, ...res }, audio: false });
		} catch (e) { lastErr = e; }
	}
	throw lastErr || new Error('Unable to open camera');
}

async function startCamera() {
	stopCamera();
	try {
		const stream = await getBestStream();
		currentStream = stream;
		videoEl.srcObject = stream;
		await videoEl.play();
		showResolution();
		setupZoomIfAvailable();
		statusEl && (statusEl.textContent = '');
	} catch (e) {
		statusEl && (statusEl.textContent = 'Camera not available.');
	}
}

function stopCamera() {
	if (currentStream) {
		currentStream.getTracks().forEach(t => t.stop());
		currentStream = null;
		videoEl.srcObject = null;
	}
}

function showResolution() {
	try {
		const track = currentStream && currentStream.getVideoTracks()[0];
		const s = track && track.getSettings ? track.getSettings() : null;
		resInfo && (resInfo.textContent = s && s.width && s.height ? `Resolution: ${s.width} x ${s.height}` : 'Resolution: -');
	} catch (_) {
		resInfo && (resInfo.textContent = 'Resolution: -');
	}
}

function setupZoomIfAvailable() {
	const track = currentStream && currentStream.getVideoTracks()[0];
	const caps = track && track.getCapabilities ? track.getCapabilities() : {};
	if (!zoomSlider) return;
	if (caps.zoom) {
		zoomSlider.min = caps.zoom.min || 1;
		zoomSlider.max = caps.zoom.max || 5;
		zoomSlider.step = caps.zoom.step || 0.1;
		zoomSlider.value = (track.getSettings().zoom || caps.zoom.min || 1);
		zoomSlider.parentElement.classList.remove('hidden');
		zoomSlider.oninput = async () => {
			try { await track.applyConstraints({ advanced: [{ zoom: Number(zoomSlider.value) }] }); } catch (_) {}
		};
	} else {
		zoomSlider.parentElement.classList.add('hidden');
	}
}

function drawFrameToCanvas(targetCanvas) {
	const vw = videoEl.videoWidth || 640;
	const vh = videoEl.videoHeight || 480;
	const maxW = 2048;
	const scale = Math.min(maxW / vw, 1.0);
	const w = Math.round(vw * scale);
	const h = Math.round(vh * scale);
	const ctx = targetCanvas.getContext('2d');
	if (rotateQuarterTurns % 2 === 0) {
		targetCanvas.width = w; targetCanvas.height = h;
	} else {
		targetCanvas.width = h; targetCanvas.height = w;
	}
	ctx.save();
	ctx.translate(targetCanvas.width / 2, targetCanvas.height / 2);
	ctx.rotate((Math.PI / 2) * (rotateQuarterTurns % 4));
	ctx.drawImage(videoEl, -w / 2, -h / 2, w, h);
	ctx.restore();
}

restartBtn && restartBtn.addEventListener('click', () => startCamera());
rotateBtn && rotateBtn.addEventListener('click', () => {
	rotateQuarterTurns = (rotateQuarterTurns + 1) % 4;
	statusEl && (statusEl.textContent = `Rotation: ${rotateQuarterTurns * 90}°`);
});
cameraSelect && cameraSelect.addEventListener('change', () => {
	currentDeviceId = cameraSelect.value || null;
	startCamera();
});
maxResBtn && maxResBtn.addEventListener('click', () => { preferMaxRes = true; startCamera(); });
fullscreenBtn && fullscreenBtn.addEventListener('click', async () => {
	const wrap = videoEl.parentElement;
	if (!document.fullscreenElement) {
		wrap.classList.add('fullscreen');
		try { await wrap.requestFullscreen?.(); } catch (_e) {}
	} else {
		wrap.classList.remove('fullscreen');
		try { await document.exitFullscreen?.(); } catch (_e) {}
	}
});

window.addEventListener('load', () => {
	populateCameras().then(() => startCamera());
});


