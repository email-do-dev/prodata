import React, { useState, useEffect } from 'react'
import Select from 'react-select'

export function NovaOrdem({ onOrdemCriada, linhas }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    linha_producao_id: null,
    item_entrada: null,
    item_saida: null,
    quantidade_inicial: '',
    executor: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        linha_producao_id: formData.linha_producao_id?.value || '',
        item_entrada: formData.item_entrada?.label || '',
        item_saida: formData.item_saida?.label || '',
        quantidade_inicial: parseFloat(formData.quantidade_inicial) || 0,
        executor: formData.executor || ''
      }

      const response = await fetch('/api/ordens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ ${data.message}`)
        setFormData({
          linha_producao_id: null,
          item_entrada: null,
          item_saida: null,
          quantidade_inicial: '',
          executor: ''
        })
        setMostrarForm(false)
        onOrdemCriada()
      } else {
        console.log('Erro ao criar ordem:', data)
        alert('❌ Erro: ' + data.error)
      }
    } catch (error) {
      alert('❌ Erro de conexão: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const [produtosEntrada, setProdutosEntrada] = useState([])
  const [produtosSaida, setProdutosSaida] = useState([])
  const [error, setError] = useState(null)

  const carregarProdutosEntrada = () => {
    setLoading(true)
    setError(null)

    fetch('/api/sap/produtos-entrada')
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setProdutosEntrada(data.data)
        } else {
          setError('SAP temporariamente indisponível')
          setProdutosEntrada([])
        }
      })
      .catch(() => {
        setError('SAP offline - dados indisponíveis')
        setProdutosEntrada([])
      })
      .finally(() => setLoading(false))
  }

  const carregarProdutosSaida = () => {
    setLoading(true)
    setError(null)

    fetch('/api/sap/produtos-saida')
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setProdutosSaida(data.data)
        } else {
          setError('SAP temporariamente indisponível')
          setProdutosSaida([])
        }
      })
      .catch(() => {
        setError('SAP offline - dados indisponíveis')
        setProdutosSaida([])
      })
      .finally(() => setLoading(false))
  }

  const handleAddPeso = (valor) => {
    const pesoAtual = parseFloat(formData.quantidade_inicial) || 0
    const novoPeso = (pesoAtual + valor).toFixed(1)
    setFormData({ ...formData, quantidade_inicial: novoPeso })
  }
  const handleClearPeso = () => {
    setFormData({ ...formData, quantidade_inicial: '' })
  }

  const [operadores, setOperadores] = useState([])
  const [loadingOperadores, setLoadingOperadores] = useState(true)
  useEffect(() => {
    const fetchOperadores = async () => {
      try {
        const response = await fetch('/api/operadores')
        const data = await response.json()
        if (data.success) {
          setOperadores(data.data)
        } else {
          console.error('Erro ao carregar operadores:', data.error)
        }
      } catch (error) {
        console.error('Erro ao carregar operadores:', error)
      } finally {
        setLoadingOperadores(false)
      }
    }

    fetchOperadores()
  }, [])
  useEffect(() => {
    carregarProdutosEntrada()
    carregarProdutosSaida()
  }, [])

  const formatarOpcoes = (produtos) =>
    produtos.map((p) => ({
      value: p.codigo || p.id,
      label: `${p.codigo ? `[${p.codigo}] ` : ''}${p.nome}`
    }))

  const formatarLinhas = (linhas) =>
    linhas.map((linha) => ({
      value: linha.id,
      label: linha.nome
    }))
  const customStyles = {
    option: (provided, state) => ({
      ...provided,
      color: '#171680',
      backgroundColor: state.isFocused ? '#eee' : 'white',
      display: 'flex'
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#171680',
      display: 'flex',
      justifyContent: 'flex-start',
      textAlign: 'left'
    }),
    placeholder: (provided) => ({
      ...provided,
      display: 'flex',
      justifyContent: 'flex-start',
      textAlign: 'left'
    })
  }

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
              onChange={(selected) =>
                setFormData({ ...formData, linha_producao_id: selected })
              }
              placeholder="Selecione a linha"
              isClearable
              noOptionsMessage={() => 'Nenhuma linha encontrada'}
              styles={customStyles}
            />
          </div>

          {/* Item de Entrada */}
          <div className="form-grupo">
            <label>Item de Entrada:</label>
            <Select
              options={formatarOpcoes(produtosEntrada)}
              value={formData.item_entrada}
              onChange={(selected) =>
                setFormData({ ...formData, item_entrada: selected })
              }
              placeholder="Digite código ou nome do produto"
              isClearable
              noOptionsMessage={() => 'Nenhum produto encontrado'}
              filterOption={(option, inputValue) => {
                const input = inputValue.toLowerCase()
                return (
                  option.label.toLowerCase().includes(input) ||
                  option.value.toString().toLowerCase().includes(input)
                )
              }}
              styles={customStyles}
            />
          </div>

          {/* Item de Saída */}
          <div className="form-grupo">
            <label>Item de Saída:</label>
            <Select
              options={formatarOpcoes(produtosSaida)}
              value={formData.item_saida}
              onChange={(selected) =>
                setFormData({ ...formData, item_saida: selected })
              }
              placeholder="Digite código ou nome do produto"
              isClearable
              noOptionsMessage={() => 'Nenhum produto encontrado'}
              filterOption={(option, inputValue) => {
                const input = inputValue.toLowerCase()
                return (
                  option.label.toLowerCase().includes(input) ||
                  option.value.toString().toLowerCase().includes(input)
                )
              }}
              styles={customStyles}
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

          {/* Botoes quantidade */}
          <div
            className="botoes-peso"
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '8px',
              flexWrap: 'wrap'
            }}
          >
            {[5, 10, 20].map((valor) => (
              <button
                type="button"
                key={valor}
                onClick={() => handleAddPeso(valor)}
                style={{
                  flex: '1',
                  padding: '10px',
                  fontSize: '1rem',
                  background: '#1A4E9A',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                +{valor}
              </button>
            ))}

            {/* <button */}
            {/*   className="botoes-peso" */}
            {/*   style={{ */}
            {/*     flex: '1', */}
            {/*     padding: '10px', */}
            {/*     fontSize: '1rem', */}
            {/*     background: '#1A4E9A', */}
            {/*     color: '#fff', */}
            {/*     border: 'none', */}
            {/*     borderRadius: '6px', */}
            {/*     cursor: 'pointer' */}
            {/*   }} */}
            {/* > */}
            {/*   Ok */}
            {/* </button> */}

            <button
              type="button"
              onClick={handleClearPeso}
              style={{
                flex: '1',
                padding: '10px',
                fontSize: '1rem',
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Limpar
            </button>
          </div>

          {loadingOperadores ? (
            <p>⏳ Carregando operadores...</p>
          ) : (
            <div className="form-grupo">
              <label>Enviado para:</label>
              <Select
                options={formatarOpcoes(operadores)}
                value={formData.criado_por}
                onChange={(selected) =>
                  setFormData({ ...formData, criado_por: selected })
                }
                placeholder="Digite código ou nome do operador"
                isClearable
                noOptionsMessage={() => 'Nenhum operador encontrado'}
                filterOption={(option, inputValue) => {
                  const input = inputValue.toLowerCase()
                  return (
                    option.label.toLowerCase().includes(input) ||
                    option.value.toString().toLowerCase().includes(input)
                  )
                }}
                styles={customStyles}
              />
            </div>
          )}

          {/* Botões */}
          <div className="form-acoes">
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="botao-cancelar"
            >
              ❌ Cancelar
            </button>
            <button type="submit" disabled={loading} className="botao-salvar">
              {loading ? '⏳ Criando...' : '💾 Criar Ordem'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

