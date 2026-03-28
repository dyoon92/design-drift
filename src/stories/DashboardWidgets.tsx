import React, { useState, useEffect, useId } from 'react'

// ─── Animation keyframes (injected once) ──────────────────────────────────────
const ANIM_CSS = `
@keyframes ds-fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes ds-revealX { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0% 0 0); } }
@keyframes ds-donutIn { from { opacity: 0; transform: scale(0.82); } to { opacity: 1; transform: scale(1); } }
`
let _animInjected = false
function useAnimStyles() {
  useEffect(() => {
    if (_animInjected) return
    _animInjected = true
    const el = document.createElement('style')
    el.textContent = ANIM_CSS
    document.head.appendChild(el)
  }, [])
}

// ─── Shared Icons ─────────────────────────────────────────────────────────────

const QuestionIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="7" stroke="#94A0B8" strokeWidth="1.2" />
    <path d="M6.8 6.2a1.3 1.3 0 012.2.9c0 .9-1.3 1.3-1.3 2.1" stroke="#94A0B8" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="8" cy="11.2" r="0.65" fill="#94A0B8" />
  </svg>
)

const TrendUpIcon = ({ color = '#08875D' }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M2 11L6.5 6.5l2.5 2.5L14 3" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 3H14v3.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const TrendDownIcon = ({ color = '#E12C3C' }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M2 5L6.5 9.5l2.5-2.5L14 13" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 13H14V9.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// ─── Shared Primitives ────────────────────────────────────────────────────────

const LinkBtn = ({ label }: { label: string }) => (
  <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--ds-color-primary)', fontFamily: 'Inter, sans-serif', padding: 0, letterSpacing: 0.24, whiteSpace: 'nowrap', flexShrink: 0 }}>
    {label}
  </button>
)

// Segmented control — matches Figma node 8104-364225 (Buttons=2, Size=Small)
// Container: borderRadius 8, bg #E1E5EF, gap 1px between buttons
// Button: padding 5px 16px, radius 7, fontSize 12 Medium, letterSpacing 0.24
const BtnGrp = ({ options, active, onChange }: { options: string[]; active: number; onChange: (i: number) => void }) => (
  <div style={{ display: 'flex', gap: 1, background: 'var(--ds-color-border)', borderRadius: 8, padding: 1 }}>
    {options.map((opt, i) => (
      <button
        key={opt}
        onClick={() => onChange(i)}
        style={{
          padding: '5px 16px', border: 'none', borderRadius: 7, cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', fontSize: 12,
          fontWeight: active === i ? 600 : 500,
          color: active === i ? 'var(--ds-color-primary)' : 'var(--ds-color-text-muted)',
          background: active === i ? 'var(--ds-color-primary-light)' : 'var(--ds-color-surface)',
          whiteSpace: 'nowrap', letterSpacing: 0.24,
        }}
      >{opt}</button>
    ))}
  </div>
)

export const cardStyle: React.CSSProperties = {
  background: 'var(--ds-color-surface)',
  border: '1px solid var(--ds-color-border)',
  borderRadius: 16,
  padding: '16px 20px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  fontFamily: 'Inter, sans-serif',
  minWidth: 0,
}

const CardHeader = ({ title, right, center, noIcon }: { title: string; right?: React.ReactNode; center?: React.ReactNode; noIcon?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 32, position: 'relative' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, zIndex: 1 }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-color-text-primary)', lineHeight: '24px' }}>{title}</span>
      {!noIcon && <QuestionIcon />}
    </div>
    {center && (
      <div style={{ position: 'absolute', left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>{center}</div>
      </div>
    )}
    {right && <div style={{ zIndex: 1 }}>{right}</div>}
  </div>
)

const Trend = ({ pct, direction, fromLabel }: { pct: string; direction: 'up' | 'down'; fromLabel?: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
    {direction === 'up' ? <TrendUpIcon /> : <TrendDownIcon />}
    <span style={{ fontSize: 14, fontWeight: 700, color: direction === 'up' ? '#08875D' : '#E12C3C' }}>{pct}</span>
    {fromLabel && <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--ds-color-text-muted)' }}>{fromLabel}</span>}
  </div>
)

// ─── Chart Utilities ──────────────────────────────────────────────────────────

function normalize(data: number[], w: number, h: number, padY = 3): [number, number][] {
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  return data.map((v, i) => [
    (i / (data.length - 1)) * w,
    padY + (1 - (v - min) / range) * (h - padY * 2),
  ])
}

function smooth(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1][0] + pts[i][0]) / 2
    d += ` C ${cpx.toFixed(1)} ${pts[i-1][1].toFixed(1)}, ${cpx.toFixed(1)} ${pts[i][1].toFixed(1)}, ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`
  }
  return d
}

