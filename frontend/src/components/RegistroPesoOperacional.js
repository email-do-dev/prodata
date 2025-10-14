import React, { useState, useEffect } from 'react'

export function RegistroPesoOperacional({
  subetapa,
  offline,
  onPesoRegistrado,
  onCancelar
}) {
  const [formData, setFormData] = useState({
    operador_id: '',
    quantidade_unidades: '',
    executor_id: '',
    estacao: 'TABLET',
    posicao: 0
  })

  const [subtotal, setSubtotal] = useState(0)
  const [pesosRegistrados, setPesosRegistrados] = useState([])

  const [operadores, setOperadores] = useState([])
  const [loadingOperadores, setLoadingOperadores] = useState(true)

  const [posicaoLinha, setPosicaoLinha] = useState([])
  const [loadingPosicaoLinha, setLoadingPosicaoLinha] = useState(true)

  useEffect(() => {
    const fetchPosicaoLinha = async () => {
      try {
        const response = await fetch('/api/posicoes')
        const data = await response.json()
        if (data.success) setPosicaoLinha(data.data)
      } catch (error) {
        console.error('Erro ao buscar posições de linha:', error)
      } finally {
        setLoadingPosicaoLinha(false)
      }
    }
    fetchPosicaoLinha()
  }, [])

  useEffect(() => {
    const fetchOperadores = async () => {
      try {
        const response = await fetch('/api/operadores')
        const data = await response.json()
        if (data.success) setOperadores(data.data)
      } catch (error) {
        console.error('Erro ao buscar operadores:', error)
      } finally {
        setLoadingOperadores(false)
      }
    }
    fetchOperadores()
  }, [])

  const handleAddPeso = (valor) => {
    const pesoAtual = parseFloat(formData.quantidade_unidades) || 0
    const novoPeso = (pesoAtual + valor).toFixed(3)
    setFormData({ ...formData, quantidade_unidades: novoPeso })
  }

  const handleClearPeso = () => {
    setFormData({ ...formData, quantidade_unidades: '' })
  }

  const handleOk = () => {
    const peso = parseFloat(formData.quantidade_unidades) || 0
    if (peso <= 0) return

    setPesosRegistrados((prev) => [...prev, peso])
    setSubtotal((prev) => prev + peso)
    setFormData({ ...formData, quantidade_unidades: '' })
  }

  const handleRemovePeso = (index) => {
    const pesoRemovido = pesosRegistrados[index]
    setPesosRegistrados((prev) => prev.filter((_, i) => i !== index))
    setSubtotal((prev) => prev - pesoRemovido)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.operador_id) {
      alert('Selecione um operador!')
      return
    }

    const operadorSelecionado = operadores.find(
      (op) => op.id === parseInt(formData.operador_id)
    )

    if (!operadorSelecionado) {
      alert('Operador inválido!')
      return
    }

    const pesoFinal = subtotal + (parseFloat(formData.quantidade_unidades) || 0)

    const payload = {
      subetapa_id: subetapa.id,
      operador: operadorSelecionado.nome,
      peso_kg: pesoFinal,
      quantidade_unidades: pesoFinal,
      executor: formData.executor,
      estacao: formData.estacao,
      posicao: formData.posicao
    }

    if (offline) {
      onPesoRegistrado(payload)
    } else {
      try {
        const response = await fetch(`/api/subetapas/${subetapa.id}/pesos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        const data = await response.json()
        if (data.success) {
          onPesoRegistrado(payload)
          setSubtotal(0)
          setPesosRegistrados([])
        } else {
          alert('❌ Erro: ' + data.error)
        }
      } catch (error) {
        onPesoRegistrado(payload)
      }
    }
  }

  return (
    <div className="modal-peso-operacional">
      <div className="modal-peso-content-op">
        <h2>⚖️ Registrar Peso</h2>

        <div className="etapa-info-modal">
          <p>
            <strong>Etapa {subetapa.numero_etapa}:</strong>{' '}
            {subetapa.item_codigo}
          </p>
          <p>
            <strong>Peso atual:</strong>{' '}
            {Number(subetapa.peso_total).toFixed(1)} kg
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-peso-op">
          {/* SELECT DE OPERADORES */}
          <div className="input-group-op">
            <label>👤 Pesado por:</label>
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

          {/* INPUT PESO + BOTÕES */}
          <div className="input-group-op">
            <label>⚖️ Quantidade:</label>
            <input
              type="number"
              step="0.001"
              value={formData.quantidade_unidades}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quantidade_unidades: e.target.value
                })
              }
              placeholder="0.000"
            />
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
              <button
                type="button"
                onClick={handleOk}
                style={{
                  flex: '1',
                  padding: '10px',
                  fontSize: '1rem',
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Ok
              </button>
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

          {/* SUBTOTAL PARCIAL */}
          <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
            Subtotal parcial: {subtotal.toFixed(3)} kg
          </div>

          {/* LISTA DE PESOS REGISTRADOS */}
          <div
            style={{
              marginTop: '8px',
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid #ccc',
              borderRadius: '6px',
              padding: '8px',
              backgroundColor: '#f9f9f9'
            }}
          >
            {pesosRegistrados.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#555' }}>
                Nenhum peso registrado ainda.
              </p>
            ) : (
              pesosRegistrados
                .slice()
                .reverse()
                .map((peso, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                      borderBottom: '1px solid #eee'
                    }}
                  >
                    <span>{peso.toFixed(3)} kg</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePeso(index)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#dc3545',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      ✖
                    </button>
                  </div>
                ))
            )}
          </div>

          {/* SELECT DE POSIÇÕES */}
          <div className="input-group-op">
            <label>Posição:</label>
            {loadingPosicaoLinha ? (
              <p>⏳ Carregando posições de linha...</p>
            ) : (
              <select
                value={formData.posicao}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    posicao: parseInt(e.target.value)
                  })
                }
                required
              >
                <option value="">Selecione a posição</option>
                {posicaoLinha.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.descricao}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* AÇÕES */}
          <div className="botoes-acao-op">
            <button
              type="button"
              onClick={onCancelar}
              className="botao-cancelar-op"
            >
              ❌ CANCELAR
            </button>
            <button type="submit" className="botao-confirmar-op">
              ✅ CONFIRMAR
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
  )
}
