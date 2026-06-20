import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { DragEvent } from 'react'
import {
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  Heart,
  LayoutDashboard,
  LogOut,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Trophy,
  Workflow,
} from 'lucide-react'
import { BacktestGraph } from './modules/backtest-graph'
import './App.css'

type MobileTab = '홈' | '백테스트' | '관심' | '설정'
type AiProviderId = 'local-codex' | 'openai' | 'claude' | 'gemini'
type MarketMode = 'kr' | 'us'
type DisplayCurrency = 'krw' | 'usd'
type MarketSessionStatus = 'open' | 'closed'
type NavSection =
  | 'savedStocks'
  | 'stockDetail'
  | 'dashboard'
  | 'strategy'
  | 'strategyPerformance'
  | 'backtest'
  | 'watchlist'
  | 'orders'
  | 'ai'
  | 'api'
  | 'safety'

type NavItem = {
  icon: ReactNode
  label: string
  section: NavSection
}

type MarketStock = {
  name: string
  price: string
  change: string
  volume: string
}

type MarketSessionConfig = {
  id: string
  label: string
  marketLabel?: string
  timeZone: string
  openHour: number
  openMinute: number
  closeHour: number
  closeMinute: number
}

type MarketSessionInfo = {
  id: string
  label: string
  status: MarketSessionStatus
  actionLabel: string
  countdown: string
  timeLabel: string
  nextOpenLabel: string
}

type Recommendation = {
  name: string
  price: string
  ticker: string
  score: number
  reason: string
  sellStage: string
  buyStages: string
}

type SavedStock = {
  id: number
  name: string
  ticker: string
  market: MarketMode
  basePrice: number
  quantity: number
  sellUp: number
  defenseDown: number
  stopLoss: number
  rebuyDown: number
  targetReturn: number
  note: string
  strategyStages?: StrategyStage[]
}

type TossRankingStock = {
  rank: number
  name: string
  ticker: string
  market: MarketMode
  price: string
  change: string
  volume: string
  reason: string
}

type BacktestForm = {
  date: string
  stockId: string
  initialCapital: number
  startPrice: number
  quantity: number
  sellUp: number
  defenseDown: number
  stopLoss: number
  rebuyDown: number
  stages: StrategyStage[]
}

type StrategyStage = {
  id: string
  label: string
  trigger: number
  quantityPercent: number
  type: 'rise-sell' | 'dip-buy' | 'dip-sell' | 'crash-full-sell' | 'post-full-sell-reentry'
  enabled?: boolean
}

type SearchStatus = 'idle' | 'loading' | 'ready' | 'error'
type AuthStatus = 'signed-out' | 'signed-in'

type GoogleTokenResponse = {
  access_token?: string
  error?: string
  error_description?: string
  expires_in?: number
}

type GoogleTokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
}

type GoogleUserInfo = {
  email?: string
  email_verified?: boolean
}

type SuperTossSession = {
  emailHash: string
  expiresAt: number
}

type HistoricalPricePoint = {
  time: string
  price: number
}

type HistoricalPricePath = {
  points: HistoricalPricePoint[]
  source: string
  warning?: string
}

type SimulationEvent = {
  index: number
  time: string
  condition: string
  action: string
  quantity: number
  price: number
  profitRate: number
  title: string
  detail: string
  tone: 'sell' | 'buy' | 'full-sell' | 'full-buy' | 'reentry-buy' | 'hold'
}

type SimulationPoint = {
  index: number
  time: string
  price: number
  moveRate: number
  quantity: number
  cash: number
  portfolioValue: number
  profit: number
  profitRate: number
  strategyState: string
  event?: SimulationEvent
}

type BacktestResult = {
  stock: SavedStock
  date: string
  startCapital: number
  finalCapital: number
  profit: number
  profitRate: number
  realizedProfit: number
  remainingQuantity: number
  finalPrice: number
  maxPrice: number
  minPrice: number
  actions: SimulationEvent[]
  strategyLevels: BacktestStrategyLevel[]
  simulationPoints: SimulationPoint[]
  sellCount: number
  buyCount: number
  bestPoint: SimulationPoint
  worstPoint: SimulationPoint
  dataSource: string
  dataWarning?: string
}

type BacktestStrategyLevel = {
  id: string
  label: string
  shortLabel: string
  price: number
  referencePrice: number
  trigger: number
  quantityPercent: number
  canEditQuantity: boolean
  tone: 'buy' | 'sell' | 'full-buy' | 'full-sell' | 'reentry-buy'
  group: string
}

type StrategyPerformanceSortKey = 'dailyProfitRate' | 'dailyProfit' | 'cumulativeProfitRate' | 'cumulativeProfit'

type StrategyPerformanceRow = {
  id: number
  name: string
  ticker: string
  status: string
  dailyProfitRate: number
  dailyProfit: number
  cumulativeProfitRate: number
  cumulativeProfit: number
  currentValue: number
  totalBuyAmount: number
  holdingQuantity: number
  lastTradeDate: string
  lastSignal: string
  market: MarketMode
  isUnavailable?: boolean
}

type YahooSearchQuote = {
  exchange?: string
  exchDisp?: string
  longname?: string
  quoteType?: string
  regularMarketChangePercent?: number
  regularMarketPrice?: number
  shortname?: string
  symbol?: string
}

type EodhdDailyPrice = {
  close?: number
  date?: string
  high?: number
  low?: number
  open?: number
}

type AiProvider = {
  id: AiProviderId
  label: string
  description: string
  models: string[]
  logoUrl: string
  logoFallback: string
}

type RankingCategory = 'marketCap' | 'volume' | 'surge'
type RankingSortDirection = 'desc' | 'asc'
type RankingTypeFilter = 'all' | 'stock' | 'etf'
type AnalysisPeriod = '1d' | '1w' | '4w' | '1y'

type MarketLeaderStock = {
  name: string
  ticker: string
  price: number
  marketCap: number
  volume: number
  surge: number
  assetClass?: RankingTypeFilter
}

type RankingLeaderStock = MarketLeaderStock & {
  market: MarketMode
  rank: number
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            callback: (response: GoogleTokenResponse) => void
            client_id: string
            error_callback?: (error: { message?: string; type?: string }) => void
            scope: string
          }) => GoogleTokenClient
        }
      }
    }
  }
}

const navItems: NavItem[] = (
[
  { icon: <Search size={20} />, label: '관심주식 검색 / 저장', section: 'savedStocks' },
  { icon: <LayoutDashboard size={20} />, label: '대시보드', section: 'dashboard' },
  { icon: <Workflow size={20} />, label: '자동매매 전략', section: 'strategy' },
  { icon: <Trophy size={20} />, label: '관심 종목 전략 성과', section: 'strategyPerformance' },
  { icon: <BarChart3 size={20} />, label: '백테스팅', section: 'backtest' },
  { icon: <Radar size={20} />, label: '관심 급등주', section: 'watchlist' },
  { icon: <BadgeCheck size={20} />, label: '주문/체결', section: 'orders' },
  { icon: <BrainCircuit size={20} />, label: 'AI 추천', section: 'ai' },
  { icon: <Settings size={20} />, label: 'API 설정', section: 'api' },
  { icon: <ShieldCheck size={20} />, label: '안전장치', section: 'safety' },
] satisfies { icon: ReactNode; label: string; section: NavSection }[]
)

const navSectionIds: NavSection[] = [
  'savedStocks',
  'stockDetail',
  'dashboard',
  'strategy',
  'strategyPerformance',
  'backtest',
  'watchlist',
  'orders',
  'ai',
  'api',
  'safety',
]

const getHashParts = () =>
  typeof window === 'undefined'
    ? []
    : window.location.hash
        .replace(/^#/, '')
        .split('/')
        .map((part) => decodeURIComponent(part))
        .filter(Boolean)

const isNavSection = (value: string): value is NavSection =>
  navSectionIds.includes(value as NavSection)

const defaultNavOrder = navItems.map((item) => item.section)
const editableNavSections = new Set(defaultNavOrder)

const readStoredNavSections = (key: string, fallback: NavSection[] = []) => {
  if (typeof window === 'undefined') return fallback

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(parsed)) return fallback

    const uniqueSections = parsed.filter(
      (section, index): section is NavSection =>
        typeof section === 'string' &&
        editableNavSections.has(section as NavSection) &&
        parsed.indexOf(section) === index,
    )

    return uniqueSections.length > 0 ? uniqueSections : fallback
  } catch {
    return fallback
  }
}

const getStoredNavOrder = () => {
  const storedSections = readStoredNavSections(navOrderStorageKey)
  return [
    ...storedSections,
    ...defaultNavOrder.filter((section) => !storedSections.includes(section)),
  ]
}

const getInitialNavSection = (): NavSection => {
  if (typeof window === 'undefined') return 'dashboard'
  const [hashSection] = getHashParts()
  return isNavSection(hashSection) ? hashSection : 'dashboard'
}

const mobileTabSections: Record<MobileTab, NavSection> = {
  홈: 'dashboard',
  백테스트: 'backtest',
  관심: 'savedStocks',
  설정: 'api',
}

const aiProviders: AiProvider[] = [
  {
    id: 'local-codex',
    label: '로컬 Codex',
    description: '현재 Mac의 Codex 환경에서 로컬 분석',
    models: ['codex-local-default', 'gpt-5.5-codex', 'gpt-5.4-mini-fast'],
    logoUrl: 'https://cdn.simpleicons.org/openai/0B6BFF',
    logoFallback: 'Cx',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'OpenAI API로 전략 분석',
    models: ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'],
    logoUrl: 'https://cdn.simpleicons.org/openai/111827',
    logoFallback: 'OA',
  },
  {
    id: 'claude',
    label: 'Claude / Anthropic',
    description: 'Anthropic Claude API로 보조 분석',
    models: ['claude-sonnet-4.5', 'claude-opus-4.1', 'claude-haiku-4.5'],
    logoUrl: 'https://cdn.simpleicons.org/anthropic/111827',
    logoFallback: 'Cl',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    description: 'Google Gemini API로 교차 검토',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    logoUrl: 'https://cdn.simpleicons.org/googlegemini/4285F4',
    logoFallback: 'Gm',
  },
]

const marketPresets: Record<
  MarketMode,
  {
    label: string
    shortLabel: string
    flagIcon: string
    headline: string
    caption: string
    sampleNote: string
    primary: MarketStock
    watchList: MarketStock[]
    chartPoints: number[]
    logs: { time: string; title: string; detail: string }[]
  }
> = {
  kr: {
    label: '국장모드',
    shortLabel: '국장',
    flagIcon: '🇰🇷',
    headline: '한국장 급등주 모의 감시',
    caption: 'KRX 샘플 데이터 기준',
    sampleNote: '거래량이 평균 대비 312% 증가했어요. 실거래 전 모의 운용으로 검증하세요.',
    primary: {
      name: '한미반도체',
      price: '189,400원',
      change: '+7.84%',
      volume: '거래량 312%',
    },
    watchList: [
      { name: '한미반도체', price: '189,400원', change: '+7.84%', volume: '거래량 312%' },
      { name: '두산에너빌리티', price: '32,150원', change: '+4.18%', volume: '거래량 188%' },
      { name: 'SK하이닉스', price: '298,500원', change: '+2.92%', volume: '거래량 146%' },
    ],
    chartPoints: [42, 48, 44, 55, 62, 58, 72, 68, 78, 84, 80, 88],
    logs: [
      { time: '09:02:11', title: '국장 모의 운용 시작', detail: '한미반도체 전략 감시를 시작했어요.' },
      { time: '09:14:28', title: '+3% 조건 감지', detail: '모의 판매 10주 주문을 기록했어요.' },
      { time: '09:37:44', title: '거래량 급증', detail: '평균 대비 312% 구간을 통과했어요.' },
      { time: '10:06:19', title: '안전장치 정상', detail: '3단계 매수 기준과 허용 IP를 확인했어요.' },
    ],
  },
  us: {
    label: '미장모드',
    shortLabel: '미장',
    flagIcon: '🇺🇸',
    headline: '미국장 빅테크 모의 감시',
    caption: 'NASDAQ 샘플 데이터 기준',
    sampleNote: '프리마켓 강도와 거래량 흐름을 샘플로만 분석해요. 실제 주문은 연결하지 않습니다.',
    primary: {
      name: 'NVIDIA',
      price: '$142.83',
      change: '+3.41%',
      volume: '거래량 224%',
    },
    watchList: [
      { name: 'NVIDIA', price: '$142.83', change: '+3.41%', volume: '거래량 224%' },
      { name: 'Tesla', price: '$186.52', change: '+2.76%', volume: '거래량 171%' },
      { name: 'Microsoft', price: '$478.91', change: '+1.28%', volume: '거래량 132%' },
    ],
    chartPoints: [38, 45, 51, 48, 57, 63, 61, 69, 74, 71, 82, 86],
    logs: [
      { time: '22:31:04', title: '미장 모의 운용 시작', detail: 'NVIDIA 전략 감시를 시작했어요.' },
      { time: '22:46:22', title: '프리마켓 강도 확인', detail: '모의 추천 점수를 다시 계산했어요.' },
      { time: '23:08:39', title: '+3% 조건 근접', detail: '실제 주문 없이 알림만 기록했어요.' },
      { time: '23:22:11', title: '안전장치 정상', detail: '달러 종목도 모의 로그만 남기도록 유지했어요.' },
    ],
  },
}

const ruleRows = [
  { trigger: '+3%', action: '1단계 판매', quantity: '보유 20%', tone: 'rise' },
  { trigger: '+5%', action: '2단계 판매', quantity: '보유 30%', tone: 'rise' },
  { trigger: '+8%', action: '3단계 판매', quantity: '보유 50%', tone: 'rise' },
  { trigger: '-3%', action: '1단계 매수', quantity: '운용금 10%', tone: 'buy' },
  { trigger: '-6%', action: '2단계 매수', quantity: '운용금 15%', tone: 'buy' },
  { trigger: '-9%', action: '3단계 매수', quantity: '운용금 25%', tone: 'buy' },
]

const initialSavedStocks: SavedStock[] = [
  {
    id: 1,
    name: '한미반도체',
    ticker: '042700',
    market: 'kr',
    basePrice: 189400,
    quantity: 30,
    sellUp: 5,
    defenseDown: -4,
    stopLoss: -8,
    rebuyDown: -12,
    targetReturn: 6.5,
    note: '거래량 급증 시 분할판매 우선',
  },
  {
    id: 2,
    name: 'NVIDIA',
    ticker: 'NVDA',
    market: 'us',
    basePrice: 142.83,
    quantity: 20,
    sellUp: 4,
    defenseDown: -3,
    stopLoss: -7,
    rebuyDown: -10,
    targetReturn: 5.2,
    note: '프리마켓 강도 확인 후 모의 진입',
  },
]

const tossRankingSeeds: TossRankingStock[] = [
  {
    rank: 1,
    name: '한미반도체',
    ticker: '042700',
    market: 'kr',
    price: '189,400원',
    change: '+7.84%',
    volume: '거래량 312%',
    reason: '거래량과 상승률이 동시에 높아 단기 변동성이 커요.',
  },
  {
    rank: 2,
    name: '두산에너빌리티',
    ticker: '034020',
    market: 'kr',
    price: '32,150원',
    change: '+4.18%',
    volume: '거래량 188%',
    reason: '장중 매수세가 강하지만 손절 기준을 짧게 잡아야 해요.',
  },
  {
    rank: 3,
    name: 'SK하이닉스',
    ticker: '000660',
    market: 'kr',
    price: '298,500원',
    change: '+2.92%',
    volume: '거래량 146%',
    reason: '상승폭은 낮지만 거래대금 안정성이 좋아요.',
  },
  {
    rank: 4,
    name: 'NVIDIA',
    ticker: 'NVDA',
    market: 'us',
    price: '$142.83',
    change: '+3.41%',
    volume: '거래량 224%',
    reason: '미장 샘플 기준 프리마켓 강도가 가장 높아요.',
  },
]

const stockSearchSeeds: TossRankingStock[] = [
  ...tossRankingSeeds,
  {
    rank: 5,
    name: '삼성전자',
    ticker: '005930',
    market: 'kr',
    price: '72,300원',
    change: '+1.22%',
    volume: '거래량 118%',
    reason: '대형주 안정성과 거래대금이 높아 기준 전략 테스트에 적합해요.',
  },
  {
    rank: 6,
    name: '현대차',
    ticker: '005380',
    market: 'kr',
    price: '264,500원',
    change: '+2.05%',
    volume: '거래량 139%',
    reason: '장중 변동폭이 뚜렷해 분할판매 조건을 확인하기 좋아요.',
  },
  {
    rank: 7,
    name: 'Tesla',
    ticker: 'TSLA',
    market: 'us',
    price: '$186.52',
    change: '+2.76%',
    volume: '거래량 171%',
    reason: '변동성이 커서 상승/하락 방어 전략 검증에 적합해요.',
  },
  {
    rank: 8,
    name: 'Apple',
    ticker: 'AAPL',
    market: 'us',
    price: '$214.18',
    change: '+1.04%',
    volume: '거래량 126%',
    reason: '추세가 완만해 보수형 전략 비교 대상으로 좋아요.',
  },
  {
    rank: 9,
    name: 'Microsoft',
    ticker: 'MSFT',
    market: 'us',
    price: '$478.91',
    change: '+1.28%',
    volume: '거래량 132%',
    reason: '상대적으로 안정적인 미장 대형주 시나리오를 만들 수 있어요.',
  },
  {
    rank: 10,
    name: 'SOXL 반도체 3배 ETF',
    ticker: 'SOXL',
    market: 'us',
    price: '시세 확인 필요',
    change: '변동률 확인 필요',
    volume: 'ETF 검색',
    reason: 'Direxion Daily Semiconductor Bull 3X Shares입니다. 외부 검색이 막혀도 바로 저장할 수 있어요.',
  },
]

