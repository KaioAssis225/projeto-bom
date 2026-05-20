# ProjetoGH — Sistema de Gestão de Custos BOM

> Sistema industrial de gerenciamento de **Bill of Materials (BOM)** multinível com cálculo de custos, histórico de preços com vigência e exportação Excel. Deployado na plataforma **Railway**.

## O que o sistema faz

| # | Funcionalidade | Detalhe |
|---|---|---|
| 1 | **Cadastro de itens** | Matérias-primas, produtos acabados, semi-acabados, embalagens e serviços |
| 2 | **Estrutura BOM multinível** | Hierarquia pai→filho com profundidade arbitrária e detecção de ciclos |
| 3 | **Histórico de preços** | Sem sobrescrita destrutiva — cada alteração cria novo registro com vigência |
| 4 | **Cálculo de custo** | Explosão da BOM com acumulação de quantidades e aplicação de preços |
| 5 | **Exportação Excel** | Planilha detalhada por linha gerada a cada cálculo executado |
| 6 | **Auditoria completa** | Log de execuções de cálculo e rastreamento de alterações de preço |

---

## Stack Tecnológica

### Backend

| Lib | Versão | Papel |
|---|---|---|
| Python | 3.12 | Linguagem principal |
| FastAPI | ≥0.115.0 | API REST com OpenAPI automático |
| SQLAlchemy | 2.x | ORM com suporte asyncio |
| PostgreSQL | 15+ | Banco de dados com `NUMERIC(18,6)` para precisão financeira |
| Alembic | 1.13+ | Migrations com 6 versões |
| Pydantic v2 | — | Validação de dados e settings |
| pytest | 9+ | Testes com cobertura e suporte async |
| openpyxl + pandas | — | Geração de Excel |
| python-jose | — | JWT/autenticação |

### Frontend

| Lib | Versão | Papel |
|---|---|---|
| React | 18.3.1 | UI framework |
| TypeScript | 5.9.3 | Tipagem estática |
| Vite | 7.1.7 | Build e dev server |
| React Router DOM | 6.30.1 | Roteamento SPA |
| TanStack Query | v5 | Cache, fetching e mutations |
| Axios | 1.12.2 | HTTP client |
| React Hook Form | 7.62.0 | Gerenciamento de formulários |
| Zod | 4.1.11 | Validação de schemas |
| Tailwind CSS | 3.4.17 | Estilização utilitária |
| shadcn/ui + Radix UI | — | Componentes acessíveis |
| sonner | — | Notificações toast |

### Infraestrutura

| Ferramenta | Uso |
|---|---|
| Docker + Docker Compose | PostgreSQL local via `backend/docker-compose.yml` |
| Railway | Deploy de produção com `Procfile` |
| ProxyHeadersMiddleware | Suporte a HTTPS atrás de reverse proxy |

---

## Arquitetura em Camadas

```
HTTP Request
    ↓
[Router]         → recebe HTTP, valida entrada/saída, mapeia exceções
    ↓
[Service]        → regras de negócio, validação de estado, orquestração
    ↓
[Repository]     → encapsulamento de acesso ao banco (SQLAlchemy)
    ↓
[Domain]         → lógica pura sem dependência de banco (BomCalculator)
    ↓
PostgreSQL 15+
```

Veja detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Estrutura de Pastas

```
ProjetoGH/
├── backend/
│   ├── alembic/
│   │   └── versions/           → 6 migrations (001–006)
│   ├── app/
│   │   ├── api/routers/        → 12 routers FastAPI
│   │   ├── core/               → config, db, exceptions, logging, security, timezone
│   │   ├── domain/             → bom_calculator.py (lógica pura)
│   │   ├── models/             → 14 modelos SQLAlchemy com UUID PKs
│   │   ├── repositories/       → 9 classes de acesso a dados
│   │   ├── schemas/            → 10 módulos Pydantic v2
│   │   ├── services/           → 11 classes de regras de negócio
│   │   ├── utils/              → decimal_utils.py, excel_builder.py
│   │   └── main.py             → entrypoint FastAPI
│   ├── tests/
│   │   ├── integration/
│   │   └── unit/
│   ├── docker-compose.yml
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── Makefile
│   └── Procfile
├── frontend/
│   ├── src/
│   │   ├── api/                → 13 módulos Axios (um por recurso)
│   │   ├── components/
│   │   │   ├── layout/         → AppLayout, Header, Sidebar
│   │   │   ├── bom/            → BomTreeNode (componente recursivo)
│   │   │   └── ui/             → componentes shadcn/ui
│   │   ├── hooks/              → 10 hooks TanStack Query
│   │   ├── lib/                → utils.ts (cn helper)
│   │   ├── pages/              → 8 páginas
│   │   ├── types/              → interfaces TypeScript espelhando schemas
│   │   ├── App.tsx             → roteamento React Router
│   │   └── main.tsx            → entrypoint React
│   ├── vite.config.ts
│   └── tailwind.config.ts
├── docs/
│   ├── ARCHITECTURE.md         → arquitetura e decisões técnicas
│   ├── BACKEND.md              → camadas, serviços, domínio e cálculo BOM
│   ├── FRONTEND.md             → páginas, hooks, API client e tipos
│   ├── DATABASE.md             → modelos, relacionamentos e constraints
│   └── API.md                  → referência completa de endpoints
└── README.md
```

---

## Como Rodar Localmente

### Pré-requisitos

- Node.js 20+ com `npm`
- Python 3.12
- PostgreSQL 15+ (ou Docker)

### Backend

```powershell
cd ProjetoGH\backend
copy .env.example .env          # ajustar credenciais do PostgreSQL
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

API disponível em `http://localhost:8000`
Swagger UI em `http://localhost:8000/api/v1/docs`

### Frontend

```powershell
cd ProjetoGH\frontend
copy .env.example .env          # ajustar VITE_API_URL
npm install
npm run dev
```

Frontend disponível em `http://localhost:5173`

### PostgreSQL via Docker

```powershell
cd ProjetoGH\backend
docker compose up -d
alembic upgrade head
```

---

## Variáveis de Ambiente

### Backend (`.env`)

```env
APP_NAME=ProjetoGH
APP_ENV=development
APP_TIMEZONE=America/Sao_Paulo
DB_HOST=localhost
DB_PORT=5432
DB_NAME=projetogh
DB_USER=postgres
DB_PASSWORD=secret
ALLOWED_CORS_ORIGINS=["http://localhost:5173"]
SECRET_KEY=sua-chave-jwt-secreta
DOCS_ENABLED=true
```

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:8000
```

---

## Documentação Detalhada

| Documento | Conteúdo |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Fluxo de dados, decisões de design, padrões arquiteturais |
| [BACKEND.md](docs/BACKEND.md) | Camadas, serviços, domínio e motor de cálculo BOM |
| [FRONTEND.md](docs/FRONTEND.md) | Páginas, hooks, API client e sistema de tipos |
| [DATABASE.md](docs/DATABASE.md) | Modelos, relacionamentos, constraints e migrations |
| [API.md](docs/API.md) | Referência completa de endpoints com payloads |
