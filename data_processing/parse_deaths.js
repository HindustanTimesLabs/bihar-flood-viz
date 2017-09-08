var io = require("indian-ocean"),
	_ = require("underscore");

var data = io.readDataSync("data_processing/bihar_district_deaths_2000-2017.csv");
var lookup = io.readDataSync("data_processing/bihar_district.csv");

var years = Object.keys(data[0]).filter(col => col != "district");

var out = [];

data.forEach(row => {
	var district = row.district;
	years.forEach(year => {
		out.push({
			district: district,
			year: year,
			deaths: +row[year],
			dt_cen_cd: lookup.filter(row => row.district == district)[0].dt_cen_cd
		});
	});
});

io.writeDataSync("data/deaths.csv", out);