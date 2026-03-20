import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import HomePage from "./page";

describe("HomePage", () => {
  it("redirects to /soundboards", () => {
    HomePage();

    expect(redirect).toHaveBeenCalledWith("/soundboards");
  });
});