const usdKrwRate = 1380

const defaultStrategyStages: StrategyStage[] = [
  { id: 'rise-1', label: '상승판매 1단계', trigger: 3, quantityPercent: 20, type: 'rise-sell', enabled: true },
  { id: 'rise-2', label: '상승판매 2단계', trigger: 5, quantityPercent: 30, type: 'rise-sell', enabled: true },
  { id: 'rise-3', label: '상승판매 3단계', trigger: 8, quantityPercent: 50, type: 'rise-sell', enabled: true },
  { id: 'dip-buy-1', label: '하락매수 1단계', trigger: -3, quantityPercent: 10, type: 'dip-buy', enabled: true },
  { id: 'dip-buy-2', label: '하락매수 2단계', trigger: -6, quantityPercent: 15, type: 'dip-buy', enabled: true },
  { id: 'dip-buy-3', label: '하락매수 3단계', trigger: -9, quantityPercent: 25, type: 'dip-buy', enabled: true },
  { id: 'dip-sell-1', label: '하락매도 1단계', trigger: -5, quantityPercent: 20, type: 'dip-sell', enabled: false },
  { id: 'dip-sell-2', label: '하락매도 2단계', trigger: -8, quantityPercent: 30, type: 'dip-sell', enabled: false },
  { id: 'crash-full-sell', label: '급락 전량매도', trigger: -12, quantityPercent: 100, type: 'crash-full-sell', enabled: false },
  {
    id: 'post-full-sell-reentry',
    label: '전량매도 후 하락 전량매수',
    trigger: -5,
    quantityPercent: 100,
    type: 'post-full-sell-reentry',
    enabled: false,
  },
]

const analysisPeriodOptions: { id: AnalysisPeriod; label: string; multiplier: number }[] = [
  { id: '1d', label: '이전 1일', multiplier: 1 },
  { id: '1w', label: '이전 1주일', multiplier: 0.92 },
  { id: '4w', label: '이전 4주', multiplier: 0.84 },
  { id: '1y', label: '이전 1년', multiplier: 0.72 },
]

const rankingCategoryLabels: Record<RankingCategory, string> = {
  marketCap: '시총',
  volume: '거래량',
  surge: '급등순위',
}

const rankingTypeFilterLabels: Record<RankingTypeFilter, string> = {
  all: '전체',
  stock: '주식',
  etf: 'ETF',
}
const rankingViewOptions: {
  id: 'marketCap' | 'volume' | 'rise' | 'fall'
  label: string
  category: RankingCategory
  direction: RankingSortDirection
}[] = [
  { id: 'marketCap', label: '시총', category: 'marketCap', direction: 'desc' },
  { id: 'volume', label: '거래량', category: 'volume', direction: 'desc' },
  { id: 'rise', label: '상승', category: 'surge', direction: 'desc' },
  { id: 'fall', label: '하락', category: 'surge', direction: 'asc' },
]

const marketLeaderSeeds: Record<
  MarketMode,
  MarketLeaderStock[]
> = {
  kr: [
    { name: '삼성전자', ticker: '005930', price: 72300, marketCap: 431, volume: 128, surge: 1.22 },
    { name: 'SK하이닉스', ticker: '000660', price: 298500, marketCap: 217, volume: 146, surge: 2.92 },
    { name: 'LG에너지솔루션', ticker: '373220', price: 365000, marketCap: 85, volume: 112, surge: 1.84 },
    { name: '삼성바이오로직스', ticker: '207940', price: 862000, marketCap: 61, volume: 91, surge: 0.72 },
    { name: '현대차', ticker: '005380', price: 264500, marketCap: 55, volume: 139, surge: 2.05 },
    { name: '기아', ticker: '000270', price: 118400, marketCap: 47, volume: 132, surge: 1.64 },
    { name: '셀트리온', ticker: '068270', price: 184200, marketCap: 40, volume: 121, surge: 2.44 },
    { name: 'NAVER', ticker: '035420', price: 192800, marketCap: 31, volume: 116, surge: 1.18 },
    { name: 'KB금융', ticker: '105560', price: 92800, marketCap: 36, volume: 154, surge: 3.02 },
    { name: '한미반도체', ticker: '042700', price: 189400, marketCap: 18, volume: 312, surge: 7.84 },
    { name: '두산에너빌리티', ticker: '034020', price: 32150, marketCap: 20, volume: 188, surge: 4.18 },
    { name: '삼성SDI', ticker: '006400', price: 278000, marketCap: 19, volume: 126, surge: 2.38 },
    { name: '포스코홀딩스', ticker: '005490', price: 389500, marketCap: 32, volume: 118, surge: 1.72 },
    { name: '카카오', ticker: '035720', price: 47200, marketCap: 21, volume: 144, surge: 2.86 },
    { name: 'HD현대중공업', ticker: '329180', price: 164300, marketCap: 14, volume: 177, surge: 5.42 },
    { name: '알테오젠', ticker: '196170', price: 274500, marketCap: 15, volume: 206, surge: 6.22 },
    { name: '에코프로비엠', ticker: '247540', price: 156700, marketCap: 15, volume: 174, surge: 4.64 },
    { name: '레인보우로보틱스', ticker: '277810', price: 183200, marketCap: 3.5, volume: 268, surge: 8.12 },
    { name: 'LS ELECTRIC', ticker: '010120', price: 214000, marketCap: 6.4, volume: 231, surge: 6.88 },
    { name: '현대로템', ticker: '064350', price: 48200, marketCap: 5.3, volume: 219, surge: 5.96 },
    { name: '삼성물산', ticker: '028260', price: 152800, marketCap: 27, volume: 108, surge: 1.36 },
    { name: '신한지주', ticker: '055550', price: 57400, marketCap: 29, volume: 141, surge: 2.28 },
    { name: 'LG화학', ticker: '051910', price: 344000, marketCap: 24, volume: 119, surge: 1.58 },
    { name: '삼성생명', ticker: '032830', price: 96200, marketCap: 19, volume: 102, surge: 0.86 },
    { name: '하나금융지주', ticker: '086790', price: 64500, marketCap: 18, volume: 153, surge: 2.74 },
    { name: '메리츠금융지주', ticker: '138040', price: 92300, marketCap: 17, volume: 137, surge: 2.16 },
    { name: 'HMM', ticker: '011200', price: 19840, marketCap: 13, volume: 196, surge: 4.08 },
    { name: '한국전력', ticker: '015760', price: 23850, marketCap: 15, volume: 162, surge: 3.44 },
    { name: 'KT&G', ticker: '033780', price: 104200, marketCap: 14, volume: 111, surge: 1.18 },
    { name: '크래프톤', ticker: '259960', price: 286000, marketCap: 13.8, volume: 166, surge: 3.86 },
  ],
  us: [
    { name: '엔비디아', ticker: 'NVDA', price: 142.83, marketCap: 3510, volume: 224, surge: 3.41 },
    { name: '마이크로소프트', ticker: 'MSFT', price: 478.91, marketCap: 3560, volume: 132, surge: 1.28 },
    { name: '애플', ticker: 'AAPL', price: 214.18, marketCap: 3290, volume: 126, surge: 1.04 },
    { name: '아마존', ticker: 'AMZN', price: 187.34, marketCap: 1950, volume: 148, surge: 1.86 },
    { name: '알파벳', ticker: 'GOOGL', price: 178.72, marketCap: 2190, volume: 117, surge: 1.33 },
    { name: '메타', ticker: 'META', price: 512.66, marketCap: 1300, volume: 139, surge: 2.42 },
    { name: '브로드컴', ticker: 'AVGO', price: 1764.25, marketCap: 820, volume: 161, surge: 3.24 },
    { name: '테슬라', ticker: 'TSLA', price: 186.52, marketCap: 595, volume: 171, surge: 2.76 },
    { name: '일라이 릴리', ticker: 'LLY', price: 884.2, marketCap: 840, volume: 104, surge: 1.12 },
    { name: 'JP모건', ticker: 'JPM', price: 221.78, marketCap: 615, volume: 122, surge: 0.92 },
    { name: '넷플릭스', ticker: 'NFLX', price: 681.18, marketCap: 293, volume: 154, surge: 3.64 },
    { name: 'AMD', ticker: 'AMD', price: 163.84, marketCap: 265, volume: 188, surge: 4.18 },
    { name: '팔란티어', ticker: 'PLTR', price: 73.48, marketCap: 166, volume: 244, surge: 5.38 },
    { name: '마이크론', ticker: 'MU', price: 141.32, marketCap: 157, volume: 211, surge: 4.92 },
    { name: '슈퍼마이크로', ticker: 'SMCI', price: 52.86, marketCap: 31, volume: 285, surge: 6.14 },
    { name: '코인베이스', ticker: 'COIN', price: 262.71, marketCap: 65, volume: 198, surge: 4.74 },
    { name: '로빈후드', ticker: 'HOOD', price: 45.36, marketCap: 40, volume: 236, surge: 5.86 },
    { name: '암 홀딩스', ticker: 'ARM', price: 151.24, marketCap: 158, volume: 173, surge: 4.28 },
    { name: '스노우플레이크', ticker: 'SNOW', price: 146.19, marketCap: 49, volume: 184, surge: 3.92 },
    { name: '마벨', ticker: 'MRVL', price: 88.77, marketCap: 77, volume: 192, surge: 4.36 },
    { name: '버크셔해서웨이', ticker: 'BRK.B', price: 415.38, marketCap: 895, volume: 96, surge: 0.64 },
    { name: '비자', ticker: 'V', price: 276.44, marketCap: 540, volume: 101, surge: 0.82 },
    { name: '마스터카드', ticker: 'MA', price: 462.18, marketCap: 430, volume: 99, surge: 0.76 },
    { name: '엑슨모빌', ticker: 'XOM', price: 115.64, marketCap: 510, volume: 145, surge: 1.72 },
    { name: '월마트', ticker: 'WMT', price: 68.36, marketCap: 550, volume: 128, surge: 1.18 },
    { name: '오라클', ticker: 'ORCL', price: 141.72, marketCap: 395, volume: 151, surge: 2.48 },
    { name: '퀄컴', ticker: 'QCOM', price: 211.45, marketCap: 235, volume: 176, surge: 3.18 },
    { name: '어도비', ticker: 'ADBE', price: 518.9, marketCap: 230, volume: 133, surge: 2.06 },
    { name: '인텔', ticker: 'INTC', price: 31.28, marketCap: 132, volume: 205, surge: 3.74 },
    { name: '우버', ticker: 'UBER', price: 72.64, marketCap: 151, volume: 189, surge: 4.02 },
    { name: 'SOXL 반도체 3배 ETF', ticker: 'SOXL', price: 42.16, marketCap: 12, volume: 326, surge: 5.12, assetClass: 'etf' },
  ],
}

const getLeaderStockRank = (market: MarketMode, ticker: string) =>
  marketLeaderSeeds[market].findIndex((stock) => normalizeTicker(stock.ticker) === normalizeTicker(ticker)) + 1

const getRankingAssetClass = (stock: Pick<MarketLeaderStock, 'assetClass'>): Exclude<RankingTypeFilter, 'all'> =>
  stock.assetClass === 'etf' ? 'etf' : 'stock'

const findLeaderStock = (market: MarketMode, ticker: string): RankingLeaderStock | null => {
  const stock = marketLeaderSeeds[market].find(
    (candidate) => normalizeTicker(candidate.ticker) === normalizeTicker(ticker),
  )
  if (!stock) return null
  return {
    ...stock,
    market,
    rank: Math.max(1, getLeaderStockRank(market, ticker)),
  }
}

const getDetailStockFromHash = (): RankingLeaderStock | null => {
  const [section, market, ticker] = getHashParts()
  if (section !== 'stockDetail' || (market !== 'kr' && market !== 'us') || !ticker) return null
  return findLeaderStock(market, ticker)
}

const intradayTimes = [
  '09:00',
  '09:20',
  '09:40',
  '10:00',
  '10:30',
  '11:00',
  '11:20',
  '12:10',
  '13:10',
  '13:40',
  '14:05',
  '14:20',
  '14:40',
  '15:00',
  '15:20',
]
const intradayMultipliers = [
  0,
  0.012,
  0.024,
  0.041,
  0.052,
  0.036,
  -0.018,
  -0.034,
  0.074,
  0.051,
  -0.052,
  -0.086,
  -0.124,
  -0.064,
  0.032,
]

const financeApiBase = '/finance-api'
const eodhdApiBase = '/eodhd-api'
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
const allowedGoogleEmailHash =
  import.meta.env.VITE_ALLOWED_GOOGLE_EMAIL_SHA256?.trim().toLowerCase() ??
  '4d3ed7dc96e4a968289760f0c4a3ed251ca3fe9817861c665d8501d807beb7b9'
const authStorageKey = 'super-toss-google-session'
const navOrderStorageKey = 'super-toss-nav-order-v1'
const navFavoriteStorageKey = 'super-toss-nav-favorites-v1'
const sidebarHiddenStorageKey = 'super-toss-sidebar-hidden-v1'
const marketTimeZones: Record<MarketMode, string> = {
  kr: 'Asia/Seoul',
  us: 'America/New_York',
}
const marketSessionConfigs: MarketSessionConfig[] = [
  {
    id: 'kr',
    label: '한국장',
    marketLabel: '코스피·코스닥',
    timeZone: 'Asia/Seoul',
    openHour: 9,
    openMinute: 0,
    closeHour: 15,
    closeMinute: 30,
  },
  {
    id: 'us',
    label: '미장',
    marketLabel: '나스닥·NYSE',
    timeZone: 'America/New_York',
    openHour: 9,
    openMinute: 30,
    closeHour: 16,
    closeMinute: 0,
  },
]
const weekdayNames = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
const searchAliases: Record<string, string> = {
  테슬라: 'tesla',
  엔비디아: 'nvidia',
  애플: 'apple',
  마이크로소프트: 'microsoft',
  속슬: 'SOXL',
  '반도체 3배': 'SOXL',
  '미국 반도체 3배': 'SOXL',
  삼성전자: 'samsung electronics',
  현대차: 'hyundai motor',
  하이닉스: 'sk hynix',
  한미반도체: 'hanmi semiconductor',
}
const searchableYahooQuoteTypes = new Set(['EQUITY', 'ETF'])

const toNumber = (value: string | number) =>
  typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''))

const padTimeUnit = (value: number) => String(value).padStart(2, '0')

const getZonedParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value
      return acc
    }, {})

  return {
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    month: Number(parts.month),
    second: Number(parts.second),
    year: Number(parts.year),
  }
}

const getZonedWeekday = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date)

const getDateInTimeZone = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) => {
  let date = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))

  for (let index = 0; index < 3; index += 1) {
    const zoned = getZonedParts(date, timeZone)
    const targetTime = Date.UTC(year, month - 1, day, hour, minute, 0)
    const zonedTime = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second)
    date = new Date(date.getTime() + targetTime - zonedTime)
  }

  return date
}

const addCalendarDays = (year: number, month: number, day: number, days: number) => {
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  }
}

const isTradingWeekday = (year: number, month: number, day: number, timeZone: string) => {
  const noon = getDateInTimeZone(year, month, day, 12, 0, timeZone)
  return weekdayNames.has(getZonedWeekday(noon, timeZone))
}

const getNextTradingDate = (year: number, month: number, day: number, timeZone: string) => {
  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = addCalendarDays(year, month, day, offset)
    if (isTradingWeekday(candidate.year, candidate.month, candidate.day, timeZone)) return candidate
  }

  return addCalendarDays(year, month, day, 1)
}

const formatCountdown = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const clock = `${padTimeUnit(hours)}:${padTimeUnit(minutes)}:${padTimeUnit(seconds)}`

  return days > 0 ? `${days}일 ${clock}` : clock
}

const formatMarketDateLabel = (
  date: Pick<ReturnType<typeof addCalendarDays>, 'year' | 'month' | 'day'>,
  timeZone: string,
) => {
  const noon = getDateInTimeZone(date.year, date.month, date.day, 12, 0, timeZone)
  const weekday = new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    weekday: 'short',
  }).format(noon)

  return `다음 개장일 ${date.month}.${date.day}(${weekday})`
}

