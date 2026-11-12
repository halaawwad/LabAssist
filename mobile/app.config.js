/* global __dirname */
const fs = require("node:fs");
const path = require("node:path");

module.exports = ({ config }) => {
  if (process.env.LABASSIST_SHARED_PREVIEW !== "1") return config;
  const file = path.join(__dirname, ".expo", "shared-portals.json");
  if (!fs.existsSync(file)) throw new Error("Start the portal tunnels before shared preview.");
  const sharedPortals = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const portal of ["student", "supervisor", "workshop"]) {
    if (!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(sharedPortals[portal]))
      throw new Error("Invalid shared preview URL for " + portal);
  }
  return { ...config, extra: { ...config.extra, sharedPortals } };
};
