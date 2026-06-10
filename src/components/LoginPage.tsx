import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import { Lock, Mail, ArrowRight, ShieldAlert, Sparkles, Eye, EyeOff, UserCheck, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function LoginPage() {
  const { loginWithCredentials, users } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Por favor, informe seu e-mail e sua senha de 4 dígitos.");
      return;
    }
    
    setIsLoading(true);
    setErrorMsg("");
    
    // Simulate slight network delay for better UX and loader visibility
    await new Promise((r) => setTimeout(r, 600));

    const result = await loginWithCredentials(email, password);
    setIsLoading(false);
    
    if (!result.success) {
      setErrorMsg(result.error || "E-mail ou senha incorretos.");
    }
  };

  const selectUserSuggestion = (suggestedEmail: string, suggestedPass: string) => {
    setEmail(suggestedEmail);
    setPassword(suggestedPass);
    setErrorMsg("");
  };

  // Safe subset of users to show as suggestions for easy testing
  const suggestions = [
    { name: "Administrador ADASA", email: "admin@adasa.gov.br", pass: "1234", badge: "Acesso Total", color: "border-indigo-200 hover:border-indigo-400 bg-indigo-50/50" },
    { name: "Joao Regulador", email: "joao@adasa.gov.br", pass: "1234", badge: "Auditoria", color: "border-emerald-200 hover:border-emerald-400 bg-emerald-50/50" },
    { name: "Maria CAESB", email: "maria@caesb.gov.br", pass: "1234", badge: "Prestador", color: "border-sky-200 hover:border-sky-400 bg-sky-50/50" },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-adasa-dark overflow-hidden relative font-sans">
      
      {/* Decorative background ripples representing water / ADASA flow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.08),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(circle_at_20%_30%,rgba(16,185,129,0.04),transparent_50%)] pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_80%_60%,rgba(14,165,233,0.04),transparent_50%)] pointer-events-none animate-pulse" style={{ animationDuration: "6000ms" }} />

      <div className="w-full max-w-lg mx-auto p-4 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-8"
        >
          {/* SAE Logo Header Design */}
          <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100 select-none">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-3">
              <BarChart3 size={36} className="text-adasa-mid" />
              <span>Gerencial <span className="text-sky-600">SAE</span></span>
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold leading-relaxed flex items-start gap-2.5"
                >
                  <ShieldAlert className="shrink-0 text-rose-500 mt-0.5" size={16} />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-slate-600 text-xs font-black uppercase tracking-wider">
                E-mail ou Usuário
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  disabled={isLoading}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@adasa.gov.br"
                  className="w-full bg-slate-50/80 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-2xl pl-11 pr-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-sky-500/10 disabled:opacity-50 transition-all font-semibold"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-600 text-xs font-black uppercase tracking-wider">
                  Senha de Acesso (4 Dígitos)
                </label>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  maxLength={12}
                  value={password}
                  disabled={isLoading}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-50/80 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-2xl pl-11 pr-11 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-sky-500/10 disabled:opacity-50 transition-all font-mono tracking-widest font-extrabold"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sky-600 hover:bg-sky-550 active:bg-sky-700 text-white text-xs font-black uppercase tracking-widest py-4 px-5 rounded-2xl shadow-lg hover:shadow-sky-500/10 cursor-pointer disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4.5 h-4.5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </div>
              ) : (
                <>
                  <span>ACESSAR O SISTEMA</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demoplay / Suggestions */}
          <div className="mt-8 pt-6 border-t border-slate-150">
            <div className="flex items-center gap-1.5 mb-4 text-[10px] uppercase font-black tracking-widest text-slate-400 select-none">
              <Sparkles size={11} className="text-sky-500" />
              <span>Acesso Rápido para Auditoria/Homologação</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {suggestions.map((s, idx) => (
                <button
                  key={s.email}
                  disabled={isLoading}
                  onClick={() => selectUserSuggestion(s.email, s.pass)}
                  className={`flex items-center justify-between text-left p-3 rounded-2xl border transition-all text-xs cursor-pointer group ${s.color}`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck size={14} className="text-slate-400 group-hover:text-sky-500 transition-colors" />
                    <div>
                      <p className="font-bold text-slate-800">{s.name}</p>
                      <p className="text-slate-500 font-medium text-[10px] mt-0.5">{s.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-600 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">
                    {s.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
