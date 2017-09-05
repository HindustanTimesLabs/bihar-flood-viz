var width = window.innerWidth, height = window.innerHeight;

var projection = d3.geoMercator();

var path = d3.geoPath()
    .projection(projection)
    .pointRadius(2);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var g = svg.append("g");

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

  var buckets = calculate_buckets(rainfall, "k", 7, "cumulative_rainfall");

  colorSubUnits("block", filterData(rainfall, $("#day").val()), buckets, "PuBu", "cumulative_rainfall", "bl_cen_cd");

  $("#day").change(function(){
    colorSubUnits("block", filterData(rainfall, $("#day").val()), buckets, "PuBu", "cumulative_rainfall", "bl_cen_cd");
  });

}

function filterData(data, day){
  return data.filter(function(row){ return row.date.split(" ")[0] == day; });
}

function colorSubUnits(cl, filtered_data, buckets, color_scale, value, match_value) {

  var clrs = colors[color_scale][buckets.length];

  d3.selectAll(".subunit." + cl)
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
      s = .9 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
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

function drawPlaces(data){
  g.append("path")
      .datum(topojson.feature(data, data.objects.places))
      .attr("d", path)
      .attr("class", "place");

  g.selectAll(".place-label")
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
  g.selectAll(".subunit." + cl)
      .data(topojson.feature(data, data.objects.polygons).features)
    .enter().append("path")
      .attr("class", "subunit " + cl)
      .attr("d", path);
}
