// This function "centers" and "zooms" a map by setting its projection's scale and translate according to its outer boundary
// It also returns the boundary itself in case you want to draw it to the map
function centerZoom(data, svg){
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

function drawOuterBoundary(data, boundary, svg){
  svg.append("path")
      .datum(boundary)
      .attr("d", path)
      .attr("class", "subunit-boundary")
      .style("fill", "none")
      .style("stroke", "#000");
}

function drawPlaces(data, cl, svg){

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

function drawSubUnits(data, cl, svg){
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

function toSlugCase(x) {
  return x.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
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