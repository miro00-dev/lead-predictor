(() => {
  'use strict';

  const elements = {
    revenue: document.querySelector('#revenue'),
    orderValue: document.querySelector('#order-value'),
    leadRate: document.querySelector('#lead-rate'),
    prospectRate: document.querySelector('#prospect-rate'),
    leadOutput: document.querySelector('#lead-rate-output'),
    prospectOutput: document.querySelector('#prospect-rate-output'),
    currency: document.querySelector('#currency'),
    currencyOutputs: document.querySelectorAll('.currency-output'),
    canvas: document.querySelector('#forecast-chart'),
    tooltip: document.querySelector('#chart-tooltip')
  };

  const formatInteger = value => Math.round(value).toLocaleString('en-US');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  let chartRows = [];

  function calculate() {
    const revenue = Math.max(0, Number(elements.revenue.value) || 0);
    const orderValue = Math.max(1, Number(elements.orderValue.value) || 1);
    const leadRate = clamp(Number(elements.leadRate.value), 1, 100);
    const prospectRate = clamp(Number(elements.prospectRate.value), 1, 100);
    const customers = Math.ceil(revenue / orderValue);
    const leads = customers * 100 / leadRate;
    const prospects = leads * 100 / prospectRate;

    return { prospects, leads, customers, leadRate, prospectRate };
  }

  function setStat(name, value, percentage) {
    document.querySelector(`#${name}-value`).textContent = formatInteger(value);
    document.querySelector(`#${name}-percent`).textContent = `${Math.round(percentage)}%`;
    document.querySelector(`#${name}-progress`).style.width = `${clamp(percentage, 0, 100)}%`;
  }

  function updateSlider(slider, output) {
    slider.style.setProperty('--fill', `${slider.value}%`);
    output.value = `${Number(slider.value).toFixed(2)}%`;
  }

  function refresh() {
    const data = calculate();
    const leadsPercent = data.prospects ? data.leads / data.prospects * 100 : 0;
    const customersPercent = data.prospects ? data.customers / data.prospects * 100 : 0;
    setStat('prospects', data.prospects, data.prospects ? 100 : 0);
    setStat('leads', data.leads, leadsPercent);
    setStat('customers', data.customers, customersPercent);
    updateSlider(elements.leadRate, elements.leadOutput);
    updateSlider(elements.prospectRate, elements.prospectOutput);
    drawChart(data);
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, height / 2, width / 2);
    context.beginPath();
    context.roundRect(x, y, width, height, r);
    context.fill();
  }

  function drawChart(data) {
    const canvas = elements.canvas;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);

    const width = bounds.width;
    const height = bounds.height;
    const margin = { top: 30, right: 0, bottom: 44, left: 58 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const maxValue = Math.max(20, data.prospects);
    const steps = Math.max(1, Math.floor(maxValue / 20));

    ctx.lineWidth = 1;
    ctx.font = '11px Inter, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= steps; i++) {
      const x = margin.left + plotWidth * (i * 20) / maxValue;
      ctx.strokeStyle = '#2c3a4e';
      ctx.beginPath(); ctx.moveTo(x, margin.top); ctx.lineTo(x, height - margin.bottom); ctx.stroke();
      ctx.fillStyle = '#e3e8ef';
      ctx.fillText(`${i * 20} people`, x, height - 19);
    }

    const rowHeight = plotHeight / 6;
    const barHeight = Math.min(60, rowHeight * .88);
    chartRows = [];
    for (let month = 1; month <= 6; month++) {
      const factor = month / 6;
      const values = {
        prospects: Math.round(data.prospects * factor),
        leads: Math.round(data.leads * factor),
        customers: Math.round(data.customers * factor)
      };
      const y = margin.top + rowHeight * (month - 1) + (rowHeight - barHeight) / 2;
      const widths = {
        prospects: plotWidth * values.prospects / maxValue,
        leads: plotWidth * values.leads / maxValue,
        customers: plotWidth * values.customers / maxValue
      };
      ctx.fillStyle = '#707b8d'; roundRect(ctx, margin.left, y, widths.prospects, barHeight, 1);
      ctx.fillStyle = '#929daf'; roundRect(ctx, margin.left, y, widths.leads, barHeight, 1);
      ctx.fillStyle = '#b8c1ce'; roundRect(ctx, margin.left, y, widths.customers, barHeight, 1);

      ctx.fillStyle = '#eef1f5';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(month), margin.left - 12, y + barHeight / 2);
      chartRows.push({ y, height: barHeight, values, month });
    }

    ctx.save();
    ctx.translate(16, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#e3e8ef';
    ctx.textAlign = 'center';
    ctx.font = '600 12px Inter, Segoe UI, sans-serif';
    ctx.fillText('Month', 0, 0);
    ctx.restore();
  }

  function handleChartPointer(event) {
    const bounds = elements.canvas.getBoundingClientRect();
    const y = event.clientY - bounds.top;
    const row = chartRows.find(item => y >= item.y && y <= item.y + item.height);
    if (!row) {
      elements.tooltip.style.display = 'none';
      return;
    }
    elements.tooltip.innerHTML = `<strong>Month #${row.month}</strong>Prospects: ${formatInteger(row.values.prospects)}<br>Leads: ${formatInteger(row.values.leads)}<br>Customers: ${formatInteger(row.values.customers)}`;
    elements.tooltip.style.display = 'block';
    elements.tooltip.style.left = `${clamp(event.clientX - bounds.left + 12, 0, bounds.width - 112)}px`;
    elements.tooltip.style.top = `${clamp(y - 32, 0, bounds.height - 84)}px`;
  }

  ['input', 'change'].forEach(eventName => {
    [elements.revenue, elements.orderValue, elements.leadRate, elements.prospectRate].forEach(element => element.addEventListener(eventName, refresh));
  });
[elements.revenue, elements.orderValue, elements.leadRate, elements.prospectRate].forEach(input => {
  input.addEventListener('input', () => {
    if (Number(input.value) < 0) {
      input.value = 0;
    }
  });
});
  elements.currency.addEventListener('change', () => {
    elements.currencyOutputs.forEach(output => { output.textContent = elements.currency.value; });
  });
 document.getElementById('reset-button').addEventListener('click', () => {
  elements.revenue.value = 10000;
  elements.orderValue.value = 1000;
  refresh();
});
  elements.canvas.addEventListener('mousemove', handleChartPointer);
  elements.canvas.addEventListener('mouseleave', () => { elements.tooltip.style.display = 'none'; });
  window.addEventListener('resize', refresh);
  refresh();
})();
