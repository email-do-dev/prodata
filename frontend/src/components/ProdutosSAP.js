import { useState, useEffect } from "react";

export function ProdutosSAP() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const carregarProdutosEntrada = () => {
    setLoading(true);
    setError(null);
    
    fetch('/api/sap/produtos-saida')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          setProdutos(data.data);
          setError(null);
        } else {
          setError('SAP temporariamente indisponível');
          setProdutos([]); // Limpar produtos antigos
        }
        setLoading(false);
      })
      .catch(err => {
        setError('SAP offline - dados indisponíveis');
        setProdutos([]);
        setLoading(false);
      });
  };

  // Tentar carregar na primeira vez (mas não bloquear se falhar)
  useEffect(() => {
    carregarProdutosEntrada();
  }, []);

  return (
    <div className="secao">
      <div className="secao-header">
        <h2>📦 Produtos SAP ({produtos.length})</h2>
        <button 
          onClick={carregarProdutosEntrada} 
          className="botao-refresh"
          disabled={loading}
        >
          {loading ? '⏳ Carregando...' : '🔄 Atualizar'}
        </button>
      </div>
      
      {error && (
        <div className="error">
          ❌ {error}
          <br />
          <small>💡 Botão "Atualizar" funcionará quando SAP voltar</small>
        </div>
      )}
      
      {loading && <div className="loading">⏳ Consultando SAP...</div>}
      
      {produtos.length > 0 ? (
        <div className="tabela-container">
          <table className="tabela">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome do Produto</th>
                <th>Unidade</th>
                <th>Último Custo</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map(produto => (
                <tr key={produto.codigo}>
                  <td><code>{produto.codigo}</code></td>
                  <td>{produto.nome}</td>
                  <td>{produto.unidade}</td>
                  <td>
                    {produto.ultimo_custo ? 
                      `R$ ${parseFloat(produto.ultimo_custo).toFixed(2)}` : 
                      'N/A'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !loading && !error && (
        <div className="loading">
          📦 Nenhum produto carregado. Clique em "Atualizar" quando SAP estiver online.
        </div>
      )}
    </div>
  );
}