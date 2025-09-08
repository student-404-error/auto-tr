# Scripts

프로젝트 실행 및 관리를 위한 스크립트 모음

## 스크립트 목록

### 🚀 실행 스크립트
- **`start.sh`** - 전체 시스템 시작 (백엔드 + 프론트엔드)
- **`run-backend.sh`** - 백엔드만 실행 (간단 버전)
- **`run-frontend.sh`** - 프론트엔드만 실행

### ⚙️ 설정 스크립트
- **`setup.sh`** - 초기 프로젝트 설정 (의존성 설치)
- **`git-setup.sh`** - Git 저장소 초기 설정

### 📝 Git 관리
- **`git-commit.sh`** - 변경사항 자동 커밋

## 사용법

### 1. 초기 설정
```bash
# 프로젝트 의존성 설치
bash scripts/setup.sh

# Git 저장소 설정 (처음만)
bash scripts/git-setup.sh
```

### 2. 개발 서버 실행
```bash
# 전체 시스템 시작
bash scripts/start.sh

# 또는 개별 실행
bash scripts/run-backend.sh   # 백엔드만
bash scripts/run-frontend.sh  # 프론트엔드만
```

### 3. Git 관리
```bash
# 변경사항 자동 커밋
bash scripts/git-commit.sh
```

## 주의사항

- 스크립트 실행 전 환경 변수 파일(.env) 설정 필요
- 실행 권한이 없다면: `chmod +x scripts/*.sh`