# BacktestGraph

Reusable React backtest replay graph extracted from the Super Toss backtesting panel.

The module owns only presentation state:

- simulation / result table mode
- play / pause / replay
- speed
- progress scrubbing
- event jump
- ECharts lifecycle

It does not build market data, trading rules, or Super Toss-specific stock types.

## Files

- `BacktestGraph.tsx`: React component
- `BacktestGraph.css`: standalone styles
- `types.ts`: public prop and data contracts
- `index.ts`: public exports

## Install Contract

The host project must already provide React and ECharts.

```json
{
  "dependencies": {
    "echarts": "^6.1.0",
    "react": "^19.2.6"
  }
}
```

ECharts is loaded with `await import('echarts')` inside the component. There is no top-level ECharts import.

## Basic Usage

```tsx
import { BacktestGraph } from './modules/backtest-graph'

<BacktestGraph
  points={backtestResult.simulationPoints}
  actions={backtestResult.actions}
  summary={{
    finalProfit: backtestResult.profit,
    finalProfitRate: backtestResult.profitRate,
    sellCount: backtestResult.sellCount,
    buyCount: backtestResult.buyCount,
    bestProfitRate: backtestResult.bestPoint.profitRate,
    worstProfitRate: backtestResult.worstPoint.profitRate,
  }}
  formatter={{
    price: (value) => formatCurrencyWithKrw(value, backtestResult.stock.market),
    money: (value) => formatCurrencyWithKrw(value, backtestResult.stock.market),
    signedMoney: (value) => formatSignedCurrencyWithKrw(value, backtestResult.stock.market),
    percent: (value) => `${value.toFixed(2)}%`,
    signedPercent: (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`,
    quantity: (value) => `${value.toLocaleString('ko-KR')}주`,
    actionSummary: (action) =>
      `조건 ${action.condition} · ${action.action} · ${action.quantity}주 · ${formatCurrencyWithKrw(
        action.price,
        backtestResult.stock.market,
      )} · ${action.profitRate >= 0 ? '+' : ''}${action.profitRate.toFixed(2)}%`,
  }}
  labels={{
    caption: '장중 전략 실행 시뮬레이터',
    title: '그래프로 보는 내 전략의 하루',
    simulationTab: '시뮬레이션',
    resultTab: '결과표',
    play: '재생',
    pause: '일시정지',
    replay: '다시 재생',
    reset: '처음으로',
    speed: '재생 속도',
    progress: '시뮬레이션 진행도',
    currentPoint: '현재 시점',
    currentPrice: '현재 가격',
    moveRate: '시작가 대비',
    quantity: '보유 수량',
    cash: '현금',
    portfolioValue: '평가금액',
    profit: '누적 수익금',
    strategyState: '전략 상태',
    eventTimeline: '전략 이벤트',
    resultTable: '결과표',
    finalProfit: '최종 수익금',
    finalProfitRate: '최종 수익률',
    tradeCount: '매도 / 재매수',
    bestWorst: '최고 / 최대손실',
    tableTime: '시간',
    tableEvent: '이벤트',
    tableCondition: '조건',
    tableQuantity: '수량',
    tablePrice: '가격',
    tableProfitRate: '수익률',
  }}
/>
```

## Data Contract

`points` is the chart timeline. Each action `index` must point to the zero-based `points` array position where that action happened.

```ts
type BacktestGraphPoint = {
  index?: number
  time: string
  price: number
  moveRate: number
  quantity: number
  cash: number
  portfolioValue: number
  profit: number
  profitRate: number
  strategyState: string
}
```

`actions` is the event list used for chart markers, event chips, result table rows, and click-to-jump.

```ts
type BacktestGraphAction = {
  id?: string
  index: number
  time: string
  condition: string
  action: string
  quantity: number
  price: number
  profitRate: number
  title: string
  detail: string
  tone?: 'buy' | 'sell' | 'full-buy' | 'full-sell' | 'hold' | 'neutral'
}
```

`summary` is displayed after replay finishes.

```ts
type BacktestGraphSummary = {
  finalProfit: number
  finalProfitRate: number
  sellCount?: number
  buyCount?: number
  bestProfitRate?: number
  worstProfitRate?: number
  extraItems?: Array<{ label: string; value: React.ReactNode }>
}
```

## Super Toss Integration Notes

When this component is wired into `src/App.tsx`, remove or replace these App-local pieces:

- top-level `import * as echarts from 'echarts'`
- `SimulationPoint` and `SimulationEvent` can be replaced by imported public types, or mapped into them at render time
- `interpolateSimulationPoint`
- `getVisibleSimulationPoints`
- `simulationMode`, `isSimPlaying`, `simSpeed`, `simProgress`
- `simulationFrameRef`, `simulationLastFrameRef`, `chartElRef`, `chartInstanceRef`
- ECharts `useEffect`
- `resetSimulation`, `toggleSimulationPlayback`, `jumpToSimulationEvent`
- the JSX block starting at `.simulation-mode-panel`

Keep `buildBacktestResult` in the app unless the trading-rule engine is also being extracted. It should produce `points`, `actions`, and `summary`, then render `BacktestGraph`.
