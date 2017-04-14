const fs = require("fs");
const path = require("path");

const rbush = require("geojson-rbush");
const turf = require("@turf/turf");

const FED_LANDS_FILE = path.join(
  "spatial_data",
  "out",
  "federal_lands.geojson"
);

const fedLands = JSON.parse(fs.readFileSync(FED_LANDS_FILE, "utf-8"));

const tree = rbush();

tree.load(fedLands);

module.exports = tree;
