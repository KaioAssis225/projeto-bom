# API do BOM Sistema

Base URL local:

```text
http://localhost:8000
```

Prefixo da API:

```text
/api/v1
```

## Padrão de Erros

As respostas de erro usam payload padronizado.

Exemplos:

```json
{
  "error": "NOT_FOUND",
  "detail": "Item não encontrado"
}
```

```json
{
  "error": "CYCLE_DETECTED",
  "detail": "Ciclo detectado: A -> B -> A",
  "path": "A -> B -> A"
}
```

## Códigos de Erro Padronizados

| Código HTTP | Error | Quando ocorre |
|---|---|---|
| `404` | `NOT_FOUND` | Entidade não encontrada |
| `409` | `DUPLICATE_CODE` | Código duplicado |
| `422` | `CYCLE_DETECTED` | Ciclo detectado na BOM |
| `422` | `PRICE_NOT_FOUND` | Item sem preço vigente |
| `422` | `INACTIVE_ITEM` | Item inativo em operação crítica |
| `500` | `INTERNAL_ERROR` | Erro interno não tratado |

## Health

### `GET /api/v1/health/`

Verifica se a API está ativa.

#### Response

```json
{
  "status": "ok"
}
```

## Grupos de Matéria-Prima

### `GET /api/v1/grupos/`

Lista grupos com paginação.

#### Query params

- `skip`
- `limit`
- `active_only`

#### Response

```json
{
  "items": [
    {
      "id": "f9d92e5e-8ea0-4eb7-b060-bf120d5915cc",
      "code": "ACO",
      "name": "Aços",
      "description": "Materiais ferrosos",
      "active": true,
      "created_at": "2026-03-30T18:00:00"
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 20
}
```

### `POST /api/v1/grupos/`

Cria grupo.

#### Request

```json
{
  "code": "ACO",
  "name": "Aços",
  "description": "Materiais ferrosos"
}
```

#### Response

```json
{
  "id": "f9d92e5e-8ea0-4eb7-b060-bf120d5915cc",
  "code": "ACO",
  "name": "Aços",
  "description": "Materiais ferrosos",
  "active": true,
  "created_at": "2026-03-30T18:00:00"
}
```

### `GET /api/v1/grupos/{id}`

Busca grupo por ID.

### `PUT /api/v1/grupos/{id}`

Atualiza grupo.

#### Request

```json
{
  "name": "Aços Carbono",
  "description": "Materiais ferrosos estruturais",
  "active": true
}
```

### `PATCH /api/v1/grupos/{id}/inativar`

Inativa grupo.

## Unidades de Medida

### `GET /api/v1/unidades/`

Lista unidades.

#### Response

```json
{
  "items": [
    {
      "id": "28dbefea-c0d8-4d41-b398-a401d05d888e",
      "code": "KG",
      "description": "Quilograma",
      "decimal_places": 3
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 20
}
```

### `POST /api/v1/unidades/`

Cria unidade.

#### Request

```json
{
  "code": "KG",
  "description": "Quilograma",
  "decimal_places": 3
}
```

### `GET /api/v1/unidades/{id}`

Busca unidade por ID.

### `PUT /api/v1/unidades/{id}`

Atualiza unidade.

### `PATCH /api/v1/unidades/{id}/inativar`

Endpoint de compatibilidade. A entidade não usa soft delete real.

## Itens

### `GET /api/v1/itens/`

Lista itens com filtros.

#### Query params

- `type`
- `material_group_id`
- `code_contains`
- `description_contains`
- `active_only`
- `skip`
- `limit`

#### Response

```json
{
  "items": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "code": "RM-ACO-1020",
      "description": "Chapa de aço 1020",
      "type": "RAW_MATERIAL",
      "unit_of_measure_id": "22222222-2222-2222-2222-222222222222",
      "material_group_id": "33333333-3333-3333-3333-333333333333",
      "active": true,
      "notes": "Espessura 2mm",
      "unit_of_measure_code": "KG",
      "material_group_name": "Aços"
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 20
}
```

