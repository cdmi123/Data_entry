const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const captureBtn = document.getElementById("capture");
const fileInput = document.getElementById("fileInput");
const uploadForm = document.getElementById("uploadForm");

(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
  } catch (err) {
    alert("Camera access denied");
  }
})();

captureBtn.addEventListener("click", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  canvas.toBlob((blob) => {
    const file = new File([blob], "scan.jpg", { type: "image/jpeg" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    uploadForm.submit();
  }, "image/jpeg");
});
