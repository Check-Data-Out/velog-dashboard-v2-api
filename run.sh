#!/bin/bash
# 스크립트 권한: chmod +x run.sh

# Bash strict mode (Best Practice)
# https://bertvv.github.io/cheat-sheets/Bash.html
set -o errexit   # 에러 발생 시 즉시 종료
set -o nounset   # 미정의 변수 사용 시 에러
set -o pipefail  # 파이프라인 에러 감지

# 색상 정의
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly NC='\033[0m' # No Color
readonly YELLOW='\033[1;33m'

# 에러 핸들링 함수
handle_error() {
    echo -e "${RED}Error occurred in script at line $1${NC}" >&2
    exit 1
}

# 에러 발생시 handle_error 함수 호출
trap 'handle_error "$LINENO"' ERR

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

# 헬스체크 함수 (재시도 + exponential backoff)
# Best Practice: https://betterstack.com/community/guides/monitoring/exponential-backoff/
wait_for_service() {
    local name="$1"
    local url="$2"
    local max_attempts="${3:-10}"
    local initial_delay="${4:-2}"
    local delay="$initial_delay"

    for ((attempt=1; attempt<=max_attempts; attempt++)); do
        # curl with timeout (5초)
        if curl -sf --max-time 5 "$url" &>/dev/null; then
            echo -e "  ✅ ${name}: ${GREEN}정상${NC} (${attempt}번째 시도)"
            return 0
        fi

        if [[ "$attempt" -lt "$max_attempts" ]]; then
            echo -e "  ⏳ ${name}: 재시도 ${attempt}/${max_attempts} (${delay}초 후)"
            sleep "$delay"

            # Exponential backoff (최대 30초)
            delay=$((delay * 2))
            [[ "$delay" -gt 30 ]] && delay=30
        fi
    done

    echo -e "  ❌ ${name}: ${RED}응답 없음${NC} (${max_attempts}회 시도 실패)"
    return 1
}

# 서비스 상태 확인
check_services() {
    print_step "3. 서비스 상태 확인"

    # 실행 중인 컨테이너 확인
    echo -e "${YELLOW}실행 중인 컨테이너:${NC}"
    docker compose ps

    # 각 서비스 헬스체크 (재시도 로직 적용)
    echo -e "\n${YELLOW}서비스 헬스체크 (exponential backoff 적용):${NC}"

    local all_healthy=true

    # API 서비스 확인 (최대 10회, 2초부터 시작)
    if ! wait_for_service "API 서비스" "http://localhost:8080/health" 10 2; then
        all_healthy=false
    fi

    # Frontend 서비스 확인 (포트 3000)
    if ! wait_for_service "Frontend 서비스" "http://localhost:3000" 10 2; then
        all_healthy=false
    fi

    # Nginx 서비스 확인 (포트 80)
    if ! wait_for_service "Nginx 서비스" "http://localhost" 10 2; then
        all_healthy=false
    fi

    echo ""
    if [[ "$all_healthy" == true ]]; then
        echo -e "${GREEN}모든 서비스가 정상 동작 중입니다!${NC}"
    else
        echo -e "${YELLOW}일부 서비스가 아직 준비되지 않았습니다. 로그를 확인해주세요.${NC}"
    fi
}

# 메인 실행 로직
main() {
    print_step "Velog Dashboard V2 배포 스크립트 시작"

    check_docker
    stop_services
    cleanup_docker
    update_images
    start_services
    check_services

    print_step "모든 작업이 완료되었습니다!"
    echo -e "${GREEN}서비스 접속 정보:${NC}"
    echo -e "  메인 사이트: ${YELLOW}http://localhost${NC}"
    echo -e "  API 서버: ${YELLOW}http://localhost:8080${NC}"
    echo -e "  Frontend: ${YELLOW}http://localhost:3000${NC}"
    echo -e "  API Health Check: ${YELLOW}http://localhost:8080/health${NC}"

    echo -e "\n${YELLOW}로그 모니터링을 시작합니다... (Ctrl+C로 종료)${NC}"
    sleep 2
    docker compose logs -f
}

# 스크립트 실행
main "$@"
