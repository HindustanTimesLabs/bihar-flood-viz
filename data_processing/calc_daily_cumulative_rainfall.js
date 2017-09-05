var io = require("indian-ocean"),
	moment = require("moment"),
	prompt = require("prompt"),
	_ = require("underscore");

var input_data = io.readDataSync("bihar_rainfall_blocks.csv");

// add month and year for each row
input_data.forEach(row => {
	var m = moment(row.date);
	row.month = m.format("MMMM");
	row.year = m.format("YYYY");
	row.day = m.format("DD");
	return row;
});

prompt.start();

var schema = {
	properties: {
		year: {
			message: "What year? (####)",
			required: true
		},
		month: {
			message: "What month? ('January', 'February', etc.)" ,
			required: true
		}
	}
}

prompt.get(schema, (error, response) => {
	if (error) throw error;

	// filter data by response
	var filtered_data = input_data.filter(row => row.month == response.month && row.year == response.year);
	console.log("Your filter returned " + filtered_data.length + " rows out of " + input_data.length + ".");

	// get unique blocks
	var block_codes = _.chain(filtered_data).pluck("bl_cen_cd").uniq().value().map(code => +code).sort();

	var output_data = [];
	block_codes.forEach((block, block_index) => {

		// get data for this block
		var block_data = _.where(filtered_data, {bl_cen_cd: block.toString()});

		if (block_data.length > 31) console.log(block + " has " + block_data.length + " rows");

		// loop through each row and make a cumulative rainfall property
		var cumulative_rainfall = 0;
		var columns = ["date","district","censuscode","st_cen_cd","dt_cen_cd","st_nm","bl_cen_cd","block","rainfall"]
		block_data.forEach((block_row, block_row_index) => {

			var output_row = {};

			// first just loop through the columns and add each to the output_row
			columns.forEach(column => {
				output_row[column] = block_row[column];
			});

			cumulative_rainfall = cumulative_rainfall + Number(block_row.rainfall);

			output_row.cumulative_rainfall = cumulative_rainfall;

			// push the row
			output_data.push(output_row);

			// when we reach the last row, write the data
			if (block_index == block_codes.length - 1 && block_row_index == block_data.length -1){
				console.log("Processing complete. Writing file...");
				io.writeDataSync("daily_cumulative_rainfall_" + response.year + "_" + response.month + ".csv", output_data);
			}

		});



	})

});