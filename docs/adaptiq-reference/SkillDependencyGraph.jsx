/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react';

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function normalize(v) {
  return (v || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9+\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}



function titleCase(v) {
  const s = (v || '').trim();
  if (!s) return '';
  if (s.toUpperCase() === s && s.length <= 6) return s; // keep acronyms
  return s
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/* ─── Comprehensive Dependency Map ──────────────────────────────────────────── */
// Keys are normalized skill names. Values are arrays of prerequisite skill keys.
// Entry points (no prerequisites) just don't appear as values in other skills' dep lists.
const DEP_MAP = {
  // ── Foundational (entry points) ──────────────────────────────
  python:                [],
  javascript:            [],
  typescript:            [],
  sql:                   [],
  git:                   [],
  linux:                 [],
  'command line':        [],
  'database fundamentals': [],
  statistics:            [],
  mathematics:           [],
  'data structures':     [],
  algorithms:            [],
  html:                  [],
  css:                   [],

  // ── Python Ecosystem ──────────────────────────────────────────
  jupyter:               ['python'],
  numpy:                 ['python'],
  pandas:                ['python', 'sql'],
  matplotlib:            ['python', 'numpy'],
  seaborn:               ['matplotlib', 'pandas'],
  scipy:                 ['numpy', 'statistics'],
  'data analysis':       ['jupyter', 'pandas'],
  'data visualization':  ['matplotlib', 'pandas'],
  'data wrangling':      ['pandas'],
  'feature engineering': ['pandas', 'statistics'],

  // ── Machine Learning / AI ─────────────────────────────────────
  'machine learning':    ['python', 'numpy', 'pandas', 'statistics'],
  'scikit learn':        ['python', 'numpy', 'pandas', 'machine learning'],
  'deep learning':       ['machine learning', 'numpy'],
  pytorch:               ['deep learning', 'python'],
  tensorflow:            ['deep learning', 'python'],
  keras:                 ['tensorflow'],
  'computer vision':     ['deep learning', 'numpy'],
  nlp:                   ['deep learning', 'python'],
  'natural language processing': ['deep learning', 'python'],
  transformers:          ['nlp', 'deep learning'],
  'model deployment':    ['machine learning', 'python'],
  mlops:                 ['machine learning', 'git', 'linux'],
  'ai apis':             ['python', 'rest apis'],
  'ai api or model':     ['python', 'rest apis'],
  'llm apis':            ['python', 'ai apis'],
  'generative ai':       ['llm apis', 'transformers'],
  langchain:             ['llm apis', 'python'],
  'prompt engineering':  ['llm apis'],
  'vector databases':    ['python', 'llm apis'],
  rag:                   ['vector databases', 'llm apis'],

  // ── Web / Backend ─────────────────────────────────────────────
  flask:                 ['python'],
  fastapi:               ['python'],
  django:                ['python', 'sql'],
  'rest apis':           ['python'],
  nodejs:                ['javascript'],
  express:               ['nodejs'],
  react:                 ['javascript', 'html', 'css'],
  nextjs:                ['react', 'nodejs'],
  graphql:               ['rest apis'],
  websockets:            ['python'],

  // ── Data Infra / Cloud ────────────────────────────────────────
  mongodb:               ['database fundamentals', 'nosql concepts'],
  postgresql:            ['sql', 'database fundamentals'],
  redis:                 ['database fundamentals'],
  'nosql concepts':      ['database fundamentals'],
  aws:                   ['linux', 'git'],
  docker:                ['linux'],
  kubernetes:            ['docker'],
  'ci/cd':               ['git', 'docker'],
  'cloud computing':     ['linux'],

  // ── Data Engineering ──────────────────────────────────────────
  'data pipelines':      ['pandas', 'sql'],
  airflow:               ['python', 'data pipelines'],
  spark:                 ['python', 'sql', 'data pipelines'],
  kafka:                 ['data pipelines'],
  'etl':                 ['sql', 'data pipelines'],
  snowflake:             ['sql', 'data warehousing'],
  'data warehousing':    ['sql', 'database fundamentals'],
  'big data':            ['spark', 'data pipelines'],

  // ── Document / File Processing ────────────────────────────────
  'pdf generation':      ['python'],
  'pdf parsing':         ['python'],
  pypdf2:                ['python', 'pdf parsing'],
  'pdf manipulation':    ['python', 'pdf parsing'],
  'file processing':     ['python'],

  // ── Dev Tools / Practices ─────────────────────────────────────
  'version control':     ['git'],
  testing:               ['python'],
  'unit testing':        ['python'],
  'api testing':         ['rest apis'],
  debugging:             ['python'],
  'code review':         ['git'],
  agile:                 [],
  scrum:                 ['agile'],
};

/* Description hints for selected skills */
const DETAIL_MAP = {
  python: { desc: 'General-purpose programming language widely used in data science, ML, and backend development.', why: 'Foundation for most data analysis, ML libraries, and AI API integrations.' },
  sql: { desc: 'Language for querying and manipulating relational databases.', why: 'Required before Pandas, data pipelines, and most analytics work.' },
  git: { desc: 'Distributed version control system.', why: 'Required for team collaboration, CI/CD, and MLOps workflows.' },
  jupyter: { desc: 'Interactive notebook environment.', why: 'Standard environment for data exploration and model experimentation.' },
  pandas: { desc: 'Tabular data manipulation for Python.', why: 'Core skill for cleaning and transforming datasets before modelling.' },
  'machine learning': { desc: 'Algorithms that learn patterns from data.', why: 'Prerequisite for deep learning, NLP, and computer vision work.' },
  'deep learning': { desc: 'Neural network architectures for complex tasks.', why: 'Unlocks PyTorch, TensorFlow, and advanced AI models.' },
  'ai apis': { desc: 'Integrating AI/LLM models via HTTP APIs.', why: 'Enables RAG, generative AI features, and prompt engineering.' },
  'ai api or model': { desc: 'Using AI/ML models directly or via cloud APIs.', why: 'Core for building AI-powered applications quickly.' },
  react: { desc: 'Component-based UI library for JavaScript.', why: 'Foundation for modern frontend development including Next.js.' },
  docker: { desc: 'Containerization platform for portable apps.', why: 'Required for Kubernetes and modern CI/CD deployments.' },
  'pdf generation': { desc: 'Creating PDF documents programmatically in Python.', why: 'Required for e.g. report generation and resume output features.' },
  'pdf parsing': { desc: 'Extracting text and data from PDF files.', why: 'Needed for document AI pipelines (like AdaptIQ\'s resume parsing).' },
  'rest apis': { desc: 'HTTP-based API design and consumption.', why: 'Prerequisite for Flask, FastAPI, AI API integrations, and GraphQL.' },
};

/* ─── Graph Build ────────────────────────────────────────────────────────────── */
function buildGraph({ gaps, matched, completed }) {
  const gapKeys = new Set(gaps.map(normalize).filter(Boolean));
  const matchedKeys = new Set(matched.map(normalize).filter(Boolean));
  const completedKeys = new Set(completed.map(normalize).filter(Boolean));

  // Map: key → { id, label, status, deps: [key], depth }
  const nodeMap = new Map();
  const edges = []; // { from: key, to: key }

  const ensure = (rawName) => {
    const key = normalize(rawName);
    if (!key) return null;
    if (!nodeMap.has(key)) {
      nodeMap.set(key, {
        id: key,
        key,
        label: titleCase(rawName),
        status: 'partial',
        deps: [],
        depth: 0,
      });
    }
    return nodeMap.get(key);
  };

  const addWithDeps = (name) => {
    const node = ensure(name);
    if (!node) return;
    const depKeys = (DEP_MAP[node.key] || []).map(normalize).filter(Boolean);
    depKeys.forEach((dk) => {
      const dep = ensure(dk);
      if (!dep) return;
      // Avoid adding edges for deps that aren't relevant (not in gap/matched)
      // But DO add them if they're prerequisites of something in the gap list
      const edgeExists = edges.some((e) => e.from === dk && e.to === node.key);
      if (!edgeExists) edges.push({ from: dk, to: node.key });
      addWithDeps(dk); // recurse
    });
  };

  gaps.forEach(addWithDeps);
  matched.forEach((s) => ensure(s)); // add matched nodes without deps recursion

  // Status assignment
  for (const node of nodeMap.values()) {
    if (completedKeys.has(node.key) || matchedKeys.has(node.key)) node.status = 'complete';
    else if (gapKeys.has(node.key)) node.status = 'gap';
    else node.status = 'partial'; // prerequisite
  }

  // De-dup edges
  const seenEdges = new Set();
  const uniqueEdges = edges.filter((e) => {
    const k = `${e.from}->${e.to}`;
    if (seenEdges.has(k)) return false;
    seenEdges.add(k);
    return true;
  });

  // Remove self-loops
  const cleanEdges = uniqueEdges.filter((e) => e.from !== e.to);

  // Topological sort + compute depth (longest path = column)
  const inDeg = new Map();
  const outAdj = new Map();
  for (const n of nodeMap.values()) { inDeg.set(n.id, 0); outAdj.set(n.id, []); }
  for (const e of cleanEdges) {
    inDeg.set(e.to, (inDeg.get(e.to) || 0) + 1);
    outAdj.get(e.from)?.push(e.to);
  }

  const queue = [];
  for (const [id, d] of inDeg.entries()) if (d === 0) queue.push(id);
  const topo = [];
  while (queue.length) {
    const id = queue.shift();
    topo.push(id);
    for (const nxt of (outAdj.get(id) || [])) {
      const nd = (inDeg.get(nxt) || 0) - 1;
      inDeg.set(nxt, nd);
      if (nd === 0) queue.push(nxt);
    }
  }

  // Depth via longest path
  const depthMap = new Map();
  for (const id of topo) depthMap.set(id, 0);
  for (const id of topo) {
    const d = depthMap.get(id) || 0;
    for (const nxt of (outAdj.get(id) || [])) {
      depthMap.set(nxt, Math.max(depthMap.get(nxt) || 0, d + 1));
    }
  }
  for (const node of nodeMap.values()) node.depth = depthMap.get(node.id) || 0;

  return {
    nodes: Array.from(nodeMap.values()),
    edges: cleanEdges,
    topo,
    gapKeys,
    matchedKeys,
    completedKeys,
  };
}

/* ─── Deterministic Layered Layout ──────────────────────────────────────────── */
// Assigns pixel (cx, cy) center coordinates to each node.
// Entry points (depth=0) go in column 0, etc.
// Returns the total canvas width and height needed.
const NODE_W = 200;
const NODE_H = 72;
const COL_GAP = 80;  // horizontal gap between node right edge and next column left edge
const ROW_GAP = 20;  // vertical gap between nodes in the same column

function computeLayout(nodes) {
  // Group by depth
  const columns = new Map(); // depth → [node]
  for (const n of nodes) {
    if (!columns.has(n.depth)) columns.set(n.depth, []);
    columns.get(n.depth).push(n);
  }

  // Sort within each column in a stable way (gap first, then partial, then complete — so important skills appear top)
  const statusOrder = { gap: 0, partial: 1, complete: 2 };
  for (const list of columns.values()) {
    list.sort((a, b) => {
      const sd = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
      if (sd !== 0) return sd;
      return a.label.localeCompare(b.label);
    });
  }

  const maxDepth = Math.max(0, ...nodes.map((n) => n.depth));
  const numCols = maxDepth + 1;

  // Column heights
  const colHeight = (depth) => {
    const list = columns.get(depth) || [];
    return list.length * NODE_H + Math.max(0, list.length - 1) * ROW_GAP;
  };

  const maxColH = Math.max(...Array.from({ length: numCols }, (_, i) => colHeight(i)), NODE_H);

  const MARGIN_X = 28;
  const MARGIN_Y = 28;
  const colW = NODE_W + COL_GAP;
  const totalW = MARGIN_X * 2 + numCols * colW - COL_GAP;
  const totalH = MARGIN_Y * 2 + maxColH;

  // Assign positions
  for (let depth = 0; depth <= maxDepth; depth++) {
    const list = columns.get(depth) || [];
    const colH = colHeight(depth);
    const startY = MARGIN_Y + (maxColH - colH) / 2; // center column vertically

    list.forEach((n, i) => {
      n.cx = MARGIN_X + depth * colW + NODE_W / 2;
      n.cy = startY + i * (NODE_H + ROW_GAP) + NODE_H / 2;
      n.w = NODE_W;
      n.h = NODE_H;
    });
  }

  return { totalW: Math.max(totalW, 520), totalH: Math.max(totalH, 300) };
}

/* ─── Difficulty by depth ────────────────────────────────────────────────────── */
function difficulty(depth) {
  if (depth <= 1) return { label: 'Beginner', color: '#00E5A0' };
  if (depth === 2) return { label: 'Intermediate', color: '#F5A623' };
  return { label: 'Advanced', color: '#FF4D6D' };
}

function hours(depth, depsCount) {
  return Math.max(4, 6 + depth * 4 + depsCount * 2);
}

/* ─── Canvas Drawing Utilities ───────────────────────────────────────────────── */
function rrect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawArrow(ctx, x1, y1, x2, y2, color) {
  // Orthogonal routing: exit from right-center of source, enter left-center of target
  const dx = x2 - x1;
  const midX = x1 + dx / 2;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(midX, y1, midX, y2, x2, y2);
  ctx.stroke();

  // Arrow head
  const headLen = 9;
  const angle = Math.atan2(y2 - y1, x2 - x1); // approximate at destination
  // Since we arrive horizontally from left, angle ≈ 0
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - 0.38), y2 - headLen * Math.sin(angle - 0.38));
  ctx.lineTo(x2 - headLen * Math.cos(angle + 0.38), y2 - headLen * Math.sin(angle + 0.38));
  ctx.closePath();
  ctx.fill();
}

