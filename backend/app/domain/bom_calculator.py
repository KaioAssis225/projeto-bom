from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID


@dataclass(slots=True)
class BomNode:
    item_id: UUID
    parent_item_id: UUID | None
    code: str
    description: str
    type: str
    group_id: UUID | None
    group_name: str | None
    uom: str
    unit_quantity: Decimal
    children: list[UUID]


@dataclass(slots=True)
class CalculationLine:
    item_id: UUID
    code: str
    description: str
    type: str
    group_id: UUID | None
    group_name: str | None
    uom: str
    unit_quantity: Decimal
    accumulated_quantity: Decimal
    price: Decimal
    line_cost: Decimal


class BomCalculator:
    def __init__(self, nodes: list[BomNode], price_map: dict[UUID, Decimal]) -> None:
        self.nodes = nodes
        self.price_map = price_map
        self._nodes_by_item_id = {node.item_id: node for node in nodes}
        self._children_by_parent_id = defaultdict(list)
        for node in nodes:
            if node.parent_item_id is not None:
                self._children_by_parent_id[node.parent_item_id].append(node)

    def detect_cycle(self, parent_item_id: UUID, child_item_id: UUID) -> str | None:
        if parent_item_id == child_item_id:
            code = self._code_for_item(parent_item_id)
            return f"{code} -> {code}"

        stack: list[tuple[UUID, list[UUID]]] = [(child_item_id, [child_item_id])]
        visited: set[UUID] = set()

        while stack:
            current_item_id, path = stack.pop()
            if current_item_id in visited:
                continue
            visited.add(current_item_id)

            for child_node in self._children_by_parent_id.get(current_item_id, []):
                next_item_id = child_node.item_id
                if next_item_id == parent_item_id:
                    readable_path = [
                        self._code_for_item(parent_item_id),
                        *(self._code_for_item(item_id) for item_id in path),
                        self._code_for_item(parent_item_id),
                    ]
                    return " -> ".join(readable_path)
                stack.append((next_item_id, [*path, next_item_id]))

        return None

    def ensure_no_cycle(self, parent_item_id: UUID, child_item_id: UUID) -> None:
        cycle_path = self.detect_cycle(parent_item_id=parent_item_id, child_item_id=child_item_id)
        if cycle_path is not None:
            raise ValueError(f"Ciclo detectado: {cycle_path}")

    def explode(self, root_id: UUID, quantity: Decimal) -> dict[UUID, Decimal]:
        accumulated: dict[UUID, Decimal] = defaultdict(lambda: Decimal("0"))
        self._dfs(root_id=root_id, current_item_id=root_id, factor=quantity, accumulated=accumulated)
        return dict(accumulated)

    def calculate(
        self,
        accumulated: dict[UUID, Decimal],
        price_map: dict[UUID, Decimal] | None = None,
        group_filter: UUID | None = None,
    ) -> list[CalculationLine]:
        effective_price_map = price_map or self.price_map
        lines: list[CalculationLine] = []

        for item_id, accumulated_quantity in accumulated.items():
            node = self._nodes_by_item_id[item_id]
            if group_filter is not None and node.group_id != group_filter:
                continue

            price = effective_price_map[item_id]
            lines.append(
                CalculationLine(
                    item_id=node.item_id,
                    code=node.code,
                    description=node.description,
                    type=node.type,
                    group_id=node.group_id,
                    group_name=node.group_name,
                    uom=node.uom,
                    unit_quantity=node.unit_quantity,
                    accumulated_quantity=accumulated_quantity,
                    price=price,
                    line_cost=accumulated_quantity * price,
                )
            )

        return sorted(lines, key=lambda line: line.code)

    @staticmethod
    def total_cost(lines: list[CalculationLine]) -> Decimal:
        return sum((line.line_cost for line in lines), start=Decimal("0"))

    def _dfs(
        self,
        root_id: UUID,
        current_item_id: UUID,
        factor: Decimal,
        accumulated: dict[UUID, Decimal],
    ) -> None:
        for child_node in self._children_by_parent_id.get(current_item_id, []):
            next_factor = factor * child_node.unit_quantity
            accumulated[child_node.item_id] += next_factor
            self._dfs(
                root_id=root_id,
                current_item_id=child_node.item_id,
                factor=next_factor,
                accumulated=accumulated,
            )

    def _code_for_item(self, item_id: UUID) -> str:
        node = self._nodes_by_item_id.get(item_id)
        if node is None:
            return str(item_id)
        return node.code
