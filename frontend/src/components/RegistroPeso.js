import React, { useState, useEffect } from 'react'

export function RegistroPeso({ subetapaId, onPesoRegistrado, onCancelar }) {
  const [formData, setFormData] = useState({
    operador_id: '',
    peso_kg: '',
    quantidade_unidades: '',
    tipo_medida: 'KG',
    executor: '',
    observacoes: '',
    estacao: 'WEB'
  })

  const [operadores, setOperadores] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingOperadores, setLoadingOperadores] = useState(true)

  // Carregar operadores
  useEffect(() => {
    const fetchOperadores = async () => {
      try {
        const response = await fetch('/api/operadores')
        const data = await response.json()
        if (data.success) {
          setOperadores(data.data)
        }
      } catch (error) {
        console.error('Erro ao buscar operadores:', error)
      } finally {
        setLoadingOperadores(false)
      }
    }
    fetchOperadores()
  }, [])

  // Função para adicionar peso com base no botão clicado
  const handleAddPeso = (valor) => {
    const pesoAtual = parseFloat(formData.peso_kg) || 0
    const novoPeso = (pesoAtual + valor).toFixed(3)
    setFormData({ ...formData, peso_kg: novoPeso })
  }

  // Função para limpar peso
  const handleClearPeso = () => {
    setFormData({ ...formData, peso_kg: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.operador_id) {
      alert('Selecione um operador!')
      return
    }

    setLoading(true)
    try {
      const operadorSelecionado = operadores.find(
        (op) => op.id === parseInt(formData.operador_id)
      )

      if (!operadorSelecionado) {
        alert('Operador inválido!')
        setLoading(false)
        return
      }

      const payload = {
        operador: operadorSelecionado.nome,
        peso_kg: formData.peso_kg,
        quantidade_unidades: formData.quantidade_unidades,
        tipo_medida: formData.tipo_medida,
        observacoes: formData.observacoes,
        estacao: formData.estacao
      }

      const response = await fetch(`/api/subetapas/${subetapaId}/pesos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (data.success) {
        alert('✅ Peso registrado com sucesso!')
        onPesoRegistrado()
      } else {
        alert('❌ Erro: ' + data.error)
      }
    } catch (error) {
      alert('❌ Erro: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="registro-peso-modal">
      <div className="modal-content">
        <h3>⚖️ Registrar Peso</h3>
        <form onSubmit={handleSubmit} className="formulario">
          {/* SELECT DE OPERADORES */}
          <div className="form-grupo">
            <label>Operador:</label>
            {loadingOperadores ? (
              <p>⏳ Carregando operadores...</p>
            ) : (
              <select
                value={formData.operador_id}
                onChange={(e) =>
                  setFormData({ ...formData, operador_id: e.target.value })
                }
                required
              >
                <option value="">Selecione um operador</option>
                {operadores.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.nome} (Matrícula: {op.matricula})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* PESO */}
          <div className="form-grupo">
            <label>Peso (kg):</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.001"
              value={formData.peso_kg}
              onChange={(e) =>
                setFormData({ ...formData, peso_kg: e.target.value })
              }
              placeholder="0.000"
              required
              style={{ fontSize: '1.5rem', textAlign: 'center' }}
            />

            {/* BOTÕES DE PESO */}
            <div
              className="botoes-peso"
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '8px',
                flexWrap: 'wrap'
              }}
            >
              {[10, 20, 30, 40].map((valor) => (
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
          </div>

          {/* OBSERVAÇÕES */}
          <div className="form-grupo">
            <label>Observações:</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
              placeholder="Observações opcionais..."
              rows="2"
            />
          </div>

          {/* BOTÕES */}
          <div className="form-acoes">
            <button type="submit" disabled={loading} className="botao-salvar">
              {loading ? '⏳ Registrando...' : '💾 Registrar'}
            </button>
            <button
              type="button"
              onClick={onCancelar}
              className="botao-cancelar"
            >
              ❌ Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

