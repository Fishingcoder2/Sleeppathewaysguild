const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const demoDir = path.resolve(__dirname, '..');
const repoDir = path.resolve(demoDir, '..');
const key = 'spg-tutor-demo-2026-v2';
const json = relative => JSON.parse(fs.readFileSync(path.join(repoDir, relative), 'utf8'));
const slices = Object.fromEntries(['d1', 'd2', 'd3', 'd4'].map(domain =>
  [domain, json(`rpsgt-v3/data/practice-slice/${domain}.json`)]));
const d1a = slices.d1.questions.filter(question => question.taskCode === 'D1A');
const d1b = slices.d1.questions.filter(question => question.taskCode === 'D1B');
const decode = value => String(value).replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// This is an event/state test double, not a layout or browser emulator. It only
// models the IDs, radio groups, select options and handlers used by the demo.
function mockDocument(html) {
  const ids = new Map();
  const elements = new Set();
  const handlers = { click: [], change: [] };
  const document = {
    activeElement: null,
    getElementById: id => ids.get(id) || null,
    addEventListener: (type, handler) => handlers[type].push(handler),
    querySelectorAll(selector) {
      if (selector === '.view') return [...elements].filter(element => element.classes.includes('view'));
      if (selector === '[data-view]') return [...elements].filter(element => element.dataset.view);
      throw new Error(`Unsupported selector: ${selector}`);
    },
    querySelector(selector) {
      const match = /^input\[name="([^"]+)"\]:checked$/.exec(selector);
      if (match) return [...elements].find(element => element.name === match[1] && element.checked) || null;
      throw new Error(`Unsupported selector: ${selector}`);
    }
  };
  function parse(markup, owner) {
    const created = [];
    for (const match of markup.matchAll(/<(\w+)([^>]*)>/g)) {
      const attrs = {};
      for (const attr of match[2].matchAll(/([\w-]+)(?:="([^"]*)"|='([^']*)'|=([^\s>]+))?/g)) {
        attrs[attr[1]] = decode(attr[2] ?? attr[3] ?? attr[4] ?? '');
      }
      if (!attrs.id && !attrs['data-view'] && !attrs['data-domain'] && !attrs['data-ready'] &&
          !Object.hasOwn(attrs, 'data-lesson-step') && attrs.type !== 'radio') continue;
      const listeners = { click: [], change: [] };
      let innerHTML = '';
      const element = {
        id: attrs.id || '', owner, attrs, classes: (attrs.class || '').split(/\s+/),
        dataset: Object.fromEntries(Object.entries(attrs).filter(([name]) => name.startsWith('data-'))
          .map(([name, value]) => [name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value])),
        disabled: Object.hasOwn(attrs, 'disabled'), hidden: Object.hasOwn(attrs, 'hidden'),
        checked: Object.hasOwn(attrs, 'checked'), type: attrs.type || '', name: attrs.name || '',
        value: attrs.value || '', textContent: '', style: {}, onclick: null, onchange: null,
        hasAttribute: name => Object.hasOwn(attrs, name),
        setAttribute: (name, value) => { attrs[name] = String(value); },
        addEventListener: (type, handler) => listeners[type].push(handler),
        focus() { document.activeElement = element; },
        scrollIntoView() {},
        get innerHTML() { return innerHTML; },
        set innerHTML(value) {
          innerHTML = value;
          for (const child of [...elements]) {
            if (child.owner === element) { elements.delete(child); if (child.id) ids.delete(child.id); }
          }
          parse(value, element);
          if (match[1] === 'select') {
            const option = /<option[^>]*value="([^"]*)"/.exec(value);
            element.value = option ? decode(option[1]) : '';
          }
        },
        dispatch(type) {
          if (type === 'click' && element.disabled) return;
          const event = { target: element };
          if (typeof element[`on${type}`] === 'function') element[`on${type}`](event);
          listeners[type].forEach(handler => handler(event));
          handlers[type].forEach(handler => handler(event));
        }
      };
      elements.add(element);
      created.push(element);
      if (element.id) ids.set(element.id, element);
    }
    return created;
  }
  parse(html, null);
  return {
    document,
    find: predicate => [...elements].find(predicate),
    radio(name, value) { return [...elements].find(element => element.type === 'radio' &&
      element.name === name && element.value === String(value)); },
    checkRadio(name, value) {
      const selected = this.radio(name, value);
      assert.ok(selected, `Radio ${name} / ${value} exists`);
      for (const element of elements) if (element.name === name) element.checked = element === selected;
      selected.dispatch('change');
    }
  };
}

