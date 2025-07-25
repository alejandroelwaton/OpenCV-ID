import { useState, useEffect } from "react";

export default function TrainerButton() {
  const [status, setStatus] = useState<string>("");
  const [users, setUsers] = useState<{ id: string; info: any }[]>([]);

  const secretHeaders = {
    "ngrok-skip-browser-warning": "true",
    // Si tienes un token, ponlo aquí:
    // "Authorization": `Bearer ${token}`
  };

  const handleTrain = async () => {
    setStatus("Entrenando modelo...");
    try {
      const res = await fetch("https://3cea49ad045c.ngrok-free.app/train", {
        method: "POST",
        headers: secretHeaders,
      });
      const data = await res.json();
      setStatus(data.message || "Entrenamiento completado.");
    } catch (error) {
      setStatus("Error al entrenar.");
      console.error(error);
    }
  };

  const handleReset = async () => {
    if (!confirm("¿Seguro que quieres reiniciar y eliminar todos los usuarios?")) return;

    setStatus("Reiniciando servidor...");
    try {
      const res = await fetch("https://3cea49ad045c.ngrok-free.app/reset", {
        method: "POST",
        headers: secretHeaders,
      });
      const data = await res.json();
      setStatus(data.message || "Servidor reiniciado.");
    } catch (error) {
      setStatus("Error al reiniciar.");
      console.error(error);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("https://3cea49ad045c.ngrok-free.app/ids", {
          headers: secretHeaders,
        });
        const data = await res.json();
        console.log("✅ Users:", data);
        setUsers(data.users || []); // fallback
      } catch (error) {
        console.error("❌ Error:", error);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <button
        onClick={handleTrain}
        className="px-4 py-3 w-full max-w-xs bg-lime-950 text-white rounded hover:bg-green-800"
      >
        Entrenar Modelo
      </button>

      <button
        onClick={handleReset}
        className="px-4 py-3 w-full max-w-xs bg-red-500 text-white rounded hover:bg-red-700"
      >
        Reiniciar / Eliminar Usuarios
      </button>

      {status && (
        <p className="text-center text-sm text-gray-700">{status}</p>
      )}

      <div className="mt-4 w-full max-w-md">
        <h3 className="font-bold mb-2">Usuarios actuales:</h3>
        {users && users.length > 0 ? (
          <ul className="list-disc pl-4">
            {users.map((u) => (
              <li key={u.id}>
                <strong>ID:</strong> {u.id} <br />
                <strong>Nombre:</strong> {u.info?.name || "N/A"} <br />
                <strong>Rol:</strong> {u.info?.role || "N/A"} <br />
                <strong>Edad:</strong> {u.info?.age || "N/A"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No hay usuarios aún.</p>
        )}
      </div>
    </div>
  );
}
