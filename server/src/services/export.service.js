/**
 * Export Service
 * Generates DOCX (via docxtemplater) and PDF (via Puppeteer) from resume data.
 */
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const puppeteer = require('puppeteer');

const EXPORTS_DIR = path.join(__dirname, '..', '..', 'uploads', 'exports');
const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');

// Ensure exports directory exists
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

/**
 * Generate a DOCX file from resume sections using docxtemplater.
 */
async function generateDocx(resumeId, sections, { suffix = '' } = {}) {
  const templatePath = path.join(TEMPLATES_DIR, 'resume_template.docx');

  if (!fs.existsSync(templatePath)) {
    throw new Error('DOCX template not found at ' + templatePath);
  }

  const templateContent = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(templateContent);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Prepare template data
  const templateData = {
    name: sections.personalInfo?.name || '',
    email: sections.personalInfo?.email || '',
    phone: sections.personalInfo?.phone || '',
    location: sections.personalInfo?.location || '',
    linkedin: sections.personalInfo?.linkedin || '',
    github: sections.personalInfo?.github || '',
    summary: sections.summary || '',
    skills: (sections.skills || []).join(', '),
    experience: (sections.experience || []).map((exp) => ({
      company: exp.company || '',
      role: exp.role || '',
      duration: exp.duration || '',
      bullets: (exp.bullets || []).map((b) => ({ text: b })),
    })),
    education: (sections.education || []).map((edu) => ({
      institution: edu.institution || '',
      degree: edu.degree || '',
      year: edu.year || '',
      gpa: edu.gpa || '',
    })),
    projects: (sections.projects || []).map((proj) => ({
      name: proj.name || '',
      description: proj.description || '',
      techStack: (proj.techStack || []).join(', '),
      link: proj.link || '',
    })),
    certifications: (sections.certifications || []).map((c) => ({ text: c })),
  };

  doc.render(templateData);

  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  const outputPath = path.join(EXPORTS_DIR, `${resumeId}${suffix}.docx`);
  fs.writeFileSync(outputPath, buf);

  return outputPath;
}

/**
 * Selectable PDF templates (Phase 7, §6.8). Same content, different presentation —
 * only the CSS varies, so no template can change what the resume says.
 */
const TEMPLATES = {
  modern: {
    label: 'Modern',
    accent: '#2563eb',
    css: `
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11pt; }
      h1 { font-size: 22pt; }
      h2 { border-bottom: 2px solid var(--accent); text-transform: uppercase; letter-spacing: 1px; }
      .skill-tag { background: #eff6ff; color: var(--accent); border-radius: 4px; }
    `,
  },
  classic: {
    label: 'Classic',
    accent: '#1f2937',
    css: `
      body { font-family: Georgia, 'Times New Roman', serif; font-size: 11.5pt; }
      h1 { font-size: 24pt; text-align: center; }
      .contact { text-align: center; }
      h2 { border-bottom: 1px solid var(--accent); font-variant: small-caps; letter-spacing: 0.5px; }
      .skill-tag { background: transparent; color: #1f2937; border: 1px solid #cbd5e1; border-radius: 2px; }
    `,
  },
  compact: {
    label: 'Compact',
    accent: '#0f766e',
    css: `
      body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 9.5pt; line-height: 1.35; padding: 12px; }
      h1 { font-size: 18pt; }
      h2 { font-size: 11pt; border-bottom: 1px solid var(--accent); margin: 10px 0 5px; text-transform: uppercase; }
      .entry { margin-bottom: 6px; }
      .skill-tag { background: #f0fdfa; color: var(--accent); border-radius: 3px; font-size: 8.5pt; }
    `,
  },
};

/** Escape user content before it goes into HTML. */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only allow safe URL schemes in generated links. */
function safeUrl(value) {
  const url = String(value ?? '').trim();
  return /^https?:\/\//i.test(url) ? esc(url) : '';
}

/**
 * Generate a PDF from resume data using Puppeteer.
 *
 * @param {string} resumeId
 * @param {object} sections - may be a redacted copy; this function never redacts
 * @param {object} [options]
 * @param {string} [options.template='modern']
 * @param {string} [options.suffix=''] - filename suffix, e.g. '-redacted'
 */
