var width = window.innerWidth, height = 600;

var projection = d3.geoMercator();

var path = d3.geoPath()
    .projection(projection)
    .pointRadius(2);

var svg = d3.select(".map-wrapper .map").append("svg")
    .attr("width", width)
    .attr("height", height);

var legend_height = 22,
  legend_bar_height = 10,
  legend_margin = {left: 5, right: 5};
  legend_width = (width * .23) - legend_margin.left - legend_margin.right;  

var legend = d3.select(".map-wrapper .legend-cumulative").append("svg")
    .attr("width", legend_width + legend_margin.left + legend_margin.right)
    .attr("height", legend_height)
  .append("g")
    .attr("transform", "translate(" + legend_margin.left + ", 0)")

var legend_x = d3.scaleLinear()
  .range([0, legend_width]);

var legend_daily_width = 83,
  legend_daily_height = 35;

var legend_daily = d3.select(".map-wrapper .legend-daily").append("svg")
    .attr("width", legend_daily_width)
    .attr("height", legend_daily_height);

var circle_scale = d3.scaleLinear()
  .range([0, 15]);

var color_scheme = "YlGnBu";

d3.queue()
  .defer(d3.json, "data/bihar_block.json")
  .defer(d3.json, "data/states.json")
  .defer(d3.json, "data/bihar_cities.json")
  .defer(d3.csv, "data/rainfall.csv")
  .await(ready);

function ready(error, bihar_block, state, city, rainfall){
  
  var boundary = centerZoom(bihar_block);
  drawSubUnits(bihar_block, "block");
  drawOuterBoundary(bihar_block, boundary);

  drawSubUnits(state, "state");

  drawPlaces(city);

  var day_val = 1;

  // update rain circle scale domain. max is daily rainfall, variable "rainfall"
  circle_scale.domain([0, d3.max(rainfall, function(d){ return +d.rainfall })]);
  drawLegendDaily(rainfall);
  drawRain(bihar_block, filterData(rainfall, day_val));

  // var buckets = calculate_buckets(rainfall, "e", 7, "cumulative_rainfall");
  var buckets = [0, 150, 300, 450, 600, 750, d3.max(rainfall, function(d){ return +d.cumulative_rainfall; })]
  drawLegend(buckets, color_scheme);
  
  colorSubUnits("block", filterData(rainfall, day_val), buckets, color_scheme, "cumulative_rainfall", "bl_cen_cd");

  var delay = 500;

  d3.interval(function(){
    if (day_val == 31){
      day_val = 1;
    } else{
      ++day_val;
    }

    if (day_val > 10 && day_val < 20){
      delay = 1000;
    } else {
      delay = 500;
    }

    redraw();
  }, delay);

  function redraw(){
    $(".legend-wrapper .legend-date .day").html(day_val)
    colorSubUnits("block", filterData(rainfall, day_val), buckets, color_scheme, "cumulative_rainfall", "bl_cen_cd");
    drawRain(bihar_block, filterData(rainfall, day_val));
  }

}

function drawLegendDaily(data){

  var m = d3.max(data, function(d){ return +d.rainfall });

  var legend_data = [100, m];

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
      .attr("y", function(d){ return circle_scale(d * 2) + 2; })
      .text(function(d, i){ return d + (i == 1 ? " mm" : ""); });

}

