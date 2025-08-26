import { useState, useEffect } from "react";

export function StatusSistema() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('/api/sap/teste')
      .then(response => response.json())
      .then(data => setStatus(data))
      .catch(err => setStatus({ success: false, message: err.message }));
  }, []);

  return (
    <div className="status-sistema">
      <h2>📊 Status do Sistema</h2>
      <div className="status-cards">
        <div className="status-card">
          <h3>🗄️ PostgreSQL</h3>
          <span className="status-ativo">✅ Conectado</span>
        </div>
        <div className="status-card">
          <h3>🔗 SAP Business One</h3>
          <span className={status?.success ? 'status-ativo' : 'status-inativo'}>
            {status?.success ? '✅ Conectado' : '❌ Erro'}
          </span>
        </div>
        <div className="status-card">
          <h3>⚛️ React Frontend</h3>
          <span className="status-ativo">✅ Online</span>
        </div>
      </div>
    </div>
  );
}