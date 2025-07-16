// App.js - Aplicação principal
import React, { useState, useEffect } from 'react';
import './App.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Componente para exibir linhas de produção
function LinhasProducao() {
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

// Componente para produtos SAP (versão melhorada)
function ProdutosSAP() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const carregarProdutos = () => {
    setLoading(true);
    setError(null);
    
    fetch('/api/sap/produtos?limit=20')
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
    carregarProdutos();
  }, []);

  return (
    <div className="secao">
      <div className="secao-header">
        <h2>📦 Produtos SAP ({produtos.length})</h2>
        <button 
          onClick={carregarProdutos} 
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

// Componente para status do sistema
function StatusSistema() {
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

// Componente para criar nova ordem - SEM CAMPO CÓDIGO
function NovaOrdem({ onOrdemCriada, linhas }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    linha_producao_id: '',
    item_entrada: '',
    item_saida: '',
    quantidade_inicial: '',
    observacoes: ''
    // REMOVIDO: codigo (será gerado automaticamente)
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/ordens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          quantidade_inicial: parseFloat(formData.quantidade_inicial) || 0
          // codigo não enviado - será gerado pelo backend
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message}`); // Mostra código gerado
        setFormData({
          linha_producao_id: '',
          item_entrada: '',
          item_saida: '',
          quantidade_inicial: '',
          observacoes: ''
        });
        setMostrarForm(false);
        onOrdemCriada(); // Atualizar lista
      } else {
        alert('❌ Erro: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro de conexão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="secao">
      <div className="secao-header">
        <h2>➕ Nova Ordem de Produção</h2>
        <button 
          onClick={() => setMostrarForm(!mostrarForm)}
          className="botao-refresh"
        >
          {mostrarForm ? '❌ Cancelar' : '➕ Criar Ordem'}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="formulario">
          <div className="form-grupo">
            <label>Linha de Produção:</label>
            <select
              name="linha_producao_id"
              value={formData.linha_producao_id}
              onChange={handleInputChange}
              required
            >
              <option value="">Selecione uma linha...</option>
              {linhas.map(linha => (
                <option key={linha.id} value={linha.id}>
                  {linha.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-grupo">
            <label>Item de Entrada:</label>
            <input
              type="text"
              name="item_entrada"
              value={formData.item_entrada}
              onChange={handleInputChange}
              placeholder="Ex: SARDINHA_INTEIRA_10KG"
              required
            />
          </div>

          <div className="form-grupo">
            <label>Item de Saída:</label>
            <input
              type="text"
              name="item_saida"
              value={formData.item_saida}
              onChange={handleInputChange}
              placeholder="Ex: SARDINHA_LATA_125G"
              required
            />
          </div>

          <div className="form-grupo">
            <label>Quantidade Inicial (kg):</label>
            <input
              type="number"
              name="quantidade_inicial"
              value={formData.quantidade_inicial}
              onChange={handleInputChange}
              placeholder="0.000"
              step="0.001"
              min="0"
            />
          </div>

          <div className="form-grupo">
            <label>Observações:</label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              placeholder="Observações opcionais..."
              rows="3"
            />
          </div>

          <div className="form-acoes">
            <button 
              type="submit" 
              disabled={loading}
              className="botao-salvar"
            >
              {loading ? '⏳ Criando...' : '💾 Criar Ordem'}
            </button>
            <button 
              type="button" 
              onClick={() => setMostrarForm(false)}
              className="botao-cancelar"
            >
              ❌ Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Componente lista de ordens
function ListaOrdens() {
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
        carregarOrdens(); // Recarregar lista
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };

  const deletarOrdem = async (id, codigo) => {
    // Usar window.confirm explicitamente
    const confirmacao = window.confirm(`Tem certeza que deseja deletar a ordem ${codigo}?`);
    if (!confirmacao) return;

    try {
      const response = await fetch(`/api/ordens/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Ordem deletada com sucesso!');
        carregarOrdens(); // Recarregar lista
      } else {
        alert('❌ Erro: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro: ' + error.message);
    }
  };

  useEffect(() => {
    carregarOrdens();
  }, []);

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

