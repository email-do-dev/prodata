import {  useEffect, useState } from "react";

export function LinhasProducao() {
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/linhas-producao')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setLinhas(data.data);
        } else {
          setError('Erro ao carregar linhas');
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Erro de conexão: ' + err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading">⏳ Carregando linhas...</div>;
  if (error) return <div className="error">❌ {error}</div>;

  return (
    <div className="secao">
      <h2>🏭 Linhas de Produção ({linhas.length})</h2>
      <div className="tabela-container">
        <table className="tabela">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome da Linha</th>
              <th>Status</th>
              <th>Criada em</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(linha => (
              <tr key={linha.id}>
                <td>{linha.id}</td>
                <td>{linha.nome}</td>
                <td>
                  <span className={linha.ativa ? 'status-ativo' : 'status-inativo'}>
                    {linha.ativa ? '✅ Ativa' : '❌ Inativa'}
                  </span>
                </td>
                <td>{new Date(linha.created_at).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}