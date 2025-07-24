import { useState } from "react"
export default function TrainerButton() {
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
