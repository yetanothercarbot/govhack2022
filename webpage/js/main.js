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

var mapMain;
const defaultProj = "EPSG:3857";

proj4.defs("EPSG:3577","+proj=aea +lat_0=0 +lon_0=132 +lat_1=-18 +lat_2=-36 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=61.55,-10.87,-40.19,-39.4924,-32.7221,-32.8979,-9.99400000001316 +units=m +no_defs +type=crs");
proj4.defs("EPSG:9822","+proj=lcc +lat_0=42 +lon_0=3 +lat_1=41.25 +lat_2=42.75 +x_0=1700000 +y_0=1200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);

const image = new CircleStyle({
    radius: 5,
    fill: null,
    stroke: new Stroke({ color: 'red', width: 1 }),
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

function addGeoJSONlayer(url, layerName = "GeoJSON-Layer", sourceProjection = defaultProj) {
    // Fetch the GeoJSON data from the server
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            var data = JSON.parse(xhttp.responseText);
            var vectorSource = new VectorSource({
                features: new GeoJSON().readFeatures(data, {
                    dataProjection: sourceProjection,
                    featureProjection: defaultProj
                }),
            });

            var newGeoJSONLayer = new VectorLayer({
                source: vectorSource,
                style: styleFunction,
            });
            newGeoJSONLayer.set("name", layerName);
            mapMain.addLayer(newGeoJSONLayer);
        } else if (xhttp.readyState == 4 && xhttp.status == 404) {
            console.error("Received 404 whilst trying to fetch GeoJSON!");
            // shaaaaaaaaame shaaaaaaaaaaaaaaaaaaaaaame
        }
    }
    xhttp.open("GET", url);
    xhttp.send();
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
    addKMLlayer("data/flood-extent.kml", "flood");
    addGeoJSONlayer("/data/roads.geojson", "roads", "EPSG:4326");
    // Mix of EPSG:9822 and EPSG:3577 for some reason, thanks Qld Gov't!
    addGeoJSONlayer("/data/fire/SouthEastQueenslandRegion.geojson", "fire", "EPSG:3577");
    console.log(olProj.get("EPSG:9822"));
    /*
    // This could be useful if the loader overlay were less annoying than it currently is.
    mapMain.on("loadstart", function() {
        document.getElementById("loader-overlay").style.display = "initial";
    });
    */ 
    mapMain.on("loadend", function() {
        document.getElementById("loader-overlay").style.display = "none";
        var layers = mapMain.getAllLayers();
        for (var i = 0; i < layers.length; i++) {
            console.log(layers[i].get("name"));
        }
    });
}

setup();