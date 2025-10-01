import React, { useState, useEffect } from 'react'
import { NovaSubetapa } from './NovaSubetapa'
import { RegistroPesoOperacional } from './RegistroPesoOperacional'
import { ListagemPesos } from './ListagemPesos.js'

export function DetalhesOrdem({
  ordemId,
  onVoltar,
  offline,
  onSubetapaAtualizada
}) {
  const [ordem, setOrdem] = useState(null)
  const [subetapas, setSubetapas] = useState([])
  const [rendimentos, setRendimentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNovaSubetapa, setShowNovaSubetapa] = useState(false)
  const [subetapaSelecionada, setSubetapaSelecionada] = useState(null)
  const [isListPesosOpen, setIsListPesosOpen] = useState(false)
  const [subetapaPesos, setSubetapaPesos] = useState([])
  const [currentSubetapaId, setCurrentSubetapaId] = useState(0)
  const [pesosOffline, setPesosOffline] = useState([])

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

  function handleOpenListPesosDialog(subetapa) {
    setCurrentSubetapaId(subetapa.id)
    setIsListPesosOpen(true)
    carregarPesosSubetapa(subetapa.id)
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

      const result = await response.json()
      if (result.success) {
        alert('✅ Subetapa ativada com sucesso!')
        carregarDados()
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

      const result = await response.json()
      if (result.success) {
        alert('✅ Subetapa concluída com sucesso!')
        carregarDados()
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

  function removerPesoSubetapa(pesoId) {
    const pesoRemovido = subetapaPesos.find((p) => p.id === pesoId)
    setSubetapaPesos(subetapaPesos.filter((p) => p.id !== pesoId))

    if (pesoRemovido) {
      setSubetapas(
        subetapas.map((sub) => {
          if (sub.id === currentSubetapaId) {
            return {
              ...sub,
              total_registros: sub.total_registros - 1,
              peso_total: Number(sub.peso_total) - Number(pesoRemovido.peso_kg)
            }
          }
          return sub
        })
      )
    }
  }

  const carregarDados = async () => {
    setLoading(true)
    try {
      const ordemResponse = await fetch(`/api/ordens`)
      const ordemData = await ordemResponse.json()
      if (ordemData.success) {
        const ordemEncontrada = ordemData.data.find(
          (o) => o.id === parseInt(ordemId)
        )
        setOrdem(ordemEncontrada)
      }

      const subetapasResponse = await fetch(`/api/ordens/${ordemId}/subetapas`)
      const subetapasData = await subetapasResponse.json()
      if (subetapasData.success) {
        setSubetapas(subetapasData.data)
      }

      const rendimentoResponse = await fetch(
        `/api/ordens/${ordemId}/rendimento`
      )
      const rendimentoData = await rendimentoResponse.json()
      if (rendimentoData.success) {
        setRendimentos(rendimentoData.data)
      }
    } catch (error) {
      console.error('Erro carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [ordemId])

  if (loading) return <div className="loading">⏳ Carregando detalhes...</div>
  if (!ordem) return <div className="error">❌ Ordem não encontrada</div>

  return (
    <div className="detalhes-ordem">
      <div className="secao">
        <div className="secao-header">
          <h2>🔍 Detalhes da Ordem: {ordem.codigo}</h2>
          <button onClick={onVoltar} className="botao-voltar">
            ⬅️ Voltar
          </button>
        </div>

        <div className="ordem-info">
          <div className="info-card">
            <h3>📋 Informações Gerais</h3>
            <p>
              <strong>Linha:</strong> {ordem.linha_nome}
            </p>
            <p>
              <strong>Status:</strong>{' '}
              <span className={`status-${ordem.status.toLowerCase()}`}>
                {ordem.status}
              </span>
            </p>
            <p>
              <strong>Item Entrada:</strong> {ordem.item_entrada}
            </p>
            <p>
              <strong>Item Saída:</strong> {ordem.item_saida}
            </p>
            <p>
              <strong>Criada há:</strong>{' '}
              {Math.floor(ordem.horas_desde_criacao)}h
            </p>
          </div>
        </div>
      </div>

      <div className="secao">
        <div className="secao-header">
          <h2>⚖️ Subetapas e Pesos ({subetapas.length})</h2>
          <button
            onClick={() => setShowNovaSubetapa(!showNovaSubetapa)}
            className="botao-refresh"
          >
            ➕ Nova Subetapa
          </button>
        </div>

        {showNovaSubetapa && (
          <NovaSubetapa
            ordemId={ordemId}
            onSubetapaCriada={() => {
              setShowNovaSubetapa(false)
              carregarDados()
            }}
            setShowNovaSubetapa={setShowNovaSubetapa}
            showNovaSubetapa={showNovaSubetapa}
            codigoOrdem={ordem.item_entrada}
          />
        )}

        <div className="subetapas-grid">
          {subetapas.length > 0 ? (
            subetapas.map((subetapa) => {
              const rendimento = rendimentos.find(
                (r) => r.numero_etapa === subetapa.numero_etapa
              )
              return (
                <div key={subetapa.id} className="subetapa-card">
                  <div className="subetapa-header">
                    <h3>📍 Etapa {subetapa.numero_etapa}</h3>
                    <span className="peso-badge">
                      {Number(subetapa.peso_total).toFixed(1)} kg
                    </span>
                  </div>

                  <div className="subetapa-info">
                    <p>
                      <strong>Item:</strong> {subetapa.item_codigo}
                    </p>
                    <p>
                      <strong>Descrição:</strong> {subetapa.descricao}
                    </p>
                    <p>
                      <strong>Registros:</strong> {subetapa.total_registros}
                    </p>
                    <p>
                      <strong>Operador(a):</strong> {subetapa.criado_por}
                    </p>

                    {rendimento && (
                      <div className="rendimento-info">
                        {rendimento.rendimento_etapa && (
                          <p>
                            <strong>Rendimento Etapa:</strong>
                            <span
                              className={
                                rendimento.rendimento_etapa >= 85
                                  ? 'rendimento-bom'
                                  : 'rendimento-baixo'
                              }
                            >
                              {rendimento.rendimento_etapa}%
                            </span>
                          </p>
                        )}
                        {rendimento.rendimento_geral && (
                          <p>
                            <strong>Rendimento Geral:</strong>
                            <span
                              className={
                                rendimento.rendimento_geral >= 70
                                  ? 'rendimento-bom'
                                  : 'rendimento-baixo'
                              }
                            >
                              {rendimento.rendimento_geral}%
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="subetapa-acoes">
                    {subetapa.ativa ? (
                      <>
                        <button
                          className="botao-peso"
                          onClick={() => setSubetapaSelecionada(subetapa)}
                        >
                          ⚖️ Registrar Peso
                        </button>
                        <button
                          className="botao-peso"
                          onClick={() => handleOpenListPesosDialog(subetapa)}
                          disabled={subetapa.total_registros == 0}
                          style={{
                            cursor:
                              subetapa.total_registros == 0
                                ? 'not-allowed'
                                : 'pointer'
                          }}
                        >
                          📋 Listar Pesos
                        </button>
                        <button
                          className="botao-peso"
                          onClick={() => handleConcluirSubetapa(subetapa)}
                          disabled={subetapa.peso_total == 0}
                          style={{
                            cursor:
                              subetapa.total_registros == 0
                                ? 'not-allowed'
                                : 'pointer'
                          }}
                        >
                          ✅ Concluir
                        </button>
                      </>
                    ) : (
                      <button
                        className="botao-peso"
                        onClick={() => handleAtivarSubetapa(subetapa)}
                      >
                        🚀 Ativar
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <p>Nenhuma subetapa encontrada.</p>
          )}
        </div>
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
          onPesoRegistrado={(peso) => {
            if (offline) {
              registrarPesoOffline(peso)
            } else {
              onSubetapaAtualizada?.()
              carregarDados()
            }
            setSubetapaSelecionada(null)
          }}
          onCancelar={() => setSubetapaSelecionada(null)}
        />
      )}
    </div>
  )
}
