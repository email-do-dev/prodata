/* eslint-disable @typescript-eslint/no-explicit-any */
import sql from 'mssql'

type SqlConfig = sql.config

export interface ProdutoSAP {
  codigo: string
  nome: string
  unidade: string
  ultimo_custo: number
  grupo_item: number
  peso: number
  ativo: string
}

// Configuração da conexão SAP
const sapConfig: SqlConfig = {
  server: '179.191.17.10',
  database: 'SBO_MATANORTE_PROD',
  user: 'auditoria',
  password: '8RAf4vo4DpwXtAi4BNJZ',
  port: 5124,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 30000,
    connectTimeout: 10000,
  },
}

// Cache simples em memória
let produtosEntradaCache: ProdutoSAP[] | null = null
let produtosEntradaCacheTimestamp: number | null = null

let produtosSaidaCache: ProdutoSAP[] | null = null
let produtosSaidaCacheTimestamp: number | null = null

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutos

// Interface para os produtos

export class SAPService {
  async connect(): Promise<sql.ConnectionPool> {
    try {
      console.log('🔄 Conectando ao SAP...')
      const pool = new sql.ConnectionPool(sapConfig)
      await pool.connect()
      console.log('✅ Conectado ao SAP Business One')
      return pool
    } catch (error: any) {
      console.error('❌ Erro ao conectar SAP:', error.message)
      throw new Error(`Falha conexão SAP: ${error.message}`)
    }
  }

  public async getProdutosEntrada(limit = 9999): Promise<ProdutoSAP[]> {
    if (produtosEntradaCache && produtosEntradaCacheTimestamp) {
      const ageCached = Date.now() - produtosEntradaCacheTimestamp
      if (ageCached < CACHE_DURATION) {
        console.log(
          '📦 Dados do cache (entrada) válidos por mais ' +
            Math.round((CACHE_DURATION - ageCached) / 60000) +
            ' min',
        )
        return produtosEntradaCache
      }
    }

    let pool: sql.ConnectionPool | undefined
    try {
      pool = await this.connect()

      const query = `
        SELECT TOP ${limit}
          ItemCode as codigo,
          ItemName as nome,
          InvntryUom as unidade,
          LastPurPrc as ultimo_custo,
          ItmsGrpCod as grupo_item,
          IWeight1 as peso,
          validFor as ativo
        FROM OITM 
        WHERE (ItmsGrpCod = 102 OR ItmsGrpCod = 195)
         AND validFor = 'Y'
        ORDER BY ItemName
      `

      const result = await pool.request().query<ProdutoSAP>(query)

      produtosEntradaCache = result.recordset
      produtosEntradaCacheTimestamp = Date.now()

      console.log(
        `✅ ${result.recordset.length} produtos de entrada encontrados`,
      )
      return result.recordset
    } catch (error: any) {
      console.error('❌ Erro consulta produtos entrada:', error.message)
      throw error
    } finally {
      if (pool) await pool.close()
    }
  }

  async getProdutosSaida(limit = 9999): Promise<ProdutoSAP[]> {
    if (produtosSaidaCache && produtosSaidaCacheTimestamp) {
      const ageCached = Date.now() - produtosSaidaCacheTimestamp
      if (ageCached < CACHE_DURATION) {
        console.log(
          '📦 Dados do cache (saida) válidos por mais ' +
            Math.round((CACHE_DURATION - ageCached) / 60000) +
            ' min',
        )
        return produtosSaidaCache
      }
    }

    let pool: sql.ConnectionPool | undefined
    try {
      pool = await this.connect()

      const query = `
        SELECT TOP ${limit}
          ItemCode as codigo,
          ItemName as nome,
          InvntryUom as unidade,
          LastPurPrc as ultimo_custo,
          ItmsGrpCod as grupo_item,
          IWeight1 as peso,
          validFor as ativo
        FROM OITM 
        WHERE (ItmsGrpCod = 101 OR ItmsGrpCod = 195)
        AND validFor = 'Y'
        ORDER BY ItemName
      `

      const result = await pool.request().query<ProdutoSAP>(query)

      produtosSaidaCache = result.recordset
      produtosSaidaCacheTimestamp = Date.now()

      console.log(`✅ ${result.recordset.length} produtos de saída encontrados`)
      return result.recordset
    } catch (error: any) {
      console.error('❌ Erro consulta produtos saída:', error.message)
      throw error
    } finally {
      if (pool) await pool.close()
    }
  }

  // Teste de conectividade
  async testeConexao() {
    let pool
    try {
      pool = await this.connect()

      // Query simples para testar
      const result = await pool
        .request()
        .query('SELECT GETDATE() as data_servidor')

      return {
        success: true,
        message: 'Conexão SAP OK',
        data_servidor: result.recordset[0].data_servidor,
        timestamp: new Date().toISOString(),
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      }
    } finally {
      if (pool) {
        await pool.close()
      }
    }
  }

  async getPesosProdutosEntrada(productId: number) {
  }
}
