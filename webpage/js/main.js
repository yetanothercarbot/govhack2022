import '../css/style.css';
import { Map, View } from 'ol';
import KML from 'ol/format/KML';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import Circle from 'ol/geom/Circle';
import Feature from 'ol/Feature';
import OSM from 'ol/source/OSM';
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import * as olProj from 'ol/proj';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import geojsonvt from 'geojson-vt';


var mapMain;
const defaultProj = "EPSG:3857";

proj4.defs("EPSG:3577","+proj=aea +lat_0=0 +lon_0=132 +lat_1=-18 +lat_2=-36 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=61.55,-10.87,-40.19,-39.4924,-32.7221,-32.8979,-9.99400000001316 +units=m +no_defs +type=crs");
proj4.defs("EPSG:9822","+proj=lcc +lat_0=42 +lon_0=3 +lat_1=41.25 +lat_2=42.75 +x_0=1700000 +y_0=1200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);

const image = new CircleStyle({
    radius: 3,
    fill: new Fill ({color:'rgba(0, 127, 0, 0.7)' }), //,
    stroke: null // new Stroke({ color: 'green', width: 1 }),
});

// Converts geojson-vt data to GeoJSON
// from OpenLayer example code: https://openlayers.org/en/latest/examples/geojson-vt.html
const replacer = function (key, value) {
    if (!value || !value.geometry) {
      return value;
    }

    let type;
    const rawType = value.type;
    let geometry = value.geometry;
    if (rawType === 1) {
      type = 'MultiPoint';
      if (geometry.length == 1) {
        type = 'Point';
        geometry = geometry[0];
      }
    } else if (rawType === 2) {
      type = 'MultiLineString';
      if (geometry.length == 1) {
        type = 'LineString';
        geometry = geometry[0];
      }
    } else if (rawType === 3) {
      type = 'Polygon';
      if (geometry.length > 1) {
        type = 'MultiPolygon';
        geometry = [geometry];
      }
    }

    return {
      'type': 'Feature',
      'geometry': {
        'type': type,
        'coordinates': geometry,
      },
      'properties': value.tags,
    };
  };

const fireStyle = {
    'MultiPolygon': new Style({
        stroke: new Stroke({
            color: 'red',
            width: 1,
        }),
        fill: new Fill({
            color: 'rgba(255, 0, 0, 0.1)',
        }),
    }),
};

const floodStyle = {
    'MultiPolygon': new Style({
        stroke: new Stroke({
            color: 'blue',
            width: 1,
        }),
        fill: new Fill({
            color: 'rgba(0, 0, 255, 0.7)',
        }),
    }),
    'Polygon': new Style({
        stroke: new Stroke({
            color: 'blue',
            width: 3,
        }),
        fill: new Fill({
            color: 'rgba(0, 0, 255, 0.7)',
        }),
    })
};

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
            color: 'red',
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

const floodStyleFunction = function (feature) {
    return floodStyle[feature.getGeometry().getType()];
};

const fireStyleFunction = function (feature) {
    return fireStyle[feature.getGeometry().getType()];
};

function updateLayers() {
    // Check which layers to show
    var showRoads = document.getElementById("roads-en").checked;
    var showFlood = document.getElementById("flooding-en").checked;
    var showFire = document.getElementById("fire-en").checked;

    var layers = mapMain.getAllLayers();
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].get("name") == "roads") {
            layers[i].setVisible(showRoads);
        }
        if (layers[i].get("name") == "flood") {
            layers[i].setVisible(showFlood);
        }
        if (layers[i].get("name") == "fire") {
            layers[i].setVisible(showFire);
        }
    }
}

function addKMLlayer(url, layerName = "KML-Layer") {
    const dataSource = new VectorLayer({
        source: new VectorSource({
            url: url,
            format: new KML(),
        }),
    });
    dataSource.set("name", layerName);
    mapMain.addLayer(dataSource);
}

