import { CommonImage } from "@/components/ui/CommonImage";

/**
 * 권한 부족(403) 안내.
 * GNB(AppHeader) 아래에 표시 — not-found의 fixed overlay 패턴을 쓰지 않습니다.
 */
export function ForbiddenPage() {
  return (
    <main className="flex min-h-[calc(100vh-54px)] w-full items-center justify-center bg-surface-muted px-6 md:min-h-[calc(100vh-64px)] xl:min-h-[calc(100vh-88px)]">
      <section
        aria-labelledby="forbidden-title"
        className="flex flex-col items-center gap-6 text-center xl:gap-10"
      >
        <div className="flex h-[130px] w-[180px] items-center justify-center xl:h-[200px] xl:w-[280px]">
          <picture>
            <source
              media="(min-width: 1280px)"
              srcSet="/images/common/empty-purchase-md.svg"
            />
            <CommonImage
              name="empty-purchase"
              size="sm"
              className="block h-auto w-[180px] xl:w-[280px]"
            />
          </picture>
        </div>

        <div className="flex w-full flex-col items-center gap-2.5 xl:gap-6">
          <h1
            id="forbidden-title"
            className="m-0 text-lg leading-[26px] font-semibold text-snack-gray-500 xl:text-2xl xl:leading-8"
          >
            권한이 없습니다
          </h1>
          <p className="m-0 text-sm leading-6 font-medium text-snack-gray-400 xl:text-xl xl:leading-8">
            이 페이지에 접근할 수 있는 권한이 없어요.
          </p>
        </div>
      </section>
    </main>
  );
}