function statusColor(status) {
  if (status === 'complete') return '#00E5A0';
  if (status === 'gap') return '#FF4D6D';
  return '#F5A623'; // partial / prerequisite
}

/* ─── Main Component ────────────────────────────────────────────────────────── */
export default function SkillDependencyGraph({
  analysisResult,
  skills = [],
  onMarkCompleteByName,
  onOpenResource,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [selected, setSelected] = useState(null); // node key
  const [recommendedOn, setRecommendedOn] = useState(false);
  const [extraCompleted, setExtraCompleted] = useState(() => {
    try {
      const raw = localStorage.getItem('graphCompleted_v2');
      return new Set(JSON.parse(raw) || []);
    } catch { return new Set(); }
  });
  const [resourceLinks, setResourceLinks] = useState({});
  const [scroll, setScroll] = useState({ x: 0, y: 0 });

  // Build graph
  const graph = useMemo(() => {
    const gaps = analysisResult?.skills_to_improve || [];
    const matched = analysisResult?.matching_skills || [];
    const completedFromRoadmap = (skills || []).filter((s) => s.completed).map((s) => s.name);
    const completed = [...completedFromRoadmap, ...Array.from(extraCompleted)];
    return buildGraph({ gaps, matched, completed });
  }, [analysisResult, skills, extraCompleted]);

  // Compute layout once (pure function)
  const layoutData = useMemo(() => {
    computeLayout(graph.nodes); // mutates node.cx/cy
    return computeLayout(graph.nodes); // second call for stable dims
  }, [graph]);

  // Recommended path ordering
  const recommendedOrder = useMemo(() => {
    if (!recommendedOn) return new Map();
    const incomplete = graph.topo.filter((id) => !graph.completedKeys.has(id));
    const m = new Map();
    incomplete.forEach((id, i) => m.set(id, i + 1));
    return m;
  }, [recommendedOn, graph]);

  // Node lookup by key
  const nodeByKey = useMemo(() => {
    const m = new Map();
    graph.nodes.forEach((n) => m.set(n.key, n));
    return m;
  }, [graph]);

  const selectedNode = selected ? nodeByKey.get(selected) : null;

  // Persist extra completions
  useEffect(() => {
    localStorage.setItem('graphCompleted_v2', JSON.stringify(Array.from(extraCompleted)));
  }, [extraCompleted]);

  // ── Canvas render ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const { totalW, totalH } = layoutData;
    canvas.width = Math.round(totalW * dpr);
    canvas.height = Math.round(totalH * dpr);
    canvas.style.width = `${totalW}px`;
    canvas.style.height = `${totalH}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, totalW, totalH);

    // Background grid
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#00E5A0';
    ctx.lineWidth = 1;
    for (let x = 0; x < totalW; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, totalH); ctx.stroke(); }
    for (let y = 0; y < totalH; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(totalW, y); ctx.stroke(); }
    ctx.restore();

    // ── Draw edges────────────────────────────────────────────────
    graph.edges.forEach((e) => {
      const a = nodeByKey.get(e.from);
      const b = nodeByKey.get(e.to);
      if (!a || !b) return;

      const isRecommended = recommendedOn;
      const color = isRecommended
        ? (graph.completedKeys.has(a.key) ? 'rgba(0,229,160,0.45)' : 'rgba(245,166,35,0.5)')
        : 'rgba(0,229,160,0.22)';

      // Route: right-center of 'a' → left-center of 'b'
      const x1 = a.cx + a.w / 2;
      const y1 = a.cy;
      const x2 = b.cx - b.w / 2;
      const y2 = b.cy;
      drawArrow(ctx, x1, y1, x2, y2, color);
    });

    // ── Draw nodes ────────────────────────────────────────────────
    graph.nodes.forEach((n) => {
      const x = n.cx - n.w / 2;
      const y = n.cy - n.h / 2;
      const sel = n.key === selected;
      const sColor = statusColor(n.status);
      const diff = difficulty(n.depth);
      const depsCount = graph.edges.filter((e) => e.to === n.key).length;
      const hrs = hours(n.depth, depsCount);
      const recIdx = recommendedOrder.get(n.key);

      // Glow for unlocked next-steps
      const isEntry = graph.edges.filter((e) => e.to === n.key).length === 0;
      const unlockedPreqs = graph.edges.filter((e) => e.to === n.key).every((e) => graph.completedKeys.has(e.from));
      const isNextUp = n.status !== 'complete' && (isEntry || unlockedPreqs);

      ctx.save();
      if (sel) { ctx.shadowColor = '#F5A623'; ctx.shadowBlur = 18; }
      else if (isNextUp && recommendedOn) { ctx.shadowColor = 'rgba(245,166,35,0.4)'; ctx.shadowBlur = 14; }
      else { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; }

      // Card background
      rrect(ctx, x, y, n.w, n.h, 14);
      ctx.fillStyle = n.status === 'complete' ? 'rgba(0,229,160,0.05)' : 'rgba(10,10,26,0.92)';
      ctx.fill();
      ctx.strokeStyle = sel ? '#F5A623' : (recIdx ? 'rgba(245,166,35,0.65)' : sColor + '99');
      ctx.lineWidth = sel ? 2.5 : 1.5;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Status dot
      ctx.beginPath();
      ctx.arc(x + n.w - 16, y + 16, 5, 0, Math.PI * 2);
      ctx.fillStyle = sColor;
      ctx.fill();

      // Recommended order badge
      if (recIdx) {
        ctx.fillStyle = 'rgba(245,166,35,0.9)';
        ctx.font = 'bold 10px ui-monospace, monospace';
        ctx.fillText(`#${recIdx}`, x + 12, y + 16);
      }

      // Skill name
      ctx.fillStyle = n.status === 'complete' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.92)';
      ctx.font = '600 12px ui-monospace, SFMono-Regular, monospace';
      const label = n.label.length > 22 ? n.label.slice(0, 22) + '…' : n.label;
      ctx.fillText(label, x + 12, y + 27);

      // Level badge
      ctx.font = 'bold 9px ui-monospace, monospace';
      const bW = ctx.measureText(diff.label).width + 14;
      rrect(ctx, x + 10, y + 42, bW, 17, 8);
      ctx.fillStyle = diff.color + '22'; ctx.fill();
      ctx.strokeStyle = diff.color + '88'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = diff.color;
      ctx.fillText(diff.label, x + 17, y + 54);

      // Hours badge
      const hLabel = `${hrs}h`;
      const hW = ctx.measureText(hLabel).width + 14;
      rrect(ctx, x + 10 + bW + 8, y + 42, hW, 17, 8);
      ctx.fillStyle = 'rgba(245,166,35,0.12)'; ctx.fill();
      ctx.strokeStyle = 'rgba(245,166,35,0.6)'; ctx.stroke();
      ctx.fillStyle = '#F5A623';
      ctx.fillText(hLabel, x + 10 + bW + 15, y + 54);

      // ✓ mini button (bottom-right)
      const btnSz = 18;
      const btnX = x + n.w - 12 - btnSz;
      const btnY = y + n.h - 10 - btnSz;
      rrect(ctx, btnX, btnY, btnSz, btnSz, 6);
      ctx.fillStyle = 'rgba(0,229,160,0.12)'; ctx.fill();
      ctx.strokeStyle = 'rgba(0,229,160,0.5)'; ctx.stroke();
      ctx.fillStyle = '#00E5A0';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('✓', btnX + 4, btnY + 13);

      ctx.restore();
    });
  }, [graph, layoutData, selected, recommendedOn, recommendedOrder, nodeByKey]);

  /* ── Hit testing ─────────────────────────────────────────────────────────── */
  const hitTest = (px, py) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const wx = px - rect.left + (wrapRef.current?.scrollLeft || 0);
    const wy = py - rect.top + (wrapRef.current?.scrollTop || 0);
    return [...graph.nodes].reverse().find((n) => {
      const x = n.cx - n.w / 2;
      const y = n.cy - n.h / 2;
      return wx >= x && wx <= x + n.w && wy >= y && wy <= y + n.h;
    }) || null;
  };

  const handleClick = (e) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (!hit) { setSelected(null); return; }

    // Check if ✓ button was clicked
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const wx = e.clientX - rect.left + (wrapRef.current?.scrollLeft || 0);
    const wy = e.clientY - rect.top + (wrapRef.current?.scrollTop || 0);
    const btnSz = 18;
    const btnX = hit.cx - hit.w / 2 + hit.w - 12 - btnSz;
    const btnY = hit.cy - hit.h / 2 + hit.h - 10 - btnSz;
    if (wx >= btnX && wx <= btnX + btnSz && wy >= btnY && wy <= btnY + btnSz) {
      markComplete(hit);
      return;
    }

    setSelected(hit.key);
  };

  /* ── Mark complete ────────────────────────────────────────────────────────── */
  const markComplete = (node) => {
    if (!node) return;
    const didMark = onMarkCompleteByName?.(node.label || titleCase(node.key));
    if (!didMark) {
      setExtraCompleted((prev) => new Set([...prev, node.key]));
    }
    // Optimistically update status in graph
    node.status = 'complete';
  };

  /* ── Resource link ───────────────────────────────────────────────────────── */
  const openResource = async () => {
    if (!selectedNode) return;
    const url = await onOpenResource?.(selectedNode.label || titleCase(selectedNode.key));
    if (url) {
      setResourceLinks((prev) => ({ ...prev, [selectedNode.key]: url }));
      window.open(url, '_blank');
    }
  };

  /* ── Details panel ───────────────────────────────────────────────────────── */
  const selectedDetails = useMemo(() => {
    if (!selectedNode) return null;
    const base = DETAIL_MAP[selectedNode.key] || {};
    const unlocks = graph.edges.filter((e) => e.from === selectedNode.key).map((e) => e.to);
    const prerequisites = graph.edges.filter((e) => e.to === selectedNode.key).map((e) => e.from);
    const unlockLabels = unlocks.map((id) => nodeByKey.get(id)?.label || titleCase(id)).filter(Boolean);
    const prereqLabels = prerequisites.map((id) => nodeByKey.get(id)?.label || titleCase(id)).filter(Boolean);

    const statusLabel = graph.completedKeys.has(selectedNode.key)
      ? 'Completed / Matched'
      : selectedNode.status === 'gap'
        ? 'Gap (needs learning)'
        : 'Prerequisite';

    return {
      status: statusLabel,
      description: base.desc || 'A skill in your adaptive learning roadmap.',
      why: base.why || (unlockLabels.length ? `Unlocks: ${unlockLabels.join(', ')}` : 'Supports downstream skills.'),
      prereqs: prereqLabels,
      unlocks: unlockLabels,
      link: resourceLinks[selectedNode.key] || '',
    };
  }, [selectedNode, graph, nodeByKey, resourceLinks]);

  const { totalW, totalH } = layoutData;

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            🕸️ Skill Dependency Graph
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Entry points (no prerequisites) appear on the left. Click a node to inspect. ✓ to mark complete.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRecommendedOn((v) => !v)}
            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border"
            style={{
              background: recommendedOn ? 'rgba(245,166,35,0.14)' : 'rgba(255,255,255,0.04)',
              borderColor: recommendedOn ? 'rgba(245,166,35,0.55)' : 'rgba(255,255,255,0.07)',
              color: recommendedOn ? '#F5A623' : '#CBD5E1',
            }}
          >
            {recommendedOn ? '✦ Recommended Path: ON' : 'Recommended Path'}
          </button>
        </div>
      </div>

      {/* Canvas (scrollable) */}
      <div className="p-4">
        <div
          ref={wrapRef}
          className="rounded-2xl border overflow-auto"
          style={{
            background: 'rgba(0,0,0,0.35)',
            borderColor: 'rgba(0,229,160,0.15)',
            maxHeight: 520,
          }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleClick}
            style={{
              display: 'block',
              width: totalW,
              height: totalH,
              cursor: 'pointer',
            }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-2 text-right">
          Scroll horizontally to see deeper dependencies · {graph.nodes.length} nodes · {graph.edges.length} edges
        </p>
      </div>

      {/* Details + Legend */}
      <div className="px-4 pb-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Details panel */}
        <div
          className="lg:col-span-2 rounded-2xl p-4 border"
          style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          {selectedNode ? (
            <>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-bold text-white">{selectedNode.label}</p>
                  <p className="text-xs mt-1" style={{ color: statusColor(selectedNode.status) }}>
                    {selectedDetails?.status}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => markComplete(selectedNode)}
                    className="px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200"
                    style={{ background: 'rgba(0,229,160,0.12)', border: '1px solid rgba(0,229,160,0.35)', color: '#00E5A0' }}
                  >
                    Mark as Complete
                  </button>
                  <button
                    type="button"
                    onClick={openResource}
                    className="px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200"
                    style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.35)', color: '#F5A623' }}
                  >
                    📚 Resource Link
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-2 text-xs text-gray-300">
                <p><span className="text-gray-500">About: </span>{selectedDetails?.description}</p>
                <p><span className="text-gray-500">Why: </span>{selectedDetails?.why}</p>
                {selectedDetails?.prereqs?.length > 0 && (
                  <p><span className="text-gray-500">Requires: </span>
                    {selectedDetails.prereqs.map((p, i) => (
                      <span key={i} className="inline-block mr-1 px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(245,166,35,0.1)', color: '#F5A623' }}>{p}</span>
                    ))}
                  </p>
                )}
                {selectedDetails?.unlocks?.length > 0 && (
                  <p><span className="text-gray-500">Unlocks: </span>
                    {selectedDetails.unlocks.map((u, i) => (
                      <span key={i} className="inline-block mr-1 px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(0,229,160,0.08)', color: '#00E5A0' }}>{u}</span>
                    ))}
                  </p>
                )}
                {selectedDetails?.link && (
                  <p>
                    <span className="text-gray-500">Resource: </span>
                    <a href={selectedDetails.link} target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300 underline underline-offset-4">{selectedDetails.link}</a>
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Click any node to inspect its details, prerequisites, and what it unlocks.</p>
          )}
        </div>

        {/* Legend */}
        <div
          className="rounded-2xl p-4 border"
          style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <p className="text-sm font-bold text-white mb-3">Legend</p>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#FF4D6D' }} />Gap — needs to be learned</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#F5A623' }} />Prerequisite — supports gaps</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#00E5A0' }} />Matched / Completed</div>
            <div className="pt-2 border-t border-white/5 space-y-1">
              <p className="text-gray-500 font-semibold">How to read the graph:</p>
              <p>→ Arrows flow left→right (prerequisites to dependents).</p>
              <p>→ Entry nodes (left column) have no prerequisites.</p>
              <p>→ Enable <em>Recommended Path</em> to see the optimal learning order numbered on each node.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
