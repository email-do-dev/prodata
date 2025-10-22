/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Request, Response } from 'express'

import { SAPService } from './service/sap-service'

import { connectDB, getLinhasProducao } from './database'
import { OrdensService } from 'service/ordens-service'
import { SubetapasService } from 'service/subetapas-service'

const app = express()
const PORT = 3001

const sapService = new SAPService()

// Middleware para processar JSON
app.use(express.json())

// Rota principal - nossa primeira página
app.get('/', (req: Request, res: Response) => {
  res.send(`
        <h1>🎣 Sistema de Produção Pesqueira</h1>
        <h2>✅ Servidor funcionando!</h2>
        <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p><strong>Status:</strong> Online</p>
        <hr>
        <h3>Próximos passos:</h3>
        <ul>
            <li>✅ Node.js instalado</li>
            <li>✅ Servidor Express funcionando</li>
            <li>⏳ Conectar banco de dados</li>
            <li>⏳ Integrar com SAP</li>
        </ul>
    `)
})

// Adicionar nova rota ANTES de app.listen()
app.get('/api/linhas-producao', async (req: Request, res: Response) => {
  try {
    const linhas = await getLinhasProducao()
    res.json({
      success: true,
      total: linhas.length,
      data: linhas
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Rota produtos entrada SAP
app.get('/api/sap/produtos-entrada', async (req: Request, res: Response) => {
  try {
    // const limit = req.query.limit || 50;
    const produtos = await sapService.getProdutosEntrada()

    res.json({
      success: true,
      total: produtos.length,
      cache_info: 'Dados atualizados a cada 30min',
      data: produtos
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Erro ao buscar produtos SAP'
    })
  }
})

// Rota produtos saida SAP
app.get('/api/sap/produtos-saida', async (req: Request, res: Response) => {
  try {
    // const limit = req.query.limit || 50;
    const produtos = await sapService.getProdutosSaida()

    res.json({
      success: true,
      total: produtos.length,
      cache_info: 'Dados atualizados a cada 30min',
      data: produtos
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Erro ao buscar produtos SAP'
    })
  }
})

// ========== APIS ORDEM DE PRODUÇÃO ==========

app.get('/api/ordens', async (req: Request, res: Response) => {
  const service = new OrdensService()

  try {
    const ordens = await service.buscarTodas()
    res.json({ success: true, total: ordens.length, data: ordens })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/ordens', async (req: Request, res: Response) => {
  const service = new OrdensService()

  try {
    const ordem = await service.criarOrdem(req.body)
    res.status(201).json({
      success: true,
      message: `Ordem criada com código: ${ordem.codigo} e subetapas geradas`,
      data: ordem
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.put('/api/ordens/:id/status', async (req: Request, res: Response) => {
  const service = new OrdensService()

  try {
    const updated = await service.atualizarStatus(
      parseInt(req.params.id),
      req.body.status
    )
    res.json({
      success: true,
      message: 'Status atualizado com sucesso',
      data: updated
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.delete('/api/ordens/:id', async (req: Request, res: Response) => {
  const service = new OrdensService()
  try {
    const codigo = await service.deletarOrdem(parseInt(req.params.id))
    res.json({
      success: true,
      message: `Ordem ${codigo} deletada com sucesso`
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.get('/api/operadores', async (req: Request, res: Response) => {
  const service = new OrdensService()
  try {
    const operadores = await service.buscarOperadores()
    res.json({ success: true, total: operadores.length, data: operadores })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Rota para forçar atualização do cache
// app.post('/api/sap/sync', async (req: Request, res: Response) => {
//   try {
//     console.log('🔄 Sincronização manual iniciada...')
//     const produtos = await sapService.getProdutos()

//     res.json({
//       success: true,
//       message: 'Cache atualizado com sucesso',
//       total_produtos: produtos.length,
//       timestamp: new Date().toISOString(),
//     })
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       error: error.message,
//     })
//   }
// })

// Dashboard do sistema
app.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // Buscar dados do PostgreSQL
    const linhas = await getLinhasProducao()

    // Testar SAP
    const sapStatus = await sapService.testeConexao()

    res.send(`
            <h1>🎣 Sistema de Produção - Dashboard</h1>
            <hr>

            <h2>📊 Status dos Sistemas</h2>
            <p><strong>PostgreSQL:</strong> ✅ ${linhas.length} linhas de produção</p>
            <p><strong>SAP B1:</strong> ${sapStatus.success ? '✅ Conectado' : '❌ Erro'}</p>
            <p><strong>Servidor:</strong> ✅ Online desde ${new Date().toLocaleString('pt-BR')}</p>

            <h2>🔗 APIs Disponíveis</h2>
            <ul>
                <li><a href="/api/linhas-producao">Linhas de Produção (PostgreSQL)</a></li>
                <li><a href="/api/sap/teste">Teste Conexão SAP</a></li>
                <li><a href="/api/sap/produtos">Produtos SAP</a></li>
                <li><a href="/api/sap/ordens">Ordens Produção SAP</a></li>
            </ul>

            <h2>📈 Próximos Passos</h2>
            <p>✅ Ambiente configurado<br>
            ✅ PostgreSQL funcionando<br>
            ✅ SAP B1 integrado<br>
            ⏳ Interface React (Dia 5)<br>
            ⏳ Sistema completo</p>
        `)
  } catch (error: any) {
    res.send(`<h1>❌ Erro no Dashboard</h1><p>${error.message}</p>`)
  }
})

// ========== APIS SUBETAPAS ==========

// Buscar subetapas de uma ordem
app.get('/api/ordens/:id/subetapas', async (req, res) => {
  const service = new SubetapasService()

  try {
    const data = await service.buscarSubetapas(parseInt(req.params.id))
    res.json({ success: true, total: data.length, data })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  } finally {
    await service.closeConnection()
  }
})

// Criar nova subetapa
app.post('/api/ordens/:id/subetapas', async (req, res) => {
  const service = new SubetapasService()

  try {
    const data = await service.criarSubetapa(parseInt(req.params.id), req.body)
    res.status(201).json({
      success: true,
      message: 'Subetapa criada com sucesso',
      data
    })
  } catch (err: any) {
    console.error('Erro criar subetapa:', err)
    if (err.code === '23505') {
      res.status(400).json({
        success: false,
        error: 'Etapa já existe para esta ordem'
      })
    } else {
      res.status(500).json({
        success: false,
        error: err.message
      })
    }
  } finally {
    await service.closeConnection()
  }
})

// Ativar subetapa
app.patch('/api/ordens/:id/subetapas/:subetapaId/ativar', async (req, res) => {
  const service = new SubetapasService()
  try {
    const data = await service.ativarSubetapa(
      parseInt(req.params.subetapaId),
      req.body.ativa,
      req.body.data_ativacao
    )
    res.json({ success: true, message: 'Subetapa ativada com sucesso', data })
  } catch (err: any) {
    console.error('Erro ao ativar subetapa:', err)
    res.status(500).json({ success: false, error: err.message })
  } finally {
    await service.closeConnection()
  }
})

// Concluir subetapa
app.patch(
  '/api/ordens/:id/subetapas/:subetapaId/concluir',
  async (req, res) => {
    const service = new SubetapasService()
    try {
      const data = await service.concluirSubetapa(
        parseInt(req.params.subetapaId),
        req.body.ativa,
        req.body.data_conclusao
      )
      res.json({
        success: true,
        message: 'Subetapa concluída com sucesso',
        data
      })
    } catch (err: any) {
      console.error('Erro ao concluir subetapa:', err)
      res.status(500).json({ success: false, error: err.message })
    } finally {
      await service.closeConnection()
    }
  }
)

// ========== APIS REGISTRO PESO ==========

// Buscar pesos de uma subetapa
app.get('/api/subetapas/:id/pesos', async (req, res) => {
  const service = new SubetapasService()

  try {
    const data = await service.buscarPesos(parseInt(req.params.id))
    res.json({ success: true, total: data.length, data })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  } finally {
    await service.closeConnection()
  }
})

// Registrar novo peso
app.post('/api/subetapas/:id/pesos', async (req, res) => {
  const service = new SubetapasService()

  try {
    const data = await service.registrarPeso(parseInt(req.params.id), req.body)
    res.status(201).json({
      success: true,
      message: 'Peso registrado com sucesso',
      data
    })
  } catch (err: any) {
    console.error('Erro registrar peso:', err)
    res.status(400).json({ success: false, error: err.message })
  } finally {
    await service.closeConnection()
  }
})

// Remover peso de subetapas
app.delete('/api/subetapas/pesos/:pesoId', async (req, res) => {
  try {
    const service = new SubetapasService()
    const deleted = await service.deletarPeso(Number(req.params.pesoId))

    res.json({ success: true, data: deleted })
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message })
  }
})

// Editar peso da listagem
app.put('/api/subetapas/pesos/:pesoId', async (req, res) => {
  const service = new SubetapasService()

  try {
    const pesoId = parseInt(req.params.pesoId)
    const { peso_kg } = req.body

    if (isNaN(pesoId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do peso inválido'
      })
    }

    if (peso_kg === undefined || peso_kg === null) {
      return res.status(400).json({
        success: false,
        error: 'Campo peso_kg é obrigatório'
      })
    }

    const data = await service.editarPeso(pesoId, peso_kg)

    res.json({
      success: true,
      message: 'Peso atualizado com sucesso',
      data
    })
  } catch (err) {
    console.error('Erro ao editar peso:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  } finally {
    await service.closeConnection()
  }
})
app.get('/api/posicoes', async (req, res) => {
  const service = new SubetapasService()

  try {
    const data = await service.buscarPosicoes()
    res.json({ success: true, total: data.length, data })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  } finally {
    await service.closeConnection()
  }
})

// API para calcular rendimento
app.get('/api/ordens/:id/rendimento', async (req, res) => {
  const service = new SubetapasService()

  try {
    const data = await service.calcularRendimento(parseInt(req.params.id))
    res.json({ success: true, total: data.length, data })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  } finally {
    await service.closeConnection()
  }
})

// ========== APIS DASHBOARD E MÉTRICAS ==========

// Métricas gerais do sistema
app.get('/api/dashboard/metricas', async (req: Request, res: Response) => {
  let client

  try {
    client = await connectDB()
    if (!client) {
      return res
        .status(500)
        .json({ success: false, error: 'Erro conexão banco' })
    }

    // Consulta complexa para métricas
    const query = `
            WITH metricas_base AS (
                SELECT
                    COUNT(DISTINCT o.id) as total_ordens,
                    COUNT(DISTINCT CASE WHEN o.status = 'ABERTA' THEN o.id END) as ordens_abertas,
                    COUNT(DISTINCT CASE WHEN o.status = 'EM_ANDAMENTO' THEN o.id END) as ordens_andamento,
                    COUNT(DISTINCT CASE WHEN o.status = 'FECHADA' THEN o.id END) as ordens_fechadas,
                    COALESCE(SUM(CASE WHEN s.numero_etapa = 0 THEN r.peso_kg END), 0) as peso_entrada_total,
                    COALESCE(SUM(CASE WHEN s.numero_etapa = 99 THEN r.peso_kg END), 0) as peso_saida_total,
                    COUNT(DISTINCT r.operador) as total_operadores,
                    COUNT(DISTINCT l.id) as linhas_ativas
                FROM ordem_producao o
                LEFT JOIN subetapa s ON o.id = s.ordem_producao_id
                LEFT JOIN registro_peso r ON s.id = r.subetapa_id
                LEFT JOIN linha_producao l ON o.linha_producao_id = l.id
                WHERE o.data_criacao >= CURRENT_DATE - INTERVAL '30 days'
            ),
            producao_hoje AS (
                SELECT
                    COALESCE(SUM(CASE WHEN s.numero_etapa = 99 THEN r.peso_kg END), 0) as producao_hoje
                FROM ordem_producao o
                JOIN subetapa s ON o.id = s.ordem_producao_id
                JOIN registro_peso r ON s.id = r.subetapa_id
                WHERE DATE(r.data_registro) = CURRENT_DATE
            ),
            rendimento_medio AS (
                SELECT
                    CASE
                        WHEN SUM(CASE WHEN s.numero_etapa = 0 THEN r.peso_kg END) > 0
                        THEN ROUND((SUM(CASE WHEN s.numero_etapa = 99 THEN r.peso_kg END) /
                              SUM(CASE WHEN s.numero_etapa = 0 THEN r.peso_kg END) * 100)::numeric, 2)
                        ELSE 0
                    END as rendimento_geral
                FROM ordem_producao o
                JOIN subetapa s ON o.id = s.ordem_producao_id
                JOIN registro_peso r ON s.id = r.subetapa_id
                WHERE o.data_criacao >= CURRENT_DATE - INTERVAL '7 days'
            )
            SELECT
                mb.*,
                pt.producao_hoje,
                rm.rendimento_geral,
                CASE
                    WHEN mb.peso_entrada_total > 0
                    THEN ROUND((mb.peso_saida_total / mb.peso_entrada_total * 100)::numeric, 2)
                    ELSE 0
                END as rendimento_total
            FROM metricas_base mb
            CROSS JOIN producao_hoje pt
            CROSS JOIN rendimento_medio rm
        `

    const result = await client.query(query)

    res.json({
      success: true,
      data: result.rows[0] || {}
    })
  } catch (error: any) {
    console.error('Erro buscar métricas:', error)
    res.status(500).json({ success: false, error: error.message })
  } finally {
    if (client) await client.end()
  }
})

// Produção por dia (últimos 7 dias)
app.get(
  '/api/dashboard/producao-diaria',
  async (req: Request, res: Response) => {
    let client

    try {
      client = await connectDB()
      if (!client) {
        return res
          .status(500)
          .json({ success: false, error: 'Erro conexão banco' })
      }

      const query = `
            WITH dias AS (
                SELECT generate_series(
                    CURRENT_DATE - INTERVAL '6 days',
                    CURRENT_DATE,
                    INTERVAL '1 day'
                )::date as data
            ),
            producao_diaria AS (
                SELECT
                    DATE(r.data_registro) as data,
                    SUM(CASE WHEN s.numero_etapa = 99 THEN r.peso_kg ELSE 0 END) as peso_producao,
                    COUNT(DISTINCT o.id) as ordens_finalizadas
                FROM ordem_producao o
                JOIN subetapa s ON o.id = s.ordem_producao_id
                JOIN registro_peso r ON s.id = r.subetapa_id
                WHERE r.data_registro >= CURRENT_DATE - INTERVAL '6 days'
                GROUP BY DATE(r.data_registro)
            )
            SELECT
                d.data,
                TO_CHAR(d.data, 'DD/MM') as data_formatada,
                EXTRACT(DOW FROM d.data) as dia_semana,
                COALESCE(p.peso_producao, 0) as producao,
                COALESCE(p.ordens_finalizadas, 0) as ordens
            FROM dias d
            LEFT JOIN producao_diaria p ON d.data = p.data
            ORDER BY d.data
        `

      const result = await client.query(query)

      res.json({
        success: true,
        data: result.rows
      })
    } catch (error: any) {
      console.error('Erro buscar produção diária:', error)
      res.status(500).json({ success: false, error: error.message })
    } finally {
      if (client) await client.end()
    }
  }
)

// Performance por linha de produção
app.get(
  '/api/dashboard/performance-linhas',
  async (req: Request, res: Response) => {
    let client

    try {
      client = await connectDB()
      if (!client) {
        return res
          .status(500)
          .json({ success: false, error: 'Erro conexão banco' })
      }

      const query = `
            SELECT
                l.nome as linha,
                COUNT(DISTINCT o.id) as total_ordens,
                COUNT(DISTINCT CASE WHEN o.status = 'FECHADA' THEN o.id END) as ordens_concluidas,
                COALESCE(SUM(CASE WHEN s.numero_etapa = 0 THEN r.peso_kg END), 0) as peso_entrada,
                COALESCE(SUM(CASE WHEN s.numero_etapa = 99 THEN r.peso_kg END), 0) as peso_saida,
                CASE
                    WHEN SUM(CASE WHEN s.numero_etapa = 0 THEN r.peso_kg END) > 0
                    THEN ROUND((SUM(CASE WHEN s.numero_etapa = 99 THEN r.peso_kg END) /
                          SUM(CASE WHEN s.numero_etapa = 0 THEN r.peso_kg END) * 100)::numeric, 2)
                    ELSE 0
                END as rendimento,
                ROUND(AVG(EXTRACT(EPOCH FROM (o.data_fim - o.data_criacao))/3600)::numeric, 1) as tempo_medio_horas
            FROM linha_producao l
            LEFT JOIN ordem_producao o ON l.id = o.linha_producao_id
            LEFT JOIN subetapa s ON o.id = s.ordem_producao_id
            LEFT JOIN registro_peso r ON s.id = r.subetapa_id
            WHERE l.ativa = true
            AND o.data_criacao >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY l.id, l.nome
            ORDER BY peso_saida DESC
        `

      const result = await client.query(query)

      res.json({
        success: true,
        data: result.rows
      })
    } catch (error: any) {
      console.error('Erro buscar performance linhas:', error)
      res.status(500).json({ success: false, error: error.message })
    } finally {
      if (client) await client.end()
    }
  }
)

// Ranking de operadores
app.get(
  '/api/dashboard/ranking-operadores',
  async (req: Request, res: Response) => {
    let client

    try {
      client = await connectDB()
      if (!client) {
        return res
          .status(500)
          .json({ success: false, error: 'Erro conexão banco' })
      }

      const query = `
            SELECT
                r.operador,
                COUNT(r.id) as total_registros,
                SUM(r.peso_kg) as peso_total_registrado,
                COUNT(DISTINCT DATE(r.data_registro)) as dias_ativos,
                ROUND(AVG(r.peso_kg)::numeric, 2) as peso_medio_por_registro,
                MAX(r.data_registro) as ultimo_registro
            FROM registro_peso r
            WHERE r.data_registro >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY r.operador
            HAVING COUNT(r.id) >= 5
            ORDER BY total_registros DESC
            LIMIT 10
        `

      const result = await client.query(query)

      res.json({
        success: true,
        data: result.rows
      })
    } catch (error: any) {
      console.error('Erro buscar ranking operadores:', error)
      res.status(500).json({ success: false, error: error.message })
    } finally {
      if (client) await client.end()
    }
  }
)

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`)
  console.log(`📊 API teste: http://localhost:${PORT}/api/teste`)
  console.log(`🎣 Dados produção: http://localhost:${PORT}/api/producao`)
  console.log('🛑 Para parar: Ctrl + C')
})
