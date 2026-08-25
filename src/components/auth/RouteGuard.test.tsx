import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RouteGuard } from "@/components/auth/RouteGuard";
import { clearClientSession } from "@/hooks/useClientLogout";
import { useMyProfile } from "@/hooks/queries/useMyProfile";

const routerReplace = vi.fn();
let pathname = "/products";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace: routerReplace }),
}));

vi.mock("@/hooks/queries/useMyProfile", () => ({
  useMyProfile: vi.fn(),
}));

vi.mock("@/hooks/useClientLogout", () => ({
  clearClientSession: vi.fn().mockResolvedValue(undefined),
}));

const mockedUseMyProfile = vi.mocked(useMyProfile);
const mockedClearClientSession = vi.mocked(clearClientSession);

const ACCESS_TOKEN_KEY = "snack_access_token";

const renderGuard = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <RouteGuard>
        <div>protected-content</div>
      </RouteGuard>
    </QueryClientProvider>,
  );
};

const profileQueryResult = (
  overrides: Record<string, unknown>,
): ReturnType<typeof useMyProfile> =>
  ({
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
    ...overrides,
  }) as unknown as ReturnType<typeof useMyProfile>;

describe("RouteGuard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    routerReplace.mockClear();
    mockedClearClientSession.mockClear();
    pathname = "/products";
  });

  it("비로그인 상태로 보호 경로에 접근하면 /login으로 보낸다", async () => {
    mockedUseMyProfile.mockReturnValue(
      profileQueryResult({ isPending: true }),
    );

    renderGuard();

    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("protected-content")).not.toBeInTheDocument();
  });

  it("로그인했지만 권한이 없으면 ForbiddenPage를 보여준다", async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, "token");
    pathname = "/admin";
    mockedUseMyProfile.mockReturnValue(
      profileQueryResult({ data: { role: "USER" } as never }),
    );

    renderGuard();

    expect(await screen.findByText("권한이 없습니다")).toBeInTheDocument();
    expect(screen.queryByText("protected-content")).not.toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("권한이 있으면 원래 페이지를 그대로 렌더한다", async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, "token");
    pathname = "/products";
    mockedUseMyProfile.mockReturnValue(
      profileQueryResult({ data: { role: "USER" } as never }),
    );

    renderGuard();

    expect(await screen.findByText("protected-content")).toBeInTheDocument();
  });

  it("프로필 조회가 401이면 세션을 정리하고 /login으로 보낸다", async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, "token");
    mockedUseMyProfile.mockReturnValue(
      profileQueryResult({
        isError: true,
        error: {
          isAxiosError: true,
          response: { status: 401 },
        } as never,
      }),
    );

    renderGuard();

    await waitFor(() => {
      expect(mockedClearClientSession).toHaveBeenCalled();
      expect(routerReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("프로필 조회가 5xx/네트워크 오류면 재시도 UI를 보여준다", async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, "token");
    mockedUseMyProfile.mockReturnValue(
      profileQueryResult({
        isError: true,
        error: {
          isAxiosError: true,
          response: { status: 500 },
        } as never,
      }),
    );

    renderGuard();

    expect(
      await screen.findByText(
        "사용자 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
  });
});
