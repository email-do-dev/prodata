import React, { useState, useEffect } from 'react';

export function RegistroPesoOperacional({ subetapa, offline, onPesoRegistrado, onCancelar }) {
  const [formData, setFormData] = useState({
    operador_id: '',
    quantidade_unidades: '',
    executor_id: '',
    estacao: 'TABLET'
  });

  const [operadores, setOperadores] = useState([]);
  const [loadingOperadores, setLoadingOperadores] = useState(true);

  const [posicaoLinha, setPosicaoLinha] = useState([]);
  const [loadingPosicaoLinha, setLoadingPosicaoLinha] = useState(true);

  useEffect(() => {
    const fetchPosicaoLinha = async () => {
      try {
        const response = await fetch('/api/posicoes');
        const data = await response.json();
        if (data.success) {
          setPosicaoLinha(data.data);
        }
      } catch (error) {
        console.error('Erro ao buscar posições de linha:', error);
      } finally {
        setLoadingPosicaoLinha(false);
      }
    };

    fetchPosicaoLinha();
  }, []);

  useEffect(() => {
    const fetchOperadores = async () => {
      try {
        const response = await fetch('/api/operadores');
        const data = await response.json();
        if (data.success) {
          setOperadores(data.data);
        }
      } catch (error) {
        console.error('Erro ao buscar operadores:', error);
      } finally {
        setLoadingOperadores(false);
      }
    };
    fetchOperadores();
  }, []);

  const handleAddPeso = (valor) => {
    const pesoAtual = parseFloat(formData.quantidade_unidades) || 0;
    const novoPeso = (pesoAtual + valor).toFixed(3);
    setFormData({ ...formData, quantidade_unidades: novoPeso });
  };

  const handleClearPeso = () => {
    setFormData({ ...formData, quantidade_unidades: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.operador_id) {
      alert('Selecione um operador!');
      return;
    }

    const operadorSelecionado = operadores.find(
      (op) => op.id === parseInt(formData.operador_id)
    );

    if (!operadorSelecionado) {
      alert('Operador inválido!');
      return;
    }

    const payload = {
      subetapa_id: subetapa.id,
      operador: operadorSelecionado.nome,
      peso_kg: parseFloat(formData.quantidade_unidades) || 0,
      quantidade_unidades: parseFloat(formData.quantidade_unidades),
      executor: formData.executor,
      estacao: formData.estacao
    };

    if (offline) {
      onPesoRegistrado(payload);
    } else {
      try {
        const response = await fetch(`/api/subetapas/${subetapa.id}/pesos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.success) {
          onPesoRegistrado(payload);
        } else {
          alert('❌ Erro: ' + data.error);
        }
      } catch (error) {
        onPesoRegistrado(payload);
      }
    }
  };

  return (
    <div className="modal-peso-operacional">
      <div className="modal-content-op">
        <h2>⚖️ Registrar Peso</h2>

        <div className="etapa-info-modal">
          <p><strong>Etapa {subetapa.numero_etapa}:</strong> {subetapa.item_codigo}</p>
          <p><strong>Peso atual:</strong> {Number(subetapa.peso_total).toFixed(1)} kg</p>
        </div>

        <form onSubmit={handleSubmit} className="form-peso-op">

          {/* SELECT DE OPERADORES */}
          <div className="input-group-op">
            <label>👤 Pesado por:</label>
            {loadingOperadores ? (
              <p>⏳ Carregando operadores...</p>
            ) : (
              <select
                value={formData.operador_id}
                onChange={(e) =>
                  setFormData({ ...formData, operador_id: e.target.value })
                }
                required
              >
                <option value="">Selecione um operador</option>
                {operadores.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.nome} (Matrícula: {op.matricula})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* INPUT PESO + BOTÕES */}
          <div className="input-group-op">
            <label>⚖️ Quantidade:</label>
            <input
              type="number"
              step="0.001"
              value={formData.quantidade_unidades}
              onChange={(e) =>
                setFormData({ ...formData, quantidade_unidades: e.target.value })
              }
              placeholder="0.000"
              required
            />
            <div className="botoes-peso" style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              {[10, 20, 30, 40].map((valor) => (
                <button
                  type="button"
                  key={valor}
                  onClick={() => handleAddPeso(valor)}
                  style={{
                    flex: '1',
                    padding: '10px',
                    fontSize: '1rem',
                    background: '#1A4E9A',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  +{valor}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClearPeso}
                style={{
                  flex: '1',
                  padding: '10px',
                  fontSize: '1rem',
                  background: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Limpar
              </button>
            </div>
          </div>

          {/* EXECUTOR */}
          {/* <div className="input-group-op">
            <label>📝 Enviado para:</label>
            <textarea
              value={formData.executor}
              onChange={(e) =>
                setFormData({ ...formData, executor: e.target.value })
              }
              placeholder="Executor"
              rows="2"
            />
          </div> */}
          {/* SELECT DE OPERADORES */}
          <div className="input-group-op">
            <label>Posição:</label>
            {loadingPosicaoLinha ? (
              <p>⏳ Carregando posições de linha...</p>
            ) : (
              <select
                value={formData.executor_id}
                onChange={(e) =>
                  setFormData({ ...formData, executor_id: e.target.value })
                }
                required
              >
                <option value="">Selecione a posição</option>
                {posicaoLinha.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.descricao}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* AÇÕES */}
          <div className="botoes-op">
            <button type="button" onClick={onCancelar} className="botao-cancelar-op">
              ❌ CANCELAR
            </button>
            <button type="submit" className="botao-confirmar-op">
              ✅ CONFIRMAR
            </button>
          </div>
        </form>

        {offline && (
          <div className="aviso-offline">
            📴 Modo offline - dados serão sincronizados quando conectar
          </div>
        )}
      </div>
    </div>
  );
}
