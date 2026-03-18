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
    "ai-agent-economy": {
      label: "The AI Agent Economy",
      blog: "# The AI Agent Economy\n\nAutonomous AI agents need infrastructure. Wallets, identity, payments, insurance, reputation \u2014 the same primitives humans use, rebuilt for machines.\n\nThe agent economy is not a future prediction. It is being built right now, on-chain, composable, and permissionless.\n\n## Why On-Chain Infrastructure Matters\n\nThree forces are converging:\n\n**Agent Autonomy** \u2014 Agents that can pay for services, prove identity, and manage risk operate without human bottlenecks.\n\n**Composability** \u2014 Protocols that work together create capabilities greater than the sum of their parts.\n\n**Verifiability** \u2014 On-chain execution means every transaction is auditable, transparent, and trustless.",
      tweets: [
        "The AI agent economy is here. Agents need infrastructure: wallets, identity, payments, insurance. 1/5",
        "Old model: every agent re-invents basic capabilities from scratch.\n\nNew model: composable on-chain protocols. Plug in wallet management, identity verification, payment rails.\n\nStandard infrastructure for non-standard agents. 2/5",
        "Why on-chain matters for AI agents:\n\n- Verifiable transactions (no trust required)\n- Composable protocols (mix and match)\n- Permissionless access (no API key gatekeepers)\n\nThe same properties that make DeFi work make agent infrastructure work. 3/5",
        "What autonomous agents need:\n\n1. Wallets (hold and transfer funds)\n2. Identity (prove who they are)\n3. Payments (pay for services via x402)\n4. Insurance (manage operational risk)\n\nAll on Base mainnet. All composable. 4/5",
        "We are building 30 composable protocols for the AI agent economy on Base.\n\nWallets. Identity. Payments. Yield. Insurance. Reputation. Safety.\n\nThe infrastructure layer for autonomous agents. 5/5"
      ],
      linkedin: "The AI Agent Economy\n\nAutonomous AI agents are becoming economic actors. They need the same infrastructure humans rely on \u2014 wallets, identity, payments, insurance \u2014 rebuilt for machines.\n\nWhat we are building:\n\n\u2014 30 composable on-chain protocols on Base mainnet\n\u2014 Agent wallets, identity verification, payment rails\n\u2014 Yield aggregation, insurance, reputation scoring\n\u2014 Safety controls and kill switches\n\nThe key insight: composability. Every protocol works standalone and together. An agent can hold a wallet, verify identity, make payments, and manage risk \u2014 all through standard interfaces.\n\nThis is not theoretical. The x402 Security API is live. Agents pay per call with USDC on Base.\n\n#AI #Web3 #Base #AgentEconomy #DeFi"
    },
    "x402-protocol": {
      label: "x402: Machine Payments",
      blog: "# x402: How Agents Pay for Services\n\nThe HTTP 402 status code was reserved for 'Payment Required' since 1999. Twenty-seven years later, it finally has a purpose: machine-to-machine payments.\n\n## How x402 Works\n\n1. **Agent calls an API endpoint** \u2014 standard REST request, no API key\n2. **Server returns 402** with payment details \u2014 amount, token, chain, recipient address\n3. **Agent pays on-chain** \u2014 USDC transfer on Base mainnet\n4. **Agent retries with payment proof** \u2014 transaction hash in header\n5. **Server verifies and responds** \u2014 data delivered instantly\n\n## Why This Matters\n\n- **No API keys** \u2014 payment IS the authentication\n- **No subscriptions** \u2014 pay only for what you use\n- **No intermediaries** \u2014 direct on-chain settlement\n- **Agent-native** \u2014 machines can budget, compare prices, and choose providers autonomously",
      tweets: [
        "HTTP 402 Payment Required was reserved in 1999. It finally has a purpose: machine-to-machine payments. 1/5",
        "How x402 works:\n\n1. Agent calls API\n2. Server returns 402 + payment details\n3. Agent pays USDC on Base\n4. Agent retries with tx proof\n5. Server delivers data\n\nNo API keys. No subscriptions. Payment IS authentication. 2/5",
        "Why x402 matters for AI agents:\n\n- Agents can autonomously discover and pay for services\n- No human needed to manage API keys or billing\n- Per-call pricing lets agents budget per-task\n- On-chain settlement = verifiable, trustless 3/5",
        "Our x402 Security API: 15 endpoints live on Base mainnet.\n\n- Token scans: $2/call\n- Attack surface analysis: $1/call\n- Risk scoring: $0.10/call\n- Web scraping: $0.02/call\n\nAgents pay per call. No sign-up required. 4/5",
        "The machine economy runs on machine-native payment rails.\n\nx402 + USDC + Base = the payment layer for autonomous agents.\n\n30 protocols. All composable. All on-chain. 5/5"
      ],
      linkedin: "x402: Machine-to-Machine Payments Are Here\n\nHTTP 402 Payment Required was reserved in 1999. Now it powers the machine economy.\n\nHow it works:\n\u2014 Agent calls an API endpoint (no API key needed)\n\u2014 Server returns 402 with payment details\n\u2014 Agent pays USDC on Base mainnet\n\u2014 Agent retries with transaction proof\n\u2014 Server verifies payment and delivers data\n\nWhy this matters:\n\u2014 Payment IS authentication (no key management)\n\u2014 Pay-per-call (no subscriptions or minimums)\n\u2014 On-chain settlement (verifiable and trustless)\n\u2014 Agent-native (machines can budget autonomously)\n\nWe have 15 endpoints live on Base mainnet. Security analysis, on-chain intelligence, deployment tools.\n\n#x402 #Web3 #Base #AI #MachinEconomy"
    },
    "on-chain-security": {
      label: "On-Chain Security for Agents",
      blog: "# On-Chain Security for Autonomous AI Agents\n\nAs AI agents become economic actors, security becomes non-negotiable. An agent managing funds, signing transactions, and interacting with protocols needs the same security guarantees as any DeFi application.\n\n## The Security Stack\n\n**Kill Switches** \u2014 Emergency controls that can pause agent operations when anomalies are detected.\n\n**Rate Limiting** \u2014 On-chain and off-chain limits prevent runaway spending or rapid-fire transactions.\n\n**Reputation Scoring** \u2014 Agents build verifiable on-chain reputation through consistent, safe behavior.\n\n## Why This Is Different\n\n- Agent security is not just code auditing \u2014 it is economic attack modeling\n- Composable protocols mean attack surfaces are multiplicative\n- Kill switches and circuit breakers are mandatory, not optional",
      tweets: [
        "AI agents managing funds need security guarantees. Not theoretical security. Production security. 1/5",
        "The agent security stack:\n\n1. Kill switches (emergency pause)\n2. Rate limiting (prevent runaway spending)\n3. Reputation scoring (verifiable on-chain history)\n4. Insurance protocols (manage operational risk)\n\nAll composable. All on Base. 2/5",
        "Agent security is different from traditional app security.\n\nYou are not just protecting against code exploits. You are modeling economic attacks.\n\nComposable protocols = multiplicative attack surfaces. Design for this. 3/5",
        "Our security approach:\n\n- Triple audit (automated + manual + economic modeling)\n- Kill switches on every protocol\n- Rate limiting at network and application layers\n- Continuous monitoring with automated alerts\n\n15 security API endpoints live. 4/5",
        "The AI agent economy will not scale without security infrastructure.\n\nWallets need protection. Transactions need limits. Agents need reputation.\n\n30 protocols on Base mainnet. Security is not optional. 5/5"
      ],
      linkedin: "On-Chain Security for the AI Agent Economy\n\nAs AI agents become economic actors \u2014 holding wallets, signing transactions, paying for services \u2014 security becomes the foundational requirement.\n\nWhat we are building:\n\n\u2014 Kill switches for emergency agent pause\n\u2014 Rate limiting to prevent runaway operations\n\u2014 Reputation scoring via verifiable on-chain history\n\u2014 Insurance protocols for operational risk management\n\nKey insight: agent security is not just code auditing. It is economic attack modeling. When protocols are composable, attack surfaces multiply.\n\nOur approach: triple audit (automated scanning + manual review + economic modeling). No protocol deploys without passing all three.\n\n15 security API endpoints live on Base mainnet via x402.\n\n#Security #AI #Web3 #Base #AgentEconomy"
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
    { q: "What does NexusWeb3 do?", a: "NexusWeb3 builds on-chain infrastructure for the AI agent economy. We provide 30 composable protocols on Base mainnet — covering wallet management, identity, payments, yield, insurance, reputation, and safety controls for autonomous AI agents.", keywords: ["what", "do", "nexusweb3", "about", "company", "build"] },
    { q: "How do I integrate with NexusWeb3?", a: "Integration is straightforward. Call our REST API endpoints, or use the MCP wrapper for Claude Code and Cursor. No API keys needed — payments happen via x402 protocol with USDC on Base. Check our GitHub for SDKs and documentation.", keywords: ["how", "integrate", "integration", "setup", "connect", "start"] },
    { q: "How much does it cost?", a: "NexusWeb3 uses pay-per-call pricing via the x402 protocol. Security endpoints range from $0.10 to $5.00 per call. On-chain intelligence is $0.05 to $0.15. Deployment tools are $0.50 to $1.00. Web data queries start at $0.02. No subscriptions, no minimums.", keywords: ["cost", "price", "pricing", "how much", "budget", "expensive", "cheap", "afford"] },
    { q: "Do I need technical knowledge?", a: "Basic REST API knowledge is enough to get started. If you're building AI agents, our MCP wrapper makes integration seamless with Claude Code and Cursor. All endpoints return standard JSON responses.", keywords: ["technical", "knowledge", "skill", "code", "coding", "developer", "non-technical"] },
    { q: "What protocols are available?", a: "We offer 30 composable protocols across 7 categories: Agent Wallets, Identity Verification, Payment Rails, Yield Aggregation, Insurance, Reputation Scoring, and Safety Controls. All deployed on Base mainnet.", keywords: ["protocol", "protocols", "available", "categories", "what", "offer", "features"] },
    { q: "Do you offer ongoing support?", a: "All protocols include documentation and GitHub issue support. For enterprise integrations, we offer dedicated technical support. Join our community on Twitter @InfoNexusweb3 for updates and discussions.", keywords: ["support", "maintenance", "help", "after", "ongoing", "warranty"] },
    { q: "What is the x402 protocol?", a: "x402 uses the HTTP 402 Payment Required status code for machine-to-machine payments. Your agent calls our API, receives a 402 response with payment details, sends USDC on Base, then retries with the payment proof to get results. No API keys needed.", keywords: ["x402", "402", "protocol", "payment", "how", "works", "machine"] },
    { q: "What chains are supported?", a: "Payments use USDC on Base mainnet. Security analysis covers all major EVM chains including Ethereum, Base, Arbitrum, Polygon, BSC, and Avalanche, plus Solana. Protocol infrastructure runs exclusively on Base.", keywords: ["chain", "chains", "supported", "ethereum", "base", "solana", "polygon", "network"] },
    { q: "Can I see examples of your work?", a: "Yes! Visit our portfolio page to see production case studies, or check our GitHub for open-source protocol code. The x402 Security API is live at our endpoint — you can test it directly.", keywords: ["example", "portfolio", "demo", "show", "see", "work", "case study", "proof"] },
    { q: "How do I get started?", a: "Head to our GitHub repository for documentation and SDKs. Or call any API endpoint directly — the x402 flow will guide you through the payment process automatically. No sign-up required.", keywords: ["start", "begin", "get started", "first step", "contact", "book", "call"] }
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
