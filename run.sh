#!/bin/bash
# 스크립트 권한: chmod +x run.sh

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
YELLOW='\033[1;33m'

# 에러 핸들링 함수
handle_error() {
    echo -e "${RED}Error occurred in script at line $1${NC}" >&2
    exit 1
}

# 에러 발생시 handle_error 함수 호출
trap 'handle_error $LINENO' ERR

# 진행상황 출력 함수
print_step() {
    echo -e "\n${GREEN}===================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${GREEN}===================================${NC}"
}

# Docker 설치 확인
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker가 설치되어 있지 않습니다.${NC}"
        exit 1
    fi
}

# 서비스 중지
stop_services() {
    print_step "0. 현재 사용 중인 서비스 중지"
    docker compose stop || true
    docker compose down || true
}

# Docker 리소스 정리
cleanup_docker() {
    print_step "0.5. 사용하지 않는 Docker 리소스 정리"
    
    # 중지된 컨테이너 제거
    docker container prune -f
    
    # dangling 이미지 제거 (태그가 없는 이미지)
    docker image prune -f
    
    # 사용하지 않는 네트워크 제거
    docker network prune -f
    
    echo -e "${GREEN}Docker 정리 완료${NC}"
}

# 모든 이미지 업데이트 (API 포함)
update_images() {
    print_step "1. Docker Hub에서 최신 이미지 다운로드 중..."
    
    # 모든 서비스의 이미지를 Docker Hub에서 최신 버전으로 pull
    docker compose pull
    
    echo -e "${GREEN}모든 이미지 업데이트 완료${NC}"
}

# 서비스 시작
start_services() {
    print_step "2. 서비스 시작 중..."
    docker compose up -d
    
    echo -e "${GREEN}모든 서비스가 시작되었습니다${NC}"
}

# 서비스 상태 확인
check_services() {
    print_step "3. 서비스 상태 확인"
    
    # 잠시 대기 (서비스 시작 시간 확보)
    sleep 5
    
    # 실행 중인 컨테이너 확인
    echo -e "${YELLOW}실행 중인 컨테이너:${NC}"
    docker compose ps
    
    # 각 서비스 헬스체크
    echo -e "\n${YELLOW}서비스 헬스체크:${NC}"
    
    # API 서비스 확인
    if curl -f http://localhost:8080/health &>/dev/null; then
        echo -e "✅ API 서비스: ${GREEN}정상${NC}"
    else
        echo -e "❌ API 서비스: ${RED}응답 없음${NC}"
    fi
    
    # Frontend 서비스 확인 (포트 3000)
    if curl -f http://localhost:3000 &>/dev/null; then
        echo -e "✅ Frontend 서비스: ${GREEN}정상${NC}"
    else
        echo -e "❌ Frontend 서비스: ${RED}응답 없음${NC}"
    fi
    
    # Nginx 서비스 확인 (포트 80)
    if curl -f http://localhost &>/dev/null; then
        echo -e "✅ Nginx 서비스: ${GREEN}정상${NC}"
    else
        echo -e "❌ Nginx 서비스: ${RED}응답 없음${NC}"
    fi
}

# 메인 실행 로직
main() {
    set -e  # 스크립트 실행 중 오류 발생 시 종료
    
    print_step "Velog Dashboard V2 배포 스크립트 시작"
    
    check_docker
    stop_services
    cleanup_docker
    update_images
    start_services
    check_services

    print_step "🎉 모든 작업이 완료되었습니다!"
    echo -e "${GREEN}서비스 접속 정보:${NC}"
    echo -e "• 메인 사이트: ${YELLOW}http://localhost${NC}"
    echo -e "• API 서버: ${YELLOW}http://localhost:8080${NC}"
    echo -e "• Frontend: ${YELLOW}http://localhost:3000${NC}"
    echo -e "• API Health Check: ${YELLOW}http://localhost:8080/health${NC}"
    
    echo -e "\n${YELLOW}로그 모니터링을 시작합니다... (Ctrl+C로 종료)${NC}"
    sleep 2
    docker compose logs -f
}

# 스크립트 실행
main