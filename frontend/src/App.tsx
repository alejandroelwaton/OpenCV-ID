import { useRef, useState, useEffect } from "react";


function LiveRecognizer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionInterval = useRef<number | null>(null);

  const [streaming, setStreaming] = useState(false);
  const streamingRef = useRef(false); // <-- Mantiene valor actual
  const [status, setStatus] = useState("Listo para iniciar");

  // Mantiene streamingRef sincronizado
  useEffect(() => {
    streamingRef.current = streaming;
  }, [streaming]);

  const startCamera = async () => {
    console.log("👉 startCamera() llamado");
    setStatus("Pidiendo acceso a cámara...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("✅ Cámara OK");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
        console.log("🎥 Video playing");
        setStatus("Cámara activa");
        startRecognitionLoop();
      }
    } catch (err) {
      console.error("❌ No se pudo acceder:", err);
      setStatus("Error acceso cámara");
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
      console.log("⚠️ Ya hay un loop corriendo");
      return;
    }

    recognitionInterval.current = window.setInterval(async () => {
      console.log("🔄 Loop corriendo");

      if (!streamingRef.current) {
        console.log("⚠️ No streaming (ref), skip");
        return;
      }

      setStatus("Capturando frame...");
      const blob = await captureFrame();
      if (!blob) {
        console.log("❌ No se pudo capturar");
        return;
      }

      setStatus("Enviando...");
      console.log("🚀 Enviando frame...");

      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");

      try {
        const res = await fetch("/api/recognize", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          setStatus(`Error API: ${res.status}`);
          console.log(`❌ Respuesta no OK: ${res.status}`);
          return;
        }

        const data = await res.json();
        console.log("✅ Respuesta API:", data);

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
    console.log("🔌 useEffect montado");
    return () => {
      console.log("🧹 Cleanup...");
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

function Recognizer() {
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

function TrainerButton() {
  const [status, setStatus] = useState<string>("");

  const handleTrain = async () => {
    setStatus("Entrenando modelo...");
    try {
      const res = await fetch("/api/train", { method: "POST" });
      const data = await res.json();
      setStatus(data.message || "Entrenamiento completado.");
    } catch (error) {
      setStatus("Error al entrenar.");
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <button
        onClick={handleTrain}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Entrenar Modelo
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");
  const [capturing, setCapturing] = useState(false);

  const startCamera = async () => {
    console.log("[INFO] Intentando iniciar cámara...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("[INFO] Permiso concedido, stream creado:", stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setStreaming(true);
          console.log("[INFO] Cámara reproduciéndose ahora");
        };
      } else {
        console.log("[ERROR] El elemento <video> no existe");
      }
    } catch (err) {
      console.error("[ERROR] No se pudo acceder a la cámara:", err);
      alert("No se pudo acceder a la cámara. Revisa permisos.");
    }
  };

  const captureImage = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current) {
        console.log("[ERROR] No hay videoRef");
        return resolve(null);
      }

      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          console.log("[INFO] Imagen capturada:", blob.size, "bytes");
        } else {
          console.log("[ERROR] No se pudo crear Blob");
        }
        resolve(blob);
      }, "image/jpeg");
    });
  };

  const captureMultiple = async () => {
    if (!userId.trim()) {
      alert("Ingresa un ID de usuario");
      return;
    }

    setCapturing(true);
    setStatus("Capturando 20 imágenes...");

    for (let i = 1; i <= 20; i++) {
      console.log(`[INFO] Capturando imagen ${i}...`);
      const blob = await captureImage();
      if (!blob) {
        console.log(`[ERROR] Fallo al capturar imagen ${i}`);
        setStatus("Error al capturar imagen");
        break;
      }

      const formData = new FormData();
      formData.append("file", blob, `capture_${i}.jpg`);
      formData.append("user_id", userId);

      console.log(`[INFO] Subiendo imagen ${i}...`);
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const text = await res.text();
        console.log(`[INFO] Respuesta backend imagen ${i}:`, text);

        if (!res.ok) {
          console.log(`[ERROR] Fallo subida imagen ${i}:`, res.status);
          alert(`Error subida imagen ${i}`);
          break;
        }

        setStatus(`Capturada imagen ${i} / 20`);
        console.log(`[INFO] Imagen ${i} subida correctamente`);
      } catch (err) {
        console.log(`[ERROR] Excepción subida imagen ${i}:`, err);
        alert(`Error subida imagen ${i}`);
        break;
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    setCapturing(false);
    setStatus("✅ Captura completada. Ahora puedes entrenar.");
    console.log("[INFO] Captura múltiple completada");
  };

  return (
    <div className="p-8 max-w-lg mx-auto flex flex-col items-center gap-4">
      <TrainerButton></TrainerButton>
      <Recognizer></Recognizer>
      <LiveRecognizer></LiveRecognizer>
      <h1 className="text-2xl font-bold mb-4">Entrenamiento: 20 fotos</h1>

      {/* SIEMPRE existe el <video>, solo se oculta */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full rounded shadow ${!streaming ? "hidden" : ""}`}
      />

      {!streaming && (
        <button
          onClick={startCamera}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Iniciar cámara
        </button>
      )}

      {streaming && (
        <>
          <input
            type="text"
            placeholder="ID usuario"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="border px-2 py-1 rounded w-full"
          />

          <button
            onClick={captureMultiple}
            disabled={capturing}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            Capturar 20 Fotos
          </button>
        </>
      )}

      <p>{status}</p>
    </div>
  );
}