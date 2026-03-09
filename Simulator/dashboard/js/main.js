/*
*    main.js
*/

// *********************
// Global variables
// *********************

let formattedData = [];
let originalData = [];
let yearIndex = 0;
let interval = null;

// *********************
// Basic setup SVG
// *********************

//Set up SVG dimensions
const width = 800;
const height = 500;

//Set up margins - larger margins for controls
const margin = {left: 320, right: 200, top: 100, bottom: 100};

//Creating SVG
const svg = d3.select("#chart-area")
	.append("svg")
	.attr("width",width+margin.left+margin.right)
	.attr("height",height+margin.top+margin.bottom)

//Setting up a black background
svg.append("rect")
	.attr("width","100%")
	.attr("height","100%")
	.attr("fill", "black");

// *********************
// UI Controls in margins
// *********************

const controls = svg.append("g")
	.attr("class", "controls");

// Play button - left margin
controls.append("foreignObject")
	.attr("x", 20)
	.attr("y", 20)
	.attr("width", 70)
	.attr("height", 40)
	.append("xhtml:div")
	.html('<button id="play-button" class="btn btn-primary">Play</button>');

// Reset button - next to Play 
controls.append("foreignObject")
	.attr("x", 95)
	.attr("y", 20)
	.attr("width", 80)
	.attr("height", 40)
	.append("xhtml:div")
	.html('<button id="reset-button" class="btn btn-primary">Reset</button>');

// Slider - top margin 
controls.append("foreignObject")
	.attr("x", 180)
	.attr("y", 20)
	.attr("width", 400)
	.attr("height", 60)
	.append("xhtml:div")
	.html(`
		<div id="slider-div">
			<label style="color: white; margin-bottom: 5px; font-size: 14px;">Year: <span id="year">1800</span></label>
			<div id="date-slider"></div>
		</div>
	`);

// Dropdown - right margin
controls.append("foreignObject")
	.attr("x", margin.left + width + 20)
	.attr("y", 20)
	.attr("width", 160)
	.attr("height", 40)
	.append("xhtml:div")
	.html(`
		<select id="continent-select" class="form-control" style="background-color: #555; color: white; border: 1px solid #777;">
			<option selected value="all">All</option>
			<option value="europe">Europe</option>
			<option value="asia">Asia</option>
			<option value="americas">Americas</option>
			<option value="africa">Africa</option>
		</select>
	`);

//Creating a group for the chart
const g = svg.append("g")
	.attr("transform", "translate("+margin.left+","+margin.top+")");

// *********************
// Scales
// *********************

//X axis logaritmic scale
const x = d3.scaleLog()
	.domain([142,150000])
	.range([0,width]);

//Y axis linear scale
const y = d3.scaleLinear()
	.domain([0,90])
	.range([height,0]);

// Area scale for the circles
const area = d3.scaleLinear()
	.domain([2000,1400000000])
	.range([25*Math.PI,1500*Math.PI]);

//Color scale
const color = d3.scaleOrdinal(d3.schemePastel1);

// *********************
// Axis and labels
// *********************

// X axis
const xAxis=d3.axisBottom(x)
	.tickValues([400,4000,40000])
	.tickFormat(d => "$"+d);

// Group for the x axis
const xAxisGroup = g.append("g")
	.attr("class","x axis")
	.attr("transform","translate(0,"+height+")")
	.call(xAxis);

// Y axis
const yAxis=d3.axisLeft(y);

// Group for the y axis
const yAxisGroup = g.append("g")
	.attr("class","y axis")
	.call(yAxis);

// Styles for axes
g.selectAll(".x.axis path, .x.axis line, .y.axis path, .y.axis line")
    .attr("stroke", "white");

g.selectAll(".x.axis text, .y.axis text")
    .attr("fill", "white");

// X axis label
g.append("text")
	.attr("class","x axis-label")
	.attr("x",width/2)
	.attr("y",height+50)
	.attr("font-size","20px")
	.attr("text-anchor","middle")
	.attr("fill","white")
	.text("GDP Per Capita ($)");

// Y axis label
g.append("text")
	.attr("class","y axis-label")
	.attr("x",-height/2)
	.attr("y",-60)
	.attr("font-size","20px")
	.attr("text-anchor","middle")
	.attr("transform","rotate(-90)")
	.attr("fill","white")
	.text("Life Expectancy (Years)");

// Year label
const yearLabel = g.append("text")
	.attr("class","year-label")
	.attr("x",width)
	.attr("y",height-10)
	.attr("font-size","40px")
	.attr("text-anchor","end")
	.attr("fill","grey")
	.text("1800");

// *********************
// Tooltip
// *********************

