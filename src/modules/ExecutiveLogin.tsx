import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ShieldCheck } from "lucide-react";

const EXEC_PASSCODE = "GTB2026";

export default function ExecutiveLogin() {
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passcode.trim() === EXEC_PASSCODE) {
      sessionStorage.setItem("hf_exec_auth", "true");
      navigate("/executive");
    } else {
      setError("Incorrect access code. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gt-purple-dark via-gt-purple to-gt-purple-light flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="grid place-items-center w-14 h-14 rounded-2xl bg-gt-orange text-white font-bold text-2xl shadow-lg mb-3">
            H
          </div>
          <div className="text-white font-bold text-lg">Haryana Fresh</div>
          <div className="text-white/60 text-[11px] font-medium tracking-wide">DIGITAL PLATFORM</div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="grid place-items-center w-9 h-9 rounded-lg bg-gt-purple/10 text-gt-purple">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">Senior Leadership Access</div>
              <div className="text-[11px] text-slate-500">Statewide overview for authorised officials</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Access Code</label>
              <div className="relative mt-1">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter access code"
                  autoFocus
                  className="w-full rounded-lg border border-border pl-9 pr-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-gt-purple/30 focus:border-gt-purple"
                />
              </div>
            </div>
            {error && <div className="text-xs font-medium text-bad">{error}</div>}
            <button type="submit" className="btn-primary w-full justify-center py-2.5">
              View Dashboard
            </button>
          </form>
        </div>

        <div className="text-white/40 text-[11px] text-center mt-5">Prepared by Grant Thornton Bharat</div>
      </div>
    </div>
  );
}
