import { describe, expect, it } from "vitest";
import { changePasswordSchema, profileSchema } from "../server/validation";

describe("account updates", () => {
  it("accepts a cropped JPEG and rejects other image data", () => {
    expect(
      profileSchema.parse({
        name: "  Uma Joshi  ",
        avatarDataUrl: "data:image/jpeg;base64,/9j/",
      }),
    ).toEqual({
      name: "Uma Joshi",
      avatarDataUrl: "data:image/jpeg;base64,/9j/",
    });
    expect(
      profileSchema.safeParse({
        name: "Uma",
        avatarDataUrl: "data:image/svg+xml;base64,PHN2Zz4=",
      }).success,
    ).toBe(false);
  });

  it("requires the current password and a long enough replacement", () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "",
        newPassword: "new-password-123",
      }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "old-password",
        newPassword: "short",
      }).success,
    ).toBe(false);
  });
});
