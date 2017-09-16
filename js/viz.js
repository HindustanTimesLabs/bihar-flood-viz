var isMobile = false; //initiate as false

var day_val = 1,
  delay = 250,
  start_year = 2006,
  end_year = 2017;

// responsiveness
var ww = $(window).width(),
  resp = {},
  resp_deaths = {};
if (ww <= 768){
  // mobile

  // for rain
  resp.height = 250;
  resp.circleMax = 10;
  resp.ldh = 25;
  resp.ldw = 75;
  resp.ldny =  function(d){ return circle_scale(d * 2) + 5; }
  resp.fast_interval = 500;

  // for deaths
  isMobile = true;
  resp_deaths.height = 250;
  resp_deaths.range_max = 25;
  resp_deaths.leg_height = 55;
  resp_deaths.leg_width = 80;
  resp_deaths.width = d3.min([window.innerWidth, 768]);
} else {
  //desktop 

  // for rain
  resp.height = 600;
  resp.circleMax = 20;
  resp.ldh = 45;
  resp.ldw = 94;
  resp.ldny =  function(d){ return circle_scale(d * 2) + 2; }
  resp.fast_interval = 250;

  // for deaths
  isMobile = false;
  resp_deaths.height = 250;
  resp_deaths.width = (window.innerWidth / 4) * .8;
  resp_deaths.range_max = 25;
  resp_deaths.leg_height = 55;
  resp_deaths.leg_width = 80;
}

var legend_deaths_width = resp_deaths.leg_width,
  legend_deaths_height = resp_deaths.leg_height;

var legend_deaths = d3.select(".map-wrapper.district-deaths .legend-death-circles").append("svg")
    .attr("width", legend_deaths_width)
    .attr("height", legend_deaths_height);

var death_circle_scale = d3.scaleLinear()
    .range([0, resp_deaths.range_max]);

// maps dimensions
var width = $(".map-wrapper.blocks-rainfall .map").width(),
  height = resp.height,
  death_width = resp_deaths.width,
  death_height = resp_deaths.height;

// projections
var rain_projection = d3.geoMercator(),
  projection = d3.geoMercator();

// paths
var rain_path = d3.geoPath()
    .projection(rain_projection)
    .pointRadius(2),
  path = d3.geoPath()
    .projection(projection)
    .pointRadius(2);

// svgs
var rain_svg = d3.select(".map-wrapper.blocks-rainfall .map").append("svg")
    .attr("width", width)
    .attr("height", height),
  svg = d3.select(".map-wrapper.district-deaths .map").append("svg")
    .attr("width", death_width)
    .attr("height", death_height);

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
  .defer(d3.json, "data/bihar_district.json")
  .defer(d3.csv, "data/deaths.csv")
  .await(ready);

