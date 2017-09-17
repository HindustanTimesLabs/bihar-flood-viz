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

// legends
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

var legend_deaths_width = resp_deaths.leg_width,
  legend_deaths_height = resp_deaths.leg_height;

var legend_deaths = d3.select(".map-wrapper.district-deaths .legend-death-circles").append("svg")
    .attr("width", legend_deaths_width)
    .attr("height", legend_deaths_height);

// circle scales
var circle_scale = d3.scaleLinear()
  .range([0, resp.circleMax]),
  death_circle_scale = d3.scaleLinear()
  .range([0, resp_deaths.range_max]);


var colors = {
  "YlGnBu": {
    3:["#edf8b1", "#7fcdbb", "#2c7fb8"],
    4:["#ffffcc", "#a1dab4", "#41b6c4", "#225ea8"],
    5:["#ffffcc", "#a1dab4", "#41b6c4", "#2c7fb8", "#253494"],
    6:["#ffffcc", "#c7e9b4", "#7fcdbb", "#41b6c4", "#2c7fb8", "#253494"],
    7:["#ffffcc", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#0c2c84"],
    8:["#ffffd9", "#edf8b1", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#0c2c84"]
  }
}

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

  if (!isMobile) drawTip("block", rainfall, rain_svg, "blocks-rainfall");

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

function drawTip(cl, data, svg, parent){
  // initiatve tip div
  
  $("." + parent).append("<div class='tip'></div>");
  $(".tip").append("<div class='tip-title'></div>");
  $(".tip").append("<div class='tip-cumulative'></div>");
  $(".tip").append("<div class='tip-chart'></div>");

  data.forEach(function(row){
    var date_split = row.date.split(" ");
    var date_year = date_split[2];
    var date_month = month_convert(date_split[1]);
    var date_day = jz.str.numberPrependZeros(date_split[0], 2);

    function month_convert(month){
      var lookup = {
        "January": "01",
        "February": "02",
        "March": "03",
        "April": "04",
        "May": "05",
        "June": "06",
        "July": "07",
        "August": "08",
        "September": "09",
        "October": "10",
        "November": "11",
        "December": "12"
      };

      return lookup[month];
    }
    row.day = date_day;
    row.date_format = new Date(date_year + "-" + date_month + "-" + date_day);
    return row;
  });

  var tip_setup = d3.marcon()
      .width($("." + parent + " .tip").width())
      .height(100)
      .left(0)
      .right(10)
      .top(10)
      .bottom(15)
      .element("." + parent + " .tip-chart");

  tip_setup.render();

  var tip_width = tip_setup.innerWidth(),
    tip_height = tip_setup.innerHeight(),
    tip_svg = tip_setup.svg();

  var tip_x = d3.scaleTime()
    .range([0, tip_width])
    .domain([data[0].date_format, data[data.length - 1].date_format]);

  var tip_y = d3.scaleLinear()
    .range([tip_height, 0])
    .domain([0, d3.max(data, function(d){ return +d.rainfall })]);

  // axes
  function customYAxis(g) {
    var tip_y_axis = d3.axisRight(tip_y).tickSize(width).ticks(3).tickFormat(function(d, i, ticks){ return i == ticks.length - 1 ? d + " mm" : d; });
    g.call(tip_y_axis);
    g.select(".domain").remove();
    g.selectAll(".tick:not(:first-of-type) line").attr("stroke", "#777").attr("stroke-dasharray", "2,2");
    g.selectAll(".tick text").attr("x", 4).attr("dy", -4);
  }
  
  tip_svg.append("g")
    .attr("class", "tip-axis y")
    .call(customYAxis);

  var formatTime = d3.timeFormat("%d")

  var tip_x_axis = d3.axisBottom(tip_x).tickPadding(0).ticks(60).tickFormat(function(d, i){
    console.log(i, formatTime(d));
    if (i == 0) {
      return "Aug. 1"
    } else if (i == 28){
      return "15"
    } else if (i == 59){
      return "31"
    }
  });

  tip_svg.append("g")
    .attr("class", "tip-axis x")
    .attr("transform", "translate(0, " + tip_height + ")")
    .call(tip_x_axis);

  svg.selectAll(".subunit." + cl)
      .on("mousemove", tipOn)
      .on("mouseout", tipOff);

  function tipOff(){
    d3.selectAll(".subunit." + cl).style("stroke-width", "0px");
    $(".tip").hide();
  }

  function tipOn(subunit){
    $(".tip").show();

    // populate the tip
    var match = data.filter(function(row){ return row.bl_cen_cd == subunit.properties.bl_cen_cd});
    var district = match[0].district;
    var block = match[0].block;

    d3.select(".subunit." + cl + ".bl-" + match[0].bl_cen_cd).style("stroke-width", "1.5px").style("stroke", "#000").moveToFront();
    d3.selectAll(".rain-circle").moveToFront();
    d3.selectAll(".map-wrapper .map .place-label.city").moveToFront();

    $(".tip-title").html(block + " block, " + district + " district");
    $(".tip-cumulative").html(jz.str.numberDecimals(d3.sum(match, function(d){ return +d.rainfall; }), 1) + " total mm of rainfall in August");

    var tip_bar = tip_svg.selectAll(".tip-bar")
        .data(match, function(d, i){ return d.date; });

    tip_bar
        .attr("y", function(d){ return tip_y(d.rainfall); })
        .attr("height", function(d){ return tip_height - tip_y(d.rainfall); })

    tip_bar.enter().append("rect")
        .attr("class", "tip-bar")
        .attr("x", function(d){ return tip_x(d.date_format); })
        .attr("y", function(d){ return tip_y(d.rainfall); })
        .attr("width", tip_width / match.length)
        .attr("height", function(d){ return tip_height - tip_y(d.rainfall); })
        .style("fill", function(d){ 
          if (d.day == "12" || d.day == "13" || d.day == "14"){
            return "#e74c3c"
          } else {
            return "#48a2d7"
          }
          
        })

    // position the tip
    var coordinates = [0, 0];
    coordinates = d3.mouse(this);
    
    // tip left
    var x = coordinates[0];
    var tip_padding_x = Number($(".tip").css("padding-left").split("px")[0]) + Number($(".tip").css("padding-right").split("px")[0]);
    var tip_left = x - (tip_width / 2) - tip_padding_x;

    var y = coordinates[1];
    var tip_padding_y = Number($(".tip").css("padding-top").split("px")[0]) + Number($(".tip").css("padding-bottom").split("px")[0]);
    var map_offset = $("." + parent).offset().top;
    var tip_top = y - $(".tip").height() + tip_padding_y;

    $(".tip").css({
      left: tip_left,
      top: tip_top
    });

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
      .attr("class", function(d){ return "subunit " + cl + (cl == "block" ? " bl-" + d.properties.bl_cen_cd : "") })
      .style("stroke-width", .1)
      .attr("d", path);
}


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
  
  var legendNumber = legendSVG.selectAll(".legend-cumulative-number")
      .data(buckets, function(d){ return d.bucket; })
    .enter().append("text")
      .attr("class", "legend-cumulative-number legend-number")
      .attr("y", legend_height)
      .attr("x", function(d){ return d.x; })
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


// bar chart
function drawBar(){

  // start with the variables
  var x_axis_variable = "year", y_axis_variable = "deaths";

  // for responsiveness
  var ww = $(window).width();
  var resp = {};
  if (ww <= 768){
    // mobile
    resp.tickFormatX = function(d, i, data){ return i == 0 || i == data.length - 1 ? d : ""; }
    resp.amountText = function(d){ return d[x_axis_variable] == "1987" || d[x_axis_variable] == "2004" || d[x_axis_variable] == "2007" || d[x_axis_variable] == "2017" ? jz.str.numberLakhs(d[y_axis_variable]) : ""; }
  } else {
    // desktop
    resp.tickFormatX = function(d){ return d == "1979" || d == "2000" ? d : "'" + jz.str.keepEnd(d, 2); }
    resp.amountText = function(d){ return jz.str.numberLakhs(d[y_axis_variable]); }
  }

  $("#deaths-bar-chart").empty();

  var setup = d3.marcon()
      .top(13)
      .bottom(20)
      .left(0)
      .right(0)
      .element("#deaths-bar-chart")
      .width($("#deaths-bar-chart").width())
      .height(600);

  setup.render();

  var width = setup.innerWidth(), height = setup.innerHeight(), svg = setup.svg();

  var x = d3.scaleBand()
    .rangeRound([0, width])
    .padding(.1);

  var y = d3.scaleLinear()
    .range([height, 0]);

  var color = d3.scaleOrdinal(["#66c2a5","#fc8d62","#8da0cb","#e78ac3","#a6d854","#ffd92f"]);

  d3.csv("data/year_wise_deaths.csv", function(error, data){
    data.forEach(function(row){ row.deaths = isNaN(+row.deaths) ? 0 : +row.deaths; return row; });

    redraw(data);
  });

  function customYAxis(g) {
    g.call(d3.axisRight(y).tickValues([0, 250, 500, 750, 1000, 1250]).tickFormat(function(d, i, ticks){ return d == 0 ? "" : jz.str.numberLakhs(d) + (i == ticks.length - 1 ? " deaths" : "");}).tickSize(width));
    g.select(".domain").remove();
    g.selectAll(".tick:not(:first-of-type) line").attr("stroke", "#777").attr("stroke-dasharray", "2,2");
    g.selectAll(".tick text").attr("x", 4).attr("dy", -4);
  }

  function redraw(data){

    // update scale domains
    y.domain([0, 1400]);
    x.domain(data.map(function(d){ return d[x_axis_variable]; }));

    // axes
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickFormat(resp.tickFormatX));

    svg.append("g")
        .attr("class", "y axis")
        .call(customYAxis)

    // join
    var bar = svg.selectAll(".bar")
      .data(data, function(d){ return d[x_axis_variable]; });

    var amount = svg.selectAll(".amount")
      .data(data, function(d){ return d[x_axis_variable]; });

    var amount_bg = svg.selectAll(".amount.bg")
      .data(data, function(d){ return d[x_axis_variable]; });

    // enter
    bar.enter().append("rect")
        .attr("class", "bar red-fill")
        .attr("x", function(d){ return x(d[x_axis_variable]); })
        .attr("y", function(d){ return y(d[y_axis_variable]); })
        .attr("width", x.bandwidth())
        .attr("height", function(d){ return height - y(d[y_axis_variable]); });

    amount_bg.enter().append("text")
        .attr("class", "amount bg")
        .attr("x", function(d){ return x(d[x_axis_variable]) + x.bandwidth() / 2; })
        .attr("y", function(d){ return y(d[y_axis_variable]); })
        .attr("dy", -4)
        .text(resp.amountText);

    amount.enter().append("text")
        .attr("class", "amount")
        .attr("x", function(d){ return x(d[x_axis_variable]) + x.bandwidth() / 2; })
        .attr("y", function(d){ return y(d[y_axis_variable]); })
        .attr("dy", -4)
        .text(resp.amountText);

    annotate();

    function annotate(){            

      var annotations = [{
        year: "1987",
        text: "The state's Relief and Rehabilitation Department called this flood \"the worst calamity of the state in the twentieth century.\"",
        side: "right"
      },{
        year: "2004",
        text: "In Bihar's most lethal flood since 1987, more than a quarter of the toal deaths occurred in Darbhanga district, where 251 people died.",
        side: "left"
      },{
        year: "2007",
        text: "Water submerged more than 40 percent of the state, and in each of five districts of north central Bihar more than 100 people died in the floods.",
        side: "right"
      },{
        year: "2017",
        text: "This year, flooding was more lethal in Araria, where 95 of the 514 people died, than in any other district of Bihar.",
        side: "top-left"
      }];
      annotations.forEach(function(annotation){ 
        annotation.deaths = data.filter(function(d){ return d.year == annotation.year })[0].deaths;
        
        return annotation; 
      });

      if (ww <= 768){
        resp.annotations = annotations.filter(function(d){ return d.year == "1987" || d.year == "2017"; })
      } else {
        resp.annotations = annotations;
      }

      // annotation-text
      var wrapper = svg.selectAll(".annotation-wrapper")
          .data(resp.annotations, function(d, i){ return i; })
        .enter().append("g")
          .attr("class", "annotation-wrapper")
          .attr("transform", translation)
      
      wrapper.append("text")
          .attr("class", "annotation-title bg")
          .attr("text-anchor", textAnchor)
          .text(function(d){ return d.year; })

      wrapper.append("text")
          .attr("class", "annotation-title")
          .attr("text-anchor", textAnchor)
          .text(function(d){ return d.year; })

      wrapper.append("text")
          .attr("class", "annotation-text bg")
          .attr("y", 20)
          .attr("text-anchor", textAnchor)
          .tspans(function(d){ return d3.wordwrap(d.text, 22) });

      wrapper.append("text")
          .attr("class", "annotation-text")
          .attr("y", 20)
          .attr("text-anchor", textAnchor)
          .tspans(function(d){ return d3.wordwrap(d.text, 22) });

      function textAnchor(d){
        return d.side.includes("right") ? "start" : "end";
      }

      function translation(d){
        var left = "";
        if (d.side == "right"){
          left = x(d[x_axis_variable]) + x.bandwidth() + 12;
        } else if (d.side == "left") {
          left = x(d[x_axis_variable]) - 12;
        } else if (d.side == "top-left"){
          left = x(d[x_axis_variable]) + x.bandwidth()
        }

        var top = d.side.includes("top") ? (y(d[y_axis_variable]) - 110) : (y(d[y_axis_variable]) + 12);
        return "translate(" + left + ", " + top + ")"
      }

    }

  }
}

drawBar();
$(window).smartresize(drawBar);

d3.selection.prototype.tspans = function(lines, lh) {
  return this.selectAll('tspan')
      .data(lines)
      .enter()
      .append('tspan')
      .text(function(d) { return d; })
      .attr('x', 0)
      .attr('dy', function(d,i) { return i ? lh || 15 : 0; });
};

d3.wordwrap = function(line, maxCharactersPerLine) {
  var w = line.split(' '),
      lines = [],
      words = [],
      maxChars = maxCharactersPerLine || 40,
      l = 0;
  w.forEach(function(d) {
      if (l+d.length > maxChars) {
          lines.push(words.join(' '));
          words.length = 0;
          l = 0;
      }
      l += d.length;
      words.push(d);
  });
  if (words.length) {
      lines.push(words.join(' '));
  }
  return lines;
};