function areaPath(pts: [number, number][], h: number): string {
  return `${smooth(pts)} L ${pts[pts.length-1][0].toFixed(1)} ${h} L ${pts[0][0].toFixed(1)} ${h} Z`
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Tooltip pill shared style
const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  background: 'var(--ds-color-text-primary)',
  color: 'var(--ds-color-surface)',
  fontSize: 11,
  fontWeight: 600,
  padding: '3px 8px',
  borderRadius: 5,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  zIndex: 10,
  fontFamily: 'Inter, sans-serif',
  lineHeight: '16px',
}

// Full line chart with y-axis + x-axis
// NOTE: CSS custom properties do NOT resolve inside SVG gradient stopColor — use literal hex only
const LineChart = ({ data, color, hexColor, yLabels, format }: {
  data: number[]; color: string; hexColor: string; yLabels: string[]; format?: (v: number) => string
}) => {
  const uid = useId()
  const gradId = `lg-${uid}`
  const yW = 30, chartH = 100
  const [hovIdx, setHovIdx] = useState<number | null>(null)
  const pts = normalize(data, 500, chartH)

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = (e.clientX - rect.left) / rect.width * 500
    let nearest = 0, minDist = Infinity
    pts.forEach(([x], i) => { const d = Math.abs(x - svgX); if (d < minDist) { minDist = d; nearest = i } })
    setHovIdx(nearest)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ width: yW, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 2 }}>
          {yLabels.map(l => <span key={l} style={{ fontSize: 10, color: 'var(--ds-color-text-muted)', textAlign: 'right', paddingRight: 5, lineHeight: '13px' }}>{l}</span>)}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <svg
            style={{ width: '100%', height: '100%', display: 'block', animation: 'ds-revealX 1s ease-out forwards', cursor: 'crosshair' }}
            viewBox={`0 0 500 ${chartH}`}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHovIdx(null)}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={hexColor} stopOpacity="0.18" />
                <stop offset="100%" stopColor={hexColor} stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {yLabels.map((_, i) => (
              <line key={i} x1={0} y1={(i / (yLabels.length-1)) * chartH} x2={500} y2={(i / (yLabels.length-1)) * chartH} stroke="#e1e6ef" strokeWidth={1} />
            ))}
            <path d={areaPath(pts, chartH)} fill={`url(#${gradId})`} />
            <path d={smooth(pts)} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {hovIdx !== null && (
              <>
                <line
                  x1={pts[hovIdx][0]} y1={0} x2={pts[hovIdx][0]} y2={chartH}
                  stroke="#94a0b8" strokeWidth="1" strokeDasharray="3 2" vectorEffect="non-scaling-stroke"
                />
                <circle cx={pts[hovIdx][0]} cy={pts[hovIdx][1]} r="3" fill={color} vectorEffect="non-scaling-stroke" />
              </>
            )}
          </svg>
          {hovIdx !== null && (
            <div style={{
              ...tooltipStyle,
              left: `${pts[hovIdx][0] / 500 * 100}%`,
              top: `${pts[hovIdx][1] / chartH * 100}%`,
              transform: 'translate(-50%, calc(-100% - 8px))',
            }}>
              {months[hovIdx]}: {format ? format(data[hovIdx]) : data[hovIdx]}
            </div>
          )}
        </div>
      </div>
      <div style={{ paddingLeft: yW, display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {months.map(m => <span key={m} style={{ fontSize: 10, color: 'var(--ds-color-text-muted)' }}>{m}</span>)}
      </div>
    </div>
  )
}