function ready(error, bihar_block, state, city, rainfall, state_labels, district, deaths){

  var boundary = centerZoom(bihar_block, rain_svg, rain_projection, rain_path);
  drawSubUnits(bihar_block, "block", rain_svg, rain_path);
  drawOuterBoundary(bihar_block, boundary, rain_svg, rain_path);

  drawSubUnits(state, "state", rain_svg, rain_path);

  drawPlaces(city, "city", rain_svg, rain_path, rain_projection);
  drawPlaces(state_labels, "state-label", rain_svg, rain_path, rain_projection);

  // update rain circle scale domain. max is daily rainfall, variable "rainfall"
  circle_scale.domain([0, d3.max(rainfall, function(d){ return +d.rainfall })]);
  drawLegendDaily(rainfall);
  drawRain(bihar_block, filterData(rainfall, day_val), rain_path);

  var buckets = [0, 150, 300, 450, 600, 750, d3.max(rainfall, function(d){ return +d.cumulative_rainfall; })]
  drawLegend(buckets, color_scheme, legend, legend_x, legend_width, legend_margin);
  
  colorSubUnits("block", filterData(rainfall, day_val), buckets, color_scheme, "cumulative_rainfall", "bl_cen_cd", svg);

  interval();

  function interval(){
    
    if (day_val == 31){
      day_val = 1;
    } else {
      ++day_val;
    }

    if (day_val > 11 && day_val < 15){
      delay = 1000;
      $(".map-wrapper.blocks-rainfall .legend-date").addClass("red-text");
    } else {
      delay = resp.fast_interval;
      $(".map-wrapper.blocks-rainfall .legend-date").removeClass("red-text");
    }

    redraw();

    d3.timeout(interval, delay);
  }

  function redraw(){
    $(".blocks-rainfall .legend-wrapper .legend-date .day").html(day_val)
    colorSubUnits("block", filterData(rainfall, day_val), buckets, color_scheme, "cumulative_rainfall", "bl_cen_cd", rain_svg);
    drawRain(bihar_block, filterData(rainfall, day_val), rain_path);
  }


  // deaths

  centerZoom(district, svg, projection, path);
  
  drawSubUnits(state, "state", svg, path);

  drawSubUnits(district, "district", svg, path);
  var boundary = centerZoom(district, svg, projection, path);
  drawOuterBoundary(district, boundary, svg, path);
  
  drawPlaces(state_labels, "state-label", svg, path, projection);

  // set up death circle scale domain based on min and max deaths
  death_circle_scale.domain(d3.extent(deaths, function(d){ return +d.deaths; }))

  drawLegendDeaths(deaths);

  function redraw_deaths(yr, svg){
    if (isMobile) $(".map-wrapper.district-deaths .legend-wrapper .legend-date").html(yr);
    drawDeathCircles(district, filterDeathData(deaths, yr), svg);
    fillSubUnits("district", filterDeathData(deaths, yr), svg);
  }

  // gif
  if (isMobile) {
    redraw_deaths(start_year, svg)
    d3.interval(function(){
      if (start_year == end_year){
        start_year = 2006
      } else {
        ++start_year
      }
      redraw_deaths(start_year, svg);
    }, 2000);
  }

  // small multiples
  var svg_obj = {};
  for (var i = start_year; i <= end_year; i++){

    $(".small-mult-wrapper").append("<div class='map map-small-mult map-" + i + "'></div>");
    $(".small-mult-wrapper .map-" + i).append("<div class='legend-date'>" + i + "</div>");

    var year_data = filterDeathData(deaths, i),
      districts = year_data.filter(function(d){ return d.deaths != "0"; }).length,
      total_deaths = d3.sum(year_data, function(d){ return +d.deaths; });
    $(".small-mult-wrapper .map-" + i).append("<div class='legend-sentence-small'><b>" + jz.str.numberLakhs(total_deaths) + "</b> killed in <b><span class='red-text'>" + districts + "</span></b> districts.</div>")

    // set height
    function setHeight(){
      var coefficient = ww >= 992 ? 3.04 : 3.09;
      var h = $(".small-mult-wrapper img").height();
      $(".small-mult-wrapper .map").height(h / coefficient);
    }

    setTimeout(setHeight, 100);

    $(window).resize(setHeight);

  }


}

// This function "centers" and "zooms" a map by setting its projection's scale and translate according to its outer boundary
// It also returns the boundary itself in case you want to draw it to the map
function centerZoom(data, svg, projection, path){
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

function drawOuterBoundary(data, boundary, svg, path){
  svg.append("path")
      .datum(boundary)
      .attr("d", path)
      .attr("class", "subunit-boundary")
      .style("fill", "none")
      .style("stroke", "#000");
}

function drawPlaces(data, cl, svg, path, projection){

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
      .text(function(d) { return d.properties.NAME; });
}

function drawSubUnits(data, cl, svg, path){
  svg.selectAll(".subunit." + cl)
      .data(topojson.feature(data, data.objects.polygons).features)
    .enter().append("path")
      .attr("class", "subunit " + cl)
      .style("stroke-width", .1)
      .attr("d", path);

}

function calculate_buckets(data, break_type, break_count, value, svg){
  var nums = data.filter(function(d){ return d[value] != ""; }).map(function(d){ return +d[value]; });
  
  return chroma.limits(nums, break_type, break_count);
};



function colorSubUnits(cl, filtered_data, buckets, color_scale, value, match_value, svg) {

  var clrs = color_scale.warning != undefined ? color_scale.scale : colors[color_scale][buckets.length - 1];

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

      if (bucket_number == buckets.length - 1) bucket_number = buckets.length - 2;

      return clrs[bucket_number];

    })
    .on("mouseover", function(d){ 
      var match = filtered_data.filter(function(row){ return row[match_value] == d.properties[match_value] })[0];
      console.log(match.district, match[value])
    });

}

