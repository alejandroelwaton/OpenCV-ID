import { useRef, useState } from "react";

export default function BurstCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [streaming, setStreaming] = useState(false);

  // Datos usuario
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [age, setAge] = useState("");


  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      } else {
        console.error("No existe videoRef");
      }
    } catch (err) {
      console.error("No se pudo acceder a la cámara:", err);
    }
  };

  const captureBurst = () => {
    if (capturing) return;
    if (!userId) {
      alert("Ingresa un ID primero");
      return;
    }

    setCapturing(true);
    let count = 0;
    const total = 100;

    const captureFrame = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;

      if (width === 0 || height === 0) {
        console.log("Video no tiene resolución, reintentando...");
        setTimeout(captureFrame, 100);
        return;
      }

      canvasRef.current.width = width;
      canvasRef.current.height = height;

      ctx.drawImage(videoRef.current, 0, 0, width, height);

      canvasRef.current.toBlob(async (blob) => {
        if (blob) {
          const formData = new FormData();
          formData.append("file", blob, `capture_${count}.jpg`);
          formData.append("user_id", userId);
          formData.append("name", name);
          formData.append("role", role);
          formData.append("age", age)

          try {
            const res = await fetch(
              "https://3cea49ad045c.ngrok-free.app/upload",
              {
                method: "POST",
                body: formData,
              }
            );

            console.log(`Status: ${res.status}`);
            if (!res.ok) {
              console.error(`❌ Falló subir foto #${count + 1}`);
            } else {
              console.log(`✅ Foto #${count + 1} OK`);
            }
          } catch (err) {
            console.error(err);
          }
        }

        count++;
        if (count < total) {
          setTimeout(captureFrame, 150);
        } else {
          console.log("✅ Captura completada");
          setCapturing(false);
        }
      }, "image/jpeg");
    };

    captureFrame();
  };

  return (
    <div className="p-4 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-800">Entrenamiento</h1>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          onClick={startCamera}
          className="w-full sm:w-auto px-5 py-3 bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
          disabled={streaming}
        >
          {streaming ? "Cámara Activa" : "Iniciar Cámara"}
        </button>

        <input
          type="text"
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full sm:w-auto px-4 py-3 border border-gray-400 rounded-md"
        />

        <input
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full sm:w-auto px-4 py-3 border border-gray-400 rounded-md"
        />

        <input
          type="text"
          placeholder="rol"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full sm:w-auto px-4 py-3 border border-gray-400 rounded-md"
        />
        <input
          type="text"
          placeholder="edad"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="w-full sm:w-auto px-4 py-3 border border-gray-400 rounded-md"
        />
        <button
          onClick={captureBurst}
          className="w-full sm:w-auto px-5 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          disabled={!streaming || capturing}
        >
          {capturing ? "Capturando..." : "Capturar 100 Fotos"}
        </button>
      </div>

      <div className="w-full flex justify-center">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full max-w-md border border-gray-300 rounded-md"
        />
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