function addGeoJSONlayer(url, layerName = "GeoJSON-Layer", styling = styleFunction, post_data = null) {

    // Fetch the GeoJSON data from the server
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            var json = JSON.parse(xhttp.responseText);
            var layer = new VectorTileLayer({
                background: 'rgba(0,0,0,0)',
                style: styling,
            });
            var tileIndex = geojsonvt(json, {
                extent: 4096,
                debug: 1,
            });
            var format = new GeoJSON({
                // Data returned from geojson-vt is in tile pixel units
                dataProjection: new olProj.Projection({
                    code: 'TILE_PIXELS',
                    units: 'tile-pixels',
                    extent: [0, 0, 4096, 4096],
                }),
            });
            var vectorSource = new VectorTileSource({
                tileUrlFunction: function (tileCoord) {
                    // Use the tile coordinate as a pseudo URL for caching purposes
                    return JSON.stringify(tileCoord);
                },
                tileLoadFunction: function (tile, url) {
                    var tileCoord = JSON.parse(url);
                    var data = tileIndex.getTile(
                        tileCoord[0],
                        tileCoord[1],
                        tileCoord[2]
                    );
                    var geojson = JSON.stringify(
                        {
                            type: 'FeatureCollection',
                            features: data ? data.features : [],
                        },
                        replacer
                    );
                    var features = format.readFeatures(geojson, {
                        extent: vectorSource.getTileGrid().getTileCoordExtent(tileCoord),
                        featureProjection: defaultProj,
                    });
                    tile.setFeatures(features);
                },
            });
            layer.setSource(vectorSource);
            layer.set("name", layerName);
            mapMain.addLayer(layer);
        } else if (xhttp.readyState == 4 && xhttp.status == 404) {
            console.error("Received 404 whilst trying to fetch GeoJSON!");
            // shaaaaaaaaame shaaaaaaaaaaaaaaaaaaaaaame
        }
    }

    if (post_data) {
        xhttp.open("POST", url);
        xhttp.send(post_data);
    } else {
        xhttp.open("GET", url);
        xhttp.send();
    }
}

function setup() {
    M.AutoInit();

    setTimeout(mapSetup, 1000);

    document.getElementById("update-map").addEventListener("pointerup", updateLayers);
}

function mapSetup() {
    mapMain = new Map({
        target: 'map',
        layers: [
            new TileLayer({
                source: new OSM()
            })
        ],
        view: new View({
            center: [16305945.73750275, -2206013.7191165173],
            zoom: 6.1,
            // minZoom: 6,
            // extent: [15523987.351939877, -3234740.7746837423, 17196894.49780245, -1255714.7470971544],
            constrainOnlyCenter: true
        })
    });
    addGeoJSONlayer("/data/flood-simplified.geojson", "flood", floodStyleFunction);
    loadroads()
    // Mix of EPSG:9822 and EPSG:3577 for some reason, thanks Qld Gov't!
    // Converted to EPSG:4326
    addGeoJSONlayer("/data/fire/DarlingDownsRegion.geojson", "fire");
    addGeoJSONlayer("/data/fire/CentralQueenslandRegion.geojson", "fire");

    addGeoJSONlayer("/data/rest_stops.json", "rest_stops");

    
    // This could be useful if the loader overlay were less annoying than it currently is.
    mapMain.on("loadstart", function() {
        document.getElementById("loader-overlay").style.display = "initial";
    });
    mapMain.on("loadend", function() {
        document.getElementById("loader-overlay").style.display = "none";
        updateLayers();
    });
}

function loadroads() {
    setTimeout(function() {
        mapMain.once('moveend', function() {
            loadroads();
        })
    }, 500);

    mapMain.getLayers().getArray()
      .filter(layer => layer.get('name') === "roads")
      .forEach(layer => mapMain.removeLayer(layer));

    var requestBody = {};
    var boundingBox = mapMain.getView().calculateExtent(mapMain.getSize());
    requestBody.corner1 = olProj.toLonLat(boundingBox.slice(0,2));
    requestBody.corner2 = olProj.toLonLat(boundingBox.slice(2,4));

    addGeoJSONlayer("http://api.freightrelocate.xyz/list_roads", "roads", styleFunction, JSON.stringify(requestBody))
}

setup();
