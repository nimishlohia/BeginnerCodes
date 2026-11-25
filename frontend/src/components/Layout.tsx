import React from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const Layout: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white hover:text-emerald-400 transition-colors">
            <span className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-base font-black shadow-sm">
              ▲
            </span>
            <span>LevelUp</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
            {/* Challenges is always visible */}
            <Link
              to="/challenges"
              className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white transition"
            >
              Challenges
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/submissions"
                  className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white transition"
                >
                  My Submissions
                </Link>
                <Link
                  to="/dashboard"
                  className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white transition"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 flex flex-col">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4">
          LevelUp &bull; A friendly, peer-based coding practice platform
        </div>
      </footer>
    </div>
  );
};
