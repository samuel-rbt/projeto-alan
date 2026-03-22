import React from 'react';
import { Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip, Legend, Title } from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { satT } from './data';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, Title);

export default function RankineChart({ currentResult }) {
  const domeLeft = satT.map(row => ({ x: row[6], y: row[0] }));
  const domeRight = [...satT].reverse().map(row => ({ x: row[7], y: row[0] }));
  const domeData = [...domeLeft, ...domeRight];

  let T_high = 200;
  if (currentResult && !currentResult.error && currentResult.rawVal !== undefined) {
    T_high = currentResult.rawVal;
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

  const data = {
    datasets: [
      {
        label: `Ciclo Ideal (${T_high.toFixed(1)} °C)`,
        data: cycleData,
        borderColor: '#1e40af', 
        backgroundColor: '#1e40af',
        showLine: true,
        borderWidth: 2,
        pointRadius: 4,
        tension: 0,
      },
      {
        label: 'Cúpula de Saturação',
        data: domeData,
        borderColor: '#94a3b8',
        backgroundColor: 'transparent',
        showLine: true,
        borderWidth: 1.5,
        pointRadius: 0,
        borderDash: [5, 5], 
        tension: 0.1,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear', position: 'bottom',
        title: { display: true, text: 'Entropia s [kJ/(kg·K)]', color: '#64748b', font: { size: 10 } },
        grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 9 } }
      },
      y: {
        title: { display: true, text: 'Temperatura T [°C]', color: '#64748b', font: { size: 10 } },
        grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 9 } },
        min: 0, max: Math.max(400, T_high + 20) 
      }
    },
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 }, color: '#1e293b' } },
      tooltip: { callbacks: { label: (ctx) => `s: ${ctx.parsed.x.toFixed(3)}, T: ${ctx.parsed.y}°C` } }
    }
  };

  return (
    <div style={{ height: '100%', width: '100%', background: '#ffffff' }}>
      <Scatter data={data} options={options} />
    </div>
  );
}