import { X, Info, ArrowLeft } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'

export function ListagemPesos({ setIsListPesosOpen, subetapaPesos }) {
  const [tick, setTick] = useState(0)
  const [selectedPosition, setSelectedPosition] = useState(null)

  // Atualiza a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleCloseDialog = () => {
    setIsListPesosOpen(false)
  }

  const pesoFormatado = (peso) => {
    const formattedNumber = parseFloat(peso)
    return formattedNumber.toFixed(1).replace('.', ',')
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
    const mapa = new Map()
    subetapaPesos.forEach((p) => {
      const pos = p.posicao
      const pesoAtual = mapa.get(pos) || 0
      mapa.set(pos, pesoAtual + Number(p.peso_kg || 0))
    })

    return Array.from(mapa.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([posicao, pesoTotal]) => ({ posicao, pesoTotal }))
  }, [subetapaPesos, tick])

  // 🎯 Filtra e organiza os pesos da posição selecionada
  const pesosDaPosicao = useMemo(() => {
    if (!selectedPosition) return []

    // Filtra apenas os registros da posição
    const filtrados = subetapaPesos
      .filter((p) => p.posicao === selectedPosition)
      .map((p, index) => ({
        id: index,
        peso: p.peso_kg,
        operador: p.operador || '—',
        data: p.data_registro,
        horaFormatada: formatarHora(p.data_registro)
      }))

    // Agrupa por operador
    const agrupadoPorOperador = filtrados.reduce((acc, item) => {
      if (!acc[item.operador]) acc[item.operador] = []
      acc[item.operador].push(item)
      return acc
    }, {})

    // Ordena alfabeticamente os operadores
    const operadoresOrdenados = Object.keys(agrupadoPorOperador).sort((a, b) =>
      a.localeCompare(b)
    )

    // Dentro de cada operador, ordena por data (mais recente primeiro)
    const ordenadoFinal = operadoresOrdenados.flatMap((operador) =>
      agrupadoPorOperador[operador].sort(
        (a, b) => new Date(b.data) - new Date(a.data)
      )
    )

    return ordenadoFinal
  }, [selectedPosition, subetapaPesos, tick])

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

            {pesosDaPosicao.length > 0 ? (
              pesosDaPosicao.map((p) => (
                <div key={p.id} className="item-lista-pesos">
                  <div className="item-lista-pesos-content">
                    <div className="item-lista-pesos-item">
                      <p>Pesado em:</p>
                      <h1>{p.horaFormatada}</h1>
                    </div>
                    <div className="item-lista-pesos-item">
                      <p>Pesado por:</p>
                      <h1>{p.operador}</h1>
                    </div>
                    <div className="item-lista-pesos-item">
                      <p>Peso:</p>
                      <h1>{pesoFormatado(p.peso)} KG</h1>
                    </div>
                  </div>
                </div>
              ))
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
