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
import * as olProj from 'ol/proj';


var mapMain;

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

function addGeoJSONlayer(url, layerName = "GeoJSON-Layer", sourceProjection = "EPSG:3857") {
    // Fetch the GeoJSON data from the server
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            var data = JSON.parse(xhttp.responseText);
            // Convert the projection in the GeoJSON file if needed
            if (sourceProjection == "lonlat") { // TODO: Replace with proper projection method definition.
                var n = 0;
                for (var i = 0; i < data.features.length; i++) {
                    for (var j = 0; j < data.features[i].geometry.coordinates.length; j++) {
                        data.features[i].geometry.coordinates[j] = olProj.fromLonLat(data.features[i].geometry.coordinates[j]);
                        n++;
                    }
                }
                sourceProjection = "EPSG:3857"
                console.log(n);
            }

            var vectorSource = new VectorSource({
                features: new GeoJSON().readFeatures(data, {
                    dataProjection: sourceProjection,
                }),
            });


            var newGeoJSONLayer = new VectorLayer({
                source: vectorSource,
                style: styleFunction,
            });
            newGeoJSONLayer.set("name", layerName);
            mapMain.addLayer(newGeoJSONLayer);
        } else if (xhttp.readyState == 4 && xhttp.status == 404) {
            // shaaaaaaaaame shaaaaaaaaaaaaaaaaaaaaaame
        }
    }
    xhttp.open("GET", url);
    xhttp.send();
}

function setup() {
    M.AutoInit();

    setTimeout(mapSetup, 3000);
    
    
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
    // 
    addKMLlayer("data/flood-extent.kml", "flood");
    addGeoJSONlayer("/data/roads.geojson", "roads", "lonlat"); 
    addGeoJSONlayer("/data/fire/SouthEastQueenslandRegion.geojson", "fire", "ESPG:9822"); // ESPG:9822
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