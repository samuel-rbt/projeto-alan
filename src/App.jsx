import { useState, useCallback } from 'react'
import RankineChart from './RankineChart'
import { satT, satTHeaders, satTKeys, satTUnits, satP, satPHeaders, satPKeys, satPUnits, supData, liqData } from './data'
import styles from './App.module.css'

function fmt(v) {
  if (typeof v !== 'number') return v
  if (Math.abs(v) < 0.0001) return v.toExponential(4)
  if (Math.abs(v) < 10) return parseFloat(v.toPrecision(5)).toString()
  return parseFloat(v.toPrecision(6)).toString()
}

function interpQuad(x0, y0, x1, y1, x2, y2, x) {
  if (x0 === x1 || x1 === x2 || x0 === x2) return y1;
  const L0 = ((x - x1) * (x - x2)) / ((x0 - x1) * (x0 - x2));
  const L1 = ((x - x0) * (x - x2)) / ((x1 - x0) * (x1 - x2));
  const L2 = ((x - x0) * (x - x1)) / ((x2 - x0) * (x2 - x1));
  return y0 * L0 + y1 * L1 + y2 * L2;
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

    if (!hasP && !hasT) { alert("Insira Pressão e/ou Temperatura na barra lateral."); return; }

    let estado = ""; let memorial = []; let rowData = []; 
    let keys = []; let units = []; let currentT = 0; let s_val = null;

    const formula = "y(x) = y₀L₀ + y₁L₁ + y₂L₂";

    if (hasT && !hasP) {
      const pts = findThreePoints(satT, T, 0);
      if (pts[0] === -1) { setResult({ error: "Temperatura fora da tabela (0.01 a 374.14 °C)." }); return; }
      rowData = satTKeys.map((_, i) => interpQuad(satT[pts[0]][0], satT[pts[0]][i], satT[pts[1]][0], satT[pts[1]][i], satT[pts[2]][0], satT[pts[2]][i], T));
      keys = satTKeys; units = satTUnits; currentT = T; s_val = [rowData[6], rowData[7]];
      setTableInfo({ headers: satTHeaders, rows: satT, keyIdx: 0 });
      setHighlightVal(T);
      setAnalysis({ estado: "SATURADA POR TEMPERATURA", color: "var(--state-mix)", T: currentT, s_val, memorial: [`Entrada Isolada: T = ${T} °C`, `Condição: Linha de saturação dependente de T.`, `Equação de Lagrange:`, `↳ ${formula}`, `Cálculo: Psat = ${fmt(rowData[1])} bar.`] });
    }
    else if (hasP && !hasT) {
      const pts = findThreePoints(satP, P, 0);
      if (pts[0] === -1) { setResult({ error: "Pressão fora da tabela (0.00611 a 220.9 bar)." }); return; }
      rowData = satPKeys.map((_, i) => interpQuad(satP[pts[0]][0], satP[pts[0]][i], satP[pts[1]][0], satP[pts[1]][i], satP[pts[2]][0], satP[pts[2]][i], P));
      keys = satPKeys; units = satPUnits; currentT = rowData[1]; s_val = [rowData[6], rowData[7]];
      setTableInfo({ headers: satPHeaders, rows: satP, keyIdx: 0 });
      setHighlightVal(P);
      setAnalysis({ estado: "SATURADA POR PRESSÃO", color: "var(--state-mix)", T: currentT, s_val, memorial: [`Entrada Isolada: P = ${P} bar`, `Condição: Linha de saturação dependente de P.`, `Equação de Lagrange:`, `↳ ${formula}`, `Cálculo: Tsat = ${fmt(rowData[1])} °C.`] });
    }
    else if (hasP && hasT) {
      const ptsP = findThreePoints(satP, P, 0);
      if (ptsP[0] === -1) { setResult({ error: "Pressão fora dos limites." }); return; }
      
      const Tsat = interpQuad(satP[ptsP[0]][0], satP[ptsP[0]][1], satP[ptsP[1]][0], satP[ptsP[1]][1], satP[ptsP[2]][0], satP[ptsP[2]][1], P);
      memorial.push(`Variáveis Ativas: P = ${P} bar | T = ${T} °C`);
      memorial.push(`Fronteira de Fase (Tsat) calculada via Lagrange:`);
      memorial.push(`↳ Tsat = ${fmt(Tsat)} °C`);

      if (T > Tsat + 0.1) {
        estado = "VAPOR SUPERAQUECIDO";
        memorial.push(`Análise Condicional:`);
        memorial.push(`↳ T_sistema > Tsat (${T} > ${fmt(Tsat)})`);
        const { key, table } = findClosestTable(supData, P);
        memorial.push(`Tabela Base Aplicada: P = ${key} bar.`);
        const ptsT = findThreePoints(table.rows, T, 0);
        if (ptsT[0] === -1) { setResult({ error: `T = ${T}°C fora da tabela (P=${key}).` }); return; }
        rowData = [0,1,2,3].map(i => interpQuad(table.rows[ptsT[0]][0], table.rows[ptsT[0]][i], table.rows[ptsT[1]][0], table.rows[ptsT[1]][i], table.rows[ptsT[2]][0], table.rows[ptsT[2]][i], T));
        keys = ['T','v','h','s']; units = ['°C','m³/kg','kJ/kg','kJ/kg·K'];
        setTableInfo({ headers: table.headers, rows: table.rows, keyIdx: 0 });
        setHighlightVal(T);
        setAnalysis({ estado, color: "var(--state-vap)", memorial, T, s_val: rowData[3] });
      }
      else if (T < Tsat - 0.1) {
        estado = "LÍQUIDO COMPRIMIDO";
        memorial.push(`Análise Condicional:`);
        memorial.push(`↳ T_sistema < Tsat (${T} < ${fmt(Tsat)})`);
        const { key, table } = findClosestTable(liqData, P / 10);
        memorial.push(`Tabela Base Aplicada: P = ${key} MPa.`);
        const ptsT = findThreePoints(table.rows, T, 0);
        if (ptsT[0] === -1) { setResult({ error: `T = ${T}°C fora da tabela.` }); return; }
        rowData = [0,1,2,3].map(i => interpQuad(table.rows[ptsT[0]][0], table.rows[ptsT[0]][i], table.rows[ptsT[1]][0], table.rows[ptsT[1]][i], table.rows[ptsT[2]][0], table.rows[ptsT[2]][i], T));
        keys = ['T','v','h','s']; units = ['°C','m³/kg','kJ/kg','kJ/kg·K'];
        setTableInfo({ headers: table.headers, rows: table.rows, keyIdx: 0 });
        setHighlightVal(T);
        setAnalysis({ estado, color: "var(--state-liq)", memorial, T, s_val: rowData[3] });
      }
      else {
        estado = "MISTURA SATURADA";
        memorial.push(`Análise Condicional:`);
        memorial.push(`↳ T_sistema ≅ Tsat (${T} ≅ ${fmt(Tsat)})`);
        memorial.push(`Extração das linhas de saturação (líquido e vapor).`);
        rowData = satPKeys.map((_, i) => interpQuad(satP[ptsP[0]][0], satP[ptsP[0]][i], satP[ptsP[1]][0], satP[ptsP[1]][i], satP[ptsP[2]][0], satP[ptsP[2]][i], P));
        keys = satPKeys; units = satPUnits;
        setTableInfo({ headers: satPHeaders, rows: satP, keyIdx: 0 });
        setHighlightVal(P);
        setAnalysis({ estado, color: "var(--state-mix)", memorial, T: rowData[1], s_val: [rowData[6], rowData[7]] });
      }
    }
    setResult({ keys, units, values: rowData });
  }, [inputP, inputT]);

  return (
    <div className={styles.layout}>
      
      {/* BARRA LATERAL: CONTROLES & MEMORIAL */}
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <div className={styles.logoTitle}>Análise Termodinâmica</div>
          <div className={styles.logoSub}>Agua e Pressão</div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Pressão (bar)</label>
          <input type="number" value={inputP} onChange={e => setInputP(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Ex: 10.0" />
        </div>
        
        <div className={styles.inputGroup}>
          <label className={styles.label}>Temperatura (°C)</label>
          <input type="number" value={inputT} onChange={e => setInputT(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Ex: 250" />
        </div>

        <button onClick={handleSearch}>Calcular Estado</button>

        {analysis && (
          <div className={styles.memorialCard}>
            <h3 className={styles.statusTitle} style={{ color: analysis.color }}>
              {analysis.estado}
            </h3>
            <div className={styles.memorialText}>
              <strong style={{ color: 'var(--text-dark)', display: 'block', marginBottom: '12px'}}>MEMORIAL TÉCNICO:</strong>
              {analysis.memorial.map((line, i) => {
                if (line.includes('y(x)')) return <span key={i} className={styles.formula}>{line}</span>;
                return <p key={i} className={styles.memorialLine}>{line}</p>;
              })}
            </div>
          </div>
        )}

        <div className={styles.footer}>
          Desenvolvido por:<br/><strong>ALAN COTTS DOS ANJOS FERNANDES</strong><br/>Matrícula: 29636001
        </div>
      </aside>

      {/* ÁREA PRINCIPAL: GRÁFICO E TABELA */}
      <main className={styles.main}>
        
        {result && result.error && (
          <div className={styles.errorBox}>{result.error}</div>
        )}

        {/* CARDS DE RESULTADOS NUMÉRICOS */}
        {result && !result.error && (
          <div className={styles.resultCards}>
            {result.keys.map((k, i) => (
              <div key={k} className={styles.dataBox}>
                <div className={styles.dataLabel}>{k}</div>
                <div className={styles.dataVal} style={{ color: analysis ? analysis.color : 'inherit' }}>{fmt(result.values[i])}</div>
                <div className={styles.dataUnit}>{result.units[i]}</div>
              </div>
            ))}
          </div>
        )}

        {/* GRÁFICO COM PONTO DE ESTADO */}
        {analysis && (
          <div className={styles.chartSection}>
            <RankineChart analysis={analysis} />
          </div>
        )}

        {/* TABELA COM LINHA DESTACADA */}
        {tableInfo && tableInfo.headers && (
          <div className={styles.tableSection}>
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