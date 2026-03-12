import { render, screen } from "@testing-library/react";

import { getFilterDef } from "@/lib/audio/filter-registry";
import { FilterCard } from "./filter-card";

describe("FilterCard", () => {
  const gainDef = getFilterDef("gain");

  it("hides parameter sliders until the filter is enabled", () => {
    const { rerender } = render(
      <FilterCard
        def={gainDef}
        config={{
          type: "gain",
          enabled: false,
          params: { gain: 1 },
        }}
        onToggle={jest.fn()}
        onParamChange={jest.fn()}
      />
    );

    expect(
      screen.getByLabelText("Adjusts the overall playback level.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();

    rerender(
      <FilterCard
        def={gainDef}
        config={{
          type: "gain",
          enabled: true,
          params: { gain: 1.2 },
        }}
        onToggle={jest.fn()}
        onParamChange={jest.fn()}
      />
    );

    expect(screen.getByRole("slider")).toBeInTheDocument();
  });
});
