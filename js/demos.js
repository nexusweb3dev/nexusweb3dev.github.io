/**
 * NexusWeb3 Interactive Demo Engine
 * Pure vanilla JavaScript - no dependencies
 * @version 1.1.0
 */

'use strict';

(function() {
  // ========================================
  // SALES AGENT DEMO
  // ========================================

  const BUDGET_KEYWORDS = {
    "budget": 8, "invest": 7, "spend": 6, "cost": 3, "pricing": 5,
    "enterprise": 10, "annual": 8, "contract": 7, "retainer": 9,
    "10k": 12, "50k": 15, "100k": 18, "million": 20,
    "$": 5, "roi": 8, "revenue": 7
  };

  const URGENCY_KEYWORDS = {
    "asap": 12, "urgent": 10, "immediately": 10, "deadline": 8,
    "this week": 9, "this month": 7, "soon": 5, "quickly": 6,
    "yesterday": 11, "rush": 9, "critical": 10, "launching": 8,
    "going live": 9, "before": 6, "time-sensitive": 10
  };

  const SOPHISTICATION_KEYWORDS = {
    "api": 6, "integration": 7, "automation": 8, "workflow": 7,
    "ai": 5, "machine learning": 8, "chatbot": 5, "agent": 6,
    "pipeline": 7, "saas": 8, "platform": 6, "scale": 7,
    "infrastructure": 8, "microservice": 9, "cloud": 5, "devops": 7,
    "crm": 6, "erp": 8, "data": 5, "analytics": 6
  };

  const COMPANY_SIZE_SIGNALS = {
    "startup": 4, "small business": 3, "smb": 3,
    "mid-market": 7, "midsize": 7, "growing": 5,
    "enterprise": 10, "fortune": 12, "corporation": 9,
    "team of": 5, "employees": 6, "series a": 7, "series b": 9,
    "funded": 8, "vc-backed": 9, "publicly traded": 11
  };

  const NEGATIVE_SIGNALS = {
    "free": -8, "student": -6, "homework": -10, "learning": -4,
    "hobby": -7, "personal project": -5, "no budget": -12,
    "just looking": -6, "curious": -4, "maybe later": -8,
    "unsubscribe": -15, "spam": -15
  };

  const FREE_EMAIL_DOMAINS = ['gmail', 'yahoo', 'hotmail', 'outlook', 'aol', 'protonmail'];
  const COMPANY_SUFFIXES = ['inc', 'ltd', 'llc', 'corp', 'gmbh', 'co.'];

  function calculateLeadScore(name, email, company, message) {
    var allText = (name + ' ' + email + ' ' + company + ' ' + message).toLowerCase();
    var score = 20;
    var signals = [];

    var keywordGroups = [
      { dict: BUDGET_KEYWORDS, label: 'Budget' },
      { dict: URGENCY_KEYWORDS, label: 'Urgency' },
      { dict: SOPHISTICATION_KEYWORDS, label: 'Sophistication' },
      { dict: COMPANY_SIZE_SIGNALS, label: 'Company Size' },
      { dict: NEGATIVE_SIGNALS, label: 'Negative' }
    ];

    keywordGroups.forEach(function(group) {
      var groupScore = 0;
      Object.keys(group.dict).forEach(function(keyword) {
        if (allText.includes(keyword)) {
          groupScore += group.dict[keyword];
        }
      });
      if (groupScore !== 0) {
        score += groupScore;
        signals.push(group.label + ': ' + (groupScore > 0 ? '+' : '') + groupScore);
      }
    });

    var emailDomain = email.includes('@') ? email.split('@')[1].split('.')[0].toLowerCase() : '';
    if (!email.includes('@')) {
      score -= 2;
      signals.push('No email domain: -2');
    } else if (emailDomain.endsWith('.edu') || email.endsWith('.edu')) {
      score += 3;
      signals.push('Educational domain: +3');
    } else if (FREE_EMAIL_DOMAINS.indexOf(emailDomain) !== -1) {
      score += 2;
      signals.push('Free email: +2');
    } else if (emailDomain) {
      score += 8;
      signals.push('Business email: +8');
    }

    if (company && company.trim().length > 0) {
      score += 5;
      signals.push('Company provided: +5');
      var companyLower = company.toLowerCase();
      if (COMPANY_SUFFIXES.some(function(suffix) { return companyLower.includes(suffix); })) {
        score += 3;
        signals.push('Company entity suffix: +3');
      }
    }

    var msgLength = message.length;
    if (msgLength > 200) {
      score += 8;
      signals.push('Detailed message (>200 chars): +8');
    } else if (msgLength > 100) {
      score += 5;
      signals.push('Medium message (>100 chars): +5');
    } else if (msgLength > 30) {
      score += 2;
      signals.push('Short message (>30 chars): +2');
    }

    score = Math.max(1, Math.min(100, score));

    var category = 'COLD';
    if (score >= 80) category = 'HOT';
    else if (score >= 50) category = 'WARM';

    return { score: score, category: category, signals: signals };
  }

  function demoScoreLead() {
    var nameEl = document.getElementById('demo-sales-name');
    var emailEl = document.getElementById('demo-sales-email');
    var companyEl = document.getElementById('demo-sales-company');
    var messageEl = document.getElementById('demo-sales-message');
    var resultDiv = document.getElementById('demo-sales-result');

    if (!nameEl || !emailEl || !companyEl || !messageEl || !resultDiv) return;

    var name = nameEl.value;
    var email = emailEl.value;
    var company = companyEl.value;
    var message = messageEl.value;

    var result = calculateLeadScore(name, email, company, message);
    var categoryColors = { 'HOT': '#10b981', 'WARM': '#f59e0b', 'COLD': '#6b7280' };

    resultDiv.style.display = 'block';
    resultDiv.innerHTML =
      '<div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 2rem; margin-top: 1.5rem;">' +
        '<h4 style="margin-bottom: 1rem;">Lead Score: <span style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 100px; font-size: 0.85rem; font-weight: 700; background: ' + categoryColors[result.category] + '; color: #000;">' + result.category + '</span></h4>' +
        '<div style="background: var(--bg-tertiary); border-radius: 100px; height: 32px; position: relative; overflow: hidden; margin-bottom: 1.5rem;">' +
          '<div class="score-gauge-fill" style="width: 0%; height: 100%; border-radius: 100px; background: ' + categoryColors[result.category] + '; transition: none;"></div>' +
          '<span class="score-gauge-label" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: 700; font-size: 0.95rem; color: #fff;">0</span>' +
        '</div>' +
        '<div>' +
          '<h5 style="margin-bottom: 0.75rem; color: var(--text-secondary);">Signal Breakdown</h5>' +
          '<ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.35rem;">' +
            result.signals.map(function(s) { return '<li style="color: var(--text-secondary); font-size: 0.9rem;">' + s + '</li>'; }).join('') +
          '</ul>' +
        '</div>' +
        (window.NexusBridge && window.NexusBridge.isAvailable() ? '<button class="btn-secondary btn-try-live" style="margin-top: 1rem;">Try Live API</button>' : '') +
      '</div>';

    var fill = resultDiv.querySelector('.score-gauge-fill');
    var label = resultDiv.querySelector('.score-gauge-label');
    var target = result.score;
    var startTime = performance.now();

    function animate(currentTime) {
      var elapsed = currentTime - startTime;
      var progress = Math.min(elapsed / 1500, 1);
      var current = Math.floor(progress * target);
      fill.style.width = current + '%';
      label.textContent = current;
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    var liveBtn = resultDiv.querySelector('.btn-try-live');
    if (liveBtn) {
      liveBtn.addEventListener('click', function() {
        window.NexusBridge.scoreLead({ name: name, email: email, company: company, message: message });
      });
    }
  }

  // ========================================
  // CONTENT MACHINE DEMO
  // ========================================

  var CONTENT_TOPICS = {
    "ai-replacing-saas": {
      label: "AI Replacing SaaS",
      blog: "# AI Replacing SaaS\n\nThe way businesses operate is changing fundamentally. AI replacing SaaS is not just a trend \u2014 it is a structural shift that will define the next decade of business technology.\n\nCompanies that adopt early gain a compounding advantage. Those that wait risk falling behind permanently.\n\n## Why This Matters Now\n\nThree forces are converging:\n\n**Cost Reduction** \u2014 AI solutions cut operational costs by 40-60% while improving output quality.\n\n**Speed to Market** \u2014 What used to take months now takes weeks. AI agents handle tasks that previously required entire departments.\n\n**Quality at Scale** \u2014 AI doesn't get tired, doesn't make inconsistent decisions, and improves with every interaction.",
      tweets: [
        "Most businesses are about to be disrupted and they don't see it coming.\n\nHere's what's actually happening: 1/5",
        "The old playbook: hire more people, build more features, spend more on tools.\n\nThe new playbook: deploy AI agents that work 24/7 at a fraction of the cost.\n\nCompanies using AI agents see 40-60% cost reduction. This is not hype \u2014 it's math. 2/5",
        "The real shift is not about replacing humans.\n\nAI handles the repetitive 80%. Humans focus on the creative 20% that actually moves the needle.\n\nResult: smaller teams, bigger output, happier people. 3/5",
        "Three things every business should automate RIGHT NOW:\n\n1. Lead qualification (3x conversion rate)\n2. Customer support (80% ticket deflection)\n3. Content creation (one topic = blog + social + email)\n\nEach one pays for itself in < 30 days. 4/5",
        "The window for competitive advantage is closing fast.\n\nIn 12 months, AI-powered operations will be table stakes.\n\nWill you be disrupting, or being disrupted?\n\nWe build these systems. DM if you want to talk. 5/5"
      ],
      linkedin: "AI Replacing SaaS\n\nThe businesses that will dominate the next 5 years are not the ones with the biggest teams or the most funding. They are the ones that figure out how to leverage AI as a core operational capability.\n\nWhat I'm seeing in practice:\n\n\u2014 Companies deploying AI agents are cutting costs by 40-60%\n\u2014 The ROI timeline has compressed from months to weeks\n\u2014 Small teams with AI are outperforming large teams without it\n\nThe playbook is straightforward:\n1. Pick your highest-volume, most repetitive workflow\n2. Build an AI solution that handles the predictable 80%\n3. Measure results in 30 days\n4. Scale what works\n\n#AI #Automation #BusinessStrategy #FutureOfWork"
    },
    "ai-support-costs": {
      label: "AI Cuts Support Costs 60%",
      blog: "# How AI Agents Cut Support Costs by 60%\n\nCompanies that deploy AI solutions are seeing 40-60% cost reductions while simultaneously improving output quality and customer satisfaction scores.\n\n## The Implementation Path\n\n1. **Identify one high-impact workflow** that is currently manual and repetitive\n2. **Build a focused AI solution** that handles 80% of that workflow automatically\n3. **Measure ROI** within 30 days \u2014 most companies see positive returns in week 2\n4. **Expand systematically** to adjacent workflows based on proven results\n\n## What Smart Companies Are Doing\n\n- **Customer Operations**: AI agents handle 80% of support queries \u2014 reducing costs by 50%\n- **Sales Pipeline**: Automated lead qualification increases conversion rates by 3x\n- **Content Production**: One strategist + AI produces what used to require a 5-person team",
      tweets: [
        "Your competitors are cutting costs by 40-60% with AI. Here's the playbook they're using: 1/5",
        "Step 1: Identify your highest-cost, most repetitive workflow.\n\nFor most companies: customer support and sales qualification.\n\nThese are where AI delivers immediate, measurable ROI. 2/5",
        "Step 2: Deploy AI agents that handle the predictable 80%.\n\nYour team focuses on the 20% that requires human judgment.\n\nSmaller payroll, bigger output. 3/5",
        "Three quick wins every business should implement:\n\n1. AI lead qualification (3x conversion rate)\n2. Automated customer support (80% ticket deflection)\n3. Content generation (1 strategist replaces a 5-person team)\n\nROI in < 30 days. 4/5",
        "The window is closing. In 12 months, AI operations will be table stakes.\n\nAct now or spend 3x more catching up later.\n\nWe build these systems. DM for a free ROI assessment. 5/5"
      ],
      linkedin: "How AI Agents Cut Support Costs by 60%\n\nThe businesses that will dominate the next 5 years are the ones that leverage AI as a core operational capability.\n\nWhat I'm seeing:\n\n\u2014 40-60% cost reductions across customer operations\n\u2014 ROI timeline compressed from months to weeks\n\u2014 Small teams with AI outperforming large teams without it\n\nThe playbook:\n1. Pick your highest-volume repetitive workflow\n2. Build an AI solution for the predictable 80%\n3. Measure results in 30 days\n4. Scale what works\n\nThis is not about replacing people. It is about amplifying what your best people can do.\n\n#AI #Automation #BusinessStrategy #FutureOfWork"
    },
    "ai-automation-2026": {
      label: "AI Automation in 2026",
      blog: "# Why Every Business Needs AI Automation in 2026\n\nFrom a business perspective, AI automation in 2026 is about competitive advantage through operational efficiency.\n\n## Three Forces Converging\n\n**Cost Reduction** \u2014 Traditional approaches require large teams and manual processes. AI cuts costs by 40-60%.\n\n**Speed to Market** \u2014 What used to take months now takes weeks. AI agents handle entire department workloads.\n\n**Quality at Scale** \u2014 AI doesn't get tired, doesn't make inconsistent decisions, and improves with every interaction.\n\n## Results That Speak\n\n- Customer Operations: AI agents handle 80% of support queries\n- Sales Pipeline: 3x conversion rate increase\n- Content Production: 1 strategist + AI = 5-person team output\n- ROI: Most implementations pay for themselves within 30 days",
      tweets: [
        "Your competitors are cutting costs by 40-60% with AI. Here's the playbook they're using: 1/5",
        "Step 1: Identify your highest-cost, most repetitive workflow.\n\nFor most companies: automation and chatbots.\n\nThese are where AI delivers immediate ROI. 2/5",
        "Step 2: Deploy AI agents that handle the predictable 80%.\n\nResult: cost savings at scale.\n\nYour team focuses on the 20% that requires human judgment. 3/5",
        "Three quick wins:\n\n1. AI lead qualification (3x conversion rate)\n2. Automated customer support (80% ticket deflection)\n3. Content generation (1 strategist replaces a 5-person team)\n\nROI in < 30 days. Guaranteed. 4/5",
        "The window is closing.\n\nIn 12 months, AI operations will be table stakes. The first-mover advantage disappears.\n\nAct now or spend 3x more catching up later.\n\nWe build these systems. DM for a free ROI assessment. 5/5"
      ],
      linkedin: "Why Every Business Needs AI Automation in 2026\n\nThe businesses that will dominate are the ones that leverage AI as a core operational capability.\n\nWhat I'm seeing:\n\n\u2014 40-60% cost reductions with AI agents\n\u2014 ROI timeline compressed from months to weeks\n\u2014 Small teams with AI outperforming large teams without it\n\nThe playbook:\n1. Pick your highest-volume repetitive workflow\n2. Build an AI solution for the predictable 80%\n3. Measure results in 30 days\n4. Scale what works\n\n#AI #Automation #BusinessStrategy #FutureOfWork"
    }
  };

  function typewriterEffect(element, text, callback) {
    element.textContent = '';
    var charIndex = 0;

    function type() {
      if (charIndex < text.length) {
        element.textContent += text[charIndex];
        charIndex++;
        requestAnimationFrame(type);
      } else if (callback) {
        callback();
      }
    }
    requestAnimationFrame(type);
  }

  function initContentDemo() {
    var topicsContainer = document.querySelector('.demo-content-topics');
    var displayArea = document.querySelector('.demo-content-display');
    var tabsContainer = document.querySelector('.demo-content-tabs');

    if (!topicsContainer || !displayArea || !tabsContainer) return;

    // Generate topic buttons
    topicsContainer.innerHTML = '';
    Object.keys(CONTENT_TOPICS).forEach(function(key) {
      var btn = document.createElement('button');
      btn.className = 'demo-content-topic';
      btn.setAttribute('data-topic', key);
      btn.textContent = CONTENT_TOPICS[key].label;
      topicsContainer.appendChild(btn);
    });

    var activeTopic = null;

    topicsContainer.addEventListener('click', function(e) {
      var topicBtn = e.target.closest('[data-topic]');
      if (!topicBtn) return;

      var topicKey = topicBtn.dataset.topic;
      var topic = CONTENT_TOPICS[topicKey];
      if (!topic) return;

      activeTopic = topic;

      // Highlight active topic
      topicsContainer.querySelectorAll('.demo-content-topic').forEach(function(btn) {
        btn.classList.remove('demo-content-topic--active');
      });
      topicBtn.classList.add('demo-content-topic--active');

      // Show tabs
      tabsContainer.style.display = 'flex';
      tabsContainer.innerHTML =
        '<button class="demo-content-tab demo-content-tab--active" data-platform="blog">Blog</button>' +
        '<button class="demo-content-tab" data-platform="twitter">Twitter</button>' +
        '<button class="demo-content-tab" data-platform="linkedin">LinkedIn</button>';

      showContent('blog', topic, displayArea);
    });

    tabsContainer.addEventListener('click', function(e) {
      var tab = e.target.closest('.demo-content-tab');
      if (!tab || !activeTopic) return;

      tabsContainer.querySelectorAll('.demo-content-tab').forEach(function(t) {
        t.classList.remove('demo-content-tab--active');
      });
      tab.classList.add('demo-content-tab--active');

      showContent(tab.dataset.platform, activeTopic, displayArea);
    });
  }

  function showContent(platform, topic, displayArea) {
    var content = '';
    var meta = '';

    if (platform === 'blog') {
      content = topic.blog;
      meta = content.split(' ').length + ' words';
    } else if (platform === 'twitter') {
      content = topic.tweets.map(function(tweet, i) {
        return 'Tweet ' + (i + 1) + ' (' + tweet.length + ' chars):\n\n' + tweet;
      }).join('\n\n---\n\n');
    } else if (platform === 'linkedin') {
      content = topic.linkedin;
      meta = content.length + ' characters';
    }

    displayArea.innerHTML =
      '<div style="margin-bottom: 0.5rem;">' +
        (meta ? '<span style="font-size: 0.8rem; color: var(--text-tertiary);">' + meta + '</span>' : '') +
      '</div>' +
      '<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: var(--font-body); font-size: 0.95rem; line-height: 1.7; color: var(--text-secondary);"></pre>';

    var textEl = displayArea.querySelector('pre');
    typewriterEffect(textEl, content);
  }

  // ========================================
  // SUPPORT BOT DEMO
  // ========================================

  var FAQ_DATA = [
    { q: "What does NexusWeb3 do?", a: "NexusWeb3 builds custom AI software solutions for businesses. We specialize in AI agents, automation systems, chatbots, and intelligent workflows that reduce operational costs and scale your business.", keywords: ["what", "do", "nexusweb3", "about", "company", "build"] },
    { q: "How long does a project take?", a: "Most projects are delivered in 2-6 weeks depending on complexity. A simple chatbot can be ready in 2 weeks. A full automation pipeline takes 4-6 weeks. Enterprise integrations may take 6-8 weeks.", keywords: ["how long", "time", "delivery", "timeline", "weeks", "deliver"] },
    { q: "How much does it cost?", a: "Projects typically range from $2,000 to $30,000 depending on complexity. AI Agent Sprint starts at $2,000. Full AI Workflow Systems range from $5,000 to $15,000. Enterprise AI Operations Centers start at $15,000.", keywords: ["cost", "price", "pricing", "how much", "budget", "expensive", "cheap", "afford"] },
    { q: "Do I need technical knowledge?", a: "No. All our solutions come with a user-friendly interface. We handle all the technical complexity. You get a dashboard to monitor performance and simple controls to adjust settings.", keywords: ["technical", "knowledge", "skill", "code", "coding", "developer", "non-technical"] },
    { q: "What industries do you work with?", a: "We work across all industries. Our most common clients are in e-commerce, SaaS, financial services, healthcare, real estate, and professional services. If your business has repetitive processes, we can automate them.", keywords: ["industry", "industries", "sector", "vertical", "ecommerce", "saas", "healthcare"] },
    { q: "Do you offer ongoing support?", a: "Yes. All projects include 30 days of free support after delivery. We also offer monthly maintenance plans starting at $500/month that include updates, monitoring, and priority support.", keywords: ["support", "maintenance", "help", "after", "ongoing", "warranty"] },
    { q: "What is included in the price?", a: "All projects include: requirements analysis, design, development, testing, deployment, documentation, training for your team, and 30 days of post-launch support.", keywords: ["included", "include", "what do i get", "deliverables", "scope"] },
    { q: "Do you offer payment plans?", a: "Yes. We offer flexible payment: 50% upfront and 50% on delivery for projects under $15,000. For larger projects, we arrange monthly payment plans over 3-6 months.", keywords: ["payment", "pay", "installment", "plan", "upfront", "deposit"] },
    { q: "Can I see examples of your work?", a: "Yes! Visit our portfolio page to see 9+ production case studies. We can also arrange a live demo of solutions similar to what you need during a consultation call.", keywords: ["example", "portfolio", "demo", "show", "see", "work", "case study", "proof"] },
    { q: "How do I get started?", a: "Contact us through our website or send a DM on Twitter @InfoNexusweb3. We'll schedule a free 30-minute consultation to understand your requirements and propose a solution. No commitment required.", keywords: ["start", "begin", "get started", "first step", "contact", "book", "call"] }
  ];

  var ESCALATION_TRIGGERS = ["angry", "terrible", "awful", "worst", "hate", "lawsuit", "lawyer", "refund now"];

  function findBestMatch(userMessage) {
    var msgLower = userMessage.toLowerCase();
    var bestMatch = null;
    var bestScore = 0;

    FAQ_DATA.forEach(function(faq) {
      var score = 0;
      faq.keywords.forEach(function(keyword) {
        if (msgLower.includes(keyword)) score++;
      });
      if (score > bestScore) {
        bestScore = score;
        bestMatch = faq;
      }
    });

    if (bestScore === 0) {
      return {
        answer: "I'm not sure about that. Could you rephrase your question? Or try one of the suggestions below.",
        confidence: 'none'
      };
    }

    var confidence = bestScore >= 3 ? 'high' : bestScore >= 2 ? 'medium' : 'low';
    return { answer: bestMatch.a, confidence: confidence };
  }

  function initSupportDemo() {
    var messagesDiv = document.getElementById('demo-chat-messages');
    var input = document.getElementById('demo-chat-input');
    var sendBtn = document.getElementById('demo-chat-send');
    var chipsContainer = document.getElementById('demo-chat-chips');

    if (!messagesDiv || !input || !sendBtn) return;

    function addMessage(text, sender) {
      var bubble = document.createElement('div');
      bubble.className = 'demo-chat__bubble demo-chat__bubble--' + sender;
      bubble.textContent = text;
      messagesDiv.appendChild(bubble);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function showTyping() {
      var typing = document.createElement('div');
      typing.className = 'demo-chat__bubble demo-chat__bubble--typing';
      typing.textContent = 'Typing...';
      messagesDiv.appendChild(typing);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      return typing;
    }

    function sendMessage() {
      var message = input.value.trim();
      if (!message) return;

      addMessage(message, 'user');
      input.value = '';

      var typing = showTyping();

      setTimeout(function() {
        typing.remove();

        var msgLower = message.toLowerCase();
        var needsEscalation = ESCALATION_TRIGGERS.some(function(trigger) {
          return msgLower.includes(trigger);
        });

        if (needsEscalation) {
          addMessage("I understand you're frustrated. In production, this conversation would be escalated to a human agent immediately. Someone from our team would respond within 5 minutes.", 'bot');
          var notice = document.createElement('div');
          notice.className = 'demo-chat__bubble demo-chat__bubble--escalation';
          notice.textContent = 'ESCALATED: High-priority human handoff triggered';
          messagesDiv.appendChild(notice);
        } else {
          var result = findBestMatch(message);
          addMessage(result.answer, 'bot');

          if (result.confidence !== 'none') {
            var badge = document.createElement('div');
            badge.className = 'demo-chat__confidence';
            badge.textContent = 'Confidence: ' + result.confidence;
            messagesDiv.appendChild(badge);
          }
        }

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }, 1500);
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMessage();
    });

    // Wire up existing suggestion chips in HTML
    if (chipsContainer) {
      chipsContainer.addEventListener('click', function(e) {
        var chip = e.target.closest('.demo-chat__chip');
        if (!chip) return;
        input.value = chip.dataset.msg || chip.textContent;
        sendMessage();
      });
    }
  }

  // ========================================
  // MAIN INITIALIZATION
  // ========================================

  function initDemos() {
    var demosSection = document.getElementById('demos');
    if (!demosSection) return;

    // Tab switching
    demosSection.addEventListener('click', function(e) {
      var tab = e.target.closest('.demo-tab');
      if (!tab) return;

      demosSection.querySelectorAll('.demo-tab').forEach(function(t) {
        t.classList.remove('demo-tab--active');
      });
      tab.classList.add('demo-tab--active');

      var targetId = 'demo-' + tab.dataset.demo;
      demosSection.querySelectorAll('.demo-panel').forEach(function(p) {
        if (p.id === targetId) {
          p.classList.add('demo-panel--active');
        } else {
          p.classList.remove('demo-panel--active');
        }
      });
    });

    initContentDemo();
    initSupportDemo();
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDemos);
  } else {
    initDemos();
  }

  // Export for button onclick and manual use
  window.demoScoreLead = demoScoreLead;
  window.NexusDemos = { initDemos: initDemos };

})();