const getMarketSessionInfo = (now: Date, config: MarketSessionConfig): MarketSessionInfo => {
  const zoned = getZonedParts(now, config.timeZone)
  const todayOpen = getDateInTimeZone(
    zoned.year,
    zoned.month,
    zoned.day,
    config.openHour,
    config.openMinute,
    config.timeZone,
  )
  const todayClose = getDateInTimeZone(
    zoned.year,
    zoned.month,
    zoned.day,
    config.closeHour,
    config.closeMinute,
    config.timeZone,
  )
  const isTodayTradingDay = isTradingWeekday(zoned.year, zoned.month, zoned.day, config.timeZone)
  const openTimeLabel = `${padTimeUnit(config.openHour)}:${padTimeUnit(config.openMinute)}`
  const closeTimeLabel = `${padTimeUnit(config.closeHour)}:${padTimeUnit(config.closeMinute)}`
  const timeLabel = `${config.marketLabel ? `${config.marketLabel} · ` : ''}${openTimeLabel}-${closeTimeLabel}`

  if (isTodayTradingDay && now >= todayOpen && now <= todayClose) {
    const nextTradingDate = getNextTradingDate(zoned.year, zoned.month, zoned.day + 1, config.timeZone)

    return {
      id: config.id,
      label: config.label,
      status: 'open',
      actionLabel: '마감까지',
      countdown: formatCountdown(todayClose.getTime() - now.getTime()),
      nextOpenLabel: formatMarketDateLabel(nextTradingDate, config.timeZone),
      timeLabel,
    }
  }

  const nextTradingDate =
    isTodayTradingDay && now < todayOpen
      ? { day: zoned.day, month: zoned.month, year: zoned.year }
      : getNextTradingDate(zoned.year, zoned.month, zoned.day + 1, config.timeZone)
  const nextOpen = getDateInTimeZone(
    nextTradingDate.year,
    nextTradingDate.month,
    nextTradingDate.day,
    config.openHour,
    config.openMinute,
    config.timeZone,
  )

  return {
    id: config.id,
    label: config.label,
    status: 'closed',
    actionLabel: '개장까지',
    countdown: formatCountdown(nextOpen.getTime() - now.getTime()),
    nextOpenLabel: formatMarketDateLabel(nextTradingDate, config.timeZone),
    timeLabel,
  }
}

const formatSeoulDate = (date: Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    year: 'numeric',
  }).format(date)

const formatSeoulDigitalTime = (date: Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(date)

const normalizeTicker = (ticker: string) => ticker.trim().toUpperCase()

const getStockKey = (stock: Pick<SavedStock, 'market' | 'ticker'>) =>
  `${stock.market}:${normalizeTicker(stock.ticker)}`

const hasSavedStock = (
  stocks: SavedStock[],
  stock: Pick<SavedStock, 'market' | 'ticker'>,
) => stocks.some((savedStock) => getStockKey(savedStock) === getStockKey(stock))

const getSearchTerm = (query: string) => searchAliases[query.trim().toLowerCase()] ?? query.trim()

const toYahooSymbol = (stock: Pick<SavedStock, 'market' | 'ticker'>) => {
  const ticker = stock.ticker.trim().toUpperCase()
  if (stock.market === 'us') return ticker
  if (ticker.includes('.')) return ticker
  return `${ticker}.KS`
}

const toEodhdSymbol = (stock: Pick<SavedStock, 'market' | 'ticker'>) => {
  const ticker = stock.ticker.trim().toUpperCase()
  if (stock.market === 'us') return `${ticker}.US`
  if (ticker.includes('.')) return ticker
  return `${ticker}.KO`
}

const toMarketDate = (timestampSeconds: number, market: MarketMode) =>
  new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: marketTimeZones[market],
    year: 'numeric',
  }).format(new Date(timestampSeconds * 1000))

const toMarketTime = (timestampSeconds: number, market: MarketMode) =>
  new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: marketTimeZones[market],
  }).format(new Date(timestampSeconds * 1000))

const getUnixRangeForDate = (date: string) => {
  const start = new Date(`${date}T00:00:00Z`).getTime() / 1000
  const day = 24 * 60 * 60
  return {
    period1: Math.floor(start - day),
    period2: Math.floor(start + day * 2),
  }
}

const getChangeLabel = (change?: number) => {
  if (typeof change !== 'number' || Number.isNaN(change)) return '변동률 확인 필요'
  return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
}

const getPriceLabel = (price: number | undefined, market: MarketMode) => {
  if (typeof price !== 'number' || Number.isNaN(price)) return '시세 확인 필요'
  return formatCurrency(price, market)
}

const inferMarketFromYahooQuote = (quote: YahooSearchQuote): MarketMode | null => {
  const symbol = quote.symbol ?? ''
  const exchange = `${quote.exchange ?? ''} ${quote.exchDisp ?? ''}`.toUpperCase()
  if (symbol.endsWith('.KS') || symbol.endsWith('.KQ') || exchange.includes('KSE') || exchange.includes('KOSDAQ')) {
    return 'kr'
  }
  if (
    ['NMS', 'NYQ', 'ASE', 'NCM', 'NGM', 'PCX', 'NASDAQ', 'NYSE', 'AMEX', 'ARCA', 'NYSEARCA', 'BATS'].some((name) =>
      exchange.includes(name),
    )
  ) {
    return 'us'
  }
  return null
}

const normalizeYahooQuote = (quote: YahooSearchQuote, rank: number): TossRankingStock | null => {
  if (!quote.symbol || !searchableYahooQuoteTypes.has((quote.quoteType ?? '').toUpperCase())) return null
  const market = inferMarketFromYahooQuote(quote)
  if (!market) return null
  const ticker = market === 'kr' ? quote.symbol.replace(/\.(KS|KQ)$/i, '') : quote.symbol
  return {
    rank,
    name: quote.longname ?? quote.shortname ?? ticker,
    ticker,
    market,
    price: getPriceLabel(quote.regularMarketPrice, market),
    change: getChangeLabel(quote.regularMarketChangePercent),
    volume: 'Yahoo 검색',
    reason: `${quote.exchDisp ?? quote.exchange ?? 'Yahoo Finance'}에서 검색된 실제 종목입니다.`,
  }
}

const mergeSearchResults = (localResults: TossRankingStock[], remoteResults: TossRankingStock[]) => {
  const seen = new Set<string>()
  return [...localResults, ...remoteResults]
    .filter((stock) => {
      const key = `${stock.market}-${stock.ticker}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 6)
}

const formatCurrency = (value: number, market: MarketMode) =>
  market === 'kr'
    ? `${Math.round(value).toLocaleString('ko-KR')}원`
    : `$${value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`

const formatKrwApprox = (value: number, market: MarketMode) =>
  market === 'us' ? `약 ${Math.round(value * usdKrwRate).toLocaleString('ko-KR')}원` : formatCurrency(value, market)

const formatCurrencyWithKrw = (value: number, market: MarketMode) =>
  market === 'us' ? `${formatCurrency(value, market)} / ${formatKrwApprox(value, market)}` : formatCurrency(value, market)

const convertCurrencyValue = (value: number, sourceMarket: MarketMode, displayCurrency: DisplayCurrency) => {
  if (displayCurrency === 'krw') return sourceMarket === 'us' ? value * usdKrwRate : value
  return sourceMarket === 'kr' ? value / usdKrwRate : value
}

const formatCurrencyForDisplay = (value: number, sourceMarket: MarketMode, displayCurrency: DisplayCurrency) => {
  const convertedValue = convertCurrencyValue(value, sourceMarket, displayCurrency)

  return displayCurrency === 'krw'
    ? `${Math.round(convertedValue).toLocaleString('ko-KR')}원`
    : `$${convertedValue.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
}

const formatSignedCurrencyForDisplay = (value: number, sourceMarket: MarketMode, displayCurrency: DisplayCurrency) =>
  `${value >= 0 ? '+' : '-'}${formatCurrencyForDisplay(Math.abs(value), sourceMarket, displayCurrency)}`

const cloneDefaultStrategyStages = () => defaultStrategyStages.map((stage) => ({ ...stage }))

const normalizeStrategyStages = (stages: StrategyStage[] = []) => {
  const byId = new Map(stages.map((stage) => [stage.id, stage]))

  return defaultStrategyStages.map((defaultStage) => ({
    ...defaultStage,
    ...byId.get(defaultStage.id),
    enabled: byId.get(defaultStage.id)?.enabled ?? defaultStage.enabled ?? true,
  }))
}

const dipBuyReserveRate =
  defaultStrategyStages
    .filter((stage) => stage.type === 'dip-buy' && stage.enabled !== false)
    .reduce((total, stage) => total + stage.quantityPercent, 0) / 100

const initialPositionRate = 1 / (1 + dipBuyReserveRate)

const getBacktestCapitalFromPosition = (price: number, quantity: number) =>
  price * quantity * (1 + dipBuyReserveRate)

const getBacktestQuantityFromCapital = (capital: number, price: number) =>
  Math.max(1, Math.floor((capital * initialPositionRate) / price))

const getRiseSellTriggers = (firstTrigger: number) => [
  firstTrigger,
  firstTrigger + 2,
  firstTrigger + 5,
]

const getStrategyStagesForStock = (stock: SavedStock) => {
  const riseSellTriggers = getRiseSellTriggers(stock.sellUp)

  return normalizeStrategyStages(cloneDefaultStrategyStages()).map((stage) => {
    if (stage.id === 'rise-1') return { ...stage, trigger: riseSellTriggers[0] }
    if (stage.id === 'rise-2') return { ...stage, trigger: riseSellTriggers[1] }
    if (stage.id === 'rise-3') return { ...stage, trigger: riseSellTriggers[2] }
    if (stage.id === 'dip-buy-1') return { ...stage, trigger: stock.defenseDown }
    if (stage.id === 'dip-buy-2') return { ...stage, trigger: stock.stopLoss }
    if (stage.id === 'dip-buy-3') return { ...stage, trigger: stock.rebuyDown }
    return stage
  })
}

const getStrategyStageTone = (stage: StrategyStage): BacktestStrategyLevel['tone'] => {
  if (stage.type === 'dip-buy') return stage.quantityPercent >= 100 ? 'full-buy' : 'buy'
  if (stage.type === 'post-full-sell-reentry') return 'reentry-buy'
  if (stage.type === 'crash-full-sell') return 'full-sell'
  return stage.quantityPercent >= 100 ? 'full-sell' : 'sell'
}

const getStrategyStageGroup = (stage: StrategyStage) => {
  if (stage.type === 'rise-sell') return '상승 매도'
  if (stage.type === 'dip-buy') return '하락 매수'
  if (stage.type === 'dip-sell') return '하락 매도'
  if (stage.type === 'post-full-sell-reentry') return '재진입 전량매수'
  return '급락 전량매도'
}

const sortExecutableStages = (stages: StrategyStage[]) =>
  [...stages].sort((left, right) => {
    const priority = (stage: StrategyStage) => {
      if (stage.type === 'crash-full-sell') return 0
      if (stage.type === 'rise-sell') return 1
      if (stage.type === 'dip-sell') return 2
      if (stage.type === 'post-full-sell-reentry') return 4
      return 3
    }

    return priority(left) - priority(right)
  })

const getStrategyStageTypeLabel = (stage: StrategyStage) => {
  if (stage.type === 'rise-sell') return '상승 매도'
  if (stage.type === 'dip-buy') return '하락 매수'
  if (stage.type === 'dip-sell') return '하락 매도'
  if (stage.type === 'post-full-sell-reentry') return '재진입 전량매수'
  return '급락 전량매도'
}

const getStrategyStageStep = (stage: StrategyStage) => {
  const match = stage.id.match(/-(\d+)$/)
  return match ? Number(match[1]) : 0
}

const getStrategyStageShortLabel = (stage: StrategyStage) => {
  const step = getStrategyStageStep(stage)
  if (stage.type === 'rise-sell') return `${step || 1}차 매도`
  if (stage.type === 'dip-buy') return `${step || 1}차 매수`
  if (stage.type === 'dip-sell') return `${step || 1}차 하락매도`
  if (stage.type === 'post-full-sell-reentry') return '재매수'
  return '급락매도'
}

const canEditStrategyStageQuantity = (stage: StrategyStage) =>
  stage.type !== 'crash-full-sell' && stage.type !== 'post-full-sell-reentry'

const getStrategyStageTriggerLabel = (stage: StrategyStage) =>
  stage.type === 'rise-sell'
    ? '상승률 %'
    : stage.type === 'crash-full-sell'
      ? '급락률 %'
      : stage.type === 'post-full-sell-reentry'
        ? '재진입 하락률 %'
        : '하락률 %'

const getStrategyStageQuantityLabel = (stage: StrategyStage) =>
  stage.type === 'dip-buy'
    ? '운용금 %'
    : stage.type === 'crash-full-sell' || stage.type === 'post-full-sell-reentry'
      ? '전량'
      : '수량 %'

const getSavedStockStrategyStages = (stock: SavedStock) =>
  normalizeStrategyStages(stock.strategyStages ?? getStrategyStagesForStock(stock))

const buildBacktestFormForStock = (stock: SavedStock, date: string): BacktestForm => ({
  date,
  stockId: String(stock.id),
  initialCapital: getBacktestCapitalFromPosition(stock.basePrice, stock.quantity),
  startPrice: stock.basePrice,
  quantity: stock.quantity,
  sellUp: stock.sellUp,
  defenseDown: stock.defenseDown,
  stopLoss: stock.stopLoss,
  rebuyDown: stock.rebuyDown,
  stages: getSavedStockStrategyStages(stock),
})

const buildStrategyPerformanceRow = (stock: SavedStock, date: string): StrategyPerformanceRow => {
  if (!Number.isFinite(stock.basePrice) || stock.basePrice <= 0 || !Number.isFinite(stock.quantity) || stock.quantity <= 0) {
    return {
      id: stock.id,
      name: stock.name,
      ticker: stock.ticker,
      status: '가격/수량 확인 필요',
      dailyProfitRate: 0,
      dailyProfit: 0,
      cumulativeProfitRate: 0,
      cumulativeProfit: 0,
      currentValue: 0,
      totalBuyAmount: 0,
      holdingQuantity: 0,
      lastTradeDate: date,
      lastSignal: '데이터 없음',
      market: stock.market,
      isUnavailable: true,
    }
  }

  const form = buildBacktestFormForStock(stock, date)
  const result = buildBacktestResult(stock, form, date)
  const firstPoint = result.simulationPoints[0]
  const lastAction = result.actions[result.actions.length - 1]
  const buyAmountFromSignals = result.actions
    .filter((action) => action.tone === 'buy' || action.tone === 'full-buy')
    .reduce((total, action) => total + action.price * action.quantity, 0)
  const totalBuyAmount = stock.basePrice * stock.quantity + buyAmountFromSignals
  const dailyBaseValue = firstPoint?.portfolioValue ?? result.startCapital
  const dailyProfit = result.finalCapital - dailyBaseValue

  return {
    id: stock.id,
    name: stock.name,
    ticker: stock.ticker,
    status: result.dataWarning ? '샘플/보정 데이터' : '계산 완료',
    dailyProfitRate: dailyBaseValue > 0 ? (dailyProfit / dailyBaseValue) * 100 : 0,
    dailyProfit,
    cumulativeProfitRate: result.profitRate,
    cumulativeProfit: result.profit,
    currentValue: result.finalCapital,
    totalBuyAmount,
    holdingQuantity: result.remainingQuantity,
    lastTradeDate: date,
    lastSignal: lastAction?.title ?? '신호 없음',
    market: stock.market,
  }
}

const leaderToSavedStock = (
  stock: MarketLeaderStock,
  market: MarketMode,
  id = Date.now(),
): SavedStock => ({
  id,
  name: stock.name,
  ticker: stock.ticker,
  market,
  basePrice: stock.price,
  quantity: market === 'kr' ? 20 : 10,
  sellUp: Math.max(3, Math.round(stock.surge * 0.75)),
  defenseDown: stock.surge >= 5 ? -5 : -3,
  stopLoss: -8,
  rebuyDown: -12,
  targetReturn: Math.max(4, Math.round(stock.surge)),
  note: `${rankingCategoryLabels.surge} 기준 상승률 ${stock.surge.toFixed(2)}%, 거래량 ${stock.volume}%`,
})

const buildDetailChartPoints = (stock: MarketLeaderStock) => {
  const base = Math.max(20, Math.min(78, 42 + stock.surge * 4))
  return Array.from({ length: 12 }, (_, index) => {
    const wave = Math.sin((index + 1) * 0.9) * 7
    const trend = index * Math.max(0.8, stock.surge / 5)
    return Math.max(18, Math.min(96, Math.round(base + wave + trend - 8)))
  })
}

const hashText = async (value: string) => {
  const bytes = new TextEncoder().encode(value)
  const digest = await window.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

const fetchGoogleUserInfo = async (accessToken: string): Promise<GoogleUserInfo> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Google 계정 정보를 확인하지 못했습니다.')
  }

  return response.json() as Promise<GoogleUserInfo>
}

const readStoredSession = (): SuperTossSession | null => {
  try {
    const stored = window.localStorage.getItem(authStorageKey)
    if (!stored) return null
    const session = JSON.parse(stored) as SuperTossSession
    if (
      session.emailHash !== allowedGoogleEmailHash ||
      !session.expiresAt ||
      session.expiresAt <= Date.now()
    ) {
      window.localStorage.removeItem(authStorageKey)
      return null
    }
    return session
  } catch {
    window.localStorage.removeItem(authStorageKey)
    return null
  }
}

const writeSession = (session: SuperTossSession) => {
  window.localStorage.setItem(authStorageKey, JSON.stringify(session))
}

const parseChartResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`시세 API 응답 실패 (${response.status})`)
  }

  const data = await response.json()
  const result = data?.chart?.result?.[0]
  if (!result) {
    throw new Error(data?.chart?.error?.description ?? '시세 데이터가 없습니다.')
  }

  return result
}

