/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from 'pg'
import { connectDB } from '../database'

export class SubetapasService {
  private client: Client | null = null

  private async getClient(): Promise<Client> {
    if (!this.client) {
      this.client = await connectDB()
      if (!this.client) {
        throw new Error('Erro ao conectar ao banco de dados')
      }
    }
    return this.client
  }

  async buscarSubetapas(ordemId: number) {
    const client = await this.getClient()

    const query = `
      SELECT
        s.*,
        COALESCE(SUM(r.peso_kg), 0) as peso_total,
        COUNT(r.id) as total_registros,
        MAX(r.data_registro) as ultimo_peso
      FROM subetapa s
      LEFT JOIN registro_peso r ON s.id = r.subetapa_id
      WHERE s.ordem_producao_id = $1
      GROUP BY s.id
      ORDER BY s.numero_etapa
    `
    const result = await client.query(query, [ordemId])
    return result.rows
  }

  async criarSubetapa(ordemId: number, data: any) {
    const client = await this.getClient()

    const { descricao, item_codigo, criado_por } = data

    if (!item_codigo) {
      throw new Error('Campo obrigatório: item_codigo')
    }

    // 🔎 Buscar última subetapa criada pelo usuário (ignorando a 99)
    const ultimaEtapaResult = await client.query(
      `
        SELECT COALESCE(MAX(numero_etapa), 0) as ultima_etapa
        FROM subetapa
        WHERE ordem_producao_id = $1
          AND numero_etapa <> 99
      `,
      [ordemId],
    )

    const ultimaEtapa = ultimaEtapaResult.rows[0]?.ultima_etapa || 0
    const proximaEtapa = ultimaEtapa + 1

    const isSistema = !criado_por || criado_por.toLowerCase() === 'sistema'
    const ativa = !isSistema
    const data_ativacao = ativa ? new Date() : null

    const query = `
      INSERT INTO subetapa (
        ordem_producao_id,
        numero_etapa,
        descricao,
        item_codigo,
        criado_por,
        ativa,
        data_ativacao
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `
    const values = [
      ordemId,
      proximaEtapa,
      descricao || `Etapa ${proximaEtapa}`,
      item_codigo,
      criado_por || 'Sistema',
      ativa,
      data_ativacao,
    ]

    const result = await client.query(query, values)
    const subetapaCriada = result.rows[0]

    // Atualizar quantidade de subetapas na linha de produção
    const ordemResult = await client.query(
      `SELECT linha_producao_id FROM ordem_producao WHERE id = $1`,
      [ordemId],
    )

    const linhaProducaoId = ordemResult.rows[0]?.linha_producao_id
    if (linhaProducaoId) {
      await client.query(
        `UPDATE linha_producao SET num_subetapas = num_subetapas + 1 WHERE id = $1`,
        [linhaProducaoId],
      )
    }

    return subetapaCriada
  }

  async buscarPesos(subetapaId: number) {
    const client = await this.getClient()

    const query = `
    SELECT
      r.id,
      r.subetapa_id,
      r.data_registro,
      r.operador,
      r.peso_kg,
      r.quantidade_unidades,
      r.tipo_medida,
      r.observacoes,
      r.estacao,
      r.executor,
      r.posicao,
      s.numero_etapa,
      s.item_codigo,
      s.descricao AS etapa_descricao,
      o.codigo AS ordem_codigo
    FROM registro_peso r
    JOIN subetapa s ON r.subetapa_id = s.id
    JOIN ordem_producao o ON s.ordem_producao_id = o.id
    WHERE r.subetapa_id = $1
    ORDER BY r.data_registro DESC
  `

    const result = await client.query(query, [subetapaId])
    return result.rows
  }

  async registrarPeso(subetapaId: number, data: any) {
    const client = await this.getClient()

    const {
      operador,
      quantidade_unidades,
      tipo_medida,
      estacao,
      peso_kg,
      posicao,
    } = data

    if (!operador || !peso_kg) {
      throw new Error('Campos obrigatórios: operador, peso_kg')
    }

    const peso = parseFloat(peso_kg)
    if (peso < 0) {
      throw new Error('Peso deve ser maior que zero')
    }

    const query = `
      INSERT INTO registro_peso
      (subetapa_id, operador, peso_kg, quantidade_unidades, tipo_medida, estacao, posicao)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `
    const values = [
      subetapaId,
      operador.toUpperCase(),
      peso,
      quantidade_unidades ? parseInt(quantidade_unidades) : 1,
      tipo_medida || 'KG',
      estacao || 'WEB',
      posicao,
    ]

    const result = await client.query(query, values)
    return result.rows[0]
  }

  async buscarPosicoes() {
    const client = await this.getClient()

    const query = `
      SELECT id, descricao
      FROM posicao_linha
      ORDER BY descricao ASC
    `
    const result = await client.query(query)
    return result.rows
  }

