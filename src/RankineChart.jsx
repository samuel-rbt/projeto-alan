import React from 'react';
import { Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip, Legend, Title } from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { satT } from './data';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, Title);

export default function RankineChart({ analysis }) {
  
  const domeLeft = satT.map(row => ({ x: row[6], y: row[0] }));
  const domeRight = [...satT].reverse().map(row => ({ x: row[7], y: row[0] }));
  
  let T_high = 200; 
  if (analysis && analysis.T) {
    T_high = analysis.T;
  }
  
  const T_low = 40; 
  const getS = (T) => {
    const row = satT.find(r => r[0] >= T) || satT[satT.length-1];
    return { sf: row[6], sg: row[7] };
  };

  const sHigh = getS(T_high);
  const sLow = getS(T_low);

  const cycleData = [
    { x: sHigh.sg, y: T_high }, 
    { x: sHigh.sg, y: T_low },  
    { x: sLow.sf,  y: T_low },  
    { x: sLow.sf,  y: T_low + 2 }, 
    { x: sHigh.sf, y: T_high }, 
    { x: sHigh.sg, y: T_high }  
  ];

  let statePoint = [];
  let isMixture = false;

  if (analysis && analysis.s_val !== undefined && analysis.s_val !== null) {
    if (Array.isArray(analysis.s_val)) {
      isMixture = true;
      statePoint = [{ x: analysis.s_val[0], y: analysis.T }, { x: analysis.s_val[1], y: analysis.T }];
    } else {
      statePoint = [{ x: analysis.s_val, y: analysis.T }];
    }
  }

  const data = {
    datasets: [
      {
        label: `Ciclo Ideal (${T_high.toFixed(1)} °C)`,
        data: cycleData,
        borderColor: '#0ea5e9', // Azul primário
        backgroundColor: '#0ea5e9',
        showLine: true,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
      },
      {
        label: 'Cúpula de Saturação',
        data: [...domeLeft, ...domeRight],
        borderColor: '#94a3b8', // Cinza claro
        backgroundColor: 'transparent',
        showLine: true,
        borderWidth: 1.5,
        pointRadius: 0,
        borderDash: [5, 5], 
        tension: 0.1,
      },
      {
        label: isMixture ? 'Mistura Saturada' : 'Ponto Termodinâmico',
        data: statePoint,
        borderColor: analysis ? analysis.color : '#f59e0b',
        backgroundColor: analysis ? analysis.color : '#f59e0b',
        showLine: isMixture,
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        zIndex: 10
      }
    ],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      x: { 
        type: 'linear', title: { display: true, text: 'Entropia s [kJ/kg·K]', color: '#64748b' }, 
        grid: { color: '#f1f5f9' }, ticks: { color: '#64748b' } 
      },
      y: { 
        title: { display: true, text: 'Temperatura T [°C]', color: '#64748b' }, 
        grid: { color: '#f1f5f9' }, ticks: { color: '#64748b' }, 
        min: 0, max: Math.max(400, T_high + 20) 
      }
    },
    plugins: { 
      legend: { labels: { color: '#0f172a', font: { family: "'Roboto Mono', monospace" } } },
      tooltip: { callbacks: { label: (ctx) => `s: ${ctx.parsed.x.toFixed(4)}, T: ${ctx.parsed.y} °C` } }
    }
  };

  return <Scatter data={data} options={options} />;
}