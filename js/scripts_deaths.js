var width = window.innerWidth, height = window.innerHeight;

var projection = d3.geoMercator();

var path = d3.geoPath()
    .projection(projection)
    .pointRadius(2);

var svg = d3.select(".map-wrapper.district-deaths .map").append("svg")
    .attr("width", width)
    .attr("height", height);

var g = svg.append("g");

d3.queue()
	.defer(d3.json, "data/bihar_district.json")
	.defer(d3.json, "data/states.json")
  .defer(d3.json, "data/bihar_cities.json")
  .defer(d3.json, "data/states_labels.json")
  .defer(d3.csv, "data/deaths.csv")
	.await(ready)

function ready(error, district, state, city, state_label, deaths){
  
  // centerZoom(district);
  
  // drawSubUnits(state, "state");

  // centerZoom(district);
  // drawSubUnits(district, "district");
  // var boundary = centerZoom(district);
  // drawOuterBoundary(district, boundary);
  
  // drawPlaces(city, "city");
  // drawPlaces(state_label, "state-label");

  // var buckets = calculate_buckets(deaths, "e", 7, "cumulative_rainfall");

}

// This function "centers" and "zooms" a map by setting its projection's scale and translate according to its outer boundary
// It also returns the boundary itself in case you want to draw it to the map
function centerZoom(data){
  var o = topojson.mesh(data, data.objects.polygons, function(a, b) { return a === b; });

  projection
      .scale(1)
      .translate([0, 0]);

  var b = path.bounds(o),
      s = 1 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
      t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

  projection
      .scale(s)
      .translate(t);

  return o;
}

function drawOuterBoundary(data, boundary){
  g.append("path")
      .datum(boundary)
      .attr("d", path)
      .attr("class", "subunit-boundary");
}

function drawPlaces(data, cl){

  if (cl == "state-label") path.pointRadius(0);

  svg.append("path")
      .datum(topojson.feature(data, data.objects.places))
      .attr("d", path)
      .attr("class", "place");

  svg.selectAll(".place-label ." + cl)
      .data(topojson.feature(data, data.objects.places).features)
    .enter().append("text")
      .attr("class", "place-label " + cl)
      .attr("transform", function(d) { return "translate(" + projection(d.geometry.coordinates) + ")"; })
      .attr("dy", -6)
      .attr("x", 0)
      .style("text-anchor", "middle")
      .text(function(d) { return d.properties.NAME; });
}

function drawSubUnits(data, cl){
  g.selectAll(".subunit." + cl)
      .data(topojson.feature(data, data.objects.polygons).features)
    .enter().append("path")
      .attr("class", "subunit " + cl)
      .attr("d", path);
}

