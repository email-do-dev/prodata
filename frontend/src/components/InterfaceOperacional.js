import React, { useState, useEffect } from 'react';
import { OperacaoOrdem } from './OperacaoOrdem';
import { NovaOrdemDialog } from './NovaOrdemDialog';

export function InterfaceOperacional({ linhas }) {
  const [ordensAbertas, setOrdensAbertas] = useState([]);
  const [ordemSelecionada, setOrdemSelecionada] = useState(null);
  const [subetapas, setSubetapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);

  // Monitorar status da conexão
  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const carregarOrdensAbertas = async () => {
    try {
      const response = await fetch('/api/ordens');
      const data = await response.json();
      if (data.success) {
        const abertas = data.data.filter(ordem => ordem.status === 'ABERTA' || ordem.status === 'EM_ANDAMENTO');
        setOrdensAbertas(abertas);
      }
    } catch (error) {
      console.error('Erro carregar ordens:', error);
      if (offline) {
        // Em modo offline, usar dados do localStorage se disponível
        const ordensCache = localStorage.getItem('ordens_cache');
        if (ordensCache) {
          setOrdensAbertas(JSON.parse(ordensCache));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const carregarSubetapas = async (ordemId) => {
    try {
      const response = await fetch(`/api/ordens/${ordemId}/subetapas`);
      const data = await response.json();
      if (data.success) {
        setSubetapas(data.data);
        // Cache para offline
        localStorage.setItem(`subetapas_${ordemId}`, JSON.stringify(data.data));
      }
    } catch (error) {
      console.error('Erro carregar subetapas:', error);
      // Tentar cache offline
      const cache = localStorage.getItem(`subetapas_${ordemId}`);
      if (cache) {
        setSubetapas(JSON.parse(cache));
      }
    }
  };

  useEffect(() => {
    carregarOrdensAbertas();
  }, []);

  useEffect(() => {
    if (ordemSelecionada) {
      carregarSubetapas(ordemSelecionada.id);
    }
  }, [ordemSelecionada]);

  if (loading) {
    return (
      <div className="interface-operacional loading-screen">
        <div className="loading-spinner">⏳</div>
        <h2>Carregando Sistema...</h2>
      </div>
    );
  }

  return (
    <div className="interface-operacional">
      {/* Status da conexão */}
      <div className={`status-conexao ${offline ? 'offline' : 'online'}`}>
        {offline ? '📴 MODO OFFLINE' : '🌐 ONLINE'}
      </div>

      {!ordemSelecionada ? (
        // Tela seleção de ordem
        <div className="selecao-ordem">
          <h1>🎣 Produção Pesqueira</h1>
          <h2>Selecione uma Ordem de Produção</h2>
          <NovaOrdemDialog linhas={linhas} 
          onOrdemCriada={() => setOrdemSelecionada(prev => !prev)}  />
          
          <div className="ordens-grid">
            {ordensAbertas.map(ordem => (
              <div 
                key={ordem.id} 
                className="ordem-card-operacional"
                onClick={() => setOrdemSelecionada(ordem)}
              >
                <div className="ordem-header">
                  <h3>{ordem.codigo}</h3>
                  <span className={`status-badge ${ordem.status.toLowerCase()}`}>
                    {ordem.status}
                  </span>
                </div>
                <div className="ordem-detalhes">
                  <p><strong>Linha:</strong> {ordem.linha_nome}</p>
                  <p><strong>Item:</strong> {ordem.item_entrada}</p>
                  <p><strong>Criada há:</strong> {Math.floor(ordem.horas_desde_criacao)}h</p>
                </div>
              </div>
            ))}
          </div>

          {ordensAbertas.length === 0 && (
            <div className="sem-ordens">
              <h3>📋 Nenhuma ordem em produção</h3>
              <p>Aguardando novas ordens...</p>
            </div>
          )}
        </div>
      ) : (
        // Tela de operação da ordem
        <OperacaoOrdem 
          ordem={ordemSelecionada}
          subetapas={subetapas}
          offline={offline}
          onVoltar={() => {
            setOrdemSelecionada(null);
            setSubetapas([]);
          }}
          onSubetapaAtualizada={() => carregarSubetapas(ordemSelecionada.id)}
        />
      )}
    </div>
  );
}