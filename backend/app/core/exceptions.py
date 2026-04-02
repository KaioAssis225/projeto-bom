from __future__ import annotations


class BomCycleError(Exception):
    def __init__(self, detail: str, path: str | None = None) -> None:
        super().__init__(detail)
        self.detail = detail
        self.path = path


class ItemNotFoundError(Exception):
    def __init__(self, detail: str = "Item not found") -> None:
        super().__init__(detail)
        self.detail = detail


class PriceNotFoundError(Exception):
    def __init__(self, detail: str = "No valid price found") -> None:
        super().__init__(detail)
        self.detail = detail


class DuplicateCodeError(Exception):
    def __init__(self, detail: str = "Code already exists") -> None:
        super().__init__(detail)
        self.detail = detail


class InactiveItemError(Exception):
    def __init__(self, detail: str = "Inactive item") -> None:
        super().__init__(detail)
        self.detail = detail
