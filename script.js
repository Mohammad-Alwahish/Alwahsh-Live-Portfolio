/* ================================================================
   ALWAHSH — LIVE CONSTRUCTION ENGINE
   The site is NOT shown and then faded in. The real HTML templates
   are inserted into the document, piece by piece, as multiple
   simulated editing agents drag, type, select and place components.
   Each phase also moves the page downward without user scrolling.
   ================================================================ */
(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const experience = $('#experience');
  const layer = $('#agentsLayer');
  const frame = $('#selectionFrame');
  const progressBar = $('#buildBar');
  const progressPercent = $('#buildPercent');
  const buildHeadline = $('#buildHeadline');
  const buildStage = $('#buildStage');
  const buildSteps = $('#buildSteps');
  const buildUi = $('#buildUi');
  const builderActions = $('#builderActions');
  const replayButton = $('#replayBuild');
  const pauseButton = $('#pauseBuild');
  const skipButton = $('#skipBuild');
  const finishToast = $('#finishToast');
  const dialog = $('#projectDialog');
  const params = new URLSearchParams(location.search);
  // Useful for testing: ?instant=1 starts with the finished site.
  const instant = params.has('instant') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const speedValue = Number(params.get('speed'));
  const SPEED = Number.isFinite(speedValue) && speedValue > 0 ? Math.min(3, Math.max(.03, speedValue)) : 0.6;

  const SCENES = [
    { key:'header', name:'BUILDING THE NAVIGATION', status:'01 / STRUCTURE' },
    { key:'hero', name:'ASSEMBLING THE HERO', status:'02 / INTRODUCTION' },
    { key:'work', name:'PLACING PROJECTS & IMAGES', status:'03 / SELECTED WORK' },
    { key:'skills', name:'CONSTRUCTING THE TOOLKIT', status:'04 / SKILLS' },
    { key:'values', name:'DESIGNING THE EXPERIENCE', status:'05 / THE APPROACH' },
    { key:'about', name:'ADDING THE STORY', status:'06 / ABOUT' },
    { key:'process', name:'ARRANGING THE PROCESS', status:'07 / WORKFLOW' },
    { key:'contact', name:'FINISHING THE FOOTER', status:'08 / CONTACT' }
  ];
  const AGENTS = [
    {name:'Layout',color:'#65c6ff'},
    {name:'Typography',color:'#f7a1d8'},
    {name:'Media',color:'#88e9b8'},
    {name:'Components',color:'#e7aa72'},
    {name:'Spacing',color:'#bca3ff'},
    {name:'Design',color:'#fc727f'},
    {name:'Polish',color:'#eadb82'},
    {name:'Motion',color:'#7be0e9'}
  ];
  const PROJECTS = {
    web:{title:'WEBSITE PROJECT',type:'HTML • CSS • RESPONSIVE DESIGN',image:'assets/project-website.png',description:'A design concept for a responsive personal website with modern layouts, thoughtful typography and intuitive navigation. The image is an illustrative mockup, not a screenshot of a completed client project.'},
    sales:{title:'SALES MANAGEMENT',type:'JAVA • JAVAFX • DESKTOP APPLICATION',image:'assets/project-sales.png',description:'An illustrative desktop-app concept for managing clothing inventory, product information and sales using Java and JavaFX.'},
    database:{title:'DATABASE DESIGN',type:'MYSQL • SQL • DATA MODELING',image:'assets/project-database.png',description:'A relational database concept showing tables, relationships and the foundations of organizing and querying data.'}
  };

  /* ==============================================================
     DIRECTED CONSTRUCTION CHOREOGRAPHY

     One cursor owns each action. Other cursors wait at fixed stations
     instead of wandering randomly across the visitor's screen.
     Media places images, Typography builds text, Components adds
     cards and controls, and Motion guides every automatic scroll.
     ============================================================== */

  let cursors = [];
  let generation = 0;
  let paused = false;
  let builtCount = 0;
  let totalCount = 0;
  let completed = false;
  let lastFrameTimer = 0;
  let activeScroll = false;

  const delay = (milliseconds) => new Promise(resolve => {
    setTimeout(resolve, Math.max(0, milliseconds * SPEED));
  });

  const isCurrent = (gen) => gen === generation;
  const stageHost = () => experience.querySelector('main');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  // Every editor starts from an assigned, predictable staging position.
  // The rails are intentionally subtle while the editor is inactive.
  function stationFor(index) {
    const leftSide = index < 4;
    const row = index % 4;
    const x = leftSide ? 12 : Math.max(20, innerWidth - 112);
    const y = clamp(125 + row * 88, 65, innerHeight - 67);
    return { x, y };
  }

  function getAgent(name) {
    return cursors.find(cursor => cursor.name === name);
  }

  function setBuildStatus(scene, text) {
    buildHeadline.textContent = text || scene.name;
    buildStage.textContent = scene.status;
  }

  function setProgress() {
    const percentage = Math.min(100, Math.round(
      (builtCount / Math.max(totalCount, 1)) * 100
    ));
    progressBar.style.width = percentage + '%';
    progressPercent.textContent = String(percentage).padStart(2, '0') + '%';
    buildSteps.textContent = String(builtCount).padStart(2, '0') + ' ELEMENTS PLACED';
  }

  function createCursors() {
    layer.textContent = '';
    cursors = AGENTS.map((person, index) => {
      const node = document.createElement('div');
      node.className = 'agent is-standby';
      node.style.setProperty('--agent-color', person.color);
      node.innerHTML = `
        <svg class="agent__pointer" viewBox="0 0 27 33" aria-hidden="true">
          <path fill="${person.color}" stroke="#0a1722" stroke-width="1.35"
            d="M2 1.5V27L9.4 20.1L14.3 31L19 28.6L13.8 18.3L24.8 18Z" />
        </svg>
        <span class="agent__label"><b></b>${person.name}</span>
        <span class="agent__halo"></span>
      `;
      layer.append(node);

      const pos = stationFor(index);
      node.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      return {
        node,
        name: person.name,
        color: person.color,
        index,
        pos,
        animation: null,
        motionId: 0,
        busy: false
      };
    });
  }

  // Smooth, repeatable movement with only a small planned bend.
  // Previous journeys are cancelled safely when a cursor gets a new job.
  function moveCursor(cursor, x, y, duration = 520) {
    if (!cursor || !document.body.classList.contains('is-constructing')) {
      return Promise.resolve();
    }

    const target = {
      x: clamp(x, 5, Math.max(5, innerWidth - 118)),
      y: clamp(y, 8, Math.max(8, innerHeight - 48))
    };
    const rect = cursor.node.getBoundingClientRect();
    const from = { x: rect.left, y: rect.top };

    cursor.motionId += 1;
    const motionId = cursor.motionId;
    if (cursor.animation) cursor.animation.cancel();
    cursor.animation = null;
    cursor.pos = target;

    const distance = Math.hypot(target.x - from.x, target.y - from.y);
    const bend = distance > 100 ? (cursor.index % 2 ? -13 : 13) : 0;
    const keyframes = [
      { transform: `translate(${from.x}px, ${from.y}px)` },
      {
        transform: `translate(${from.x + (target.x - from.x) * 0.54}px,
          ${from.y + (target.y - from.y) * 0.46 + bend}px)`,
        offset: 0.53
      },
      { transform: `translate(${target.x}px, ${target.y}px)` }
    ];

    try {
      const animation = cursor.node.animate(keyframes, {
        duration: Math.max(20, duration * SPEED),
        easing: 'cubic-bezier(.33, .72, .25, 1)',
        fill: 'forwards'
      });
      cursor.animation = animation;
      if (paused) animation.pause();
      return animation.finished.catch(() => {}).then(() => {
        if (motionId !== cursor.motionId) return;
        cursor.node.style.transform =
          `translate(${target.x}px, ${target.y}px)`;
        animation.cancel();
        cursor.animation = null;
      });
    } catch (_) {
      cursor.node.style.transform =
        `translate(${target.x}px, ${target.y}px)`;
      return Promise.resolve();
    }
  }

  function parkAgent(cursor) {
    if (!cursor) return;
    cursor.busy = false;
    cursor.node.classList.remove('is-working');
    cursor.node.classList.add('is-standby');
    const home = stationFor(cursor.index);
    // This is an intentional return to the editor's station, not random roaming.
    void moveCursor(cursor, home.x, home.y, 390);
  }

  function activateAgent(cursor) {
    if (!cursor) return;
    cursor.busy = true;
    cursor.node.classList.remove('is-standby');
    cursor.node.classList.add('is-working');
  }

  // Choose the editor based on the type of real DOM component.
  // The role never changes based on randomness or a round-robin counter.
  function roleFor(el) {
    const classes = el.classList;

    if (el.dataset.motion === 'image') return 'Media';
    if (classes.contains('hero-backword')) return 'Design';
    if (el.dataset.motion === 'type') return 'Typography';

    if (el.matches('.section-kicker, .hero-topline, .hero-footer, .section-outro')) {
      return 'Spacing';
    }
    if (el.matches('.hero-stamp, .about-mini, .about-banner, .contact-note, .site-footer')) {
      return 'Polish';
    }
    if (el.matches('.hero-buttons, .header-actions, .skill-item, .value-line, .process-row, .contact-link, .work-card__info')) {
      return 'Components';
    }
    if (el.matches('.brand, .hero-role, .hero-summary, .about-paragraph, .about-quote')) {
      return 'Typography';
    }
    if (el.matches('.main-nav, .work-heading, .values-layout, .about-tags, .process-timeline')) {
      return 'Layout';
    }
    return 'Design';
  }

  function targetPoint(el, role, alternate = false) {
    const rect = el.getBoundingClientRect();
    const marginX = Math.min(32, rect.width * 0.12);
    const marginY = Math.min(24, rect.height * 0.18);

    if (alternate) {
      return {
        x: rect.right - marginX - 25,
        y: rect.bottom - marginY - 22
      };
    }
    if (role === 'Typography') {
      return { x: rect.left + marginX, y: rect.top + marginY };
    }
    if (role === 'Media') {
      return { x: rect.left + rect.width * 0.64, y: rect.top + rect.height * 0.29 };
    }
    if (role === 'Components') {
      return { x: rect.left + rect.width * 0.56, y: rect.top + marginY };
    }
    if (role === 'Spacing' || role === 'Polish') {
      return { x: rect.right - marginX - 20, y: rect.top + marginY };
    }
    return { x: rect.left + marginX, y: rect.top + marginY };
  }

  function clickCursor(cursor) {
    cursor.node.classList.remove('is-clicking');
    void cursor.node.offsetWidth;
    cursor.node.classList.add('is-clicking');
    setTimeout(() => cursor.node.classList.remove('is-clicking'), 500 * SPEED);
  }

  function selectElement(el, label) {
    clearTimeout(lastFrameTimer);
    const rect = el.getBoundingClientRect();
    if (rect.height < 4 || rect.width < 4) return;

    frame.style.left = Math.max(1, rect.left - 4) + 'px';
    frame.style.top = Math.max(1, rect.top - 4) + 'px';
    frame.style.width = Math.max(10, Math.min(innerWidth - 2, rect.width + 8)) + 'px';
    frame.style.height = Math.max(10, Math.min(innerHeight, rect.height + 8)) + 'px';
    $('#selectionLabel').textContent = label.toUpperCase() + ' • EDITING';
    frame.classList.add('is-showing');
    lastFrameTimer = setTimeout(() => {
      frame.classList.remove('is-showing');
    }, 680 * SPEED);
  }

  function ghostDrag(el, color) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 15 || rect.height < 8 || rect.top > innerHeight || rect.bottom < 0) {
      return;
    }
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.cssText = `
      position: fixed;
      z-index: 401;
      pointer-events: none;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 1px dashed ${color};
      background: ${color}18;
    `;
    layer.append(ghost);

    try {
      const animation = ghost.animate([
        { transform: 'translate(55px, -24px) scale(.96)', opacity: 0.7 },
        { transform: 'translate(0, 0) scale(1)', opacity: 0.08 }
      ], {
        duration: 410 * SPEED,
        easing: 'ease-out',
        fill: 'forwards'
      });
      animation.finished.catch(() => {}).then(() => ghost.remove());
    } catch (_) {
      ghost.remove();
    }
  }

  async function waitWhilePaused(gen) {
    while (paused && isCurrent(gen)) {
      await new Promise(resolve => setTimeout(resolve, 60));
    }
  }

  // The Motion agent leads the eye whenever a new section is scrolled to.
  // Pausing freezes the scroll at its CURRENT position; resuming continues it.
  async function scrollToPosition(top, duration = 900, gen = generation) {
    if (!isCurrent(gen)) return;
    const from = scrollY;
    const to = Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, top));
    if (Math.abs(to - from) < 25) return;

    activeScroll = true;
    frame.classList.remove('is-showing');
    const guide = getAgent('Motion');
    if (guide && !guide.busy) {
      activateAgent(guide);
      void moveCursor(guide, innerWidth - 112, innerHeight * 0.57, 420);
    }

    let elapsed = 0;
    let previous = performance.now();
    const durationMs = Math.max(35, duration * SPEED);
    await new Promise(resolve => {
      function tick(now) {
        if (!isCurrent(gen)) {
          activeScroll = false;
          return resolve();
        }
        if (!paused) elapsed += Math.max(0, now - previous);
        previous = now;

        const t = Math.min(1, elapsed / durationMs);
        const eased = t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
        window.scrollTo(0, from + (to - from) * eased);

        if (t >= 1) {
          activeScroll = false;
          resolve();
        } else {
          requestAnimationFrame(tick);
        }
      }
      requestAnimationFrame(tick);
    });
    if (guide && isCurrent(gen)) parkAgent(guide);
  }

  async function viewElement(el, gen) {
    if (!isCurrent(gen)) return;
    const rect = el.getBoundingClientRect();
    if (rect.top > innerHeight * 0.73 || rect.bottom < 85) {
      const destination = scrollY + rect.top - Math.min(innerHeight * 0.39, 250);
      await scrollToPosition(destination, 710, gen);
    }
  }

  // A second editor joins ONLY for meaningful two-person tasks:
  // sizing placed images or refining large display headings.
  function collaboratorFor(el, primary) {
    if (el.dataset.motion === 'image') return primary === 'Media' ? 'Layout' : null;
    if (el.matches('.hero-title, .work-heading, .skills-intro, .contact-heading')) {
      return 'Design';
    }
    return null;
  }

  async function buildElement(el, index, gen) {
    if (!isCurrent(gen)) return;
    await waitWhilePaused(gen);
    if (!isCurrent(gen)) return;
    await viewElement(el, gen);
    await waitWhilePaused(gen);
    if (!isCurrent(gen)) return;

    const role = roleFor(el);
    const cursor = getAgent(role);
    const assistantRole = collaboratorFor(el, role);
    const assistant = assistantRole ? getAgent(assistantRole) : null;
    activateAgent(cursor);
    const position = targetPoint(el, role);

    // The collaborator adjusts an opposite corner while the owner places
    // the component. Neither cursor moves to an unrelated/random element.
    let assistantJourney = Promise.resolve();
    if (assistant && assistant !== cursor && !assistant.busy) {
      activateAgent(assistant);
      const opposite = targetPoint(el, assistantRole, true);
      assistantJourney = moveCursor(assistant, opposite.x, opposite.y, 460);
    }

    await Promise.all([
      moveCursor(cursor, position.x, position.y, 520),
      assistantJourney
    ]);
    await waitWhilePaused(gen);
    if (!isCurrent(gen)) return;

    clickCursor(cursor);
    if (assistant && assistant.busy) clickCursor(assistant);
    selectElement(el, role);
    if (el.dataset.motion === 'image' || el.matches('.main-nav, .header-actions, .work-card__info')) {
      ghostDrag(el, cursor.color);
    }
    el.classList.add('is-built', 'is-placed');
    if (el.dataset.motion === 'type') el.classList.add('is-typing');
    builtCount += 1;
    setProgress();

    await delay(el.dataset.motion === 'type' ? 430 : 290);
    el.classList.remove('is-typing', 'is-placed');
    if (!isCurrent(gen)) return;
    parkAgent(cursor);
    if (assistant && assistant.busy) parkAgent(assistant);
  }

  function insertScene(key) {
    const fragment=$('#tpl-'+key).content.cloneNode(true);
    if(key==='header') experience.append(fragment);
    else if(key==='hero') experience.append(fragment);
    else stageHost().append(fragment);
    wireScene(key);
    const root=key==='header'?$('#siteHeader'):key==='hero'?$('#home'):$('#'+key);
    return {root,parts:[...root.querySelectorAll('[data-build]')]};
  }

  function wireScene(key) {
    if(key==='header') {
      $('#themeToggle')?.addEventListener('click',changeTheme);
      $('#menuToggle')?.addEventListener('click',()=>{
        const nav=$('#mobileNav');const open=nav.hasAttribute('hidden');
        nav.toggleAttribute('hidden',!open);$('#menuToggle').setAttribute('aria-expanded',String(open));
      });
      $('#mobileNav')?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
        $('#mobileNav').hidden=true;$('#menuToggle').setAttribute('aria-expanded','false');
      }));
    }
    if(key==='work'){
      experience.querySelectorAll('.project-view').forEach(b=>b.addEventListener('click',()=>openProject(b.dataset.project)));
    }
  }

  function changeTheme(){
    const root=document.documentElement;
    const next=root.dataset.theme==='dark'?'light':'dark';
    root.dataset.theme=next;
    try{localStorage.setItem('alwahsh-builder-theme',next);}catch(_){}
  }
  function openProject(key){
    const project=PROJECTS[key];if(!project || !dialog)return;
    $('#dialogContent').innerHTML=`<img src="${project.image}" alt="Concept artwork for ${project.title}"><div class="project-dialog__body"><small style="color:var(--accent);letter-spacing:1px;font-weight:700">${project.type}</small><h3 id="dialogTitle">${project.title}</h3><p>${project.description}</p></div>`;
    if(typeof dialog.showModal==='function')dialog.showModal();
  }
  $('#dialogClose').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});

  function measureTotal() {
    totalCount=SCENES.reduce((acc,s)=>acc+$('#tpl-'+s.key).content.querySelectorAll('[data-build]').length,0);
  }

  function makeComplete(showMessage=true) {
    completed=true;
    paused=false;
    document.body.classList.remove('is-constructing');
    frame.classList.remove('is-showing');
    builtCount=totalCount;
    setProgress();
    buildHeadline.textContent='WEBSITE IS READY';
    buildStage.textContent='08 / 08 — COMPLETE';
    builderActions.classList.add('is-hidden');
    replayButton.hidden=false;
    setTimeout(()=>buildUi.classList.add('is-hidden'),1100);
    if(showMessage){finishToast.classList.add('show');setTimeout(()=>finishToast.classList.remove('show'),3200);}
  }

  function skipBuild() {
    generation++;
    if(completed)return;
    for(const scene of SCENES){if(!$('#tpl-'+scene.key))continue; if(! (scene.key==='header'?$('#siteHeader'):scene.key==='hero'?$('#home'):$('#'+scene.key)))insertScene(scene.key);}
    for(const part of experience.querySelectorAll('[data-build]'))part.classList.add('is-built');
    window.scrollTo({top:0,behavior:'instant'});
    makeComplete(false);
  }

  function resetUI(){
    completed=false;paused=false;builtCount=0;
    experience.textContent='';
    document.body.classList.add('is-constructing');
    buildUi.classList.remove('is-hidden');
    builderActions.classList.remove('is-hidden');
    replayButton.hidden=true;
    finishToast.classList.remove('show');
    frame.classList.remove('is-showing');
    pauseButton.textContent='Ⅱ   PAUSE';
    setBuildStatus({status:'00 / INITIALIZE',name:'INITIALIZING THE CANVAS'});
    setProgress();
    createCursors();
    window.scrollTo({top:0,behavior:'instant'});
  }

  async function runConstruction() {
    const gen=++generation;
    resetUI();
    await delay(720);
    if(!isCurrent(gen))return;
    let index=0;
    for (const scene of SCENES) {
      if(!isCurrent(gen))return;
      await waitWhilePaused(gen);
      if(!isCurrent(gen))return;
      setBuildStatus(scene);
      const {root,parts}=insertScene(scene.key);
      if(scene.key!=='header'&&scene.key!=='hero'){
        await delay(260);
        await scrollToPosition(scrollY+root.getBoundingClientRect().top-82,970,gen);
      }
      for(const part of parts){
        if(!isCurrent(gen))return;
        await buildElement(part,index++,gen);
      }
      if(!isCurrent(gen))return;
      await waitWhilePaused(gen);
      await delay(scene.key==='hero'?950:scene.key==='work'?560:310);
    }
    if(!isCurrent(gen))return;
    await scrollToPosition(document.documentElement.scrollHeight-innerHeight,620,gen);
    if(!isCurrent(gen))return;
    makeComplete(true);
  }

  replayButton.addEventListener('click',()=>{if(dialog.open)dialog.close();runConstruction();});
  skipButton.addEventListener('click',skipBuild);
  pauseButton.addEventListener('click',()=>{
    paused=!paused;
    pauseButton.textContent=paused?'▶   RESUME':'Ⅱ   PAUSE';
    for (const cursor of cursors) {
      if (!cursor.animation) continue;
      if (paused) cursor.animation.pause();
      else cursor.animation.play();
    }
    buildHeadline.textContent=paused?'CONSTRUCTION PAUSED':'AGENTS BACK AT WORK';
  });
  measureTotal();
  if(instant){
    for (const scene of SCENES)insertScene(scene.key);
    for(const part of experience.querySelectorAll('[data-build]'))part.classList.add('is-built');
    completed=true;document.body.classList.remove('is-constructing');
    buildUi.hidden=true;builderActions.hidden=true;replayButton.hidden=false;
  } else runConstruction();
})();
