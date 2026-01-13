// App.js - Aplicação principal
import React, { useState, useEffect } from 'react'

import './App.css'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'

import { LinhasProducao } from './components/LinhasProducao'
import { ProdutosSAP } from './components/ProdutosSAP'
import { StatusSistema } from './components/StatusSistema'
import { InterfaceOperacional } from './components/InterfaceOperacional'
import { NovaOrdem } from './components/NovaOrdem'
import { ListaOrdens } from './components/ListaOrdens'
import { DetalhesOrdem } from './components/DetalhesOrdem'
import { SincronizadorOffline } from './components/SincronizadorOffline'
import { DashboardGerencial } from './components/DashboardGerencial'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

function App() {
  const [linhas, setLinhas] = useState([])
  const [ordemSelecionada, setOrdemSelecionada] = useState(null)
  const [modoOperacional, setModoOperacional] = useState(false)
  const [mostrarDashboard, setMostrarDashboard] = useState(false)
  const [modoGestao, setModoGestao] = useState(false)
  const [atualizarOrdens, setAtualizarOrdens] = useState(false)

  // Função global para ver detalhes
  window.verDetalhes = (ordemId) => {
    setOrdemSelecionada(ordemId)
  }

  useEffect(() => {
    fetch('/api/linhas-producao')
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setLinhas(data.data)
        }
      })
      .catch((err) => console.error('Erro carregar linhas:', err))
  }, [])

  // Se dashboard ativado, mostrar dashboard
  if (mostrarDashboard) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>PRODATA - MATA NORTE</h1>
          <div className="botoes-principais">
            <button
              onClick={() => {
                setModoGestao(true)
                setMostrarDashboard(false)
              }}
              className="botao-dashboard"
            >
              ⚙️ GESTÃO
            </button>

            <button
              onClick={() => {
                setModoOperacional(true)
                setMostrarDashboard(false)
              }}
              className="botao-dashboard"
            >
              📱 MODO TABLET
            </button>
          </div>
        </header>
        <DashboardGerencial />
      </div>
    )
  }

  // Se modo operacional ativado, mostrar interface tablet
  if (modoOperacional) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>PRODATA - MATANORTE</h1>
          <div className="botoes-principais">
            <button
              onClick={() => {
                setModoGestao(true)
                setModoOperacional(false)
              }}
              className="botao-dashboard"
            >
              ⚙️ GESTÃO
            </button>
            <button
              onClick={() => {
                setMostrarDashboard(true)
                setModoOperacional(false)
              }}
              className="botao-dashboard"
            >
              📊 DASHBOARD
            </button>
          </div>
        </header>
        <InterfaceOperacional
          linhas={linhas}
          // setOrdemSelecionada={setOrdemSelecionada}
          onVoltar={() => {
            setModoOperacional(false)
            setModoGestao(true)
          }}
        />
      </div>
    )
  }

  // Se tem ordem selecionada, mostrar detalhes
  if (ordemSelecionada) {
    return (
      <div className="App">
        <DetalhesOrdem
          ordemId={ordemSelecionada}
          onVoltar={() => setOrdemSelecionada(null)}
        />
      </div>
    )
  }

  // Se modo gestão desativado, mostrar seletor de modo
  if (modoGestao) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>PRODATA - MATA NORTE</h1>
          <div className="botoes-principais">
            <button
              onClick={() => {
                setMostrarDashboard(true)
                setModoGestao(false)
              }}
              className="botao-dashboard"
            >
              📊 DASHBOARD
            </button>

            <button
              onClick={() => {
                setModoOperacional(true)
                setModoGestao(false)
              }}
              className="botao-dashboard"
            >
              📱 MODO TABLET
            </button>
          </div>
        </header>

        <main className="App-main">
          {/* <StatusSistema /> */}
          <NovaOrdem
            linhas={linhas}
            onOrdemCriada={() => setAtualizarOrdens((prev) => !prev)}
          />

          <ListaOrdens atualizar={atualizarOrdens} />

          {/* <LinhasProducao /> */}
          {/* <ProdutosSAP /> */}
        </main>

        <footer className="App-footer">
          <p>💻 Desenvolvido em React + Node.js + PostgreSQL + SAP B1</p>
          <p>
            📅 {new Date().toLocaleDateString('pt-BR')} - Sistema em
            desenvolvimento
          </p>
        </footer>

        {/* Sincronizador offline */}
        <SincronizadorOffline />
      </div>
    )
  }

  // Tela inicial (home) - Seletor de modos CORRETO
  return (
    <div className="App">
      <header className="App-header">
        <h1>PRODATA - MATA NORTE</h1>
        <div className="botoes-principais">
          <button
            onClick={() => setModoGestao(true)}
            className="botao-dashboard"
          >
            ⚙️ GESTÃO
          </button>

          <button
            onClick={() => setMostrarDashboard(true)}
            className="botao-dashboard"
          >
            📊 DASHBOARD
          </button>

          <button
            onClick={() => setModoOperacional(true)}
            className="botao-dashboard"
          >
            📱 MODO TABLET
          </button>
        </div>
      </header>

      <main className="App-main">
        <div className="status-sistema">
          <h2>📊 Modos Disponíveis</h2>
          <div className="modos-explicacao">
            <div className="modo-card">
              <h3>⚙️ Gestão</h3>
              <p>
                Criar ordens de produção, gerenciar subetapas, acompanhar
                rendimentos e relatórios completos
              </p>
            </div>
            <div className="modo-card">
              <h3>📊 Dashboard</h3>
              <p>
                Métricas executivas, gráficos de performance e KPIs em tempo
                real
              </p>
            </div>
            <div className="modo-card">
              <h3>📱 Tablet</h3>
              <p>
                Interface operacional otimizada para operadores no chão de
                fábrica
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="App-footer">
        <p>💻 Desenvolvido em React + Node.js + PostgreSQL + SAP B1</p>
        <p>📅 {new Date().toLocaleDateString('pt-BR')} - Sistema operacional</p>
      </footer>
    </div>
  )
}

export default App
