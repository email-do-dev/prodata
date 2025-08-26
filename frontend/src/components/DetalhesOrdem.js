import React, { useState, useEffect } from 'react';

import { NovaSubetapa } from './NovaSubetapa'
import { RegistroPeso } from './RegistroPeso';

export function DetalhesOrdem({ ordemId, onVoltar }) {
  const [ordem, setOrdem] = useState(null);
  const [subetapas, setSubetapas] = useState([]);
  const [rendimentos, setRendimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNovaSubetapa, setShowNovaSubetapa] = useState(false);
  const [showRegistroPeso, setShowRegistroPeso] = useState(null);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar dados da ordem
      const ordemResponse = await fetch(`/api/ordens`);
      const ordemData = await ordemResponse.json();
      if (ordemData.success) {
        const ordemEncontrada = ordemData.data.find(o => o.id === parseInt(ordemId));
        setOrdem(ordemEncontrada);
      }

      // Carregar subetapas
      const subetapasResponse = await fetch(`/api/ordens/${ordemId}/subetapas`);
      const subetapasData = await subetapasResponse.json();
      if (subetapasData.success) {
        setSubetapas(subetapasData.data);
      }

      // Carregar rendimentos
      const rendimentoResponse = await fetch(`/api/ordens/${ordemId}/rendimento`);
      const rendimentoData = await rendimentoResponse.json();
      if (rendimentoData.success) {
        setRendimentos(rendimentoData.data);
      }

    } catch (error) {
      console.error('Erro carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [ordemId]);

  if (loading) return <div className="loading">⏳ Carregando detalhes...</div>;
  if (!ordem) return <div className="error">❌ Ordem não encontrada</div>;

  return (
    <div className="detalhes-ordem">
      <div className="secao">
        <div className="secao-header">
          <h2>🔍 Detalhes da Ordem: {ordem.codigo}</h2>
          <button onClick={onVoltar} className="botao-voltar">
            ⬅️ Voltar
          </button>
        </div>

        <div className="ordem-info">
          <div className="info-card">
            <h3>📋 Informações Gerais</h3>
            <p><strong>Linha:</strong> {ordem.linha_nome}</p>
            <p><strong>Status:</strong> <span className={`status-${ordem.status.toLowerCase()}`}>{ordem.status}</span></p>
            <p><strong>Item Entrada:</strong> {ordem.item_entrada}</p>
            <p><strong>Item Saída:</strong> {ordem.item_saida}</p>
            <p><strong>Criada há:</strong> {Math.floor(ordem.horas_desde_criacao)}h</p>
          </div>
        </div>
      </div>

      <div className="secao">
        <div className="secao-header">
          <h2>⚖️ Subetapas e Pesos ({subetapas.length})</h2>
          <button 
            onClick={() => setShowNovaSubetapa(!showNovaSubetapa)}
            className="botao-refresh"
          >
            ➕ Nova Subetapa
          </button>
        </div>

        {showNovaSubetapa && (
          <NovaSubetapa 
            ordemId={ordemId} 
            onSubetapaCriada={() => {
              setShowNovaSubetapa(false);
              carregarDados();
            }}
          />
        )}

        <div className="subetapas-grid">
          {subetapas.map(subetapa => {
            const rendimento = rendimentos.find(r => r.numero_etapa === subetapa.numero_etapa);
            return (
              <div key={subetapa.id} className="subetapa-card">
                <div className="subetapa-header">
                  <h3>📍 Etapa {subetapa.numero_etapa}</h3>
                  <span className="peso-badge">
                    {Number(subetapa.peso_total).toFixed(1)} kg
                  </span>
                </div>
                
                <div className="subetapa-info">
                  <p><strong>Item:</strong> {subetapa.item_codigo}</p>
                  <p><strong>Descrição:</strong> {subetapa.descricao}</p>
                  <p><strong>Registros:</strong> {subetapa.total_registros}</p>
                  <p><strong>Operador(a):</strong> {subetapa.criado_por}</p>
                  
                  {rendimento && (
                    <div className="rendimento-info">
                      {rendimento.rendimento_etapa && (
                        <p><strong>Rendimento Etapa:</strong> 
                          <span className={rendimento.rendimento_etapa >= 85 ? 'rendimento-bom' : 'rendimento-baixo'}>
                            {rendimento.rendimento_etapa}%
                          </span>
                        </p>
                      )}
                      {rendimento.rendimento_geral && (
                        <p><strong>Rendimento Geral:</strong> 
                          <span className={rendimento.rendimento_geral >= 70 ? 'rendimento-bom' : 'rendimento-baixo'}>
                            {rendimento.rendimento_geral}%
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="subetapa-acoes">
                  <button 
                    onClick={() => setShowRegistroPeso(subetapa.id)}
                    className="botao-peso"
                  >
                    ⚖️ Registrar Peso
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {showRegistroPeso && (
          <RegistroPeso 
            subetapaId={showRegistroPeso}
            onPesoRegistrado={() => {
              setShowRegistroPeso(null);
              carregarDados();
            }}
            onCancelar={() => setShowRegistroPeso(null)}
          />
        )}
      </div>
    </div>
  );
}