/**
 * MemoryGraph — Phase 3
 * D3 force-directed node-link visualization (PROJECT.md §7.5).
 *
 * - Nodes = memories; sized by confidence; colored by type
 * - Edges = inferred relationships (same category or sequential same-session)
 * - Click node → opens detail panel
 *
 * D3 version is locked in client/package.json — do not add a competing charting lib.
 */
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const TYPE_COLORS = {
  session:   '#64748b',
  temporary: '#f59e0b',
  long_term: '#10b981',
  career:    '#6366f1',
  sensitive: '#ef4444',
  hidden:    '#8b5cf6',
};

export default function MemoryGraph({ memories = [], onNodeClick }) {
  const svgRef   = useRef(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!svgRef.current || memories.length === 0) return;

    const el = svgRef.current;
    const W = el.clientWidth  || 600;
    const H = el.clientHeight || 420;

    // Clear previous render
    d3.select(el).selectAll('*').remove();

    // Build nodes
    const nodes = memories.map(m => ({
      id:         m._id,
      label:      (m.userModifiedContent || m.content).slice(0, 28) + '…',
      type:       m.type,
      category:   m.category,
      confidence: m.confidence || 0.7,
      raw:        m,
    }));

    // Build edges: connect memories of the same category
    const links = [];
    const catMap = {};
    nodes.forEach(n => {
      if (!catMap[n.category]) catMap[n.category] = [];
      catMap[n.category].push(n.id);
    });
    Object.values(catMap).forEach(ids => {
      for (let i = 0; i < ids.length - 1; i++) {
        links.push({ source: ids[i], target: ids[i + 1] });
      }
    });

    const svg = d3.select(el)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H);

    // Defs: glow filter for selected node
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(90))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(35));

    // Links
    const link = svg.append('g')
      .attr('class', 'graph-links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#334155')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.5);

    // Nodes group
    const node = svg.append('g')
      .attr('class', 'graph-nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'graph-node')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end',   (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('click', (event, d) => {
        setSelected(d.raw);
        onNodeClick?.(d.raw);
      });

    // Node circles — size = confidence * 18 + 10
    node.append('circle')
      .attr('r', d => d.confidence * 18 + 10)
      .attr('fill', d => TYPE_COLORS[d.type] + 'cc')
      .attr('stroke', d => TYPE_COLORS[d.type])
      .attr('stroke-width', 2);

    // Node labels
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.confidence * 18 + 24)
      .attr('font-size', '10px')
      .attr('fill', '#94a3b8')
      .text(d => d.label);

    // Tick
    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [memories]);

  return (
    <div className="memory-graph-wrapper">
      {memories.length === 0 ? (
        <div className="graph-empty">
          <p>No memories to visualize yet. Accept some Memory Cards during chat.</p>
        </div>
      ) : (
        <>
          <svg ref={svgRef} className="memory-graph-svg" />
          {/* Legend */}
          <div className="graph-legend">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <span key={type} className="graph-legend-item">
                <span className="graph-legend-dot" style={{ background: color }} />
                {type}
              </span>
            ))}
            <span className="graph-legend-note">Node size = confidence</span>
          </div>
          {/* Selected node detail panel */}
          {selected && (
            <div className="graph-detail-panel">
              <button className="graph-detail-close" onClick={() => setSelected(null)}>✕</button>
              <h4 className="graph-detail-title">🧠 Memory Detail</h4>
              <p className="graph-detail-content">{selected.userModifiedContent || selected.content}</p>
              <div className="graph-detail-meta">
                <span>Type: {selected.type}</span>
                <span>Category: {selected.category}</span>
                <span>Confidence: {Math.round((selected.confidence || 0) * 100)}%</span>
                <span>Status: {selected.status}</span>
                {selected.expiresAt && (
                  <span>Expires: {new Date(selected.expiresAt).toLocaleDateString()}</span>
                )}
              </div>
              {selected.rationale && (
                <p className="graph-detail-rationale">→ {selected.rationale}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
