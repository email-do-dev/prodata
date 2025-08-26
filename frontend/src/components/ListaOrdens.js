import React, { useState, useEffect } from 'react';

export function ListaOrdens({ atualizar }) {
    const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregarOrdens = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ordens');
      const data = await response.json();

      if (data.success) {
        setOrdens(data.data);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erro ao carregar ordens: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const alterarStatus = async (id, novoStatus) => {
    try {
      const response = await fetch(`/api/ordens/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });

      const data = await response.json();
      if (data.success) {
        carregarOrdens(); // Atualiza lista após mudança
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };

  const deletarOrdem = async (id, codigo) => {
    const confirmacao = window.confirm(`Tem certeza que deseja deletar a ordem ${codigo}?`);
    if (!confirmacao) return;

    try {
      const response = await fetch(`/api/ordens/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Ordem deletada com sucesso!');
        carregarOrdens();
      } else {
        alert('❌ Erro: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro: ' + error.message);
    }
  };

  useEffect(() => {
    carregarOrdens();
  }, [atualizar]); // Recarrega sempre que atualizar mudar

  if (loading) return <div className="loading">⏳ Carregando ordens...</div>;
  if (error) return <div className="error">❌ {error}</div>;

  return (
    <div className="secao">
      <div className="secao-header">
        <h2>📋 Ordens de Produção ({ordens.length})</h2>
        <button onClick={carregarOrdens} className="botao-refresh">
          🔄 Atualizar
        </button>
      </div>

      <div className="tabela-container">
        <table className="tabela">
          <thead>
            <tr>
              <th>Código</th>
              <th>Linha</th>
              <th>Item Entrada</th>
              <th>Item Saída</th>
              <th>Qtd (kg)</th>
              <th>Status</th>
              <th>Criada há</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {ordens.map(ordem => (
              <tr key={ordem.id}>
                <td><code>{ordem.codigo}</code></td>
                <td>{ordem.linha_nome}</td>
                <td>{ordem.item_entrada}</td>
                <td>{ordem.item_saida}</td>
                <td>{ordem.quantidade_inicial ? Number(ordem.quantidade_inicial).toFixed(1) : '0.0'}</td>
                <td>
                  <select 
                    value={ordem.status} 
                    onChange={(e) => alterarStatus(ordem.id, e.target.value)}
                    className={`status-select status-${ordem.status.toLowerCase()}`}
                  >
                    <option value="ABERTA">🟢 ABERTA</option>
                    <option value="EM_ANDAMENTO">🟡 EM ANDAMENTO</option>
                    <option value="FECHADA">🔵 FECHADA</option>
                    <option value="CANCELADA">🔴 CANCELADA</option>
                  </select>
                </td>
                <td>{Math.floor(ordem.horas_desde_criacao)}h</td>
                <td>
                   <button 
                    onClick={() => window.verDetalhes(ordem.id)}
                    className="botao-detalhes"
                    title="Ver detalhes"
                  >
                    🔍
                  </button>
                                    
                  {ordem.status === 'ABERTA' && (
                    <button 
                      onClick={() => deletarOrdem(ordem.id, ordem.codigo)}
                      className="botao-deletar"
                      title="Deletar ordem"
                    >
                      🗑️
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
