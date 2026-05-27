# Spec: Sistema de Autenticação e Controle de Acesso

**Data:** 2026-05-26
**Status:** Aprovado
**Escopo:** Backend FastAPI + painel admin frontend

---

## 1. Contexto

O ProjetoGH atualmente não possui autenticação. Todos os endpoints da API são públicos. Este spec define o sistema de autenticação, gerenciamento de sessão e controle de acesso por área/nível a ser implementado.

---

## 2. Arquitetura de Sessão

Modelo: **JWT + Refresh Token armazenado no banco (Option B)**

```
Frontend (React)
    │
    │  POST /api/v1/auth/login → { access_token, refresh_token }
    │  Authorization: Bearer <access_token>  (todas as rotas protegidas)
    │  POST /api/v1/auth/refresh → { access_token }
    │  POST /api/v1/auth/logout → 204
    ▼
Backend (FastAPI)
    ├── access_token  → JWT, TTL 30min, validado em memória
    └── refresh_token → JWT, TTL 7 dias, validado contra tabela refresh_tokens

Banco (PostgreSQL)
    ├── users
    ├── user_roles
    └── refresh_tokens
```

**Fluxo de login:**
1. Frontend envia `email + senha`
2. Backend busca usuário por email — erro genérico se não encontrado (não enumera usuários)
3. Verifica `argon2.verify(senha + pepper, password_hash)`
4. Gera access_token (JWT 30min) + refresh_token (JWT 7 dias)
5. Salva `SHA-256(refresh_token)` na tabela `refresh_tokens`
6. Retorna ambos os tokens ao frontend

**Fluxo de renovação:**
1. Frontend detecta access_token expirado (HTTP 401)
2. Envia refresh_token para `POST /auth/refresh`
3. Backend valida JWT + consulta banco (não revogado, não expirado)
4. Retorna novo access_token (refresh_token permanece o mesmo)

**Fluxo de logout:**
1. Frontend envia refresh_token para `POST /auth/logout`
2. Backend marca `revoked=true` no registro correspondente
3. Próxima tentativa de refresh com esse token é rejeitada com 401

---

## 3. Modelo de Dados

```sql
-- Usuários
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(100),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    last_login_at   TIMESTAMP
);

-- Atribuições área + nível (N por usuário)
CREATE TABLE user_roles (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    area     VARCHAR(20) NOT NULL,  -- CUSTOS | ESTOQUE | CADASTRO | GERAL
    nivel    VARCHAR(20) NOT NULL   -- VIEWER | ESTOQUISTA | ANALISTA | GESTOR | ADMIN
);

-- Sessões ativas
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);
```

**Enums:**
- `area`: `CUSTOS`, `ESTOQUE`, `CADASTRO`, `GERAL`
- `nivel`: `VIEWER`, `ESTOQUISTA`, `ANALISTA`, `GESTOR`, `ADMIN`

---

## 4. Sistema de Permissões

### Regra ADMIN
Se o usuário tem `nivel=ADMIN` em **qualquer** área, passa em qualquer verificação de permissão.

### Regra de visibilidade de preços
Pode ver/operar preços se tiver **qualquer** atribuição onde:
- `area=CUSTOS` **OU** `nivel=GESTOR` **OU** `nivel=ADMIN`

### Dependências de permissão

```python
Depends(get_current_user)                              # autenticado apenas
Depends(require(area="CUSTOS",   nivel_min="VIEWER"))  # leitura de custos
Depends(require(area="CUSTOS",   nivel_min="ANALISTA"))# edição de custos
Depends(require(area="ESTOQUE",  nivel_min="VIEWER"))  # leitura de estoque
Depends(require(area="ESTOQUE",  nivel_min="ESTOQUISTA")) # operação estoque
Depends(require(area="CADASTRO", nivel_min="VIEWER"))  # leitura cadastros
Depends(require(area="CADASTRO", nivel_min="GESTOR"))  # edição cadastros
Depends(require_admin)                                 # admin only
```

### Mapeamento por módulo