const buildDailyOhlcPath = (
  stock: SavedStock,
  date: string,
  open: number,
  high: number,
  low: number,
  close: number,
  source: string,
  warning: string,
): HistoricalPricePath => {
  const isUpDay = close >= open
  const times = stock.market === 'kr' ? ['09:00', '11:00', '13:30', '15:30'] : ['09:30', '11:00', '13:00', '16:00']
  const prices = isUpDay ? [open, low, high, close] : [open, high, low, close]

  return {
    points: prices.map((price, pointIndex) => ({ time: times[pointIndex], price })),
    source,
    warning: `${date} ${warning}`,
  }
}

const fetchEodhdDailyPricePath = async (
  stock: SavedStock,
  date: string,
): Promise<HistoricalPricePath> => {
  if (stock.market !== 'us') {
    throw new Error('EODHD demo는 현재 미국장 일봉만 사용합니다.')
  }

  const params = new URLSearchParams({
    api_token: 'demo',
    fmt: 'json',
    from: date,
    to: date,
  })
  const response = await fetch(`${eodhdApiBase}/eod/${toEodhdSymbol(stock)}?${params}`)

  if (!response.ok) {
    throw new Error(`EODHD 응답 실패 (${response.status})`)
  }

  const rows = (await response.json()) as EodhdDailyPrice[] | { error?: string; message?: string }
  if (!Array.isArray(rows)) {
    throw new Error(rows.error ?? rows.message ?? 'EODHD 일봉 데이터가 없습니다.')
  }

  const row = rows.find((item) => item.date === date)
  if (!row || row.open == null || row.high == null || row.low == null || row.close == null) {
    throw new Error('선택 날짜의 EODHD 일봉 데이터가 없습니다.')
  }

  return buildDailyOhlcPath(
    stock,
    date,
    Number(row.open),
    Number(row.high),
    Number(row.low),
    Number(row.close),
    `EODHD 실제 일봉 OHLC · ${toEodhdSymbol(stock)}`,
    '실제 시가/고가/저가/종가로 계산했습니다.',
  )
}

const fetchIntradayPricePath = async (
  stock: SavedStock,
  date: string,
): Promise<HistoricalPricePath> => {
  const { period1, period2 } = getUnixRangeForDate(date)
  const params = new URLSearchParams({
    includePrePost: 'false',
    interval: '5m',
    period1: String(period1),
    period2: String(period2),
  })
  const response = await fetch(`${financeApiBase}/v8/finance/chart/${toYahooSymbol(stock)}?${params}`)
  const result = await parseChartResponse(response)
  const timestamps = (result.timestamp ?? []) as number[]
  const quote = result.indicators?.quote?.[0] ?? {}
  const closes = (quote.close ?? []) as Array<number | null>
  const opens = (quote.open ?? []) as Array<number | null>
  const points = timestamps
    .map((timestamp, index) => ({
      date: toMarketDate(timestamp, stock.market),
      time: toMarketTime(timestamp, stock.market),
      price: closes[index] ?? opens[index],
    }))
    .filter((point) => point.date === date && typeof point.price === 'number' && point.price > 0)
    .map((point) => ({ time: point.time, price: Number(point.price) }))

  if (points.length < 2) {
    throw new Error('선택 날짜의 5분봉 데이터가 부족합니다.')
  }

  return {
    points,
    source: `Yahoo Finance 5분봉 · ${toYahooSymbol(stock)}`,
  }
}

const fetchDailyPricePath = async (
  stock: SavedStock,
  date: string,
): Promise<HistoricalPricePath> => {
  const { period1, period2 } = getUnixRangeForDate(date)
  const params = new URLSearchParams({
    interval: '1d',
    period1: String(period1),
    period2: String(period2),
  })
  const response = await fetch(`${financeApiBase}/v8/finance/chart/${toYahooSymbol(stock)}?${params}`)
  const result = await parseChartResponse(response)
  const timestamps = (result.timestamp ?? []) as number[]
  const quote = result.indicators?.quote?.[0] ?? {}
  const opens = (quote.open ?? []) as Array<number | null>
  const highs = (quote.high ?? []) as Array<number | null>
  const lows = (quote.low ?? []) as Array<number | null>
  const closes = (quote.close ?? []) as Array<number | null>
  const index = timestamps.findIndex((timestamp) => toMarketDate(timestamp, stock.market) === date)

  if (index < 0 || opens[index] == null || highs[index] == null || lows[index] == null || closes[index] == null) {
    throw new Error('선택 날짜의 일봉 데이터가 없습니다. 휴장일이거나 아직 데이터가 확정되지 않았을 수 있습니다.')
  }

  return buildDailyOhlcPath(
    stock,
    date,
    Number(opens[index]),
    Number(highs[index]),
    Number(lows[index]),
    Number(closes[index]),
    `Yahoo Finance 일봉 OHLC · ${toYahooSymbol(stock)}`,
    '분봉이 없어서 실제 시가/고가/저가/종가로 계산했습니다.',
  )
}

const fetchHistoricalPricePath = async (
  stock: SavedStock,
  date: string,
): Promise<HistoricalPricePath> => {
  try {
    return await fetchEodhdDailyPricePath(stock, date)
  } catch {
    // 미국장 demo 일봉이 막히면 Yahoo 시세로 이어서 시도합니다.
  }

  try {
    return await fetchIntradayPricePath(stock, date)
  } catch {
    return fetchDailyPricePath(stock, date)
  }
}

const buildBacktestResult = (
  stock: SavedStock,
  form: BacktestForm,
  date: string,
  historicalPath?: HistoricalPricePath,
): BacktestResult => {
  let cash = 0
  let quantity = form.quantity
  const executedStages = new Set<string>()
  const startCapital = Math.max(form.initialCapital, form.startPrice * form.quantity)
  const initialQuantity = form.quantity
  cash = startCapital - form.startPrice * quantity
  const actions: SimulationEvent[] = []
  const simulationPoints: SimulationPoint[] = []
  const pricePath =
    historicalPath?.points ??
    intradayMultipliers.map((move, index) => ({
      time: intradayTimes[index],
      price: form.startPrice * (1 + move),
    }))
  const prices = pricePath.map((point) => point.price)
  const normalizedStages = normalizeStrategyStages(form.stages)
  const activeStages = normalizedStages.filter((stage) => stage.enabled !== false)
  const reentryStage = activeStages.find((stage) => stage.type === 'post-full-sell-reentry')
  const regularStages = activeStages.filter((stage) => stage.type !== 'post-full-sell-reentry')
  let pendingReentry:
    | {
        sellIndex: number
        sellPrice: number
        stage: StrategyStage
      }
    | null = null
  const strategyLevels: BacktestStrategyLevel[] = regularStages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      shortLabel: getStrategyStageShortLabel(stage),
      price: form.startPrice * (1 + stage.trigger / 100),
      referencePrice: form.startPrice,
      trigger: stage.trigger,
      quantityPercent: stage.quantityPercent,
      canEditQuantity: canEditStrategyStageQuantity(stage),
      tone: getStrategyStageTone(stage),
      group: getStrategyStageGroup(stage),
    }))

  prices.forEach((price, index) => {
    const moveRate = ((price - form.startPrice) / form.startPrice) * 100
    let event: SimulationEvent | undefined
    let strategyState = '조건 대기'

    if (index === 0) {
      event = {
        index,
        time: pricePath[index].time,
        condition: '시작',
        action: '보유 유지',
        quantity,
        price,
        profitRate: 0,
        title: '보유 시작',
        detail: '장 시작 기준으로 보유 상태를 추적해요.',
        tone: 'hold',
      }
      actions.push(event)
      strategyState = '보유 시작'
    }

    let shouldSkipRegularStages = pendingReentry !== null
    if (pendingReentry && index > pendingReentry.sellIndex && quantity <= 0 && cash > 0) {
      const reentryMoveRate = ((price - pendingReentry.sellPrice) / pendingReentry.sellPrice) * 100

      if (reentryMoveRate <= pendingReentry.stage.trigger) {
        const tradeQty = Math.floor(cash / price)

        if (tradeQty > 0) {
          const spentCash = tradeQty * price
          quantity += tradeQty
          cash -= spentCash
          executedStages.add(pendingReentry.stage.id)
          const portfolioValue = cash + quantity * price
          const percentLabel = `${pendingReentry.stage.trigger > 0 ? '+' : ''}${pendingReentry.stage.trigger}%`
          const quantityDetail = `${tradeQty}주(현금 전량)`
          event = {
            index,
            time: pricePath[index].time,
            condition: percentLabel,
            action: '재진입 전량매수',
            quantity: tradeQty,
            price,
            profitRate: ((portfolioValue - startCapital) / startCapital) * 100,
            title: `${percentLabel} 재진입 전량매수 · ${quantityDetail}`,
            detail: `${pendingReentry.stage.label}: 전량매도 체결가 대비 ${formatCurrencyWithKrw(
              price,
              stock.market,
            )}에서 ${quantityDetail} 실행`,
            tone: 'reentry-buy',
          }
          actions.push(event)
          strategyState = '재진입 전량매수 실행'
          pendingReentry = null
          shouldSkipRegularStages = true
        }
      } else {
        strategyState = '재진입 대기'
      }
    }

    if (shouldSkipRegularStages) {
      const portfolioValue = cash + quantity * price
      const profit = portfolioValue - startCapital
      simulationPoints.push({
        index,
        time: pricePath[index].time,
        price,
        moveRate,
        quantity,
        cash,
        portfolioValue,
        profit,
        profitRate: (profit / startCapital) * 100,
        strategyState,
        event,
      })
      return
    }

    for (const stage of sortExecutableStages(regularStages)) {
      if (executedStages.has(stage.id)) continue
      if (stage.type === 'rise-sell' && (moveRate < stage.trigger || quantity <= 0)) continue
      if (stage.type === 'dip-buy' && (moveRate > stage.trigger || cash <= 0)) continue
      if (stage.type === 'dip-sell' && (moveRate > stage.trigger || quantity <= 0)) continue
      if (stage.type === 'crash-full-sell' && (moveRate > stage.trigger || quantity <= 0)) continue

      const percentLabel = `${stage.trigger > 0 ? '+' : ''}${stage.trigger}%`
      const tradePercent = Math.max(1, Math.min(100, stage.quantityPercent))
      let tradeQty: number
      let action: string
      let tone: SimulationEvent['tone']

      if (stage.type === 'dip-buy') {
        const tradeBudget = Math.min(cash, startCapital * (tradePercent / 100))
        tradeQty = Math.floor(tradeBudget / price)
        if (tradeQty <= 0) continue
        const spentCash = tradeQty * price
        const isFullBuy = tradePercent >= 100 || spentCash >= cash * 0.995
        quantity += tradeQty
        cash -= spentCash
        action = isFullBuy ? '전량매수' : '하락매수'
        tone = isFullBuy ? 'full-buy' : 'buy'
      } else {
        const availableQuantity = quantity
        const forcedFullSell = stage.type === 'crash-full-sell'
        tradeQty = forcedFullSell
          ? availableQuantity
          : Math.min(availableQuantity, Math.max(1, Math.floor(initialQuantity * (tradePercent / 100))))
        const isFullSell = forcedFullSell || tradePercent >= 100 || tradeQty >= availableQuantity
        quantity -= tradeQty
        cash += tradeQty * price
        action =
          stage.type === 'crash-full-sell'
            ? '급락 전량매도'
            : isFullSell
              ? '전량매도'
              : stage.type === 'dip-sell'
                ? '하락매도'
                : '상승판매'
        tone = isFullSell ? 'full-sell' : 'sell'
        if (isFullSell && reentryStage && !executedStages.has(reentryStage.id)) {
          pendingReentry = {
            sellIndex: index,
            sellPrice: price,
            stage: reentryStage,
          }
          strategyLevels.push({
            id: reentryStage.id,
            label: reentryStage.label,
            shortLabel: getStrategyStageShortLabel(reentryStage),
            price: price * (1 + reentryStage.trigger / 100),
            referencePrice: price,
            trigger: reentryStage.trigger,
            quantityPercent: reentryStage.quantityPercent,
            canEditQuantity: canEditStrategyStageQuantity(reentryStage),
            tone: getStrategyStageTone(reentryStage),
            group: getStrategyStageGroup(reentryStage),
          })
        }
      }

      executedStages.add(stage.id)
      const portfolioValue = cash + quantity * price
      const quantityDetail = `${tradeQty}주(${tradePercent}%)`
      event = {
        index,
        time: pricePath[index].time,
        condition: percentLabel,
        action,
        quantity: tradeQty,
        price,
        profitRate: ((portfolioValue - startCapital) / startCapital) * 100,
        title: `${percentLabel} ${action} · ${quantityDetail}`,
        detail: `${stage.label}: ${formatCurrencyWithKrw(price, stock.market)}에서 ${quantityDetail} 실행`,
        tone,
      }
      actions.push(event)
      strategyState = `${stage.label} 발동`
      if (stage.type === 'crash-full-sell') break
    }

    const portfolioValue = cash + quantity * price
    const profit = portfolioValue - startCapital
    simulationPoints.push({
      index,
      time: pricePath[index].time,
      price,
      moveRate,
      quantity,
      cash,
      portfolioValue,
      profit,
      profitRate: (profit / startCapital) * 100,
      strategyState,
      event,
    })
  })

  if (actions.length === 0) {
    const finalPoint = simulationPoints[simulationPoints.length - 1]
    const holdEvent: SimulationEvent = {
      index: finalPoint.index,
      time: finalPoint.time,
      condition: '미발생',
      action: '보유 유지',
      quantity: finalPoint.quantity,
      price: finalPoint.price,
      profitRate: finalPoint.profitRate,
      title: '조건 미발생',
      detail: 'AI 추천 기준에 닿지 않아 보유 상태로 마감했어요.',
      tone: 'hold',
    }
    actions.push(holdEvent)
    simulationPoints[simulationPoints.length - 1] = { ...finalPoint, event: holdEvent, strategyState: '조건 미발생' }
  }

  const finalPrice = prices[prices.length - 1]
  const finalCapital = cash + quantity * finalPrice
  const profit = finalCapital - startCapital
  const profitRate = (profit / startCapital) * 100
  const bestPoint = simulationPoints.reduce((best, point) =>
    point.profitRate > best.profitRate ? point : best,
  )
  const worstPoint = simulationPoints.reduce((worst, point) =>
    point.profitRate < worst.profitRate ? point : worst,
  )

  return {
    stock,
    date,
    startCapital,
    finalCapital,
    profit,
    profitRate,
    realizedProfit: cash - (form.quantity - quantity) * form.startPrice,
    remainingQuantity: quantity,
    finalPrice,
    maxPrice: Math.max(...prices),
    minPrice: Math.min(...prices),
    actions,
    strategyLevels,
    simulationPoints,
    sellCount: actions.filter((action) => action.tone === 'sell' || action.tone === 'full-sell').length,
    buyCount: actions.filter((action) => action.tone === 'buy' || action.tone === 'full-buy').length,
    bestPoint,
    worstPoint,
    dataSource: historicalPath?.source ?? '앱 내 샘플 가격 흐름',
    dataWarning: historicalPath?.warning,
  }
}

const buildHistoricalPathFromBacktestResult = (result: BacktestResult): HistoricalPricePath => ({
  points: result.simulationPoints.map((point) => ({
    time: point.time,
    price: point.price,
  })),
  source: result.dataSource,
  warning: result.dataWarning,
})

const parsePercent = (value: string) => Number(value.replace(/[^\d.-]/g, ''))

const riseSellSteps = ruleRows
  .filter((rule) => rule.tone === 'rise')
  .map((rule) => rule.trigger)

const dipBuySteps = ruleRows
  .filter((rule) => rule.tone === 'buy')
  .map((rule) => rule.trigger)

function ProviderLogo({ provider }: { provider: AiProvider }) {
  return (
    <span className={`provider-logo provider-logo-${provider.id}`} aria-hidden="true">
      <span className="provider-logo-fallback">{provider.logoFallback}</span>
      <img
        alt=""
        src={provider.logoUrl}
        onError={(event) => {
          event.currentTarget.style.display = 'none'
        }}
      />
    </span>
  )
}

function LoginGate({
  authError,
  isGoogleReady,
  onGoogleLogin,
}: {
  authError: string
  isGoogleReady: boolean
  onGoogleLogin: () => void
}) {
  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="Google 로그인">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">
            <img src="/super-toss-logo.png" alt="" />
          </span>
          <div>
            <strong>Super Toss</strong>
            <span>Auto Trading Lab</span>
          </div>
        </div>
        <div className="login-copy">
          <h1>Google 로그인 후 접속</h1>
          <p>허용된 계정만 메인 대시보드에 들어갈 수 있습니다.</p>
        </div>
        <div className="login-card">
          <span>접속 권한</span>
          <strong>등록된 관리자 계정만 허용</strong>
          {googleClientId ? (
            <>
              <button
                className="google-login-button"
                disabled={!isGoogleReady}
                onClick={onGoogleLogin}
                type="button"
              >
                <span aria-hidden="true">G</span>
                Google 계정으로 로그인
              </button>
              {!isGoogleReady && <em>Google 로그인 준비 중</em>}
            </>
          ) : (
            <p className="auth-error">
              VITE_GOOGLE_CLIENT_ID가 설정되지 않았습니다. Google OAuth Web Client ID를 넣어야
              로그인 버튼이 표시됩니다.
            </p>
          )}
          {authError && <p className="auth-error">{authError}</p>}
        </div>
      </section>
    </main>
  )
}

