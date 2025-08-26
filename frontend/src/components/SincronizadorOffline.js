import React, { useState, useEffect } from 'react';

export function SincronizadorOffline() {
  const [pesosOffline, setPesosOffline] = useState([]);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    // Carregar pesos offline do localStorage
    const pesos = localStorage.getItem('pesos_offline');
    if (pesos) {
      setPesosOffline(JSON.parse(pesos));
    }

    // Sincronizar automaticamente quando volta online
    const handleOnline = () => {
      sincronizarDados();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const sincronizarDados = async () => {
    if (pesosOffline.length === 0) return;

    setSincronizando(true);
    let sucessos = 0;
    let falhas = 0;

    for (const peso of pesosOffline) {
      try {
        const response = await fetch(`/api/subetapas/${peso.subetapa_id}/pesos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operador: peso.operador,
            peso_kg: peso.peso_kg,
            observacoes: peso.observacoes + ' [Sincronizado offline]',
            estacao: peso.estacao || 'TABLET'
          })
        });

        if (response.ok) {
          sucessos++;
        } else {
          falhas++;
        }
      } catch (error) {
        falhas++;
      }
    }

    // Limpar dados sincronizados
    if (sucessos > 0) {
      localStorage.removeItem('pesos_offline');
      setPesosOffline([]);
    }

    setSincronizando(false);

    if (sucessos > 0) {
      alert(`✅ ${sucessos} registros sincronizados com sucesso!`);
    }
    if (falhas > 0) {
      alert(`⚠️ ${falhas} registros falharam na sincronização.`);
    }
  };

  if (pesosOffline.length === 0) return null;

  return (
    <div className="sincronizador-offline">
      <div className="badge-offline">
        📴 {pesosOffline.length} registros offline
      </div>
      
      {navigator.onLine && (
        <button 
          onClick={sincronizarDados}
          disabled={sincronizando}
          className="botao-sincronizar"
        >
          {sincronizando ? '⏳ Sincronizando...' : '🔄 Sincronizar'}
        </button>
      )}
    </div>
  );
}