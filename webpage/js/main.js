import '../css/style.css';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import OSM from 'ol/source/OSM';

// roadsData = {};

function parseData(data) {
  // Start off by drawing truck routes
}

function setup() {
  // M.AutoInit();

  const map = new Map({
    target: 'map',
    layers: [
      new TileLayer({
        source: new OSM()
      })
    ],
    view: new View({
      center: [16305945.73750275, -2206013.7191165173],
      zoom: 6.1,
      minZoom: 6, 
      extent: [15523987.351939877, -3234740.7746837423, 17196894.49780245, -1255714.7470971544],
      constrainOnlyCenter: true
    })
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
}

setup();