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
"""


class TradeTrackerDB:
    """SQLite 기반 거래 기록 저장소 (동시 쓰기 안전)."""

    def __init__(self, db_path: str = "./data/trades.db"):
        self.db_path = db_path
        self._init_lock = asyncio.Lock()

    def _ensure_db_dir(self):
        db_dir = os.path.dirname(os.path.abspath(self.db_path))
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

    async def _init(self):
        self._ensure_db_dir()
        async with self._init_lock:
            async with aiosqlite.connect(self.db_path) as db:
                await db.executescript(SCHEMA)
                await db.commit()

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
