// server.js - Primeiro servidor web
const express = require('express');
const app = express();
const PORT = 3001;

// Middleware para processar JSON
app.use(express.json());

// Rota principal - nossa primeira página
app.get('/', (req, res) => {
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
    `);
});

// Rota de teste para API
app.get('/api/teste', (req, res) => {
    res.json({
        message: 'API funcionando!',
        timestamp: new Date().toISOString(),
        status: 'success'
    });
});

// Rota específica para testar dados de produção
app.get('/api/producao', (req, res) => {
    // Dados fictícios por enquanto
    res.json({
        ordens_abertas: 5,
        producao_hoje: '1.250 kg',
        rendimento_medio: '85%',
        linhas_ativas: ['Sardinha em Lata', 'Atum em Lata', 'Congelamento']
    });
});

// Adicionar no topo do server.js
const { getLinhasProducao } = require('./database');

// Adicionar nova rota ANTES de app.listen()
app.get('/api/linhas-producao', async (req, res) => {
    try {
        const linhas = await getLinhasProducao();
        res.json({
            success: true,
            total: linhas.length,
            data: linhas
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Importar serviço SAP
const sapService = require('./sapService');

// Rota teste de conexão SAP
app.get('/api/sap/teste', async (req, res) => {
    try {
        const resultado = await sapService.testeConexao();
        res.json(resultado);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota produtos SAP
app.get('/api/sap/produtos', async (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const produtos = await sapService.getProdutos(parseInt(limit));
        
        res.json({
            success: true,
            total: produtos.length,
            cache_info: 'Dados atualizados a cada 30min',
            data: produtos
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Erro ao buscar produtos SAP'
        });
    }
});

// Rota ordens de produção SAP
// ========== APIS ORDEM DE PRODUÇÃO ==========

// Buscar todas as ordens
app.get('/api/ordens', async (req, res) => {
    const { connectDB } = require('./database');
    let client;
    
    try {
        client = await connectDB();
        if (!client) {
            return res.status(500).json({ success: false, error: 'Erro conexão banco' });
        }

        const query = `
            SELECT 
                o.*,
                l.nome as linha_nome,
                EXTRACT(EPOCH FROM (NOW() - o.data_criacao))/3600 as horas_desde_criacao
            FROM ordem_producao o
            JOIN linha_producao l ON o.linha_producao_id = l.id
            ORDER BY o.data_criacao DESC
        `;
        
        const result = await client.query(query);
        
        res.json({
            success: true,
            total: result.rows.length,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Erro buscar ordens:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) await client.end();
    }
});

// Criar nova ordem - COM CÓDIGO AUTOMÁTICO
app.post('/api/ordens', async (req, res) => {
    const { connectDB } = require('./database');
    let client;
    
    try {
        let { linha_producao_id, item_entrada, item_saida, quantidade_inicial, observacoes } = req.body;
        
        // Validações básicas (codigo não é mais obrigatório)
        if (!linha_producao_id || !item_entrada || !item_saida) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatórios: linha_producao_id, item_entrada, item_saida'
            });
        }

        client = await connectDB();
        if (!client) {
            return res.status(500).json({ success: false, error: 'Erro conexão banco' });
        }

        // GERAR CÓDIGO AUTOMATICAMENTE
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        
        // Buscar último número sequencial do dia
        const queryUltimoNumero = `
            SELECT COALESCE(MAX(
                CAST(SUBSTRING(codigo FROM 'OP-${ano}${mes}${dia}-(\\d+)') AS INTEGER)
            ), 0) as ultimo_numero
            FROM ordem_producao 
            WHERE codigo LIKE 'OP-${ano}${mes}${dia}-%'
        `;
        
        const resultUltimo = await client.query(queryUltimoNumero);
        const proximoNumero = (resultUltimo.rows[0].ultimo_numero || 0) + 1;
        const numeroFormatado = String(proximoNumero).padStart(3, '0');
        
        // Código final: OP-20241216-001, OP-20241216-002, etc.
        const codigoAutomatico = `OP-${ano}${mes}${dia}-${numeroFormatado}`;

        const query = `
            INSERT INTO ordem_producao 
            (codigo, linha_producao_id, item_entrada, item_saida, quantidade_inicial, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        
        const values = [
            codigoAutomatico, 
            parseInt(linha_producao_id), 
            item_entrada, 
            item_saida, 
            parseFloat(quantidade_inicial) || 0, 
            observacoes || ''
        ];
        
        const result = await client.query(query, values);
        
        console.log(`✅ Ordem criada com código: ${codigoAutomatico}`);
        
        res.status(201).json({
            success: true,
            message: `Ordem criada com código: ${codigoAutomatico}`,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Erro criar ordem:', error);
        if (error.code === '23505') { // Duplicate key
            res.status(400).json({ success: false, error: 'Erro interno - código duplicado' });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    } finally {
        if (client) await client.end();
    }
});

// Atualizar status da ordem
app.put('/api/ordens/:id/status', async (req, res) => {
    const { connectDB } = require('./database');
    let client;
    
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Debug logs
        console.log('🔍 ID recebido:', id, 'Tipo:', typeof id);
        console.log('🔍 Status recebido:', status, 'Tipo:', typeof status);
        
        const statusValidos = ['ABERTA', 'EM_ANDAMENTO', 'FECHADA', 'CANCELADA'];
        if (!statusValidos.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Status deve ser: ' + statusValidos.join(', ')
            });
        }

        client = await connectDB();
        if (!client) {
            return res.status(500).json({ success: false, error: 'Erro conexão banco' });
        }

        // Query mais específica com cast explícito
        const query = `
            UPDATE ordem_producao 
            SET status = $1::VARCHAR, 
                data_fim = CASE WHEN $1::VARCHAR IN ('FECHADA', 'CANCELADA') THEN NOW() ELSE data_fim END
            WHERE id = $2::INTEGER
            RETURNING *
        `;
        
        const result = await client.query(query, [status, parseInt(id)]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Ordem não encontrada' });
        }
        
        console.log('✅ Status atualizado com sucesso');
        res.json({
            success: true,
            message: 'Status atualizado com sucesso',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Erro atualizar status:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) await client.end();
    }
});

// Deletar ordem (só se status ABERTA)
app.delete('/api/ordens/:id', async (req, res) => {
    const { connectDB } = require('./database');
    let client;
    
    try {
        const { id } = req.params;

        client = await connectDB();
        if (!client) {
            return res.status(500).json({ success: false, error: 'Erro conexão banco' });
        }

        // Verificar se pode deletar
        const checkQuery = 'SELECT status FROM ordem_producao WHERE id = $1';
        const checkResult = await client.query(checkQuery, [id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Ordem não encontrada' });
        }
        
        if (checkResult.rows[0].status !== 'ABERTA') {
            return res.status(400).json({ 
                success: false, 
                error: 'Só é possível deletar ordens com status ABERTA' 
            });
        }

        const deleteQuery = 'DELETE FROM ordem_producao WHERE id = $1 RETURNING codigo';
        const result = await client.query(deleteQuery, [id]);
        
        res.json({
            success: true,
            message: `Ordem ${result.rows[0].codigo} deletada com sucesso`
        });
        
    } catch (error) {
        console.error('Erro deletar ordem:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) await client.end();
    }
});

// Rota para forçar atualização do cache
app.post('/api/sap/sync', async (req, res) => {
    try {
        console.log('🔄 Sincronização manual iniciada...');
        const produtos = await sapService.getProdutos(100);
        
        res.json({
            success: true,
            message: 'Cache atualizado com sucesso',
            total_produtos: produtos.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Dashboard do sistema
app.get('/dashboard', async (req, res) => {
    try {
        // Buscar dados do PostgreSQL
        const { getLinhasProducao } = require('./database');
        const linhas = await getLinhasProducao();
        
        // Testar SAP
        const sapStatus = await sapService.testeConexao();
        
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
        `);
    } catch (error) {
        res.send(`<h1>❌ Erro no Dashboard</h1><p>${error.message}</p>`);
    }
});

// ========== APIS SUBETAPAS ==========

// Buscar subetapas de uma ordem
app.get('/api/ordens/:id/subetapas', async (req, res) => {
    const { connectDB } = require('./database');
    let client;
    
    try {
        const { id } = req.params;
        
        client = await connectDB();
        if (!client) {
            return res.status(500).json({ success: false, error: 'Erro conexão banco' });
        }

        const query = `
            SELECT 
                s.*,
                COALESCE(SUM(r.peso_kg), 0) as peso_total,
                COUNT(r.id) as total_registros,
                MAX(r.data_registro) as ultimo_peso
            FROM subetapa s
            LEFT JOIN registro_peso r ON s.id = r.subetapa_id
            WHERE s.ordem_producao_id = $1 AND s.ativa = true
            GROUP BY s.id
            ORDER BY s.numero_etapa
        `;
        
        const result = await client.query(query, [parseInt(id)]);
        
        res.json({
            success: true,
            total: result.rows.length,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Erro buscar subetapas:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) await client.end();
    }
});

// Criar nova subetapa
app.post('/api/ordens/:id/subetapas', async (req, res) => {
    const { connectDB } = require('./database');
    let client;
    
    try {
        const { id } = req.params;
        const { numero_etapa, descricao, item_codigo, criado_por } = req.body;
        
        if (!numero_etapa || !item_codigo) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatórios: numero_etapa, item_codigo'
            });
        }

        client = await connectDB();
        if (!client) {
            return res.status(500).json({ success: false, error: 'Erro conexão banco' });
        }

        const query = `
            INSERT INTO subetapa (ordem_producao_id, numero_etapa, descricao, item_codigo, criado_por)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const values = [
            parseInt(id), 
            parseInt(numero_etapa), 
            descricao || `Etapa ${numero_etapa}`, 
            item_codigo,
            criado_por || 'Sistema'
        ];
        
        const result = await client.query(query, values);
        
        res.status(201).json({
            success: true,
            message: 'Subetapa criada com sucesso',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Erro criar subetapa:', error);
        if (error.code === '23505') { // Unique violation
            res.status(400).json({ success: false, error: 'Etapa já existe para esta ordem' });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    } finally {
        if (client) await client.end();
    }
});

// ========== APIS REGISTRO PESO ==========

// Buscar pesos de uma subetapa
app.get('/api/subetapas/:id/pesos', async (req, res) => {
    const { connectDB } = require('./database');
    let client;
    
    try {
        const { id } = req.params;
        
        client = await connectDB();
        if (!client) {
            return res.status(500).json({ success: false, error: 'Erro conexão banco' });
        }

        const query = `
            SELECT 
                r.*,
                s.numero_etapa,
                s.item_codigo,
                s.descricao as etapa_descricao,
                o.codigo as ordem_codigo
            FROM registro_peso r
            JOIN subetapa s ON r.subetapa_id = s.id
            JOIN ordem_producao o ON s.ordem_producao_id = o.id
            WHERE r.subetapa_id = $1
            ORDER BY r.data_registro DESC
        `;
        
        const result = await client.query(query, [parseInt(id)]);
        
        res.json({
            success: true,
            total: result.rows.length,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Erro buscar pesos:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) await client.end();
    }
});

// Registrar novo peso
app.post('/api/subetapas/:id/pesos', async (req, res) => {
    const { connectDB } = require('./database');
    let client;
    
    try {
        const { id } = req.params;
        const { operador, peso_kg, quantidade_unidades, tipo_medida, observacoes, estacao } = req.body;
        
        if (!operador || !peso_kg) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatórios: operador, peso_kg'
            });
        }

        const peso = parseFloat(peso_kg);
        if (peso < 0) {
            return res.status(400).json({
                success: false,
                error: 'Peso deve ser maior que zero'
            });
        }

        client = await connectDB();
        if (!client) {
            return res.status(500).json({ success: false, error: 'Erro conexão banco' });
        }

        const query = `
            INSERT INTO registro_peso 
            (subetapa_id, operador, peso_kg, quantidade_unidades, tipo_medida, observacoes, estacao)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        const values = [
            parseInt(id),
            operador.toUpperCase(),
            peso,
            quantidade_unidades ? parseInt(quantidade_unidades) : null,
            tipo_medida || 'KG',
            observacoes || '',
            estacao || 'WEB'
        ];
        
        const result = await client.query(query, values);
        
        res.status(201).json({
            success: true,
            message: 'Peso registrado com sucesso',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Erro registrar peso:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) await client.end();
    }
});

// API para calcular rendimento
app.get('/api/ordens/:id/rendimento', async (req, res) => {
    const { connectDB } = require('./database');
    let client;
    
    try {
        const { id } = req.params;
        
        client = await connectDB();
        if (!client) {
            return res.status(500).json({ success: false, error: 'Erro conexão banco' });
        }

        const query = `
            WITH pesos_por_etapa AS (
                SELECT 
                    s.numero_etapa,
                    s.descricao,
                    s.item_codigo,
                    COALESCE(SUM(r.peso_kg), 0) as peso_total
                FROM subetapa s
                LEFT JOIN registro_peso r ON s.id = r.subetapa_id
                WHERE s.ordem_producao_id = $1 AND s.ativa = true
                GROUP BY s.id, s.numero_etapa, s.descricao, s.item_codigo
                ORDER BY s.numero_etapa
            ),
            rendimentos AS (
                SELECT 
                    *,
                    LAG(peso_total) OVER (ORDER BY numero_etapa) as peso_anterior,
                    CASE 
                        WHEN LAG(peso_total) OVER (ORDER BY numero_etapa) > 0 
                        THEN ROUND((peso_total / LAG(peso_total) OVER (ORDER BY numero_etapa) * 100)::numeric, 2)
                        ELSE NULL 
                    END as rendimento_etapa,
                    CASE 
                        WHEN FIRST_VALUE(peso_total) OVER (ORDER BY numero_etapa) > 0 
                        THEN ROUND((peso_total / FIRST_VALUE(peso_total) OVER (ORDER BY numero_etapa) * 100)::numeric, 2)
                        ELSE NULL 
                    END as rendimento_geral
                FROM pesos_por_etapa
            )
            SELECT * FROM rendimentos
        `;
        
        const result = await client.query(query, [parseInt(id)]);
        
        res.json({
            success: true,
            total: result.rows.length,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Erro calcular rendimento:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) await client.end();
    }
});

// ========== APIS DASHBOARD E MÉTRICAS ==========

// Métricas gerais do sistema
app.get('/api/dashboard/metricas', async (req, res) => {
    const { connectDB } = require('./database');
    let client;
    
    try {
        client = await connectDB();
        if (!client) {
            return res.status(500).json({ success: false, error: 'Erro conexão banco' });
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
        `;
        
        const result = await client.query(query);
        
        res.json({
            success: true,
            data: result.rows[0] || {}
        });
        
    } catch (error) {
        console.error('Erro buscar métricas:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) await client.end();
    }
});

// Produção por dia (últimos 7 dias)
app.get('/api/dashboard/producao-diaria', async (req, res) => {
    const { connectDB } = require('./database');
    let client;
    
    try {
        client = await connectDB();
        if (!client) {
            return res.status(500).json({ success: false, error: 'Erro conexão banco' });
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
        `;
        
        const result = await client.query(query);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Erro buscar produção diária:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) await client.end();
    }
});

// Performance por linha de produção
app.get('/api/dashboard/performance-linhas', async (req, res) => {
    const { connectDB } = require('./database');
    let client;
    
    try {
        client = await connectDB();
        if (!client) {
            return res.status(500).json({ success: false, error: 'Erro conexão banco' });
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
        `;
        
        const result = await client.query(query);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Erro buscar performance linhas:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) await client.end();
    }
});

// Ranking de operadores
app.get('/api/dashboard/ranking-operadores', async (req, res) => {
    const { connectDB } = require('./database');
    let client;
    
    try {
        client = await connectDB();
        if (!client) {
            return res.status(500).json({ success: false, error: 'Erro conexão banco' });
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
        `;
        
        const result = await client.query(query);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Erro buscar ranking operadores:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) await client.end();
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
    console.log(`📊 API teste: http://localhost:${PORT}/api/teste`);
    console.log(`🎣 Dados produção: http://localhost:${PORT}/api/producao`);
    console.log('🛑 Para parar: Ctrl + C');
});