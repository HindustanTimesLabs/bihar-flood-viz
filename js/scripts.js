var width = window.innerWidth, height = window.innerHeight;

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

var legend = d3.select(".map-wrapper .legend").append("svg")
    .attr("width", legend_width + legend_margin.left + legend_margin.right)
    .attr("height", legend_height)
  .append("g")
    .attr("transform", "translate(" + legend_margin.left + ", 0)")


var legend_x = d3.scaleLinear()
  .range([0, legend_width]);

var color_scheme = "YlGnBu";

d3.queue()
  .defer(d3.json, "data/bihar_block.json")
  .defer(d3.json, "data/states.json")
  .defer(d3.csv, "data/rainfall.csv")
  .await(ready);

function ready(error, bihar_block, state, rainfall){
  
  var boundary = centerZoom(bihar_block);
  drawSubUnits(bihar_block, "block");
  drawOuterBoundary(bihar_block, boundary);

  drawSubUnits(state, "state");

  // var buckets = calculate_buckets(rainfall, "e", 7, "cumulative_rainfall");
  var buckets = [0, 150, 300, 450, 600, 750, d3.max(rainfall, function(d){ return +d.cumulative_rainfall; })]
  drawLegend(buckets, color_scheme);

  colorSubUnits("block", filterData(rainfall, $("#day").val()), buckets, color_scheme, "cumulative_rainfall", "bl_cen_cd");

  $("#day").change(function(){
    $(".legend-wrapper .legend-date .day").html($(this).val())
    colorSubUnits("block", filterData(rainfall, $("#day").val()), buckets, color_scheme, "cumulative_rainfall", "bl_cen_cd");
  });

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
    .data(buckets, function(d){ return d.bucket; });

  var legendNumber = legend.selectAll(".legend-number")
    .data(buckets, function(d){ return d.bucket; });

  // EXIT
  legendRect.exit()
    .transition()
      .attr("opacity", 1e-6)
      .remove();

  legendNumber.exit()
    .transition()
      .attr("opacity", 1e-6)
      .remove();

  // UPDATE
  legendRect
    .transition()
      .attr("width", function(d){ return legend_x(d.x + d.width); })
      .attr("x", function(d){ return legend_x(d.x); })
      .attr("fill", function(d){ return d.color });
  
  legendNumber
    .transition()
      .attr("x", function(d){ return legend_x(d.x); })
      .text(function(d){ return d.x; });

  // ENTER
  legendRect.enter().append("rect")
      .attr("class", "legend-rect")
      .attr("y", 0)
      .attr("height", legend_bar_height)
      .attr("x", function(d){ return legend_x(d.x); })
      .attr("fill", function(d){ return d.color })
      .attr("width", function(d){ return legend_x(d.x + d.width); });

  legendNumber.enter().append("text")
      .attr("class", "legend-number")
      .attr("y", legend_height)
      .attr("x", function(d){ return legend_x(d.x); })
      .style("text-anchor", "middle")
      .text(function(d, i, data){ return d.x + (i == data.length - 1 ? "+ mm" : ""); });

}

function filterData(data, day){
  var cloned = JSON.parse(JSON.stringify(data))
  return cloned.filter(function(row){ return row.date.split(" ")[0] == day; });
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
      .attr("dy", ".35em")
      .attr("x", function(d) { return projection(d.geometry.coordinates)[0] <= width / 2 ? -6 : 6; })
      .style("text-anchor", function(d){ return projection(d.geometry.coordinates)[0] <= width / 2 ? "end" : "start"; })
      .text(function(d) { return d.properties.name; });
}

function drawSubUnits(data, cl){
  svg.selectAll(".subunit." + cl)
      .data(topojson.feature(data, data.objects.polygons).features)
    .enter().append("path")
      .attr("class", "subunit " + cl)
      .attr("d", path);
}