async function openDemo({ saved, missingData = false } = {}) {
  const dom = mockDocument(fs.readFileSync(path.join(demoDir, 'index.html'), 'utf8'));
  const storage = new Map(saved ? [[key, JSON.stringify(saved)]] : []);
  const window = { matchMedia: () => ({ matches: true }), SPGReadAloud: { stop() {}, mount() {} } };
  const context = vm.createContext({
    window, document: dom.document, console, setTimeout: () => 0, confirm: () => true,
    localStorage: { getItem: name => storage.get(name) || null, setItem: (name, value) => storage.set(name, value) },
    fetch: async url => ({ ok: !missingData, json: async () => json(url.replace(/^\//, '')) })
  });
  for (const file of ['first-lesson.js', 'demo.js']) vm.runInContext(
    fs.readFileSync(path.join(demoDir, file), 'utf8'), context, { filename: file });
  await new Promise(resolve => setImmediate(resolve));
  const el = id => {
    const element = dom.document.getElementById(id);
    assert.ok(element, `Element #${id} exists`);
    return element;
  };
  return {
    ...dom, el, lesson: window.SPGFirstLesson,
    state: () => JSON.parse(storage.get(key) || '{}'),
    click: id => el(id).dispatch('click'),
    role(view) { dom.find(element => element.dataset.view === view).dispatch('click'); },
    confirmReading(value = true) { el('readingConfirm').checked = value; el('readingConfirm').dispatch('change'); },
    chooseTask(code) { el('taskPick').value = code; el('taskPick').dispatch('change'); },
    answer(questions, wrong = []) {
      questions.forEach((question, index) => {
        const correct = question.options.indexOf(question.answer);
        dom.checkRadio(`item-${index}`, wrong.includes(index) ? (correct + 1) % question.options.length : correct);
      });
    },
    taskLocked(code) {
      const option = new RegExp(`<option value="${code}"([^>]*)>`).exec(el('taskPick').innerHTML);
      assert.ok(option, `${code} is offered`);
      return /\bdisabled\b/.test(option[1]);
    }
  };
}

function reachReadingPlan(app) {
  for (let step = 0; step < 5; step++) {
    assert.match(app.el('lesson').innerHTML, new RegExp(`Step ${step + 1} of 5`));
    assert.equal(app.el('quizCard').hidden, true);
    if (step < 4) app.click('lessonNext');
  }
}
function beginFirstCheck(app) {
  reachReadingPlan(app);
  app.confirmReading();
  app.click('lessonNext');
  assert.equal(app.el('quizCard').hidden, false);
}
function approveTask(app, code) {
  app.role('tutor');
  app.el('signoffTask').value = code;
  app.el('instructionNote').value = 'Reviewed the explanations and corrected missed concepts.';
  app.click('signoffButton');
  app.role('student');
}

test('the student studies five steps and confirms readings before explicitly starting existing questions', async () => {
  const app = await openDemo();
  assert.equal(app.el('quiz').innerHTML, '');
  reachReadingPlan(app);
  assert.equal(app.el('lessonNext').disabled, true);
  app.click('lessonNext');
  assert.equal(app.el('quizCard').hidden, true);
  app.confirmReading();
  assert.equal(app.el('quizCard').hidden, true, 'confirmation alone does not open a quiz');
  app.click('lessonNext');
  assert.equal(app.el('lessonCard').hidden, true);
  assert.equal(app.el('quizCard').hidden, false);
  assert.equal(app.document.activeElement.id, 'quiztitle');
  assert.equal(app.state().assigned, true);
  assert.equal(app.state().d1a.complete, true);
  for (const question of d1a) assert.ok(decode(app.el('quiz').innerHTML).includes(question.prompt));
  assert.equal((app.el('quiz').innerHTML.match(/<fieldset/g) || []).length, 3);
});

test('legacy reviewed-target progress does not skip the new first lesson', async () => {
  const app = await openDemo({ saved: { read: ['D1A'], assigned: true } });
  assert.match(app.el('lesson').innerHTML, /Step 1 of 5/);
  assert.equal(app.el('quizCard').hidden, true);
  reachReadingPlan(app);
  assert.equal(app.el('lessonNext').disabled, true);
  assert.equal(app.state().d1a.complete, false);
});

test('unavailable practice data never prevents reading the lesson or opens an empty check', async () => {
  const app = await openDemo({ missingData: true });
  reachReadingPlan(app);
  app.confirmReading();
  assert.equal(app.el('lessonNext').disabled, true);
  assert.match(app.el('lesson').innerHTML, /Practice questions are unavailable/);
  assert.equal(app.el('quizCard').hidden, true);
  app.click('lessonBack');
  assert.match(app.el('lesson').innerHTML, /Step 4 of 5/);
});

test('selected answers survive role changes and incomplete grading does not pass', async () => {
  const app = await openDemo();
  beginFirstCheck(app);
  const choice = d1a[0].options.indexOf(d1a[0].answer);
  app.checkRadio('item-0', choice);
  app.role('tutor');
  app.role('student');
  assert.equal(app.radio('item-0', choice).checked, true);
  app.click('quizSubmit');
  assert.match(app.el('feedback').textContent, /Answer every question/);
  assert.equal(app.state().passed.D1A, undefined);
  assert.equal(app.el('quizSubmit').disabled, false);
  assert.equal(app.el('quizRetry').disabled, true);
});

test('failed answers offer targeted teaching and retry requires reading confirmation again', async () => {
  const app = await openDemo();
  beginFirstCheck(app);
  app.answer(d1a, [0]);
  app.click('quizSubmit');
  assert.equal(app.state().passed.D1A, undefined);
  assert.match(app.el('quizResult').innerHTML, /67% \(2\/3\)/);
  assert.match(app.el('quizResult').innerHTML, /Revisit this explanation/);
  assert.equal(app.el('quizSubmit').disabled, true);
  assert.equal(app.el('quizRetry').disabled, false);
  app.click('quizRetry');
  assert.equal(app.el('quizCard').hidden, true);
  assert.match(app.el('lesson').innerHTML, /Notice anatomy and medication clues/);
  assert.equal(app.state().d1a.complete, false);
  app.click('lessonNext');
  app.click('lessonNext');
  assert.equal(app.el('lessonNext').disabled, true);
  app.confirmReading();
  app.click('lessonNext');
  assert.equal(app.radio('item-0', 0).checked, false, 'retry starts with no saved selection');
});

test('a targeted remediation link returns to its explanation and removes practice eligibility', async () => {
  const app = await openDemo();
  beginFirstCheck(app);
  app.answer(d1a, [2]);
  app.click('quizSubmit');
  app.find(element => element.dataset.lessonStep === '3').dispatch('click');
  assert.equal(app.el('quizCard').hidden, true);
  assert.match(app.el('lesson').innerHTML, /Connect the person to the recording/);
  assert.equal(app.state().d1a.complete, false);
});

test('three correct answers pass but the next task stays locked until tutor approval', async () => {
  const app = await openDemo();
  beginFirstCheck(app);
  app.answer(d1a);
  app.click('quizSubmit');
  assert.match(app.el('quizResult').innerHTML, /100% \(3\/3\)/);
  assert.equal(app.state().passed.D1A, true);
  assert.equal(app.state().signoff.D1A, undefined);
  assert.equal(app.taskLocked('D1B'), true);
  assert.equal(app.el('quizSubmit').disabled, true);
  assert.equal(app.el('quizRetry').disabled, true);
  approveTask(app, 'D1A');
  assert.equal(app.taskLocked('D1B'), false);
  assert.equal(app.state().signoff.D1A.minutes, 15);
  assert.equal(app.state().invoice, false, 'teaching approval does not create billing');
  assert.equal(app.el('quizTutorReview').textContent, 'Continue to next lesson');
  app.click('quizTutorReview');
  assert.equal(app.el('quizCard').hidden, true);
  assert.equal(app.el('taskPick').value, 'D1B');
  assert.equal(app.document.activeElement.id, 'lesson-heading');
});

test('later tasks start explicitly, return to their checklist, and keep completed controls correct', async () => {
  const app = await openDemo({ saved: { assigned: true, passed: { D1A: true }, signoff: { D1A: { minutes: 15 } } } });
  app.chooseTask('D1B');
  app.click('markRead');
  assert.equal(app.el('quizCard').hidden, true, 'reviewing a checklist does not start testing');
  app.click('markRead');
  assert.equal(app.el('quizCard').hidden, false);
  app.click('returnLesson');
  assert.equal(app.el('quizCard').hidden, true, 'return does not restart an already reviewed task');
  assert.match(app.el('lesson').innerHTML, /Start practice check/);
  app.click('markRead');
  app.answer(d1b, [0]);
  app.click('quizSubmit');
  assert.equal(app.el('quizSubmit').disabled, true);
  assert.equal(app.el('quizRetry').disabled, false);
  assert.match(app.el('quiznotice').textContent, /not a BRPT passing score/);
  app.click('quizRetry');
  app.answer(d1b);
  app.click('quizSubmit');
  assert.equal(app.state().passed.D1B, true);
  assert.equal(app.el('quizSubmit').disabled, true);
  assert.equal(app.el('quizRetry').disabled, true);
});

test('domain exams retain tutor gates, answer selections and their separate completion record', async () => {
  const locked = await openDemo();
  const lockedButton = locked.find(element => element.dataset.domain === 'D1');
  assert.equal(lockedButton.disabled, true);
  lockedButton.dispatch('click');
  assert.equal(locked.el('quizCard').hidden, true);

  const app = await openDemo({ saved: { assigned: true, signoff: {
    D1A: { minutes: 15 }, D1B: { minutes: 15 }, D1C: { minutes: 15 }
  } } });
  app.find(element => element.dataset.domain === 'D1').dispatch('click');
  assert.match(app.el('quiznotice').textContent, /9 existing Guild questions/);
  assert.equal(app.el('returnLesson').hidden, true);
  app.answer(slices.d1.questions);
  app.role('tutor');
  app.role('student');
  slices.d1.questions.forEach((question, index) => assert.equal(
    app.radio(`item-${index}`, question.options.indexOf(question.answer)).checked, true));
  app.click('quizSubmit');
  assert.equal(app.state().domain.D1, true);
  assert.equal(app.state().passed.D1A, undefined, 'domain completion does not write task completion');
  assert.equal(app.el('quizSubmit').disabled, true);
  assert.equal(app.find(element => element.dataset.domain === 'D1').disabled, true);
});

test('teaching introduces the three tested concepts and reading routes name authoritative sources', async () => {
  const app = await openDemo();
  const teaching = app.lesson.steps.map(step => step.body).join('\n');
  assert.match(teaching, /Micrognathia.*small.*lower jaw/);
  assert.match(teaching, /SSRIs.*selective serotonin reuptake inhibitors/);
  assert.match(teaching, /REM.*rapid eye movement/);
  assert.match(teaching, /epoch.*30-second/);
  assert.match(teaching, /No alpha does not automatically mean sleep/);
  assert.match(teaching, /current AASM manual/);
  assert.match(teaching, /Do not tell Sam to stop or change a medicine/);
  const urls = [...app.lesson.references.matchAll(/href="([^"]+)"/g)].map(match => new URL(match[1]));
  for (const hostname of ['www.brpt.org', 'aastweb.org', 'aasm.org', 'pmc.ncbi.nlm.nih.gov'])
    assert.ok(urls.some(url => url.hostname === hostname), `${hostname} reading route exists`);
  for (const question of d1a) assert.ok(app.lesson.remediation[question.id], `${question.id} has targeted teaching`);
});
