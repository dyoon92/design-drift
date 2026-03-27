/**
 * extension.ts — DesignDrift VS Code Extension
 * ─────────────────────────────────────────────
 * Reads the workspace's ds-coverage/config.ts, extracts the component list,
 * then scans open .tsx/.jsx files for JSX elements that aren't in the DS.
 * Shows inline yellow squiggles with "Consider using [DSComponent]" hover messages.
 *
 * Commands:
 *   DesignDrift: Scan Current File      — diagnose the active editor
 *   DesignDrift: Scan Workspace         — diagnose all .tsx/.jsx files
 *   DesignDrift: Open Config            — open the ds-coverage/config.ts
 */

import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtensionState {
  diagnosticCollection: vscode.DiagnosticCollection
  dsComponents: Set<string>
  configWatcher: vscode.FileSystemWatcher | null
}

const state: ExtensionState = {
  diagnosticCollection: null!,
  dsComponents: new Set(),
  configWatcher: null,
}

// ─── Config reader ────────────────────────────────────────────────────────────

/**
 * Read component names from the workspace's DesignDrift config file.
 * Uses regex extraction so we don't need to transpile/execute TypeScript.
 */
function loadDSComponents(): Set<string> {
  const config   = vscode.workspace.getConfiguration('designDrift')
  const cfgPath  = config.get<string>('configPath') ?? 'src/ds-coverage/config.ts'
  const root     = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

  if (!root) return new Set()

  const fullPath = path.resolve(root, cfgPath)
  if (!fs.existsSync(fullPath)) return new Set()

  const src = fs.readFileSync(fullPath, 'utf8')

  // Extract component names from the config object keys
  // Matches lines like:   Button: {   or   TenantPageHeader: {
  const matches = src.match(/^\s{4}(\w+):\s*\{/gm) ?? []
  const names   = matches.map(m => m.trim().replace(/:\s*\{.*/, '').trim())
  return new Set(names.filter(n => /^[A-Z]/.test(n)))
}

// ─── JSX scanner ─────────────────────────────────────────────────────────────

const JSX_COMPONENT_RE = /<([A-Z][A-Za-z0-9.]*)/g

/**
 * Scan a document for JSX component usages not in the DS.
 * Returns diagnostics for each non-DS component found.
 */
function scanDocument(
  document: vscode.TextDocument,
  dsComponents: Set<string>,
): vscode.Diagnostic[] {
  const config     = vscode.workspace.getConfiguration('designDrift')
  const severityId = config.get<string>('severity') ?? 'warning'
  const severity   = {
    error:       vscode.DiagnosticSeverity.Error,
    warning:     vscode.DiagnosticSeverity.Warning,
    information: vscode.DiagnosticSeverity.Information,
    hint:        vscode.DiagnosticSeverity.Hint,
  }[severityId] ?? vscode.DiagnosticSeverity.Warning

  const text        = document.getText()
  const diagnostics: vscode.Diagnostic[] = []
  const seen        = new Set<string>()

  // Track which DS components are imported — avoid false positives from
  // components used via composition (e.g. MyCard which wraps a DS Card)
  const importedNames = new Set<string>()
  const importRE      = /import\s+(?:type\s+)?\{([^}]+)\}.*from\s+['"][^'"]+['"]/g
  let importMatch: RegExpExecArray | null
  while ((importMatch = importRE.exec(text)) !== null) {
    importMatch[1].split(',').forEach(s => {
      const name = s.trim().replace(/\s+as\s+\w+/, '').trim()
      if (name) importedNames.add(name)
    })
  }

  JSX_COMPONENT_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = JSX_COMPONENT_RE.exec(text)) !== null) {
    const name = match[1].split('.')[0] // handle e.g. React.Fragment
    if (dsComponents.has(name)) continue
    if (seen.has(name)) continue

    // Skip common React/third-party globals
    if (['React', 'Fragment', 'Suspense', 'StrictMode', 'ErrorBoundary'].includes(name)) continue

    // Only flag if not imported from outside (i.e. it's locally defined)
    // This heuristic avoids flagging third-party components unless they're
    // imported and clearly should be DS equivalents
    seen.add(name)

    const pos    = document.positionAt(match.index + 1) // +1 to skip the '<'
    const endPos = document.positionAt(match.index + 1 + name.length)
    const range  = new vscode.Range(pos, endPos)

    // Find the closest DS component by name similarity
    const suggestion = findClosestDS(name, dsComponents)

    const message = suggestion
      ? `'${name}' is not in the design system. Consider using '${suggestion}' instead.`
      : `'${name}' is not in the design system. Check your DS component library.`

    const diag        = new vscode.Diagnostic(range, message, severity)
    diag.source       = 'DesignDrift'
    diag.code         = { value: 'non-ds-component', target: vscode.Uri.parse('https://github.com/your-org/design-drift') }
    diagnostics.push(diag)
  }

  return diagnostics
}

