import { Visitor } from "../Visitante.js";
import { Rango } from "../Elementos/Reglas.js";

class TokenizadorVisitante extends Visitor {

  constructor(){
    super();
    this.tamaño_Concatenado=0;
  }
  Generador_Tokens(gramaticas){

    return `
      module Main
        IMPLICIT NONE ! Desactiva la asignación implicita de las variables
        contains


        function Nextsym(Cadena, indice) result(lexema)
          character(len=*), intent(in) :: Cadena
          integer, intent(inout) :: indice
          character(len=:), allocatable :: lexema
          integer :: in
          INTEGER :: opcion

          if (indice > len(Cadena)) then
            allocate( character(len=3) :: lexema )
            lexema = "EOF"
            return
          end if

          lexema = ${gramaticas[0].id+"(Cadena, indice)"}  ! produccion inicial
          return
        END function Nextsym
     
          ${gramaticas.map((produccion) => produccion.accept(this)).join('\n')}        

            ! Función para convertir una cadena de texto a mayúsculas
    function ToUpperCase(Cadena) result(UpperCaseCadena)
        character(len=*), intent(in) :: Cadena
        character(len=len(Cadena)) :: UpperCaseCadena
        integer :: i, charCode

        UpperCaseCadena = Cadena
        do i = 1, len(Cadena)
            charCode = iachar(Cadena(i:i))
            if (charCode >= iachar('a') .and. charCode <= iachar('z')) then
                UpperCaseCadena(i:i) = achar(charCode - 32)
            end if
        end do
    end function ToUpperCase

      END module Main
            `;
    }
    // Reglas

    VisitarProduccion(Regla) {
      return `
      function ${Regla.id}(Cadena, indice) result(lexema)
          character(len=*), intent(in) :: Cadena
          integer, intent(inout) :: indice
          character(len=:), allocatable :: lexema
          integer :: in
      ${Regla.expresion.accept(this)}
      lexema = "ERROR"
      END function ${Regla.id}
      `
    }


    VisitarOr(Regla) { // Una produccion

      return `
        ${Regla.expresion.map((expr) => expr.accept(this)).join('\n')} 
    `;
      //return Regla.expresion.map((expr) => expr.accept(this)).join('\n');
    }    

    VisitarUnion(Regla){ // Concatenaciones

      return `
      ! opcion del or
      if (.true.) then
      ${Regla.expresion.map((expr) => expr.accept(this)).join('\n')}
      end if
      `

    }

    // Prefijos
    VisitarVarios(Regla){
      return Regla
    }

    VisitarEtiqueta(Regla){
      return Regla
    }

    // Busqueda
    VisitarExpresiones(Regla){
      return `
      ${Regla.expresion.accept(this)}
      `
    }
    
    // Expresiones
    VisitarLiterales(Regla){
      let funcion;
      let cierre; 
      if (Regla.case_Letra == "i"){  // case insensitive
        funcion= "ToUpperCase("
        cierre = ")"
      }else if (Regla.case_Letra == null){
        funcion = ""
        cierre = ""
      }

          //if (Cadena(indice:indice + 3) == "hola" .and. len(Cadena) == len("hola")) 
      return `
      if (${funcion}"${Regla.Literal}"${cierre} == ${funcion}Cadena(indice:indice + ${Regla.Literal.length - 1})${cierre} .and. len(Cadena) == len("${Regla.Literal}")) then
          allocate( character(len=${Regla.Literal.length}) :: lexema)
          lexema = Cadena(indice:indice + ${Regla.Literal.length - 1})
          indice = indice + ${Regla.Literal.length}
          return
      end if
      `;

    }

    generateCaracteres(chars) {
      if (chars.length === 0) return '';
      return `
  if (findloc([${chars
      .map((char) => `"${char}"`)
      .join(', ')}], Cadena(in:in), 1) > 0) then
      lexema = Cadena(indice:in)
      indice = in + 1
      return
  end if
      `;
  }

    VisitarCorchete(Regla) {
      
      //return Regla.Rango.accept(this);
      return `
      in = indice
      ${this.generateCaracteres(
        Regla.Rango.filter((Regla) => typeof Regla === 'string')
      )}
      ${Regla.Rango
          .filter((Regla) => Regla instanceof Rango)
          .map((range) => range.accept(this))
          .join('\n')}
          `;
    }

    VisitarRango(Regla) {
        /*return `
          if ( IACHAR(Cadena) >= IACHAR(${Regla.inicio}) .and. IACHAR(c) <= IACHAR(${Regla.fin}) ) then
            print *, "Es un dígito (opción B)."
          end if         
        `;*/

        return `
        if (Cadena(in:in) >= "${Regla.inicio}" .and. Cadena(in:in) <= "${Regla.fin}") then
            lexema = Cadena(indice:in)
            indice = in + 1
            return
        end if
            `;
    }

    VisitarPunto(Regla){
      return `

    ! Check if the current character exists in the range and is a single character
    if (indice <= len(Cadena)) then
        if (len(trim(Cadena)) == 1) then
            allocate(character(len=1) :: lexema)
            lexema = Cadena(indice:indice)  ! Return the single character
            indice = indice + 1             ! Advance to the next character
        else
            ! If the current substring is not a single character
            allocate(character(len=6) :: lexema)
            lexema = "ERROR"                ! Mark as error
        end if
        return
    else
        allocate(character(len=3) :: lexema)
        lexema = "EOF"                      ! Handle case where no more characters exist
        return
    end if
      `
    }

    VisitarEof(Regla){
      return `
        if (Cadena(in:in) >= "0" .and. Cadena(in:in) <= "9") then
          ! Capture the token and advance the index
          allocate(character(len=1) :: lexema)
          lexema = Cadena(indice:in)
          indice = in + 1
          return
        end if
      `;
    }

    VisitarIdentificador(Regla){
      return`
      lexema = ${Regla.id}(Cadena, indice)
      return
      `;
    }

    VisitarGrupos(Regla){

      return Regla.expresion.accept(this); // or

    }

}

export{TokenizadorVisitante};