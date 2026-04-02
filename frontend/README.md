# BOM Sistema Frontend

Frontend web do BOM Sistema, voltado para operação interna do módulo de estrutura de produtos, preços, cálculos e monitoramento de execuções.

## Stack e Versões

- React 18
- TypeScript 5
- Vite 7
- React Router DOM 6
- TanStack Query 5
- Axios
- Tailwind CSS 3
- React Hook Form 7
- Zod 4
- lucide-react
- sonner

## Como Instalar e Rodar

### 1. Configurar `.env`

```powershell
cd C:\Users\koian\Desktop\ProjetoGH\frontend
copy .env.example .env
```

Conteúdo do exemplo:

```env
VITE_API_URL=http://localhost:8000
```

### 2. Instalar dependências

```powershell
cd C:\Users\koian\Desktop\ProjetoGH\frontend
npm install
```

### 3. Rodar em desenvolvimento

```powershell
cd C:\Users\koian\Desktop\ProjetoGH\frontend
npm run dev
```

Aplicação disponível em:

- [http://localhost:5173](http://localhost:5173)

### 4. Gerar build

```powershell
cd C:\Users\koian\Desktop\ProjetoGH\frontend
npm run build
```

## Páginas Disponíveis

| Rota | Página | Função |
|---|---|---|
| `/itens` | Itens | Cadastro e filtro de matérias-primas, produtos e serviços |
| `/bom` | BOM | Visualização e edição da estrutura multinível |
| `/precos` | Preços | Consulta de preço vigente e histórico por item |
| `/calculos` | Cálculo | Cálculo por produto e cálculo em lote |
| `/grupos` | Grupos | Cadastro de grupos de matéria-prima |
| `/unidades` | Unidades | Cadastro de unidades de medida |
| `/logs` | Logs | Consulta de execuções e arquivos gerados |

## Como o Frontend se Organiza

- `src/api/`: clientes HTTP por domínio
- `src/hooks/`: hooks com TanStack Query
- `src/pages/`: telas da aplicação
- `src/components/`: layout e componentes específicos
- `src/lib/`: utilitários compartilhados
- `src/types/`: tipos TypeScript espelhando o backend

## Estrutura de Pastas

```text
frontend/
├── public/
├── src/
│   ├── api/
│   ├── components/
│   │   ├── bom/
│   │   └── layout/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── types/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── index.html
├── postcss.config.cjs
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Observações de Integração

- O frontend espera o backend rodando em `http://localhost:8000` por padrão.
- As mensagens de erro da API são tratadas no cliente Axios centralizado.
- O download de Excel é feito pela própria API em `/api/v1/calculos/download/{filename}`.
