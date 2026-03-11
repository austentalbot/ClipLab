import {
  type FilterConfig,
  type FilterType,
  getDefaultFilters,
} from "@/lib/audio/filter-registry";

export type RecorderStatus =
  | "idle"
  | "requesting-permission"
  | "recording"
  | "recorded"
  | "error";

export type PageStatus =
  | "idle"
  | "requesting-permission"
  | "recording"
  | "recorded"
  | "previewing"
  | "uploading"
  | "uploaded"
  | "error";

export type PageState = {
  status: PageStatus;
  filters: FilterConfig[];
  error: string | null;
  clipId: string | null;
};

export type PageAction =
  | {
      type: "SYNC_RECORDER";
      recorderStatus: RecorderStatus;
      isPlaying: boolean;
      error: string | null;
    }
  | { type: "TOGGLE_FILTER"; filterType: FilterType }
  | { type: "SET_PARAM"; filterType: FilterType; param: string; value: number }
  | { type: "UPLOAD_START" }
  | { type: "UPLOAD_SUCCESS"; clipId: string }
  | { type: "UPLOAD_ERROR"; error: string }
  | { type: "RESET_PAGE" };

export const initialPageState: PageState = {
  status: "idle",
  filters: getDefaultFilters(),
  error: null,
  clipId: null,
};

export function getPageStatus(
  recorderStatus: RecorderStatus,
  isPlaying: boolean
): PageStatus {
  if (recorderStatus === "error") return "error";
  if (recorderStatus === "recorded" && isPlaying) return "previewing";
  return recorderStatus;
}

export function pageReducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case "SYNC_RECORDER":
      return {
        ...state,
        status: getPageStatus(action.recorderStatus, action.isPlaying),
        error: action.error,
      };
    case "TOGGLE_FILTER":
      return {
        ...state,
        filters: state.filters.map((filter) =>
          filter.type === action.filterType
            ? { ...filter, enabled: !filter.enabled }
            : filter
        ),
      };
    case "SET_PARAM":
      return {
        ...state,
        filters: state.filters.map((filter) =>
          filter.type === action.filterType
            ? {
                ...filter,
                params: {
                  ...filter.params,
                  [action.param]: action.value,
                },
              }
            : filter
        ),
      };
    case "UPLOAD_START":
      return { ...state, status: "uploading" };
    case "UPLOAD_SUCCESS":
      return { ...state, status: "uploaded", clipId: action.clipId };
    case "UPLOAD_ERROR":
      return { ...state, status: "error", error: action.error };
    case "RESET_PAGE":
      return initialPageState;
    default:
      return state;
  }
}
