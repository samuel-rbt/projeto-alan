import { useState, useCallback } from 'react'
import RankineChart from './RankineChart'
import { satT, satTHeaders, satTKeys, satTUnits, satP, satPHeaders, satPKeys, satPUnits, supData, liqData } from './data'
import styles from './App.module.css'

function fmt(v) {
  if (typeof v !== 'number') return v
  return Math.abs(v) < 0.0001 ? v.toExponential(4) : parseFloat(v.toPrecision(5)).toString()
}

function interpQuad(x0, y0, x1, y1, x2, y2, x) {
  const L0 = ((x - x1) * (x - x2)) / ((x0 - x1) * (x0 - x2));
  const L1 = ((x - x0) * (x - x2)) / ((x1 - x0) * (x1 - x2));
  const L2 = ((x - x0) * (x - x1)) / ((x2 - x0) * (x2 - x1));
  return y0 * L0 + y1 * L1 + y2 * L2;
}

function findThreePoints(arr, val, idx) {
  let lo = -1;
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i][idx] <= val && arr[i + 1][idx] >= val) { lo = i; break; }
  }
  if (lo === -1) return [-1, -1, -1];
  if (lo === 0) return [0, 1, 2];
  if (lo === arr.length - 2) return [lo - 1, lo, lo + 1];
  return Math.abs(val - arr[lo - 1][idx]) < Math.abs(val - arr[lo + 2][idx]) ? [lo - 1, lo, lo + 1] : [lo, lo + 1, lo + 2];
}

const NAV_ITEMS = [
  { id: 'sat-t', label: 'T-SAT' },
  { id: 'sat-p', label: 'P-SAT' },
  { id: 'sup',   label: 'VAPOR SUPERAQUECIDO' },
  { id: 'liq',   label: 'LÍQUIDO COMPRIMIDO' },
]

export default function App() {
  const [tab, setTab] = useState('sat-t')
  const [searchVal, setSearchVal] = useState('')
  const [supKey, setSupKey] = useState(Object.keys(supData)[0])
  const [liqKey, setLiqKey] = useState(Object.keys(liqData)[0])
  const [result, setResult] = useState(null)
  const [highlightVal, setHighlightVal] = useState(null)

  const handleSearch = useCallback(() => {
    const val = parseFloat(searchVal)
    if (isNaN(val)) return
    setHighlightVal(val)

    let currentData, keys, units;
    if (tab === 'sat-t') { currentData = satT; keys = satTKeys; units = satTUnits; }
    else if (tab === 'sat-p') { currentData = satP; keys = satPKeys; units = satPUnits; }
    else if (tab === 'sup') { currentData = supData[supKey].rows; keys = ['T','v','h','s']; units = ['°C','m³/kg','kJ/kg','kJ/kg·K']; }
    else { currentData = liqData[liqKey].rows; keys = ['T','v','h','s']; units = ['°C','m³/kg','kJ/kg','kJ/kg·K']; }

    const pts = findThreePoints(currentData, val, 0)
    if (pts[0] === -1) { setResult({ error: 'Fora do intervalo' }); return }

    const row = keys.map((_, i) => interpQuad(currentData[pts[0]][0], currentData[pts[0]][i], currentData[pts[1]][0], currentData[pts[1]][i], currentData[pts[2]][0], currentData[pts[2]][i], val));
    setResult({ values: row, keys, units, rawVal: tab === 'sat-p' ? row[1] : val })
  }, [tab, searchVal, supKey, liqKey])

  const { headers, rows, keyIdx } = (tab === 'sat-t') ? { headers: satTHeaders, rows: satT, keyIdx: 0 } 
    : (tab === 'sat-p') ? { headers: satPHeaders, rows: satP, keyIdx: 0 }
    : (tab === 'sup') ? { headers: supData[supKey].headers, rows: supData[supKey].rows, keyIdx: 0 }
    : { headers: liqData[liqKey].headers, rows: liqData[liqKey].rows, keyIdx: 0 };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.logoTitle}>Termodinâmica água</div>
        <div className={styles.headerRight}>Agua e Vapor</div>
      </header>

      <nav className={styles.topNav}>
        {NAV_ITEMS.map(item => (
          <button 
            key={item.id} 
            className={`${styles.navBtn} ${tab === item.id ? styles.navBtnActive : ''}`}
            onClick={() => { setTab(item.id); setResult(null); setSearchVal(''); setHighlightVal(null); }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className={styles.workspace}>
        <aside className={styles.sidebarInputs}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Configuração</label>
            {tab === 'sup' ? (
              <select value={supKey} onChange={e => setSupKey(e.target.value)}>
                {Object.keys(supData).map(k => <option key={k} value={k}>{k} bar</option>)}
              </select>
            ) : tab === 'liq' ? (
              <select value={liqKey} onChange={e => setLiqKey(e.target.value)}>
                {Object.keys(liqData).map(k => <option key={k} value={k}>{k} MPa</option>)}
              </select>
            ) : <div style={{fontSize: '12px', color: '#94a3b8', padding: '8px 0'}}>Saturação Automática</div>}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Entrada</label>
            <input type="number" value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="0.00" onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>

          <button className={styles.searchBtn} onClick={handleSearch}>EXECUTAR ANÁLISE</button>
        </aside>

        <main className={styles.contentArea}>
          <div className={styles.analyzerContainer}>
            
            <div className={styles.dataCard}>
              <div className={styles.cardHeader}>Diagrama T-s (Rankine Cycle)</div>
              <div className={styles.chartBox}>
                <RankineChart currentResult={result} />
              </div>
            </div>

            {result && !result.error && (
              <div className={styles.dataCard} style={{borderLeft: '4px solid #1e40af'}}>
                <div className={styles.cardHeader} style={{color: '#1e40af'}}>Análise de Dados</div>
                <div className={styles.resultsRow}>
                  {result.keys.map((k, i) => (
                    <div key={k} className={styles.resultItem}>
                      <div className={styles.inputLabel}>{k}</div>
                      <div className={styles.resultValue}>{fmt(result.values[i])}</div>
                      <div className={styles.unitText}>{result.units[i]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={highlightVal !== null && row[keyIdx] === highlightVal ? styles.highlighted : ''}>
                      {row.map((v, ci) => <td key={ci}>{fmt(v)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </main>
      </div>

      <footer className={styles.footer}>
        <div>PROPRIEDADE DE: ALAN COTTS DOS ANJOS FERNANDES </div>
        <div>REGISTRO ACADÊMICO: 29636001</div>
      </footer>
    </div>
  )
}