| Módulo | Leitura | Escrita |
|--------|---------|---------|
| Preços | `CUSTOS:VIEWER` ou `GESTOR`+ | `CUSTOS:ANALISTA` |
| Auditoria de preços | `CUSTOS:VIEWER` ou `GESTOR`+ | — |
| BOM / Cálculos | `CUSTOS:VIEWER` | `CUSTOS:ANALISTA` |
| Logs de execução | `CUSTOS:ANALISTA`+ | — |
| Estoque | `ESTOQUE:VIEWER` | `ESTOQUE:ESTOQUISTA` |
| Itens / MP / PA | `CADASTRO:VIEWER` | `CADASTRO:GESTOR` |
| Fornecedores / Grupos / Setores / Unidades | `CADASTRO:VIEWER` | `CADASTRO:GESTOR` |
| Gestão de usuários | `ADMIN` | `ADMIN` |

---

## 5. Endpoints de Autenticação

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/v1/auth/login` | POST | — | Retorna access + refresh token |
| `/api/v1/auth/refresh` | POST | — | Renova access token |
| `/api/v1/auth/logout` | POST | Bearer | Revoga refresh token |
| `/api/v1/auth/me` | GET | Bearer | Dados do usuário autenticado + roles |

---

## 6. Endpoints de Gestão de Usuários (Admin)

Todos protegidos por `require_admin`.

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/v1/admin/usuarios` | GET | Lista usuários com roles |
| `/api/v1/admin/usuarios` | POST | Cria usuário + atribuições |
| `/api/v1/admin/usuarios/{id}` | GET | Detalhe do usuário |
| `/api/v1/admin/usuarios/{id}` | PUT | Edita nome, email, status |
| `/api/v1/admin/usuarios/{id}/senha` | PATCH | Redefine senha |
| `/api/v1/admin/usuarios/{id}/roles` | PUT | Substitui todas as atribuições |
| `/api/v1/admin/usuarios/{id}/sessoes` | DELETE | Revoga todas as sessões ativas |

**Criação de usuário — payload:**
```json
{
  "email": "joao@empresa.com",
  "full_name": "João Silva",
  "senha_inicial": "senhaTemporaria123",
  "roles": [
    { "area": "CUSTOS",  "nivel": "ANALISTA" },
    { "area": "ESTOQUE", "nivel": "VIEWER"   }
  ]
}
```

---

## 7. Segurança — Hashing e Tokens

**Biblioteca:** `argon2-cffi`

**Parâmetros Argon2id:**
```python
PasswordHasher(memory_cost=65536, time_cost=3, parallelism=4)
```

**Pepper:** concatenado à senha antes do hash — `hash(senha + pepper)`

**Variáveis de ambiente necessárias:**

| Variável | Descrição |
|----------|-----------|
| `SECRET_KEY` | Assina os JWT (64 chars aleatórios) |
| `PASSWORD_PEPPER` | Concatenado às senhas (32 chars aleatórios) |
| `ACCESS_TOKEN_TTL_MINUTES` | Padrão: `30` |
| `REFRESH_TOKEN_TTL_DAYS` | Padrão: `7` |

**Regras invioláveis:**
- `SECRET_KEY` e `PASSWORD_PEPPER` nunca aparecem em logs
- Refresh token nunca salvo em texto puro — apenas `SHA-256(token)` no banco
- Erro de login com email inexistente = mesmo erro que senha incorreta
- Login registra tentativas em `login_attempts` (IP + timestamp) — base para rate limiting futuro

---

## 8. Arquivos a Criar/Modificar

**Novos:**
- `backend/app/models/user.py` — modelos `User`, `UserRole`, `RefreshToken`
- `backend/app/schemas/auth.py` — schemas de login, token, user response
- `backend/app/schemas/user_admin.py` — schemas do painel admin
- `backend/app/api/routers/auth.py` — endpoints de autenticação
- `backend/app/api/routers/admin_users.py` — endpoints de gestão
- `backend/app/services/auth_service.py` — lógica de login, refresh, logout
- `backend/app/services/user_service.py` — CRUD de usuários
- `backend/app/core/security.py` — substituir placeholder por Argon2id + JWT real
- `backend/app/core/permissions.py` — funções `require()` e `require_admin`
- `alembic/versions/xxxx_add_auth_tables.py` — migration

**Modificados:**
- `backend/app/api/deps.py` — adicionar `get_current_user`
- `backend/app/main.py` — registrar routers auth e admin
- `backend/app/core/config.py` — adicionar `SECRET_KEY`, `PASSWORD_PEPPER`, TTLs
- `backend/requirements.txt` — adicionar `argon2-cffi`
- Todos os routers existentes — adicionar dependência de permissão
