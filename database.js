// database.js - Conexão com PostgreSQL
const { Client } = require('pg');

// Configuração da conexão
const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'prodatadb',
    user: 'postgres',
    password: 'postgres'
};

// Função para conectar
async function connectDB() {
    const client = new Client(dbConfig);
    try {
        await client.connect();
        console.log('✅ Conectado ao PostgreSQL');
        return client;
    } catch (error) {
        console.error('❌ Erro ao conectar:', error.message);
        return null;
    }
}

// Função para buscar linhas de produção
async function getLinhasProducao() {
    const client = await connectDB();
    if (!client) return [];
    
    try {
        const result = await client.query('SELECT * FROM linha_producao WHERE ativa = true');
        await client.end();
        return result.rows;
    } catch (error) {
        console.error('❌ Erro na consulta:', error.message);
        await client.end();
        return [];
    }
}

// Exportar funções
module.exports = {
    connectDB,
    getLinhasProducao
};