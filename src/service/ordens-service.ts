import { Client } from 'pg'
import { connectDB } from '../database'

export class OrdensService {
  private client: Client | null = null

  async connect() {
    this.client = await connectDB()
    if (!this.client) throw new Error('Erro ao conectar ao banco de dados')
  }

  async disconnect() {
    if (this.client) await this.client.end()
  }

  async buscarTodas() {
    await this.connect()

    const query = `
      SELECT 
        o.*,
        l.nome as linha_nome,
        EXTRACT(EPOCH FROM (NOW() - o.data_criacao))/3600 as horas_desde_criacao
      FROM ordem_producao o
      JOIN linha_producao l ON o.linha_producao_id = l.id
      ORDER BY o.data_criacao DESC
    `
    const result = await this.client!.query(query)
    await this.disconnect()
    return result.rows
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async criarOrdem(data: any) {
    const {
      linha_producao_id,
      item_entrada,
      item_saida,
      quantidade_inicial,
      observacoes,
      // peso_sap,
    } = data

    if (!linha_producao_id || !item_entrada || !item_saida) {
      throw new Error(
        'Campos obrigatórios: linha_producao_id, item_entrada, item_saida',
      )
    }

    await this.connect()

    try {
      await this.client!.query('BEGIN')

      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')

      const queryUltimoNumero = `
      SELECT COALESCE(MAX(
          CAST(SUBSTRING(codigo FROM 'OP-${year}${month}${day}-(\\d+)') AS INTEGER)
      ), 0) as ultimo_numero
      FROM ordem_producao
      WHERE codigo LIKE 'OP-${year}${month}${day}-%'
    `
      const resultUltimo = await this.client!.query(queryUltimoNumero)
      const proximoNumero = (resultUltimo.rows[0].ultimo_numero || 0) + 1
      const numeroFormatado = String(proximoNumero).padStart(3, '0')
      const codigoAutomatico = `OP-${year}${month}${day}-${numeroFormatado}`

      const queryOrdem = `
      INSERT INTO ordem_producao
      (codigo, linha_producao_id, item_entrada, item_saida, quantidade_inicial, observacoes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, codigo
    `

      const ordemValues = [
        codigoAutomatico,
        parseInt(linha_producao_id),
        item_entrada,
        item_saida,
        parseFloat(quantidade_inicial) || 0,
        observacoes || '',
      ]

      const resultOrdem = await this.client!.query(queryOrdem, ordemValues)
      const ordemId = resultOrdem.rows[0].id

      const querySubetapa = `
      INSERT INTO subetapa 
      (ordem_producao_id, numero_etapa, descricao, item_codigo, data_criacao, criado_por, ativa, data_ativacao)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `

      const dataAtual = new Date().toISOString()

      // Subetapa 1 (entrada)
      await this.client!.query(querySubetapa, [
        ordemId,
        1,
        'Entrada do Processo',
        item_entrada,
        dataAtual,
        'Sistema',
        false,
        null,
      ])

      // Subetapa 99 (saída)
      await this.client!.query(querySubetapa, [
        ordemId,
        99,
        'Saída do Processo',
        item_saida,
        dataAtual,
        'Sistema',
        false,
        null,
      ])

      await this.client!.query('COMMIT')

      return {
        id: ordemId,
        codigo: codigoAutomatico,
      }
    } catch (error) {
      await this.client!.query('ROLLBACK')
      throw error
    } finally {
      await this.disconnect()
    }
  }

  async atualizarStatus(id: number, status: string) {
    const statusValidos = ['ABERTA', 'EM_ANDAMENTO', 'FECHADA', 'CANCELADA']
    if (!statusValidos.includes(status)) {
      throw new Error('Status inválido: ' + status)
    }

    await this.connect()

    const query = `
      UPDATE ordem_producao
      SET status = $1,
          data_fim = CASE WHEN $1 IN ('FECHADA', 'CANCELADA') THEN NOW() ELSE data_fim END
      WHERE id = $2
      RETURNING *
    `

    const result = await this.client!.query(query, [status, id])
    await this.disconnect()

    if (result.rows.length === 0) {
      throw new Error('Ordem não encontrada')
    }

    return result.rows[0]
  }

  async deletarOrdem(id: number) {
    await this.connect()

    const checkQuery = 'SELECT status FROM ordem_producao WHERE id = $1'
    const checkResult = await this.client!.query(checkQuery, [id])

    if (checkResult.rows.length === 0) {
      throw new Error('Ordem não encontrada')
    }

    if (checkResult.rows[0].status !== 'ABERTA') {
      throw new Error('Só é possível deletar ordens com status ABERTA')
    }

    const deleteQuery =
      'DELETE FROM ordem_producao WHERE id = $1 RETURNING codigo'
    const result = await this.client!.query(deleteQuery, [id])
    await this.disconnect()

    return result.rows[0].codigo
  }

  async buscarOperadores() {
    await this.connect()

    const query = `
      SELECT id, nome, matricula
      FROM operadores
      ORDER BY nome ASC
    `
    const result = await this.client!.query(query)
    await this.disconnect()

    return result.rows
  }
}
