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
