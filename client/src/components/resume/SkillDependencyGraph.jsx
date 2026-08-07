/**
 * SkillDependencyGraph — Phase 6
 *
 * Ported/adapted from AdaptIQ's frontend/src/Components/SkillDependencyGraph.jsx.
 * Two deliberate changes from the original:
 *   1. Restyled to this project's design system.
 *   2. Wired to Suggestion-linked roadmap items instead of AdaptIQ's standalone
 *      component state, so an edge always traces back to a real skill gap.
 *
 * Direction of an edge is prerequisite → dependent skill ("learn this first").
 * Uses the d3 version already locked in package.json — no competing chart lib.
 */
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const STATUS_COLORS = {
  pending: '#f59e0b', // proposed, awaiting approval
  accepted: '#10b981', // roadmap started
  rejected: '#64748b',
};

export default function SkillDependencyGraph({ roadmaps = [], onNodeClick }) {
  const svgRef = useRef(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!svgRef.current || roadmaps.length === 0) return;

    const el = svgRef.current;
    const W = el.clientWidth || 640;
    const H = el.clientHeight || 420;

    d3.select(el).selectAll('*').remove();

    const nodes = roadmaps.map((r) => ({
      id: r.roadmap?.skill || r.title,
      status: r.status,
      milestoneCount: r.roadmap?.milestones?.length ?? 0,
      raw: r,
    }));

    const nodeIds = new Set(nodes.map((n) => n.id.toLowerCase()));

    // prerequisite → skill, but only for prerequisites that are themselves nodes
    const links = [];
    roadmaps.forEach((r) => {
      const target = r.roadmap?.skill;
      (r.roadmap?.prerequisites ?? []).forEach((prereq) => {
        if (target && nodeIds.has(String(prereq).toLowerCase())) {
          const source = nodes.find((n) => n.id.toLowerCase() === String(prereq).toLowerCase());
          if (source && source.id !== target) links.push({ source: source.id, target });
        }
      });
    });

    const svg = d3
      .select(el)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H);

    // Arrowhead marker so the "learn this first" direction is readable
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'skill-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 32)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#475569');

    const sim = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(140))
      .force('charge', d3.forceManyBody().strength(-320))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(48));

    const link = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#475569')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.7)
      .attr('marker-end', 'url(#skill-arrow)');

    const node = svg
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (event, d) => {
        setSelected(d.raw);
        onNodeClick?.(d.raw);
      });

    // Node radius scales with how much work the roadmap represents
    node
      .append('circle')
      .attr('r', (d) => Math.min(14 + d.milestoneCount * 3, 28))
      .attr('fill', (d) => (STATUS_COLORS[d.status] ?? '#64748b') + 'cc')
      .attr('stroke', (d) => STATUS_COLORS[d.status] ?? '#64748b')
      .attr('stroke-width', 2);

    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => Math.min(14 + d.milestoneCount * 3, 28) + 16)
      .attr('font-size', '11px')
      .attr('fill', '#94a3b8')
      .text((d) => d.id);

    sim.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);
      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [roadmaps, onNodeClick]);

  if (roadmaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 p-12 text-center text-gray-400">
        <span className="text-4xl opacity-40">🕸</span>
        <p>No skill roadmaps yet. Generate one from a skill gap to see the dependency graph.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <svg ref={svgRef} className="h-[420px] w-full" />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-3 text-xs text-gray-400">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            {status}
          </span>
        ))}
        <span className="text-gray-500">Arrow points to what it unlocks · size = milestones</span>
      </div>

      {/* Selected node detail */}
      {selected && (
        <div className="absolute right-3 top-3 w-64 space-y-2 rounded-xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
          <button
            onClick={() => setSelected(null)}
            className="absolute right-3 top-3 text-gray-500 transition-colors hover:text-white"
            aria-label="Close detail"
          >
            ✕
          </button>
          <h4 className="pr-6 font-semibold text-white">{selected.roadmap?.skill}</h4>
          <p className="text-xs text-gray-400">
            {selected.roadmap?.milestones?.length ?? 0} milestones ·{' '}
            {selected.roadmap?.courses?.length ?? 0} courses
          </p>
          {(selected.roadmap?.prerequisites?.length ?? 0) > 0 && (
            <p className="text-xs text-gray-400">
              Learn first: {selected.roadmap.prerequisites.join(', ')}
            </p>
          )}
          <span
            className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              color: STATUS_COLORS[selected.status],
              background: (STATUS_COLORS[selected.status] ?? '#64748b') + '1a',
            }}
          >
            {selected.status}
          </span>
        </div>
      )}
    </div>
  );
}