function drawLegend(buckets, colorScheme){

  // get data ready
  var arr = [];
  buckets.forEach(function(d, i){

    if (i != 0){
      var obj = {};
      obj.bucket = i;
      obj.x = buckets[i - 1];
      obj.width = i == buckets.length - 1 ? buckets[i - 1] - buckets[i - 2] : d - obj.x;
      obj.color = colors[colorScheme][buckets.length][i - 1];
      arr.push(obj);
    }
    
  });
  buckets = arr;

  // update legendX domain
  legend_x.domain([buckets[0].x, buckets[buckets.length - 1].x + buckets[buckets.length - 1].width]);

  // JOIN
  var legendRect = legend.selectAll(".legend-rect")
      .data(buckets, function(d){ return d.bucket; })
    .enter().append("rect")
      .attr("class", "legend-rect")
      .attr("y", 0)
      .attr("height", legend_bar_height)
      .attr("x", function(d){ return legend_x(d.x); })
      .attr("fill", function(d){ return d.color })
      .attr("width", function(d){ return legend_x(d.x + d.width); });
  
  var legendNumber = legend.selectAll(".legend-cumulative-number")
      .data(buckets, function(d){ return d.bucket; })
    .enter().append("text")
      .attr("class", "legend-cumulative-number legend-number")
      .attr("y", legend_height)
      .attr("x", function(d){ return legend_x(d.x); })
      .style("text-anchor", "middle")
      .text(function(d, i, data){ return d.x + (i == data.length - 1 ? "+ mm" : ""); });

}

function filterData(data, day){
  var cloned = JSON.parse(JSON.stringify(data))
  return cloned.filter(function(row){ return row.date.split(" ")[0] == day; });
}

function drawRain(map, data){

  // JOIN
  var rain_circle = svg.selectAll(".rain-circle")
      .data(topojson.feature(map, map.objects.polygons).features, function(d){ return d.properties.bl_cen_cd; });

  // EXIT


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

    // if (d.properties.block == "Araria") console.log(lookup.rainfall);
    
    return circle_scale(lookup.rainfall); 
  }

}

function colorSubUnits(cl, filtered_data, buckets, color_scale, value, match_value) {

  var clrs = colors[color_scale][buckets.length];

  svg.selectAll(".subunit." + cl)
    .style("fill", function(subunit, subunit_index){
      
      // match the data
      var match = filtered_data.filter(function(row){ return row[match_value] == subunit.properties[match_value] })[0];
      var mval = +match[value];
      
      // get the bucket number
      var bucket_number = buckets.findIndex(function(bucket, bucket_index){

        if (bucket_index + 1 < buckets.length){
          return mval >= bucket && mval < buckets[bucket_index + 1];  
        } else {
          return mval >= bucket;
        }
        
      });

      return clrs[bucket_number];

    });

}

function calculate_buckets(data, break_type, break_count, value){
  var nums = data.filter(function(d){ return d[value] != ""; }).map(function(d){ return +d[value]; });
  
  return chroma.limits(nums, break_type, break_count);
};

// This function "centers" and "zooms" a map by setting its projection's scale and translate according to its outer boundary
// It also returns the boundary itself in case you want to draw it to the map
function centerZoom(data){
  var o = topojson.mesh(data, data.objects.polygons, function(a, b) { return a === b; });

  projection
      .scale(1)
      .translate([0, 0]);

  var b = path.bounds(o),
      s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
      t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

  projection
      .scale(s)
      .translate(t);

  return o;
}

function drawOuterBoundary(data, boundary){
  svg.append("path")
      .datum(boundary)
      .attr("d", path)
      .attr("class", "subunit-boundary");
}

function drawPlaces(data){
  svg.append("path")
      .datum(topojson.feature(data, data.objects.places))
      .attr("d", path)
      .attr("class", "place");

  svg.selectAll(".place-label")
      .data(topojson.feature(data, data.objects.places).features)
    .enter().append("text")
      .attr("class", "place-label")
      .attr("transform", function(d) { return "translate(" + projection(d.geometry.coordinates) + ")"; })
      .attr("dy", -6)
      .attr("x", 0)
      .style("text-anchor", "middle")
      .text(function(d) { return d.properties.NAME; });
}

function drawSubUnits(data, cl){
  svg.selectAll(".subunit." + cl)
      .data(topojson.feature(data, data.objects.polygons).features)
    .enter().append("path")
      .attr("class", "subunit " + cl)
      .attr("d", path);
}
