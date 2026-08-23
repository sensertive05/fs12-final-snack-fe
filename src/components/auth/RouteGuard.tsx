"use client";

import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { ForbiddenPage } from "@/components/auth/ForbiddenPage";
import { Button } from "@/components/ui";
import {
  canAccessPath,
  isGuardExemptPath,
  isProtectedPath,
} from "@/constants/accessControl";
import { useMyProfile } from "@/hooks/queries/useMyProfile";
import { clearClientSession } from "@/hooks/useClientLogout";
import { getAccessToken } from "@/lib/authStorage";

type RouteGuardProps = {
  children: ReactNode;
};

/**
 * path 정책(accessControl) 기준 인증·인가 가드.
 * - 비보호/면제 경로: 통과
 * - 보호 + 비로그인: /login
 * - 보호 + 권한 없음: URL 유지 + ForbiddenPage (GNB는 layout AppHeader)
 * - users/me 401: 세션·캐시 정리 후 /login
 * - users/me 일반 오류(5xx/네트워크): redirect 없이 재시도 UI
 * profile 로딩 중에는 children을 렌더하지 않아 권한 페이지 flash를 막습니다.
 */
export const RouteGuard = ({ children }: RouteGuardProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasToken = Boolean(getAccessToken());
  const protectedPath = isProtectedPath(pathname);
  const exemptPath = isGuardExemptPath(pathname);

  const { data: profile, isPending, isError, error, refetch, isFetching } =
    useMyProfile();

  const isUnauthorized =
    isError &&
    axios.isAxiosError(error) &&
    error.response?.status === 401;

  useEffect(() => {
    if (exemptPath || !protectedPath) {
      return;
    }

    if (!hasToken) {
      router.replace("/login");
      return;
    }

    if (isPending) {
      return;
    }

    if (isUnauthorized) {
      void clearClientSession(queryClient).then(() => {
        router.replace("/login");
      });
    }

    // 권한 없음·5xx/네트워크 오류: URL 유지, 아래 render에서 fallback UI
  }, [
    exemptPath,
    protectedPath,
    hasToken,
    isPending,
    isUnauthorized,
    router,
    queryClient,
  ]);

  if (exemptPath || !protectedPath) {
    return children;
  }

  if (!hasToken) {
    return null;
  }

  if (isPending) {
    return null;
  }

  if (isUnauthorized) {
    return null;
  }

  if (isError) {
    return (
      <main className="flex min-h-[calc(100vh-54px)] w-full flex-col items-center justify-center gap-3 bg-surface-muted px-6 md:min-h-[calc(100vh-64px)] xl:min-h-[calc(100vh-88px)]">
        <p className="m-0 text-center text-base text-snack-black-100">
          사용자 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <Button
          type="button"
          variant="outline"
          size="compact"
          disabled={isFetching}
          onClick={() => {
            void refetch();
          }}
        >
          다시 시도
        </Button>
      </main>
    );
  }

  const role = profile?.role;
  if (!role || !canAccessPath(pathname, role)) {
    return <ForbiddenPage />;
  }

  return children;
};
