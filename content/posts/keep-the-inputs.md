백테스트는 과거의 시세로 투자 전략을 시험하는 작업이다. 같은 전략과 같은 입력이라면, 나중에 다시 실행해도 결과를 비교할 수 있어야 한다. Idea2Strategy의 시세 데이터 구조를 설계하며 고민한 것도 이 기준이었다.

## 파일을 줄이는 것만으로는 부족했다

약 10년의 시세를 조회할 때 일별 파일만 쌓아 두면, 실행마다 확인할 파일 목록이 길어진다. 지난 데이터를 주·월·년 단위로 묶으면 조회 경로를 정리할 수 있다.

하지만 병합한 파일로 원본을 교체하면 다른 문제가 생긴다. 과거 실행이 참조하던 입력이 사라지거나 바뀔 수 있다. 조회하기 편한 구조와 과거 결과를 설명할 수 있는 구조가 함께 필요했다.

> 병합은 원본을 바꾸는 작업이 아니라, 새 실행이 사용할 조회 경로를 추가하는 작업으로 보았다.

## 실행마다 입력 목록을 남기기

이 구조에서 **Manifest는 한 번의 실행이 읽을 데이터 파일 목록**이다. 기존 실행은 당시의 Manifest와 원본을 계속 참조하고, 새 실행은 병합 결과를 담은 새 Manifest를 선택한다.

<figure class="flow-diagram">
<figcaption>병합한 뒤에도 기존 실행의 참조는 그대로</figcaption>
<div class="input-path"><strong>기존 실행</strong><span>당시 Manifest</span><span>보존한 원본</span></div>
<div class="input-path"><strong>새 실행</strong><span>새 Manifest</span><span>병합 데이터</span></div>
<p class="flow-caption">조회 기간이 경계에 걸리면 필요한 일별 데이터를 함께 조합한다.</p>
</figure>

최근 데이터는 작은 단위로 수집하고, 지난 기간은 더 큰 단위로 묶는다. 여기서 핵심은 묶는 크기보다 **이미 실행한 작업의 입력을 바꾸지 않는 것**이다.

## 보존과 조회가 맡을 일을 나누기

최근 시세의 빠른 조회도 별도의 요구였다. 전체 이력은 S3에 보존하고, Redis는 종목·시간봉별 최근 최대 1,000봉을 유지하는 구조로 나눴다. 오래 보관할 데이터와 자주 읽을 데이터를 같은 기준으로 다루지 않기 위해서다.

이렇게 역할을 나누면 각 시계열의 최근 조회 범위를 제한하면서도 장기 이력을 남길 수 있다. 다만 종목과 시간봉의 수에 따라 전체 메모리 사용량은 달라진다.

## 이 기록이 설명하는 범위

나는 I2S의 초기 시스템·DB·인프라 설계를 주도했고, 담당 팀원들과 요청과 데이터 흐름을 구체화했다. 이 글은 그중 데이터의 보존과 조회를 나눈 설계 판단을 정리한 글이다. 팀의 구현 전체를 혼자 작성했다는 의미는 아니다.

Manifest와 기간별 병합 구조는 프로젝트 자료와 구현에서 확인했다. 입력 보존은 결과를 다시 비교하기 위한 조건 중 하나다. 같은 손익까지 재현하려면 전략과 실행 정책 등 다른 입력도 고정해야 한다.

운영 환경의 조회 시간이나 전송량 개선율은 별도로 실측하지 않았다. 파일 목록을 줄이는 것과 실제 읽는 바이트를 줄이는 것 역시 구분해야 한다.

## 구현 더 보기

- [기간별 병합과 원본 보존 구현](https://github.com/Idea2Strategy/Idea2Strategy-data-pipeline/blob/d8bd3c0c41c8bb093657f73bb6de44e07c6b90fb/market_pipeline_lib/engine.py)
- [병합과 기존 객체 보존을 확인하는 테스트](https://github.com/Idea2Strategy/Idea2Strategy-data-pipeline/blob/d8bd3c0c41c8bb093657f73bb6de44e07c6b90fb/tests/test_market_pipeline_lib.py)
- [백테스트의 입력 파일 검증과 읽기](https://github.com/Idea2Strategy/Idea2Strategy-backtest-engine/blob/a568df09ba26a836eeec68f281ea3a5642aeecad/src/backtest_engine/market_data.py)

위 링크는 설명의 기준이 된 커밋을 가리킨다.

[Idea2Strategy 저장소에서 서비스와 구현 보기](https://github.com/Idea2Strategy/Idea2Strategy)
