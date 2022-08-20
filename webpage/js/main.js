import '../css/style.css';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    })
  ],
  view: new View({
    center: [16305945.73750275, -2206013.7191165173],
    zoom: 7,
    minZoom: 6, 
    extent: [15523987.351939877, -3234740.7746837423, 17196894.49780245, -1255714.7470971544],
    constrainOnlyCenter: true
  })
});
