import { useState, useCallback } from 'react'
import RankineChart from './RankineChart'
import { satT, satTKeys, satTUnits, satP, satPKeys, satPUnits, supData, liqData } from './data'
import styles from './App.module.css'

function fmt(v) {
  if (typeof v !== 'number') return v;
  if (Math.abs(v) < 0.0001) return v.toExponential(4);
  if (Math.abs(v) < 10) return parseFloat(v.toPrecision(5)).toString();
  return parseFloat(v.toPrecision(6)).toString();
}

function interpQuad(x0, y0, x1, y1, x2, y2, x) {
  if (x0 === x1 || x1 === x2 || x0 === x2) return y1;
  const L0 = ((x - x1) * (x - x2)) / ((x0 - x1) * (x0 - x2));
  const L1 = ((x - x0) * (x - x2)) / ((x1 - x0) * (x1 - x2));
  const L2 = ((x - x0) * (x - x1)) / ((x2 - x0) * (x2 - x1));
  return y0 * L0 + y1 * L1 + y2 * L2;
}

// GERADOR DO PASSO A PASSO MATEMÁTICO (Memorial)
function generateCalcSteps(x0, y0, x1, y1, x2, y2, x, yName="y") {
  if (x0 === x1 || x1 === x2 || x0 === x2) return ["Erro: Divisão por zero."];
  const L0 = ((x - x1) * (x - x2)) / ((x0 - x1) * (x0 - x2));
  const L1 = ((x - x0) * (x - x2)) / ((x1 - x0) * (x1 - x2));
  const L2 = ((x - x0) * (x - x1)) / ((x2 - x0) * (x2 - x1));
  const y = y0 * L0 + y1 * L1 + y2 * L2;

  return [
    `[INTERPOLAÇÃO DE LAGRANGE PARA ${yName}]`,
    `> Pontos (x, y):\n  P0 = (${fmt(x0)}, ${fmt(y0)})\n  P1 = (${fmt(x1)}, ${fmt(y1)})\n  P2 = (${fmt(x2)}, ${fmt(y2)})`,
    `> Coeficientes:\n  L0 = (${fmt(x)} - ${fmt(x1)})(${fmt(x)} - ${fmt(x2)}) / (${fmt(x0)} - ${fmt(x1)})(${fmt(x0)} - ${fmt(x2)}) = ${fmt(L0)}\n  L1 = (${fmt(x)} - ${fmt(x0)})(${fmt(x)} - ${fmt(x2)}) / (${fmt(x1)} - ${fmt(x0)})(${fmt(x1)} - ${fmt(x2)}) = ${fmt(L1)}\n  L2 = (${fmt(x)} - ${fmt(x0)})(${fmt(x)} - ${fmt(x1)}) / (${fmt(x2)} - ${fmt(x0)})(${fmt(x2)} - ${fmt(x1)}) = ${fmt(L2)}`,
    `> Equação:\n  ${yName} = (y0*L0) + (y1*L1) + (y2*L2)\n  ${yName} = (${fmt(y0)} * ${fmt(L0)}) + (${fmt(y1)} * ${fmt(L1)}) + (${fmt(y2)} * ${fmt(L2)})`,
    `> Resultado:\n  ${yName} = ${fmt(y)}`
  ];
}

function findThreePoints(arr, val, idx) {
  let lo = -1;
  for (let i = 0; i < arr.length - 1; i++) { if (arr[i][idx] <= val && arr[i + 1][idx] >= val) { lo = i; break; } }
  if (lo === -1) return [-1, -1, -1];
  if (lo === 0) return [0, 1, 2];
  if (lo === arr.length - 2) return [lo - 1, lo, lo + 1];
  return Math.abs(val - arr[lo - 1][idx]) < Math.abs(val - arr[lo + 2][idx]) ? [lo - 1, lo, lo + 1] : [lo, lo + 1, lo + 2];
}

function findClosestTable(dataObj, targetVal) {
  const keys = Object.keys(dataObj);
  let closestKey = keys[0];
  let minDiff = Math.abs(Number(closestKey) - targetVal);
  for (let k of keys) {
    const diff = Math.abs(Number(k) - targetVal);
    if (diff < minDiff) { minDiff = diff; closestKey = k; }
  }
  return { key: closestKey, table: dataObj[closestKey] };
}

