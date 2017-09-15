var start_year = 2007;

var isMobile = false; //initiate as false
// device detection
if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) isMobile = true;


var ww = $(window).width(),
  resp = {};

if (ww <= 768){
  // resp.
}

var width = window.innerWidth, height = 600;

var projection = d3.geoMercator();

var path = d3.geoPath()
    .projection(projection)
    .pointRadius(2);

var svg = d3.select(".map-wrapper.district-deaths .map").append("svg")
    .attr("width", width)
    .attr("height", height);

var legend_deaths_width = 170,
  legend_deaths_height = 105;

var legend_deaths = d3.select(".map-wrapper.district-deaths .legend-death-circles").append("svg")
    .attr("width", legend_deaths_width)
    .attr("height", legend_deaths_height);

var death_circle_scale = d3.scaleLinear()
    .range([0, 50]);

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

  redraw(start_year, svg);

  drawLegendDeaths(deaths);

  function redraw(yr, svg){
    $(".map-wrapper.district-deaths .legend-date").html(yr);
    drawDeathCircles(district, filterDeathData(deaths, yr), svg);
    fillSubUnits("district", filterDeathData(deaths, start_year), svg);
  }

  // gif
  if (isMobile) {
    d3.interval(function(){
      if (start_year == 2017){
        start_year = 2007
      } else {
        ++start_year
      }
      redraw(start_year, svg);
    }, 1000);
  }

}

function fillSubUnits(cl, data, svg){

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
      .text(function(d, i){ return d + (i == 2 ? " deaths" : ""); });

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