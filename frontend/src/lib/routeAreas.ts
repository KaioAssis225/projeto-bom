/** Mapa de rota → áreas que têm acesso. Ausência de chave = acesso livre. */
export const ROUTE_AREAS: Record<string, string[]> = {
  "/requisicoes":      ["ESTOQUE"],
  "/requisicoes/nova": ["ESTOQUE"],
  "/itens":        ["CUSTOS", "CADASTRO", "GERAL"],
  "/bom":          ["CUSTOS", "CADASTRO", "GERAL"],
  "/precos":       ["CUSTOS", "GERAL"],
  "/calculos":     ["CADASTRO"],
  "/estoques":     ["ESTOQUE"],
  "/grupos":       ["CUSTOS", "CADASTRO", "ESTOQUE", "GERAL"],
  "/setores":      ["CUSTOS", "CADASTRO", "ESTOQUE", "GERAL"],
  "/unidades":     ["CUSTOS", "CADASTRO", "ESTOQUE", "GERAL"],
  "/fornecedores": ["CUSTOS", "CADASTRO", "ESTOQUE", "GERAL"],
  "/importacoes":  ["CADASTRO"],
  "/logs":         ["CUSTOS", "GERAL"],
};

export function canAccessRoute(
  userAreas: string[],
  isAdmin: boolean,
  inViewAs: boolean,
  route: string,
): boolean {
  if (isAdmin && !inViewAs) return true;
  const allowed = ROUTE_AREAS[route];
  if (!allowed) return true;
  return userAreas.some((a) => allowed.includes(a));
}
