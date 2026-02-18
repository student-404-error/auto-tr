import os
import time
import argparse
import logging
from typing import List
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv

from trading.bybit_client import BybitClient
from pipeline.sqlite_store import QuantSQLiteStore
from pipeline.collector import QuantDataCollector


def _parse_list(value: str, default: List[str]) -> List[str]:
    if not value:
        return default
    items = [x.strip() for x in value.split(",") if x.strip()]
    return items or default


def main():
    load_dotenv()
    parser = argparse.ArgumentParser(description="Bybit quant time-series ingestion pipeline")
    parser.add_argument("--once", action="store_true", help="Run one cycle then exit")
    parser.add_argument("--sleep", type=int, default=int(os.getenv("DATA_PIPELINE_SLEEP_SEC", "60")))
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    logger = logging.getLogger("quant-pipeline")

    symbols = _parse_list(
        os.getenv("DATA_PIPELINE_SYMBOLS", "BTCUSDT,XRPUSDT,SOLUSDT"),
        ["BTCUSDT", "XRPUSDT", "SOLUSDT"],
    )
    timeframes = _parse_list(
        os.getenv("DATA_PIPELINE_INTERVALS", "1,5,15,60"),
        ["1", "5", "15", "60"],
    )
    db_path = os.getenv("QUANT_DB_PATH", "./data/quant_timeseries.db")

    client = BybitClient()
    store = QuantSQLiteStore(db_path)
    collector = QuantDataCollector(client, store)
    max_workers = int(os.getenv("DATA_PIPELINE_WORKERS", "2"))
    logger.info("Pipeline started db=%s symbols=%s intervals=%s", db_path, symbols, timeframes)

    while True:
        run_id = store.start_run()
        try:
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [
                    executor.submit(collector.collect_symbol, symbol, timeframes)
                    for symbol in symbols
                ]
                for future in as_completed(futures):
                    future.result()
            store.end_run(run_id, "success", "cycle completed")
            logger.info("Cycle completed")
        except Exception as exc:
            store.end_run(run_id, "error", str(exc))
            logger.exception("Cycle failed: %s", exc)

        if args.once:
            break
        time.sleep(max(5, args.sleep))


if __name__ == "__main__":
    main()