### `POST /api/v1/itens/`

Cria item.

#### Request

```json
{
  "code": "RM-ACO-1020",
  "description": "Chapa de aço 1020",
  "type": "RAW_MATERIAL",
  "unit_of_measure_id": "22222222-2222-2222-2222-222222222222",
  "material_group_id": "33333333-3333-3333-3333-333333333333",
  "notes": "Espessura 2mm"
}
```

### `GET /api/v1/itens/{id}`

Busca item por ID.

### `PUT /api/v1/itens/{id}`

Atualiza item.

### `PATCH /api/v1/itens/{id}/inativar`

Inativa item.

## BOM

### `GET /api/v1/bom/{item_pai_id}`

Retorna a árvore completa da BOM ativa do item pai.

#### Response

```json
{
  "bom": {
    "id": "44444444-4444-4444-4444-444444444444",
    "parent_item_id": "55555555-5555-5555-5555-555555555555",
    "version_code": "1.0",
    "description": "Estrutura padrão",
    "is_active": true,
    "valid_from": "2026-03-30"
  },
  "item": {
    "id": "55555555-5555-5555-5555-555555555555",
    "code": "PA-001",
    "description": "Produto acabado",
    "type": "FINISHED_PRODUCT"
  },
  "children": []
}
```

### `POST /api/v1/bom/`

Cria header da BOM.

#### Request

```json
{
  "parent_item_id": "55555555-5555-5555-5555-555555555555",
  "version_code": "1.0",
  "description": "Estrutura padrão",
  "valid_from": "2026-03-30",
  "valid_to": null
}
```

### `POST /api/v1/bom/{bom_id}/itens`

Adiciona item filho a uma BOM.

#### Request

```json
{
  "parent_item_id": "55555555-5555-5555-5555-555555555555",
  "child_item_id": "66666666-6666-6666-6666-666666666666",
  "line_number": 10,
  "quantity": "2.500000",
  "scrap_percent": "5.0000",
  "notes": "Consumo padrão"
}
```

#### Response

```json
{
  "id": "77777777-7777-7777-7777-777777777777",
  "bom_id": "44444444-4444-4444-4444-444444444444",
  "parent_item_id": "55555555-5555-5555-5555-555555555555",
  "child_item_id": "66666666-6666-6666-6666-666666666666",
  "line_number": 10,
  "quantity": "2.500000",
  "scrap_percent": "5.0000",
  "loss_factor": "1.050000"
}
```

### `PUT /api/v1/bom/itens/{bom_item_id}`

Atualiza quantidade e scrap.

#### Request

```json
{
  "quantity": "3.000000",
  "scrap_percent": "4.5000"
}
```

### `DELETE /api/v1/bom/itens/{bom_item_id}`

Remove item da BOM.

### `POST /api/v1/bom/validar-ciclo`

Valida se a ligação proposta geraria ciclo.

#### Request

```json
{
  "parent_item_id": "55555555-5555-5555-5555-555555555555",
  "child_item_id": "66666666-6666-6666-6666-666666666666"
}
```

## Preços

### `POST /api/v1/precos/{item_id}`

Registra novo preço vigente.

#### Request

```json
{
  "item_id": "66666666-6666-6666-6666-666666666666",
  "price_value": "12.450000",
  "valid_from": "2026-03-30T09:00:00-03:00",
  "changed_reason": "Reajuste de fornecedor",
  "created_by": "analista.custos"
}
```

#### Response

```json
{
  "id": "88888888-8888-8888-8888-888888888888",
  "item_id": "66666666-6666-6666-6666-666666666666",
  "price_value": "12.450000",
  "valid_from": "2026-03-30T09:00:00-03:00",
  "valid_to": null,
  "is_current": true,
  "changed_reason": "Reajuste de fornecedor",
  "created_by": "analista.custos",
  "created_at": "2026-03-30T09:00:01-03:00"
}
```

