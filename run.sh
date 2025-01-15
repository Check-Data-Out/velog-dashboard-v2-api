# chmod +x run.sh

set -e  # 스크립트 실행 중 오류 발생 시 종료

echo "1. 외부 이미지 업데이트 (fe, nginx)..."
docker compose pull fe nginx

echo "2. 로컬 이미지 빌드 (api)..."
docker compose build api

echo "3. 서비스 재시작..."
docker compose up -d

echo "모든 작업이 완료되었습니다!"