const Hapi = require("hapi");
const Joi = require("joi");
const Inert = require("inert");
const turf = require("@turf/turf");

const tree = require("./tree");

const server = new Hapi.Server();

server.connection({
  // Using 'localhost' when developing is necessary to prevent the OSX
  // firewall from asking to to allow the app every time it is restarted
  host: process.env.VCAP_APPLICATION ? "0.0.0.0" : "localhost",
  port: process.env.PORT || 8000
});

server.register(Inert, err => {
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
    path: "/api/features",
    config: {
      validate: {
        query: {
          bbox: Joi.array().length(4).items(Joi.number()).required()
        }
      }
    },
    handler: (request, reply) => {
      if (!request.query.bbox) {
        return reply({});
      }

      const bboxPoly = turf.bboxPolygon(request.query.bbox);

      const intersectingFedLands = tree.search(bboxPoly);
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