### `GET /api/v1/precos/{item_id}/historico`

Lista histórico paginado do item.

### `GET /api/v1/precos/{item_id}/vigente`

Retorna preço vigente atual ou por data.

#### Query param opcional

- `data`

#### Response

```json
{
  "item_id": "66666666-6666-6666-6666-666666666666",
  "price_value": "12.450000",
  "valid_from": "2026-03-30T09:00:00-03:00",
  "created_by": "analista.custos"
}
```

## Auditoria de Preços

### `GET /api/v1/auditoria/precos/{item_id}`

Retorna histórico de mudanças auditadas do preço.

#### Response

```json
[
  {
    "id": "99999999-9999-9999-9999-999999999999",
    "item_id": "66666666-6666-6666-6666-666666666666",
    "old_price": "10.000000",
    "new_price": "12.450000",
    "changed_by": "analista.custos",
    "changed_reason": "Reajuste de fornecedor",
    "changed_at": "2026-03-30T09:00:01-03:00"
  }
]
```

## Cálculos

### `POST /api/v1/calculos/produto`

Calcula custo por produto.

#### Request

```json
{
  "root_item_id": "55555555-5555-5555-5555-555555555555",
  "quantity": "10.000000",
  "reference_date": "2026-03-30T09:00:00-03:00",
  "material_group_id": null,
  "requested_by": "analista.custos",
  "simulation_reference": "SIM-001"
}
```

#### Response

```json
{
  "linhas": [
    {
      "item_id": "66666666-6666-6666-6666-666666666666",
      "code": "RM-ACO-1020",
      "description": "Chapa de aço 1020",
      "type": "RAW_MATERIAL",
      "group_id": "33333333-3333-3333-3333-333333333333",
      "group_name": "Aços",
      "uom": "KG",
      "unit_quantity": "2.500000",
      "accumulated_quantity": "25.000000",
      "price": "12.450000",
      "line_cost": "311.250000"
    }
  ],
  "totais": {
    "quantidade_itens": 1,
    "custo_geral": "311.250000"
  },
  "arquivo_excel": "exports/BOM_CALC_20260330_190329.xlsx"
}
```

### `POST /api/v1/calculos/lote`

Calcula custo consolidado de vários produtos.

#### Request

```json
{
  "itens": [
    {
      "produto_id": "55555555-5555-5555-5555-555555555555",
      "quantidade": "10.000000"
    }
  ],
  "reference_date": "2026-03-30T09:00:00-03:00",
  "material_group_id": null,
  "requested_by": "analista.custos"
}
```

### `GET /api/v1/calculos/download/{filename}`

Baixa o arquivo Excel gerado pelo cálculo.

## Logs

### `GET /api/v1/logs`

Lista logs de execução com paginação e filtros.

#### Query params

- `skip`
- `limit`
- `status`
- `item_id`

#### Response

```json
{
  "items": [
    {
      "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "requested_by": "analista.custos",
      "root_item_id": "55555555-5555-5555-5555-555555555555",
      "status": "SUCCESS",
      "started_at": "2026-03-30T18:31:00-03:00",
      "finished_at": "2026-03-30T18:31:01-03:00",
      "duration_ms": 942,
      "generated_file_name": "BOM_CALC_20260330_183100.xlsx"
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 20
}
```

### `GET /api/v1/logs/{log_id}`

Retorna detalhes do log.

#### Response

```json
{
  "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "requested_by": "analista.custos",
  "root_item_id": "55555555-5555-5555-5555-555555555555",
  "material_group_id": null,
  "simulation_reference": "SIM-001",
  "request_payload": {
    "quantity": "10.000000"
  },
  "generated_file_name": "BOM_CALC_20260330_183100.xlsx",
  "status": "SUCCESS",
  "message": null,
  "started_at": "2026-03-30T18:31:00-03:00",
  "finished_at": "2026-03-30T18:31:01-03:00",
  "duration_ms": 942
}
```
