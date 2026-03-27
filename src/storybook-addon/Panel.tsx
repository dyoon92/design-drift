/**
 * Panel.tsx — the "Drift" panel rendered in Storybook's addons area.
 *
 * Architecture: The panel lives in the manager iframe. It communicates
 * with the preview iframe (where the story renders) via Storybook's
 * channel (addons.getChannel()). The decorator in preview.ts injects
 * the scanner into the story frame and posts results back.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { addons } from 'storybook/internal/manager-api'
import { CHANNEL_SCAN_REQUEST, CHANNEL_SCAN_RESULT } from './constants'

interface ScanResult {
  pct: number
  total: number
  ds: number
  gaps: Array<{ name: string; count: number }>
  tokenViolations: Array<{ prop: string; value: string; count: number }>
  error?: string
  storyId?: string
}

function coverageColor(pct: number) {
  return pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
}

export function DriftPanel({ active }: { active: boolean }) {
  const [result,   setResult]   = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const channel = addons.getChannel()

  const requestScan = useCallback(() => {
    setScanning(true)
    channel.emit(CHANNEL_SCAN_REQUEST)
  }, [channel])

  useEffect(() => {
    const handleResult = (data: ScanResult) => {
      setResult(data)
      setScanning(false)
    }
    channel.on(CHANNEL_SCAN_RESULT, handleResult)

    // Auto-scan when panel becomes active
    if (active) requestScan()

    return () => { channel.off(CHANNEL_SCAN_RESULT, handleResult) }
  }, [channel, active, requestScan])

  const style: Record<string, React.CSSProperties> = {
    root: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 13,
      padding: '16px',
      color: '#0f172a',
      height: '100%',
      overflowY: 'auto',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    title: { fontSize: 13, fontWeight: 800, letterSpacing: -0.2 },
    rescanBtn: {
      padding: '4px 12px', border: 'none', borderRadius: 6,
      background: '#3b82f6', color: '#fff',
      fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    },
    scoreRow: {
      display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16,
      padding: '12px 14px', borderRadius: 10,
      background: '#f8fafc', border: '1px solid #e2e8f0',
    },
    bigPct: (pct: number) => ({
      fontSize: 28, fontWeight: 900, color: coverageColor(pct), lineHeight: 1,
    }),
    statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 11 },
    statLabel: { color: '#64748b' },
    statVal: { fontWeight: 700 },
    sectionTitle: {
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
      textTransform: 'uppercase' as const, color: '#94a3b8',
      marginBottom: 6, marginTop: 14,
    },
    gapItem: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12,
    },
    gapName: { color: '#ef4444', fontWeight: 600 },
    gapCount: {
      fontSize: 10, fontWeight: 700, padding: '1px 6px',
      borderRadius: 8, background: '#fee2e2', color: '#dc2626',
    },
    tokenWarn: {
      marginTop: 12, padding: '8px 12px', borderRadius: 8,
      background: '#fff7ed', border: '1px solid #fed7aa', fontSize: 12, color: '#9a3412',
    },
    noReact: {
      textAlign: 'center' as const, padding: '32px 0', color: '#94a3b8', fontSize: 12,
    },
    scanning: {
      textAlign: 'center' as const, padding: '32px 0', color: '#94a3b8', fontSize: 12,
    },
  }

  return (
    <div style={style.root}>
      <div style={style.header}>
        <div style={style.title}>
          <span style={{ marginRight: 6 }}>◈</span> DesignDrift
        </div>
        <button style={style.rescanBtn} onClick={requestScan} disabled={scanning}>
          {scanning ? 'Scanning…' : 'Rescan'}
        </button>
      </div>

      {scanning && !result && (
        <div style={style.scanning}>Scanning story…</div>
      )}

      {!scanning && !result && (
        <div style={style.noReact}>
          Click "Rescan" to analyse this story.
        </div>
      )}

      {result?.error && (
        <div style={style.noReact}>
          <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 4 }}>Scan failed</div>
          {result.error}
        </div>
      )}

      {result && !result.error && (
        <>
          <div style={style.scoreRow}>
            <div style={style.bigPct(result.pct)}>{result.pct}%</div>
            <div style={style.statGrid}>
              <span style={style.statLabel}>DS components</span>
              <span style={{ ...style.statVal, color: '#16a34a' }}>{result.ds}</span>
              <span style={style.statLabel}>Custom gaps</span>
              <span style={{ ...style.statVal, color: '#dc2626' }}>{result.total - result.ds}</span>
              <span style={style.statLabel}>Total</span>
              <span style={style.statVal}>{result.total}</span>
              <span style={style.statLabel}>Token issues</span>
              <span style={{ ...style.statVal, color: result.tokenViolations.length ? '#ea580c' : '#16a34a' }}>
                {result.tokenViolations.length}
              </span>
            </div>
          </div>

          {result.gaps.length > 0 && (
            <>
              <div style={style.sectionTitle}>Custom components (gaps)</div>
              {result.gaps.map(({ name, count }) => (
                <div key={name} style={style.gapItem}>
                  <span style={style.gapName}>{name}</span>
                  <span style={style.gapCount}>×{count}</span>
                </div>
              ))}
            </>
          )}

          {result.gaps.length === 0 && (
            <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 8 }}>
              All components are from the design system.
            </div>
          )}

          {result.tokenViolations.length > 0 && (
            <div style={style.tokenWarn}>
              <strong>Token violations ({result.tokenViolations.length})</strong>
              <ul style={{ marginTop: 6, paddingLeft: 16 }}>
                {result.tokenViolations.slice(0, 5).map((v, i) => (
                  <li key={i} style={{ marginBottom: 3 }}>
                    <code style={{ background: '#fed7aa', padding: '1px 4px', borderRadius: 3 }}>{v.value}</code>
                    {' '}on{' '}<code>{v.prop}</code>
                    {v.count > 1 && ` (×${v.count})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
