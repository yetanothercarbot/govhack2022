import '../css/style.css';
import {Map, View} from 'ol';
import KML from 'ol/format/KML';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import Circle from 'ol/geom/Circle';
import Feature from 'ol/Feature';
import OSM from 'ol/source/OSM';
import {fromLonLat} from 'ol/proj';


const image = new CircleStyle({
  radius: 5,
  fill: null,
  stroke: new Stroke({color: 'red', width: 1}),
});

const styles = {
  'Point': new Style({
    image: image,
  }),
  'LineString': new Style({
    stroke: new Stroke({
      color: 'green',
      width: 1,
    }),
  }),
  'MultiLineString': new Style({
    stroke: new Stroke({
      color: 'green',
      width: 1,
    }),
  }),
  'MultiPoint': new Style({
    image: image,
  }),
  'MultiPolygon': new Style({
    stroke: new Stroke({
      color: 'yellow',
      width: 1,
    }),
    fill: new Fill({
      color: 'rgba(255, 255, 0, 0.1)',
    }),
  }),
  'Polygon': new Style({
    stroke: new Stroke({
      color: 'blue',
      lineDash: [4],
      width: 3,
    }),
    fill: new Fill({
      color: 'rgba(0, 0, 255, 0.1)',
    }),
  }),
  'GeometryCollection': new Style({
    stroke: new Stroke({
      color: 'magenta',
      width: 2,
    }),
    fill: new Fill({
      color: 'magenta',
    }),
    image: new CircleStyle({
      radius: 10,
      fill: null,
      stroke: new Stroke({
        color: 'magenta',
      }),
    }),
  }),
  'Circle': new Style({
    stroke: new Stroke({
      color: 'red',
      width: 2,
    }),
    fill: new Fill({
      color: 'rgba(255,0,0,0.2)',
    }),
  }),
};

const styleFunction = function (feature) {
  return styles[feature.getGeometry().getType()];
};

function parseData(data) {
  // Start off by drawing truck routes

  // Convert the projection in the GeoJSON file
  var n = 0;
  for (var i = 0; i < data.features.length; i++) {
    for (var j = 0; j < data.features[i].geometry.coordinates.length; j++) {
      data.features[i].geometry.coordinates[j] = fromLonLat(data.features[i].geometry.coordinates[j]);
      n++;
    }
  }
  console.log(n);

  const vectorSource = new VectorSource({
    features: new GeoJSON().readFeatures(data),
  });
  
  vectorSource.addFeature(new Feature(new Circle([16305945.73750275, -2206013.7191165173], 1e3)));

  const roadsGeoJSONLayer = new VectorLayer({
    source: vectorSource,
    style: styleFunction,
  });  

  const map = new Map({
    target: 'map',
    layers: [
      new TileLayer({
        source: new OSM()
      }),
      roadsGeoJSONLayer
    ],
    view: new View({
      center: [16305945.73750275, -2206013.7191165173],
      zoom: 6.1,
      minZoom: 6, 
      extent: [15523987.351939877, -3234740.7746837423, 17196894.49780245, -1255714.7470971544],
      constrainOnlyCenter: true
    })
  });
}

function setup() {
  M.AutoInit();

  const roadsData = new VectorLayer({
    source: new VectorSource({
      url: 'data/doc.kml',
      format: new KML(),
    }),
  });

  // Fetch the GeoJSON data from the server
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      parseData(JSON.parse(xhttp.responseText));
    } else if (xhttp.readyState == 4 && xhttp.status == 404) {
      // shaaaaaaaaame shaaaaaaaaaaaaaaaaaaaaaame
    }
  }
  xhttp.open("GET", "/data/roads.geojson");
  xhttp.send();
  
}

setup();