import {
  filterRegistry,
  getDefaultFilters,
  getFilterDef,
  type FilterType,
} from "./filter-registry";

describe("filter-registry", () => {
  it("builds disabled default filters with cloned param objects", () => {
    const defaults = getDefaultFilters();

    expect(defaults).toHaveLength(filterRegistry.length);
    expect(defaults.map((filter) => filter.type)).toEqual(
      filterRegistry.map((filter) => filter.type)
    );
    expect(defaults.every((filter) => filter.enabled === false)).toBe(true);

    defaults[0].params.gain = 2;

    expect(filterRegistry[0].defaultParams.gain).toBe(1);
    expect(getDefaultFilters()[0].params.gain).toBe(1);
  });

  it.each(filterRegistry.map((filter) => filter.type) as FilterType[])(
    "exposes the UI metadata needed for %s",
    (type) => {
      const def = getFilterDef(type);

      expect(def.type).toBe(type);
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
      expect(Object.keys(def.paramRanges).length).toBeGreaterThan(0);
    }
  );
});