// Mini sparkline (no axes) — hexColor required for SVG gradient
const VB_H = 44
const Sparkline = ({ data, color, hexColor, format }: {
  data: number[]; color: string; hexColor: string; format?: (v: number) => string
}) => {
  const uid = useId()
  const gradId = `sp-${uid}`
  const [hovIdx, setHovIdx] = useState<number | null>(null)
  const pts = normalize(data, 200, VB_H)

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = (e.clientX - rect.left) / rect.width * 200
    let nearest = 0, minDist = Infinity
    pts.forEach(([x], i) => { const d = Math.abs(x - svgX); if (d < minDist) { minDist = d; nearest = i } })
    setHovIdx(nearest)
  }

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0, alignSelf: 'stretch', display: 'flex' }}>
      <svg
        style={{ flex: 1, width: '100%', height: '100%', display: 'block', minWidth: 0, animation: 'ds-revealX 1s ease-out forwards', cursor: 'crosshair' }}
        viewBox={`0 0 200 ${VB_H}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovIdx(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hexColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={hexColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={areaPath(pts, VB_H)} fill={`url(#${gradId})`} />
        <path d={smooth(pts)} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {hovIdx !== null && (
          <>
            <line
              x1={pts[hovIdx][0]} y1={0} x2={pts[hovIdx][0]} y2={VB_H}
              stroke="#94a0b8" strokeWidth="1" strokeDasharray="3 2" vectorEffect="non-scaling-stroke"
            />
            <circle cx={pts[hovIdx][0]} cy={pts[hovIdx][1]} r="3" fill={color} vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      {hovIdx !== null && (
        <div style={{
          ...tooltipStyle,
          left: `${pts[hovIdx][0] / 200 * 100}%`,
          top: `${pts[hovIdx][1] / VB_H * 100}%`,
          transform: 'translate(-50%, calc(-100% - 6px))',
        }}>
          {months[hovIdx]}: {format ? format(data[hovIdx]) : data[hovIdx]}
        </div>
      )}
    </div>
  )
}

// Leads chart (3 grid lines) — purple
const LeadsChart = ({ data }: { data: number[] }) => (
  <LineChart data={data} color="#7D52F8" hexColor="#7D52F8" yLabels={['600', '300', '0']} format={v => String(v)} />
)

// Bar chart — single stacked bar per month: move-ins above 0, move-outs below 0
const BarChart = ({ moveIns, moveOuts }: { moveIns: number[]; moveOuts: number[] }) => {
  const yLabels = ['300', '150', '0', '-150', '-300']
  const chartH = 100, maxVal = 52
  const midY = chartH / 2, scale = midY / maxVal * 0.88
  const bw = 18, gap = 500 / moveIns.length
  const rx = 2
  const [hovMonth, setHovMonth] = useState<number | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ width: 30, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 2 }}>
          {yLabels.map(l => <span key={l} style={{ fontSize: 10, color: 'var(--ds-color-text-muted)', textAlign: 'right', paddingRight: 5, lineHeight: '13px' }}>{l}</span>)}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <svg
            style={{ flex: 1, width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
            viewBox={`0 0 500 ${chartH}`}
            preserveAspectRatio="none"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const svgX = (e.clientX - rect.left) / rect.width * 500
              setHovMonth(Math.max(0, Math.min(moveIns.length - 1, Math.floor(svgX / gap))))
            }}
            onMouseLeave={() => setHovMonth(null)}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
              <line key={i} x1={0} y1={p * chartH} x2={500} y2={p * chartH} stroke="#e1e6ef" strokeWidth={1} />
            ))}
            {moveIns.map((ins, i) => {
              const cx = i * gap + gap / 2
              const insH = Math.max(ins * scale, 2)
              const outsH = Math.max(moveOuts[i] * scale, 2)
              const x = cx - bw / 2
              const dimmed = hovMonth !== null && hovMonth !== i
              return (
                <g key={i}>
                  <path
                    d={`M${x + rx},${midY - insH} h${bw - rx * 2} a${rx},${rx} 0 0 1 ${rx},${rx} v${insH - rx} h${-bw} v${-(insH - rx)} a${rx},${rx} 0 0 1 ${rx},${-rx}z`}
                    fill="#7D52F8"
                    opacity={dimmed ? 0.25 : 1}
                  />
                  <path
                    d={`M${x},${midY} v${outsH - rx} a${rx},${rx} 0 0 0 ${rx},${rx} h${bw - rx * 2} a${rx},${rx} 0 0 0 ${rx},${-rx} v${-(outsH - rx)} z`}
                    fill="#9BA3B8"
                    opacity={dimmed ? 0.25 : 1}
                  />
                </g>
              )
            })}
          </svg>
          {hovMonth !== null && (() => {
            const cx = hovMonth * gap + gap / 2
            return (
              <div style={{
                ...tooltipStyle,
                left: `${cx / 500 * 100}%`,
                top: '4px',
                transform: 'translateX(-50%)',
              }}>
                <span style={{ opacity: 0.7, fontWeight: 400 }}>{months[hovMonth]}</span>
                {'  '}
                <span style={{ color: '#BDA9F5' }}>▲{moveIns[hovMonth]}</span>
                {'  '}
                <span style={{ color: '#CBD3E1' }}>▼{moveOuts[hovMonth]}</span>
              </div>
            )
          })()}
        </div>
      </div>
      <div style={{ paddingLeft: 30, display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {months.map(m => <span key={m} style={{ fontSize: 10, color: 'var(--ds-color-text-muted)' }}>{m}</span>)}
      </div>
    </div>
  )
}

