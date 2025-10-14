import React, { useState, useEffect } from 'react'

export function NovaSubetapa({
  ordemId,
  onSubetapaCriada,
  setShowNovaSubetapa,
  showNovaSubetapa,
  codigoOrdem
}) {
  const [formData, setFormData] = useState({
    descricao: '',
    item_codigo: codigoOrdem || '',
    criado_por: ''
  })
  const [operadores, setOperadores] = useState([])
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.criado_por) {
      alert('Selecione um operador!')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/ordens/${ordemId}/subetapas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        alert('✅ Subetapa criada com sucesso!')
        onSubetapaCriada()
      } else {
        alert('❌ Erro: ' + data.error)
      }
    } catch (error) {
      alert('❌ Erro: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      item_codigo: codigoOrdem || ''
    }))
  }, [codigoOrdem])

  const descricaoOptions = [
    { value: 'bater', label: 'Bater' },
    { value: 'corte', label: 'Corte' },
    { value: 'cozimento', label: 'Cozimento' },
    { value: 'envase', label: 'Envase' },
    { value: 'evisceramento', label: 'Evisceramento' },
    { value: 'filetamento', label: 'Filetamento' },
    { value: 'glaiser', label: 'Glaiser' },
    { value: 'hidratacao', label: 'Hidratação' },
    { value: 'recravacao', label: 'Recravação' },
    { value: 'salga', label: 'Salga' },
    { value: 'tirar_pele', label: 'Tirar Pele' }
  ]

  if (!showNovaSubetapa) return null

  return (
    <div
      className="dialog-overlay"
      onClick={() => setShowNovaSubetapa(false)} // Fecha clicando fora
    >
      <div
        className="dialog-content"
        onClick={(e) => e.stopPropagation()} // Impede que clique no conteúdo feche
      >
        <h3>➕ Nova Subetapa</h3>
        <form onSubmit={handleSubmit} className="form-nova-subetapa-tablet">
          <label htmlFor="item_codigo" className="label-form-nova-subetapa">
            Código
          </label>
          <input
            id="item_codigo"
            type="text"
            className="input-form-nova-subetapa-tablet"
            placeholder="Item/Código"
            value={formData.item_codigo}
            onChange={(e) =>
              setFormData({ ...formData, item_codigo: e.target.value })
            }
            required
          />

          <label htmlFor="descricao" className="label-form-nova-subetapa">
            Descrição
          </label>
          <select
            id="descricao"
            className="input-form-nova-subetapa-tablet"
            value={formData.descricao}
            onChange={(e) =>
              setFormData({ ...formData, descricao: e.target.value })
            }
            required
          >
            <option value="">Selecione uma descrição</option>
            {descricaoOptions.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          {loadingOperadores ? (
            <p>⏳ Carregando operadores...</p>
          ) : (
            <>
              <label htmlFor="operador" className="label-form-nova-subetapa">
                Operador
              </label>
              <select
                id="operador"
                className="input-form-nova-subetapa-tablet"
                value={formData.criado_por}
                onChange={(e) =>
                  setFormData({ ...formData, criado_por: e.target.value })
                }
                required
              >
                <option value="">Selecione Operador</option>
                {operadores.map((op) => (
                  <option key={op.id} value={op.nome}>
                    {op.nome} (Mat: {op.matricula})
                  </option>
                ))}
              </select>
            </>
          )}

          <div className="buttons-section-form-nova-subetapa-tablet">
            <button
              type="button"
              className="botao-cancelar-op"
              onClick={() => setShowNovaSubetapa(false)}
            >
              ❌ Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="botao-confirmar-op"
            >
              {loading ? '⏳' : '💾'} Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
