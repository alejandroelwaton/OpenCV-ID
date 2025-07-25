import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import LiveRecognizer from "./components/LiveRecognizer";
import Trainer from "./components/Trainer";
import Uploader from "./components/Uploader";
import { useState, useEffect } from "react";
import logo from "../public/logos.svg";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detecta si es móvil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Swipe solo en móvil
  useEffect(() => {
    if (!isMobile) return;

    let touchStartX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].screenX;
      const diff = touchEndX - touchStartX;

      if (diff > 80) setSidebarOpen(true); // swipe right
      if (diff < -80) setSidebarOpen(false); // swipe left
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isMobile]);

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden relative">
        {/* BACKDROP solo en móvil */}
        <div
          className={`
            fixed inset-0 bg-black z-10 transition-opacity duration-300
            ${isMobile && sidebarOpen ? "opacity-50" : "opacity-0 pointer-events-none"}
          `}
          onClick={() => setSidebarOpen(false)}
        ></div>

        {/* Sidebar */}
        <aside
          className={`
            bg-gray-800 text-white w-64 z-20
            ${isMobile
              ? `fixed top-0 left-0 h-full transform transition-transform duration-300 ease-in-out ${
                  sidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`
              : `relative h-full`
            }
          `}
        >
          <div className="p-4 text-xl font-bold border-b border-gray-700 flex items-center gap-2 text-center sm:text-left">
             <img src={logo} alt="Logo" className="w-6 h-6" />
            Mi Sistema
          </div>
          <nav className="flex flex-col p-4 gap-2 text-center sm:text-left">
            {[
              { to: "/", label: "Home" },
              { to: "/live", label: "Live Recognizer" },
              { to: "/trainer", label: "Trainer" },
              { to: "/upload", label: "Uploader" },
            ].map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={({ isActive }) =>
                  (isActive
                    ? "bg-gray-700 px-4 py-3 rounded"
                    : "hover:bg-gray-700 px-4 py-3 rounded") + " block"
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Contenido */}
        <main className="flex-1 p-6 overflow-auto w-full">
          <Routes>
            <Route
              path="/"
              element={
                <div className="text-center">
                  <h1 className="text-3xl font-bold mb-4">Bienvenido</h1>
                  <p>Selecciona una opción en el menú lateral.</p>
                </div>
              }
            />
            <Route path="/live" element={<LiveRecognizer />} />
            <Route path="/trainer" element={<Trainer />} />
            <Route path="/upload" element={<Uploader />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
