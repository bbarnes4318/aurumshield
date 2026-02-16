/* ================================================================
   MOCK API — Simulated fetch with configurable delay
   ================================================================ */

/**
 * Simulates a network request with a random delay between min and max ms.
 * Returns a deep-cloned copy of the provided data to mimic real API behaviour.
 */
export async function mockFetch<T>(
  data: T,
  { minDelay = 300, maxDelay = 800 }: { minDelay?: number; maxDelay?: number } = {}
): Promise<T> {
  const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(structuredClone(data));
    }, delay);
  });
}