// Donut chart
function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  const rad = (angle - 90) * Math.PI / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}
function donutArc(cx: number, cy: number, r: number, inn: number, a1: number, a2: number) {
  const s = polar(cx, cy, r, a1), e = polar(cx, cy, r, a2)
  const is = polar(cx, cy, inn, a2), ie = polar(cx, cy, inn, a1)
  const large = a2 - a1 > 180 ? 1 : 0
  return `M${s[0].toFixed(2)} ${s[1].toFixed(2)} A${r} ${r} 0 ${large} 1 ${e[0].toFixed(2)} ${e[1].toFixed(2)} L${is[0].toFixed(2)} ${is[1].toFixed(2)} A${inn} ${inn} 0 ${large} 0 ${ie[0].toFixed(2)} ${ie[1].toFixed(2)}Z`
}
const DonutChart = ({ segs, size = 130 }: { segs: { pct: number; color: string; label?: string }[]; size?: number }) => {
  const cx = size / 2, cy = size / 2, r = size * 0.46, inn = size * 0.31
  const [hovSeg, setHovSeg] = useState<number | null>(null)
  let angle = -90
  const validSegs = segs.filter(s => s.pct > 0.005)
  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', aspectRatio: '1' }}>
      {validSegs.map((seg, i) => {
        const sweep = seg.pct * 360
        const path = donutArc(cx, cy, r, inn, angle, angle + sweep - 0.8)
        angle += sweep
        return (
          <path
            key={i}
            d={path}
            fill={seg.color}
            opacity={hovSeg !== null && hovSeg !== i ? 0.25 : 1}
            style={{ transformOrigin: `${cx}px ${cy}px`, animation: `ds-donutIn 0.45s ease-out ${i * 0.07}s both`, cursor: 'pointer' }}
            onMouseEnter={() => setHovSeg(i)}
            onMouseLeave={() => setHovSeg(null)}
          />
        )
      })}
      {hovSeg !== null && validSegs[hovSeg] && (
        <>
          <text
            x={cx} y={cy + size * 0.05}
            textAnchor="middle"
            fontSize={size * 0.13}
            fontWeight="700"
            fontFamily="Inter, sans-serif"
            style={{ fill: 'var(--ds-color-text-primary)' }}
          >
            {(validSegs[hovSeg].pct * 100).toFixed(0)}%
          </text>
          {validSegs[hovSeg].label && (
            <text
              x={cx} y={cy + size * 0.05 + size * 0.1}
              textAnchor="middle"
              fontSize={size * 0.08}
              fontFamily="Inter, sans-serif"
              style={{ fill: 'var(--ds-color-text-muted)' }}
            >
              {validSegs[hovSeg].label}
            </text>
          )}
        </>
      )}
    </svg>
  )
}

