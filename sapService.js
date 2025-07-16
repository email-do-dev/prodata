// sapService.js - Conexão com SAP Business One
const sql = require('mssql');

// Configuração da conexão SAP
const sapConfig = {
    server: '179.191.17.10',        // IP do servidor SAP
    database: 'SBO_MATANORTE_PROD',   // Nome do banco SAP
    user: 'auditoria',     // Usuário SAP
    password: '8RAf4vo4DpwXtAi4BNJZ',   // Senha SAP
    port: 5124,                   // Porta padrão SQL Server
    options: {
        encrypt: false,           // Para conexões locais
        trustServerCertificate: true,
        requestTimeout: 30000,    // 30 segundos timeout
        connectionTimeout: 10000  // 10 segundos para conectar
    }
};

// Cache simples em memória
let produtosCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

class SAPService {
    
    // Conectar ao SAP
    async connect() {
        try {
            console.log('🔄 Conectando ao SAP...');
            const pool = new sql.ConnectionPool(sapConfig);
            await pool.connect();
            console.log('✅ Conectado ao SAP Business One');
            return pool;
        } catch (error) {
            console.error('❌ Erro ao conectar SAP:', error.message);
            throw new Error(`Falha conexão SAP: ${error.message}`);
        }
    }

    // Buscar produtos (tabela OITM)
    async getProdutos(limit = 50) {
        // Verificar cache primeiro
        if (produtosCache && cacheTimestamp) {
            const ageCached = Date.now() - cacheTimestamp;
            if (ageCached < CACHE_DURATION) {
                console.log('📦 Dados do cache (válido por mais ' + 
                    Math.round((CACHE_DURATION - ageCached) / 60000) + ' min)');
                return produtosCache;
            }
        }

        let pool;
        try {
            pool = await this.connect();
            
            const query = `
                SELECT TOP ${limit}
                    ItemCode as codigo,
                    ItemName as nome,
                    InvntryUom as unidade,
                    QryGroup1 as ativo,
                    LastPurPrc as ultimo_custo,
                    ItmsGrpCod as grupo_item
                FROM OITM 
                WHERE QryGroup1 = 'Y'
                ORDER BY ItemName
            `;
            
            console.log('🔍 Consultando produtos SAP...');
            const result = await pool.request().query(query);
            
            // Atualizar cache
            produtosCache = result.recordset;
            cacheTimestamp = Date.now();
            
            console.log(`✅ ${result.recordset.length} produtos encontrados`);
            return result.recordset;
            
        } catch (error) {
            console.error('❌ Erro consulta produtos:', error.message);
            throw error;
        } finally {
            if (pool) {
                await pool.close();
            }
        }
    }

    // Buscar ordens de produção (tabela OWOR)
    async getOrdensProducao(limit = 20) {
        let pool;
        try {
            pool = await this.connect();
            
            const query = `
                SELECT TOP ${limit}
                    DocNum as numero_ordem,
                    ItemCode as item_codigo,
                    ProdName as produto_nome,
                    PlannedQty as quantidade_planejada,
                    CmpltQty as quantidade_completa,
                    Status as status,
                    PostDate as data_criacao,
                    DueDate as data_vencimento
                FROM OWOR 
                WHERE Status IN ('R', 'L')  -- Released, Started
                ORDER BY DocNum DESC
            `;
            
            console.log('🔍 Consultando ordens produção SAP...');
            const result = await pool.request().query(query);
            
            console.log(`✅ ${result.recordset.length} ordens encontradas`);
            return result.recordset;
            
        } catch (error) {
            console.error('❌ Erro consulta ordens:', error.message);
            throw error;
        } finally {
            if (pool) {
                await pool.close();
            }
        }
    }

    // Teste de conectividade
    async testeConexao() {
        let pool;
        try {
            pool = await this.connect();
            
            // Query simples para testar
            const result = await pool.request().query('SELECT GETDATE() as data_servidor');
            
            return {
                success: true,
                message: 'Conexão SAP OK',
                data_servidor: result.recordset[0].data_servidor,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message,
                timestamp: new Date().toISOString()
            };
        } finally {
            if (pool) {
                await pool.close();
            }
        }
    }
}

module.exports = new SAPService();