var day_val = 1,
  delay = 250;

// responsiveness
var ww = $(window).width(),
  resp = {};
if (ww <= 768){
  // mobile
  resp.height = 250;
  resp.circleMax = 10;
  resp.ldh = 25;
  resp.ldw = 75;
  resp.ldny =  function(d){ return circle_scale(d * 2) + 5; }
} else {
  resp.height = 600;
  resp.circleMax = 20;
  resp.ldh = 45;
  resp.ldw = 94;
  resp.ldny =  function(d){ return circle_scale(d * 2) + 2; }
}

var width = $(".map-wrapper.blocks-rainfall .map").width(), height = resp.height;

var projection = d3.geoMercator();

var path = d3.geoPath()
    .projection(projection)
    .pointRadius(2);

var svg = d3.select(".map-wrapper.blocks-rainfall .map").append("svg")
    .attr("width", width)
    .attr("height", height);

var legend_height = 22,
  legend_bar_height = 10,
  legend_margin = {left: 5, right: 5};
  legend_width = d3.min([320 - legend_margin.left - legend_margin.right, window.innerWidth - 20]);

var legend_x = d3.scaleLinear()
  .range([0, legend_width]);

var legend = d3.select(".map-wrapper.blocks-rainfall .legend-cumulative").append("svg")
    .attr("width", legend_width + legend_margin.left + legend_margin.right)
    .attr("height", legend_height)
  .append("g")
    .attr("transform", "translate(" + legend_margin.left + ", 0)");

var legend_daily_width = resp.ldw,
  legend_daily_height = resp.ldh;

var legend_daily = d3.select(".map-wrapper.blocks-rainfall .legend-daily").append("svg")
    .attr("width", legend_daily_width)
    .attr("height", legend_daily_height);

var circle_scale = d3.scaleLinear()
  .range([0, resp.circleMax]);

var color_scheme = "YlGnBu";

d3.queue()
  .defer(d3.json, "data/bihar_block.json")
  .defer(d3.json, "data/states.json")
  .defer(d3.json, "data/bihar_cities.json")
  .defer(d3.csv, "data/rainfall.csv")
  .defer(d3.json, "data/states_labels.json")
  .await(ready);

function ready(error, bihar_block, state, city, rainfall, state_labels){

  var boundary = centerZoom(bihar_block);
  drawSubUnits(bihar_block, "block");
  drawOuterBoundary(bihar_block, boundary);

  drawSubUnits(state, "state");

  drawPlaces(city, "city");
  drawPlaces(state_labels, "state-label");

  // update rain circle scale domain. max is daily rainfall, variable "rainfall"
  circle_scale.domain([0, d3.max(rainfall, function(d){ return +d.rainfall })]);
  drawLegendDaily(rainfall);
  drawRain(bihar_block, filterData(rainfall, day_val));

  var buckets = [0, 150, 300, 450, 600, 750, d3.max(rainfall, function(d){ return +d.cumulative_rainfall; })]
  drawLegend(buckets, color_scheme, legend, legend_x, legend_width, legend_margin);
  
  colorSubUnits("block", filterData(rainfall, day_val), buckets, color_scheme, "cumulative_rainfall", "bl_cen_cd");

  interval();

  function interval(){
    
    if (day_val == 31){
      day_val = 1;
    } else {
      ++day_val;
    }

    if (day_val > 11 && day_val < 15){
      delay = 1000;
      $(".legend-date").addClass("red-text");
    } else {
      delay = 100;
      $(".legend-date").removeClass("red-text");
    }

    redraw();

    d3.timeout(interval, delay);
  }

  function redraw(){
    $(".blocks-rainfall .legend-wrapper .legend-date .day").html(day_val)
    colorSubUnits("block", filterData(rainfall, day_val), buckets, color_scheme, "cumulative_rainfall", "bl_cen_cd");
    drawRain(bihar_block, filterData(rainfall, day_val));
  }

  function resize(){

  }

}

function drawLegendDaily(data){

  var m = d3.max(data, function(d){ return +d.rainfall });

  var legend_data = [m, 100];

  var legend_circle = legend_daily.selectAll(".legend-circle")
      .data(legend_data)
    .enter().append("circle")
      .attr("class", "legend-circle")
      .attr("cy", function(d){ return circle_scale(d) + 1; })
      .attr("cx", circle_scale(m) + 1)
      .attr("r", function(d){ return circle_scale(d); });

  var legend_dotted_line = legend_daily.selectAll(".legend-dotted-line")
      .data(legend_data)
    .enter().append("line")
      .attr("class", "legend-dotted-line")
      .attr("x1", circle_scale(m) + 1)
      .attr("x2", circle_scale(m) * 2 + 10)
      .attr("y1", function(d){ return circle_scale(d * 2) + 1; })
      .attr("y2", function(d){ return circle_scale(d * 2) + 1; });

  var legend_daily_number = legend_daily.selectAll(".legend-daily-number")
      .data(legend_data)
    .enter().append("text")
      .attr("class", "legend-daily-number legend-number")
      .attr("x", circle_scale(m) * 2 + 10)
      .attr("y", resp.ldny)
      .text(function(d, i){ return d + (i == 1 ? " mm" : ""); });

}

function filterData(data, day){
  var cloned = JSON.parse(JSON.stringify(data))
  return cloned.filter(function(row){ return row.date.split(" ")[0] == day; });
}

function drawRain(map, data){

  // JOIN
  var rain_circle = svg.selectAll(".rain-circle")
      .data(topojson.feature(map, map.objects.polygons).features, function(d){ return d.properties.bl_cen_cd; });

  // UPDATE
  rain_circle
      .attr("r", calc_radius);

  // ENTER
  rain_circle.enter().append("circle")
      .attr("class", "rain-circle")
      .attr("cx", function(d){ return path.centroid(d)[0]; })
      .attr("cy", function(d){ return path.centroid(d)[1]; })
      .attr("r", calc_radius);
  
  function calc_radius(d){
    var lookup = data.filter(function(row){
      return row.bl_cen_cd == d.properties.bl_cen_cd;
    })[0];
    
    return circle_scale(lookup.rainfall); 
  }

}