function App() {
  const [authState, setAuthState] = useState<{ session: SuperTossSession | null; status: AuthStatus }>(() => {
    const session = readStoredSession()
    return {
      session,
      status: session ? 'signed-in' : 'signed-out',
    }
  })
  const [authError, setAuthError] = useState('')
  const [isGoogleReady, setIsGoogleReady] = useState(false)
  const googleTokenClientRef = useRef<GoogleTokenClient | null>(null)
  const [paperMode, setPaperMode] = useState(true)
  const [halted, setHalted] = useState(false)
  const [activeTab, setActiveTab] = useState<MobileTab>('홈')
  const [activeSection, setActiveSection] = useState<NavSection>(getInitialNavSection)
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(sidebarHiddenStorageKey) === 'true'
  })
  const [navOrder, setNavOrder] = useState<NavSection[]>(getStoredNavOrder)
  const [draggingNavSection, setDraggingNavSection] = useState<NavSection | null>(null)
  const [favoriteNavSections, setFavoriteNavSections] = useState<NavSection[]>(() =>
    readStoredNavSections(navFavoriteStorageKey),
  )
  const [marketMode, setMarketMode] = useState<MarketMode>('kr')
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('krw')
  const [selectedProviderId, setSelectedProviderId] = useState<AiProviderId>('local-codex')
  const [selectedModel, setSelectedModel] = useState(aiProviders[0].models[0])
  const [selectedAnalysisPeriod, setSelectedAnalysisPeriod] = useState<AnalysisPeriod>('1d')
  const [analysisCount, setAnalysisCount] = useState(1)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [apiForm, setApiForm] = useState({
    apiKey: '',
    secretKey: '',
    allowedIp: '218.148.25.31',
    endpoint: 'https://open-api.tossinvest.com',
  })
  const [savedStocks, setSavedStocks] = useState<SavedStock[]>(initialSavedStocks)
  const [rankingTick, setRankingTick] = useState(0)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [rankingCategory, setRankingCategory] = useState<RankingCategory>('marketCap')
  const [rankingSortDirection, setRankingSortDirection] = useState<RankingSortDirection>('desc')
  const [rankingSearchQuery, setRankingSearchQuery] = useState('')
  const [rankingTypeFilter, setRankingTypeFilter] = useState<RankingTypeFilter>('all')
  const [strategyPerformanceSortKey, setStrategyPerformanceSortKey] =
    useState<StrategyPerformanceSortKey>('cumulativeProfitRate')
  const [selectedDetailStock, setSelectedDetailStock] = useState<RankingLeaderStock | null>(getDetailStockFromHash)
  const [stockDraft, setStockDraft] = useState({
    name: '',
    ticker: '',
    basePrice: '',
    quantity: '10',
    note: '',
  })
  const [stockSearchQuery, setStockSearchQuery] = useState('')
  const [remoteSearchResults, setRemoteSearchResults] = useState<TossRankingStock[]>([])
  const [stockSearchStatus, setStockSearchStatus] = useState<SearchStatus>('idle')
  const [stockSearchMessage, setStockSearchMessage] = useState('샘플 종목과 Yahoo Finance 검색을 함께 보여줍니다.')
  const [backtestLoading, setBacktestLoading] = useState(false)
  const [backtestError, setBacktestError] = useState('')
  const [backtestForm, setBacktestForm] = useState<BacktestForm>({
    date: '2026-06-01',
    stockId: String(initialSavedStocks[0].id),
    initialCapital: getBacktestCapitalFromPosition(initialSavedStocks[0].basePrice, initialSavedStocks[0].quantity),
    startPrice: initialSavedStocks[0].basePrice,
    quantity: initialSavedStocks[0].quantity,
    sellUp: initialSavedStocks[0].sellUp,
    defenseDown: initialSavedStocks[0].defenseDown,
    stopLoss: initialSavedStocks[0].stopLoss,
    rebuyDown: initialSavedStocks[0].rebuyDown,
    stages: getStrategyStagesForStock(initialSavedStocks[0]),
  })
  const [backtestResult, setBacktestResult] = useState<BacktestResult>(() =>
    buildBacktestResult(
      initialSavedStocks[0],
      {
        date: '2026-06-01',
        stockId: String(initialSavedStocks[0].id),
        initialCapital: getBacktestCapitalFromPosition(initialSavedStocks[0].basePrice, initialSavedStocks[0].quantity),
        startPrice: initialSavedStocks[0].basePrice,
        quantity: initialSavedStocks[0].quantity,
        sellUp: initialSavedStocks[0].sellUp,
        defenseDown: initialSavedStocks[0].defenseDown,
        stopLoss: initialSavedStocks[0].stopLoss,
        rebuyDown: initialSavedStocks[0].rebuyDown,
        stages: getStrategyStagesForStock(initialSavedStocks[0]),
      },
      '2026-06-01',
    ),
  )
  const analyzeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (authState.status !== 'signed-out' || !googleClientId) return

    let disposed = false
    const initializeGoogleLogin = () => {
      if (disposed || !window.google?.accounts?.oauth2) return false

      googleTokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'openid email profile',
        callback: async (response) => {
          setAuthError('')
          if (response.error) {
            setAuthError('Google 로그인 요청이 취소되었거나 실패했습니다.')
            return
          }
          if (!response.access_token) {
            setAuthError('Google 인증 응답을 받지 못했습니다.')
            return
          }

          try {
            const profile = await fetchGoogleUserInfo(response.access_token)
            const email = profile.email?.toLowerCase()

            if (!profile.email_verified || !email) {
              setAuthError('Google 이메일 인증이 확인되지 않았습니다.')
              return
            }

            const emailHash = await hashText(email)
            if (emailHash !== allowedGoogleEmailHash) {
              setAuthError('이 Google 계정은 접속 권한이 없습니다.')
              return
            }

            const nextSession: SuperTossSession = {
              emailHash,
              expiresAt: Date.now() + Math.max(response.expires_in ?? 3600, 300) * 1000,
            }
            writeSession(nextSession)
            setAuthState({
              session: nextSession,
              status: 'signed-in',
            })
          } catch {
            setAuthError('Google 계정 정보를 확인하지 못했습니다. 다시 시도해 주세요.')
          }
        },
        error_callback: () => {
          setAuthError('Google 로그인 팝업을 열지 못했습니다.')
        },
      })
      setIsGoogleReady(true)
      return true
    }

    if (initializeGoogleLogin()) {
      return () => {
        disposed = true
      }
    }

    const timer = window.setInterval(() => {
      if (initializeGoogleLogin()) {
        window.clearInterval(timer)
      }
    }, 200)

    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [authState.status])

  const handleGoogleLogin = () => {
    setAuthError('')
    googleTokenClientRef.current?.requestAccessToken({ prompt: '' })
  }

  useEffect(() => {
    return () => {
      if (analyzeTimerRef.current !== null) {
        window.clearTimeout(analyzeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(navOrderStorageKey, JSON.stringify(navOrder))
  }, [navOrder])

  useEffect(() => {
    window.localStorage.setItem(navFavoriteStorageKey, JSON.stringify(favoriteNavSections))
  }, [favoriteNavSections])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRankingTick((tick) => tick + 1)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  const selectedMarket = marketPresets[marketMode]
  const formatVisibleCurrency = useCallback(
    (value: number, sourceMarket: MarketMode) => formatCurrencyForDisplay(value, sourceMarket, displayCurrency),
    [displayCurrency],
  )
  const formatSignedVisibleCurrency = useCallback(
    (value: number, sourceMarket: MarketMode) => formatSignedCurrencyForDisplay(value, sourceMarket, displayCurrency),
    [displayCurrency],
  )
  const digitalTime = useMemo(() => formatSeoulDigitalTime(currentTime), [currentTime])
  const digitalDate = useMemo(() => formatSeoulDate(currentTime), [currentTime])
  const marketCountdowns = useMemo(
    () => marketSessionConfigs.map((config) => getMarketSessionInfo(currentTime, config)),
    [currentTime],
  )

  useEffect(() => {
    const query = stockSearchQuery.trim()

    if (query.length < 2) {
      const resetTimer = window.setTimeout(() => {
        setRemoteSearchResults([])
        setStockSearchStatus('idle')
        setStockSearchMessage('샘플 종목과 Yahoo Finance 검색을 함께 보여줍니다.')
      }, 0)

      return () => {
        window.clearTimeout(resetTimer)
      }
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setStockSearchStatus('loading')
      setStockSearchMessage('Yahoo Finance에서 실제 종목을 검색 중입니다.')

      try {
        const params = new URLSearchParams({
          newsCount: '0',
          q: getSearchTerm(query),
          quotesCount: '8',
        })
        const response = await fetch(`${financeApiBase}/v1/finance/search?${params}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`검색 API 응답 실패 (${response.status})`)
        }

        const data = await response.json()
        const quotes = ((data?.quotes ?? []) as YahooSearchQuote[])
          .map((quote, index) => normalizeYahooQuote(quote, index + 20))
          .filter((stock): stock is TossRankingStock => Boolean(stock))

        setRemoteSearchResults(quotes)
        setStockSearchStatus('ready')
        setStockSearchMessage(
          quotes.length > 0 ? `실제 검색 결과 ${quotes.length}개를 찾았습니다.` : '저장 가능한 종목을 찾지 못했습니다.',
        )
      } catch (error) {
        if (controller.signal.aborted) return
        setRemoteSearchResults([])
        setStockSearchStatus('ready')
        setStockSearchMessage(
          `외부 검색 제한 중입니다. 기본 검색 결과를 먼저 보여줍니다.${
            error instanceof Error ? ` (${error.message})` : ''
          }`,
        )
      }
    }, 320)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [marketMode, stockSearchQuery])

  const recommendations: Recommendation[] = useMemo(
    () => {
      const period = analysisPeriodOptions.find((option) => option.id === selectedAnalysisPeriod) ?? analysisPeriodOptions[0]

      return marketLeaderSeeds[marketMode]
        .map((stock) => {
          const change = stock.surge * period.multiplier
          const volumeBoost = stock.volume * period.multiplier
          const score = Math.min(98, Math.round(change * 8 + volumeBoost / 9 + stock.marketCap / (marketMode === 'us' ? 160 : 12)))

          const sellStage =
            change >= 7 ? riseSellSteps[2] : change >= 4 ? riseSellSteps[1] : riseSellSteps[0]
          const buyStages = dipBuySteps.join(' / ')

          return {
            name: stock.name,
            price: formatVisibleCurrency(stock.price, marketMode),
            ticker: stock.ticker,
            score,
            reason: `${period.label} 기준 상승률 ${change.toFixed(2)}%, 거래량 ${Math.round(volumeBoost)}% 흐름이 3단계 판매·3단계 매수 전략과 맞아요.`,
            sellStage,
            buyStages,
          }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
    },
    [formatVisibleCurrency, marketMode, selectedAnalysisPeriod],
  )

  const floatingRankingStocks = useMemo(
    () => {
      const directionMultiplier = rankingSortDirection === 'desc' ? -1 : 1
      const getRankingValue = (stock: MarketLeaderStock) => {
        if (rankingCategory === 'marketCap') return stock.marketCap
        if (rankingCategory === 'volume') return stock.volume
        return stock.surge
      }

      return marketLeaderSeeds[marketMode]
        .map((stock, index) => {
          const liveBump = ((rankingTick + index) % 5) - 2
          return {
            ...stock,
            market: marketMode,
            rank: 0,
            volume: Math.max(1, stock.volume + liveBump),
            surge: Number((stock.surge + liveBump * 0.04).toFixed(2)),
          }
        })
        .sort((a, b) => (getRankingValue(a) - getRankingValue(b)) * directionMultiplier)
        .slice(0, 30)
        .map((stock, index) => ({
          ...stock,
          rank: index + 1,
        }))
    },
    [marketMode, rankingCategory, rankingSortDirection, rankingTick],
  )
  const rankingTypeCounts = useMemo(() => {
    const stocks = marketLeaderSeeds[marketMode]
    const etfCount = stocks.filter((stock) => getRankingAssetClass(stock) === 'etf').length

    return {
      all: stocks.length,
      stock: stocks.length - etfCount,
      etf: etfCount,
    }
  }, [marketMode])
  const filteredFloatingRankingStocks = useMemo(() => {
    const query = rankingSearchQuery.trim().toLowerCase()

    return floatingRankingStocks
      .filter((stock) => rankingTypeFilter === 'all' || getRankingAssetClass(stock) === rankingTypeFilter)
      .filter(
        (stock) =>
          !query ||
          stock.name.toLowerCase().includes(query) ||
          stock.ticker.toLowerCase().includes(query),
      )
      .slice(0, 10)
  }, [floatingRankingStocks, rankingSearchQuery, rankingTypeFilter])

  const detailStock = useMemo<RankingLeaderStock>(() => {
    if (selectedDetailStock?.market === marketMode) return selectedDetailStock
    const firstStock = marketLeaderSeeds[marketMode][0]
    return { ...firstStock, market: marketMode, rank: 1 }
  }, [marketMode, selectedDetailStock])

  const activePageTitle = useMemo(() => {
    if (activeSection === 'stockDetail') return `${detailStock.name} 상세`
    return navItems.find((item) => item.section === activeSection)?.label ?? 'Super Toss'
  }, [activeSection, detailStock.name])

  const activeRankingView =
    rankingViewOptions.find(
      (option) => option.category === rankingCategory && option.direction === rankingSortDirection,
    ) ?? rankingViewOptions[0]
  const floatingRankingTitle = `${activeRankingView.label} TOP 10`
  const getFloatingRankingMetric = (stock: RankingLeaderStock) => {
    if (rankingCategory === 'marketCap') return `${stock.marketCap.toLocaleString('ko-KR')}조`
    if (rankingCategory === 'volume') return `${stock.volume}%`
    const sign = rankingSortDirection === 'asc' ? '-' : '+'
    return `${sign}${stock.surge.toFixed(2)}%`
  }

  const detailChartPoints = useMemo(() => buildDetailChartPoints(detailStock), [detailStock])

  const detailStockSaved = useMemo(
    () => hasSavedStock(savedStocks, detailStock),
    [detailStock, savedStocks],
  )

  const orderedNavItems = useMemo(() => {
    const itemBySection = new Map(navItems.map((item) => [item.section, item]))
    return navOrder
      .map((section) => itemBySection.get(section))
      .filter((item): item is NavItem => Boolean(item))
  }, [navOrder])

  const favoriteNavItems = useMemo(
    () =>
      favoriteNavSections
        .map((section) => orderedNavItems.find((item) => item.section === section))
        .filter((item): item is NavItem => Boolean(item)),
    [favoriteNavSections, orderedNavItems],
  )

  const searchResults = useMemo(() => {
    const query = stockSearchQuery.trim()
    const normalizedQuery = query.toLowerCase()
    const normalizedSearchTerm = getSearchTerm(query).toLowerCase()
    const marketStocks = query ? stockSearchSeeds : stockSearchSeeds.filter((stock) => stock.market === marketMode)

    if (!query) return marketStocks.slice(0, 3)

    const localResults = marketStocks
      .filter(
        (stock) =>
          stock.name.toLowerCase().includes(normalizedQuery) ||
          stock.ticker.toLowerCase().includes(normalizedQuery) ||
          stock.name.toLowerCase().includes(normalizedSearchTerm) ||
          stock.ticker.toLowerCase().includes(normalizedSearchTerm),
      )
      .slice(0, 5)

    return mergeSearchResults(localResults, remoteSearchResults)
  }, [marketMode, remoteSearchResults, stockSearchQuery])

  const currentBacktestStock = useMemo(
    () =>
      savedStocks.find((stock) => String(stock.id) === backtestForm.stockId) ??
      savedStocks[0] ??
      initialSavedStocks[0],
    [backtestForm.stockId, savedStocks],
  )

  const strategyPerformanceRows = useMemo(
    () =>
      savedStocks
        .map((stock) => buildStrategyPerformanceRow(stock, backtestForm.date))
        .sort((left, right) => {
          if (left.isUnavailable && !right.isUnavailable) return 1
          if (!left.isUnavailable && right.isUnavailable) return -1
          return right[strategyPerformanceSortKey] - left[strategyPerformanceSortKey]
        }),
    [backtestForm.date, savedStocks, strategyPerformanceSortKey],
  )

  const selectedProvider = useMemo(
    () => aiProviders.find((provider) => provider.id === selectedProviderId) ?? aiProviders[0],
    [selectedProviderId],
  )

  const apiReady = apiForm.apiKey.trim().length > 8 && apiForm.secretKey.trim().length > 8

  const statusLabel = useMemo(() => {
    if (halted) return '긴급 정지'
    if (apiReady) return 'API 입력 완료'
    return 'API 연결 대기'
  }, [apiReady, halted])

  const backtestUsesSampleFallback = backtestResult.dataSource.includes('샘플')

  const handleHalt = () => {
    setHalted(true)
  }

  const handleProviderChange = (providerId: AiProviderId) => {
    const nextProvider = aiProviders.find((provider) => provider.id === providerId) ?? aiProviders[0]
    setSelectedProviderId(nextProvider.id)
    setSelectedModel(nextProvider.models[0])
  }

  const handleAnalyze = () => {
    if (analyzeTimerRef.current !== null) {
      window.clearTimeout(analyzeTimerRef.current)
    }

    setIsAnalyzing(true)
    setAnalysisCount((count) => count + 1)
    analyzeTimerRef.current = window.setTimeout(() => {
      setIsAnalyzing(false)
      analyzeTimerRef.current = null
    }, 1400)
  }

  const applyAiRecommendation = () => {
    setBacktestForm((current) => {
      const activeStock =
        savedStocks.find((stock) => String(stock.id) === current.stockId) ??
        currentBacktestStock
      const activeRecommendation =
        activeStock.market === marketMode
          ? recommendations.find((stock) => normalizeTicker(stock.ticker) === normalizeTicker(activeStock.ticker))
          : undefined
      const sellTrigger = activeRecommendation ? parsePercent(activeRecommendation.sellStage) : current.sellUp
      const recommendedSellTriggers = getRiseSellTriggers(sellTrigger)
      const recommendedBuyStages = activeRecommendation
        ? activeRecommendation.buyStages.split('/').map((stage) => -Math.abs(parsePercent(stage)))
        : [current.defenseDown, current.stopLoss, current.rebuyDown]

      return {
        ...current,
        sellUp: sellTrigger,
        defenseDown: recommendedBuyStages[0] ?? current.defenseDown,
        stopLoss: recommendedBuyStages[1] ?? current.stopLoss,
        rebuyDown: recommendedBuyStages[2] ?? current.rebuyDown,
        stages: current.stages.map((stage) => {
          if (stage.id === 'rise-1') return { ...stage, trigger: recommendedSellTriggers[0] }
          if (stage.id === 'rise-2') return { ...stage, trigger: recommendedSellTriggers[1] }
          if (stage.id === 'rise-3') return { ...stage, trigger: recommendedSellTriggers[2] }
          if (stage.id === 'dip-buy-1') return { ...stage, trigger: recommendedBuyStages[0] ?? stage.trigger }
          if (stage.id === 'dip-buy-2') return { ...stage, trigger: recommendedBuyStages[1] ?? stage.trigger }
          if (stage.id === 'dip-buy-3') return { ...stage, trigger: recommendedBuyStages[2] ?? stage.trigger }
          return stage
        }),
      }
    })
  }

  const applyStockToBacktest = (stock: SavedStock) => {
    setBacktestForm((current) => ({
      ...current,
      stockId: String(stock.id),
      initialCapital: getBacktestCapitalFromPosition(stock.basePrice, stock.quantity),
      startPrice: stock.basePrice,
      quantity: stock.quantity,
      sellUp: stock.sellUp,
      defenseDown: stock.defenseDown,
      stopLoss: stock.stopLoss,
      rebuyDown: stock.rebuyDown,
      stages: getStrategyStagesForStock(stock),
    }))
    moveToSection('backtest')
  }

  const runBacktest = async () => {
    setBacktestLoading(true)
    setBacktestError('')

    try {
      const historicalPath = await fetchHistoricalPricePath(currentBacktestStock, backtestForm.date)
      const actualStartPrice = historicalPath.points[0]?.price ?? backtestForm.startPrice
      const currentPositionCost = backtestForm.startPrice * backtestForm.quantity
      const capitalMultiplier =
        currentPositionCost > 0 ? Math.max(1, backtestForm.initialCapital / currentPositionCost) : 1 + dipBuyReserveRate
      const executionForm = {
        ...backtestForm,
        initialCapital: actualStartPrice * backtestForm.quantity * capitalMultiplier,
        startPrice: actualStartPrice,
      }
      setBacktestForm(executionForm)
      setBacktestResult(buildBacktestResult(currentBacktestStock, executionForm, backtestForm.date, historicalPath))
    } catch (error) {
      const message = error instanceof Error ? error.message : '선택 날짜의 실제 시세를 가져오지 못했습니다.'
      setBacktestError(message)
      setBacktestResult(
        buildBacktestResult(currentBacktestStock, backtestForm, backtestForm.date, {
          points: intradayMultipliers.map((move, index) => ({
            time: intradayTimes[index],
            price: backtestForm.startPrice * (1 + move),
          })),
          source: '실제 시세 조회 실패 · 앱 내 샘플 가격 흐름',
          warning: message,
        }),
      )
    } finally {
      setBacktestLoading(false)
    }
  }

  const saveRankingStock = (ranking: TossRankingStock) => {
    const parsedPrice = toNumber(ranking.price)

    setSavedStocks((current) => {
      if (hasSavedStock(current, ranking)) return current

      return [
        ...current,
        {
          id: Date.now(),
          name: ranking.name,
          ticker: ranking.ticker,
          market: ranking.market,
          basePrice: parsedPrice || (ranking.market === 'us' ? 100 : 10000),
          quantity: ranking.market === 'kr' ? 20 : 10,
          sellUp: Math.max(3, Math.round(parsePercent(ranking.change) * 0.7)),
          defenseDown: -3,
          stopLoss: -8,
          rebuyDown: -12,
          targetReturn: Math.max(4, Math.round(parsePercent(ranking.change) * 0.9)),
          note: ranking.reason,
        },
      ]
    })
  }

  const saveDraftStock = () => {
    const name = stockDraft.name.trim()
    const ticker = normalizeTicker(stockDraft.ticker)
    if (!name || !ticker) return

    setSavedStocks((current) => {
      if (hasSavedStock(current, { market: marketMode, ticker })) return current

      return [
        ...current,
        {
          id: Date.now(),
          name,
          ticker,
          market: marketMode,
          basePrice: Number(stockDraft.basePrice) || (marketMode === 'us' ? 100 : 10000),
          quantity: Number(stockDraft.quantity) || 10,
          sellUp: 5,
          defenseDown: -3,
          stopLoss: -8,
          rebuyDown: -12,
          targetReturn: 5,
          note: stockDraft.note || '직접 저장한 관심주식',
        },
      ]
    })
    setStockDraft({ name: '', ticker: '', basePrice: '', quantity: '10', note: '' })
  }

  const saveLeaderStock = (stock: MarketLeaderStock, market: MarketMode) => {
    setSavedStocks((current) => {
      if (hasSavedStock(current, { market, ticker: stock.ticker })) {
        return current
      }

      return [...current, leaderToSavedStock(stock, market)]
    })
  }

  const openLeaderDetail = (stock: RankingLeaderStock) => {
    setSelectedDetailStock(stock)
    moveToSection('stockDetail', stock)
  }

  const applyLeaderToBacktest = (stock: RankingLeaderStock) => {
    const existingStock =
      savedStocks.find((savedStock) => getStockKey(savedStock) === getStockKey(stock)) ??
      leaderToSavedStock(stock, stock.market)

    setSavedStocks((current) =>
      hasSavedStock(current, stock)
        ? current
        : [...current, existingStock],
    )
    applyStockToBacktest(existingStock)
  }

  const updateApiForm = (field: keyof typeof apiForm, value: string) => {
    setApiForm((current) => ({ ...current, [field]: value }))
  }

  const updateStrategyStage = (id: string, field: 'trigger' | 'quantityPercent' | 'enabled', value: number | boolean) => {
    setBacktestForm((current) => ({
      ...current,
      stages: normalizeStrategyStages(current.stages).map((stage) => (stage.id === id ? { ...stage, [field]: value } : stage)),
    }))
  }

  const updateStrategyLevelFromGraph = ({
    id,
    price,
    referencePrice,
    quantityPercent,
  }: {
    id: string
    price?: number
    referencePrice?: number
    quantityPercent?: number
  }) => {
    const nextForm: BacktestForm = {
      ...backtestForm,
      stages: normalizeStrategyStages(backtestForm.stages).map((stage) => {
        if (stage.id !== id) return stage

        const nextStage = { ...stage }
        if (typeof price === 'number' && Number.isFinite(price) && price > 0) {
          const basePrice = referencePrice && referencePrice > 0 ? referencePrice : backtestForm.startPrice
          nextStage.trigger = Number((((price / basePrice) - 1) * 100).toFixed(2))
        }
        if (
          typeof quantityPercent === 'number' &&
          Number.isFinite(quantityPercent) &&
          canEditStrategyStageQuantity(stage)
        ) {
          nextStage.quantityPercent = Math.max(1, Math.min(100, Math.round(quantityPercent)))
        }

        return nextStage
      }),
    }

    setBacktestForm(nextForm)
    setBacktestResult(
      buildBacktestResult(
        currentBacktestStock,
        nextForm,
        nextForm.date,
        buildHistoricalPathFromBacktestResult(backtestResult),
      ),
    )
  }

  const moveNavItemTo = (sourceSection: NavSection, targetSection: NavSection, placement: 'before' | 'after') => {
    if (sourceSection === targetSection) return

    setNavOrder((current) => {
      const sourceIndex = current.indexOf(sourceSection)
      const targetIndex = current.indexOf(targetSection)
      if (sourceIndex < 0 || targetIndex < 0) return current

      const nextOrder = [...current]
      const [movedItem] = nextOrder.splice(sourceIndex, 1)
      const adjustedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex
      const insertIndex = placement === 'after' ? adjustedTargetIndex + 1 : adjustedTargetIndex
      nextOrder.splice(insertIndex, 0, movedItem)
      return nextOrder
    })
  }

  const handleNavDragStart = (event: DragEvent<HTMLDivElement>, section: NavSection) => {
    setDraggingNavSection(section)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', section)
  }

  const handleNavDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const handleNavDrop = (event: DragEvent<HTMLDivElement>, targetSection: NavSection) => {
    event.preventDefault()
    const sourceSection = draggingNavSection ?? event.dataTransfer.getData('text/plain')
    if (!isNavSection(sourceSection) || !editableNavSections.has(sourceSection)) return

    const targetBounds = event.currentTarget.getBoundingClientRect()
    const placement = event.clientY > targetBounds.top + targetBounds.height / 2 ? 'after' : 'before'
    moveNavItemTo(sourceSection, targetSection, placement)
    setDraggingNavSection(null)
  }

  const handleNavDragEnd = () => {
    setDraggingNavSection(null)
  }

  const toggleNavFavorite = (section: NavSection) => {
    setFavoriteNavSections((current) =>
      current.includes(section)
        ? current.filter((favoriteSection) => favoriteSection !== section)
        : [...current, section],
    )
  }

  const moveToSection = (section: NavSection, detailStockForHash?: Pick<RankingLeaderStock, 'market' | 'ticker'>) => {
    setActiveSection(section)
    const nextHash =
      section === 'stockDetail' && detailStockForHash
        ? `#stockDetail/${detailStockForHash.market}/${encodeURIComponent(normalizeTicker(detailStockForHash.ticker))}`
        : `#${section}`
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash)
    }
  }

  const handleMarketModeChange = (mode: MarketMode) => {
    if (mode === marketMode) return

    setMarketMode(mode)
    if (activeSection === 'stockDetail') {
      const firstStock = marketLeaderSeeds[mode][0]
      const nextDetailStock = { ...firstStock, market: mode, rank: 1 }
      setSelectedDetailStock(nextDetailStock)
      moveToSection('stockDetail', nextDetailStock)
      return
    }

    setSelectedDetailStock(null)
  }

  const toggleDisplayCurrency = () => {
    setDisplayCurrency((current) => (current === 'krw' ? 'usd' : 'krw'))
  }

  useEffect(() => {
    const syncSectionFromHash = () => {
      const [hashSection] = getHashParts()
      if (isNavSection(hashSection)) {
        setActiveSection(hashSection)
      }
      const hashDetailStock = getDetailStockFromHash()
      if (hashDetailStock) {
        setMarketMode(hashDetailStock.market)
        setSelectedDetailStock(hashDetailStock)
      }
    }

    window.addEventListener('hashchange', syncSectionFromHash)
    window.addEventListener('popstate', syncSectionFromHash)
    return () => {
      window.removeEventListener('hashchange', syncSectionFromHash)
      window.removeEventListener('popstate', syncSectionFromHash)
    }
  }, [])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      document.getElementById(activeSection)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [activeSection])

  const handleMobileTab = (tab: MobileTab) => {
    setActiveTab(tab)
    moveToSection(mobileTabSections[tab])
  }

  const setSidebarVisibility = (hidden: boolean) => {
    setIsSidebarHidden(hidden)
    try {
      window.localStorage.setItem(sidebarHiddenStorageKey, String(hidden))
    } catch {
      // 브라우저 저장소가 막혀도 화면 사용은 계속됩니다.
    }
  }

  const handleLogout = () => {
    window.localStorage.removeItem(authStorageKey)
    googleTokenClientRef.current = null
    setAuthState({
      session: null,
      status: 'signed-out',
    })
    setAuthError('')
    setIsGoogleReady(false)
  }

  if (authState.status !== 'signed-in') {
    return (
      <LoginGate
        authError={authError}
        isGoogleReady={isGoogleReady}
        onGoogleLogin={handleGoogleLogin}
      />
    )
  }

  return (
    <main className={`app-shell ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      {!isSidebarHidden && (
      <aside className="sidebar" aria-label="주요 메뉴">
        <button
          aria-label="왼쪽 메뉴 숨기기"
          className="sidebar-toggle close"
          onClick={() => setSidebarVisibility(true)}
          title="왼쪽 메뉴 숨기기"
          type="button"
        >
          <PanelLeftClose size={18} />
        </button>
        <button
          aria-label="Super Toss 홈으로 이동"
          className="brand-lockup"
          onClick={() => {
            setActiveTab('홈')
            moveToSection('dashboard')
          }}
          type="button"
        >
          <span className="brand-mark">
            <img src="/super-toss-logo.png" alt="" />
          </span>
        </button>
        <nav className="side-nav">
          {favoriteNavItems.length > 0 && (
            <div className="nav-favorite-group" aria-label="즐겨찾기 메뉴">
              <span className="side-nav-heading">즐겨찾기</span>
              {favoriteNavItems.map((item) => (
                <button
                  className={`nav-favorite-link ${activeSection === item.section ? 'active' : ''}`}
                  key={`favorite-${item.section}`}
                  onClick={() => moveToSection(item.section)}
                  type="button"
                >
                  <span className="nav-favorite-star" aria-hidden="true">
                    <Star size={15} fill="currentColor" />
                  </span>
                  <span className="nav-favorite-label">{item.label}</span>
                </button>
              ))}
            </div>
          )}
          <div className="nav-menu-list">
            <span className="side-nav-heading">전체 메뉴</span>
            {orderedNavItems.map((item) => {
              const isFavorite = favoriteNavSections.includes(item.section)
              return (
                <div
                  className={[
                    'nav-menu-row',
                    activeSection === item.section ? 'active' : '',
                    draggingNavSection === item.section ? 'dragging' : '',
                  ].filter(Boolean).join(' ')}
                  draggable
                  key={item.section}
                  onDragEnd={handleNavDragEnd}
                  onDragOver={handleNavDragOver}
                  onDragStart={(event) => handleNavDragStart(event, item.section)}
                  onDrop={(event) => handleNavDrop(event, item.section)}
                >
                  <button
                    className="nav-main-button"
                    onClick={() => moveToSection(item.section)}
                    type="button"
                  >
                    <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                  <div className="nav-menu-controls">
                    <button
                      aria-label={`${item.label} 즐겨찾기 ${isFavorite ? '해제' : '추가'}`}
                      className={isFavorite ? 'active' : ''}
                      onClick={() => toggleNavFavorite(item.section)}
                      type="button"
                    >
                      <Star size={15} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </nav>
        <div className="api-card">
          <span>Open API</span>
          <strong>{apiReady ? '입력 완료' : '입력 필요'}</strong>
          <small>키 값은 API 설정 화면에서만 확인합니다.</small>
          <button onClick={() => moveToSection('api')} type="button">
            API 설정 열기
          </button>
        </div>
      </aside>
      )}
      {isSidebarHidden && (
        <button
          aria-label="왼쪽 메뉴 펼치기"
          className="sidebar-toggle open"
          onClick={() => setSidebarVisibility(false)}
          title="왼쪽 메뉴 펼치기"
          type="button"
        >
          <PanelLeftOpen size={20} />
        </button>
      )}

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-title-card">
            <p className="caption">모의 운용 전용 대시보드</p>
            <h1>{activePageTitle}</h1>
            <div className="title-card-meta">
              <span>{selectedMarket.headline}</span>
              <strong>{selectedMarket.primary.name}</strong>
              <em>{selectedMarket.primary.change}</em>
            </div>
          </div>
          <div className="digital-clock-card" aria-label="현재 전자식 시계">
            <span>SEOUL TIME</span>
            <strong>{digitalTime}</strong>
            <em>{digitalDate}</em>
          </div>
          <div className="market-countdown-panel" aria-label="주요 시장 개장 카운트다운">
            {marketCountdowns.map((session) => (
              <article className={`market-countdown-card ${session.status}`} key={session.id}>
                <div>
                  <span>{session.label}</span>
                  <strong>{session.actionLabel}</strong>
                </div>
                <time>{session.countdown}</time>
                <small className="market-countdown-schedule">{session.timeLabel}</small>
                <small className="market-countdown-next">{session.nextOpenLabel}</small>
              </article>
            ))}
          </div>
          <div className="topbar-actions">
            <div className={`currency-toggle ${displayCurrency}`} aria-label="금액 표시 통화">
              <button
                aria-pressed={displayCurrency === 'usd'}
                onClick={toggleDisplayCurrency}
                type="button"
              >
                <span>{displayCurrency === 'krw' ? '원화' : '달러'}</span>
              </button>
              <small>기준 1달러 {usdKrwRate.toLocaleString('ko-KR')}원</small>
            </div>
            <div className="market-toggle" role="group" aria-label="시장 모드 선택">
              {(['kr', 'us'] as MarketMode[]).map((mode) => (
                <button
                  className={marketMode === mode ? 'active' : ''}
                  key={mode}
                  onClick={() => handleMarketModeChange(mode)}
                  type="button"
                >
                  <span className="market-toggle-flag" aria-hidden="true">
                    {marketPresets[mode].flagIcon}
                  </span>
                  <span className="market-toggle-label">{marketPresets[mode].label}</span>
                </button>
              ))}
            </div>
            <div className="signal-board" aria-label="운용 상태등">
              <button
                className={`paper-operation-button ${paperMode ? 'on' : 'off'}`}
                onClick={() => setPaperMode((value) => !value)}
                type="button"
              >
                <i aria-hidden="true" />
                <span>모의운용</span>
                <strong>{paperMode ? 'ON' : '대기'}</strong>
              </button>
              <span className="signal-light real blocked">
                <i aria-hidden="true" />
                실제동작 차단
              </span>
            </div>
            <span className="status-pill ai-model-pill">
              {selectedProvider.label} · {selectedModel}
            </span>
            <span className={`status-pill ${halted ? 'danger' : apiReady ? 'live' : ''}`}>
              {statusLabel}
            </span>
            <span className="user-pill">
              <span>Google 인증됨</span>
            </span>
            <button className="logout-button" onClick={handleLogout} type="button">
              <LogOut size={15} />
              <span>로그아웃</span>
            </button>
          </div>
        </header>

        <aside className="floating-ranking-card" aria-label="실시간 순위 정렬 목록">
          <div className="floating-ranking-head">
            <div>
              <strong>주식 시세</strong>
            </div>
            <div className="ranking-device-status">
              <span aria-hidden="true" />
              <em>{apiReady ? '온라인' : '오프라인'}</em>
              <b aria-hidden="true">
                <Monitor size={17} />
              </b>
            </div>
          </div>
          <label className="floating-ranking-search">
            <Search size={18} />
            <input
              onChange={(event) => setRankingSearchQuery(event.target.value)}
              placeholder="종목 검색..."
              value={rankingSearchQuery}
            />
          </label>
          <div className="floating-ranking-tabs market-type-tabs" role="group" aria-label="종목 유형">
            {(['all', 'stock', 'etf'] as RankingTypeFilter[]).map((filter) => (
              <button
                className={rankingTypeFilter === filter ? 'active' : ''}
                key={filter}
                onClick={() => setRankingTypeFilter(filter)}
                type="button"
              >
                {rankingTypeFilterLabels[filter]} {rankingTypeCounts[filter]}
              </button>
            ))}
          </div>
          <div className="floating-ranking-tabs" role="group" aria-label="순위 기준">
            {rankingViewOptions.map((option) => (
              <button
                className={
                  rankingCategory === option.category && rankingSortDirection === option.direction ? 'active' : ''
                }
                key={option.id}
                onClick={() => {
                  setRankingCategory(option.category)
                  setRankingSortDirection(option.direction)
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="floating-ranking-groups">
            <div className="floating-ranking-group-title">
              <strong>
                <Trophy size={16} />
                {floatingRankingTitle}
              </strong>
              <span>{filteredFloatingRankingStocks.length}개</span>
            </div>
            <ol className="floating-ranking-list">
              {filteredFloatingRankingStocks.map((stock) => {
                const isDeclineView = rankingCategory === 'surge' && rankingSortDirection === 'asc'

                return (
                <li
                  className={isDeclineView ? 'decline' : 'rise'}
                  key={`${rankingCategory}-${rankingSortDirection}-${stock.ticker}`}
                >
                  <button
                    className="ranking-stock-link"
                    onClick={() => openLeaderDetail(stock)}
                    type="button"
                  >
                    <strong>{stock.rank}</strong>
                    <div>
                      <span>{stock.name}</span>
                      <small>{stock.ticker}</small>
                    </div>
                    <em>
                      <span aria-hidden="true">{isDeclineView ? '▼' : '▲'}</span>
                      {getFloatingRankingMetric(stock)}
                    </em>
                  </button>
                  <button
                    aria-label={`${stock.name} 관심종목 저장`}
                    className={`ranking-heart ${hasSavedStock(savedStocks, stock) ? 'active' : ''}`}
                    onClick={() => saveLeaderStock(stock, marketMode)}
                    type="button"
                  >
                    <Heart size={16} fill={hasSavedStock(savedStocks, stock) ? 'currentColor' : 'none'} />
                  </button>
                </li>
                )
              })}
            </ol>
          </div>
        </aside>

        {activeSection === 'dashboard' && (
        <section className="mobile-preview" aria-label="모바일 요약">
          <div className="mobile-status">
            <div>
              <span>Super Toss</span>
              <strong>{statusLabel}</strong>
            </div>
            <button className="ghost-button" onClick={handleHalt} type="button">
              긴급 정지
            </button>
          </div>
          <div className="mobile-signal-row" aria-label="운용 상태등">
            <span className={`signal-light mock ${paperMode ? 'on' : 'off'}`}>
              <i aria-hidden="true" />
              모의투자 {paperMode ? 'ON' : '대기'}
            </span>
            <span className="signal-light real blocked">
              <i aria-hidden="true" />
              실제동작 차단
            </span>
          </div>
          <div className="mobile-stock">
            <span>{selectedMarket.label} 감시 종목</span>
            <strong>{selectedMarket.primary.name}</strong>
            <em>{selectedMarket.primary.change}</em>
          </div>
          <div className="mobile-ai">
            <span>AI 엔진</span>
            <strong>
              {selectedProvider.label} · {selectedModel}
            </strong>
          </div>
          <div className="mobile-rules">
            {ruleRows.map((rule) => (
              <span key={`${rule.trigger}-${rule.quantity}`}>
                {rule.trigger} {rule.action} {rule.quantity}
              </span>
            ))}
          </div>
        </section>
        )}

        {activeSection === 'savedStocks' && (
        <section className="saved-page-section" id="savedStocks" aria-label="관심주식 검색과 저장">
          <article className="panel saved-stocks-panel">
            <div className="section-title">
              <div>
                <p className="caption">최상단 빠른 저장</p>
                <h2>관심주식 검색 / 저장</h2>
              </div>
              <span className="mode-chip">{savedStocks.length}개 저장됨</span>
            </div>
            <div className="stock-search-box">
              <label>
                <span>종목 검색</span>
                <input
                  onChange={(event) => setStockSearchQuery(event.target.value)}
                  placeholder={marketMode === 'kr' ? '삼성전자, 005930' : '테슬라, Tesla, TSLA'}
                  value={stockSearchQuery}
                />
              </label>
              <div className={`stock-search-status ${stockSearchStatus}`}>
                {stockSearchStatus === 'loading' && <span aria-hidden="true" />}
                <p>{stockSearchMessage}</p>
              </div>
              <div className="stock-search-results">
                {searchResults.map((stock) => (
                  <button
                    className={hasSavedStock(savedStocks, stock) ? 'saved' : ''}
                    key={`${stock.market}-${stock.ticker}`}
                    onClick={() => saveRankingStock(stock)}
                    type="button"
                  >
                    <span>
                      <strong>{stock.name}</strong>
                      <small>
                        {stock.market === 'kr' ? '한국' : '미국'} · {stock.ticker} · {stock.price}
                      </small>
                    </span>
                    <em>{hasSavedStock(savedStocks, stock) ? '저장됨' : '추가'}</em>
                  </button>
                ))}
              </div>
            </div>
            <div className="stock-draft-grid">
              <label>
                <span>종목명</span>
                <input
                  onChange={(event) =>
                    setStockDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="예: 삼성전자"
                  value={stockDraft.name}
                />
              </label>
              <label>
                <span>티커</span>
                <input
                  onChange={(event) =>
                    setStockDraft((current) => ({ ...current, ticker: event.target.value }))
                  }
                  placeholder="예: 005930"
                  value={stockDraft.ticker}
                />
              </label>
              <label>
                <span>기준가</span>
                <input
                  onChange={(event) =>
                    setStockDraft((current) => ({ ...current, basePrice: event.target.value }))
                  }
                  placeholder={marketMode === 'kr' ? '70000' : '150'}
                  type="number"
                  value={stockDraft.basePrice}
                />
              </label>
              <label>
                <span>수량</span>
                <input
                  onChange={(event) =>
                    setStockDraft((current) => ({ ...current, quantity: event.target.value }))
                  }
                  type="number"
                  value={stockDraft.quantity}
                />
              </label>
            </div>
            <label className="stock-note-field">
              <span>메모</span>
              <input
                onChange={(event) =>
                  setStockDraft((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="AI 추천 사유나 내가 보는 조건"
                value={stockDraft.note}
              />
            </label>
            <button className="save-stock-button" onClick={saveDraftStock} type="button">
              관심주식 저장
            </button>
            <div className="saved-stock-list">
              {savedStocks.map((stock) => (
                <div className="saved-stock-card" key={stock.id}>
                  <div>
                    <strong>{stock.name}</strong>
                    <span>
                      {stock.ticker} · {stock.market === 'kr' ? '국장' : '미장'}
                    </span>
                  </div>
                  <p>{stock.note}</p>
                  <div className="saved-stock-settings">
                    <span>+{stock.sellUp}% 판매</span>
                    <span>{stock.defenseDown}% 매수1</span>
                    <span>{stock.stopLoss}% 매수2</span>
                    <span>{stock.rebuyDown}% 매수3</span>
                    <span>목표 {stock.targetReturn}%</span>
                  </div>
                  <button onClick={() => applyStockToBacktest(stock)} type="button">
                    백테스트 적용
                  </button>
                </div>
              ))}
            </div>
          </article>
        </section>
        )}

        {activeSection === 'stockDetail' && (
        <section className="stock-detail-section" id="stockDetail" aria-label="종목 상세 페이지">
          <article className="panel stock-detail-panel">
            <div className="section-title">
              <div>
                <p className="caption">우측 순위 종목 상세</p>
                <h2>{detailStock.name}</h2>
              </div>
              <span className="mode-chip">
                {detailStock.market === 'kr' ? '국장' : '미장'} · {detailStock.ticker}
              </span>
            </div>
            <div className="stock-detail-layout">
              <div className="stock-detail-main">
                <div className="stock-detail-hero">
                  <div>
                    <span>현재가</span>
                    <strong>{formatVisibleCurrency(detailStock.price, detailStock.market)}</strong>
                    <em>+{detailStock.surge.toFixed(2)}%</em>
                  </div>
                  <div className="stock-detail-actions">
                    <button
                      className={detailStockSaved ? 'saved' : ''}
                      onClick={() => saveLeaderStock(detailStock, detailStock.market)}
                      type="button"
                    >
                      ♥ {detailStockSaved ? '관심종목 등록됨' : '관심종목 등록'}
                    </button>
                    <button className="primary" onClick={() => applyLeaderToBacktest(detailStock)} type="button">
                      백테스트 적용
                    </button>
                  </div>
                </div>
                <div className="detail-chart-card">
                  <div className="detail-chart-head">
                    <span>모의 가격 흐름</span>
                    <strong>거래량 {detailStock.volume}%</strong>
                  </div>
                  <div className="detail-chart-bars" aria-label={`${detailStock.name} 모의 차트`}>
                    {detailChartPoints.map((point, index) => (
                      <span
                        key={`${detailStock.ticker}-${index}-${point}`}
                        style={{ height: `${point}%` }}
                        title={`${index + 1}구간 ${point}%`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <aside className="stock-detail-side">
                <div>
                  <span>순위</span>
                  <strong>{detailStock.rank}위</strong>
                </div>
                <div>
                  <span>시가총액</span>
                  <strong>{detailStock.marketCap.toLocaleString('ko-KR')}조</strong>
                </div>
                <div>
                  <span>거래량</span>
                  <strong>{detailStock.volume}%</strong>
                </div>
                <div>
                  <span>추천 전략</span>
                  <strong>
                    +{Math.max(3, Math.round(detailStock.surge * 0.75))}% 분할판매
                  </strong>
                </div>
              </aside>
            </div>
          </article>
        </section>
        )}

        {activeSection === 'dashboard' && (
        <section className="summary-grid" id="dashboard" aria-label="핵심 지표">
          <article className="metric-card">
            <span>운용 모드</span>
            <strong>{paperMode ? '모의투자' : '대기'}</strong>
            <p>실제동작은 빨간 상태등으로 차단 표시해요.</p>
          </article>
          <article className="metric-card">
            <span>{selectedMarket.shortLabel} 거래량 급증</span>
            <strong>{selectedMarket.primary.volume.replace('거래량 ', '')}</strong>
            <p>최근 20일 평균 대비 샘플</p>
          </article>
          <article className="metric-card">
            <span>하락매수 기준</span>
            <strong>-3/-6/-9%</strong>
            <p>하락 구간마다 모의 매수 기록</p>
          </article>
        </section>
        )}

        {activeSection === 'ai' && (
        <section className="ai-recommend-section" id="ai" aria-label="AI 추천 종목">
          <article className="panel ai-panel">
            <div className="section-title">
              <div>
                <p className="caption">기존 데이터 + 사용자 전략 기반</p>
                <h2>AI 추천 종목</h2>
              </div>
              <span className="mode-chip">{selectedProvider.label}</span>
            </div>
            <details className="fold-panel ai-fold">
              <summary>
                <span>AI API / 모델 설정</span>
                <strong>{selectedProvider.label} · {selectedModel}</strong>
              </summary>
              <div className="ai-engine-panel" aria-label="AI 분석 엔진 선택">
                <div className="provider-card-grid" aria-label="AI 제공자 선택">
                  {aiProviders.map((provider) => (
                    <button
                      className={`provider-card ${selectedProviderId === provider.id ? 'selected' : ''}`}
                      key={provider.id}
                      onClick={() => handleProviderChange(provider.id)}
                      type="button"
                    >
                      <ProviderLogo provider={provider} />
                      <span>
                        <strong>{provider.label}</strong>
                        <em>{provider.description}</em>
                      </span>
                    </button>
                  ))}
                </div>
                <label className="model-select">
                  <span>모델</span>
                  <select
                    onChange={(event) => setSelectedModel(event.target.value)}
                    value={selectedModel}
                  >
                    {selectedProvider.models.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="ai-engine-copy">
                  <strong>{selectedProvider.description}</strong>
                  <span>
                    {selectedMarket.label} 샘플 종목만 분석합니다. 실제 API 호출과 실거래 주문은 실행하지 않아요.
                  </span>
                </div>
              </div>
            </details>
            <div className="analysis-period-row" role="group" aria-label="추천 분석 기간">
              {analysisPeriodOptions.map((period) => (
                <button
                  className={selectedAnalysisPeriod === period.id ? 'active' : ''}
                  key={period.id}
                  onClick={() => setSelectedAnalysisPeriod(period.id)}
                  type="button"
                >
                  {period.label}
                </button>
              ))}
              <button
                className={`analyze-button ${isAnalyzing ? 'analyzing' : ''}`}
                disabled={isAnalyzing}
                onClick={handleAnalyze}
                type="button"
              >
                <span className="analysis-blocks" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                {isAnalyzing ? '분석 중' : '추천 10개 업데이트'}
              </button>
            </div>
            <div className="ai-run-note">
              <span>분석 기준 #{analysisCount}</span>
              <strong>
                {selectedMarket.label} · {selectedProvider.label} / {selectedModel}
              </strong>
              <em>실거래 주문 미연결</em>
            </div>
            {isAnalyzing && (
              <div className="analysis-strip" aria-live="polite">
                <span className="analysis-blocks large" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <strong>{selectedMarket.shortLabel} 샘플 데이터를 정렬하고 있어요</strong>
              </div>
            )}
            <div className="ai-recommend-list">
              {recommendations.map((stock, index) => (
                <div className="ai-recommend-row" key={stock.name}>
                  <div className="ai-stock-main">
                    <span>추천 {index + 1}</span>
                    <strong>{stock.name}</strong>
                    <em>{stock.price}</em>
                  </div>
                  <p>{stock.reason}</p>
                  <div className="ai-step-grid">
                    <span>
                      <small>추천점수</small>
                      <strong>{stock.score}점</strong>
                    </span>
                    <span>
                      <small>상승 판매</small>
                      <strong>{stock.sellStage}</strong>
                    </span>
                    <span>
                      <small>하락 매수</small>
                      <strong>{stock.buyStages}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
        )}

        {activeSection === 'strategyPerformance' && (
        <section className="strategy-performance-section" id="strategyPerformance" aria-label="관심 종목 전략 성과">
          <article className="panel strategy-performance-panel">
            <div className="section-title">
              <div>
                <p className="caption">관심 종목별 전략 시뮬레이션</p>
                <h2>관심 종목 전략 성과</h2>
              </div>
              <span className="mode-chip">{strategyPerformanceRows.length}개 종목</span>
            </div>
            <div className="performance-toolbar" role="group" aria-label="성과 정렬">
              {[
                ['cumulativeProfitRate', '누적 수익률'],
                ['cumulativeProfit', '누적 수익금'],
                ['dailyProfitRate', '일일 수익률'],
                ['dailyProfit', '일일 수익금'],
              ].map(([key, label]) => (
                <button
                  className={strategyPerformanceSortKey === key ? 'active' : ''}
                  key={key}
                  onClick={() => setStrategyPerformanceSortKey(key as StrategyPerformanceSortKey)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="performance-table-wrap">
              {strategyPerformanceRows.length === 0 ? (
                <div className="performance-empty">
                  <strong>관심 종목이 없습니다.</strong>
                  <span>관심주식 검색 / 저장에서 종목을 추가하면 전략 성과가 표시됩니다.</span>
                </div>
              ) : (
                <table className="performance-table">
                  <thead>
                    <tr>
                      <th>종목</th>
                      <th>전략 상태</th>
                      <th>일일 수익률</th>
                      <th>일일 수익금</th>
                      <th>누적 수익률</th>
                      <th>누적 수익금</th>
                      <th>현재 평가금</th>
                      <th>총 매수금</th>
                      <th>보유수량</th>
                      <th>마지막 신호</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategyPerformanceRows.map((row) => (
                      <tr className={row.isUnavailable ? 'is-unavailable' : ''} key={row.id}>
                        <td>
                          <strong>{row.name}</strong>
                          <span>{row.ticker}</span>
                        </td>
                        <td>{row.status}</td>
                        <td className={row.dailyProfitRate >= 0 ? 'profit-up' : 'profit-down'}>
                          {row.isUnavailable ? '-' : `${row.dailyProfitRate >= 0 ? '+' : ''}${row.dailyProfitRate.toFixed(2)}%`}
                        </td>
                        <td className={row.dailyProfit >= 0 ? 'profit-up' : 'profit-down'}>
                          {row.isUnavailable ? '-' : formatSignedVisibleCurrency(row.dailyProfit, row.market)}
                        </td>
                        <td className={row.cumulativeProfitRate >= 0 ? 'profit-up' : 'profit-down'}>
                          {row.isUnavailable
                            ? '-'
                            : `${row.cumulativeProfitRate >= 0 ? '+' : ''}${row.cumulativeProfitRate.toFixed(2)}%`}
                        </td>
                        <td className={row.cumulativeProfit >= 0 ? 'profit-up' : 'profit-down'}>
                          {row.isUnavailable ? '-' : formatSignedVisibleCurrency(row.cumulativeProfit, row.market)}
                        </td>
                        <td>{row.isUnavailable ? '-' : formatVisibleCurrency(row.currentValue, row.market)}</td>
                        <td>{row.isUnavailable ? '-' : formatVisibleCurrency(row.totalBuyAmount, row.market)}</td>
                        <td>{row.isUnavailable ? '-' : `${row.holdingQuantity.toLocaleString('ko-KR')}주`}</td>
                        <td>
                          <span>{row.lastTradeDate}</span>
                          <strong>{row.lastSignal}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </article>
        </section>
        )}

        {activeSection === 'backtest' && (
        <section className="backtest-section" id="backtest" aria-label="백테스팅">
          <article className="panel backtest-panel">
            <div className="section-title">
              <div>
                <p className="caption">과거 데이터 기반 시뮬레이션</p>
                <h2>백테스팅</h2>
              </div>
              <span className="mode-chip">모의 계산</span>
            </div>
            <div className="backtest-layout">
              <div className="backtest-form">
                <label>
                  <span>투자 날짜</span>
                  <input
                    onChange={(event) => {
                      setBacktestError('')
                      setBacktestForm((current) => ({ ...current, date: event.target.value }))
                    }}
                    type="date"
                    value={backtestForm.date}
                  />
                </label>
                <label>
                  <span>관심주식</span>
                  <select
                    onChange={(event) => {
                      const nextStock =
                        savedStocks.find((stock) => String(stock.id) === event.target.value) ??
                        currentBacktestStock
                      setBacktestForm((current) => ({
                        ...current,
                        stockId: String(nextStock.id),
                        initialCapital: getBacktestCapitalFromPosition(nextStock.basePrice, nextStock.quantity),
                        startPrice: nextStock.basePrice,
                        quantity: nextStock.quantity,
                        sellUp: nextStock.sellUp,
                        defenseDown: nextStock.defenseDown,
                        stopLoss: nextStock.stopLoss,
                        rebuyDown: nextStock.rebuyDown,
                        stages: getStrategyStagesForStock(nextStock),
                      }))
                    }}
                    value={backtestForm.stockId}
                  >
                    {savedStocks.map((stock) => (
                      <option key={stock.id} value={stock.id}>
                        {stock.name} · {stock.ticker}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>시작가</span>
                  <input
                    onChange={(event) =>
                      setBacktestForm((current) => ({
                        ...current,
                        startPrice: Number(event.target.value),
                      }))
                    }
                    type="number"
                    value={backtestForm.startPrice}
                  />
                </label>
                <label>
                  <span>투자 원금</span>
                  <input
                    onChange={(event) => {
                      const initialCapital = Number(event.target.value)
                      setBacktestForm((current) => ({
                        ...current,
                        initialCapital,
                        quantity: getBacktestQuantityFromCapital(initialCapital, current.startPrice),
                      }))
                    }}
                    type="number"
                    value={backtestForm.initialCapital}
                  />
                </label>
                <label>
                  <span>수량</span>
                  <input
                    onChange={(event) =>
                      setBacktestForm((current) => ({
                        ...current,
                        quantity: Number(event.target.value),
                        initialCapital: getBacktestCapitalFromPosition(current.startPrice, Number(event.target.value)),
                      }))
                    }
                    type="number"
                    value={backtestForm.quantity}
                  />
                </label>
                <div className="strategy-stage-editor" aria-label="전략 단계 세분화">
                  <div className="stage-editor-head">
                    <span>전략 단계</span>
                    <strong>사용 / 조건 / 비중</strong>
                  </div>
                  {normalizeStrategyStages(backtestForm.stages).map((stage) => (
                    <div className={`stage-editor-row ${stage.type} ${stage.enabled === false ? 'disabled' : ''}`} key={stage.id}>
                      <strong>
                        <span>{stage.label}</span>
                        <small>{getStrategyStageTypeLabel(stage)}</small>
                      </strong>
                      <label className="stage-enabled-toggle">
                        <span>사용</span>
                        <input
                          checked={stage.enabled !== false}
                          onChange={(event) => updateStrategyStage(stage.id, 'enabled', event.target.checked)}
                          type="checkbox"
                        />
                      </label>
                      <label>
                        <span>{getStrategyStageTriggerLabel(stage)}</span>
                        <input
                          onChange={(event) => updateStrategyStage(stage.id, 'trigger', Number(event.target.value))}
                          type="number"
                          value={stage.trigger}
                        />
                      </label>
                      <label>
                        <span>{getStrategyStageQuantityLabel(stage)}</span>
                        <input
                          disabled={stage.type === 'crash-full-sell' || stage.type === 'post-full-sell-reentry'}
                          max="100"
                          min="1"
                          onChange={(event) =>
                            updateStrategyStage(stage.id, 'quantityPercent', Number(event.target.value))
                          }
                          type="number"
                          value={stage.quantityPercent}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="backtest-result-card">
                <span>{backtestResult.date} 투자 가정</span>
                <strong className={backtestResult.profit >= 0 ? 'profit-up' : 'profit-down'}>
                  {formatSignedVisibleCurrency(backtestResult.profit, backtestResult.stock.market)}
                </strong>
                <em className={backtestResult.profit >= 0 ? 'profit-up' : 'profit-down'}>
                  {backtestResult.profitRate >= 0 ? '+' : ''}
                  {backtestResult.profitRate.toFixed(2)}%
                </em>
                <p>
                  {backtestResult.stock.name}을 {formatVisibleCurrency(backtestResult.startCapital, backtestResult.stock.market)}
                  만큼 운용했을 때의 결과예요.
                </p>
                <div className={`backtest-data-source ${backtestUsesSampleFallback ? 'warning' : ''}`}>
                  <span>{backtestResult.dataSource}</span>
                  {backtestUsesSampleFallback ? (
                    <em>
                      주의: 실제 시세를 확인하지 못해 샘플 가격 흐름으로 계산했습니다. 이 결과는 투자 판단에
                      사용하지 마세요. {backtestError || backtestResult.dataWarning}
                    </em>
                  ) : (
                    (backtestResult.dataWarning || backtestError) && (
                      <em>{backtestError || backtestResult.dataWarning}</em>
                    )
                  )}
                </div>
                <div className="backtest-actions">
                  <button onClick={applyAiRecommendation} type="button">
                    AI 추천값 적용
                  </button>
                  <button className="primary" disabled={backtestLoading} onClick={runBacktest} type="button">
                    {backtestLoading ? '실제 시세 확인 중' : '백테스팅 실행'}
                  </button>
                </div>
              </div>
            </div>
            <div className="backtest-kpi-grid">
              <span>
                <small>시작 평가금</small>
                <strong>{formatVisibleCurrency(backtestResult.startCapital, backtestResult.stock.market)}</strong>
              </span>
              <span>
                <small>마감 평가금</small>
                <strong>{formatVisibleCurrency(backtestResult.finalCapital, backtestResult.stock.market)}</strong>
              </span>
              <span>
                <small>최고가</small>
                <strong>{formatVisibleCurrency(backtestResult.maxPrice, backtestResult.stock.market)}</strong>
              </span>
              <span>
                <small>최저가</small>
                <strong>{formatVisibleCurrency(backtestResult.minPrice, backtestResult.stock.market)}</strong>
              </span>
            </div>
            <BacktestGraph
              actions={backtestResult.actions}
              formatter={{
                price: (value) => formatVisibleCurrency(value, backtestResult.stock.market),
                money: (value) => formatVisibleCurrency(value, backtestResult.stock.market),
                signedMoney: (value) => formatSignedVisibleCurrency(value, backtestResult.stock.market),
                percent: (value) => `${value.toFixed(2)}%`,
                signedPercent: (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`,
                quantity: (value) => `${value.toLocaleString('ko-KR')}주`,
                actionSummary: (action) =>
                  `조건 ${action.condition} · ${action.action} · ${action.quantity}주 · ${formatVisibleCurrency(
                    action.price,
                    backtestResult.stock.market,
                  )} · ${action.profitRate >= 0 ? '+' : ''}${action.profitRate.toFixed(2)}%`,
                tooltip: (point) =>
                  `${point.time}<br/>가격 ${formatVisibleCurrency(
                    point.price,
                    backtestResult.stock.market,
                  )}<br/>누적수익금 ${formatSignedVisibleCurrency(
                    point.profit,
                    backtestResult.stock.market,
                  )}<br/>수익률 ${point.profitRate.toFixed(2)}%`,
              }}
              labels={{
                caption: '장중 전략 실행 시뮬레이터',
                title: `${backtestResult.stock.name} (${backtestResult.stock.ticker}) 백테스팅 그래프`,
                simulationTab: '시뮬레이션',
                resultTab: '결과표',
                play: '재생',
                pause: '일시정지',
                replay: '다시 재생',
                reset: '처음으로',
                saveVideo: '동영상 저장',
                saveFinalImage: '최종 이미지 저장',
                recordingVideo: '동영상 저장 중',
                speed: '재생 속도',
                progress: '시뮬레이션 진행도',
                chartLoading: '차트를 불러오는 중',
                chartUnavailable: '차트 데이터가 없습니다.',
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
                tradeCount: '판매 / 매수',
                bestWorst: '최고 / 최대손실',
                tableTime: '시간',
                tableEvent: '이벤트',
                tableCondition: '조건',
                tableQuantity: '수량',
                tablePrice: '가격',
                tableProfitRate: '수익률',
              }}
              onStrategyLevelChange={updateStrategyLevelFromGraph}
              points={backtestResult.simulationPoints}
              strategyLevels={backtestResult.strategyLevels}
              summary={{
                finalProfit: backtestResult.profit,
                finalProfitRate: backtestResult.profitRate,
                sellCount: backtestResult.sellCount,
                buyCount: backtestResult.buyCount,
                bestProfitRate: backtestResult.bestPoint.profitRate,
                worstProfitRate: backtestResult.worstPoint.profitRate,
              }}
            />
          </article>
        </section>
        )}

        {activeSection === 'strategy' && (
        <section className="content-grid single-page">
          <article className="panel strategy-panel" id="strategy">
            <div className="section-title">
              <div>
                <p className="caption">자동매매 전략</p>
                <h2>상승 판매 3단계 · 하락 매수 3단계</h2>
              </div>
              <span className="mode-chip">모의 전용</span>
            </div>
            <div className="rule-list">
              {ruleRows.map((rule) => (
                <div className={`rule-row ${rule.tone}`} key={`${rule.trigger}-${rule.action}`}>
                  <span>{rule.trigger}</span>
                  <strong>{rule.action}</strong>
                  <em>{rule.quantity}</em>
                </div>
              ))}
            </div>
          </article>
        </section>
        )}

        {activeSection === 'safety' && (
        <section className="content-grid single-page">
          <article className="panel safety-panel" id="safety">
            <div className="section-title">
              <div>
                <p className="caption">안전장치</p>
                <h2>실거래 전 점검</h2>
              </div>
            </div>
            <dl>
              <div>
                <dt>최대 1일 손실</dt>
                <dd>-3.5%</dd>
              </div>
              <div>
                <dt>주문 전 확인</dt>
                <dd>켜짐</dd>
              </div>
              <div>
                <dt>API 권한</dt>
                <dd>{apiReady ? '입력 완료' : '입력 필요'}</dd>
              </div>
              <div>
                <dt>실제동작</dt>
                <dd>차단</dd>
              </div>
            </dl>
          </article>
        </section>
        )}

        {activeSection === 'watchlist' && (
        <section className="content-grid lower single-page">
          <article className="panel chart-panel" id="watchlist">
            <div className="section-title">
              <div>
                <p className="caption">관심 급등주</p>
                <h2>{selectedMarket.label} 감시 리스트</h2>
              </div>
            </div>
            <div className="watch-list">
              {selectedMarket.watchList.map((stock) => (
                <div key={stock.name}>
                  <strong>{stock.name}</strong>
                  <span>{stock.price}</span>
                  <em>{stock.change}</em>
                  <small>{stock.volume}</small>
                </div>
              ))}
            </div>
            <div className="mini-chart" aria-label="모의 가격 흐름 차트">
              {selectedMarket.chartPoints.map((point, index) => (
                <span
                  key={`${point}-${index}`}
                  style={{ height: `${point}%` }}
                  title={`${index + 1}번 구간 ${point}%`}
                />
              ))}
            </div>
          </article>
        </section>
        )}

        {activeSection === 'orders' && (
        <section className="content-grid lower single-page">
          <article className="panel log-panel" id="orders">
            <div className="section-title">
              <div>
                <p className="caption">주문/체결</p>
                <h2>모의 주문 로그</h2>
              </div>
            </div>
            <ol>
              {selectedMarket.logs.map((log) => (
                <li key={log.time}>
                  <time>{log.time}</time>
                  <div>
                    <strong>{log.title}</strong>
                    <span>{log.detail}</span>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        </section>
        )}

        {activeSection === 'api' && (
        <section className="api-input-section bottom-api-section" id="api" aria-label="API 입력">
          <article className="panel api-input-panel">
            <details className="fold-panel">
              <summary>
                <span>Open API 설정</span>
                <strong>{apiReady ? '입력 완료' : '입력 필요'}</strong>
              </summary>
              <div className="api-form-grid">
                <label>
                  <span>API Key</span>
                  <input
                    onChange={(event) => updateApiForm('apiKey', event.target.value)}
                    placeholder="tsck_live_..."
                    type="password"
                    value={apiForm.apiKey}
                  />
                </label>
                <label>
                  <span>Secret Key</span>
                  <input
                    onChange={(event) => updateApiForm('secretKey', event.target.value)}
                    placeholder="tssk_live_..."
                    type="password"
                    value={apiForm.secretKey}
                  />
                </label>
                <label>
                  <span>허용 IP</span>
                  <input
                    onChange={(event) => updateApiForm('allowedIp', event.target.value)}
                    placeholder="218.148.25.31"
                    value={apiForm.allowedIp}
                  />
                </label>
                <label>
                  <span>API Endpoint</span>
                  <input
                    onChange={(event) => updateApiForm('endpoint', event.target.value)}
                    placeholder="https://..."
                    value={apiForm.endpoint}
                  />
                </label>
              </div>
              <p className="api-warning">
                입력값은 현재 화면 상태로만 보관됩니다. 실제 키 저장과 주문 실행은 로컬 브리지/백엔드에서
                연결하세요.
              </p>
            </details>
          </article>
        </section>
        )}
      </section>

      <nav className="bottom-tabs" aria-label="모바일 메뉴">
        {(['홈', '백테스트', '관심', '설정'] as MobileTab[]).map((tab) => (
          <button
            className={activeTab === tab ? 'active' : ''}
            key={tab}
            onClick={() => handleMobileTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </nav>
    </main>
  )
}

export default App
