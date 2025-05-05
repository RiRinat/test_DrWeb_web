from collections import defaultdict
from typing import List, Dict, Set, Tuple, Optional


class TransactionLogger:
    """Логирует изменения внутри транзакции."""

    def __init__(self):
        self.changes: List[str] = []

    def log(self, message: str):
        self.changes.append(message)

    def get_changes(self) -> List[str]:
        return self.changes.copy()

    def clear(self):
        self.changes.clear()


class KVStore:
    def __init__(self):
        self._data: Dict[str, str] = {}  # key -> value - основное хранилище ключ-значение
        self._val_keys: Dict[str, Set[str]] = defaultdict(set)  # value -> set of keys обратный индекс: значение → множество ключей с этим значением
        self._tx_stack: List[
            Tuple[Dict[str, str], Dict[str, Set[str]], TransactionLogger]
        ] = [] # стек для хранения снимков состояния при начале транзакций
        self._current_logger: Optional[TransactionLogger] = None # текущий логгер транзакций

    def _snapshot(self) -> Tuple[Dict[str, str], Dict[str, Set[str]]]:
        """Создает снимок текущего состояния."""
        return (
            self._data.copy(),
            defaultdict(set, {k: v.copy() for k, v in self._val_keys.items()}),
        ) # Создает копию текущего состояния хранилища (и данных, и обратного индекса)
          # Возвращает кортеж из двух словарей


    def _restore(self, snapshot: Tuple[Dict[str, str], Dict[str, Set[str]]]):
        """Восстанавливает состояние из снимка."""
        self._data, self._val_keys = snapshot # Восстанавливает состояние

    def begin(self):
        """Начинает новую транзакцию."""
        logger = TransactionLogger()
        self._tx_stack.append((self._snapshot(), logger)) #  сохраняет состояния и кладет в стек вместе с логгером
        self._current_logger = logger
        logger.log("BEGIN")

    def rollback(self) -> Tuple[bool, Optional[List[str]]]:
        """Откатывает текущую транзакцию."""
        if not self._tx_stack: # Проверяет, есть ли активные транзакции
            return False, None
        snapshot, logger = self._tx_stack.pop() # Берет последнее состояние из стека
        self._restore(snapshot) # Восстанавливает состояние
        self._current_logger = self._tx_stack[-1][1] if self._tx_stack else None # Обновляет текущий логгер (или None, если стек пуст)
        return True, logger.get_changes()

    def commit(self) -> Tuple[bool, Optional[List[str]]]:
        """Фиксирует текущую транзакцию."""
        if not self._tx_stack: # Проверяет наличие активных транзакций
            return False, None
        _, logger = self._tx_stack.pop() # Удаляет последнее состояние из стека (но сохраняет изменения)
        self._current_logger = self._tx_stack[-1][1] if self._tx_stack else None # Обновляет текущий логгер
        return True, logger.get_changes()

    def set(self, key: str, value: str):
        """Устанавливает значение ключа."""
        if key in self._data: # Если ключ уже существует, удаляет его из обратного индекса
            old_val = self._data[key]
            self._val_keys[old_val].discard(key)
            if not self._val_keys[old_val]:
                del self._val_keys[old_val]
        self._data[key] = value # Устанавливает новое значение
        self._val_keys[value].add(key) # Обновляет обратный индекс

        if self._current_logger: # Логирует изменение, если есть активная транзакция
            self._current_logger.log(f"SET {key} {value}")

    def unset(self, key: str):
        """Удаляет ключ."""
        if key in self._data: # Если ключ существует, удаляет его
            old_val = self._data.pop(key)
            self._val_keys[old_val].discard(key)
            if not self._val_keys[old_val]:
                del self._val_keys[old_val]
            if self._current_logger: # Логирует изменение, если есть активная транзакция
                self._current_logger.log(f"UNSET {key}")

    def get(self, key: str) -> str:
        """Возвращает значение ключа или 'NULL'."""
        return self._data.get(key, "NULL")

    def counts(self, value: str) -> int:
        """Возвращает количество ключей с указанным значением."""
        return len(self._val_keys.get(value, set()))

    def find(self, value: str) -> List[str]:
        """Возвращает список ключей с указанным значением."""
        keys = self._val_keys.get(value, set())
        return sorted(keys) if keys else []

    def process_command(self, parts: List[str]) -> Dict[str, any]:
        """Обрабатывает введённую команду и возвращает результат."""
        if not parts:
            return {"error": "Empty command"}

        cmd = parts[0].upper()
        try:
            if cmd == "SET" and len(parts) == 3:
                self.set(parts[1], parts[2])
                return {"result": f"Set {parts[1]} = {parts[2]}"}
            elif cmd == "GET" and len(parts) == 2:
                value = self.get(parts[1])
                return {"result": value}
            elif cmd == "UNSET" and len(parts) == 2:
                self.unset(parts[1])
                return {"result": f"Unset {parts[1]}"}
            elif cmd == "COUNTS" and len(parts) == 2:
                count = self.counts(parts[1])
                return {"result": count}
            elif cmd == "FIND" and len(parts) == 2:
                keys = self.find(parts[1])
                return {"result": keys if keys else "NONE"}
            elif cmd == "BEGIN":
                self.begin()
                return {"result": "Transaction started"}
            elif cmd == "ROLLBACK":
                success, changes = self.rollback()
                if success:
                    return {"result": "Rollback successful", "changes": changes}
                else:
                    return {"error": "NO TRANSACTION"}
            elif cmd == "COMMIT":
                success, changes = self.commit()
                if success:
                    return {"result": "Commit successful", "changes": changes}
                else:
                    return {"error": "NO TRANSACTION"}
            else:
                return {"error": f"Invalid command: {cmd}"}
        except Exception as e:
            return {"error": str(e)}
