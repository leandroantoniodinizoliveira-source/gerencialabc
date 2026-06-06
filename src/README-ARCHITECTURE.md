# Arquitetura Modular - ADASA/Balanço Hídrico

Esta aplicação está passando por uma refatoração em direção à **Clean Architecture** e **Modularização por Domínios**.

## 1. Estrutura de Diretórios Recomendada

Para manter as responsabilidades separadas (SRP), cada fluxo de negócio deve virar um Módulo:

```text
src/
 ├─ core/                     # Peças globais e compartilhadas
 │   ├─ ui/                   # Botões, Cards, Modais reutilizáveis
 │   ├─ services/             # Chamada de API e Persistência
 │   ├─ store/                # Estados globais (tema, auth)
 │   └─ utils/                # Helpers e formatadores
 ├─ modules/                  # Funcionalidades Isoladas de Negócio
 │   ├─ planning/             # "Planejamento"
 │   ├─ water-balance/        # "Balanço Hídrico"
 │   └─ nome-do-novo-modulo/  # Template para Módulos Futuros
 │       ├─ index.ts          # Arquivo de barreira (exports públicos)
 │       ├─ ModuloRoot.tsx    # Wrapper principal com o Contexto local
 │       ├─ ModuloContext.tsx # Contexto para injetar dependências (estado local)
 │       ├─ components/       # Componentes burros (recebem props, disparam eventos via props)
 │       └─ hooks/            # Regras de Negócio e custom hooks
```

## 2. Padrão para "Módulo X"

Para criar novos módulos **sem gerar acoplamento** com `App.tsx` (para que ele continue funcionando apenas como roteador / esqueleto visual), siga estes passos:

1. **Crie a pasta:** `/src/modules/MeuModulo`
2. **Defina Domínios (Types):** Crie as interfaces.
3. **Crie `MeuModuloContext.tsx`:** Extraia o estado (`useState`) ou reducer que pertence exclusivamente a esse fluxo (ex: a aba analisada, filtros específicos).
4. **Crie `MeuModulo.tsx` (Root):** Envolva suas abas com o seu Provider.
5. **Comunique-se por Eventos / Abstração:** Não passe a referência exata de estados irmãos de um módulo para outro. Se um módulo precisa ler dados do outro, eleja um `GlobalStore` ou extraia do IndexedDB/Storage de forma isolada através de uma abstração em `core/services`.

## 3. O Que foi feito até agora
- Iniciada a infraestrutura criando `providers` isolados de `Planejamento` (`PlanningContext`) e `Balanço Hídrico` (`WaterBalanceContext`).  
- Adicionados os *Entry Points* modulares (`PlanningModule.tsx`, `WaterBalanceModule.tsx`).  
- O arquivo utilitário principal (`utils.ts`) ganhou documentação em docstrings detalhando complexidade e finalidade de algoritmos O(1).
