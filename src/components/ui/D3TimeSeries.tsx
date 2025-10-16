import React from 'react';
import * as d3 from 'd3';

type Point = { date: string; revenue: number; orders: number };

interface D3TimeSeriesProps {
  data: Point[];
  height?: number;
}

export default function D3TimeSeries({ data, height = 260 }: D3TimeSeriesProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  const render = React.useCallback(() => {
    const container = ref.current;
    const svg = d3.select(svgRef.current);
    if (!container || !svgRef.current) return;

    const width = container.clientWidth;
    const margin = { top: 12, right: 48, bottom: 28, left: 48 };
    const innerW = Math.max(0, width - margin.left - margin.right);
    const innerH = Math.max(0, height - margin.top - margin.bottom);

    svg.attr('width', width).attr('height', height);
    
    // Ensure width and height are valid numbers
    if (typeof width !== 'number' || typeof height !== 'number') {
      console.warn('Invalid SVG dimensions:', { width, height });
      return;
    }
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const parseDate = (s: string) => new Date(s + 'T00:00:00');

    const x = d3
      .scaleUtc()
      .domain(d3.extent(data, d => parseDate(d.date)) as [Date, Date])
      .range([0, innerW]);

    const yLeft = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.revenue) || 0])
      .nice()
      .range([innerH, 0]);

    const yRight = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.orders) || 0])
      .nice()
      .range([innerH, 0]);

    const xAxis = d3.axisBottom<Date>(x).ticks(6).tickFormat(d3.utcFormat('%b %d'));
    const yAxisLeft = d3.axisLeft<number>(yLeft).ticks(5).tickFormat(d => `R${Number(d).toLocaleString()}` as any);
    const yAxisRight = d3.axisRight<number>(yRight).ticks(5);

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis as any)
      .call(g => g.selectAll('text').attr('fill', '#6C757D'))
      .call(g => g.selectAll('line').attr('stroke', '#e5e7eb'))
      .call(g => g.select('.domain').attr('stroke', '#e5e7eb'));

    g.append('g')
      .call(yAxisLeft as any)
      .call(g => g.selectAll('text').attr('fill', '#6C757D'))
      .call(g => g.selectAll('line').attr('stroke', '#e5e7eb'))
      .call(g => g.select('.domain').attr('stroke', '#e5e7eb'));

    g.append('g')
      .attr('transform', `translate(${innerW},0)`) 
      .call(yAxisRight as any)
      .call(g => g.selectAll('text').attr('fill', '#6C757D'))
      .call(g => g.selectAll('line').attr('stroke', '#e5e7eb'))
      .call(g => g.select('.domain').attr('stroke', '#e5e7eb'));

    const lineRevenue = d3
      .line<Point>()
      .x(d => x(parseDate(d.date)))
      .y(d => yLeft(d.revenue))
      .defined(d => Number.isFinite(d.revenue));

    const lineOrders = d3
      .line<Point>()
      .x(d => x(parseDate(d.date)))
      .y(d => yRight(d.orders))
      .defined(d => Number.isFinite(d.orders));

    // Grid
    g.append('g')
      .attr('stroke', '#f1f5f9')
      .selectAll('line')
      .data(yLeft.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', d => yLeft(d))
      .attr('y2', d => yLeft(d));

    // Revenue line
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#4682B4')
      .attr('stroke-width', 2)
      .attr('d', lineRevenue);

    // Orders line
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#20C997')
      .attr('stroke-width', 2)
      .attr('d', lineOrders);

    // Legend
    const legend = svg.append('g').attr('transform', `translate(${margin.left},${margin.top - 2})`);
    const items = [
      { name: 'Revenue', color: '#4682B4' },
      { name: 'Orders', color: '#20C997' }
    ];
    items.forEach((it, i) => {
      const lg = legend.append('g').attr('transform', `translate(${i * 100},0)`);
      lg.append('rect').attr('width', 10).attr('height', 10).attr('fill', it.color).attr('rx', 2);
      lg.append('text').attr('x', 14).attr('y', 10).attr('fill', '#6C757D').attr('font-size', 10).text(it.name);
    });
  }, [data, height]);

  React.useEffect(() => {
    render();
  }, [render]);

  React.useEffect(() => {
    const handle = () => render();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, [render]);

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg ref={svgRef} />
    </div>
  );
}


