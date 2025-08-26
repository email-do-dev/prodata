import React, { useState, useEffect } from 'react';
import Select from 'react-select'; 

export function NovaOrdem({ onOrdemCriada, linhas }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    linha_producao_id: null,
    item_entrada: null,
    item_saida: null,
    quantidade_inicial: '',
    executor: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        linha_producao_id: formData.linha_producao_id?.value || '',
        item_entrada: formData.item_entrada?.label || '',
        item_saida: formData.item_saida?.label || '',
        quantidade_inicial: parseFloat(formData.quantidade_inicial) || 0,
        executor: formData.executor || ''
      };

      const response = await fetch('/api/ordens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {

        alert(`✅ ${data.message}`);
        setFormData({
          linha_producao_id: null,
          item_entrada: null,
          item_saida: null,
          quantidade_inicial: '',
          executor: ''
        });
        setMostrarForm(false);
        onOrdemCriada();
      } else {
        console.log('Erro ao criar ordem:', data);
        alert('❌ Erro: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro de conexão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const [produtosEntrada, setProdutosEntrada] = useState([]);
  const [produtosSaida, setProdutosSaida] = useState([]);
  const [error, setError] = useState(null);

  const carregarProdutosEntrada = () => {
    setLoading(true);
    setError(null);

    fetch('/api/sap/produtos-entrada')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setProdutosEntrada(data.data);
        } else {
          setError('SAP temporariamente indisponível');
          setProdutosEntrada([]);
        }
      })
      .catch(() => {
        setError('SAP offline - dados indisponíveis');
        setProdutosEntrada([]);
      })
      .finally(() => setLoading(false));
  };

  const carregarProdutosSaida = () => {
    setLoading(true);
    setError(null);

    fetch('/api/sap/produtos-saida')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setProdutosSaida(data.data);
        } else {
          setError('SAP temporariamente indisponível');
          setProdutosSaida([]);
        }
      })
      .catch(() => {
        setError('SAP offline - dados indisponíveis');
        setProdutosSaida([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarProdutosEntrada();
    carregarProdutosSaida();
  }, []);

  const formatarOpcoes = (produtos) =>
    produtos.map(p => ({
      value: p.codigo || p.id,
      label: `${p.codigo ? `[${p.codigo}] ` : ''}${p.nome}`
    }));

  const formatarLinhas = (linhas) =>
    linhas.map(linha => ({
      value: linha.id,
      label: linha.nome
    }));

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
          {/* Linha de Produção */}
          <div className="form-grupo">
            <label>Linha de Produção:</label>
            <Select
              options={formatarLinhas(linhas)}
              value={formData.linha_producao_id}
              onChange={(selected) => setFormData({ ...formData, linha_producao_id: selected })}
              placeholder="Selecione a linha"
              isClearable
              noOptionsMessage={() => 'Nenhuma linha encontrada'}
            />
          </div>

          {/* Item de Entrada */}
          <div className="form-grupo">
            <label>Item de Entrada:</label>
            <Select
              options={formatarOpcoes(produtosEntrada)}
              value={formData.item_entrada}
              onChange={(selected) => setFormData({ ...formData, item_entrada: selected })}
              placeholder="Digite código ou nome do produto"
              isClearable
              noOptionsMessage={() => 'Nenhum produto encontrado'}
              filterOption={(option, inputValue) => {
                const input = inputValue.toLowerCase();
                return (
                  option.label.toLowerCase().includes(input) ||
                  option.value.toString().toLowerCase().includes(input)
                );
              }}
            />
          </div>

          {/* Item de Saída */}
          <div className="form-grupo">
            <label>Item de Saída:</label>
            <Select
              options={formatarOpcoes(produtosSaida)}
              value={formData.item_saida}
              onChange={(selected) => setFormData({ ...formData, item_saida: selected })}
              placeholder="Digite código ou nome do produto"
              isClearable
              noOptionsMessage={() => 'Nenhum produto encontrado'}
              filterOption={(option, inputValue) => {
                const input = inputValue.toLowerCase();
                return (
                  option.label.toLowerCase().includes(input) ||
                  option.value.toString().toLowerCase().includes(input)
                );
              }}
            />
          </div>

          {/* Quantidade Inicial */}
          <div className="form-grupo">
            <label>Quantidade Inicial:</label>
            <input
              type="number"
              name="quantidade_inicial"
              value={formData.quantidade_inicial}
              onChange={(e) =>
                setFormData({ ...formData, quantidade_inicial: e.target.value })
              }
              placeholder="0.000"
              step="0.001"
              min="0"
            />
          </div>

          {/* Observações */}
          <div className="form-grupo">
            <label>Enviado para:</label>
            <textarea
              name="executor"
              value={formData.executor}
              onChange={(e) =>
                setFormData({ ...formData, executor: e.target.value })
              }
              placeholder="Nome do executor..."
              rows="3"
            />
          </div>

          {/* Botões */}
          <div className="form-acoes">
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="botao-cancelar"
            >
              ❌ Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="botao-salvar"
            >
              {loading ? '⏳ Criando...' : '💾 Criar Ordem'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}