const ColorDot = ({ color }: { color: string }) => (
  <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
)

// ─── Sample Data ──────────────────────────────────────────────────────────────

const OCCUPANCY_DATA = [82, 79, 85, 91, 94, 88, 85, 89, 82, 75, 60, 52]
const REVENUE_DATA = [8.2, 10.4, 11.2, 13.5, 16.8, 14.4, 12.8, 15.6, 13.2, 14.8, 12.6, 14.2]
const MOVE_INS =  [38, 45, 32, 42, 28, 48, 43, 52, 38, 35, 28, 42]
const MOVE_OUTS = [22, 28, 18, 32, 14, 38, 28, 42, 18, 28, 14, 32]
const LEADS_DATA = [280, 320, 390, 370, 460, 440, 510, 490, 550, 530, 580, 560]
const PROTECTION_DATA = [58, 59, 61, 60, 62, 63, 62, 64, 63, 62.5, 62.5, 62.5]
const AUTOPAY_DATA = [56, 57, 58, 59, 60, 61, 61, 62, 62.1, 62.1, 62.1, 62.1]

// ─── Widget: Occupancy ────────────────────────────────────────────────────────

export const OccupancyWidget = () => {
  useAnimStyles()
  const [active, setActive] = useState(0)
  return (
    <div style={{ ...cardStyle, height: '100%', boxSizing: 'border-box' }}>
      <CardHeader title="Occupancy" center={<BtnGrp options={['Unit', 'Per Sq. Ft']} active={active} onChange={setActive} />} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -1, color: 'var(--ds-color-text-primary)', lineHeight: '28px' }}>89%</span>
          <Trend pct="1.8%" direction="down" />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -1, color: 'var(--ds-color-text-primary)', lineHeight: '24px' }}>81%</span>
            <QuestionIcon />
          </div>
          <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Economic Occupancy</span>
        </div>
      </div>
      <LineChart data={OCCUPANCY_DATA} color="#E12C3C" hexColor="#E12C3C" yLabels={['100%', '75%', '50%', '25%', '0%']} format={v => `${v}%`} />
    </div>
  )
}

// ─── Widget: Revenue ─────────────────────────────────────────────────────────

export const RevenueWidget = () => {
  const [active, setActive] = useState(0)
  return (
    <div style={{ ...cardStyle, height: '100%', boxSizing: 'border-box' }}>
      <CardHeader title="Revenue" center={<BtnGrp options={['Revenue', 'Per Sq. Ft.']} active={active} onChange={setActive} />} right={<LinkBtn label="Manage" />} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -1, color: 'var(--ds-color-text-primary)', lineHeight: '28px' }}>$14.2k</span>
        <Trend pct="1.8%" direction="up" fromLabel="From last period" />
      </div>
      <LineChart data={REVENUE_DATA} color="#7D52F8" hexColor="#7D52F8" yLabels={['$20k', '$10k', '$0k']} format={v => `$${v}k`} />
      <div style={{ display: 'flex', gap: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>$85</span>
          <QuestionIcon />
          <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Variance Cost</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>$1.8k</span>
          <QuestionIcon />
          <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Vacancy Cost</span>
        </div>
      </div>
    </div>
  )
}

// ─── Widget: Net Move-Ins ─────────────────────────────────────────────────────

export const NetMoveInsWidget = () => (
  <div style={{ ...cardStyle, height: '100%', boxSizing: 'border-box' }}>
    <CardHeader title="Net Move-Ins" right={<LinkBtn label="Contact Leads" />} />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -1, color: 'var(--ds-color-text-primary)', display: 'block', lineHeight: '28px' }}>270</span>
        <Trend pct="23.7%" direction="up" fromLabel="From last period" />
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ColorDot color="#7D52F8" />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>452</span>
            <TrendUpIcon />
          </div>
          <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Move-Ins</span>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ColorDot color="#9BA3B8" />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>182</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Move-Outs</span>
        </div>
      </div>
    </div>
    <BarChart moveIns={MOVE_INS} moveOuts={MOVE_OUTS} />
  </div>
)

