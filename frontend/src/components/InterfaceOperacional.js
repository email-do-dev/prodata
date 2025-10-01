import React, { useState, useEffect } from 'react'
import { OperacaoOrdem } from './OperacaoOrdem'
import { NovaOrdemDialog } from './NovaOrdemDialog'

export function InterfaceOperacional({ linhas }) {
  const [ordensAbertas, setOrdensAbertas] = useState([])
  const [ordemSelecionada, setOrdemSelecionada] = useState(null)
  const [subetapas, setSubetapas] = useState([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const carregarOrdensAbertas = async () => {
    try {
      const response = await fetch('/api/ordens')
      const data = await response.json()
      if (data.success) {
        const abertas = data.data.filter(
          (ordem) =>
            ordem.status === 'ABERTA' || ordem.status === 'EM_ANDAMENTO'
        )
        setOrdensAbertas(abertas)
      }
    } catch (error) {
      console.error('Erro carregar ordens:', error)
      if (offline) {
        const ordensCache = localStorage.getItem('ordens_cache')
        if (ordensCache) setOrdensAbertas(JSON.parse(ordensCache))
      }
    } finally {
      setLoading(false)
    }
  }

  const carregarSubetapas = async (ordemId) => {
    try {
      const response = await fetch(`/api/ordens/${ordemId}/subetapas`)
      const data = await response.json()
      if (data.success) {
        setSubetapas(data.data)
        localStorage.setItem(`subetapas_${ordemId}`, JSON.stringify(data.data))
      }
    } catch (error) {
      console.error('Erro carregar subetapas:', error)
      const cache = localStorage.getItem(`subetapas_${ordemId}`)
      if (cache) setSubetapas(JSON.parse(cache))
    }
  }

  useEffect(() => {
    carregarOrdensAbertas()
  }, [])

  useEffect(() => {
    if (ordemSelecionada) carregarSubetapas(ordemSelecionada.id)
  }, [ordemSelecionada])

  if (loading) {
    return (
      <div className="interface-operacional loading-screen">
        <div className="loading-spinner">⏳</div>
        <h2>Carregando Sistema...</h2>
      </div>
    )
  }

  function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR') // retorna DD/MM/YYYY
  }

  return (
    <div className="interface-operacional">
      <div className={`status-conexao ${offline ? 'offline' : 'online'}`}>
        {offline ? '📴 MODO OFFLINE' : '🌐 ONLINE'}
      </div>

      {!ordemSelecionada ? (
        <div className="selecao-ordem">
          <h1>🎣 Produção Pesqueira</h1>
          <h2>Selecione uma Ordem de Produção</h2>

          <NovaOrdemDialog
            linhas={linhas}
            onOrdemCriada={carregarOrdensAbertas}
          />

          <div className="ordens-grid">
            {ordensAbertas.map((ordem) => (
              <div
                key={ordem.id}
                className="ordem-card-operacional"
                onClick={() => setOrdemSelecionada(ordem)}
              >
                <div className="ordem-header">
                  <h3>{ordem.codigo}</h3>
                  <span
                    className={`status-badge ${ordem.status.toLowerCase()}`}
                  >
                    {ordem.status}
                  </span>
                </div>
                <div className="ordem-detalhes">
                  <p>
                    <strong>Linha:</strong> {ordem.linha_nome}
                  </p>
                  <p>
                    <strong>Item:</strong> {ordem.item_entrada}
                  </p>
                  <p>
                    <strong>Criada em:</strong> {formatDate(ordem.data_criacao)}
                  </p>
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
        <OperacaoOrdem
          ordem={ordemSelecionada}
          subetapas={subetapas}
          offline={offline}
          onVoltar={() => {
            setOrdemSelecionada(null)
            setSubetapas([])
          }}
          onSubetapaAtualizada={async () => {
            await carregarSubetapas(ordemSelecionada.id)
            await carregarOrdensAbertas()

            const ordemAtualizada = ordensAbertas.find(
              (o) => o.id === ordemSelecionada.id
            )

            if (ordemAtualizada) {
              setOrdemSelecionada(ordemAtualizada)
            } else {
              setOrdemSelecionada(null)
              setSubetapas([])
            }
          }}
        />
      )}
    </div>
  )
}
