import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-slate-50">
      <div className="text-6xl mb-3">🤔</div>
      <h1 className="text-2xl font-extrabold">No encontramos la página</h1>
      <p className="text-slate-500 mt-1">Volvé al inicio.</p>
      <Link to="/" className="mt-4 px-6 py-3 rounded-full bg-primary text-white font-bold">
        Ir al inicio
      </Link>
    </div>
  );
}
