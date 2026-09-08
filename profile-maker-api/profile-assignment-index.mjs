// Assignment arrays are newest-first and immutable entries are prepended.
// A replaced array or changed boundary rebuilds the index (e.g. history restore).
export function createIncrementalIndex(build, append) {
    const cache = new WeakMap();
    return (entries) => {
        const previous = cache.get(entries);
        const added = previous ? entries.length - previous.length : -1;
        const canAppend = previous && added >= 0
            && entries[added] === previous.first
            && entries[entries.length - 1] === previous.last;
        const index = canAppend ? previous.index : build();
        const count = canAppend ? added : entries.length;
        for (let offset = count - 1; offset >= 0; offset -= 1) append(index, entries[offset]);
        cache.set(entries, { index, length: entries.length, first: entries[0], last: entries[entries.length - 1] });
        return index;
    };
}

export function increment(map, key) {
    map.set(key, (map.get(key) || 0) + 1);
}
