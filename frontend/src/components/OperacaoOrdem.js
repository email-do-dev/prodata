import React, { useState, useEffect } from 'react'
import { RegistroPesoOperacional } from './RegistroPesoOperacional'
import { NovaSubetapa } from './NovaSubetapa'
import { ListagemPesos } from './ListagemPesos.js'

export function OperacaoOrdem({
  ordem,
  subetapas,
  offline,
  onVoltar,
  onSubetapaAtualizada
}) {
  const [subetapaSelecionada, setSubetapaSelecionada] = useState(null)
  const [pesosOffline, setPesosOffline] = useState([])
  const [rendimentos, setRendimentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNovaSubetapa, setShowNovaSubetapa] = useState(false)
  const [currentSubetapa, setCurrentSubetapa] = useState(subetapas)
  const [currentOrdem, setCurrentOrdem] = useState(ordem)
  const [isListPesosOpen, setIsListPesosOpen] = useState(false)
  const [subetapaPesos, setSubetapaPesos] = useState([])
  const [currentSubetapaId, setCurrentSubetapaId] = useState(0)

  function handleOpenListPesosDialog(subetapa) {
    setCurrentSubetapaId(subetapa.id)
    setIsListPesosOpen(true)
    carregarPesosSubetapa(subetapa.id)
  }

  async function carregarPesosSubetapa(subetapaId) {
    try {
      const response = await fetch(`/api/subetapas/${subetapaId}/pesos`)
      const data = await response.json()
      if (data.success) {
        setSubetapaPesos(data.data)
      } else {
        setSubetapaPesos([])
      }
    } catch (error) {
      console.error('erro ao carregar pesos:', error)
      setSubetapaPesos([])
    }
  }

  async function handleAtivarSubetapa(subetapa) {
    try {
      const payload = {
        ativa: true,
        data_ativacao: new Date().toISOString(),
        numero_etapa: subetapa.numero_etapa,
        item_codigo: subetapa.item_codigo,
        descricao: subetapa.descricao
      }

      const response = await fetch(
        `/api/ordens/${ordem.id}/subetapas/${subetapa.id}/ativar`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      )

      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`)

      const result = await response.json()
      if (result.success) {
        alert('✅ Subetapa ativada com sucesso!')
        await carregarDados()
        onSubetapaAtualizada?.()
      } else {
        alert('❌ Erro: ' + result.error)
      }
    } catch (err) {
      console.error('Erro ao ativar subetapa:', err)
      alert('❌ Erro: ' + err.message)
    }
  }

  async function handleConcluirSubetapa(subetapa) {
    try {
      const payload = {
        ativa: false,
        data_conclusao: new Date().toISOString(),
        numero_etapa: subetapa.numero_etapa,
        item_codigo: subetapa.item_codigo,
        descricao: subetapa.descricao
      }

      const response = await fetch(
        `/api/ordens/${ordem.id}/subetapas/${subetapa.id}/concluir`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      )

      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`)

      const result = await response.json()
      if (result.success) {
        alert('✅ Subetapa concluída com sucesso!')
        await carregarDados()
        onSubetapaAtualizada?.()
      } else {
        alert('❌ Erro: ' + result.error)
      }
    } catch (err) {
      console.error('Erro ao concluir subetapa:', err)
      alert('❌ Erro: ' + err.message)
    }
  }

  const registrarPesoOffline = (peso) => {
    const novoPeso = {
      ...peso,
      id: Date.now(),
      offline: true,
      timestamp: new Date().toISOString()
    }
    const novosPesos = [...pesosOffline, novoPeso]
    setPesosOffline(novosPesos)
    localStorage.setItem('pesos_offline', JSON.stringify(novosPesos))
    alert('✅ Peso registrado offline! Será sincronizado quando conectar.')
  }

  const carregarDados = async () => {
    setLoading(true)
    try {
      const ordemResponse = await fetch(`/api/ordens`)
      const ordemData = await ordemResponse.json()
      if (ordemData.success) {
        const ordemEncontrada = ordemData.data.find(
          (o) => o.id === parseInt(ordem.id)
        )
        if (ordemEncontrada) setCurrentOrdem(ordemEncontrada)
      }

      const subetapasResponse = await fetch(`/api/ordens/${ordem.id}/subetapas`)
      const subetapasData = await subetapasResponse.json()
      if (subetapasData.success) setCurrentSubetapa(subetapasData.data)

      const rendimentoResponse = await fetch(
        `/api/ordens/${ordem.id}/rendimento`
      )
      const rendimentoData = await rendimentoResponse.json()
      if (rendimentoData.success) setRendimentos(rendimentoData.data)
    } catch (error) {
      console.error('Erro carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  function removerPesoSubetapa(pesoId) {
    const pesoRemovido = subetapaPesos.find((p) => p.id === pesoId)
    setSubetapaPesos(subetapaPesos.filter((p) => p.id !== pesoId))

    if (pesoRemovido) {
      setCurrentSubetapa(
        currentSubetapa.map((sub) =>
          sub.id === currentSubetapaId
            ? {
                ...sub,
                total_registros: sub.total_registros - 1,
                peso_total:
                  Number(sub.peso_total) - Number(pesoRemovido.peso_kg)
              }
            : sub
        )
      )
    }
  }

  useEffect(() => {
    carregarDados()
  }, [ordem.id])

  return (
    <div className="operacao-ordem">
      {/* Header com info da ordem */}
      <div className="ordem-header-op">
        <button onClick={onVoltar} className="botao-voltar-op">
          ⬅️ VOLTAR
        </button>

        <div className="ordem-info-op">
          <h2>{currentOrdem?.codigo}</h2>
          <div
            className={`status-select status-${currentOrdem?.status?.toLowerCase()}`}
          >
            {currentOrdem?.status}
          </div>
          <p>{currentOrdem?.linha_nome}</p>
        </div>

        <button
          onClick={() => setShowNovaSubetapa(!showNovaSubetapa)}
          className="botao-voltar-op"
        >
          ➕ Nova Subetapa
        </button>

        {showNovaSubetapa && (
          <NovaSubetapa
            ordemId={ordem.id}
            onSubetapaCriada={async () => {
              setShowNovaSubetapa(false)
              await carregarDados()
              onSubetapaAtualizada?.()
            }}
            setShowNovaSubetapa={setShowNovaSubetapa}
            showNovaSubetapa={showNovaSubetapa}
            codigoOrdem={ordem.item_entrada}
          />
        )}
      </div>

      {/* Grid de subetapas */}
      <div className="subetapas-operacional">
        <h3>📍 Etapas de Produção</h3>
        {loading ? (
          <p>Carregando subetapas...</p>
        ) : (
          <div className="etapas-grid">
            {currentSubetapa.length > 0 ? (
              currentSubetapa.map((subetapa) => (
                <div key={subetapa.id} className="etapa-card-op">
                  <div className="etapa-numero">{subetapa.numero_etapa}</div>
                  <div className="etapa-info">
                    <h4>{subetapa.item_codigo}</h4>
                    <p className="peso-atual">
                      {Number(subetapa.peso_total).toFixed(1)} kg
                    </p>
                    <p className="registros">
                      {subetapa.total_registros} registros
                    </p>

                    {subetapa.ativa ? (
                      <div className="botoes-op">
                        <button
                          type="button"
                          className="botao-cancelar-op"
                          onClick={() => setSubetapaSelecionada(subetapa)}
                        >
                          Registrar peso
                        </button>
                        <button
                          type="submit"
                          onClick={() => handleOpenListPesosDialog(subetapa)}
                          className="botao-confirmar-op"
                          disabled={subetapa.total_registros === 0}
                          style={{
                            cursor:
                              subetapa.total_registros === 0
                                ? 'not-allowed'
                                : 'pointer'
                          }}
                        >
                          Listar pesos
                        </button>

                        <button
                          type="submit"
                          className="botao-confirmar-op"
                          onClick={() => handleConcluirSubetapa(subetapa)}
                          disabled={
                            // Regra 1: não pode concluir se não tem peso
                            subetapa.total_registros == 0 ||
                            // Regra 2: se for a subetapa 99, não pode concluir se houver outras ativas
                            (subetapa.numero_etapa == 99 &&
                              currentSubetapa.some(
                                (s) => s.ativa && s.numero_etapa != 99
                              ))
                          }
                          style={{
                            cursor:
                              subetapa.total_registros == 0 ||
                              (subetapa.numero_etapa == 99 &&
                                currentSubetapa.some(
                                  (s) => s.ativa && s.numero_etapa != 99
                                ))
                                ? 'not-allowed'
                                : 'pointer'
                          }}
                        >
                          Concluir
                        </button>
                      </div>
                    ) : (
                      <div className="botoes-op">
                        <button
                          className="botao-confirmar-op"
                          onClick={() => handleAtivarSubetapa(subetapa)}
                        >
                          Ativar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p>Nenhuma subetapa encontrada.</p>
            )}
          </div>
        )}
      </div>

      {isListPesosOpen && (
        <ListagemPesos
          setIsListPesosOpen={setIsListPesosOpen}
          subetapaPesos={subetapaPesos}
          onPesoRemovido={removerPesoSubetapa}
        />
      )}

      {subetapaSelecionada && (
        <RegistroPesoOperacional
          subetapa={subetapaSelecionada}
          offline={offline}
          onPesoRegistrado={async (peso) => {
            if (offline) {
              registrarPesoOffline(peso)
            } else {
              await carregarDados()
              onSubetapaAtualizada?.()
            }
            setSubetapaSelecionada(null)
          }}
          onCancelar={() => setSubetapaSelecionada(null)}
        />
      )}
    </div>
  )
}
