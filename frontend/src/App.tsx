import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./store/auth";
import { Layout } from "./components/Layout";
import { Loader } from "./components/Loader";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Grabacion } from "./pages/Grabacion";
import { Captions } from "./pages/Captions";
import { Diseno } from "./pages/Diseno";
import { Programar } from "./pages/Programar";
import { Analisis } from "./pages/Analisis";
import { Ajustes } from "./pages/Ajustes";

export default function App() {
  const { user, loading, init } = useAuth();

  useEffect(() => init(), [init]);

  if (loading) return <Loader label="Iniciando sesión…" />;

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="grabacion" element={<Grabacion />} />
        <Route path="captions" element={<Captions />} />
        <Route path="diseno" element={<Diseno />} />
        <Route path="programar" element={<Programar />} />
        <Route path="analisis" element={<Analisis />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
