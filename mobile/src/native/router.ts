import { router as expoRouter, useRouter as useExpoRouter, type Href } from "expo-router";
export * from "expo-router";
export function nativeHref(href: Href): Href {
  if (typeof href !== "string")
    return { ...href, pathname: nativeHref(href.pathname as Href) } as Href;
  if (href === "/") return "/native" as Href;
  if (/^\/(student|supervisor|workshop)(\/|$)/.test(href))
    return ("/native" + href.replace("/more/", "/")) as Href;
  return href;
}
function adapt(router: ReturnType<typeof useExpoRouter>) {
  return {
    ...router,
    push: (href: Href, ...options: Tail<Parameters<typeof router.push>>) =>
      router.push(nativeHref(href), ...options),
    replace: (href: Href, ...options: Tail<Parameters<typeof router.replace>>) =>
      router.replace(nativeHref(href), ...options),
    navigate: (href: Href, ...options: Tail<Parameters<typeof router.navigate>>) =>
      router.navigate(nativeHref(href), ...options),
  };
}
type Tail<T extends unknown[]> = T extends [unknown, ...infer Rest] ? Rest : never;
export const router = adapt(expoRouter);
export function useRouter() {
  return adapt(useExpoRouter());
}