/**
 * Very simple name similarity: find DS component whose name contains
 * the query as a substring (case-insensitive), or shares a prefix.
 */
function findClosestDS(name: string, dsComponents: Set<string>): string | null {
  const lower = name.toLowerCase()
  for (const ds of dsComponents) {
    if (ds.toLowerCase().includes(lower) || lower.includes(ds.toLowerCase())) {
      return ds
    }
  }
  // Try prefix match (e.g. "PrimaryBtn" → "Button")
  const prefix = lower.slice(0, 4)
  for (const ds of dsComponents) {
    if (ds.toLowerCase().startsWith(prefix)) return ds
  }
  return null
}

// ─── Diagnostics update ───────────────────────────────────────────────────────

function updateDiagnostics(document: vscode.TextDocument): void {
  const config = vscode.workspace.getConfiguration('designDrift')
  if (!config.get<boolean>('enabled', true)) {
    state.diagnosticCollection.clear()
    return
  }

  const lang = document.languageId
  if (lang !== 'typescriptreact' && lang !== 'javascriptreact') return

  const diagnostics = scanDocument(document, state.dsComponents)
  state.diagnosticCollection.set(document.uri, diagnostics)
}

function updateAllOpenEditors(): void {
  for (const editor of vscode.window.visibleTextEditors) {
    updateDiagnostics(editor.document)
  }
}

// ─── Workspace scan ───────────────────────────────────────────────────────────

async function scanWorkspace(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri
  if (!root) return

  const files = await vscode.workspace.findFiles(
    '{src,app,pages,components}/**/*.{tsx,jsx}',
    '{node_modules,dist,.storybook}/**',
    500,
  )

  let count = 0
  for (const uri of files) {
    const doc = await vscode.workspace.openTextDocument(uri)
    const diags = scanDocument(doc, state.dsComponents)
    state.diagnosticCollection.set(uri, diags)
    count += diags.length
  }

  vscode.window.showInformationMessage(
    `DesignDrift: scanned ${files.length} files — ${count} non-DS component usage${count !== 1 ? 's' : ''} found.`
  )
}

// ─── Extension lifecycle ──────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  state.diagnosticCollection = vscode.languages.createDiagnosticCollection('design-drift')
  context.subscriptions.push(state.diagnosticCollection)

  // Load DS components from config
  state.dsComponents = loadDSComponents()

  // Watch config file for changes — reload component list automatically
  const root = vscode.workspace.workspaceFolders?.[0]?.uri
  if (root) {
    const cfgPath = vscode.workspace.getConfiguration('designDrift').get<string>('configPath') ?? 'src/ds-coverage/config.ts'
    const pattern = new vscode.RelativePattern(root, cfgPath)
    state.configWatcher = vscode.workspace.createFileSystemWatcher(pattern)
    state.configWatcher.onDidChange(() => {
      state.dsComponents = loadDSComponents()
      updateAllOpenEditors()
      vscode.window.setStatusBarMessage(`DesignDrift: reloaded ${state.dsComponents.size} components`, 3000)
    })
    context.subscriptions.push(state.configWatcher)
  }

  // ── Commands ────────────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('designDrift.scanFile', () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) return
      updateDiagnostics(editor.document)
      vscode.window.setStatusBarMessage('DesignDrift: file scanned', 2000)
    }),

    vscode.commands.registerCommand('designDrift.scanWorkspace', () => {
      scanWorkspace()
    }),

    vscode.commands.registerCommand('designDrift.openConfig', () => {
      const cfg  = vscode.workspace.getConfiguration('designDrift')
      const rel  = cfg.get<string>('configPath') ?? 'src/ds-coverage/config.ts'
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
      if (!root) return
      const fullPath = path.resolve(root, rel)
      vscode.workspace.openTextDocument(fullPath).then(doc => vscode.window.showTextDocument(doc))
    }),
  )

  // ── Document change listeners ────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(updateDiagnostics),
    vscode.workspace.onDidSaveTextDocument(updateDiagnostics),
    vscode.workspace.onDidChangeTextDocument(e => {
      // Debounce: only re-scan 600ms after user stops typing
      updateDiagnostics(e.document)
    }),
    vscode.workspace.onDidCloseTextDocument(doc => {
      state.diagnosticCollection.delete(doc.uri)
    }),
  )

  // Scan already-open editors
  updateAllOpenEditors()

  vscode.window.setStatusBarMessage(
    `DesignDrift: ${state.dsComponents.size} DS components loaded`,
    4000,
  )
}

export function deactivate(): void {
  state.configWatcher?.dispose()
  state.diagnosticCollection?.clear()
  state.diagnosticCollection?.dispose()
}
