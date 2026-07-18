// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeocoderSearchField } from './GeocoderSearchField';
import { GeocoderService } from './GeocoderService';
import { GeocodeResult } from '../types/common';

// Gespiegelt aus GeocoderSearchField.ts (private Modul-Konstanten, keine Exporte nötig).
const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 400;

const sampleResult: GeocodeResult = {
  display_name: 'Linz, Oberösterreich, Österreich',
  lat: '48.3',
  lon: '14.28',
  class: 'place',
  type: 'city',
  importance: 0.8
};

function setup(options: Partial<{ suppressWhen: (query: string) => boolean }> = {}) {
  const input = document.createElement('input');
  const resultsContainer = document.createElement('div');
  resultsContainer.classList.add('hidden');
  document.body.appendChild(input);
  document.body.appendChild(resultsContainer);

  const onSelect = vi.fn();
  const controller = new AbortController();
  new GeocoderSearchField(input, resultsContainer, {
    signal: controller.signal,
    onSelect,
    ...options
  });

  return { input, resultsContainer, onSelect, controller };
}

function typeQuery(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('GeocoderSearchField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it(`does not search below the minimum query length (${MIN_QUERY_LENGTH} chars)`, () => {
    const searchSpy = vi.spyOn(GeocoderService, 'search');
    const { input } = setup();

    typeQuery(input, 'a'.repeat(MIN_QUERY_LENGTH - 1));
    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('debounces rapid input into a single search call with the final query', () => {
    const searchSpy = vi.spyOn(GeocoderService, 'search').mockResolvedValue([]);
    const { input } = setup();

    typeQuery(input, 'Lin');
    vi.advanceTimersByTime(DEBOUNCE_MS - 1);
    typeQuery(input, 'Linz');
    vi.advanceTimersByTime(DEBOUNCE_MS - 1);
    expect(searchSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(searchSpy).toHaveBeenCalledTimes(1);
    expect(searchSpy).toHaveBeenCalledWith('Linz');
  });

  it('does not search when suppressWhen matches the query', () => {
    const searchSpy = vi.spyOn(GeocoderService, 'search');
    const { input } = setup({ suppressWhen: (q) => /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(q) });

    typeQuery(input, '48.3, 14.28');
    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('hides the results container for a suppressed query', () => {
    const { input, resultsContainer } = setup({ suppressWhen: () => true });

    typeQuery(input, 'Linz');
    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(resultsContainer.classList.contains('hidden')).toBe(true);
  });

  it('renders results and un-hides the container after a successful search', async () => {
    vi.spyOn(GeocoderService, 'search').mockResolvedValue([sampleResult]);
    const { input, resultsContainer } = setup();

    typeQuery(input, 'Linz');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(resultsContainer.classList.contains('hidden')).toBe(false);
    expect(resultsContainer.querySelectorAll('.geocoder-item')).toHaveLength(1);
  });

  it('hides the container when the search returns no results', async () => {
    vi.spyOn(GeocoderService, 'search').mockResolvedValue([]);
    const { input, resultsContainer } = setup();

    typeQuery(input, 'Nirgendwo');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(resultsContainer.classList.contains('hidden')).toBe(true);
  });

  it('calls onSelect with the picked result, fills the input, and hides the container', async () => {
    vi.spyOn(GeocoderService, 'search').mockResolvedValue([sampleResult]);
    const { input, resultsContainer, onSelect } = setup();

    typeQuery(input, 'Linz');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    const item = resultsContainer.querySelector('.geocoder-item') as HTMLElement;
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSelect).toHaveBeenCalledWith({ lat: 48.3, lon: 14.28, displayName: sampleResult.display_name });
    expect(input.value).toBe(sampleResult.display_name);
    expect(resultsContainer.classList.contains('hidden')).toBe(true);
  });

  it('dismisses the results on an outside click', async () => {
    vi.spyOn(GeocoderService, 'search').mockResolvedValue([sampleResult]);
    const { input, resultsContainer } = setup();

    typeQuery(input, 'Linz');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(resultsContainer.classList.contains('hidden')).toBe(false);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(resultsContainer.classList.contains('hidden')).toBe(true);
  });

  it('does not dismiss the results on a click inside the input or the results container', async () => {
    vi.spyOn(GeocoderService, 'search').mockResolvedValue([sampleResult]);
    const { input, resultsContainer } = setup();

    typeQuery(input, 'Linz');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(resultsContainer.classList.contains('hidden')).toBe(false);

    resultsContainer.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(resultsContainer.classList.contains('hidden')).toBe(false);
  });

  it('discards a pending search that resolves after the AbortSignal fired', async () => {
    let resolveSearch!: (results: GeocodeResult[]) => void;
    vi.spyOn(GeocoderService, 'search').mockImplementation(
      () => new Promise((resolve) => { resolveSearch = resolve; })
    );
    const { input, resultsContainer, controller } = setup();

    typeQuery(input, 'Linz');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    controller.abort();
    resolveSearch([sampleResult]);
    await Promise.resolve();

    expect(resultsContainer.innerHTML).toBe('');
    expect(resultsContainer.classList.contains('hidden')).toBe(true);
  });

  it('stops reacting to input after the AbortSignal fired (listener cleanup)', () => {
    const searchSpy = vi.spyOn(GeocoderService, 'search');
    const { input, controller } = setup();

    controller.abort();
    typeQuery(input, 'Linz');
    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(searchSpy).not.toHaveBeenCalled();
  });
});