function drawLegend(buckets, colorScheme, legendSVG, legendScale, legend_width, legend_margin){

  var unit = colorScheme.warning == undefined ? "mm" : "";

  if (unit == "") { buckets.shift(); colorScheme.scale.shift()};

  // get data ready
  var arr = [],
    final = buckets[buckets.length - 1];
  buckets.forEach(function(d, i){

    if (i > 0){
      var obj = {};
      obj.bucket = i;
      obj.text = buckets[i - 1]
      obj.x = legend_width / (buckets.length - 1) * (i - 1) + ((legend_margin.left + legend_margin.right) / buckets.length - 1); // TODO: Figure out margin
      obj.color = unit == "" ? colorScheme.scale[i -1] : colors[colorScheme][buckets.length][i - 1];
      arr.push(obj);
    }
    
  });
  buckets = arr;

  // update legendX domain
  legendScale.domain([buckets[0].x, buckets[buckets.length - 1].x]);

  // JOIN
  var legendRect = legendSVG.selectAll(".legend-rect")
      .data(buckets, function(d){ return d.bucket; })
    .enter().append("rect")
      .attr("class", "legend-rect")
      .attr("y", 0)
      .attr("height", legend_bar_height)
      .attr("x", function(d){ return d.x; })
      .attr("fill", function(d){ return d.color })
      .attr("width", legend_width / buckets.length)
      // .style("stroke-width", "1px")
      // .style("stroke", "#fff")
      // .style("shape-rendering", "crispEdges");
  
  var legendNumber = legendSVG.selectAll(".legend-cumulative-number")
      .data(buckets, function(d){ return d.bucket; })
    .enter().append("text")
      .attr("class", "legend-cumulative-number legend-number")
      .attr("y", legend_height)
      .attr("x", function(d){ return d.x; })
      // .style("text-anchor", "middle")
      .text(function(d, i, data){ return d.text + (i == data.length - 1 ? "+ " + unit : ""); });

}

