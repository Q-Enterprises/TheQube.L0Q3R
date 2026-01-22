(() => {
  const stableStringify = (value) => {
    if (value === null || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  };

  const computeStableHash = (snapshot) => {
    const serialized = stableStringify(snapshot);
    let hash = 0;
    for (let i = 0; i < serialized.length; i += 1) {
      hash = (hash * 31 + serialized.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  };

  window.Loop0Fossil = {
    stableStringify,
    computeStableHash,
  };
})();
