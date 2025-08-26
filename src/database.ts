/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, ClientConfig } from 'pg'

// Configuração da conexão
const dbConfig: ClientConfig = {
  host: 'localhost',
  port: 5432,
  database: 'prodatadb',
  user: 'postgres',
  password: 'postgres',
}

// Função para conectar
export async function connectDB(): Promise<Client | null> {
  const client = new Client(dbConfig)
  try {
    await client.connect()
    console.log('✅ Conectado ao PostgreSQL')
    return client
  } catch (error: any) {
    console.error('❌ Erro ao conectar:', error.message)
    return null
  }
}

// Função para buscar linhas de produção
export async function getLinhasProducao(): Promise<any[]> {
  const client = await connectDB()
  if (!client) return []

  try {
    const result = await client.query(
      'SELECT * FROM linha_producao WHERE ativa = true',
    )
    await client.end()
    return result.rows
  } catch (error: any) {
    console.error('❌ Erro na consulta:', error.message)
    await client.end()
    return []
  }
}
