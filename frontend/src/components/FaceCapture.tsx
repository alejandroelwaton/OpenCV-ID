import { useRef, useState, useEffect } from "react";

export default function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [userId, setUserId] = useState<number>(1);
  const [status, setStatus] = useState("");

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });
  }, []);

  const takePhoto = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async blob => {
      if (!blob) return;

      const formData = new FormData();
      formData.append("file", blob, "capture.jpg");
      formData.append("user_id", String(userId));

      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setStatus(JSON.stringify(data));
    }, "image/jpeg");
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl mb-4 font-bold">Registro Facial</h1>
      <video ref={videoRef} autoPlay className="w-full max-w-md rounded-lg shadow-md mb-4 border-4 border-blue-500" />
      <input
        type="number"
        value={userId}
        onChange={e => setUserId(parseInt(e.target.value))}
        className="mb-4 p-2 border rounded"
        placeholder="User ID"
      />
      <button
        onClick={takePhoto}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
      >
        Capturar Foto
      </button>
      <p className="mt-4">{status}</p>
    </div>
  );
}
