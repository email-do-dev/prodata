import { useState, useEffect } from 'react';

import { Bar, Line, Doughnut } from 'react-chartjs-2';

export function DashboardGerencial() {
  const [metricas, setMetricas] = useState({});
  const [producaoDiaria, setProducaoDiaria] = useState([]);
  const [performanceLinhas, setPerformanceLinhas] = useState([]);
  const [rankingOperadores, setRankingOperadores] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar todas as métricas em paralelo
      const [metricasRes, producaoRes, linhasRes, operadoresRes] = await Promise.all([
        fetch('/api/dashboard/metricas'),
        fetch('/api/dashboard/producao-diaria'),
        fetch('/api/dashboard/performance-linhas'),
        fetch('/api/dashboard/ranking-operadores')
      ]);

      const [metricasData, producaoData, linhasData, operadoresData] = await Promise.all([
        metricasRes.json(),
        producaoRes.json(),
        linhasRes.json(),
        operadoresRes.json()
      ]);

      if (metricasData.success) setMetricas(metricasData.data);
      if (producaoData.success) setProducaoDiaria(producaoData.data);
      if (linhasData.success) setPerformanceLinhas(linhasData.data);
      if (operadoresData.success) setRankingOperadores(operadoresData.data);

    } catch (error) {
      console.error('Erro carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
    
    // Atualizar dados a cada 5 minutos
    const interval = setInterval(carregarDados, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">📊</div>
        <h2>Carregando Dashboard...</h2>
      </div>
    );
  }

  // Dados para gráfico de produção diária
  const dadosProducaoDiaria = {
    labels: producaoDiaria.map(item => item.data_formatada),
    datasets: [
      {
        label: 'Produção (kg)',
        data: producaoDiaria.map(item => parseFloat(item.producao) || 0),
        backgroundColor: 'rgba(102, 126, 234, 0.6)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2,
        fill: true,
      }
    ]
  };

  // Dados para gráfico performance por linha
  const dadosPerformanceLinhas = {
    labels: performanceLinhas.map(linha => linha.linha),
    datasets: [
      {
        label: 'Rendimento (%)',
        data: performanceLinhas.map(linha => parseFloat(linha.rendimento) || 0),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(20, 184, 166, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(132, 204, 22, 0.8)',
          'rgba(99, 102, 241, 0.8)',
        ],
        borderWidth: 2,
      }
    ]
  };

  // Dados para gráfico status ordens
  const dadosStatusOrdens = {
    labels: ['Abertas', 'Em Andamento', 'Fechadas'],
    datasets: [
      {
        data: [
          parseInt(metricas.ordens_abertas) || 0,
          parseInt(metricas.ordens_andamento) || 0,
          parseInt(metricas.ordens_fechadas) || 0,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderWidth: 2,
      }
    ]
  };

  const opcoesGrafico = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  return (
    <div className="dashboard-gerencial">
      {/* Header do Dashboard */}
      <div className="dashboard-header">
        <h1>📊 Dashboard Gerencial</h1>
        <div className="ultima-atualizacao">
          Última atualização: {new Date().toLocaleString('pt-BR')}
        </div>
        <button onClick={carregarDados} className="botao-atualizar">
          🔄 Atualizar
        </button>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="metricas-cards">
        <div className="metrica-card producao">
          <div className="metrica-icone">🏭</div>
          <div className="metrica-info">
            <h3>Produção Hoje</h3>
            <div className="metrica-valor">
              {parseFloat(metricas.producao_hoje || 0).toLocaleString('pt-BR')} kg
            </div>
          </div>
        </div>

        <div className="metrica-card rendimento">
          <div className="metrica-icone">📈</div>
          <div className="metrica-info">
            <h3>Rendimento Médio</h3>
            <div className="metrica-valor">
              {parseFloat(metricas.rendimento_geral || 0).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="metrica-card ordens">
          <div className="metrica-icone">📋</div>
          <div className="metrica-info">
            <h3>Ordens Ativas</h3>
            <div className="metrica-valor">
              {(parseInt(metricas.ordens_abertas || 0) + parseInt(metricas.ordens_andamento || 0))}
            </div>
          </div>
        </div>

        <div className="metrica-card operadores">
          <div className="metrica-icone">👥</div>
          <div className="metrica-info">
            <h3>Operadores Ativos</h3>
            <div className="metrica-valor">
              {parseInt(metricas.total_operadores || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="graficos-container">
        {/* Gráfico Produção Diária */}
        <div className="grafico-card">
          <h3>📈 Produção Últimos 7 Dias</h3>
          <div className="grafico-wrapper">
            <Line data={dadosProducaoDiaria} options={opcoesGrafico} />
          </div>
        </div>

        {/* Gráfico Performance Linhas */}
        <div className="grafico-card">
          <h3>🏭 Rendimento por Linha</h3>
          <div className="grafico-wrapper">
            <Bar data={dadosPerformanceLinhas} options={opcoesGrafico} />
          </div>
        </div>

        {/* Gráfico Status Ordens */}
        <div className="grafico-card status-ordens">
          <h3>📊 Status das Ordens</h3>
          <div className="grafico-wrapper">
            <Doughnut data={dadosStatusOrdens} options={opcoesGrafico} />
          </div>
        </div>
      </div>

      {/* Tabelas de Dados */}
      <div className="tabelas-container">
        {/* Performance por Linha */}
        <div className="tabela-card">
          <h3>🏭 Performance das Linhas (30 dias)</h3>
          <div className="tabela-scroll">
            <table className="tabela-dashboard">
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Ordens</th>
                  <th>Entrada (kg)</th>
                  <th>Saída (kg)</th>
                  <th>Rendimento</th>
                  <th>Tempo Médio</th>
                </tr>
              </thead>
              <tbody>
                {performanceLinhas.map((linha, index) => (
                  <tr key={index}>
                    <td><strong>{linha.linha}</strong></td>
                    <td>{linha.total_ordens}</td>
                    <td>{parseFloat(linha.peso_entrada || 0).toLocaleString('pt-BR')}</td>
                    <td>{parseFloat(linha.peso_saida || 0).toLocaleString('pt-BR')}</td>
                    <td>
                      <span className={parseFloat(linha.rendimento) >= 80 ? 'rendimento-bom' : 'rendimento-baixo'}>
                        {parseFloat(linha.rendimento || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td>{linha.tempo_medio_horas || 0}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ranking Operadores */}
        <div className="tabela-card">
          <h3>👥 Top Operadores (30 dias)</h3>
          <div className="tabela-scroll">
            <table className="tabela-dashboard">
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Operador</th>
                  <th>Registros</th>
                  <th>Peso Total (kg)</th>
                  <th>Dias Ativos</th>
                  <th>Média/Registro</th>
                </tr>
              </thead>
              <tbody>
                {rankingOperadores.map((operador, index) => (
                  <tr key={index}>
                    <td>
                      <span className="posicao">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                      </span>
                    </td>
                    <td><strong>{operador.operador}</strong></td>
                    <td>{operador.total_registros}</td>
                    <td>{parseFloat(operador.peso_total_registrado).toLocaleString('pt-BR')}</td>
                    <td>{operador.dias_ativos}</td>
                    <td>{parseFloat(operador.peso_medio_por_registro).toFixed(1)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}