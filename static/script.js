const map = L.map("map").setView([38, -98], 4);
new L.Hash(map);

window.map = map;

const COLOR_MAP = {
  BLM: "#66c2a5",
  BOR: "#fc8d62",
  DOD: "#8da0cb",
  FS: "#e78ac3",
  FWS: "#a6d854",
  NPS: "#ffd92f",
  OTHER: "#b3b3b3",
  TVA: "#e5c494",
  DEFAULT: "#dddddd"
};

L.tileLayer(
  "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
  {
    maxZoom: 18,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>'
  }
).addTo(map);

let fedLandsLayer = null;

var app = new Vue({
  el: "#app",
  data: {
    currentAgencies: null,
    isLoading: false,
    COLOR_MAP
  }
});

function getAgencies() {
  axios.get(`/api/agencies?bbox=${map.getBounds().toBBoxString()}`).then(({
    data
  }) => {
    currentAgencies = data;
    app.currentAgencies = data;
  });
}

function clearFedLayersLayer() {
  if (fedLandsLayer && map.hasLayer(fedLandsLayer)) {
    map.removeLayer(fedLandsLayer);
    fedLandsLayer = null;
  }
}

function getFedLandFeatures() {
  clearFedLayersLayer();

  if (map.getZoom() < 5) {
    console.log("Too zoomed out, not getting features");
  }

  app.isLoading = true;

  axios.get(`/api/features?bbox=${map.getBounds().toBBoxString()}`).then(({
    data
  }) => {
    console.log(data);
    app.isLoading = false;

    if (!data.features.length) {
      console.log("Hrm, no features returned.");
    } else {
      console.log(`Adding ${data.features.length} features to map.`);

      fedLandsLayer = L.vectorGrid
        .slicer(data, {
          rendererFactory: L.svg.tile,
          vectorTileLayerStyles: {
            sliced: properties => ({
              fillColor: COLOR_MAP[properties.AGBUR] || COLOR_MAP.DEFAULT,
              fillOpacity: 0.8,
              fill: true,
              stroke: false
            })
          },
          interactive: true
        })
        .on("click", e => {
          var properties = e.layer.properties;
          L.popup({ autoPan: false })
            .setContent(properties.AGBUR || "No agency")
            .setLatLng(e.latlng)
            .openOn(map);
        });
      map.addLayer(fedLandsLayer);
    }
  });
}

map.on("moveend", getAgencies);
map.on("moveend", getFedLandFeatures);
