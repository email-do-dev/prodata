export function ListagemPesos({setIsListPesosOpen, subetapaPesos}) {
  const handleCloseDialog = () => {
    setIsListPesosOpen(false)
  } 

  const pesoFormatado = (peso) => {
    const formattedNumber = parseFloat(peso);

    return formattedNumber.toFixed(1).replace(".", ",");
    ;
    
    
  }

  console.log(subetapaPesos)

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <div className="lista-pesos-container">
          {subetapaPesos.map((registroPeso) => 
              
            (
              <span className="item-lista-pesos">{pesoFormatado(registroPeso.peso_kg)} KG</span>
            )
          )}
        </div>

        <button className="botao-cancelar-op" onClick={() => handleCloseDialog()}>Fechar</button>
      </div>
    </div>
  )
}
