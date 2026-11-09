import { Redirect } from "expo-router";
export default function Preview() {
  return <Redirect href={"/native" as import("expo-router").Href} />;
}
