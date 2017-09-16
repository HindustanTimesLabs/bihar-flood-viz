var start_year = 2006, end_year = 2017;

var isMobile = false; //initiate as false

var ww = $(window).width(),
  resp = {};

if (ww <= 768){
  // mobile
  isMobile = true;
  resp.height = 250;
  resp.range_max = 25;
  resp.leg_height = 55;
  resp.leg_width = 80;
  resp.width = d3.min([window.innerWidth, 768]);
} else {
  // desktop
  isMobile = false;
  resp.height = 250;
  resp.width = (window.innerWidth / 4) * .8;
  resp.range_max = 25;
  resp.leg_height = 55;
  resp.leg_width = 80;
}

var width = resp.width, height = resp.height;

var projection = d3.geoMercator();

var path = d3.geoPath()
    .projection(projection)
    .pointRadius(2);

var svg = d3.select(".map-wrapper.district-deaths .map").append("svg")
    .attr("width", width)
    .attr("height", height);

var legend_deaths_width = resp.leg_width,
  legend_deaths_height = resp.leg_height;

var legend_deaths = d3.select(".map-wrapper.district-deaths .legend-death-circles").append("svg")
    .attr("width", legend_deaths_width)
    .attr("height", legend_deaths_height);

var death_circle_scale = d3.scaleLinear()
    .range([0, resp.range_max]);

d3.queue()
  .defer(d3.json, "data/bihar_district.json")
  .defer(d3.json, "data/states.json")
  .defer(d3.json, "data/bihar_cities.json")
  .defer(d3.json, "data/states_labels.json")
  .defer(d3.csv, "data/deaths.csv")
  .await(ready)

function ready(error, district, state, city, state_label, deaths){

  centerZoom(district, svg);
  
  drawSubUnits(state, "state", svg);

  centerZoom(district, svg);
  drawSubUnits(district, "district", svg);
  var boundary = centerZoom(district, svg);
  drawOuterBoundary(district, boundary, svg);
  
  drawPlaces(state_label, "state-label", svg);

  // set up death circle scale domain based on min and max deaths
  death_circle_scale.domain(d3.extent(deaths, function(d){ return +d.deaths; }))

  drawLegendDeaths(deaths);

  function redraw(yr, svg){
    if (isMobile) $(".map-wrapper.district-deaths .legend-wrapper .legend-date").html(yr);
    drawDeathCircles(district, filterDeathData(deaths, yr), svg);
    fillSubUnits("district", filterDeathData(deaths, yr), svg);
  }

  // gif
  // if (isMobile) {
    redraw(start_year, svg)
    d3.interval(function(){
      if (start_year == end_year){
        start_year = 2006
      } else {
        ++start_year
      }
      redraw(start_year, svg);
    }, 1000);
  // }

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
        var h = $(".small-mult-wrapper img").height();
  
        $(".small-mult-wrapper .map").height(h / 3);
      }
      setHeight();

      $(window).resize(setHeight);


      // svg_obj[i] = d3.select(".map-wrapper.district-deaths .small-mult-wrapper .map-small-mult.map-" + i).append("svg")
      //   .attr("width", width)
      //   .attr("height", height);

      // centerZoom(district, svg_obj[i]);
      // centerZoom(district, svg_obj[i]);
      // drawSubUnits(district, "district", svg_obj[i]);
      // var boundary = centerZoom(district, svg_obj[i]);
      // drawOuterBoundary(district, boundary, svg_obj[i]);
      // redraw(i, svg_obj[i]);
    // }
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