export default function App() {
  const [inputP, setInputP] = useState('');
  const [inputT, setInputT] = useState('');
  const [result, setResult] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [tableInfo, setTableInfo] = useState(null);
  const [highlightVal, setHighlightVal] = useState(null);

  const handleSearch = useCallback(() => {
    setResult(null); setAnalysis(null); setHighlightVal(null); setTableInfo(null);
    const P = parseFloat(inputP);
    const T = parseFloat(inputT);
    const hasP = !isNaN(P);
    const hasT = !isNaN(T);

    if (!hasP && !hasT) { alert("Insira Pressão e/ou Temperatura."); return; }

    let estado = ""; let memorial = []; let rowData = []; 
    let keys = []; let units = []; let currentT = 0; let s_val = null;

    if (hasT && !hasP) {
      const pts = findThreePoints(satT, T, 0);
      if (pts[0] === -1) { setResult({ error: "Temperatura fora da tabela (0.01 a 374.14 °C)." }); return; }
      
      const steps = generateCalcSteps(satT[pts[0]][0], satT[pts[0]][1], satT[pts[1]][0], satT[pts[1]][1], satT[pts[2]][0], satT[pts[2]][1], T, "Psat");
      rowData = satTKeys.map((_, i) => interpQuad(satT[pts[0]][0], satT[pts[0]][i], satT[pts[1]][0], satT[pts[1]][i], satT[pts[2]][0], satT[pts[2]][i], T));
      keys = satTKeys; units = satTUnits; currentT = T; s_val = [rowData[6], rowData[7]];
      
      setTableInfo({ headers: satTHeaders, rows: satT, keyIdx: 0 });
      setHighlightVal(T);
      setAnalysis({ estado: "SATURADA POR TEMPERATURA", color: "var(--neon-cyan)", T: currentT, s_val, memorial: [`[ENTRADA] T = ${T} °C (Assumindo saturação)`, ...steps] });
    }
    else if (hasP && !hasT) {
      const pts = findThreePoints(satP, P, 0);
      if (pts[0] === -1) { setResult({ error: "Pressão fora da tabela (0.00611 a 220.9 bar)." }); return; }
      
      const steps = generateCalcSteps(satP[pts[0]][0], satP[pts[0]][1], satP[pts[1]][0], satP[pts[1]][1], satP[pts[2]][0], satP[pts[2]][1], P, "Tsat");
      rowData = satPKeys.map((_, i) => interpQuad(satP[pts[0]][0], satP[pts[0]][i], satP[pts[1]][0], satP[pts[1]][i], satP[pts[2]][0], satP[pts[2]][i], P));
      keys = satPKeys; units = satPUnits; currentT = rowData[1]; s_val = [rowData[6], rowData[7]];
      
      setTableInfo({ headers: satPHeaders, rows: satP, keyIdx: 0 });
      setHighlightVal(P);
      setAnalysis({ estado: "SATURADA POR PRESSÃO", color: "var(--neon-cyan)", T: currentT, s_val, memorial: [`[ENTRADA] P = ${P} bar (Assumindo saturação)`, ...steps] });
    }
    else if (hasP && hasT) {
      const ptsP = findThreePoints(satP, P, 0);
      if (ptsP[0] === -1) { setResult({ error: "Pressão fora dos limites." }); return; }
      
      const Tsat = interpQuad(satP[ptsP[0]][0], satP[ptsP[0]][1], satP[ptsP[1]][0], satP[ptsP[1]][1], satP[ptsP[2]][0], satP[ptsP[2]][1], P);
      const stepsTsat = generateCalcSteps(satP[ptsP[0]][0], satP[ptsP[0]][1], satP[ptsP[1]][0], satP[ptsP[1]][1], satP[ptsP[2]][0], satP[ptsP[2]][1], P, "Tsat");
      
      memorial.push(`[SISTEMA] P = ${P} bar | T = ${T} °C`);
      memorial.push(...stepsTsat);

      if (T > Tsat + 0.1) {
        estado = "VAPOR SUPERAQUECIDO";
        memorial.push(`\n[DIAGNÓSTICO] T_sistema > Tsat (${T} > ${fmt(Tsat)})`);
        const { key, table } = findClosestTable(supData, P);
        const ptsT = findThreePoints(table.rows, T, 0);
        if (ptsT[0] === -1) { setResult({ error: `T = ${T}°C fora da tabela (P=${key}).` }); return; }
        
        memorial.push(...generateCalcSteps(table.rows[ptsT[0]][0], table.rows[ptsT[0]][3], table.rows[ptsT[1]][0], table.rows[ptsT[1]][3], table.rows[ptsT[2]][0], table.rows[ptsT[2]][3], T, "s (Entropia)"));
        rowData = [0,1,2,3].map(i => interpQuad(table.rows[ptsT[0]][0], table.rows[ptsT[0]][i], table.rows[ptsT[1]][0], table.rows[ptsT[1]][i], table.rows[ptsT[2]][0], table.rows[ptsT[2]][i], T));
        keys = ['T','v','h','s']; units = ['°C','m³/kg','kJ/kg','kJ/kg·K'];
        setTableInfo({ headers: table.headers, rows: table.rows, keyIdx: 0 });
        setHighlightVal(T);
        setAnalysis({ estado, color: "var(--neon-pink)", memorial, T, s_val: rowData[3] });
      }
      else if (T < Tsat - 0.1) {
        estado = "LÍQUIDO COMPRIMIDO";
        memorial.push(`\n[DIAGNÓSTICO] T_sistema < Tsat (${T} < ${fmt(Tsat)})`);
        const { key, table } = findClosestTable(liqData, P / 10);
        const ptsT = findThreePoints(table.rows, T, 0);
        if (ptsT[0] === -1) { setResult({ error: `T = ${T}°C fora da tabela.` }); return; }
        
        memorial.push(...generateCalcSteps(table.rows[ptsT[0]][0], table.rows[ptsT[0]][3], table.rows[ptsT[1]][0], table.rows[ptsT[1]][3], table.rows[ptsT[2]][0], table.rows[ptsT[2]][3], T, "s (Entropia)"));
        rowData = [0,1,2,3].map(i => interpQuad(table.rows[ptsT[0]][0], table.rows[ptsT[0]][i], table.rows[ptsT[1]][0], table.rows[ptsT[1]][i], table.rows[ptsT[2]][0], table.rows[ptsT[2]][i], T));
        keys = ['T','v','h','s']; units = ['°C','m³/kg','kJ/kg','kJ/kg·K'];
        setTableInfo({ headers: table.headers, rows: table.rows, keyIdx: 0 });
        setHighlightVal(T);
        setAnalysis({ estado, color: "var(--neon-green)", memorial, T, s_val: rowData[3] });
      }
      else {
        estado = "MISTURA SATURADA";
        memorial.push(`\n[DIAGNÓSTICO] T_sistema ≅ Tsat (${T} ≅ ${fmt(Tsat)})`);
        memorial.push(`[EXTRAÇÃO] Valores de saturação (líquido e vapor) processados.`);
        rowData = satPKeys.map((_, i) => interpQuad(satP[ptsP[0]][0], satP[ptsP[0]][i], satP[ptsP[1]][0], satP[ptsP[1]][i], satP[ptsP[2]][0], satP[ptsP[2]][i], P));
        keys = satPKeys; units = satPUnits;
        setTableInfo({ headers: satPHeaders, rows: satP, keyIdx: 0 });
        setHighlightVal(P);
        setAnalysis({ estado, color: "var(--neon-cyan)", memorial, T: rowData[1], s_val: [rowData[6], rowData[7]] });
      }
    }
    setResult({ keys, units, values: rowData });
  }, [inputP, inputT]);

  return (
    <div className={styles.layout}>
      
      {/* PAINEL ESQUERDO: CONTROLES E CÓDIGO */}
      <aside className={styles.leftPane}>
        <div className={styles.header}>
          <div className={styles.title}>Termodinamica<span></span></div>
          <div className={styles.subtitle}>// Agua, pressão e vapor</div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Pressão (bar)</label>
          <input type="number" value={inputP} onChange={e => setInputP(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="0.00" />
        </div>
        
        <div className={styles.inputGroup}>
          <label className={styles.label}>Temperatura (°C)</label>
          <input type="number" value={inputT} onChange={e => setInputT(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="0.00" />
        </div>

        <button onClick={handleSearch}>Processar Dados</button>

        {analysis && (
          <div className={styles.memorialBox}>
            <div className={styles.statusTitle} style={{ color: analysis.color }}>
              STATUS :: {analysis.estado}
            </div>
            <div>
              {analysis.memorial.map((line, i) => (
                <div key={i} className={styles.memorialLine} style={{ color: line.startsWith('[') ? 'var(--text-main)' : 'var(--text-dim)' }}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.footer}>
          root@alan:~# dev: Alan Cotts dos Anjos Fernandes<br/>root@alan:~# matricula: 29636001
        </div>
      </aside>

      {/* PAINEL DIREITO: VISUALIZAÇÃO DE DADOS */}
      <main className={styles.rightPane}>
        
        {result && result.error && (
          <div className={styles.errorBox}>[ ERRO ] {result.error}</div>
        )}

        {result && !result.error && (
          <div className={styles.resultGrid}>
            {result.keys.map((k, i) => (
              <div key={k} className={styles.dataCard}>
                <div className={styles.dataLabel}>{k}</div>
                <div className={styles.dataVal} style={{ color: analysis ? analysis.color : 'var(--text-main)' }}>{fmt(result.values[i])}</div>
                <div className={styles.dataUnit}>{result.units[i]}</div>
              </div>
            ))}
          </div>
        )}

        {analysis && (
          <div className={styles.chartContainer}>
            <RankineChart analysis={analysis} />
          </div>
        )}

        {tableInfo && tableInfo.headers && (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead><tr>{tableInfo.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {tableInfo.rows.map((row, i) => (
                  <tr key={i} className={highlightVal !== null && row[tableInfo.keyIdx] === highlightVal ? styles.highlighted : ''}>
                    {row.map((v, ci) => <td key={ci}>{fmt(v)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  )
}