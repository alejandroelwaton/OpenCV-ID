import { useRef, useState, useEffect } from "react";

export default function LiveRecognizer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionInterval = useRef<number | null>(null);

  const [streaming, setStreaming] = useState(false);
  const streamingRef = useRef(false);
  const [status, setStatus] = useState("Listo para iniciar");

  useEffect(() => {
    streamingRef.current = streaming;
  }, [streaming]);

  const startCamera = async () => {
    console.log("startCamera() called");
    setStatus("Pidiendo acceso a cámara...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("Cámara OK");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
        console.log("Video playing");
        setStatus("Cámara activa");
        startRecognitionLoop();
      }
    } catch (err) {
      console.error("Cannot access resource (camera):", err);
      setStatus("Error de acceso a cámara");
    }
  };

  const captureFrame = async (): Promise<Blob | null> => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg");
    });
  };

  const startRecognitionLoop = () => {
    console.log("👉 startRecognitionLoop() llamado");
    if (recognitionInterval.current) {
      console.log("No more loop running");
      return;
    }

    recognitionInterval.current = window.setInterval(async () => {
      console.log("Loop running");

      if (!streamingRef.current) {
        console.log("No streaming (ref), skip");
        return;
      }

      setStatus("Capturando frame...");
      const blob = await captureFrame();
      if (!blob) {
        console.log("Cannot capture frame");
        return;
      }

      setStatus("Enviando...");
      console.log("Sending frame...");

      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");

      try {
        const res = await fetch("/api/recognize", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          setStatus(`Error API: ${res.status}`);
          console.log(`API Error: ${res.status}`);
          return;
        }

        const data = await res.json();
        console.log("API Response:", data);

        drawResults(data.results || []);
        setStatus(`Detectados: ${data.results?.length || 0}`);
      } catch (err) {
        console.error("❌ Error al enviar:", err);
        setStatus("Error API");
      }
    }, 2000);
  };

  const drawResults = (
    results: Array<{ rect: [number, number, number, number] }>
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const video = videoRef.current;

    if (!canvas || !ctx || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "lime";
    ctx.lineWidth = 3;

    results.forEach(({ rect }) => {
      const [x, y, w, h] = rect;
      ctx.strokeRect(x, y, w, h);
    });
  };

  useEffect(() => {
    console.log("useEffect mounted");
    return () => {
      console.log("Cleanup...");
      if (recognitionInterval.current) {
        clearInterval(recognitionInterval.current);
      }
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center p-4">
      <button
        onClick={startCamera}
        disabled={streaming}
        className="mb-4 px-6 py-3 bg-blue-600 text-white rounded"
      >
        {streaming ? "Cámara activa" : "Iniciar cámara"}
      </button>

      <div style={{ position: "relative", maxWidth: "480px", width: "100%" }}>
        <video
          ref={videoRef}
          style={{ width: "100%" }}
          autoPlay
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      </div>

      <p className="mt-4 text-gray-700">{status}</p>
    </div>
  );
}
