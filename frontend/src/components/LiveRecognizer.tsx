import { useEffect, useRef, useState } from "react";

export default function LiveRecognizer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  const [lastResults, setLastResults] = useState<any[]>([]);
  const lastSent = useRef<number>(0);

  const startCameraAndWS = async () => {
    if (streaming) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          const width = videoRef.current!.videoWidth;
          const height = videoRef.current!.videoHeight;

          if (canvasRef.current) {
            canvasRef.current.width = width;
            canvasRef.current.height = height;
          }

          setCanvasSize({ width, height });
          console.log(`Res: ${width}x${height}`);
        };

        await videoRef.current.play();
        setStreaming(true);
      }
    } catch (err) {
      console.error("Can't access camera:", err);
    }

    const socket = new WebSocket("wss://3cea49ad045c.ngrok-free.app/liveRecognize");
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      console.log("WS connected");
    };

    socket.onerror = (err) => {
      console.error("WS ERROR:", err);
    };

    socket.onclose = () => {
      console.log("WS closed");
    };

    socket.onmessage = (event) => {
      const { results } = JSON.parse(event.data);
      setLastResults(results || []);
    };

    setWs(socket);
  };

  // Dibuja resultados
  useEffect(() => {
    if (!canvasRef.current || !canvasSize) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    lastResults.forEach((face) => {
      const [x, y, w, h] = face.rect;
      const color = face.id === "Unknown" ? "red" : "lime";

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = color;
      ctx.font = "16px sans-serif";
      ctx.fillText(`ID: ${face.id}`, x, y - 8);
    });
  }, [lastResults, canvasSize]);

  // Envía frames cada 500ms
  useEffect(() => {
    const sendFrame = () => {
      if (!videoRef.current || !canvasRef.current || !ws || ws.readyState !== 1 || !canvasSize) {
        requestAnimationFrame(sendFrame);
        return;
      }

      const now = Date.now();
      if (now - lastSent.current < 500) {
        requestAnimationFrame(sendFrame);
        return;
      }
      lastSent.current = now;

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) {
        requestAnimationFrame(sendFrame);
        return;
      }

      ctx.drawImage(videoRef.current, 0, 0, canvasSize.width, canvasSize.height);

      canvasRef.current.toBlob((blob) => {
        if (blob) {
          blob.arrayBuffer().then((buf) => {
            ws.send(buf);
            console.log(`Frame sent (${buf.byteLength} bytes)`);
          });
        }
        requestAnimationFrame(sendFrame);
      }, "image/jpeg", 0.7);
    };

    if (ws && streaming && canvasSize) {
      sendFrame();
    }
  }, [ws, streaming, canvasSize]);

  return (
    <div className="p-4 flex flex-col gap-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center">Live Recognizer</h1>
      <p className="text-sm text-gray-600 text-center">
        Activa tu cámara y comienza a detectar rostros en tiempo real. Ideal para móviles.
      </p>

      <button
        onClick={startCameraAndWS}
        className="w-full px-4 py-3 rounded bg-gray-800 text-white font-semibold active:scale-95 transition"
      >
        {streaming ? "Reconocimiento Activo" : "Iniciar Reconocimiento"}
      </button>

      <div className="relative w-full aspect-video border border-gray-300 rounded overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
        {canvasSize && (
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="absolute top-0 left-0 w-full h-full"
          />
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        El marco verde indica rostro conocido, rojo indica desconocido.
      </p>
    </div>
  );
}
