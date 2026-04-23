/* ===================================================
   PromptTune – app.js
   Rule-based prompt enhancer — no AI, no API
   =================================================== */

'use strict';

/* ── Theme ─────────────────────────────────────── */
(function initTheme() {
  const saved = localStorage.getItem('pt-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();

document.addEventListener('DOMContentLoaded', () => {

  /* ── Theme toggle ──────────────────────────── */
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    updateThemeIcon();
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('pt-theme', next);
      updateThemeIcon();
    });
  }

  function updateThemeIcon() {
    if (!themeToggle) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    themeToggle.textContent = isDark ? '☀︎' : '◑';
  }

  /* ── Mobile nav ────────────────────────────── */
  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      siteNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', siteNav.classList.contains('open'));
    });
    // close on link click
    siteNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => siteNav.classList.remove('open'));
    });
  }

  /* ── Active nav link ───────────────────────── */
  const path = window.location.pathname;
  document.querySelectorAll('.site-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && (path.endsWith(href) || (href === '../index.html' && path === '/'))) {
      a.classList.add('active');
    }
  });

  /* ── Cookie banner ─────────────────────────── */
  const cookieBanner = document.getElementById('cookieBanner');
  const cookieAccept = document.getElementById('cookieAccept');
  if (cookieBanner && cookieAccept) {
    if (!localStorage.getItem('pt-cookies')) {
      cookieBanner.style.display = 'flex';
    }
    cookieAccept.addEventListener('click', () => {
      localStorage.setItem('pt-cookies', '1');
      cookieBanner.style.display = 'none';
    });
  }

  /* ── FAQ accordion ─────────────────────────── */
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-q');
    if (btn) {
      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    }
  });

  /* ── Main prompt tool (only on index) ──────── */
  const promptInput  = document.getElementById('promptInput');
  const improveBtn   = document.getElementById('improveBtn');
  const clearBtn     = document.getElementById('clearBtn');
  const outputSection = document.getElementById('outputSection');
  const outputBox    = document.getElementById('outputBox');
  const copyBtn      = document.getElementById('copyBtn');
  const againBtn     = document.getElementById('againBtn');
  const charCount    = document.getElementById('charCount');
  const charCountOut = document.getElementById('charCountOut');
  const exampleChips = document.querySelectorAll('.example-chip');
  const modeTabs     = document.querySelectorAll('.mode-tab');

  if (!promptInput) return; // not on home page

  let currentMode = 'general';
  let passCount = 0; // tracks "improve again" passes

  // Restore last prompt
  const saved = localStorage.getItem('pt-last-prompt');
  if (saved) promptInput.value = saved;
  updateCharCount();

  /* Mode tabs */
  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMode = tab.dataset.mode;
      passCount = 0;
      // Update example chips
      updateExampleChips(currentMode);
    });
  });

  /* Character counter */
  promptInput.addEventListener('input', () => {
    updateCharCount();
    localStorage.setItem('pt-last-prompt', promptInput.value);
  });

  function updateCharCount() {
    if (charCount) charCount.textContent = `${promptInput.value.length} chars`;
  }

  /* Example prompts */
  const examplesByMode = {
    general: [
      'Explain quantum computing',
      'Summarize this article',
      'Help me brainstorm ideas',
    ],
    coding: [
      'Debug my Python script',
      'Write a REST API in Node',
      'Explain recursion with examples',
    ],
    writing: [
      'Write a blog post intro',
      'Edit my email draft',
      'Create a product description',
    ],
    business: [
      'Draft a project proposal',
      'Summarize a meeting',
      'Write a cold outreach email',
    ],
    study: [
      'Explain photosynthesis simply',
      'Quiz me on World War II',
      'Summarize this chapter',
    ],
  };

  function updateExampleChips(mode) {
    const examples = examplesByMode[mode] || examplesByMode.general;
    exampleChips.forEach((chip, i) => {
      if (examples[i]) {
        chip.textContent = `"${examples[i]}"`;
        chip.dataset.text = examples[i];
        chip.style.display = '';
      } else {
        chip.style.display = 'none';
      }
    });
  }

  exampleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      promptInput.value = chip.dataset.text || chip.textContent.replace(/^"|"$/g, '');
      updateCharCount();
      localStorage.setItem('pt-last-prompt', promptInput.value);
      promptInput.focus();
    });
  });

  updateExampleChips('general');

  /* Clear */
  clearBtn && clearBtn.addEventListener('click', () => {
    promptInput.value = '';
    updateCharCount();
    localStorage.removeItem('pt-last-prompt');
    outputSection.classList.remove('visible');
    passCount = 0;
    promptInput.focus();
  });

  /* Improve */
  improveBtn && improveBtn.addEventListener('click', () => {
    const raw = promptInput.value.trim();
    if (!raw) { promptInput.focus(); shake(promptInput); return; }
    passCount = 0;
    runImprovement(raw);
  });

  againBtn && againBtn.addEventListener('click', () => {
    const current = outputBox.textContent.trim();
    if (!current) return;
    passCount++;
    runImprovement(current, true);
  });

  /* Copy */
  copyBtn && copyBtn.addEventListener('click', () => {
    const text = outputBox.textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard ✓');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied to clipboard ✓');
    });
  });

  /* ── Core transformation logic ─────────────── */
  function runImprovement(text, isSecondPass = false) {
    // Show loading state
    improveBtn.disabled = true;
    improveBtn.innerHTML = '<span class="spinner"></span> Improving…';

    // Small delay for perceived quality
    setTimeout(() => {
      const result = improvePrompt(text, currentMode, isSecondPass);
      outputBox.textContent = result;
      if (charCountOut) charCountOut.textContent = `${result.length} chars`;
      outputSection.classList.add('visible');
      outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      improveBtn.disabled = false;
      improveBtn.innerHTML = '✦ Improve Prompt';
    }, 480);
  }

  /**
   * Rule-based prompt improvement engine.
   * Applies structured templates based on mode and pass number.
   */
  function improvePrompt(text, mode, secondPass) {
    const clean = text.trim();
    const isShort = clean.split(/\s+/).length < 12;
    const isQuestion = /\?$/.test(clean);

    // Templates per mode
    const templates = {
      general: {
        role: 'a knowledgeable and thoughtful assistant',
        goal: 'help me understand and address the following',
        format: 'Give a well-structured response with clear sections',
        constraint: 'Be accurate, concise, and avoid unnecessary filler',
        expand: 'Include relevant context, practical examples, and key takeaways',
      },
      coding: {
        role: 'a senior software engineer with expertise in clean, efficient code',
        goal: 'assist with the following programming task',
        format: 'Provide working code with inline comments explaining each key step',
        constraint: 'Follow best practices, handle edge cases, and keep it maintainable',
        expand: 'Include example usage, note any assumptions, and mention alternative approaches',
      },
      writing: {
        role: 'a professional writer and editor with a clear, engaging style',
        goal: 'help me write or refine the following content',
        format: 'Structure the response with a strong opening, clear body, and concise closing',
        constraint: 'Use active voice, keep sentences readable, and match the intended tone',
        expand: 'Add vivid detail where appropriate and ensure the content serves the reader',
      },
      business: {
        role: 'a business consultant with experience in strategy, operations, and communication',
        goal: 'help me with the following business task or question',
        format: 'Present findings with an executive summary, key points, and next steps',
        constraint: 'Be professional, data-aware, and solution-focused',
        expand: 'Consider stakeholder perspectives, risks, and measurable outcomes',
      },
      study: {
        role: 'a patient, clear-thinking tutor who excels at breaking down complex topics',
        goal: 'help me learn and understand the following subject or question',
        format: 'Use simple language first, then go deeper — include analogies and examples',
        constraint: 'Check understanding, avoid jargon unless you explain it, and stay encouraging',
        expand: 'Connect this to related concepts and suggest follow-up areas to explore',
      },
    };

    const t = templates[mode] || templates.general;

    // If it's a second pass, add additional refinement layers
    if (secondPass) {
      return buildRefinedPass(clean, t, passCount);
    }

    // First pass: structured base prompt
    return buildBasePrompt(clean, t, isShort, isQuestion);
  }

  function buildBasePrompt(text, t, isShort, isQuestion) {
    const parts = [];

    // Role
    parts.push(`Act as ${t.role}.`);
    parts.push('');

    // Task
    parts.push(`Your task is to ${t.goal}:`);
    parts.push('');

    // The actual prompt content
    if (isShort) {
      // Expand short prompts into a fuller instruction
      parts.push(`Topic / Request: "${text}"`);
      parts.push('');
      parts.push(t.expand + '.');
    } else {
      parts.push(text);
    }

    parts.push('');

    // Format instruction
    parts.push(`Format: ${t.format}.`);

    // Constraint
    parts.push(`Constraint: ${t.constraint}.`);

    // If it was a question, add clarity instruction
    if (isQuestion) {
      parts.push('');
      parts.push('Start by directly answering the question, then elaborate as needed.');
    }

    return parts.join('\n');
  }

  function buildRefinedPass(text, t, pass) {
    // Each additional pass adds a layer of specificity
    const refinements = [
      // Pass 1
      [
        text,
        '',
        `Additionally:`,
        `- Think step-by-step before giving your final answer.`,
        `- If there are multiple valid approaches, briefly mention the trade-offs.`,
        `- Cite specific examples or evidence where relevant.`,
        `- Flag any assumptions you are making.`,
      ].join('\n'),
      // Pass 2
      [
        text,
        '',
        `Refinements for this response:`,
        `- Prioritize depth and precision over breadth.`,
        `- If the topic is complex, use numbered steps or a decision framework.`,
        `- Anticipate the 2–3 follow-up questions someone might have after reading your answer and address them proactively.`,
        `- End with a one-sentence summary of the most important takeaway.`,
      ].join('\n'),
      // Pass 3+
      [
        text,
        '',
        `Advanced guidance:`,
        `- Approach this as you would for an expert audience — skip over basics you would already expect them to know.`,
        `- Where appropriate, include real-world analogies, edge cases, and failure modes.`,
        `- If you can recommend further reading, tools, or resources, please do so at the end.`,
        `- Keep the total response skimmable: use headers or bullet points for anything longer than 3 paragraphs.`,
      ].join('\n'),
    ];

    return refinements[Math.min(pass - 1, refinements.length - 1)];
  }

  /* ── Shake animation for empty input ───────── */
  function shake(el) {
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'shake 0.4s ease';
    el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
  }

  /* Inject shake keyframes if not present */
  if (!document.getElementById('shake-style')) {
    const s = document.createElement('style');
    s.id = 'shake-style';
    s.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}`;
    document.head.appendChild(s);
  }

});

/* ── Toast ─────────────────────────────────────── */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2400);
}