// Componente para detalhes da ordem e subetapas
function DetalhesOrdem({ ordemId, onVoltar }) {
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

// Componente para criar nova subetapa
function NovaSubetapa({ ordemId, onSubetapaCriada }) {
  const [formData, setFormData] = useState({
    numero_etapa: '',
    descricao: '',
    item_codigo: '',
    criado_por: 'OPERADOR'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/ordens/${ordemId}/subetapas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Subetapa criada com sucesso!');
        onSubetapaCriada();
      } else {
        alert('❌ Erro: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nova-subetapa">
      <h3>➕ Nova Subetapa</h3>
      <form onSubmit={handleSubmit} className="formulario-inline">
        <input
          type="number"
          placeholder="Nº Etapa (1-98)"
          value={formData.numero_etapa}
          onChange={(e) => setFormData({...formData, numero_etapa: e.target.value})}
          min="1" max="98"
          required
        />
        <input
          type="text"
          placeholder="Item/Código"
          value={formData.item_codigo}
          onChange={(e) => setFormData({...formData, item_codigo: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="Descrição"
          value={formData.descricao}
          onChange={(e) => setFormData({...formData, descricao: e.target.value})}
        />
        <button type="submit" disabled={loading} className="botao-salvar">
          {loading ? '⏳' : '💾'} Criar
        </button>
      </form>
    </div>
  );
}

// Componente para registrar peso
function RegistroPeso({ subetapaId, onPesoRegistrado, onCancelar }) {
  const [formData, setFormData] = useState({
    operador: '',
    peso_kg: '',
    quantidade_unidades: '',
    tipo_medida: 'KG',
    observacoes: '',
    estacao: 'WEB'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/subetapas/${subetapaId}/pesos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Peso registrado com sucesso!');
        onPesoRegistrado();
      } else {
        alert('❌ Erro: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registro-peso-modal">
      <div className="modal-content">
        <h3>⚖️ Registrar Peso</h3>
        <form onSubmit={handleSubmit} className="formulario">
          <div className="form-grupo">
            <label>Operador:</label>
            <input
              type="text"
              value={formData.operador}
              onChange={(e) => setFormData({...formData, operador: e.target.value.toUpperCase()})}
              placeholder="Nome do operador"
              required
            />
          </div>
          
          <div className="form-grupo">
            <label>Peso (kg):</label>
            <input
              type="number"
              step="0.001"
              value={formData.peso_kg}
              onChange={(e) => setFormData({...formData, peso_kg: e.target.value})}
              placeholder="0.000"
              required
            />
          </div>

          <div className="form-grupo">
            <label>Observações:</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Observações opcionais..."
              rows="2"
            />
          </div>

          <div className="form-acoes">
            <button type="submit" disabled={loading} className="botao-salvar">
              {loading ? '⏳ Registrando...' : '💾 Registrar'}
            </button>
            <button type="button" onClick={onCancelar} className="botao-cancelar">
              ❌ Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente interface operacional para tablets
function InterfaceOperacional() {
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

// Componente para operação da ordem selecionada
function OperacaoOrdem({ ordem, subetapas, offline, onVoltar, onSubetapaAtualizada }) {
  const [subetapaSelecionada, setSubetapaSelecionada] = useState(null);
  const [pesosOffline, setPesosOffline] = useState([]);

  const registrarPesoOffline = (peso) => {
    const novoPeso = {
      ...peso,
      id: Date.now(), // ID temporário
      offline: true,
      timestamp: new Date().toISOString()
    };
    
    const novosePesos = [...pesosOffline, novoPeso];
    setPesosOffline(novosePesos);
    
    // Salvar no localStorage
    localStorage.setItem('pesos_offline', JSON.stringify(novosePesos));
    
    alert('✅ Peso registrado offline! Será sincronizado quando conectar.');
  };

  return (
    <div className="operacao-ordem">
      {/* Header com info da ordem */}
      <div className="ordem-header-op">
        <button onClick={onVoltar} className="botao-voltar-op">
          ⬅️ VOLTAR
        </button>
        <div className="ordem-info-op">
          <h2>{ordem.codigo}</h2>
          <p>{ordem.linha_nome}</p>
        </div>
      </div>

      {/* Grid de subetapas */}
      <div className="subetapas-operacional">
        <h3>📍 Etapas de Produção</h3>
        <div className="etapas-grid">
          {subetapas.map(subetapa => (
            <div 
              key={subetapa.id}
              className="etapa-card-op"
              onClick={() => setSubetapaSelecionada(subetapa)}
            >
              <div className="etapa-numero">
                {subetapa.numero_etapa}
              </div>
              <div className="etapa-info">
                <h4>{subetapa.item_codigo}</h4>
                <p className="peso-atual">
                  {Number(subetapa.peso_total).toFixed(1)} kg
                </p>
                <p className="registros">
                  {subetapa.total_registros} registros
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal registro peso */}
      {subetapaSelecionada && (
        <RegistroPesoOperacional
          subetapa={subetapaSelecionada}
          offline={offline}
          onPesoRegistrado={(peso) => {
            if (offline) {
              registrarPesoOffline(peso);
            } else {
              // Registrar online normalmente
              onSubetapaAtualizada();
            }
            setSubetapaSelecionada(null);
          }}
          onCancelar={() => setSubetapaSelecionada(null)}
        />
      )}
    </div>
  );
}

// Componente registro peso operacional
function RegistroPesoOperacional({ subetapa, offline, onPesoRegistrado, onCancelar }) {
  const [peso, setPeso] = useState('');
  const [operador, setOperador] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const dadosPeso = {
      subetapa_id: subetapa.id,
      operador: operador.toUpperCase(),
      peso_kg: parseFloat(peso),
      observacoes,
      estacao: 'TABLET'
    };

    if (offline) {
      onPesoRegistrado(dadosPeso);
    } else {
      try {
        const response = await fetch(`/api/subetapas/${subetapa.id}/pesos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosPeso)
        });

        const data = await response.json();
        if (data.success) {
          onPesoRegistrado(dadosPeso);
        } else {
          alert('❌ Erro: ' + data.error);
        }
      } catch (error) {
        // Se falhar, registrar offline
        onPesoRegistrado(dadosPeso);
      }
    }
  };

  return (
    <div className="modal-peso-operacional">
      <div className="modal-content-op">
        <h2>⚖️ Registrar Peso</h2>
        <div className="etapa-info-modal">
          <p><strong>Etapa {subetapa.numero_etapa}:</strong> {subetapa.item_codigo}</p>
          <p><strong>Peso atual:</strong> {Number(subetapa.peso_total).toFixed(1)} kg</p>
        </div>

        <form onSubmit={handleSubmit} className="form-peso-op">
          <div className="input-group-op">
            <label>👤 Operador:</label>
            <input
              type="text"
              value={operador}
              onChange={(e) => setOperador(e.target.value)}
              placeholder="Seu nome"
              required
              autoComplete="off"
            />
          </div>

          <div className="input-group-op">
            <label>⚖️ Peso (kg):</label>
            <input
              type="number"
              step="0.1"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="0.0"
              required
              autoFocus
            />
          </div>

          <div className="input-group-op">
            <label>📝 Observações:</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações (opcional)"
              rows="2"
            />
          </div>

          <div className="botoes-op">
            <button type="submit" className="botao-confirmar-op">
              ✅ CONFIRMAR
            </button>
            <button type="button" onClick={onCancelar} className="botao-cancelar-op">
              ❌ CANCELAR
            </button>
          </div>
        </form>

        {offline && (
          <div className="aviso-offline">
            📴 Modo offline - dados serão sincronizados quando conectar
          </div>
        )}
      </div>
    </div>
  );
}

// Componente para sincronizar dados offline
function SincronizadorOffline() {
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


// Componente Dashboard Gerencial
function DashboardGerencial() {
  const [metricas, setMetricas] = useState({});
  const [producaoDiaria, setProducaoDiaria] = useState([]);
  const [performanceLinhas, setPerformanceLinhas] = useState([]);
  const [rankingOperadores, setRankingOperadores] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar todas as métricas em paralelo
      const [metricasRes, producaoRes, linhasRes, operadoresRes] = await Promise.all([
        fetch('/api/dashboard/metricas'),
        fetch('/api/dashboard/producao-diaria'),
        fetch('/api/dashboard/performance-linhas'),
        fetch('/api/dashboard/ranking-operadores')
      ]);

      const [metricasData, producaoData, linhasData, operadoresData] = await Promise.all([
        metricasRes.json(),
        producaoRes.json(),
        linhasRes.json(),
        operadoresRes.json()
      ]);

      if (metricasData.success) setMetricas(metricasData.data);
      if (producaoData.success) setProducaoDiaria(producaoData.data);
      if (linhasData.success) setPerformanceLinhas(linhasData.data);
      if (operadoresData.success) setRankingOperadores(operadoresData.data);

    } catch (error) {
      console.error('Erro carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
    
    // Atualizar dados a cada 5 minutos
    const interval = setInterval(carregarDados, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">📊</div>
        <h2>Carregando Dashboard...</h2>
      </div>
    );
  }

  // Dados para gráfico de produção diária
  const dadosProducaoDiaria = {
    labels: producaoDiaria.map(item => item.data_formatada),
    datasets: [
      {
        label: 'Produção (kg)',
        data: producaoDiaria.map(item => parseFloat(item.producao) || 0),
        backgroundColor: 'rgba(102, 126, 234, 0.6)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2,
        fill: true,
      }
    ]
  };

  // Dados para gráfico performance por linha
  const dadosPerformanceLinhas = {
    labels: performanceLinhas.map(linha => linha.linha),
    datasets: [
      {
        label: 'Rendimento (%)',
        data: performanceLinhas.map(linha => parseFloat(linha.rendimento) || 0),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(20, 184, 166, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(132, 204, 22, 0.8)',
          'rgba(99, 102, 241, 0.8)',
        ],
        borderWidth: 2,
      }
    ]
  };

  // Dados para gráfico status ordens
  const dadosStatusOrdens = {
    labels: ['Abertas', 'Em Andamento', 'Fechadas'],
    datasets: [
      {
        data: [
          parseInt(metricas.ordens_abertas) || 0,
          parseInt(metricas.ordens_andamento) || 0,
          parseInt(metricas.ordens_fechadas) || 0,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderWidth: 2,
      }
    ]
  };

  const opcoesGrafico = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  return (
    <div className="dashboard-gerencial">
      {/* Header do Dashboard */}
      <div className="dashboard-header">
        <h1>📊 Dashboard Gerencial</h1>
        <div className="ultima-atualizacao">
          Última atualização: {new Date().toLocaleString('pt-BR')}
        </div>
        <button onClick={carregarDados} className="botao-atualizar">
          🔄 Atualizar
        </button>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="metricas-cards">
        <div className="metrica-card producao">
          <div className="metrica-icone">🏭</div>
          <div className="metrica-info">
            <h3>Produção Hoje</h3>
            <div className="metrica-valor">
              {parseFloat(metricas.producao_hoje || 0).toLocaleString('pt-BR')} kg
            </div>
          </div>
        </div>

        <div className="metrica-card rendimento">
          <div className="metrica-icone">📈</div>
          <div className="metrica-info">
            <h3>Rendimento Médio</h3>
            <div className="metrica-valor">
              {parseFloat(metricas.rendimento_geral || 0).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="metrica-card ordens">
          <div className="metrica-icone">📋</div>
          <div className="metrica-info">
            <h3>Ordens Ativas</h3>
            <div className="metrica-valor">
              {(parseInt(metricas.ordens_abertas || 0) + parseInt(metricas.ordens_andamento || 0))}
            </div>
          </div>
        </div>

        <div className="metrica-card operadores">
          <div className="metrica-icone">👥</div>
          <div className="metrica-info">
            <h3>Operadores Ativos</h3>
            <div className="metrica-valor">
              {parseInt(metricas.total_operadores || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="graficos-container">
        {/* Gráfico Produção Diária */}
        <div className="grafico-card">
          <h3>📈 Produção Últimos 7 Dias</h3>
          <div className="grafico-wrapper">
            <Line data={dadosProducaoDiaria} options={opcoesGrafico} />
          </div>
        </div>

        {/* Gráfico Performance Linhas */}
        <div className="grafico-card">
          <h3>🏭 Rendimento por Linha</h3>
          <div className="grafico-wrapper">
            <Bar data={dadosPerformanceLinhas} options={opcoesGrafico} />
          </div>
        </div>

        {/* Gráfico Status Ordens */}
        <div className="grafico-card status-ordens">
          <h3>📊 Status das Ordens</h3>
          <div className="grafico-wrapper">
            <Doughnut data={dadosStatusOrdens} options={opcoesGrafico} />
          </div>
        </div>
      </div>

      {/* Tabelas de Dados */}
      <div className="tabelas-container">
        {/* Performance por Linha */}
        <div className="tabela-card">
          <h3>🏭 Performance das Linhas (30 dias)</h3>
          <div className="tabela-scroll">
            <table className="tabela-dashboard">
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Ordens</th>
                  <th>Entrada (kg)</th>
                  <th>Saída (kg)</th>
                  <th>Rendimento</th>
                  <th>Tempo Médio</th>
                </tr>
              </thead>
              <tbody>
                {performanceLinhas.map((linha, index) => (
                  <tr key={index}>
                    <td><strong>{linha.linha}</strong></td>
                    <td>{linha.total_ordens}</td>
                    <td>{parseFloat(linha.peso_entrada || 0).toLocaleString('pt-BR')}</td>
                    <td>{parseFloat(linha.peso_saida || 0).toLocaleString('pt-BR')}</td>
                    <td>
                      <span className={parseFloat(linha.rendimento) >= 80 ? 'rendimento-bom' : 'rendimento-baixo'}>
                        {parseFloat(linha.rendimento || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td>{linha.tempo_medio_horas || 0}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ranking Operadores */}
        <div className="tabela-card">
          <h3>👥 Top Operadores (30 dias)</h3>
          <div className="tabela-scroll">
            <table className="tabela-dashboard">
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Operador</th>
                  <th>Registros</th>
                  <th>Peso Total (kg)</th>
                  <th>Dias Ativos</th>
                  <th>Média/Registro</th>
                </tr>
              </thead>
              <tbody>
                {rankingOperadores.map((operador, index) => (
                  <tr key={index}>
                    <td>
                      <span className="posicao">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                      </span>
                    </td>
                    <td><strong>{operador.operador}</strong></td>
                    <td>{operador.total_registros}</td>
                    <td>{parseFloat(operador.peso_total_registrado).toLocaleString('pt-BR')}</td>
                    <td>{operador.dias_ativos}</td>
                    <td>{parseFloat(operador.peso_medio_por_registro).toFixed(1)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}



function App() {
  const [linhas, setLinhas] = useState([]);
  const [ordemSelecionada, setOrdemSelecionada] = useState(null);
  const [modoOperacional, setModoOperacional] = useState(false);
  const [mostrarDashboard, setMostrarDashboard] = useState(false);
  const [modoGestao, setModoGestao] = useState(false);

  // Função global para ver detalhes
  window.verDetalhes = (ordemId) => {
    setOrdemSelecionada(ordemId);
  };

  useEffect(() => {
    fetch('/api/linhas-producao')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setLinhas(data.data);
        }
      })
      .catch(err => console.error('Erro carregar linhas:', err));
  }, []);

  // Se dashboard ativado, mostrar dashboard
  if (mostrarDashboard) {
    return (
      <div className="App">
        <header className="App-header">
        <h1>PRODATA - MATA NORTE</h1>
        <div className="botoes-principais">
          <button 
            onClick={() => {
              setModoGestao(true);
              setMostrarDashboard(false);
            }}
            className="botao-dashboard"
          >
            ⚙️ GESTÃO
          </button>
          
          <button 
            onClick={() => {
              setModoOperacional(true);
              setMostrarDashboard(false);
            }}
            className="botao-dashboard"
          >
            📱 MODO TABLET
          </button>
        </div>
        </header>
        <DashboardGerencial />
      </div>
    );
  }

  // Se modo operacional ativado, mostrar interface tablet
  if (modoOperacional) {
    return (
      <div className="App">
        <header className="App-header">
        <h1>PRODATA - MATANORTE</h1>
        <div className="botoes-principais">
          <button 
            onClick={() => {
              setModoGestao(true);
              setModoOperacional(false);
            }}
            className="botao-dashboard"
          >
            ⚙️ GESTÃO
          </button>
          <button 
            onClick={() => {
              setMostrarDashboard(true);
              setModoOperacional(false);
            }}
            
            className="botao-dashboard"
          >
            📊 DASHBOARD
          </button>
        </div>
        </header>
        <InterfaceOperacional onVoltar={() => {
          setModoOperacional(false);
          setModoGestao(true);
        }} />
      </div>
    );
  }

  // Se tem ordem selecionada, mostrar detalhes
  if (ordemSelecionada) {
    return (
      <div className="App">
        <DetalhesOrdem 
          ordemId={ordemSelecionada} 
          onVoltar={() => setOrdemSelecionada(null)}
        />
      </div>
    );
  }

  // Se modo gestão desativado, mostrar seletor de modo
  if (modoGestao) {
    return (
    <div className="App">
      <header className="App-header">
        <h1>PRODATA - MATA NORTE</h1>
        <div className="botoes-principais">
          <button 
            onClick={() => {
              setMostrarDashboard(true);
              setModoGestao(false);
            }}
            
            className="botao-dashboard"
          >
            📊 DASHBOARD
          </button>
          
          <button 
            onClick={() => {
              setModoOperacional(true);
              setModoGestao(false);
            }}
            className="botao-dashboard"
          >
            📱 MODO TABLET
          </button>
        </div>
      </header>

      <main className="App-main">
        <StatusSistema />
        <NovaOrdem 
          linhas={linhas} 
          onOrdemCriada={() => window.location.reload()} 
        />
        <ListaOrdens />
        <LinhasProducao />
        <ProdutosSAP />
      </main>

      <footer className="App-footer">
        <p>💻 Desenvolvido em React + Node.js + PostgreSQL + SAP B1</p>
        <p>📅 {new Date().toLocaleDateString('pt-BR')} - Sistema em desenvolvimento</p>
      </footer>

      {/* Sincronizador offline */}
      <SincronizadorOffline />
    </div>
  );
  }

  // Tela inicial (home) - Seletor de modos CORRETO
  return (
    <div className="App">
      <header className="App-header">
        <h1>PRODATA - MATA NORTE</h1>
        <div className="botoes-principais">
          <button 
            onClick={() => setModoGestao(true)}
            className="botao-dashboard"
          >
            ⚙️ GESTÃO
          </button>
          
          <button 
            onClick={() => setMostrarDashboard(true)}
            className="botao-dashboard"
          >
            📊 DASHBOARD
          </button>
          
          <button 
            onClick={() => setModoOperacional(true)}
            className="botao-dashboard"
          >
            📱 MODO TABLET
          </button>
        </div>
      </header>

      <main className="App-main">
        <div className="status-sistema">
          <h2>📊 Modos Disponíveis</h2>
          <div className="modos-explicacao">
            <div className="modo-card">
              <h3>⚙️ Gestão</h3>
              <p>Criar ordens de produção, gerenciar subetapas, acompanhar rendimentos e relatórios completos</p>
            </div>
            <div className="modo-card">
              <h3>📊 Dashboard</h3>
              <p>Métricas executivas, gráficos de performance e KPIs em tempo real</p>
            </div>
            <div className="modo-card">
              <h3>📱 Tablet</h3>
              <p>Interface operacional otimizada para operadores no chão de fábrica</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="App-footer">
        <p>💻 Desenvolvido em React + Node.js + PostgreSQL + SAP B1</p>
        <p>📅 {new Date().toLocaleDateString('pt-BR')} - Sistema operacional</p>
      </footer>
    </div>
  );
}


export default App;
