import {
  pageReducer,
  initialPageState,
  type PageState,
  type PageAction,
} from "./record-page-state";

describe("pageReducer", () => {
  it("SYNC_RECORDER seeds title on new blobUrl", () => {
    const action: PageAction = {
      type: "SYNC_RECORDER",
      recorderStatus: "recorded",
      blobUrl: "blob:new-url",
      isPlaying: false,
      error: null,
    };

    const result = pageReducer(initialPageState, action);

    expect(result.status).toBe("recorded");
    expect(result.title).toMatch(/^Clip from /);
    expect(result.recordingBlobUrl).toBe("blob:new-url");
  });

  it("SYNC_RECORDER preserves title on same blobUrl", () => {
    const state: PageState = {
      ...initialPageState,
      status: "recorded",
      title: "My custom title",
      recordingBlobUrl: "blob:same-url",
    };

    const action: PageAction = {
      type: "SYNC_RECORDER",
      recorderStatus: "recorded",
      blobUrl: "blob:same-url",
      isPlaying: false,
      error: null,
    };

    const result = pageReducer(state, action);

    expect(result.title).toBe("My custom title");
  });

  it("SYNC_RECORDER is ignored during uploading", () => {
    const state: PageState = {
      ...initialPageState,
      status: "uploading",
      title: "Uploading clip",
    };

    const action: PageAction = {
      type: "SYNC_RECORDER",
      recorderStatus: "recorded",
      blobUrl: "blob:new-url",
      isPlaying: false,
      error: null,
    };

    const result = pageReducer(state, action);

    expect(result).toBe(state);
  });

  it("UPLOAD_START sets uploading status", () => {
    const state: PageState = {
      ...initialPageState,
      status: "recorded",
    };

    const result = pageReducer(state, { type: "UPLOAD_START" });

    expect(result.status).toBe("uploading");
  });

  it("UPLOAD_ERROR sets error status and message", () => {
    const state: PageState = {
      ...initialPageState,
      status: "uploading",
    };

    const result = pageReducer(state, {
      type: "UPLOAD_ERROR",
      error: "Network failed",
    });

    expect(result.status).toBe("error");
    expect(result.error).toBe("Network failed");
  });

  it("TOGGLE_FILTER toggles the correct filter", () => {
    const result = pageReducer(initialPageState, {
      type: "TOGGLE_FILTER",
      filterType: "gain",
    });

    const gainFilter = result.filters.find((f) => f.type === "gain");
    expect(gainFilter?.enabled).toBe(true);

    const otherFilters = result.filters.filter((f) => f.type !== "gain");
    for (const filter of otherFilters) {
      expect(filter.enabled).toBe(false);
    }
  });

  it("SET_PARAM updates the correct param", () => {
    const result = pageReducer(initialPageState, {
      type: "SET_PARAM",
      filterType: "gain",
      param: "gain",
      value: 2.5,
    });

    const gainFilter = result.filters.find((f) => f.type === "gain");
    expect(gainFilter?.params.gain).toBe(2.5);
  });

  it("RESET_PAGE returns initial state", () => {
    const state: PageState = {
      status: "error",
      title: "Some title",
      filters: initialPageState.filters.map((f) => ({
        ...f,
        enabled: true,
      })),
      error: "Something went wrong",
      recordingBlobUrl: "blob:some-url",
    };

    const result = pageReducer(state, { type: "RESET_PAGE" });

    expect(result).toEqual(initialPageState);
  });
});
