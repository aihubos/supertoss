import type { ReactNode } from 'react'

export type BacktestGraphTone = 'buy' | 'sell' | 'full-buy' | 'full-sell' | 'reentry-buy' | 'hold' | 'neutral'

export type BacktestGraphPoint = {
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

export type BacktestGraphAction = {
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
  tone?: BacktestGraphTone
}

export type BacktestGraphStrategyLevel = {
  id?: string
  group?: string
  label: string
  shortLabel?: string
  price: number
  referencePrice?: number
  trigger?: number
  quantityPercent?: number
  canEditQuantity?: boolean
  tone?: Extract<BacktestGraphTone, 'buy' | 'sell' | 'full-buy' | 'full-sell' | 'reentry-buy'>
}

export type BacktestGraphStrategyLevelChange = {
  id: string
  price?: number
  referencePrice?: number
  quantityPercent?: number
}

export type BacktestGraphSummary = {
  finalProfit: number
  finalProfitRate: number
  sellCount?: number
  buyCount?: number
  bestProfitRate?: number
  worstProfitRate?: number
  extraItems?: BacktestGraphSummaryItem[]
}

export type BacktestGraphSummaryItem = {
  label: string
  value: ReactNode
}

export type BacktestGraphFormatter = {
  price?: (value: number) => string
  money?: (value: number) => string
  signedMoney?: (value: number) => string
  percent?: (value: number) => string
  signedPercent?: (value: number) => string
  quantity?: (value: number) => string
  actionSummary?: (action: BacktestGraphAction) => string
  tooltip?: (point: BacktestGraphPoint) => string
}

export type BacktestGraphLabels = {
  caption: string
  title: string
  simulationTab: string
  resultTab: string
  play: string
  pause: string
  replay: string
  reset: string
  saveVideo: string
  saveFinalImage: string
  recordingVideo: string
  speed: string
  progress: string
  chartLoading: string
  chartUnavailable: string
  currentPoint: string
  currentPrice: string
  moveRate: string
  quantity: string
  cash: string
  portfolioValue: string
  profit: string
  strategyState: string
  eventTimeline: string
  resultTable: string
  finalProfit: string
  finalProfitRate: string
  tradeCount: string
  bestWorst: string
  tableTime: string
  tableEvent: string
  tableCondition: string
  tableQuantity: string
  tablePrice: string
  tableProfitRate: string
}

export type BacktestGraphProps = {
  points: BacktestGraphPoint[]
  actions: BacktestGraphAction[]
  strategyLevels?: BacktestGraphStrategyLevel[]
  summary: BacktestGraphSummary
  formatter?: BacktestGraphFormatter
  labels?: Partial<BacktestGraphLabels>
  onStrategyLevelChange?: (change: BacktestGraphStrategyLevelChange) => void
  initialMode?: 'simulation' | 'result'
  initialSpeed?: BacktestGraphSpeed
  className?: string
}

export type BacktestGraphSpeed = 1 | 2 | 5 | 10
