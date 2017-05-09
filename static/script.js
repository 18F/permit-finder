/* global L Vue axios */
(function iife() {
  

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

  // create the tile layer with correct attribution

  var hotLayer = new L.tileLayer('http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', 
  	{
  		maxZoom: 20, 
  		attribution: 'Data \u00a9 <a href="http://www.openstreetmap.org/copyright"> OpenStreetMap Contributors </a> Tiles \u00a9 HOT'
  	}),
  darkmatterLayer = L.tileLayer(
    "https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png",
    {
      maxZoom: 18,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>'
    });

  
  var myMap = L.map("map",
  {
  	center: [38, -98],
  	zoom: 4,
  	layers: [hotLayer, darkmatterLayer] //multiple layers by default
  });
  L.hash(myMap); // enable hashed location

  var baseLayers = {
  	"hotLayer": hotLayer,
  	"darkmatterLayer": darkmatterLayer
  };
  var controlLayers = L.control.layers(baseLayers).addTo(myMap);
  
  //myMap.setView(new L.LatLng(51.3, 0.7),9);
  //myMap.addLayer(tilelayer);

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
          fedLandsLayer.bringToFront();
          
        }
      });
  }

  function updateZoom() {
    app.isPastMinZoom = isPastMinZoom();
  }
  
  myMap.on("moveend", getFedLandFeatures);
  myMap.on("zoomend", updateZoom);
  
})();
