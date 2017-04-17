const Hapi = require("hapi");
const inert = require("inert");
const R = require("ramda");
const turf = require("@turf/turf");

// TODO:
// - only install turf packages that are actually used (or maybe get rid?)
// - eslint-prettier
// - make simple map front end where you can draw bbox and get list of intersecting lands

const tree = require("./tree");

const server = new Hapi.Server();

function toBboxFeature(bboxString = "") {
  const parts = bboxString.split(",");
  if (!parts.length || !parts.length === 4) {
    return null;
  }

  return turf.bboxPolygon(parts);
}

server.connection({
  // Using 'localhost' when developing is necessary to prevent the OSX
  // firewall from asking to to allow the app every time it is restarted
  host: process.env.VCAP_APPLICATION ? "0.0.0.0" : "localhost",
  port: process.env.PORT || 8000
});

server.register(inert, err => {
  if (err) {
    throw err;
  }

  server.route({
    method: "GET",
    path: "/static/{param*}",
    handler: {
      directory: {
        path: "static"
      }
    }
  });

  server.route({
    method: "GET",
    path: "/api/agencies",
    handler: function(request, reply) {
      const bbox = toBboxFeature(request.query.bbox);

      if (!bbox) {
        return reply([]);
      }

      // TODO: This isn't working correctly for some reason
      // sometimes areas that should definitely have features
      // have none. Same for the /features/ method.

      const intersectingFedLands = tree.search(bbox);

      const notNull = R.compose(R.not, R.equals(null));
      const getAGBUR = R.compose(R.prop("properties"), R.pluck("AGBUR"));

      const agencies = R.compose(R.uniq, R.filter(notNull), R.map(getAGBUR))(
        intersectingFedLands.features
      );

      return reply(agencies);
    }
  });

  server.route({
    method: "GET",
    path: "/api/features",
    handler: function(request, reply) {
      if (!request.query.bbox) {
        return reply({});
      }

      const bbox = toBboxFeature(request.query.bbox);
      const intersectingFedLands = tree.search(bbox);
      console.log(
        `Found ${intersectingFedLands.features.length} intersecting features`
      );
      return reply(intersectingFedLands);
    }
  });

  server.route({
    method: "GET",
    path: "/",
    handler: {
      file: {
        path: "static/index.html"
      }
    }
  });
});

server.start(err => {
  if (err) {
    throw err;
  }
  console.log("Server running at:", server.info.uri);
});
