import asyncio
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

import aiosqlite


SCHEMA = """
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT DEFAULT (datetime('now')),
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    signal TEXT,
    position_type TEXT DEFAULT 'spot',
    status TEXT DEFAULT 'filled',
    dollar_amount REAL,
    fees REAL DEFAULT 0,
    order_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_trades_ts ON trades(ts DESC);
CREATE INDEX IF NOT EXISTS idx_trades_symbol_ts ON trades(symbol, ts DESC);
"""


class TradeTrackerDB:
    """SQLite 기반 거래 기록 저장소 (동시 쓰기 안전)."""

    def __init__(self, db_path: str = "./data/trades.db"):
        self.db_path = db_path
        self._init_lock = asyncio.Lock()
        self._initialized = False

    def _ensure_db_dir(self):
        db_dir = os.path.dirname(os.path.abspath(self.db_path))
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

    async def _init(self):
        if self._initialized:
            return
        self._ensure_db_dir()
        async with self._init_lock:
            if self._initialized:
                return
            async with aiosqlite.connect(self.db_path) as db:
                await db.executescript(SCHEMA)
                await db.commit()
            self._initialized = True

    async def add_trade(
        self,
        symbol: str,
        side: str,
        qty: float,
        price: float,
        signal: Optional[str] = None,
        position_type: str = "spot",
        dollar_amount: Optional[float] = None,
        order_id: Optional[str] = None,
        status: str = "filled",
        fees: float = 0.0,
    ) -> Dict[str, Any]:
        await self._init()
        dollar_amount = dollar_amount if dollar_amount is not None else qty * price

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO trades(symbol, side, quantity, price, signal, position_type, status, dollar_amount, fees, order_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (symbol, side, qty, price, signal, position_type, status, dollar_amount, fees, order_id),
            )
            await db.commit()

        return {
            "symbol": symbol,
            "side": side,
            "quantity": qty,
            "price": price,
            "signal": signal,
            "position_type": position_type,
            "status": status,
            "dollar_amount": dollar_amount,
            "fees": fees,
            "order_id": order_id,
            "ts": datetime.utcnow().isoformat(),
        }

    async def recent_trades(self, limit: int = 50) -> List[Dict[str, Any]]:
        await self._init()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM trades ORDER BY ts DESC LIMIT ?", (limit,)
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def get_current_positions(self) -> Dict[str, Dict[str, Any]]:
        await self._init()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """
                SELECT
                    symbol,
                    COALESCE(position_type, 'spot') AS position_type,
                    SUM(CASE
                        WHEN LOWER(side) = 'buy' THEN quantity
                        WHEN LOWER(side) = 'sell' THEN -quantity
                        ELSE 0
                    END) AS total_quantity,
                    SUM(CASE
                        WHEN LOWER(side) = 'buy' THEN COALESCE(dollar_amount, quantity * price)
                        WHEN LOWER(side) = 'sell' THEN -COALESCE(dollar_amount, quantity * price)
                        ELSE 0
                    END) AS total_invested
                FROM trades
                WHERE LOWER(COALESCE(status, 'filled')) = 'filled'
                  AND LOWER(side) IN ('buy', 'sell')
                GROUP BY symbol, COALESCE(position_type, 'spot')
                """
            )
            rows = await cursor.fetchall()

        positions: Dict[str, Dict[str, Any]] = {}
        for row in rows:
            symbol = row["symbol"]
            position_type = row["position_type"] or "spot"
            total_quantity = float(row["total_quantity"] or 0.0)
            total_invested = float(row["total_invested"] or 0.0)
            average_price = (total_invested / total_quantity) if total_quantity > 0 else 0.0

            if symbol not in positions:
                positions[symbol] = {}
            positions[symbol][position_type] = {
                "symbol": symbol,
                "position_type": position_type,
                "total_quantity": total_quantity,
                "average_price": average_price,
                "total_invested": total_invested,
                "dollar_amount": total_invested,
            }
        return positions

    async def get_pnl(
        self, symbol: str, current_price: float, position_type: str = "spot"
    ) -> Dict[str, Any]:
        positions = await self.get_current_positions()
        position = positions.get(symbol, {}).get(position_type)
        if not position or position["total_quantity"] <= 0:
            return {
                "unrealized_pnl": 0,
                "unrealized_pnl_percent": 0,
                "average_price": 0,
                "current_price": current_price,
                "quantity": 0,
                "invested_value": 0,
                "current_value": 0,
                "dollar_amount": 0,
            }

        quantity = position["total_quantity"]
        invested_value = position["total_invested"]
        current_value = quantity * current_price
        unrealized_pnl = current_value - invested_value
        unrealized_pnl_percent = (
            (unrealized_pnl / invested_value * 100) if invested_value > 0 else 0
        )
        return {
            "unrealized_pnl": unrealized_pnl,
            "unrealized_pnl_percent": unrealized_pnl_percent,
            "average_price": position["average_price"],
            "current_price": current_price,
            "quantity": quantity,
            "invested_value": invested_value,
            "current_value": current_value,
            "dollar_amount": position["dollar_amount"],
        }

    async def get_trade_signals(self, limit: int = 5) -> List[Dict[str, Any]]:
        await self._init()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """
                SELECT *
                FROM trades
                WHERE signal IS NOT NULL
                  AND LOWER(signal) != 'manual'
                ORDER BY ts DESC
                LIMIT ?
                """,
                (limit,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]
