import { useRef, useState } from "react"

export default function Upload()
{  
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
    setStatus("Captura completada. Ahora puedes entrenar.");
    console.log("[INFO] Captura múltiple completada");
  };

  return (
    <div className="p-8 max-w-lg mx-auto flex flex-col items-center gap-4">
      
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