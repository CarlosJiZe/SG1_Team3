Promise.all([
fetch("data/duck_curve.json").then(d=>d.json()),
fetch("data/per_house.json").then(d=>d.json())
]).then(([duckData,houseData])=>{

// DRAW GRAPHS

drawDuckCurve(duckData)
drawHouseScatter(houseData)

})


// -----------------------------
// TOOLTIP
// -----------------------------

const tooltip = d3.select("body")
.append("div")
.style("position","absolute")
.style("background","white")
.style("padding","8px")
.style("border","1px solid #ccc")
.style("border-radius","6px")
.style("pointer-events","none")
.style("opacity",0)



// -----------------------------
// DUCK CURVE
// -----------------------------

function drawDuckCurve(data){

const width = 800
const height = 400
const margin = {top:40,right:40,bottom:40,left:60}

const svg = d3.select("#duckCurve")
.append("svg")
.attr("width",width)
.attr("height",height)

const x = d3.scaleLinear()
.domain([0,23])
.range([margin.left,width-margin.right])

const y = d3.scaleLinear()
.domain([
0,
d3.max(data,d=>Math.max(d.load,d.solar))
])
.range([height-margin.bottom,margin.top])


// AXES

svg.append("g")
.attr("transform",`translate(0,${height-margin.bottom})`)
.call(d3.axisBottom(x).ticks(24))

svg.append("g")
.attr("transform",`translate(${margin.left},0)`)
.call(d3.axisLeft(y))


// AREA (NET LOAD)

const area = d3.area()
.x(d=>x(d.hour))
.y0(d=>y(d.load))
.y1(d=>y(d.solar))

svg.append("path")
.datum(data)
.attr("fill","#e8f5e9")
.attr("d",area)


// LINE LOAD

const loadLine = d3.line()
.x(d=>x(d.hour))
.y(d=>y(d.load))

svg.append("path")
.datum(data)
.attr("fill","none")
.attr("stroke","#555")
.attr("stroke-width",2)
.attr("d",loadLine)


// LINE SOLAR

const solarLine = d3.line()
.x(d=>x(d.hour))
.y(d=>y(d.solar))

svg.append("path")
.datum(data)
.attr("fill","none")
.attr("stroke","#fbc02d")
.attr("stroke-width",2)
.attr("d",solarLine)


// POINTS + TOOLTIP

svg.selectAll("circle")
.data(data)
.enter()
.append("circle")
.attr("cx",d=>x(d.hour))
.attr("cy",d=>y(d.load))
.attr("r",4)
.attr("fill","#2c7a55")
.on("mouseover",(event,d)=>{

tooltip
.style("opacity",1)
.html(`
Hour: ${d.hour}<br>
Load: ${d.load} kW<br>
Solar: ${d.solar} kW
`)
})
.on("mousemove",(event)=>{

tooltip
.style("left",(event.pageX+10)+"px")
.style("top",(event.pageY-20)+"px")

})
.on("mouseout",()=>{

tooltip.style("opacity",0)

})

}



// -----------------------------
// SCATTER PLOT (HOUSEHOLDS)
// -----------------------------

function drawHouseScatter(data){

const width = 800
const height = 400
const margin = {top:40,right:40,bottom:40,left:60}

const svg = d3.select("#byType")
.append("svg")
.attr("width",width)
.attr("height",height)

const x = d3.scaleLinear()
.domain([0,d3.max(data,d=>d.solar_generation)])
.range([margin.left,width-margin.right])

const y = d3.scaleLinear()
.domain([0,d3.max(data,d=>d.energy_consumption)])
.range([height-margin.bottom,margin.top])


// AXES

svg.append("g")
.attr("transform",`translate(0,${height-margin.bottom})`)
.call(d3.axisBottom(x))

svg.append("g")
.attr("transform",`translate(${margin.left},0)`)
.call(d3.axisLeft(y))


// COLOR SCALE

const color = d3.scaleOrdinal()
.domain(["low","middle","high","luxury"])
.range(["#8dd3c7","#ffffb3","#bebada","#fb8072"])


// POINTS

svg.selectAll("circle")
.data(data)
.enter()
.append("circle")
.attr("cx",d=>x(d.solar_generation))
.attr("cy",d=>y(d.energy_consumption))
.attr("r",6)
.attr("fill",d=>color(d.wealth))
.attr("opacity",0.8)

.on("mouseover",(event,d)=>{

tooltip
.style("opacity",1)
.html(`
House ID: ${d.house_id}<br>
Solar: ${d.solar_generation} kWh<br>
Consumption: ${d.energy_consumption} kWh
`)
})
.on("mousemove",(event)=>{

tooltip
.style("left",(event.pageX+10)+"px")
.style("top",(event.pageY-20)+"px")

})
.on("mouseout",()=>{

tooltip.style("opacity",0)

})

}

function drawHouseScatter(data){

const width = 800
const height = 400
const margin = {top:40,right:40,bottom:40,left:60}

const svg = d3.select("#houseScatter")
.append("svg")
.attr("width",width)
.attr("height",height)

const x = d3.scaleLinear()
.domain([0,d3.max(data,d=>d.solar_generation)])
.range([margin.left,width-margin.right])

const y = d3.scaleLinear()
.domain([0,d3.max(data,d=>d.energy_consumption)])
.range([height-margin.bottom,margin.top])

svg.append("g")
.attr("transform",`translate(0,${height-margin.bottom})`)
.call(d3.axisBottom(x))

svg.append("g")
.attr("transform",`translate(${margin.left},0)`)
.call(d3.axisLeft(y))

svg.selectAll("circle")
.data(data)
.enter()
.append("circle")
.attr("cx",d=>x(d.solar_generation))
.attr("cy",d=>y(d.energy_consumption))
.attr("r",6)
.attr("fill","#2c7a55")
.attr("opacity",0.8)

}