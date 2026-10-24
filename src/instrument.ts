// Sentry 는 먼저 초기화된 뒤에 불러온 모듈(express, http)만 계측하므로 진입점에서 가장 먼저 불러온다
import { initSentry } from './configs/sentry.config';

initSentry();
