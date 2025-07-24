import { useRef, useState } from "react";

export default function Recognizer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [status, setStatus] = useState("");

  const startCamera = async () => {
    setStatus("Solicitando acceso a la cámara...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setStreaming(true);
          setStatus("Cámara lista");
        };
      }
    } catch (err) {
      setStatus("No se pudo acceder a la cámara. Revisa permisos.");
      console.error(err);
    }
  };

  const captureImage = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current) return resolve(null);

      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg");
    });
  };

  const handleRecognize = async () => {
    setStatus("Capturando imagen...");
    const blob = await captureImage();
    if (!blob) {
      setStatus("Error al capturar la imagen.");
      return;
    }

    setStatus("Enviando imagen para reconocimiento...");
    const formData = new FormData();
    formData.append("file", blob, "capture.jpg");

    try {
      const res = await fetch("/api/recognize", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResults(data.results);
      setStatus("Reconocimiento completado.");
    } catch (error) {
      setStatus("Error al reconocer.");
      console.error(error);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto flex flex-col items-center gap-4">
      {!streaming && (
        <button
          onClick={startCamera}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Iniciar Cámara
        </button>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full rounded shadow ${!streaming ? "hidden" : ""}`}
      />

      {streaming && (
        <button
          onClick={handleRecognize}
          className="px-4 py-2 bg-purple-600 text-white rounded"
        >
          Reconocer Rostro
        </button>
      )}

      {status && <p>{status}</p>}

      {results && (
        <pre className="bg-gray-100 p-4 rounded w-full overflow-x-auto">
          {JSON.stringify(results, null, 2)}
        </pre>
      )}
    </div>
  );
}