  async calcularRendimento(ordemId: number) {
    const client = await this.getClient()

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
    `
    const result = await client.query(query, [ordemId])
    return result.rows
  }

  async ativarSubetapa(
    subetapaId: number,
    ativa: boolean,
    data_ativacao: string,
  ) {
    const client = await this.getClient()

    const query = `
      UPDATE subetapa
      SET
        ativa = $1,
        data_ativacao = $2
      WHERE id = $3
      RETURNING *
    `
    const values = [ativa, data_ativacao, subetapaId]
    const result = await client.query(query, values)
    const subetapa = result.rows[0]

    if (!subetapa) {
      throw new Error('Subetapa não encontrada')
    }

    // 🔹 Regra 1: primeira subetapa ativada -> ordem vai para EM_ANDAMENTO
    if (subetapa.numero_etapa === 1 && ativa) {
      await client.query(
        `
          UPDATE ordem_producao
          SET status = 'EM_ANDAMENTO'
          WHERE id = $1
        `,
        [subetapa.ordem_producao_id],
      )
    }

    return subetapa
  }

  async concluirSubetapa(
    subetapaId: number,
    ativa: boolean,
    data_conclusao: string,
  ) {
    const client = await this.getClient()

    const query = `
      UPDATE subetapa
      SET
        ativa = $1,
        data_conclusao = $2
      WHERE id = $3
      RETURNING *
    `
    const values = [ativa, data_conclusao, subetapaId]
    const result = await client.query(query, values)
    const subetapa = result.rows[0]

    if (!subetapa) {
      throw new Error('Subetapa não encontrada')
    }

    // 🔹 Regra 2: se subetapa 99 for concluída e não houver mais nenhuma ativa -> FECHADA
    if (subetapa.numero_etapa === 99 && !ativa) {
      const checkQuery = `
        SELECT COUNT(*) as ativas
        FROM subetapa
        WHERE ordem_producao_id = $1 AND ativa = true
      `
      const checkResult = await client.query(checkQuery, [
        subetapa.ordem_producao_id,
      ])
      const ativas = parseInt(checkResult.rows[0].ativas, 10)

      if (ativas === 0) {
        await client.query(
          `
            UPDATE ordem_producao
            SET status = 'FECHADA', data_fim = NOW()
            WHERE id = $1
          `,
          [subetapa.ordem_producao_id],
        )
      }
    }

    return subetapa
  }

  async closeConnection() {
    if (this.client) {
      await this.client.end()
      this.client = null
    }
  }

  async listaRegistroPesos(subetapaId: number) {
    const client = await this.getClient()

    const query = `
      SELECT *
      FROM registro_peso
      WHERE subetapa_id = $1
      ORDER BY created_at DESC
    `
    const result = await client.query(query, [subetapaId])
    return result.rows
  }

  async deletarPeso(pesoId: number) {
    const client = await this.getClient()

    const query = `
      DELETE FROM registro_peso
      WHERE id = $1
      RETURNING *
    `
    const result = await client.query(query, [pesoId])
    if (result.rowCount === 0) {
      throw new Error(`Registro de peso com id ${pesoId} não encontrado`)
    }

    return result.rows[0] // retorna o registro deletado
  }

  async editarPeso(pesoId: number, novoPeso: number) {
    const client = await this.getClient()

    if (!pesoId) {
      throw new Error('ID do peso é obrigatório')
    }

    if (novoPeso === undefined || novoPeso === null) {
      throw new Error('O campo peso_kg é obrigatório')
    }

    const peso = parseFloat(novoPeso as unknown as string)
    if (isNaN(peso) || peso < 0) {
      throw new Error('Peso deve ser um número maior que zero')
    }

    const query = `
    UPDATE registro_peso
    SET peso_kg = $1, data_registro = NOW()
    WHERE id = $2
    RETURNING *
  `
    const result = await client.query(query, [peso, pesoId])

    if (result.rowCount === 0) {
      throw new Error(`Registro de peso com id ${pesoId} não encontrado`)
    }

    return result.rows[0]
  }

  async deletarSubetapa(subetapaId: number) {
    const client = await this.getClient()

    // 1️⃣ Verificar se a subetapa existe
    const subetapaResult = await client.query(
      `SELECT id, ordem_producao_id FROM subetapa WHERE id = $1`,
      [subetapaId],
    )

    if (subetapaResult.rowCount === 0) {
      throw new Error('Subetapa não encontrada')
    }

    const subetapa = subetapaResult.rows[0]

    // 2️⃣ Verificar se existe algum registro de peso
    const pesoResult = await client.query(
      `SELECT COUNT(*) as total FROM registro_peso WHERE subetapa_id = $1`,
      [subetapaId],
    )

    const totalPesos = parseInt(pesoResult.rows[0].total, 10)

    if (totalPesos > 0) {
      throw new Error(
        'Não é possível deletar a subetapa pois existem registros de peso vinculados',
      )
    }

    // 3️⃣ Deletar subetapa
    const deleteResult = await client.query(
      `DELETE FROM subetapa WHERE id = $1 RETURNING *`,
      [subetapaId],
    )

    const subetapaDeletada = deleteResult.rows[0]

    // 4️⃣ Atualizar contador de subetapas da linha de produção
    const ordemResult = await client.query(
      `SELECT linha_producao_id FROM ordem_producao WHERE id = $1`,
      [subetapa.ordem_producao_id],
    )

    const linhaProducaoId = ordemResult.rows[0]?.linha_producao_id

    if (linhaProducaoId) {
      await client.query(
        `
        UPDATE linha_producao
        SET num_subetapas = GREATEST(num_subetapas - 1, 0)
        WHERE id = $1
        `,
        [linhaProducaoId],
      )
    }

    return subetapaDeletada
  }
}
