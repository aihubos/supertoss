import { useEffect, useMemo, useRef, useState } from 'react'
import './BacktestGraph.css'
import type {
  BacktestGraphAction,
  BacktestGraphFormatter,
  BacktestGraphLabels,
  BacktestGraphPoint,
  BacktestGraphProps,
  BacktestGraphSpeed,
  BacktestGraphStrategyLevel,
} from './types'

type EChartsModule = typeof import('echarts')
type EChartsInstance = import('echarts').ECharts
type EChartsOption = import('echarts').EChartsOption
type ZrPointerEvent = {
  offsetY?: number
  event?: {
    preventDefault?: () => void
  }
}

type RenderPoint = BacktestGraphPoint & {
  renderIndex: number
}

type VideoDownloadFormat = {
  mimeType?: string
  extension: 'mp4' | 'webm'
}

const playbackDurations: Record<BacktestGraphSpeed, number> = {
  1: 1800,
  2: 900,
  5: 360,
  10: 180,
}

const speedOptions: BacktestGraphSpeed[] = [1, 2, 5, 10]

const chartAxisLineColor = 'rgba(107, 118, 132, 0.18)'
const chartGridLineColor = 'rgba(107, 118, 132, 0.1)'
const chartAxisLabelColor = '#9aa4b2'
const exportBackgroundColor = '#ffffff'

