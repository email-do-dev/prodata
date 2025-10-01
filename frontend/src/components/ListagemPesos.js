import { X, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ListagemPesos({
  setIsListPesosOpen,
  subetapaPesos,
  onPesoRemovido
}) {
  const [tick, setTick] = useState(0) // força re-render a cada 5s

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1) // muda o estado a cada 5s
    }, 100000)

    return () => clearInterval(interval)
  }, [])

  const handleCloseDialog = () => {
    setIsListPesosOpen(false)
  }

  const pesoFormatado = (peso) => {
    const formattedNumber = parseFloat(peso)
    return formattedNumber.toFixed(1).replace('.', ',')
  }

  function formatOperatorName(name) {
    return name
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  async function onRemoverPeso(pesoId) {
    try {
      const response = await fetch(`/api/subetapas/pesos/${pesoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (data.success) {
        onPesoRemovido(pesoId)
        alert('Peso removido com sucesso')
      } else {
        alert('❌ Erro: ' + data.error)
      }
    } catch (error) {
      console.error('Erro ao remover peso:', error)
      alert('❌ Erro inesperado ao remover peso.')
    }
  }

  function formatElapsedTime(dateString) {
    const createdAt = new Date(dateString.replace(' ', 'T'))
    const now = new Date()

    const diffMs = now - createdAt
    const diffSec = Math.floor(diffMs / 1000)

    const hours = String(Math.floor(diffSec / 3600)).padStart(2, '0')
    const minutes = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0')
    const seconds = String(diffSec % 60).padStart(2, '0')

    return `${hours}h${minutes}m${seconds}s`
  }

  function formatFirstName(fullName) {
    if (!fullName) return ''
    return fullName.trim().split(' ')[0]
  }
  const handleRemoverPeso = async (pesoId) => {
    if (window.confirm('Tem certeza que deseja excluir este peso?')) {
      await onRemoverPeso(pesoId)
    }
  }

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

        <div className="lista-pesos-container">
          {subetapaPesos.map((registroPeso) => (
            <div key={registroPeso.id} className="item-lista-pesos">
              <div className="item-lista-pesos-content">
                <div className="item-lista-pesos-item">
                  <p>Criado há:</p>
                  {/* tick força re-render a cada 5s */}
                  <h1>{formatElapsedTime(registroPeso.data_registro)}</h1>
                </div>

                <div className="item-lista-pesos-item">
                  <p>Peso: </p>
                  <h1>{pesoFormatado(registroPeso.peso_kg)} KG</h1>
                </div>
                <div className="item-lista-pesos-item">
                  <p>Pesado por:</p>
                  <h1>{formatFirstName(registroPeso.operador)}</h1>
                </div>

                <button
                  className="btn-delete-lista-pesos"
                  onClick={() => handleRemoverPeso(registroPeso.id)}
                  title="Remover peso"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