function drawLegendDaily(data){

  var m = d3.max(data, function(d){ return +d.rainfall });

  var legend_data = [m, 100];

  var legend_circle = legend_daily.selectAll(".blocks-rainfall .legend-circle")
      .data(legend_data)
    .enter().append("circle")
      .attr("class", "legend-circle")
      .attr("cy", function(d){ return circle_scale(d) + 1; })
      .attr("cx", circle_scale(m) + 1)
      .attr("r", function(d){ return circle_scale(d); });

  var legend_dotted_line = legend_daily.selectAll(".blocks-rainfall .legend-dotted-line")
      .data(legend_data)
    .enter().append("line")
      .attr("class", "legend-dotted-line")
      .attr("x1", circle_scale(m) + 1)
      .attr("x2", circle_scale(m) * 2 + 10)
      .attr("y1", function(d){ return circle_scale(d * 2) + 1; })
      .attr("y2", function(d){ return circle_scale(d * 2) + 1; });

  var legend_daily_number = legend_daily.selectAll(".blocks-rainfall .legend-daily-number")
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

function drawRain(map, data, path){

  // JOIN
  var rain_circle = rain_svg.selectAll(".rain-circle")
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

function fillSubUnits(cl, data, svg, yr){

  var count = 0,
    deaths = 0;

  svg.selectAll(".subunit." + cl)
    .transition()
      .style("fill", function(d){
        var lookup = lookup_data(d);
        return lookup.deaths != "0" ? "#e55a4b" : "#fff";
      })
      .style("stroke", function(d){
        var lookup = lookup_data(d);
        if (lookup.deaths != "0") {
          ++count;
          deaths = deaths + Number(lookup.deaths);
        }
        return lookup.deaths != "0" ? "#fff" : "#444";
      });

  $(".legend-sentence").html("<b>" + jz.str.numberLakhs(deaths) + "</b> people were killed in <span class='red-text'><b>" + count + "</b></span> districts.");

  function lookup_data(d){
    return data.filter(function(row){
      return d.properties.dt_cen_cd == +row.dt_cen_cd;
    })[0]
  }

}

function drawLegendDeaths(data){

  var m = d3.max(data, function(d){ return +d.deaths });

  var legend_data = [m, 150, 50];

  var legend_circle = legend_deaths.selectAll(".district-deaths .legend-circle")
      .data(legend_data)
    .enter().append("circle")
      .attr("class", "legend-circle")
      .attr("cy", function(d){ return death_circle_scale(d) + 1; })
      .attr("cx", death_circle_scale(m) + 1)
      .attr("r", function(d){ return death_circle_scale(d); });

  var legend_dotted_line = legend_deaths.selectAll(".district-deaths .legend-dotted-line")
      .data(legend_data)
    .enter().append("line")
      .attr("class", "legend-dotted-line")
      .attr("x1", death_circle_scale(m) + 1)
      .attr("x2", death_circle_scale(m) * 2 + 10)
      .attr("y1", function(d){ return death_circle_scale(d * 2) + 1; })
      .attr("y2", function(d){ return death_circle_scale(d * 2) + 1; });

  var legend_daily_number = legend_deaths.selectAll(".district-deaths .legend-daily-number")
      .data(legend_data)
    .enter().append("text")
      .attr("class", "legend-daily-number legend-number")
      .attr("x", death_circle_scale(m) * 2 + 10)
      .attr("y", function(d){ return death_circle_scale(d * 2) + 5; })
      .text(function(d, i){ return d + (i == 2 ? "" : ""); });

}

function drawDeathCircles(map, data, svg){

  var death_circle = svg.selectAll(".death-circle")
      .data(topojson.feature(map, map.objects.polygons).features, function(d){ return d.properties.dt_cen_cd; });

  var death_circle_stroke = svg.selectAll(".death-circle-stroke")
      .data(topojson.feature(map, map.objects.polygons).features, function(d){ return d.properties.dt_cen_cd; });

  death_circle.transition().attr("r", calc_radius);
  death_circle_stroke.transition().attr("r", calc_radius);

  death_circle.enter().append("circle")
      .attr("class", "death-circle")
      .attr("cx", function(d){ return path.centroid(d)[0]; })
      .attr("cy", function(d){ return path.centroid(d)[1]; })
      .style("opacity", .5)
      .attr("r", calc_radius);

  death_circle_stroke.enter().append("circle")
      .attr("class", "death-circle-stroke")
      .attr("cx", function(d){ return path.centroid(d)[0]; })
      .attr("cy", function(d){ return path.centroid(d)[1]; })
      .style("fill", "none")
      .style("stroke", "#000")
      .style("stroke-width", "1.5px")
      .attr("r", calc_radius);

  function calc_radius(d){
    
    var lookup = data.filter(function(row){
      return row.dt_cen_cd == d.properties.dt_cen_cd.toString();
    })[0];
    
    return death_circle_scale(lookup.deaths); 
  }

}

function filterDeathData(data, year){
  var cloned = JSON.parse(JSON.stringify(data))
  return cloned.filter(function(row){ return row.year == year; });
}