// ─── Widget: Leads ────────────────────────────────────────────────────────────

export const LeadsWidget = () => (
  <div style={{ ...cardStyle, height: '100%', boxSizing: 'border-box' }}>
    <CardHeader title="Leads" right={<LinkBtn label="Contact Leads" />} />
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -1, color: 'var(--ds-color-text-primary)', lineHeight: '28px' }}>546</span>
        <Trend pct="1.8%" direction="up" fromLabel="From last period" />
      </div>
      <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>New Leads</span>
    </div>
    <LeadsChart data={LEADS_DATA} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -1, color: 'var(--ds-color-text-primary)' }}>49%</span>
      <Trend pct="1.8%" direction="up" />
      <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Conversion Rate</span>
    </div>
  </div>
)

// ─── Widget: Past Due ─────────────────────────────────────────────────────────

const PAST_DUE_SEGS = [
  { pct: 0.45, color: '#3570DE', label: '0-30 days' },
  { pct: 0.22, color: '#BDA9F5', label: '31-60 days' },
  { pct: 0.23, color: '#08875D', label: '61-90 days' },
  { pct: 0.10, color: '#E12C3C', label: '91+ days' },
]
const PAST_DUE_ROWS = [
  { range: '0-30',  color: '#3570DE', amount: '$1,252.99' },
  { range: '31-60', color: '#BDA9F5', amount: '$26,243.33' },
  { range: '61-90', color: '#08875D', amount: '$252,324.73' },
  { range: '91+',   color: '#E12C3C', amount: '$1,242.52' },
]

export const PastDueWidget = () => (
  <div style={{ ...cardStyle, height: '100%', boxSizing: 'border-box' }}>
    <CardHeader title="Past Due" right={<LinkBtn label="Manage" />} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -1, color: 'var(--ds-color-text-primary)', display: 'block', lineHeight: '28px' }}>$2.1k</span>
        <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Total Amount</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -1, color: 'var(--ds-color-text-primary)', lineHeight: '28px' }}>4%</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#08875D' }}>+1.2%</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>of Units</span>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minHeight: 0 }}>
      {/* Table */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ds-color-text-muted)' }}>Age</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ds-color-text-muted)' }}>Amount</span>
        </div>
        {PAST_DUE_ROWS.map(row => (
          <div key={row.range} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ColorDot color={row.color} />
              <span style={{ fontSize: 12, color: 'var(--ds-color-text-primary)' }}>{row.range}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ds-color-text-primary)' }}>{row.amount}</span>
          </div>
        ))}
      </div>
      <div style={{ flexShrink: 0, width: '40%' }}>
        <DonutChart segs={PAST_DUE_SEGS} size={110} />
      </div>
    </div>
  </div>
)

// ─── Widget: Unit Status ──────────────────────────────────────────────────────

const UNIT_STATUS_SEGS = [
  { pct: 0.37, color: '#3570DE', label: 'Occupied' },
  { pct: 0.37, color: '#BDA9F5', label: 'Reserved' },
  { pct: 0.13, color: '#08875D', label: 'Vacant' },
  { pct: 0.12, color: '#E12C3C', label: 'Unrentable' },
  { pct: 0.01, color: '#CBD3E1', label: 'Owner Occ.' },
]
const UNIT_STATUS_LEGEND = [
  { label: 'Occupied',       sub: '25%, 138 Units', color: '#3570DE' },
  { label: 'Reserved',       sub: '25%, 138 Units', color: '#BDA9F5' },
  { label: 'Vacant',         sub: '13%, 8 Units',   color: '#08875D' },
  { label: 'Unrentable',     sub: '12%, 4 Units',   color: '#E12C3C' },
  { label: 'Owner Occupied', sub: '0%, 0 Units',    color: '#CBD3E1' },
]

