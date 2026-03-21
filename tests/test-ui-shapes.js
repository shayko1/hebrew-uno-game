/**
 * Tests for color-blind accessibility shape symbols on cards.
 * Verifies that COLOR_SHAPES constant exists and that createCardElement
 * adds shape indicators to card corners for non-wild cards.
 */

import { describe, it, assert, assertEqual, showSummary } from './runner.js';
import { COLOR_SHAPES } from '../js/constants.js';
import { createCardElement } from '../js/ui.js';

describe('COLOR_SHAPES constant', () => {
  it('should export COLOR_SHAPES from constants', () => {
    assert(COLOR_SHAPES !== undefined, 'COLOR_SHAPES should be defined');
    assert(typeof COLOR_SHAPES === 'object', 'COLOR_SHAPES should be an object');
  });

  it('should map red to circle', () => {
    assertEqual(COLOR_SHAPES.red, '\u25CF', 'red should map to filled circle');
  });

  it('should map blue to square', () => {
    assertEqual(COLOR_SHAPES.blue, '\u25A0', 'blue should map to filled square');
  });

  it('should map green to triangle', () => {
    assertEqual(COLOR_SHAPES.green, '\u25B2', 'green should map to filled triangle');
  });

  it('should map yellow to diamond', () => {
    assertEqual(COLOR_SHAPES.yellow, '\u25C6', 'yellow should map to filled diamond');
  });

  it('should not have a wild entry', () => {
    assert(COLOR_SHAPES.wild === undefined, 'wild should not have a shape');
  });
});

describe('createCardElement shape symbols', () => {
  it('should add shape symbol to red number card corners', () => {
    const card = { id: 'r1', color: 'red', type: 'number', value: 1 };
    const el = createCardElement(card, true);
    const cornerTop = el.querySelector('.card-corner-top');
    const cornerBottom = el.querySelector('.card-corner-bottom');
    assert(cornerTop, 'top corner should exist');
    assert(cornerBottom, 'bottom corner should exist');
    assert(cornerTop.textContent.includes('\u25CF'), 'top corner should include circle shape for red: got "' + cornerTop.textContent + '"');
    assert(cornerBottom.textContent.includes('\u25CF'), 'bottom corner should include circle shape for red: got "' + cornerBottom.textContent + '"');
  });

  it('should add shape symbol to blue number card corners', () => {
    const card = { id: 'b5', color: 'blue', type: 'number', value: 5 };
    const el = createCardElement(card, true);
    const cornerTop = el.querySelector('.card-corner-top');
    assert(cornerTop.textContent.includes('\u25A0'), 'top corner should include square shape for blue: got "' + cornerTop.textContent + '"');
  });

  it('should add shape symbol to green special card corners', () => {
    const card = { id: 'gs', color: 'green', type: 'special', value: 'skip' };
    const el = createCardElement(card, true);
    const cornerTop = el.querySelector('.card-corner-top');
    assert(cornerTop.textContent.includes('\u25B2'), 'top corner should include triangle shape for green: got "' + cornerTop.textContent + '"');
  });

  it('should add shape symbol to yellow card corners', () => {
    const card = { id: 'y9', color: 'yellow', type: 'number', value: 9 };
    const el = createCardElement(card, true);
    const cornerTop = el.querySelector('.card-corner-top');
    assert(cornerTop.textContent.includes('\u25C6'), 'top corner should include diamond shape for yellow: got "' + cornerTop.textContent + '"');
  });

  it('should NOT add shape to wild cards', () => {
    const card = { id: 'w1', color: 'wild', type: 'special', value: 'wild' };
    const el = createCardElement(card, true);
    const cornerTop = el.querySelector('.card-corner-top');
    // Wild cards should not contain any shape symbols
    assert(!cornerTop.textContent.includes('\u25CF'), 'wild should not have circle');
    assert(!cornerTop.textContent.includes('\u25A0'), 'wild should not have square');
    assert(!cornerTop.textContent.includes('\u25B2'), 'wild should not have triangle');
    assert(!cornerTop.textContent.includes('\u25C6'), 'wild should not have diamond');
  });

  it('should NOT add shape to face-down cards', () => {
    const card = { id: 'r2', color: 'red', type: 'number', value: 2 };
    const el = createCardElement(card, false);
    const cornerTop = el.querySelector('.card-corner-top');
    assert(cornerTop === null, 'face-down cards should not have corner elements');
  });

  it('should keep the number/symbol text in corners', () => {
    const card = { id: 'r7', color: 'red', type: 'number', value: 7 };
    const el = createCardElement(card, true);
    const cornerTop = el.querySelector('.card-corner-top');
    assert(cornerTop.textContent.includes('7'), 'corner should still include the number 7: got "' + cornerTop.textContent + '"');
  });

  it('should have shape element with card-corner-shape class', () => {
    const card = { id: 'b3', color: 'blue', type: 'number', value: 3 };
    const el = createCardElement(card, true);
    const shapeEl = el.querySelector('.card-corner-shape');
    assert(shapeEl !== null, 'should have an element with card-corner-shape class');
    assertEqual(shapeEl.textContent, '\u25A0', 'shape element should contain the square symbol');
  });
});

showSummary();
