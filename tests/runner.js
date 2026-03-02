/**
 * Minimal browser test runner for UNO Hebrew Game.
 * All DOM creation uses createElement + textContent (no innerHTML).
 */

let passed = 0;
let failed = 0;
let currentSuite = null;

const container = document.getElementById('results') || document.body;

/**
 * Creates a suite heading and runs the suite function.
 */
export function describe(name, fn) {
  const heading = document.createElement('h2');
  heading.textContent = name;
  heading.style.borderBottom = '1px solid #555';
  heading.style.paddingBottom = '4px';
  heading.style.marginTop = '24px';
  container.appendChild(heading);

  currentSuite = document.createElement('div');
  currentSuite.style.paddingLeft = '16px';
  container.appendChild(currentSuite);

  fn();

  currentSuite = null;
}

/**
 * Runs a single test case, catches errors, shows pass/fail.
 */
export function it(name, fn) {
  const line = document.createElement('div');
  line.style.margin = '4px 0';
  line.style.fontFamily = 'monospace';

  try {
    fn();
    passed++;
    const marker = document.createElement('span');
    marker.textContent = 'PASS';
    marker.style.color = '#4caf50';
    marker.style.fontWeight = 'bold';

    const label = document.createElement('span');
    label.textContent = ' ' + name;

    line.appendChild(marker);
    line.appendChild(label);
  } catch (err) {
    failed++;
    const marker = document.createElement('span');
    marker.textContent = 'FAIL';
    marker.style.color = '#f44336';
    marker.style.fontWeight = 'bold';

    const label = document.createElement('span');
    label.textContent = ' ' + name;

    const detail = document.createElement('div');
    detail.textContent = '    ' + err.message;
    detail.style.color = '#ff8a80';
    detail.style.fontSize = '0.9em';
    detail.style.paddingLeft = '16px';

    line.appendChild(marker);
    line.appendChild(label);
    line.appendChild(detail);
  }

  const target = currentSuite || container;
  target.appendChild(line);
}

/**
 * Asserts a condition is truthy.
 */
export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Asserts two values are strictly equal.
 */
export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    const msg = (message ? message + ': ' : '') +
      'expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual);
    throw new Error(msg);
  }
}

/**
 * Shows a summary of passed/failed test counts.
 */
export function showSummary() {
  const hr = document.createElement('hr');
  hr.style.marginTop = '24px';
  container.appendChild(hr);

  const summary = document.createElement('h2');
  const total = passed + failed;
  summary.textContent = 'Results: ' + passed + ' passed, ' + failed + ' failed (of ' + total + ')';
  summary.style.color = failed === 0 ? '#4caf50' : '#f44336';
  container.appendChild(summary);
}
