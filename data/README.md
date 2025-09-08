# Data Files

프로젝트에서 사용되는 데이터 파일들

## 파일 목록

### 📊 거래 데이터
- **`enhanced_multi_asset_trades.json`** - 다중 자산 거래 내역 샘플 데이터

## 데이터 구조

### enhanced_multi_asset_trades.json
```json
{
  "id": "trade_1757324993.044651",
  "timestamp": "2025-09-08T18:49:53.044659",
  "symbol": "BTCUSDT",
  "side": "Buy",
  "quantity": 0.001,
  "price": 65000.0,
  "dollar_amount": 65.0,
  "position_type": "long"
}
```

## 주의사항

- 이 폴더의 파일들은 `.gitignore`에 포함되어 있습니다
- 실제 거래 데이터는 민감한 정보이므로 버전 관리에서 제외됩니다
- 샘플 데이터만 포함되어 있으며, 실제 운영 시에는 별도 관리가 필요합니다

## 데이터 백업

중요한 거래 데이터는 정기적으로 백업하는 것을 권장합니다:
- 로컬 백업
- 클라우드 스토리지 백업
- 데이터베이스 백업