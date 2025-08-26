import React, { useState, useEffect } from 'react';

export function NovaSubetapa({ ordemId, onSubetapaCriada, setShowNovaSubetapa, showNovaSubetapa }) {
  const [formData, setFormData] = useState({
    numero_etapa: '',
    descricao: '',
    item_codigo: '',
    criado_por: ''
  });
  const [operadores, setOperadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOperadores, setLoadingOperadores] = useState(true);

  useEffect(() => {
    const fetchOperadores = async () => {
      try {
        const response = await fetch('/api/operadores');
        const data = await response.json();
        if (data.success) {
          setOperadores(data.data);
        } else {
          console.error('Erro ao carregar operadores:', data.error);
        }
      } catch (error) {
        console.error('Erro ao carregar operadores:', error);
      } finally {
        setLoadingOperadores(false);
      }
    };

    fetchOperadores();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.criado_por) {
      alert('Selecione um operador!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/ordens/${ordemId}/subetapas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Subetapa criada com sucesso!');
        onSubetapaCriada();
      } else {
        alert('❌ Erro: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!showNovaSubetapa) return null;

  return (
    <div 
      className="dialog-overlay" 
      onClick={() => setShowNovaSubetapa(false)} // Fecha clicando fora
    >
      <div 
        className="dialog-content" 
        onClick={(e) => e.stopPropagation()} // Impede que clique no conteúdo feche
      >
        <h3>➕ Nova Subetapa</h3>
        <form onSubmit={handleSubmit} className="form-nova-subetapa-tablet">
          <input
            type="number"
            className='input-form-nova-subetapa-tablet'
            placeholder="Nº Etapa (1-98)"
            value={formData.numero_etapa}
            onChange={(e) => setFormData({...formData, numero_etapa: e.target.value})}
            min="1" max="98"
            required
          />
          <input
            type="text"
            className='input-form-nova-subetapa-tablet'
            placeholder="Item/Código"
            value={formData.item_codigo}
            onChange={(e) => setFormData({...formData, item_codigo: e.target.value})}
            required
          />
          <input
            type="text"
            className='input-form-nova-subetapa-tablet'
            placeholder="Descrição"
            value={formData.descricao}
            onChange={(e) => setFormData({...formData, descricao: e.target.value})}
          />

          {loadingOperadores ? (
            <p>⏳ Carregando operadores...</p>
          ) : (
            <select
              className='input-form-nova-subetapa-tablet'
              value={formData.criado_por}
              onChange={(e) => setFormData({...formData, criado_por: e.target.value})}
              required
            >
              <option value="">Selecione Operador</option>
              {operadores.map(op => (
                <option key={op.id} value={op.nome}>
                  {op.nome} (Mat: {op.matricula})
                </option>
              ))}
            </select>
          )}

          <div className="buttons-section-form-nova-subetapa-tablet">
            <button type="button" className='botao-cancelar-op' onClick={() => setShowNovaSubetapa(false)}>
              ❌ Cancelar
            </button>
            <button type="submit" disabled={loading} className="botao-confirmar-op">
              {loading ? '⏳' : '💾'} Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
