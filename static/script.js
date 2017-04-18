/* global L Vue axios */
(function iife() {
  const myMap = L.map("map").setView([38, -98], 4);
  L.hash(myMap); // enable hashed location

  const COLOR_MAP = {
    BLM: "#66c2a5",
    BOR: "#fc8d62",
    DOD: "#8da0cb",
    FS: "#e78ac3",
    FWS: "#a6d854",
    NPS: "#ffd92f",
    OTHER: "#dddddd",
    TVA: "#e5c494",
    DEFAULT: "#dddddd"
  };

  const AGENCY_KEY = "AGBUR";
  const MIN_ZOOM = 6;

  L.tileLayer(
    "https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png",
    {
      maxZoom: 18,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>'
    }
  ).addTo(myMap);

  const labelLayer = L.tileLayer(
    "https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_only_labels/{z}/{x}/{y}.png",
    {
      maxZoom: 18
    }
  ).addTo(myMap);

  function isPastMinZoom() {
    return myMap.getZoom() >= MIN_ZOOM;
  }

  let fedLandsLayer = null;

  const app = new Vue({
    el: "#app",
    data: {
      currentAgencies: null,
      isLoading: false,
      COLOR_MAP,
      isPastMinZoom: isPastMinZoom()
    }
  });

  function clearFedLayersLayer() {
    if (fedLandsLayer && myMap.hasLayer(fedLandsLayer)) {
      myMap.removeLayer(fedLandsLayer);
      fedLandsLayer = null;
    }
  }

  function getFedLandFeatures() {
    clearFedLayersLayer();

    if (myMap.getZoom() < MIN_ZOOM) {
      app.isLoading = false;
      app.currentAgencies = null;
      console.log("Too zoomed out, not getting features");
      return;
    }

    app.isLoading = true;

    axios
      .get(`/api/features?bbox=[${myMap.getBounds().toBBoxString()}]`)
      .then(({ data }) => {
        app.isLoading = false;

        if (!data.features.length) {
          console.log("Hrm, no features returned.");
        } else {
          console.log(`Adding ${data.features.length} features to map.`);

          // Get unique agencies represented in the returned data
          const agencies = data.features
            .map(f => f.properties[AGENCY_KEY])
            .filter(
              (val, idx, self) => self.indexOf(val) === idx && val !== null
            )
            .sort();

          app.currentAgencies = agencies;

          fedLandsLayer = L.vectorGrid
            .slicer(data, {
              rendererFactory: L.svg.tile,
              vectorTileLayerStyles: {
                sliced: properties => ({
                  fillColor: COLOR_MAP[properties[AGENCY_KEY]] ||
                    COLOR_MAP.DEFAULT,
                  fillOpacity: 0.8,
                  fill: true,
                  stroke: false
                })
              },
              interactive: true
            })
            .on("click", e => {
              const properties = e.layer.properties;
              L.popup({ autoPan: false })
                .setContent(properties.AGBUR || "No agency")
                .setLatLng(e.latlng)
                .openOn(myMap);
            });
          myMap.addLayer(fedLandsLayer);
          labelLayer.bringToFront();
        }
      });
  }

  function updateZoom() {
    app.isPastMinZoom = isPastMinZoom();
  }

  myMap.on("moveend", getFedLandFeatures);
  myMap.on("zoomend", updateZoom);
})();
