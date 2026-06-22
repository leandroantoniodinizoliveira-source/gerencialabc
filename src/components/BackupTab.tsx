import React, { useState, useEffect } from "react";
import { DownloadCloud, UploadCloud, Save, HardDrive } from "lucide-react";
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, User } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Inicia Firebase caso não esteja iniciado
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}
const auth = getAuth(app);

export function BackupTab({ showToast }: { showToast: any }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [folderId, setFolderId] = useState("");
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [googleUser, setGoogleUser] = useState<User | null>(null);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setDriveToken(credential.accessToken);
        setGoogleUser(result.user);
        showToast("Sucesso", "Autenticado com sucesso no Google Drive!", "success");
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
         console.warn("Autenticação com Google cancelada pelo usuário.");
         return;
      }
      console.error(err);
      showToast("Erro", "Falha na autenticação do Google Drive.", "error");
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/backup/export");
      const data = await res.json();
      if (res.ok && data.success) {
        const content = JSON.stringify(data.backup, null, 2);
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `adasa_backup_${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Sucesso", "Backup exportado com sucesso!", "success");
      } else {
        throw new Error(data.error || "Erro ao exportar backup.");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Erro", `Falha ao exportar: ${err.message}`, "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirm = window.confirm("ATENÇÃO: A restauração do backup irá SUBSTITUIR TODOS OS DADOS ATUAIS do banco de dados. Tem certeza que deseja continuar?");
    if (!confirm) {
      e.target.value = "";
      return;
    }

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const backup = JSON.parse(content);
          const res = await fetch("/api/backup/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ backup })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast("Sucesso", "Backup restaurado com sucesso! A página será recarregada.", "success");
            setTimeout(() => window.location.reload(), 2000);
          } else {
             throw new Error(data.error || "Erro na restauração");
          }
        } catch (innerErr: any) {
          showToast("Erro", `Falha ao restaurar: ${innerErr.message}`, "error");
          setIsImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      console.error(err);
      showToast("Erro", `Falha na leitura do arquivo: ${err.message}`, "error");
      setIsImporting(false);
    }
    e.target.value = "";
  };

  const handleSetupDrive = async () => {
    if (!folderId) {
      showToast("Aviso", "Por favor informe o ID da pasta (Diretório) do Google Drive.", "warning");
      return;
    }
    if (!driveToken) {
       showToast("Aviso", "Você precisa primeiro autenticar com o Google Drive.", "warning");
       return;
    }
    setIsSavingDrive(true);
    try {
      const res = await fetch("/api/backup/setup-drive", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ folderId, accessToken: driveToken })
      });
      const data = await res.json();
      if (res.ok) {
         showToast("Sucesso", data.message || "Configuração salva com sucesso!", "success");
      } else {
         throw new Error(data.error || "Erro na configuração.");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Erro", `Falha: ${err.message}`, "error");
    } finally {
      setIsSavingDrive(false);
    }
  };

  const [isTriggeringDrive, setIsTriggeringDrive] = useState(false);

  const handleTriggerDriveBackup = async () => {
    setIsTriggeringDrive(true);
    try {
      const res = await fetch("/api/backup/trigger-drive", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Sucesso", "Backup enviado com sucesso para o Drive!", "success");
      } else {
        throw new Error(data.error || "Erro ao realizar o backup no Drive.");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Erro", `Falha no backup para o Drive: ${err.message}`, "error");
    } finally {
      setIsTriggeringDrive(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <HardDrive className="text-indigo-600" />
          Backup Sob Demanda
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Você pode fazer o download completo do banco de dados ou restaurar um backup existente.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleExport}
            disabled={isExporting || isImporting}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
          >
            <DownloadCloud size={18} />
            {isExporting ? "Exportando..." : "Fazer Backup (Download)"}
          </button>

          <label className={`${isImporting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'} flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold transition-all`}>
            <UploadCloud size={18} />
            {isImporting ? "Restaurando..." : "Restaurar Banco de Dados"}
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
              disabled={isImporting || isExporting}
            />
          </label>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <Save className="text-emerald-600" />
          Configuração Backup Diário (Google Drive)
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Crie uma pasta no seu Google Drive, copie o ID da pasta (encontrado na URL) e informe abaixo para habilitar o backup automático todos os dias às 00:00. O sistema enviará o arquivo diretamente para a pasta configurada.
        </p>
        
        <div className="space-y-4 max-w-md">
          {!driveToken ? (
             <button
                onClick={handleGoogleLogin}
                className="gsi-material-button w-full px-6 py-3 border border-slate-300 rounded-xl font-bold text-slate-700 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all"
             >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{display: 'block', width: '20px', height: '20px'}}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                Autenticar com Google Drive
             </button>
          ) : (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-sm font-medium flex items-center justify-between">
              <div>
                Conectado ao Drive: <span className="font-bold">{googleUser?.email}</span>
              </div>
              <button onClick={() => setDriveToken(null)} className="text-emerald-700 underline text-xs">
                Desconectar
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">ID do Diretório (Pasta)</label>
            <input
              type="text"
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
              placeholder="ex: 1A2B3c4d5E6f7g8h9i0j..."
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
            />
          </div>
          <button
            onClick={handleSetupDrive}
            disabled={isSavingDrive || !driveToken}
            className="flex items-center justify-center w-full gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {isSavingDrive ? "Salvando..." : "Habilitar Backup Automático"}
          </button>
          
          <button
            onClick={handleTriggerDriveBackup}
            disabled={isTriggeringDrive || !driveToken}
            className="flex items-center justify-center w-full gap-2 px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold transition-all disabled:opacity-50 mt-2"
          >
            <UploadCloud size={18} />
            {isTriggeringDrive ? "Enviando Backup..." : "Testar Envio para o Drive Agora"}
          </button>
        </div>
      </div>
    </div>
  );
}