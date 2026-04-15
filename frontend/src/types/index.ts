export type ItemType =
  | "RAW_MATERIAL"
  | "FINISHED_PRODUCT"
  | "SEMI_FINISHED"
  | "PACKAGING"
  | "SERVICE";

export type ExecutionStatus = "SUCCESS" | "ERROR" | "PARTIAL";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

export interface MaterialGroup {
  id: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
}

export interface MaterialGroupCreatePayload {
  code: string;
  name: string;
  description?: string;
}

export interface MaterialGroupUpdatePayload {
  name: string;
  description?: string;
  active: boolean;
}

export interface UnitConversion {
  to_unit_id: string;
  to_unit_code: string;
  to_unit_description: string;
  factor: number;
}

export interface UnitOfMeasure {
  id: string;
  code: string;
  description: string;
  decimal_places: number;
  conversions?: UnitConversion[];
}

export interface UnitOfMeasureCreatePayload {
  code: string;
  description: string;
  decimal_places: number;
}

export interface UnitOfMeasureUpdatePayload {
  description: string;
  decimal_places: number;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
}

export interface SupplierCreatePayload {
  code: string;
  name: string;
  description?: string;
}

export interface SupplierUpdatePayload {
  name: string;
  description?: string;
  active: boolean;
}

export interface Item {
  id: string;
  code: string;
  description: string;
  type: ItemType;
  unit_of_measure_id: string;
  active: boolean;
  notes?: string;
  unit_of_measure?: {
    id: string;
    code: string;
  };
  current_price?: number | null;
}

export interface ItemCreatePayload {
  code: string;
  description: string;
  type: ItemType;
  unit_of_measure_id: string;
  notes?: string;
}

export interface ItemUpdatePayload {
  description: string;
  active: boolean;
  notes?: string;
}

export interface ItemListParams extends PaginationParams {
  type?: string;
  code_contains?: string;
  description_contains?: string;
  active_only?: boolean;
}

export interface RawMaterial {
  id: string;
  code: string;
  description: string;
  active: boolean;
  notes?: string | null;
  unit_of_measure_id: string;
  material_group_id: string;
  supplier_id?: string | null;
  unidade_conversao_id?: string | null;
  peso_liquido?: number | null;
  created_at: string;
  updated_at: string;
  unit_of_measure?: { id: string; code: string };
  material_group?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
  unidade_conversao?: { id: string; code: string } | null;
}

export interface RawMaterialCreatePayload {
  code: string;
  description: string;
  unit_of_measure_id: string;
  material_group_id: string;
  notes?: string | null;
  supplier_id?: string | null;
  unidade_conversao_id?: string | null;
  peso_liquido?: number | null;
}

export interface RawMaterialUpdatePayload {
  description: string;
  active: boolean;
  material_group_id: string;
  notes?: string | null;
  supplier_id?: string | null;
  unidade_conversao_id?: string | null;
  peso_liquido?: number | null;
}

export interface RawMaterialListParams extends PaginationParams {
  group_id?: string;
  code?: string;
  desc?: string;
  active_only?: boolean;
}

export interface FinishedProduct {
  id: string;
  code: string;
  description: string;
  active: boolean;
  notes?: string | null;
  unit_of_measure_id: string;
  peso_liquido?: number | null;
  catalogo?: string | null;
  linha?: string | null;
  designer?: string | null;
  created_at: string;
  updated_at: string;
  unit_of_measure?: { id: string; code: string };
}

export interface FinishedProductCreatePayload {
  code: string;
  description: string;
  unit_of_measure_id: string;
  notes?: string | null;
  peso_liquido?: number | null;
  catalogo?: string | null;
  linha?: string | null;
  designer?: string | null;
}

export interface FinishedProductUpdatePayload {
  description: string;
  active: boolean;
  notes?: string | null;
  peso_liquido?: number | null;
  catalogo?: string | null;
  linha?: string | null;
  designer?: string | null;
}

export interface FinishedProductListParams extends PaginationParams {
  code?: string;
  desc?: string;
  active_only?: boolean;
}

export interface BomHeader {
  id: string;
  parent_item_id: string;
  version_code: string;
  description?: string;
  is_active: boolean;
  valid_from: string;
}

export interface BomHeaderPayload {
  parent_item_id: string;
  version_code?: string;
  description?: string;
  valid_from: string;
  valid_to?: string;
}

export interface BomItem {
  id: string;
  bom_id: string;
  parent_item_id: string;
  child_item_id: string;
  line_number: number;
  quantity: number;
  scrap_percent: number;
  loss_factor: number;
}

export interface BomItemPayload {
  parent_item_id?: string;
  child_item_id: string;
  quantity: number;
  scrap_percent: number;
  line_number: number;
  notes?: string;
}

export interface BomItemUpdatePayload {
  quantity: number;
  scrap_percent: number;
  notes?: string;
}

export interface CycleValidationPayload {
  bom_id: string;
  parent_item_id: string;
  child_item_id: string;
}

export interface CycleValidationResponse {
  valid: boolean;
  message: string;
  path?: string;
}

export interface BomTreeNode {
  bom_item_id?: string | null;
  item_id?: string;
  code: string;
  description: string;
  type: string;
  level: number;
  path: string;
  quantity?: number | null;
  scrap_percent?: number | null;
  loss_factor?: number | null;
  accumulated_quantity?: number;
  children: BomTreeNode[];
}

export interface BomTree {
  bom_id?: string | null;
  item_id: string;
  code: string;
  description: string;
  type: string;
  version_code?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  children: BomTreeNode[];
}

export interface PriceHistory {
  id: string;
  item_id: string;
  price_value: number;
  valid_from: string;
  valid_to?: string;
  is_current: boolean;
  changed_reason?: string;
  created_by: string;
}

export interface PriceCreatePayload {
  item_id: string;
  price_value: number;
  valid_from: string;
  changed_reason?: string;
  created_by: string;
}

export interface CurrentPrice {
  item_id: string;
  price_value: number;
  valid_from: string;
  created_by: string;
}

export interface BomCostPreview {
  item_id: string;
  custo_total: number;
}

export interface CalculationLine {
  item_id: string;
  code: string;
  description: string;
  type: string;
  group_id?: string | null;
  group_name?: string | null;
  uom: string;
  unit_quantity?: number;
  accumulated_quantity: number;
  price: number;
  line_cost: number;
}

export interface CalculationResponse {
  linhas: CalculationLine[];
  totais: {
    quantidade_itens: number;
    custo_geral: number;
  };
  arquivo_excel: string;
}

export interface CalculationProductPayload {
  root_item_id: string;
  quantity: number;
  reference_date?: string;
  material_group_id?: string;
  requested_by: string;
  simulation_reference?: string;
}

export interface CalculationBatchItemPayload {
  produto_id: string;
  quantidade: number;
}

export interface CalculationBatchPayload {
  itens: CalculationBatchItemPayload[];
  reference_date?: string;
  material_group_id?: string;
  requested_by: string;
  simulation_reference?: string;
}

export interface ExecutionLog {
  id: string;
  requested_by: string;
  root_item_id: string;
  material_group_id?: string | null;
  simulation_reference?: string | null;
  request_payload?: Record<string, unknown>;
  status: ExecutionStatus;
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
  generated_file_name?: string;
  message?: string | null;
}

export interface LogListParams extends PaginationParams {
  status?: string;
  item_id?: string;
}
