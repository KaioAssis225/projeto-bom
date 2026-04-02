# BOM Sistema

Sistema de gestão de BOM (Bill of Materials) multinível para ambientes industriais, com cadastro de itens, composição de estruturas produtivas, histórico de preços por vigência, cálculo de custo consolidado e exportação para Excel.

## Visão Geral

O projeto é dividido em dois módulos principais:

- `backend/`: API REST em FastAPI responsável por regras de negócio, persistência, cálculo e exportação.
- `frontend/`: aplicação React para operação do sistema por usuários internos.

Documentação da API:

- Swagger: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- ReDoc: [http://localhost:8000/api/v1/redoc](http://localhost:8000/api/v1/redoc)

## Stack Tecnológica

### Backend

- Python 3.12
- FastAPI
- SQLAlchemy 2.x
- Alembic
- PostgreSQL 15+
- Pydantic v2
- Pytest

### Frontend

- React 18
- TypeScript
- Vite
- TanStack Query v5
- React Router v6
- Axios
- Tailwind CSS
- React Hook Form + Zod
- lucide-react

## Arquitetura em Camadas

O backend segue a separação:

```text
router -> service -> repository -> database
                 -> domain (quando há lógica pura)
```

- `router`: recebe requisições HTTP e valida entrada/saída.
- `service`: aplica regras de negócio.
- `repository`: encapsula acesso ao banco.
- `domain`: concentra lógica pura, sem dependência de banco, como o motor de cálculo da BOM.

## Pré-requisitos

Antes de rodar o projeto, garanta:

- Node.js 20+ com `npm`
- Python 3.12
- PostgreSQL 15+
- Git

Opcional:

- Docker e Docker Compose

## Como Rodar Localmente

### 1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd ProjetoGH
```

### 2. Configurar o backend

```powershell
cd backend
copy .env.example .env
```

Ajuste as credenciais do PostgreSQL no `.env`.

### 3. Criar e ativar o ambiente Python

```powershell
cd C:\Users\koian\Desktop\ProjetoGH
python -m venv .venv
.\.venv\Scripts\Activate.ps1
cd backend
pip install -r requirements.txt
```

### 4. Rodar as migrations

```powershell
cd C:\Users\koian\Desktop\ProjetoGH\backend
alembic upgrade head
```

### 5. Subir o backend

```powershell
cd C:\Users\koian\Desktop\ProjetoGH\backend
uvicorn app.main:app --reload
```

Backend disponível em:

- API: [http://localhost:8000](http://localhost:8000)
- Docs: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)

### 6. Configurar o frontend

```powershell
cd C:\Users\koian\Desktop\ProjetoGH\frontend
copy .env.example .env
npm install
```

### 7. Subir o frontend

```powershell
cd C:\Users\koian\Desktop\ProjetoGH\frontend
npm run dev
```

Frontend disponível em:

- [http://localhost:5173](http://localhost:5173)

### Alternativa com Docker

O projeto também possui `backend/docker-compose.yml` para subir a API e o PostgreSQL.

```powershell
cd C:\Users\koian\Desktop\ProjetoGH\backend
docker compose up -d
alembic upgrade head
```

## Estrutura de Pastas Resumida

```text
ProjetoGH/
├── backend/
│   ├── alembic/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── domain/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── utils/
│   ├── tests/
│   └── README.md
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── types/
│   └── README.md
└── docs/
    ├── API.md
    └── ARCHITECTURE.md
```

## Principais Funcionalidades

- Cadastro de grupos de matéria-prima
- Cadastro de unidades de medida
- Cadastro de itens produtivos e materiais
- Cadastro de BOM multinível
- Validação de ciclo na estrutura BOM
- Histórico de preços com controle de vigência
- Cálculo de custo por produto
- Cálculo de custo em lote
- Filtro de cálculo por grupo de matéria-prima
- Exportação de resultado para Excel
- Log de execução de cálculos

## Links Úteis

- Documentação da API: [docs/API.md](C:/Users/koian/Desktop/ProjetoGH/docs/API.md)
- Arquitetura: [docs/ARCHITECTURE.md](C:/Users/koian/Desktop/ProjetoGH/docs/ARCHITECTURE.md)
- README do backend: [backend/README.md](C:/Users/koian/Desktop/ProjetoGH/backend/README.md)
- README do frontend: [frontend/README.md](C:/Users/koian/Desktop/ProjetoGH/frontend/README.md)