async function generatePdf(resumeId, sections, { template = 'modern', suffix = '' } = {}) {
  const html = buildResumeHtml(sections, template);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const outputPath = path.join(EXPORTS_DIR, `${resumeId}${suffix}.pdf`);

    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      printBackground: true,
      pageRanges: '1',
    });

    return outputPath;
  } finally {
    // Always close, even if rendering threw — a leaked Chromium blocks the next export.
    await browser.close();
  }
}

/**
 * Build a styled HTML resume for PDF generation.
 * All interpolated values are escaped — this is the artifact that leaves the
 * system, so it must not be possible for resume text to inject markup.
 */
function buildResumeHtml(sections, templateKey = 'modern') {
  const template = TEMPLATES[templateKey] ?? TEMPLATES.modern;
  const pi = sections.personalInfo || {};

  const experienceHtml = (sections.experience || [])
    .map(
      (exp) => `
      <div class="entry">
        <div class="entry-header">
          <span><strong>${esc(exp.role)}</strong>${exp.company ? ` at <em>${esc(exp.company)}</em>` : ''}</span>
          <span class="duration">${esc(exp.duration)}</span>
        </div>
        <ul>${(exp.bullets || []).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      </div>`
    )
    .join('');

  const educationHtml = (sections.education || [])
    .map(
      (edu) => `
      <div class="entry">
        <strong>${esc(edu.degree)}</strong>${edu.institution ? ` — ${esc(edu.institution)}` : ''}
        <span class="duration">${esc(edu.year)}${edu.gpa ? ` | GPA: ${esc(edu.gpa)}` : ''}</span>
      </div>`
    )
    .join('');

  const projectsHtml = (sections.projects || [])
    .map((proj) => {
      const link = safeUrl(proj.link);
      return `
      <div class="entry">
        <strong>${esc(proj.name)}</strong>
        ${link ? `<a href="${link}">${link}</a>` : ''}
        <p>${esc(proj.description)}</p>
        ${proj.techStack?.length ? `<p class="tech-stack">Tech: ${esc(proj.techStack.join(', '))}</p>` : ''}
      </div>`;
    })
    .join('');

  const linkedin = safeUrl(pi.linkedin);
  const github = safeUrl(pi.github);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    :root { --accent: ${template.accent}; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { color: #1a1a1a; line-height: 1.5; padding: 20px; }
    h1 { color: #0f172a; margin-bottom: 4px; }
    .contact { color: #475569; font-size: 9pt; margin-bottom: 16px; }
    .contact a { color: var(--accent); text-decoration: none; }
    h2 { font-size: 13pt; color: #0f172a; padding-bottom: 2px; margin: 16px 0 8px; }
    .entry { margin-bottom: 10px; }
    .entry-header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .duration { color: #64748b; font-size: 9pt; white-space: nowrap; }
    ul { margin-left: 20px; margin-top: 4px; }
    li { margin-bottom: 2px; }
    .skills { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-tag { padding: 2px 8px; font-size: 9pt; }
    .tech-stack { color: #64748b; font-size: 9pt; font-style: italic; }
    .cert-list { list-style: disc; margin-left: 20px; }
    ${template.css}
  </style>
</head>
<body>
  <h1>${esc(pi.name) || 'Your Name'}</h1>
  <div class="contact">
    ${[pi.email, pi.phone, pi.location].filter(Boolean).map(esc).join(' | ')}
    ${linkedin ? ` | <a href="${linkedin}">LinkedIn</a>` : ''}
    ${github ? ` | <a href="${github}">GitHub</a>` : ''}
  </div>

  ${sections.summary ? `<h2>Professional Summary</h2><p>${esc(sections.summary)}</p>` : ''}

  ${(sections.experience || []).length ? `<h2>Experience</h2>${experienceHtml}` : ''}

  ${(sections.education || []).length ? `<h2>Education</h2>${educationHtml}` : ''}

  ${(sections.skills || []).length ? `<h2>Skills</h2><div class="skills">${sections.skills.map((s) => `<span class="skill-tag">${esc(s)}</span>`).join('')}</div>` : ''}

  ${(sections.projects || []).length ? `<h2>Projects</h2>${projectsHtml}` : ''}

  ${(sections.certifications || []).length ? `<h2>Certifications</h2><ul class="cert-list">${sections.certifications.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
</body>
</html>`;
}

/** Template list for the client's <TemplatePicker>. */
function listTemplates() {
  return Object.entries(TEMPLATES).map(([key, t]) => ({ key, label: t.label, accent: t.accent }));
}

module.exports = { generateDocx, generatePdf, listTemplates, TEMPLATES };
