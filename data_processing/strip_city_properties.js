var io = require("indian-ocean"),
	s = require("strip-geojson-property");

var json = io.readDataSync("data_processing/bihar_cities.json");

Object.keys(json.features[0].properties).filter(p => p != "NAME").forEach(property => {
	s("data_processing/bihar_cities.json", property, "data_processing/bihar_cities.json");
});


