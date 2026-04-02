# BOM Sistema Backend

Backend REST do BOM Sistema, responsável por cadastro de estruturas, histórico de preços, cálculo de custo, exportação para Excel e auditoria operacional.

## Stack e Versões

### Runtime

- Python 3.12
- PostgreSQL 15+

### Bibliotecas principais

- FastAPI `>=0.115.0`
- SQLAlchemy `>=2.0.0`
- Alembic `>=1.13.0`
- Pydantic `>=2.0.0`
- pydantic-settings `>=2.0.0`
- psycopg2-binary `>=2.9.0`
- openpyxl `>=3.1.0`
- pandas `>=2.0.0`
- pytest `>=9.0.0`

## Instalação de Dependências

```powershell
cd C:\Users\koian\Desktop\ProjetoGH
python -m venv .venv
.\.venv\Scripts\Activate.ps1
cd backend
pip install -r requirements.txt
```

## Configuração do `.env`

Crie o arquivo a partir do exemplo:

```powershell
cd C:\Users\koian\Desktop\ProjetoGH\backend
copy .env.example .env
```

Exemplo de variáveis:

```env
APP_NAME=bom-cost-api
APP_VERSION=1.0.0
APP_DESCRIPTION=API para calculo de custo de BOM multinivel
APP_ENV=development
APP_TIMEZONE=America/Sao_Paulo
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bomdb
DB_USER=postgres
DB_PASSWORD=postgres
ALLOWED_CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:8000"]
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bomdb_test
SECRET_KEY=changeme
TIMEZONE=America/Sao_Paulo
```

## Como Rodar as Migrations

```powershell
cd C:\Users\koian\Desktop\ProjetoGH\backend
alembic history
alembic upgrade head
```

Migrations existentes:

- `20260326_0001_initial_schema`
- `20260326_0002_add_price_functions`

## Como Rodar a API

```powershell
cd C:\Users\koian\Desktop\ProjetoGH\backend
uvicorn app.main:app --reload
```

Documentação interativa:

- [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- [http://localhost:8000/api/v1/redoc](http://localhost:8000/api/v1/redoc)

## Como Rodar os Testes

```powershell
cd C:\Users\koian\Desktop\ProjetoGH\backend
pytest tests/ -v --tb=short
```

Cobertura:

```powershell
make coverage
```

## Endpoints Disponíveis

| Domínio | Método | Rota | Descrição |
|---|---|---|---|
| Health | `GET` | `/api/v1/health/` | Verifica se a API está ativa |
| Grupos | `GET` | `/api/v1/grupos/` | Lista grupos de matéria-prima |
| Grupos | `POST` | `/api/v1/grupos/` | Cria grupo |
| Grupos | `GET` | `/api/v1/grupos/{id}` | Busca grupo por ID |
| Grupos | `PUT` | `/api/v1/grupos/{id}` | Atualiza grupo |
| Grupos | `PATCH` | `/api/v1/grupos/{id}/inativar` | Inativa grupo |
| Unidades | `GET` | `/api/v1/unidades/` | Lista unidades |
| Unidades | `POST` | `/api/v1/unidades/` | Cria unidade |
| Unidades | `GET` | `/api/v1/unidades/{id}` | Busca unidade por ID |
| Unidades | `PUT` | `/api/v1/unidades/{id}` | Atualiza unidade |
| Unidades | `PATCH` | `/api/v1/unidades/{id}/inativar` | Endpoint compatível, sem soft delete real |
| Itens | `GET` | `/api/v1/itens/` | Lista itens com filtros |
| Itens | `POST` | `/api/v1/itens/` | Cria item |
| Itens | `GET` | `/api/v1/itens/{id}` | Busca item por ID |
| Itens | `PUT` | `/api/v1/itens/{id}` | Atualiza item |
| Itens | `PATCH` | `/api/v1/itens/{id}/inativar` | Inativa item |
| BOM | `GET` | `/api/v1/bom/{item_pai_id}` | Retorna árvore completa da BOM |
| BOM | `POST` | `/api/v1/bom/` | Cria header da BOM |
| BOM | `POST` | `/api/v1/bom/{bom_id}/itens` | Adiciona item à BOM |
| BOM | `PUT` | `/api/v1/bom/itens/{bom_item_id}` | Atualiza quantidade/scrap |
| BOM | `DELETE` | `/api/v1/bom/itens/{bom_item_id}` | Remove item da BOM |
| BOM | `POST` | `/api/v1/bom/validar-ciclo` | Valida ciclo sem persistir |
| Preços | `POST` | `/api/v1/precos/{item_id}` | Registra novo preço vigente |
| Preços | `GET` | `/api/v1/precos/{item_id}/historico` | Histórico de preços |
| Preços | `GET` | `/api/v1/precos/{item_id}/vigente` | Preço vigente atual ou por data |
| Auditoria | `GET` | `/api/v1/auditoria/precos/{item_id}` | Histórico de auditoria de preços |
| Cálculos | `POST` | `/api/v1/calculos/produto` | Calcula custo por produto |
| Cálculos | `POST` | `/api/v1/calculos/lote` | Calcula custo por lote |
| Cálculos | `GET` | `/api/v1/calculos/download/{filename}` | Faz download do Excel |
| Logs | `GET` | `/api/v1/logs` | Lista logs de execução |
| Logs | `GET` | `/api/v1/logs/{log_id}` | Busca log por ID |

## Regras de Negócio Principais

- Nunca usar `float` para custo ou preço; sempre `Decimal`/`NUMERIC`.
- Preço nunca é sobrescrito; cada alteração cria novo registro com vigência.
- Resultado do cálculo não é persistido no banco.
- A BOM aceita múltiplos níveis de profundidade.
- Validação de ciclo é obrigatória antes de inserir componentes.
- Filtro por grupo de matéria-prima atua só na visualização do cálculo.
- `RAW_MATERIAL` exige `material_group_id`.
- Item inativo não pode ser usado em fluxos críticos de cálculo.

## Estrutura de Pastas

```text
backend/
├── alembic/
│   ├── sql/
│   └── versions/
├── app/
│   ├── api/
│   │   └── routers/
│   ├── core/
│   ├── domain/
│   ├── models/
│   ├── repositories/
│   ├── schemas/
│   ├── services/
│   └── utils/
├── tests/
│   ├── integration/
│   └── unit/
├── docker-compose.yml
├── requirements.txt
└── README.md
```
