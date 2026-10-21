export function presetFilters(preset, existing = {}, explicitlySet = []) {
  const filters = {
    preset, originId: existing.originId || '', provinces: [],
    themeIds: [...(existing.themeIds || [])],
    kind: preset === 'near' ? 'spot' : 'city',
    maxDistanceKm: preset === 'near' ? 120 : null,
    maxBudget: null, customNames: [], excludedIds: []
  };
  for (const key of explicitlySet) {
    if (key in filters && key in existing) {
      filters[key] = Array.isArray(existing[key]) ? [...existing[key]] : existing[key];
    }
  }
  return filters;
}

export function parseCustomNames(text = '') {
  const unique = new Map();
  for (const value of text.split(/[\n\r,，;；]+/u)) {
    const name = value.trim().normalize('NFKC');
    if (name) unique.set(name.toLocaleLowerCase(), name);
  }
  return [...unique.values()];
}

export function toggleTheme(themes, id) {
  return themes.includes(id) ? themes.filter(theme => theme !== id) : [...themes, id];
}

export function rememberDestination(saved, destination) {
  return saved.some(item => item.id === destination.id) ? saved : [destination, ...saved];
}
