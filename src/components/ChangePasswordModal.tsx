import React, { useState } from "react";
import { X, Key, Check } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../lib/auth";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type: "success" | "error") => void;
}

export function ChangePasswordModal({ isOpen, onClose, showToast }: ChangePasswordModalProps) {
  const { currentUser, updateUser } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      showToast("A senha deve ter pelo menos 4 caracteres.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("As senhas não coincidem.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUser(currentUser.id, { password: newPassword } as any);
      showToast("Senha alterada com sucesso!", "success");
      onClose();
    } catch (err: any) {
      showToast("Erro ao alterar senha.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden"
      >
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Key size={16} className="text-adasa-mid" /> Alterar Senha
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nova Senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-adasa-mid bg-slate-50 hover:bg-white transition-colors"
              placeholder="Digite a nova senha"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Confirmar Senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-adasa-mid bg-slate-50 hover:bg-white transition-colors"
              placeholder="Confirme a nova senha"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-adasa-mid text-white rounded-xl text-sm font-bold shadow-sm hover:bg-adasa-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                "Salvando..."
              ) : (
                <>
                  <Check size={16} /> Salvar Nova Senha
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
