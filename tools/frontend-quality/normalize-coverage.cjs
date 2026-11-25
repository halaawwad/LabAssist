const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "../..");
for (const folder of [
  "frontend/student",
  "frontend/supervisor",
  "frontend/workshop",
  "tools/frontend-quality",
]) {
  const file = path.join(root, folder, "coverage/lcov.info");
  let data = fs.readFileSync(file, "utf8");
  data = data.replace(/^SF:([^\r\n]+)$/gm, (_line, source) => {
    const absolute = path.resolve(
      folder === "tools/frontend-quality" ? root : path.join(root, folder),
      source.replaceAll("\\", "/"),
    );
    const relative = path.relative(root, absolute).replaceAll("\\", "/");
    if (relative.startsWith("../") || path.isAbsolute(relative))
      throw Error("Coverage source escapes repository");
    return "SF:" + relative;
  });
  fs.writeFileSync(path.join(root, folder, "coverage/lcov-sonar.info"), data);
  console.log("Normalized coverage: " + folder);
}
