import { useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export function ExecutiveShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  function signOut() {
    sessionStorage.removeItem("hf_exec_auth");
    navigate("/executive-login");
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-gradient-to-r from-gt-purple-dark to-gt-purple">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid place-items-center w-9 h-9 rounded-lg bg-gt-orange text-white font-bold text-lg shadow">
              H
            </div>
            <div className="leading-tight">
              <div className="text-white font-bold text-sm">Haryana Fresh</div>
              <div className="text-white/60 text-[10px] font-medium tracking-wide">DIGITAL PLATFORM</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-white/80 text-xs font-semibold bg-white/10 rounded-full px-3 py-1.5">
              <ShieldCheck size={13} /> Senior Leadership View
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-medium rounded-lg px-2.5 py-1.5 hover:bg-white/10 transition-colors"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">{children}</main>
      <div className="text-center text-[10px] text-slate-400 pb-6">Prepared by Grant Thornton Bharat</div>
    </div>
  );
}