export const UnitStatusWidget = () => (
  <div style={{ ...cardStyle, height: '100%', boxSizing: 'border-box' }}>
    <CardHeader title="Unit Status" noIcon right={<LinkBtn label="Manage" />} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minHeight: 0 }}>
      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
        {UNIT_STATUS_LEGEND.map(item => (
          <div key={item.label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ColorDot color={item.color} />
              <span style={{ fontSize: 12, color: 'var(--ds-color-text-primary)', fontWeight: 400 }}>{item.label}</span>
              {item.label === 'Occupied' && <QuestionIcon />}
            </div>
            <div style={{ paddingLeft: 16, fontSize: 10, color: 'var(--ds-color-text-muted)' }}>{item.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ flexShrink: 0, width: '50%' }}>
        <DonutChart segs={UNIT_STATUS_SEGS} size={130} />
      </div>
    </div>
  </div>
)

// ─── Widget: Tenant Protection + Autopay ─────────────────────────────────────

const MiniCard = ({ title, value, trend, sparkColor, data }: {
  title: string; value: string; trend: string; sparkColor: string; data: number[]
}) => (
  <div style={{ ...cardStyle, gap: 12, flex: 1 }}>
    <CardHeader title={title} right={<LinkBtn label="Contact Leads" />} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minHeight: 0 }}>
      <div style={{ flexShrink: 0 }}>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -1, color: 'var(--ds-color-text-primary)', display: 'block', lineHeight: '24px' }}>{value}</span>
        <Trend pct={trend} direction="up" />
      </div>
      <Sparkline data={data} color={sparkColor} hexColor={sparkColor} format={v => `${v}%`} />
    </div>
  </div>
)

export const ProtectionAutopayWidget = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, height: '100%', boxSizing: 'border-box' }}>
    <MiniCard title="Tenant Protection Penetration" value="62.5%" trend="1.8%" sparkColor="#08875D" data={PROTECTION_DATA} />
    <MiniCard title="Autopay" value="62.1%" trend="1.8%" sparkColor="#08875D" data={AUTOPAY_DATA} />
  </div>
)

// ─── Widget: ECRI ─────────────────────────────────────────────────────────────

const ECRICard = ({ left, right }: {
  left: { value: string; label: string };
  right: { value: string; valueColor?: string; label: string };
}) => (
  <div style={{ ...cardStyle, padding: '0', gap: 0, flex: 1, justifyContent: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      {/* Left panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '28px 16px' }}>
        <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, color: 'var(--ds-color-text-primary)', lineHeight: '1' }}>{left.value}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--ds-color-text-muted)', textAlign: 'center' }}>{left.label}</span>
          <QuestionIcon />
        </div>
      </div>
      {/* Divider */}
      <div style={{ width: 1, background: 'var(--ds-color-border)' }} />
      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '28px 16px' }}>
        <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, color: right.valueColor ?? 'var(--ds-color-text-primary)', lineHeight: '1' }}>{right.value}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--ds-color-text-muted)', textAlign: 'center' }}>{right.label}</span>
          <QuestionIcon />
        </div>
      </div>
    </div>
  </div>
)

export const ECRIWidget = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, height: '100%', boxSizing: 'border-box' }}>
    <ECRICard
      left={{ value: '41', label: 'Scheduled ECRI' }}
      right={{ value: '+$24,104', valueColor: '#08875D', label: 'Potential Revenue Inc' }}
    />
    <ECRICard
      left={{ value: '37', label: 'Eligible Tenants' }}
      right={{ value: '$67,041', valueColor: '#E12C3C', label: 'Variance Cost' }}
    />
  </div>
)
OccupancyWidget.displayName = 'OccupancyWidget'
RevenueWidget.displayName = 'RevenueWidget'
NetMoveInsWidget.displayName = 'NetMoveInsWidget'
LeadsWidget.displayName = 'LeadsWidget'
PastDueWidget.displayName = 'PastDueWidget'
UnitStatusWidget.displayName = 'UnitStatusWidget'
ProtectionAutopayWidget.displayName = 'ProtectionAutopayWidget'
ECRIWidget.displayName = 'ECRIWidget'