const tip = d3.tip()
	.attr('class', 'd3-tip')
	.html(function(d) {
		let text = "<strong>Country:</strong> ";
		text += "<span style='color:red'>" + d.country + "</span><br>";
		text += "<strong>Continent:</strong> ";
		text += "<span style='color:red;text-transform:capitalize'>" + d.continent + "</span><br>";
		text += "<strong>Life Expectancy:</strong> ";
		text += "<span style='color:red'>" + d3.format(".2f")(d.life_exp) + "</span><br>";
		text += "<strong>GDP Per Capita:</strong> ";
		text += "<span style='color:red'>" + d3.format("$,.0f")(d.income) + "</span><br>";
		text += "<strong>Population:</strong> ";
		text += "<span style='color:red'>" + d3.format(",.0f")(d.population) + "</span><br>";
		return text;
	});

g.call(tip);

// *********************
// Data loading, processing, and legend
// *********************

//Loading data
d3.json("data/data.json").then(function(data){
	console.log(data);

	// Store original data globally
	originalData = data;

	//Cleaning data
	formattedData = data.map((year)=>{
		return year["countries"]
			.filter((country)=>{
				const dataExists = (country.income && country.life_exp);
				return dataExists;
			})
			.map((country)=>{
				country.income = +country.income;
				country.life_exp = +country.life_exp;
				return country;
			})
	});

	//Extracting the continents
	const continents = [];
    formattedData[0].forEach(country => {
        if (!continents.includes(country.continent)) {
            continents.push(country.continent);
        }
    });

	//Configuring the color scale domain
	color.domain(continents);

	//Creating the legend
	const legend = g.append("g")
        .attr("transform", `translate(${width-15}, ${height - 125})`);

    continents.forEach((continent, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);
        
        legendRow.append("text")
            .attr("x", -10)
            .attr("y", 10)
            .attr("text-anchor", "end")
            .attr("fill", "white")
            .style("text-transform", "capitalize")
            .text(continent);

		legendRow.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", color(continent));
    });

	// *********************
	// Initialize slider
	// *********************

	$("#date-slider").slider({
		max: 2014,
		min: 1800,
		step: 1,
		slide: function(event, ui) {
			yearIndex = ui.value - 1800;
			update(formattedData[yearIndex], originalData[yearIndex].year);
		}
	});

	// *********************
	// Event listeners
	// *********************

	// Play/Pause button
	$("#play-button").on("click", function() {
		let button = $(this);
		if (button.text() === "Play") {
			button.text("Pause");
			interval = setInterval(step, 100);
		} else {
			button.text("Play");
			clearInterval(interval);
		}
	});

	// Reset button
	$("#reset-button").on("click", function() {
		yearIndex = 0;
		update(formattedData[yearIndex], originalData[yearIndex].year);
		$("#date-slider").slider("value", 1800);
	});

	// Continent filter
	$("#continent-select").on("change", function() {
		update(formattedData[yearIndex], originalData[yearIndex].year);
	});

	// *********************
	// Initial update
	// *********************

	// Calling the update function for the first time
	update(formattedData[0], originalData[0].year);

}).catch((error)=> {
    console.log(error);
});

// *********************
// Step function
// *********************

function step() {
	yearIndex = (yearIndex < 214) ? yearIndex + 1 : 0;
	update(formattedData[yearIndex], originalData[yearIndex].year);
	$("#date-slider").slider("value", yearIndex + 1800);
}

// *********************
// Update function
// *********************

function update(data, year) {
	// Update the year label
	yearLabel.text(year);
	$("#year").text(year);

	// Filter data by continent
	const continent = $("#continent-select").val();
	data = data.filter(function(d) {
		if (continent === "all") {
			return true;
		} else {
			return d.continent === continent;
		}
	});
    
	// JOIN new data with old elements.
    const circles = g.selectAll("circle")
        .data(data, d => d.country);
    
    // EXIT - remove old elements not present in new data.
    circles.exit()
        .transition()
        .duration(100)
        .attr("r", 0)
        .remove();
    
    // UPDATE - update old elements present in new data.
    circles
        .transition()
        .duration(100)
        .attr("cx", d => x(d.income))
        .attr("cy", d => y(d.life_exp))
        .attr("r", d => Math.sqrt(area(d.population) / Math.PI));
    
    // ENTER - create new elements as needed.
    circles.enter()
        .append("circle")
        .attr("cx", d => x(d.income))
        .attr("cy", d => y(d.life_exp))
        .attr("r", 0) 
        .attr("fill", d => color(d.continent))
        .on("mouseover", tip.show)
        .on("mouseout", tip.hide)
        .transition()
        .duration(100)
        .attr("r", d => Math.sqrt(area(d.population) / Math.PI));
}


