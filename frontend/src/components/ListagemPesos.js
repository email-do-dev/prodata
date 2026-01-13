import { X, Info, ArrowLeft, Pencil, Check, XCircle } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'

export function ListagemPesos({
  setIsListPesosOpen,
  subetapaPesos,
  onEditarPeso
}) {
  const [tick, setTick] = useState(0)
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [novoPeso, setNovoPeso] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [pesosLocais, setPesosLocais] = useState([])

  // Atualiza estado local quando o prop mudar
  useEffect(() => {
    const seguros = Array.isArray(subetapaPesos)
      ? subetapaPesos.filter((p) => p && typeof p === 'object')
      : []
    setPesosLocais(seguros)
  }, [subetapaPesos])

  // Atualiza a cada minuto para mostrar horas atualizadas
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  const handleCloseDialog = () => setIsListPesosOpen(false)

  const pesoFormatado = (peso) => {
    const formattedNumber = parseFloat(String(peso))
    return isNaN(formattedNumber)
      ? '-'
      : formattedNumber.toFixed(1).replace('.', ',')
  }

  const formatarHora = (dataISO) => {
    if (!dataISO) return '-'
    const data = new Date(dataISO)
    const horas = String(data.getHours()).padStart(2, '0')
    const minutos = String(data.getMinutes()).padStart(2, '0')
    const segundos = String(data.getSeconds()).padStart(2, '0')
    return `${horas}:${minutos}:${segundos}`
  }

  // 🧮 Agrupa os pesos por posição e soma os valores
  const pesosAgrupados = useMemo(() => {
    if (!Array.isArray(pesosLocais)) return []

    const mapa = new Map()
    for (const p of pesosLocais) {
      if (!p || typeof p !== 'object') continue // segurança extra
      const pos = p.posicao
      const pesoAtual = mapa.get(pos) || 0
      mapa.set(pos, pesoAtual + Number(p.peso_kg || 0))
    }

    return Array.from(mapa.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([posicao, pesoTotal]) => ({ posicao, pesoTotal }))
  }, [pesosLocais, tick])

  // 🎯 Filtra e organiza os pesos da posição selecionada
  const pesosDaPosicao = useMemo(() => {
    if (!selectedPosition || !Array.isArray(pesosLocais)) return []

    const filtrados = pesosLocais
      .filter((p) => p && p.posicao == selectedPosition)
      .map((p) => ({
        id: p.id,
        peso_kg: p.peso_kg,
        operador: p.operador || '—',
        data: p.data_registro,
        horaFormatada: formatarHora(p.data_registro)
      }))

    const agrupadoPorOperador = filtrados.reduce((acc, item) => {
      if (!acc[item.operador]) acc[item.operador] = []
      acc[item.operador].push(item)
      return acc
    }, {})

    const operadoresOrdenados = Object.keys(agrupadoPorOperador).sort((a, b) =>
      a.localeCompare(b)
    )

    return operadoresOrdenados.flatMap((operador) =>
      agrupadoPorOperador[operador].sort(
        (a, b) => new Date(b.data) - new Date(a.data)
      )
    )
  }, [selectedPosition, pesosLocais, tick])

  // 📝 Iniciar edição
  const handleEditClick = (p) => {
    setEditingId(p.id)
    setNovoPeso(String(p.peso_kg))
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setNovoPeso('')
  }

  // 💾 Salvar edição e atualizar na tela
  const handleSaveEdit = async (pesoId) => {
    if (!novoPeso) return alert('Informe um peso válido')

    try {
      setIsSaving(true)
      const parsedPeso = parseFloat(novoPeso.replace(',', '.'))
      if (isNaN(parsedPeso) || parsedPeso <= 0) {
        alert('Peso inválido')
        return
      }

      const pesoAtualizado = await onEditarPeso(pesoId, parsedPeso)

      // Atualiza o estado local para refletir na tela
      setPesosLocais((prev) =>
        prev.map((p) =>
          p.id == pesoId
            ? {
                ...p,
                peso_kg: pesoAtualizado?.peso_kg ?? parsedPeso,
                data_registro: pesoAtualizado?.data_registro ?? new Date()
              }
            : p
        )
      )

      setEditingId(null)
      setNovoPeso('')
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar peso')
    } finally {
      setIsSaving(false)
    }
  }

  // ================== RENDER ==================
  return (
    <div className="dialog-overlay">
      <div className="dialog-content-registro-pesos">
        <button
          className="btn-close-lista-pesos"
          onClick={handleCloseDialog}
          title="Fechar"
        >
          <X size={32} />
        </button>

        {/* =====================
            VISÃO PRINCIPAL
        ====================== */}
        {!selectedPosition && (
          <div className="lista-pesos-container">
            {pesosAgrupados.map(({ posicao, pesoTotal }) => (
              <div key={posicao} className="item-lista-pesos">
                <div className="item-lista-pesos-content">
                  <div className="item-lista-pesos-item">
                    <p>Posição:</p>
                    <h1>{posicao}</h1>
                  </div>
                  <div className="item-lista-pesos-item">
                    <p>Peso total:</p>
                    <h1>{pesoFormatado(pesoTotal)} KG</h1>
                  </div>
                  <div className="item-lista-pesos-item">
                    <button
                      className="view-pesos-por-posicao-button"
                      onClick={() => setSelectedPosition(posicao)}
                      title="Ver mais"
                    >
                      <Info />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =====================
            VISÃO DETALHADA
        ====================== */}
        {selectedPosition && (
          <div className="lista-pesos-container">
            <div className="item-lista-pesos-content-detalhes">
              <button
                className="voltar-detalhes-button"
                onClick={() => setSelectedPosition(null)}
                title="Voltar"
              >
                <ArrowLeft size={20} style={{ marginRight: '5px' }} />
                Voltar
              </button>
              <h2>Posição {selectedPosition}</h2>
            </div>

            {Array.isArray(pesosDaPosicao) && pesosDaPosicao.length > 0 ? (
              pesosDaPosicao
                .filter((p) => p && typeof p === 'object')
                .map((p, index) => {
                  const peso = p?.peso_kg ?? 0
                  const operador = p?.operador ?? '—'
                  const hora = p?.horaFormatada ?? '-'
                  return (
                    <div key={p?.id ?? index} className="item-lista-pesos">
                      <div className="item-lista-pesos-content">
                        <div className="item-lista-pesos-item">
                          <p>Pesado em:</p>
                          <h1>{hora}</h1>
                        </div>
                        <div className="item-lista-pesos-item">
                          <p>Pesado por:</p>
                          <h1>{operador}</h1>
                        </div>
                        <div className="item-lista-pesos-item">
                          <p>Peso:</p>
                          {editingId == p?.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                className="border rounded px-2 py-1 w-24"
                                value={novoPeso}
                                onChange={(e) => setNovoPeso(e.target.value)}
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(p?.id)}
                                disabled={isSaving}
                                title="Salvar"
                              >
                                <Check size={20} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                title="Cancelar"
                              >
                                <XCircle size={20} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <h1>{pesoFormatado(peso)} KG</h1>
                              <button
                                className="view-pesos-por-posicao-button"
                                title="Editar peso"
                                onClick={() => handleEditClick(p)}
                              >
                                <Pencil />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
            ) : (
              <p style={{ textAlign: 'center', opacity: 0.7 }}>
                Nenhum peso registrado.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