const videoDownloadFormats: VideoDownloadFormat[] = [
  { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
  { mimeType: 'video/mp4;codecs=avc1.42E01E', extension: 'mp4' },
  { mimeType: 'video/mp4', extension: 'mp4' },
  { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
  { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
  { mimeType: 'video/webm', extension: 'webm' },
]

const defaultLabels: BacktestGraphLabels = {
  caption: 'Backtest simulator',
  title: 'Strategy replay',
  simulationTab: 'Simulation',
  resultTab: 'Result table',
  play: 'Play',
  pause: 'Pause',
  replay: 'Replay',
  reset: 'Reset',
  saveVideo: 'Save video',
  saveFinalImage: 'Save final image',
  recordingVideo: 'Recording video',
  speed: 'Playback speed',
  progress: 'Simulation progress',
  chartLoading: 'Loading chart',
  chartUnavailable: 'Chart is unavailable.',
  currentPoint: 'Current point',
  currentPrice: 'Current price',
  moveRate: 'Move',
  quantity: 'Quantity',
  cash: 'Cash',
  portfolioValue: 'Portfolio value',
  profit: 'Profit',
  strategyState: 'Strategy state',
  eventTimeline: 'Event timeline',
  resultTable: 'Result table',
  finalProfit: 'Final profit',
  finalProfitRate: 'Final return',
  tradeCount: 'Sell / buy',
  bestWorst: 'Best / worst',
  tableTime: 'Time',
  tableEvent: 'Event',
  tableCondition: 'Condition',
  tableQuantity: 'Quantity',
  tablePrice: 'Price',
  tableProfitRate: 'Return',
}

const defaultFormatter: Required<BacktestGraphFormatter> = {
  price: (value) => value.toLocaleString(),
  money: (value) => value.toLocaleString(),
  signedMoney: (value) => `${value >= 0 ? '+' : ''}${value.toLocaleString()}`,
  percent: (value) => `${value.toFixed(2)}%`,
  signedPercent: (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`,
  quantity: (value) => value.toLocaleString(),
  actionSummary: (action) =>
    `${action.condition} · ${action.action} · ${action.quantity.toLocaleString()} · ${action.price.toLocaleString()} · ${
      action.profitRate >= 0 ? '+' : ''
    }${action.profitRate.toFixed(2)}%`,
  tooltip: (point) =>
    `${point.time}<br/>Price ${point.price.toLocaleString()}<br/>Profit ${
      point.profit >= 0 ? '+' : ''
    }${point.profit.toLocaleString()}<br/>Return ${point.profitRate.toFixed(2)}%`,
}

const mergeFormatter = (formatter?: BacktestGraphFormatter): Required<BacktestGraphFormatter> => ({
  ...defaultFormatter,
  ...formatter,
})

const interpolateNumber = (start: number, end: number, ratio: number) => start + (end - start) * ratio

const normalizePoints = (points: BacktestGraphPoint[]): RenderPoint[] =>
  points.map((point, index) => ({
    ...point,
    index: point.index ?? index,
    renderIndex: index,
  }))

const clampProgress = (progress: number, max: number) => Math.min(Math.max(progress, 0), max)

const interpolatePoint = (points: RenderPoint[], progress: number): RenderPoint | null => {
  if (points.length === 0) return null

  const clampedProgress = clampProgress(progress, points.length - 1)
  const baseIndex = Math.min(Math.floor(clampedProgress), points.length - 1)
  const nextIndex = Math.min(baseIndex + 1, points.length - 1)
  const base = points[baseIndex]
  const next = points[nextIndex]
  const ratio = nextIndex === baseIndex ? 0 : clampedProgress - baseIndex

  if (!next || ratio <= 0) return base

  return {
    ...base,
    renderIndex: clampedProgress,
    time: ratio < 0.55 ? base.time : next.time,
    price: interpolateNumber(base.price, next.price, ratio),
    moveRate: interpolateNumber(base.moveRate, next.moveRate, ratio),
    quantity: ratio < 1 ? base.quantity : next.quantity,
    cash: interpolateNumber(base.cash, next.cash, ratio),
    portfolioValue: interpolateNumber(base.portfolioValue, next.portfolioValue, ratio),
    profit: interpolateNumber(base.profit, next.profit, ratio),
    profitRate: interpolateNumber(base.profitRate, next.profitRate, ratio),
    strategyState: ratio < 0.9 ? base.strategyState : next.strategyState,
  }
}

const getVisiblePoints = (points: RenderPoint[], progress: number): RenderPoint[] => {
  if (points.length === 0) return []

  const clampedProgress = clampProgress(progress, points.length - 1)
  const wholeIndex = Math.min(Math.floor(clampedProgress), points.length - 1)
  const visible = points.slice(0, wholeIndex + 1)
  const hasFraction = clampedProgress % 1 > 0.01 && wholeIndex < points.length - 1
  const interpolated = hasFraction ? interpolatePoint(points, clampedProgress) : null

  if (interpolated) visible.push(interpolated)

  return visible
}

const getToneClass = (action: BacktestGraphAction) => action.tone ?? 'neutral'

const getActionVisual = (action: BacktestGraphAction) => {
  if (action.tone === 'reentry-buy') {
    return { color: '#0891b2', label: '재매수', lineType: 'solid' as const, symbol: 'diamond', width: 2.4 }
  }
  if (action.action.includes('하락매도')) {
    return { color: '#1d4ed8', label: '매도', lineType: 'dashed' as const, symbol: 'circle', width: 1.7 }
  }
  if (action.action.includes('급락')) {
    return { color: '#7c3aed', label: '전량매도', lineType: 'solid' as const, symbol: 'diamond', width: 2.8 }
  }
  switch (action.tone) {
    case 'buy':
      return { color: '#0b6bff', label: '매수', lineType: 'dashed' as const, symbol: 'circle', width: 1.5 }
    case 'sell':
      return { color: '#f04452', label: '매도', lineType: 'dashed' as const, symbol: 'circle', width: 1.5 }
    case 'full-buy':
      return { color: '#00a36c', label: '전량매수', lineType: 'solid' as const, symbol: 'diamond', width: 2.6 }
    case 'full-sell':
      return { color: '#7c3aed', label: '전량매도', lineType: 'solid' as const, symbol: 'diamond', width: 2.6 }
    default:
      return { color: '#8b95a1', label: '이벤트', lineType: 'dotted' as const, symbol: 'circle', width: 1.2 }
  }
}

const getStrategyLevelVisual = (level: BacktestGraphStrategyLevel) => {
  if (level.tone === 'reentry-buy' || level.group === '재진입 전량매수') {
    return { color: '#0891b2', label: '재매수', lineType: 'solid' as const }
  }
  if (level.group === '급락 매수') {
    return { color: '#0f766e', label: '급락매수', lineType: 'dashed' as const }
  }
  if (level.group === '하락 매도') {
    return { color: '#1d4ed8', label: '하락매도', lineType: 'dashed' as const }
  }
  if (level.group === '급락 전량매도') {
    return { color: '#7c3aed', label: '급락매도', lineType: 'solid' as const }
  }
  if (level.group === '상승 매도') {
    return { color: '#f04452', label: '매도', lineType: 'dashed' as const }
  }
  if (level.group === '하락 매수') {
    return { color: '#0b6bff', label: '매수', lineType: 'dashed' as const }
  }
  switch (level.tone) {
    case 'sell':
      return { color: '#f04452', label: '매도 기준', lineType: 'dashed' as const }
    case 'full-sell':
      return { color: '#7c3aed', label: '전량매도 기준', lineType: 'solid' as const }
    case 'full-buy':
      return { color: '#00a36c', label: '전량매수 기준', lineType: 'solid' as const }
    case 'buy':
    default:
      return { color: '#0b6bff', label: '매수 기준', lineType: 'dashed' as const }
  }
}

const formatActionQuantity = (quantity: number) => {
  if (!Number.isFinite(quantity) || quantity <= 0) return ''
  if (Number.isInteger(quantity)) return `${quantity.toLocaleString('ko-KR')}주`

  return `${quantity.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}주`
}

const getActionPointLabel = (action: BacktestGraphAction) => {
  const visual = getActionVisual(action)
  const quantity = formatActionQuantity(action.quantity)

  return quantity ? `${visual.label} ${quantity}` : visual.label
}

const getStrategyLevelStep = (level: BacktestGraphStrategyLevel) => {
  const target = `${level.id ?? ''} ${level.shortLabel ?? ''} ${level.label}`
  const stepMatch = target.match(/(?:^|\D)([123])(?:차|\b|-)/)

  return stepMatch ? Number(stepMatch[1]) : 0
}

const getStrategyLevelLineWeight = (level: BacktestGraphStrategyLevel) => {
  const step = getStrategyLevelStep(level)
  const opacityByStep = [0.42, 0.24, 0.36, 0.52]
  const widthByStep = [1.1, 0.85, 1, 1.18]

  if (level.tone === 'full-sell' || level.tone === 'full-buy' || level.tone === 'reentry-buy') {
    return { opacity: 0.48, width: 1.22 }
  }

  return {
    opacity: opacityByStep[step] ?? opacityByStep[0],
    width: widthByStep[step] ?? widthByStep[0],
  }
}

const getStrategyLevelChartLabel = (level: BacktestGraphStrategyLevel, fallbackLabel: string) => {
  if (level.group === '급락 매수') return '급락매수'
  if (level.group === '급락 전량매도') return '급락매도'
  if (level.group === '재진입 전량매수') return '재매수'

  const step = getStrategyLevelStep(level)
  return step > 0 ? `${step}차` : fallbackLabel
}

const isTradeAction = (action: BacktestGraphAction) =>
  action.tone === 'buy' ||
  action.tone === 'sell' ||
  action.tone === 'full-buy' ||
  action.tone === 'full-sell' ||
  action.tone === 'reentry-buy'

const waitForChartPaint = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })

const sanitizeFileName = (name: string) =>
  name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80)

const downloadUrl = (href: string, fileName: string) => {
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const getSupportedVideoDownloadFormat = (): VideoDownloadFormat => {
  const supportedFormat = videoDownloadFormats.find(
    ({ mimeType }) => mimeType && MediaRecorder.isTypeSupported(mimeType),
  )

  return supportedFormat ?? { extension: 'webm' }
}

const createWhiteBackgroundVideoStream = (sourceCanvas: HTMLCanvasElement) => {
  const exportCanvas = document.createElement('canvas')
  const context = exportCanvas.getContext('2d', { alpha: false })

  if (!context || typeof exportCanvas.captureStream !== 'function') return null

  let animationFrame = 0
  let stopped = false

  const paintFrame = () => {
    if (stopped) return

    if (exportCanvas.width !== sourceCanvas.width || exportCanvas.height !== sourceCanvas.height) {
      exportCanvas.width = sourceCanvas.width
      exportCanvas.height = sourceCanvas.height
    }

    context.fillStyle = exportBackgroundColor
    context.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    context.drawImage(sourceCanvas, 0, 0)
    animationFrame = window.requestAnimationFrame(paintFrame)
  }

  paintFrame()

  return {
    stream: exportCanvas.captureStream(30),
    stop: () => {
      stopped = true
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
    },
  }
}

export function BacktestGraph({
  points,
  actions,
  strategyLevels = [],
  summary,
  formatter,
  labels,
  initialMode = 'simulation',
  initialSpeed = 2,
  className,
  onStrategyLevelChange,
}: BacktestGraphProps) {
  const chartElRef = useRef<HTMLDivElement | null>(null)
  const chartInstanceRef = useRef<EChartsInstance | null>(null)
  const echartsModuleRef = useRef<EChartsModule | null>(null)
  const frameRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedStreamRef = useRef<MediaStream | null>(null)
  const videoCaptureCleanupRef = useRef<(() => void) | null>(null)
  const draggingStrategyLevelIdRef = useRef<string | null>(null)
  const [mode, setMode] = useState<'simulation' | 'result'>(initialMode)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<BacktestGraphSpeed>(initialSpeed)
  const [progress, setProgress] = useState(0)
  const [isRecordingVideo, setIsRecordingVideo] = useState(false)
  const text = useMemo(() => ({ ...defaultLabels, ...labels }), [labels])
  const format = useMemo(() => mergeFormatter(formatter), [formatter])
  const renderPoints = useMemo(() => normalizePoints(points), [points])
  const maxProgress = Math.max(renderPoints.length - 1, 0)
  const simIndex = Math.min(Math.floor(progress), maxProgress)
  const currentPoint = interpolatePoint(renderPoints, progress) ?? renderPoints[renderPoints.length - 1] ?? null
  const visiblePoints = useMemo(() => getVisiblePoints(renderPoints, progress), [progress, renderPoints])
  const visibleActions = useMemo(
    () => actions.filter((action) => action.index <= simIndex),
    [actions, simIndex],
  )
  const simulationFinished = renderPoints.length > 0 && progress >= maxProgress
  const progressPercent = maxProgress > 0 ? Math.min(100, (progress / maxProgress) * 100) : 0
  const rootClassName = ['backtest-graph', className].filter(Boolean).join(' ')

  useEffect(() => {
    const resetFrame = window.requestAnimationFrame(() => {
      setProgress(0)
      setIsPlaying(false)
    })

    return () => window.cancelAnimationFrame(resetFrame)
  }, [actions, points])

  useEffect(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    lastFrameRef.current = null

    if (!isPlaying || renderPoints.length <= 1) return

    const frame = (timestamp: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = timestamp
      }

      const delta = timestamp - lastFrameRef.current
      lastFrameRef.current = timestamp

      setProgress((current) => {
        const next = Math.min(current + delta / playbackDurations[speed], maxProgress)
        if (next >= maxProgress) {
          window.requestAnimationFrame(() => setIsPlaying(false))
        }
        return next
      })

      frameRef.current = window.requestAnimationFrame(frame)
    }

    frameRef.current = window.requestAnimationFrame(frame)

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      lastFrameRef.current = null
    }
  }, [isPlaying, maxProgress, renderPoints.length, speed])

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      videoCaptureCleanupRef.current?.()
      videoCaptureCleanupRef.current = null
      recordedStreamRef.current?.getTracks().forEach((track) => track.stop())
      chartInstanceRef.current?.dispose()
      chartInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isRecordingVideo || !simulationFinished) return

    const stopTimer = window.setTimeout(() => {
      setIsPlaying(false)
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }, 450)

    return () => window.clearTimeout(stopTimer)
  }, [isRecordingVideo, simulationFinished])

  useEffect(() => {
    if (mode !== 'simulation') {
      chartInstanceRef.current?.dispose()
      chartInstanceRef.current = null
      return
    }

    if (!chartElRef.current || renderPoints.length === 0) return

    let disposed = false
    let removeResize: (() => void) | undefined
    let removeChartInteraction: (() => void) | undefined

    const renderChart = async () => {
      const echarts = echartsModuleRef.current ?? (await import('echarts'))
      echartsModuleRef.current = echarts

      if (!chartElRef.current) return

      const chart =
        chartInstanceRef.current && !chartInstanceRef.current.isDisposed()
          ? chartInstanceRef.current
          : echarts.init(chartElRef.current)

      if (disposed) {
        chart.dispose()
        return
      }

      chartInstanceRef.current = chart

      const priceValues = renderPoints.map((point) => point.price)
      const levelPriceValues = strategyLevels.map((level) => level.price)
      const profitValues = renderPoints.map((point) => point.profit)
      const priceMin = Math.min(...priceValues, ...levelPriceValues)
      const priceMax = Math.max(...priceValues, ...levelPriceValues)
      const yMin = priceMin === priceMax ? priceMin * 0.98 : priceMin * 0.985
      const yMax = priceMin === priceMax ? priceMax * 1.02 : priceMax * 1.015
      const profitAbsMax = Math.max(...profitValues.map((value) => Math.abs(value)), 1)
      const eventScatter = visibleActions.filter(isTradeAction).map((action) => {
        const visual = getActionVisual(action)
        return {
          value: [action.index, action.price],
          name: action.title,
          labelText: getActionPointLabel(action),
          itemStyle: {
            color: visual.color,
            borderColor: '#ffffff',
            borderWidth: action.tone === 'full-buy' || action.tone === 'full-sell' ? 4 : 3,
          },
          symbol: visual.symbol,
          symbolSize: action.tone === 'full-buy' || action.tone === 'full-sell' ? 22 : 15,
        }
      })
      const eventMarkLines = actions
        .filter(isTradeAction)
        .map((action, eventIndex) => {
          const visual = getActionVisual(action)
          const isPast = action.index <= simIndex
          const labelText = getActionPointLabel(action)
          return {
            xAxis: action.index,
            name: labelText,
            lineStyle: {
              color: visual.color,
              opacity: isPast ? 0.62 : 0.24,
              type: visual.lineType,
              width: visual.width,
            },
            label: {
              align: 'center' as const,
              backgroundColor: '#ffffff',
              borderColor: visual.color,
              borderRadius: 7,
              borderWidth: 1,
              color: visual.color,
              distance: 8 + (eventIndex % 2) * 30,
              fontSize: 12,
              fontWeight: 900,
              formatter: labelText,
              show: false,
              opacity: isPast ? 1 : 0.7,
              padding: [5, 7],
              position: 'insideEndTop' as const,
              rotate: 0,
              verticalAlign: 'bottom' as const,
            },
          }
        })
      const strategyMarkLines = strategyLevels.map((level) => {
        const visual = getStrategyLevelVisual(level)
        const lineWeight = getStrategyLevelLineWeight(level)
        const triggerText =
          typeof level.trigger === 'number' ? ` ${level.trigger > 0 ? '+' : ''}${level.trigger}%` : ''
        const shortLabel = level.shortLabel ?? visual.label
        const chartLabel = getStrategyLevelChartLabel(level, shortLabel)
        const labelText = `${shortLabel}${triggerText} · ${format.price(level.price)}`

        return {
          yAxis: level.price,
          name: labelText,
          lineStyle: {
            color: visual.color,
            opacity: lineWeight.opacity,
            type: visual.lineType,
            width: lineWeight.width,
          },
          label: {
            backgroundColor: '#ffffff',
            borderColor: visual.color,
            borderRadius: 7,
            borderWidth: 1,
            color: visual.color,
            fontSize: 11,
            fontWeight: 900,
            formatter: chartLabel,
            opacity: Math.min(0.92, lineWeight.opacity + 0.32),
            padding: [4, 6],
            position: 'end' as const,
            show: Boolean(chartLabel),
          },
        }
      })
      const option: EChartsOption = {
        animation: true,
        animationDuration: 260,
        backgroundColor: exportBackgroundColor,
        title: {
          top: 0,
          left: 8,
          text: text.title,
          textStyle: { color: '#111827', fontSize: 15, fontWeight: 900 },
        },
        legend: {
          top: 30,
          right: 8,
          itemWidth: 20,
          itemHeight: 12,
          textStyle: { color: '#333d4b', fontSize: 13, fontWeight: 800 },
        },
        grid: { left: 56, right: 116, top: 118, bottom: 42 },
        tooltip: {
          trigger: 'axis',
          formatter: (params: unknown) => {
            const rows = Array.isArray(params) ? params : [params]
            const row = rows[0] as { axisValue?: number }
            const point = interpolatePoint(renderPoints, Number(row.axisValue ?? 0))
            return point ? format.tooltip(point) : ''
          },
        },
        xAxis: {
          type: 'value',
          min: 0,
          max: maxProgress,
          axisLine: { lineStyle: { color: chartAxisLineColor, width: 1 } },
          axisTick: { show: false, lineStyle: { color: chartAxisLineColor, width: 1 } },
          axisLabel: {
            color: chartAxisLabelColor,
            fontSize: 11,
            formatter: (value: number) => renderPoints[Math.round(value)]?.time ?? '',
          },
          splitLine: { lineStyle: { color: chartGridLineColor, width: 1 } },
        },
        yAxis: [
          {
            type: 'value',
            min: yMin,
            max: yMax,
            axisLine: { lineStyle: { color: chartAxisLineColor, width: 1 } },
            axisTick: { show: false, lineStyle: { color: chartAxisLineColor, width: 1 } },
            axisLabel: {
              color: chartAxisLabelColor,
              fontSize: 11,
              formatter: (value: number) => format.price(value),
            },
            splitLine: { lineStyle: { color: chartGridLineColor, width: 1 } },
          },
          {
            type: 'value',
            min: -profitAbsMax * 1.2,
            max: profitAbsMax * 1.2,
            axisLine: { lineStyle: { color: chartAxisLineColor, width: 1 } },
            axisTick: { show: false, lineStyle: { color: chartAxisLineColor, width: 1 } },
            axisLabel: {
              color: chartAxisLabelColor,
              fontSize: 11,
              formatter: (value: number) => format.signedMoney(value),
            },
            splitLine: { show: false },
          },
        ],
        series: [
          {
            name: 'Price',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 7,
            data: visiblePoints.map((point) => [point.renderIndex, point.price]),
            lineStyle: { width: 4, color: '#0b6bff' },
            itemStyle: { color: '#0b6bff' },
            areaStyle: { color: 'rgba(11, 107, 255, 0.08)' },
            markLine: {
              animation: false,
              emphasis: { disabled: true },
              symbol: ['none', 'none'],
              data: [...strategyMarkLines, ...eventMarkLines],
            },
          },
          {
            name: 'Profit',
            type: 'line',
            smooth: true,
            yAxisIndex: 1,
            symbol: 'none',
            data: visiblePoints.map((point) => [point.renderIndex, point.profit]),
            lineStyle: { width: 3, color: '#f04452', type: 'dashed' },
            areaStyle: { color: 'rgba(240, 68, 82, 0.06)' },
          },
          {
            name: 'Events',
            type: 'scatter',
            data: eventScatter,
            label: {
              show: true,
              backgroundColor: '#ffffff',
              borderRadius: 7,
              borderWidth: 1,
              color: '#333d4b',
              formatter: (params: unknown) => {
                const data = (params as { data?: { labelText?: string } | null }).data
                return data?.labelText ?? ''
              },
              fontSize: 12,
              fontWeight: 800,
              padding: [5, 7],
              position: 'top',
            },
          },
        ],
      }

      chart.setOption(option, true)

      const chartElement = chartElRef.current
      const editableStrategyLevels = strategyLevels.filter(
        (level) => level.id && Number.isFinite(level.price) && level.price > 0,
      )
      const resetChartCursor = () => {
        if (chartElement) chartElement.style.cursor = ''
      }
      const getLevelNearPointer = (offsetY?: number) => {
        if (!onStrategyLevelChange || typeof offsetY !== 'number') return null

        return editableStrategyLevels.reduce<BacktestGraphStrategyLevel | null>((closest, level) => {
          const pixel = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [0, level.price])
          const yPixel = Array.isArray(pixel) ? Number(pixel[1]) : Number(pixel)
          if (!Number.isFinite(yPixel)) return closest

          const distance = Math.abs(yPixel - offsetY)
          if (distance > 12) return closest
          if (!closest) return level

          const closestPixel = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [0, closest.price])
          const closestYPixel = Array.isArray(closestPixel) ? Number(closestPixel[1]) : Number(closestPixel)
          return distance < Math.abs(closestYPixel - offsetY) ? level : closest
        }, null)
      }
      const getPriceFromPointer = (offsetY?: number) => {
        if (typeof offsetY !== 'number') return null
        const converted = chart.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [0, offsetY])
        const price = Array.isArray(converted) ? Number(converted[1]) : Number(converted)
        return Number.isFinite(price) && price > 0 ? price : null
      }
      const handlePointerDown = (event: ZrPointerEvent) => {
        const targetLevel = getLevelNearPointer(event.offsetY)
        if (!targetLevel?.id) return

        draggingStrategyLevelIdRef.current = targetLevel.id
        if (chartElement) chartElement.style.cursor = 'ns-resize'
        event.event?.preventDefault?.()
      }
      const handlePointerMove = (event: ZrPointerEvent) => {
        const draggingId = draggingStrategyLevelIdRef.current
        if (!draggingId) {
          if (!chartElement) return
          chartElement.style.cursor = getLevelNearPointer(event.offsetY) ? 'ns-resize' : ''
          return
        }

        const nextPrice = getPriceFromPointer(event.offsetY)
        const level = editableStrategyLevels.find((item) => item.id === draggingId)
        if (!level || nextPrice === null) return

        onStrategyLevelChange?.({
          id: draggingId,
          price: Number(nextPrice.toFixed(4)),
          referencePrice: level.referencePrice,
        })
      }
      const handlePointerUp = () => {
        draggingStrategyLevelIdRef.current = null
        resetChartCursor()
      }

      if (onStrategyLevelChange && editableStrategyLevels.length > 0) {
        const zr = chart.getZr()
        zr.on('mousedown', handlePointerDown)
        zr.on('mousemove', handlePointerMove)
        zr.on('mouseup', handlePointerUp)
        zr.on('globalout', handlePointerUp)
        removeChartInteraction = () => {
          zr.off('mousedown', handlePointerDown)
          zr.off('mousemove', handlePointerMove)
          zr.off('mouseup', handlePointerUp)
          zr.off('globalout', handlePointerUp)
          draggingStrategyLevelIdRef.current = null
          resetChartCursor()
        }
      }

      const resize = () => chart.resize()
      window.addEventListener('resize', resize)
      removeResize = () => window.removeEventListener('resize', resize)
    }

    void renderChart()

    return () => {
      disposed = true
      removeResize?.()
      removeChartInteraction?.()
    }
  }, [
    actions,
    format,
    maxProgress,
    mode,
    onStrategyLevelChange,
    renderPoints,
    simIndex,
    strategyLevels,
    text.title,
    visibleActions,
    visiblePoints,
  ])

  const resetSimulation = () => {
    setIsPlaying(false)
    setProgress(0)
  }

  const togglePlayback = () => {
    setMode('simulation')
    if (simulationFinished) {
      setProgress(0)
      setIsPlaying(true)
      return
    }

    setIsPlaying((current) => !current)
  }

  const jumpToAction = (action: BacktestGraphAction) => {
    setMode('simulation')
    setIsPlaying(false)
    setProgress(clampProgress(action.index, maxProgress))
  }

  const handleProgressChange = (value: string) => {
    setIsPlaying(false)
    setProgress(clampProgress(Number(value), maxProgress))
  }

  const getDownloadBaseName = () => sanitizeFileName(`${text.title}-${new Date().toISOString().slice(0, 10)}`)

  const saveFinalImage = async () => {
    if (renderPoints.length === 0) return

    setMode('simulation')
    setIsPlaying(false)
    setProgress(maxProgress)
    await waitForChartPaint()

    const dataUrl = chartInstanceRef.current?.getDataURL({
      backgroundColor: exportBackgroundColor,
      pixelRatio: 2,
      type: 'png',
    })

    if (dataUrl) {
      downloadUrl(dataUrl, `${getDownloadBaseName()}-final.png`)
    }
  }

  const saveVideo = async () => {
    if (renderPoints.length === 0 || isRecordingVideo) return

    const canvas = chartElRef.current?.querySelector('canvas')
    if (!canvas || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      return
    }

    setMode('simulation')
    setIsPlaying(false)
    setProgress(0)
    await waitForChartPaint()

    const videoCapture = createWhiteBackgroundVideoStream(canvas)
    if (!videoCapture) return

    recordedStreamRef.current = videoCapture.stream
    videoCaptureCleanupRef.current = videoCapture.stop
    const videoFormat = getSupportedVideoDownloadFormat()
    const recorder = new MediaRecorder(
      videoCapture.stream,
      videoFormat.mimeType ? { mimeType: videoFormat.mimeType } : undefined,
    )
    const chunks: BlobPart[] = []

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    })
    recorder.addEventListener('stop', () => {
      videoCaptureCleanupRef.current?.()
      videoCaptureCleanupRef.current = null
      recordedStreamRef.current?.getTracks().forEach((track) => track.stop())
      recordedStreamRef.current = null
      mediaRecorderRef.current = null
      setIsRecordingVideo(false)

      if (chunks.length === 0) return

      const blob = new Blob(chunks, { type: videoFormat.mimeType ?? 'video/webm' })
      const url = URL.createObjectURL(blob)
      downloadUrl(url, `${getDownloadBaseName()}-replay.${videoFormat.extension}`)
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    })

    mediaRecorderRef.current = recorder
    setIsRecordingVideo(true)
    recorder.start()
    setIsPlaying(true)
  }

  return (
    <section className={rootClassName} aria-label={text.title}>
      <div className="backtest-graph-header">
        <div>
          <p className="backtest-graph-caption">{text.caption}</p>
          <h3>{text.title}</h3>
        </div>
        <div className="backtest-graph-mode-switch" role="group" aria-label={text.resultTable}>
          <button
            className={mode === 'simulation' ? 'active' : ''}
            disabled={isRecordingVideo}
            onClick={() => setMode('simulation')}
            type="button"
          >
            {text.simulationTab}
          </button>
          <button
            className={mode === 'result' ? 'active' : ''}
            disabled={isRecordingVideo}
            onClick={() => setMode('result')}
            type="button"
          >
            {text.resultTab}
          </button>
        </div>
      </div>

      {mode === 'simulation' ? (
        <>
          <div className="backtest-graph-controls">
            <button
              className="primary"
              disabled={renderPoints.length === 0 || isRecordingVideo}
              onClick={togglePlayback}
              type="button"
            >
              {isPlaying ? text.pause : simulationFinished ? text.replay : text.play}
            </button>
            <button disabled={renderPoints.length === 0 || isRecordingVideo} onClick={resetSimulation} type="button">
              {text.reset}
            </button>
            <div className="backtest-graph-speed-control" role="group" aria-label={text.speed}>
              {speedOptions.map((nextSpeed) => (
                <button
                  className={speed === nextSpeed ? 'active' : ''}
                  disabled={isRecordingVideo}
                  key={nextSpeed}
                  onClick={() => setSpeed(nextSpeed)}
                  type="button"
                >
                  {nextSpeed}x
                </button>
              ))}
            </div>
            <div className="backtest-graph-export-actions">
              <button disabled={renderPoints.length === 0 || isRecordingVideo} onClick={saveVideo} type="button">
                {isRecordingVideo ? text.recordingVideo : text.saveVideo}
              </button>
              <button disabled={renderPoints.length === 0 || isRecordingVideo} onClick={saveFinalImage} type="button">
                {text.saveFinalImage}
              </button>
            </div>
          </div>

          <div className="backtest-graph-grid">
            <div
              className="backtest-graph-chart-card"
              data-strategy-editable={onStrategyLevelChange ? 'true' : undefined}
            >
              <div ref={chartElRef} className="backtest-graph-chart">
                {renderPoints.length === 0 ? text.chartUnavailable : text.chartLoading}
              </div>
              <label className="backtest-graph-progress" aria-label={text.progress}>
                <span style={{ width: `${progressPercent}%` }} />
                <input
                  max={maxProgress}
                  min={0}
                  onChange={(event) => handleProgressChange(event.currentTarget.value)}
                  disabled={isRecordingVideo}
                  step={0.01}
                  type="range"
                  value={progress}
                />
              </label>
            </div>

            <aside className="backtest-graph-status-card">
              <span>{text.currentPoint}</span>
              <strong>{currentPoint?.time ?? '-'}</strong>
              <em className={currentPoint && currentPoint.profit >= 0 ? 'is-profit-up' : 'is-profit-down'}>
                {currentPoint ? format.signedPercent(currentPoint.profitRate) : '-'}
              </em>
              <dl>
                <div>
                  <dt>{text.currentPrice}</dt>
                  <dd>{currentPoint ? format.price(currentPoint.price) : '-'}</dd>
                </div>
                <div>
                  <dt>{text.moveRate}</dt>
                  <dd>{currentPoint ? format.signedPercent(currentPoint.moveRate) : '-'}</dd>
                </div>
                <div>
                  <dt>{text.quantity}</dt>
                  <dd>{currentPoint ? format.quantity(currentPoint.quantity) : '-'}</dd>
                </div>
                <div>
                  <dt>{text.cash}</dt>
                  <dd>{currentPoint ? format.money(currentPoint.cash) : '-'}</dd>
                </div>
                <div>
                  <dt>{text.portfolioValue}</dt>
                  <dd>{currentPoint ? format.money(currentPoint.portfolioValue) : '-'}</dd>
                </div>
                <div>
                  <dt>{text.profit}</dt>
                  <dd>{currentPoint ? format.signedMoney(currentPoint.profit) : '-'}</dd>
                </div>
                <div>
                  <dt>{text.strategyState}</dt>
                  <dd>{currentPoint?.strategyState ?? '-'}</dd>
                </div>
              </dl>
            </aside>
          </div>

          <div className="backtest-graph-event-timeline" aria-label={text.eventTimeline}>
            {actions.map((action) => (
              <button
                className={`backtest-graph-event-chip ${getToneClass(action)} ${action.index === simIndex ? 'active' : ''}`}
                key={action.id ?? `${action.index}-${action.time}-${action.title}`}
                onClick={() => jumpToAction(action)}
                type="button"
              >
                <time>{action.time}</time>
                <strong>{action.title}</strong>
                <span>{format.actionSummary(action)}</span>
              </button>
            ))}
          </div>

          {simulationFinished && (
            <div className="backtest-graph-final-summary" aria-live="polite">
              <span>
                <small>{text.finalProfit}</small>
                <strong>{format.signedMoney(summary.finalProfit)}</strong>
              </span>
              <span>
                <small>{text.finalProfitRate}</small>
                <strong>{format.signedPercent(summary.finalProfitRate)}</strong>
              </span>
              <span>
                <small>{text.tradeCount}</small>
                <strong>
                  {summary.sellCount ?? 0} / {summary.buyCount ?? 0}
                </strong>
              </span>
              <span>
                <small>{text.bestWorst}</small>
                <strong>
                  {summary.bestProfitRate === undefined ? '-' : format.percent(summary.bestProfitRate)} /{' '}
                  {summary.worstProfitRate === undefined ? '-' : format.percent(summary.worstProfitRate)}
                </strong>
              </span>
              {summary.extraItems?.map((item) => (
                <span key={item.label}>
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="backtest-graph-result-table" aria-label={text.resultTable}>
          <table>
            <thead>
              <tr>
                <th scope="col">{text.tableTime}</th>
                <th scope="col">{text.tableEvent}</th>
                <th scope="col">{text.tableCondition}</th>
                <th scope="col">{text.tableQuantity}</th>
                <th scope="col">{text.tablePrice}</th>
                <th scope="col">{text.tableProfitRate}</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr className={getToneClass(action)} key={action.id ?? `${action.index}-${action.time}-${action.title}`}>
                  <td>{action.time}</td>
                  <td>
                    <strong>{action.title}</strong>
                    <span>{action.detail}</span>
                  </td>
                  <td>{action.condition}</td>
                  <td>{format.quantity(action.quantity)}</td>
                  <td>{format.price(action.price)}</td>
                  <td>{format.signedPercent(action.profitRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
