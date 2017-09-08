var start_year = 2000;

var width = window.innerWidth, height = 600;

var projection = d3.geoMercator();

var path = d3.geoPath()
    .projection(projection)
    .pointRadius(2);

var svg = d3.select(".map-wrapper.district-deaths .map").append("svg")
    .attr("width", width)
    .attr("height", height);

var legend_height = 22,
  legend_bar_height = 10,
  legend_margin = {left: 10, right: 10};
  legend_width = (width * .23) - legend_margin.left - legend_margin.right;  

var legend_x = d3.scaleLinear()
  .range([0, legend_width]);

var legend_deaths = d3.select(".map-wrapper.district-deaths .legend-cumulative").append("svg")
    .attr("width", legend_width + legend_margin.left + legend_margin.right)
    .attr("height", legend_height)
  .append("g")
    .attr("transform", "translate(" + legend_margin.left + ", 0)");

d3.queue()
	.defer(d3.json, "data/bihar_district.json")
	.defer(d3.json, "data/states.json")
  .defer(d3.json, "data/bihar_cities.json")
  .defer(d3.json, "data/states_labels.json")
  .defer(d3.csv, "data/deaths.csv")
	.await(ready)

function ready(error, district, state, city, state_label, deaths){
  
  centerZoom(district);
  
  drawSubUnits(state, "state");

  centerZoom(district);
  drawSubUnits(district, "district");
  var boundary = centerZoom(district);
  drawOuterBoundary(district, boundary);
  
  // drawPlaces(city, "city");
  drawPlaces(state_label, "state-label");

  // set up color scale with white as first color  
  var buckets = [0, 1, 10, 75, 150, 225, d3.max(deaths, function(d){ return +d.deaths; })]
  var color_scale = ["#fff","#fee5d9","#fcae91","#fb6a4a","#de2d26","#a50f15"],
    color_scheme = {warning: "custom", scale: color_scale};

  console.log(buckets)
  console.log(color_scale);
  redraw(2017);

  function redraw(start_year){
    $(".map-wrapper.district-deaths .legend-date").html(start_year);
    colorSubUnits("district", filterDeathData(deaths, start_year), buckets, color_scheme, "deaths", "dt_cen_cd");
  }

  drawLegend(buckets, color_scheme, legend_deaths, legend_x, legend_width, legend_margin)

}

function filterDeathData(data, year){
  var cloned = JSON.parse(JSON.stringify(data))
  return cloned.filter(function(row){ return row.year == year; });
}
