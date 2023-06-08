export function setUnion<T>(a: Set<T>, b: Set<T>): Array<T> {
  return [...a, ...b];
}

export function setIntersection<T>(a: Set<T>, b: Set<T>): Array<T> {
  const output: Array<T> = [];

  for (const el of a) {
    if (b.has(el)) {
      output.push(el);
    }
  }

  return output;
}

export function setDifference<T>(a: Set<T>, b: Set<T>): Array<T> {
  const output: Array<T> = [];

  for (const el of a) {
    if (!b.has(el)) {
      output.push(el);
    }
  }

  for (const el of b) {
    if (!a.has(el)) {
      output.push(el);
    }
  }

  return output;
}
