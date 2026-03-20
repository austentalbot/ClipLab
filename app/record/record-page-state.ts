import {
  type FilterConfig,
  type FilterType,
  getDefaultFilters,
} from "@/lib/audio/filter-registry";
import { createClipTitle } from "@/lib/clips/format";

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
  | "error";

export type PageState = {
  status: PageStatus;
  title: string;
  filters: FilterConfig[];
  error: string | null;
  recordingBlobUrl: string | null;
};

export type PageAction =
  | {
      type: "SYNC_RECORDER";
      recorderStatus: RecorderStatus;
      blobUrl: string | null;
      isPlaying: boolean;
      error: string | null;
    }
  | { type: "TOGGLE_FILTER"; filterType: FilterType }
  | { type: "SET_PARAM"; filterType: FilterType; param: string; value: number }
  | { type: "SET_TITLE"; title: string }
  | { type: "UPLOAD_START" }
  | { type: "UPLOAD_ERROR"; error: string }
  | { type: "RESET_PAGE" };

export const initialPageState: PageState = {
  status: "idle",
  title: "",
  filters: getDefaultFilters(),
  error: null,
  recordingBlobUrl: null,
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
    case "SYNC_RECORDER": {
      if (state.status === "uploading") {
        return state;
      }

      const nextStatus = getPageStatus(action.recorderStatus, action.isPlaying);
      const shouldSeedTitle =
        action.blobUrl !== null && action.blobUrl !== state.recordingBlobUrl;

      return {
        ...state,
        status: nextStatus,
        title: shouldSeedTitle ? createClipTitle(new Date()) : state.title,
        error: action.error,
        recordingBlobUrl: action.blobUrl,
      };
    }
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
    case "SET_TITLE":
      return { ...state, title: action.title };
    case "UPLOAD_START":
      return { ...state, status: "uploading" };
    case "UPLOAD_ERROR":
      return { ...state, status: "error", error: action.error };
    case "RESET_PAGE":
      return initialPageState;
    default:
      return state;
  }
}
