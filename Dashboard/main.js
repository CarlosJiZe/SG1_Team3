// ============================================================
//  GreenGrid Dashboard — main.js
//  All charts wired to real simulation JSON outputs
// ============================================================

// Global state
let allData = {}
let currentDuckScenario    = 'well_designed'
let currentTimeGranularity = 'monthly'
let currentTimeScenario    = 'well_designed'
let currentScatterScenario = 'well_designed'
let currentGroupScenario   = 'well_designed'
let currentGroupKey        = 'by_type'
let solutionMode           = 'total'  // 'total' | 'average'

// ─────────────────────────────────────────────
//  TOOLTIP (shared)
// ─────────────────────────────────────────────
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "gg-tooltip")
  .style("position", "absolute")
  .style("background", "white")
  .style("padding", "10px 14px")
  .style("border", "1px solid #d0ddd6")
  .style("border-radius", "8px")
  .style("box-shadow", "0 4px 16px rgba(0,0,0,0.1)")
  .style("pointer-events", "none")
  .style("font-size", "13px")
  .style("line-height", "1.6")
  .style("opacity", 0)
  .style("z-index", 999)

function showTooltip(html) { tooltip.style("opacity", 1).html(html) }
function moveTooltip(event) {
  tooltip
    .style("left", (event.pageX + 14) + "px")
    .style("top",  (event.pageY - 28) + "px")
}
function hideTooltip() { tooltip.style("opacity", 0) }

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function fmt(n, decimals = 1) {
  return n == null ? "—" : Number(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}
function fmtKwh(n) { return fmt(n, 1) + " kWh" }
function fmtKw(n)  { return fmt(n, 2) + " kW"  }

// ─────────────────────────────────────────────
//  LOAD ALL DATA THEN INIT
// ─────────────────────────────────────────────
Promise.all([
  fetch("data/duck_curve.json").then(r => r.json()),
  fetch("data/per_house.json").then(r => r.json()),
  fetch("data/overview.json").then(r => r.json()),
  fetch("data/by_group.json").then(r => r.json()),
  fetch("data/timeseries.json").then(r => r.json())
]).then(([duckData, houseData, overviewData, groupData, timeData]) => {
  allData = { duckData, houseData, overviewData, groupData, timeData }
  setTimeout(() => {
    populateKPIs()
    populateSimOverview()
    populateComparisonTable()
    populateImpactCards()
    initCostByType()
    initWealthChart()
    initParadoxDuck()
    initParadoxClock()
    initDuckCurve()
    initSelfSufficiencyGauges()
    initBatterySocChart()
    initMistakeTimeseries()
    initHouseScatter()
    initByGroupChart()
    initBulletChart()
    initCo2BulletChart()
    initCo2Equivalencies()
    wireScenarioToggle()
    wireSolutionModeToggle()
  }, 100)
}).catch(err => console.error("Error loading dashboard data:", err))

// ─────────────────────────────────────────────
//  DYNAMIC PEAK KPI
// ─────────────────────────────────────────────
function populateKPIs() {
  const noSolar = allData.overviewData.scenarios.find(s => s.scenario === "no_solar")
  if (!noSolar) return
  const costEl = document.querySelector("#kpi-cost")
  const co2El  = document.querySelector("#kpi-co2")
  const ssEl   = document.querySelector("#kpi-ss")
  if (costEl) costEl.textContent = "$" + fmt(noSolar.total_net_cost, 0)
  if (co2El)  co2El.textContent  = fmt(noSolar.co2_baseline_kg / 1000, 0) + " tons"
  if (ssEl)   ssEl.textContent   = fmt(noSolar.avg_self_sufficiency, 0) + "%"

  // Peak power from duck curve (avg of hours 18-20)
  const duckWD = allData.duckData["well_designed"]
  const peakHours = duckWD.filter(d => d.hour >= 18 && d.hour <= 20)
  const avgPeak = peakHours.reduce((s, d) => s + d.avg_load_kw, 0) / peakHours.length
  const peakEl = document.querySelector("#kpi-peak")
  if (peakEl) peakEl.textContent = fmt(avgPeak, 2) + " kW"

  // Solar peak KPIs
  const peakSolarEntry = duckWD.reduce((max, d) => d.avg_solar_kw > max.avg_solar_kw ? d : max, duckWD[0])
  const loadAtSolarPeak = peakSolarEntry.avg_load_kw
  const maxLoadKw = Math.max(...duckWD.map(d => d.avg_load_kw))

  const solarHourEl    = document.querySelector("#kpi-solar-hour")
  const solarPeakEl    = document.querySelector("#kpi-solar-peak")
  const loadAtSolarEl  = document.querySelector("#kpi-load-at-solar")
  const loadAtSolarBar = document.querySelector("#kpi-load-at-solar-bar")

  if (solarHourEl)    solarHourEl.textContent   = peakSolarEntry.hour + ":00 h"
  if (solarPeakEl)    solarPeakEl.textContent   = fmt(peakSolarEntry.avg_solar_kw, 2) + " kW"
  if (loadAtSolarEl)  loadAtSolarEl.textContent = fmt(loadAtSolarPeak, 2) + " kW"
  if (loadAtSolarBar) loadAtSolarBar.style.width = fmt((loadAtSolarPeak / maxLoadKw) * 100, 0) + "%"
}

// ─────────────────────────────────────────────
//  SIMULATION OVERVIEW CARDS (dynamic)
// ─────────────────────────────────────────────
function populateSimOverview() {
  // Households: count houses in per_house well_designed
  const houses = allData.houseData["well_designed"]
  const numHouses = houses ? houses.length : 24

  // Days: from timeseries daily entries + 1 (day 0 to day N)
  const dailyEntries = allData.timeData["well_designed"]?.["daily"]
  const numDays = dailyEntries ? dailyEntries.length + 1 : 360

  // Scenarios: count from overview
  const numScenarios = allData.overviewData.scenarios.length

  // Update sim-cards
  const simCards = document.querySelectorAll(".sim-card h3")
  if (simCards[0]) simCards[0].textContent = numHouses
  if (simCards[1]) simCards[1].textContent = numDays
  if (simCards[2]) simCards[2].textContent = numScenarios

  // Update all dynamic notes that reference these numbers
  document.querySelectorAll(".sim-note").forEach(el => {
    el.textContent = `Aggregated totals for the full ${numHouses}-household neighborhood over ${numDays} simulated days.`
  })

  // Update chart data note
  const chartNote = document.querySelector(".chart-data-note")
  if (chartNote) {
    chartNote.textContent = `Average per household · Based on ${numDays}-day simulation · Grid rate: $${GRID_RATE}/kWh · CO₂ factor: ${CO2_FACTOR} kg/kWh (CFE Mexico)`
  }

  // Update mistake timeseries note
  updateMistakeNote()

  // Update scatter note
  const scatterNote = document.getElementById("scatter-note")
  if (scatterNote) {
    scatterNote.textContent = `kWh totals over ${numDays} simulated days · Break-even line = solar generated equals energy consumed · Points above the line indicate energy deficit`
  }
}

function updateMistakeNote() {
  const numHouses = (allData.houseData && allData.houseData["well_designed"]) ? allData.houseData["well_designed"].length : "?"
  const mistakeNote = document.getElementById("mistake-note")
  if (!mistakeNote) return
  if (mistakeMetric === "import") {
    mistakeNote.textContent = `Grid Imported = energy purchased from the utility grid · Totals for the full neighborhood (${numHouses} households)`
  } else if (mistakeMetric === "export") {
    mistakeNote.textContent = `Grid Exported = surplus solar energy sold back to the grid · No Solar scenario excluded (zero export by definition) · Totals for the full neighborhood (${numHouses} households)`
  } else if (mistakeMetric === "generated") {
    mistakeNote.textContent = `Solar Generated = total energy produced by solar panels · No Solar scenario excluded · Totals for the full neighborhood (${numHouses} households)`
  } else {
    mistakeNote.textContent = `Load Consumed = total household energy demand · Similar across scenarios since consumption is independent of system design · Totals for the full neighborhood (${numHouses} households)`
  }
}


const GRID_RATE   = 0.0075   // $ per kWh (from config.json)
const CO2_FACTOR  = 0.444    // kg CO2 per kWh (CFE Mexico grid factor)
let currentHHMode = 'kwh'

function initCostByType() {
  const container = document.querySelector("#costByType")
  if (!container) return

  // Inject toggle buttons
  container.insertAdjacentHTML("beforebegin", `
    <div id="hhToggle" style="display:flex;gap:8px;margin-bottom:12px;">
      <button class="time-btn active" data-hhmode="kwh">Consumption (kWh)</button>
      <button class="time-btn" data-hhmode="cost">Annual Cost ($)</button>
      <button class="time-btn" data-hhmode="co2">CO₂ Emissions (kg)</button>
    </div>
  `)

  document.querySelectorAll("#hhToggle .time-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#hhToggle .time-btn").forEach(b => b.classList.remove("active"))
      btn.classList.add("active")
      currentHHMode = btn.dataset.hhmode
      updateHHChart()
    })
  })

  drawHHChart()
}

function drawHHChart() {
  const byType = allData.groupData["well_designed"]["by_type"]
  const labels = { studio_1_bed: "Studio / 1-Bed", small_family: "Small Family", large_family: "Large Family" }

  const numDays = allData.timeData["well_designed"]?.["daily"]?.length + 1 || 360
  const periodLabel = ``

  const data = byType.map(d => {
    const loadPerHouse = d.total_load_kwh / d.count
    let value, barColor, axisLabel, labelFn
    if (currentHHMode === 'kwh') {
      value = loadPerHouse
      barColor = "#ffb74d"
      axisLabel = `kWh`
      labelFn = v => `${d3.format(",")(Math.round(v))} kWh`
    } else if (currentHHMode === 'cost') {
      value = loadPerHouse * GRID_RATE
      barColor = "#e57373"
      axisLabel = `USD`
      labelFn = v => `$${fmt(v, 2)}`
    } else {
      value = loadPerHouse * CO2_FACTOR
      barColor = "#90a4ae"
      axisLabel = `kg CO₂`
      labelFn = v => `${d3.format(",")(Math.round(v))} kg CO₂`
    }
    return { label: d.household_type, value, count: d.count, barColor, axisLabel, labelFn }
  })

  const container = document.querySelector("#costByType")
  const totalW = container.clientWidth - 80 || 720
  const margin = { top: 20, right: 180, bottom: 50, left: 160 }
  const width  = totalW - margin.left - margin.right
  const height = 160

  const svg = d3.select("#costByType")
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  const y = d3.scaleBand()
    .domain(data.map(d => d.label))
    .range([0, height]).padding(0.35)

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value) * 1.2])
    .range([0, width])

  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2).attr("y", -8)
    .attr("text-anchor", "middle")
    .style("font-size", "13px").style("font-weight", "600").style("fill", "#1e2b24")
    .text("Annual Consumption by Household Type")

  svg.append("g")
    .call(d3.axisLeft(y).tickFormat(d => labels[d] || d))
    .selectAll("text").style("font-size", "13px").style("fill", "#1e2b24")

  // Y axis title
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 14)
    .attr("text-anchor", "middle")
    .style("font-size", "11px").style("fill", "#aaa")
    .text("Household Type")

  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => {
      if (currentHHMode === 'cost') return `$${fmt(d, 2)}`
      return d3.format(",")(Math.round(d))
    }))
    .selectAll("text").style("font-size", "11px")

  svg.append("text")
    .attr("class", "hh-axis-label")
    .attr("x", width / 2).attr("y", height + 44)
    .attr("text-anchor", "middle")
    .style("font-size", "11px").style("fill", "#aaa")
    .text(currentHHMode === 'kwh' ? `kWh` : currentHHMode === 'cost' ? `USD` : `kg CO₂`)

  // Bars — start at width 0, animate to full width
  svg.selectAll(".bar-hh")
    .data(data).enter().append("rect")
    .attr("class", "bar-hh")
    .attr("y", d => y(d.label)).attr("x", 0)
    .attr("height", y.bandwidth())
    .attr("width", 0)
    .attr("fill", d => d.barColor).attr("rx", 6)
    .on("mouseover", (event, d) => showTooltip(`
      <strong>${labels[d.label]}</strong><br>
      ${d.labelFn(d.value)}<br>
      Households: ${d.count}
    `))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip)
    .transition().duration(700).ease(d3.easeCubicOut)
    .attr("width", d => x(d.value))

  // Labels — appear after bars finish growing
  svg.selectAll(".bar-hh-label")
    .data(data).enter().append("text")
    .attr("class", "bar-hh-label")
    .attr("x", 0)
    .attr("y", d => y(d.label) + y.bandwidth() / 2 + 4)
    .style("font-size", "13px").style("font-weight", "600").style("fill", "#1e2b24")
    .style("opacity", 0)
    .text(d => d.labelFn(d.value))
    .transition().duration(700).ease(d3.easeCubicOut)
    .attr("x", d => x(d.value) + 8)
    .style("opacity", 1)
}

// ─────────────────────────────────────────────
//  SMOOTH UPDATE — called when mode toggle changes
// ─────────────────────────────────────────────
function updateHHChart() {
  const byType = allData.groupData["well_designed"]["by_type"]
  const numDays = allData.timeData["well_designed"]?.["daily"]?.length + 1 || 360
  const periodLabel = ``

  const data = byType.map(d => {
    const loadPerHouse = d.total_load_kwh / d.count
    let value, barColor, labelFn
    if (currentHHMode === 'kwh') {
      value = loadPerHouse; barColor = "#ffb74d"
      labelFn = v => `${d3.format(",")(Math.round(v))} kWh`
    } else if (currentHHMode === 'cost') {
      value = loadPerHouse * GRID_RATE; barColor = "#e57373"
      labelFn = v => `$${fmt(v, 2)}`
    } else {
      value = loadPerHouse * CO2_FACTOR; barColor = "#90a4ae"
      labelFn = v => `${d3.format(",")(Math.round(v))} kg CO₂`
    }
    return { label: d.household_type, value, barColor, labelFn }
  })

  const svg = d3.select("#costByType svg g")
  const totalW = document.querySelector("#costByType").clientWidth - 80 || 720
  const margin = { top: 20, right: 180, bottom: 50, left: 160 }
  const width = totalW - margin.left - margin.right

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value) * 1.2])
    .range([0, width])

  // Animate bars
  svg.selectAll(".bar-hh")
    .data(data)
    .transition().duration(500).ease(d3.easeCubicInOut)
    .attr("width", d => x(d.value))
    .attr("fill", d => d.barColor)

  // Animate labels
  svg.selectAll(".bar-hh-label")
    .data(data)
    .transition().duration(500).ease(d3.easeCubicInOut)
    .attr("x", d => x(d.value) + 8)
    .tween("text", function(d) {
      const node = this
      const prev = parseFloat(node.textContent.replace(/[^0-9.]/g, "")) || 0
      const next = d.value
      const interp = d3.interpolateNumber(prev, next)
      return t => { node.textContent = d.labelFn(interp(t)) }
    })

  // Update axis label
  svg.select(".hh-axis-label")
    .text(currentHHMode === 'kwh' ? `kWh` : currentHHMode === 'cost' ? `USD` : `kg CO₂`)

  // Update SVG title
  svg.select(".chart-title")
    .text(currentHHMode === 'kwh'  ? 'Annual Consumption by Household Type' :
          currentHHMode === 'cost' ? 'Annual Cost by Household Type' :
          'CO₂ Emissions by Household Type')

  // Update x axis
  svg.select(".x-axis")
    .transition().duration(500)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => {
      if (currentHHMode === 'cost') return `$${fmt(d, 2)}`
      return d3.format(",")(Math.round(d))
    }))
}

// ─────────────────────────────────────────────
//  LOLLIPOP CHART — Consumption by Wealth Level
// ─────────────────────────────────────────────
const WEALTH_LABELS = {
  low_income:    "Low Income",
  middle_income: "Middle Income",
  high_income:   "High Income",
  luxury:        "Luxury",
  low:           "Low Income",
  middle:        "Middle Income",
  high:          "High Income"
}

function getWealthColor() {
  if (currentWealthMode === 'kwh')  return "#ffb74d"
  if (currentWealthMode === 'cost') return "#e57373"
  return "#90a4ae"
}
let currentWealthMode = 'kwh'

function initWealthChart() {
  const container = document.querySelector("#wealthLollipop")
  if (!container) return

  container.insertAdjacentHTML("beforebegin", `
    <div id="wealthToggle" style="display:flex;gap:8px;margin-bottom:12px;">
      <button class="time-btn active" data-wmode="kwh">Consumption (kWh)</button>
      <button class="time-btn" data-wmode="cost">Annual Cost ($)</button>
      <button class="time-btn" data-wmode="co2">CO₂ Emissions (kg)</button>
    </div>
  `)

  document.querySelectorAll("#wealthToggle .time-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#wealthToggle .time-btn").forEach(b => b.classList.remove("active"))
      btn.classList.add("active")
      currentWealthMode = btn.dataset.wmode
      updateWealthChart()
    })
  })

  drawWealthChart()

  const numDays  = allData.timeData["well_designed"]?.["daily"]?.length + 1 || 360
  const wealthNote = document.querySelector("#wealth-data-note")
  if (wealthNote) wealthNote.textContent = `Average per household · Based on ${numDays}-day simulation · Grid rate: $${GRID_RATE}/kWh · CO₂ factor: ${CO2_FACTOR} kg/kWh (CFE Mexico)`
}

function getWealthData() {
  const byWealth = allData.groupData["well_designed"]["by_wealth"]
  const numDays  = allData.timeData["well_designed"]?.["daily"]?.length + 1 || 360
  const periodLabel = ``

  return {
    periodLabel,
    data: byWealth.map(d => {
      const loadPerHouse = d.total_load_kwh / d.count
      let value, labelFn
      if (currentWealthMode === 'kwh') {
        value = loadPerHouse
        labelFn = v => `${d3.format(",")(Math.round(v))} kWh`
      } else if (currentWealthMode === 'cost') {
        value = loadPerHouse * GRID_RATE
        labelFn = v => `$${fmt(v, 2)}`
      } else {
        value = loadPerHouse * CO2_FACTOR
        labelFn = v => `${d3.format(",")(Math.round(v))} kg CO₂`
      }
      return { label: d.wealth_level, value, count: d.count, labelFn }
    })
  }
}

function drawWealthChart() {
  const container = document.querySelector("#wealthLollipop")
  const { data, periodLabel } = getWealthData()

  const totalW = container.clientWidth - 80 || 720
  const margin = { top: 30, right: 160, bottom: 50, left: 140 }
  const width  = totalW - margin.left - margin.right
  const height = 200

  const svg = d3.select("#wealthLollipop")
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  const y = d3.scaleBand()
    .domain(data.map(d => d.label))
    .range([0, height]).padding(0.4)

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value) * 1.2])
    .range([0, width])

  svg.append("text")
    .attr("class", "w-chart-title")
    .attr("x", width / 2).attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "13px").style("font-weight", "600").style("fill", "#1e2b24")
    .text(currentWealthMode === 'kwh' ? 'Annual Consumption by Wealth Level' :
          currentWealthMode === 'cost' ? 'Annual Cost by Wealth Level' :
          'CO₂ Emissions by Wealth Level')

  svg.append("g")
    .call(d3.axisLeft(y).tickFormat(d => WEALTH_LABELS[d] || d))
    .selectAll("text").style("font-size", "13px").style("fill", "#1e2b24")

  // Y axis title
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 14)
    .attr("text-anchor", "middle")
    .style("font-size", "11px").style("fill", "#aaa")
    .text("Wealth Level")

  svg.append("g")
    .attr("class", "w-x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => {
      if (currentWealthMode === 'cost') return `$${fmt(d, 2)}`
      return d3.format(",")(Math.round(d))
    }))
    .selectAll("text").style("font-size", "11px")

  svg.append("text")
    .attr("class", "w-axis-label")
    .attr("x", width / 2).attr("y", height + 44)
    .attr("text-anchor", "middle")
    .style("font-size", "11px").style("fill", "#aaa")
    .text(currentWealthMode === 'kwh' ? `kWh` : currentWealthMode === 'cost' ? `USD` : `kg CO₂`)

  // Stems — lines from 0 to value
  svg.selectAll(".lollipop-stem")
    .data(data).enter().append("line")
    .attr("class", "lollipop-stem")
    .attr("y1", d => y(d.label) + y.bandwidth() / 2)
    .attr("y2", d => y(d.label) + y.bandwidth() / 2)
    .attr("x1", 0).attr("x2", 0)
    .attr("stroke", getWealthColor())
    .attr("stroke-width", 3)
    .transition().duration(700).ease(d3.easeCubicOut)
    .attr("x2", d => x(d.value))

  // Circles — the lollipop head
  svg.selectAll(".lollipop-circle")
    .data(data).enter().append("circle")
    .attr("class", "lollipop-circle")
    .attr("cy", d => y(d.label) + y.bandwidth() / 2)
    .attr("cx", 0)
    .attr("r", 9)
    .attr("fill", getWealthColor())
    .attr("stroke", "white").attr("stroke-width", 2)
    .on("mouseover", (event, d) => showTooltip(`
      <strong>${WEALTH_LABELS[d.label]}</strong><br>
      ${d.labelFn(d.value)}<br>
      Households: ${d.count}
    `))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip)
    .transition().duration(700).ease(d3.easeCubicOut)
    .attr("cx", d => x(d.value))

  // Value labels
  svg.selectAll(".lollipop-label")
    .data(data).enter().append("text")
    .attr("class", "lollipop-label")
    .attr("cx", 0)
    .attr("x", 0)
    .attr("y", d => y(d.label) + y.bandwidth() / 2 + 4)
    .style("font-size", "13px").style("font-weight", "600").style("fill", "#1e2b24")
    .style("opacity", 0)
    .text(d => d.labelFn(d.value))
    .transition().duration(700).ease(d3.easeCubicOut)
    .attr("x", d => x(d.value) + 16)
    .style("opacity", 1)
}

function updateWealthChart() {
  const { data, periodLabel } = getWealthData()
  const totalW = document.querySelector("#wealthLollipop").clientWidth - 80 || 720
  const margin = { top: 30, right: 160, bottom: 50, left: 140 }
  const width  = totalW - margin.left - margin.right

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value) * 1.2])
    .range([0, width])

  const svg = d3.select("#wealthLollipop svg g")

  svg.selectAll(".lollipop-stem").data(data)
    .transition().duration(500).ease(d3.easeCubicInOut)
    .attr("x2", d => x(d.value))
    .attr("stroke", getWealthColor())

  svg.selectAll(".lollipop-circle").data(data)
    .transition().duration(500).ease(d3.easeCubicInOut)
    .attr("cx", d => x(d.value))
    .attr("fill", getWealthColor())

  svg.selectAll(".lollipop-label").data(data)
    .transition().duration(500).ease(d3.easeCubicInOut)
    .attr("x", d => x(d.value) + 16)
    .tween("text", function(d) {
      const node = this
      const prev = parseFloat(node.textContent.replace(/[^0-9.]/g, "")) || 0
      const interp = d3.interpolateNumber(prev, d.value)
      return t => { node.textContent = d.labelFn(interp(t)) }
    })

  svg.select(".w-axis-label")
    .text(currentWealthMode === 'kwh' ? `kWh` : currentWealthMode === 'cost' ? `USD` : `kg CO₂`)

  svg.select(".w-chart-title")
    .text(currentWealthMode === 'kwh' ? 'Annual Consumption by Wealth Level' :
          currentWealthMode === 'cost' ? 'Annual Cost by Wealth Level' :
          'CO₂ Emissions by Wealth Level')

  svg.select(".w-x-axis")
    .transition().duration(500)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => {
      if (currentWealthMode === 'cost') return `$${fmt(d, 2)}`
      return d3.format(",")(Math.round(d))
    }))
}


// ─────────────────────────────────────────────
function populateComparisonTable() {
  const tbody = document.querySelector("#comparison-tbody")
  if (!tbody) return
  tbody.innerHTML = ""
  allData.overviewData.scenarios.forEach(s => {
    const cost    = s.total_net_cost < 0
      ? `-$${fmt(Math.abs(s.total_net_cost), 0)}`
      : `$${fmt(s.total_net_cost, 0)}`
    const co2    = s.co2_avoided_kg != null ? fmt(s.co2_avoided_kg, 0) + " kg" : "—"
    const savings = s.cost_savings_vs_no_solar != null ? "$" + fmt(s.cost_savings_vs_no_solar, 0) : "—"
    tbody.innerHTML += `
      <tr>
        <td>${s.scenario_label}</td>
        <td>${cost}</td>
        <td>${co2}</td>
        <td>${fmt(s.avg_self_sufficiency, 1)}%</td>
        <td>${savings}</td>
      </tr>`
  })
  // Clarification note below table
  const note = document.querySelector("#comparison-note")
  if (note) {
    const numHouses = allData.houseData?.["well_designed"]?.length ?? "—"
    const numDays   = allData.timeData?.["well_designed"]?.["daily"]?.length + 1 || "—"
    note.innerHTML  = `Table and gauge figures are totals for the full neighborhood (${numHouses} households, ${numDays} simulated days). Annual Cost is net energy cost after grid exports. CO₂ Avoided is relative to a no-solar baseline. Savings vs No Solar = baseline cost − scenario cost.`
  }
}

// ─────────────────────────────────────────────
//  DYNAMIC IMPACT CARDS
// ─────────────────────────────────────────────
function populateImpactCards() {
  const optimized = allData.overviewData.scenarios.find(s => s.scenario === "well_designed")
  if (!optimized) return
  const numDays = allData.timeData?.["well_designed"]?.["daily"]?.length + 1 || 360

  const savingsEl = document.querySelector("#impact-savings")
  const co2El     = document.querySelector("#impact-co2")
  const ssEl      = document.querySelector("#impact-ss")
  if (savingsEl) savingsEl.textContent = "$" + fmt(optimized.cost_savings_vs_no_solar, 0)
  if (co2El)     co2El.textContent     = fmt(optimized.co2_avoided_kg, 0) + " kg"
  if (ssEl)      ssEl.textContent      = fmt(optimized.avg_self_sufficiency, 1) + "%"

  // Update labels dynamically
  const savingsCard = savingsEl?.closest(".impact-card")?.querySelector("p")
  const co2Card     = co2El?.closest(".impact-card")?.querySelector("p")
  if (savingsCard) savingsCard.textContent = `Savings vs No Solar over ${numDays} days`
  if (co2Card)     co2Card.textContent     = `CO₂ Avoided over ${numDays} days (kg)`
}

// ─────────────────────────────────────────────
//  PARADOX — DUCK CURVE (independent copy)
// ─────────────────────────────────────────────
let paradoxScenario = "no_solar"

function initParadoxDuck() {
  // Inject dropdown into paradox toggle
  if (!document.getElementById("paradoxDuckDropdown")) {
    const toggle = document.querySelector("#paradoxToggle")
    const dropWrapper = document.createElement("div")
    dropWrapper.style.cssText = "display:flex;align-items:center;gap:8px;margin-left:16px;"
    dropWrapper.innerHTML = `
      <label style="font-size:13px;color:#4a6358;font-family:Poppins,sans-serif;font-weight:600;">Show:</label>
      <select id="paradoxDuckDropdown" style="font-family:Poppins,sans-serif;font-size:13px;padding:6px 14px;border-radius:20px;border:1.5px solid #2c7a55;color:#1e2b24;background:#fff;cursor:pointer;outline:none;">
        <option value="all">All Lines</option>
        <option value="load">Grid Load</option>
      </select>
    `
    toggle.appendChild(dropWrapper)
    document.getElementById("paradoxDuckDropdown").addEventListener("change", function() {
      applyParadoxLineFilter(this.value)
    })
  }

  // Wire scenario buttons
  document.querySelectorAll("#paradoxToggle .scenario-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      document.querySelectorAll("#paradoxToggle .scenario-btn").forEach(b => b.classList.remove("active"))
      this.classList.add("active")
      paradoxScenario = this.getAttribute("data-pscenario")
      updateParadoxDropdown()
      if (paradoxScenario === "no_solar") renderParadoxNoSolar()
      else renderParadoxDuck(allData.duckData[paradoxScenario === "bad_design" ? "unadvised" : "well_designed"])
    })
  })

  renderParadoxNoSolar()
}

function updateParadoxDropdown() {
  const sel = document.getElementById("paradoxDuckDropdown")
  if (!sel) return
  if (paradoxScenario === "no_solar") {
    sel.innerHTML = `<option value="all">All Lines</option><option value="load">Grid Load</option>`
  } else {
    sel.innerHTML = `
      <option value="all">All Lines</option>
      <option value="load">Load</option>
      <option value="solar">Solar Generation</option>
      <option value="net">Net Load (Duck)</option>
    `
  }
  sel.value = "all"
}

function applyParadoxLineFilter(value) {
  const svg = d3.select("#paradoxDuckCurve svg g")
  if (svg.empty()) return
  svg.selectAll(".pduck-load").transition().duration(300).attr("opacity", value === "all" || value === "load"  ? 1 : 0)
  svg.selectAll(".pduck-solar").transition().duration(300).attr("opacity", value === "all" || value === "solar" ? 1 : 0)
  svg.selectAll(".pduck-net").transition().duration(300).attr("opacity", value === "all" || value === "net"   ? 1 : 0)
}

function renderParadoxNoSolar() {
  const data = allData.duckData["well_designed"]
  d3.select("#paradoxDuckCurve").selectAll("*").remove()

  const container = document.querySelector("#paradoxDuckCurve")
  const totalW = container ? container.clientWidth - 80 : 720
  const margin = { top: 60, right: 180, bottom: 50, left: 70 }
  const width  = totalW - margin.left - margin.right
  const height = 380

  const svgEl = d3.select("#paradoxDuckCurve").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  const svg = svgEl.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

  svgEl.append("text")
    .attr("x", margin.left + width / 2).attr("y", 28)
    .attr("text-anchor","middle").style("font-size","15px").style("font-weight","600")
    .style("fill","#1e2b24").style("font-family","Poppins,sans-serif")
    .text("Daily Load Profile — No Solar")

  const x = d3.scaleLinear().domain([0, 23]).range([0, width])
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.avg_load_kw) * 1.2]).range([height, 0])

  svg.append("g").attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(24).tickFormat(h => `${h}h`))
    .selectAll("text").style("font-size","11px")
  svg.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(d => `${d.toFixed(1)} kW`))
    .selectAll("text").style("font-size","11px")

  svg.append("text")
    .attr("x", width / 2).attr("y", height + 48)
    .attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86")
    .style("font-family","Poppins,sans-serif").text("Time of Day")

  svg.append("text")
    .attr("transform","rotate(-90)")
    .attr("x", -height / 2).attr("y", -52)
    .attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86")
    .style("font-family","Poppins,sans-serif").text("Power (kW)")

  const line = d3.line().x(d => x(d.hour)).y(d => y(d.avg_load_kw)).curve(d3.curveMonotoneX)
  const area = d3.area().x(d => x(d.hour)).y0(height).y1(d => y(d.avg_load_kw)).curve(d3.curveMonotoneX)

  svg.append("path").datum(data).attr("class","pduck-load")
    .attr("fill","#fce4e4").attr("opacity",0.6).attr("d",area)
  const lp = svg.append("path").datum(data).attr("class","pduck-load")
    .attr("fill","none").attr("stroke","#e53935").attr("stroke-width",2.5).attr("d",line)
  animatePath(lp, 0)

  svg.selectAll(".hover-bar").data(data).enter().append("rect")
    .attr("class","hover-bar")
    .attr("x", d => x(d.hour) - width/24/2).attr("y",0)
    .attr("width", width/24).attr("height",height).attr("fill","transparent")
    .on("mouseover", (event,d) => showTooltip(`<strong>Hour ${d.hour}:00</strong><br>Load: ${fmtKw(d.avg_load_kw)}<br><em style="color:#aaa">No solar — 100% grid</em>`))
    .on("mousemove", moveTooltip).on("mouseout", hideTooltip)

  // Legend right
  const lgP = svg.append("g").attr("transform",`translate(${width + 8}, 0)`)
  lgP.append("line").attr("x1",0).attr("x2",20).attr("y1",8).attr("y2",8).attr("stroke","#e53935").attr("stroke-width",2.5)
  lgP.append("text").attr("x",26).attr("y",12).style("font-size","12px").style("fill","#444")
    .style("font-family","Poppins,sans-serif").text("Grid Load")
  // Update source note
  const numDays1 = allData.timeData?.["well_designed"]?.["daily"]?.length + 1 || 360
  const sn1 = document.getElementById("paradox-source-note")
  if (sn1) sn1.textContent = `Each point is the average power (kW) at that hour, computed across ${numDays1} simulated days · no_solar scenario`
}

function renderParadoxDuck(data) {
  d3.select("#paradoxDuckCurve").selectAll("*").remove()

  const container = document.querySelector("#paradoxDuckCurve")
  const totalW = container ? container.clientWidth - 80 : 720
  const margin = { top: 60, right: 180, bottom: 50, left: 70 }
  const width  = totalW - margin.left - margin.right
  const height = 380

  const svgEl = d3.select("#paradoxDuckCurve").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  const svg = svgEl.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

  const titleLabel = paradoxScenario === "bad_design"
    ? "Duck Curve — Unadvised Solar System"
    : "Duck Curve — Well Designed Solar System"
  svgEl.append("text")
    .attr("x", margin.left + width / 2).attr("y", 28)
    .attr("text-anchor","middle").style("font-size","15px").style("font-weight","600")
    .style("fill","#1e2b24").style("font-family","Poppins,sans-serif")
    .text(titleLabel)

  const x = d3.scaleLinear().domain([0, 23]).range([0, width])
  const yMin = d3.min(data, d => d.avg_net_load_kw)
  const yMax = d3.max(data, d => Math.max(d.avg_load_kw, d.avg_solar_kw))
  const y = d3.scaleLinear().domain([yMin * 1.15, yMax * 1.1]).range([height, 0])

  svg.append("line").attr("x1",0).attr("x2",width).attr("y1",y(0)).attr("y2",y(0))
    .attr("stroke","#ccc").attr("stroke-dasharray","4,3")
  svg.append("g").attr("transform",`translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(24).tickFormat(h=>`${h}h`)).selectAll("text").style("font-size","11px")
  svg.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(d=>`${d.toFixed(1)} kW`)).selectAll("text").style("font-size","11px")

  svg.append("text")
    .attr("x", width / 2).attr("y", height + 48)
    .attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86")
    .style("font-family","Poppins,sans-serif").text("Time of Day")

  svg.append("text")
    .attr("transform","rotate(-90)")
    .attr("x", -height / 2).attr("y", -54)
    .attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86")
    .style("font-family","Poppins,sans-serif").text("Power (kW)")

  const surplusPoints = []
  for (let i = 0; i < data.length; i++) {
    const cur = data[i], prev = data[i-1], next = data[i+1]
    if (prev && prev.avg_net_load_kw >= 0 && cur.avg_net_load_kw < 0) {
      const t = prev.avg_net_load_kw / (prev.avg_net_load_kw - cur.avg_net_load_kw)
      surplusPoints.push({ hour: prev.hour + t*(cur.hour-prev.hour), avg_net_load_kw: 0 })
    }
    if (cur.avg_net_load_kw < 0) surplusPoints.push(cur)
    if (next && cur.avg_net_load_kw < 0 && next.avg_net_load_kw >= 0) {
      const t = cur.avg_net_load_kw / (cur.avg_net_load_kw - next.avg_net_load_kw)
      surplusPoints.push({ hour: cur.hour + t*(next.hour-cur.hour), avg_net_load_kw: 0 })
    }
  }
  svg.append("path").datum(surplusPoints).attr("class","pduck-net pduck-solar")
    .attr("fill","#c8f0d8").attr("opacity",0.6)
    .attr("d", d3.area().x(d=>x(d.hour)).y0(y(0)).y1(d=>y(d.avg_net_load_kw)).curve(d3.curveLinear))
  svg.append("path").datum(data).attr("class","pduck-net")
    .attr("fill","#fce4e4").attr("opacity",0.4)
    .attr("d", d3.area().x(d=>x(d.hour)).y0(y(0)).y1(d=>y(Math.max(0,d.avg_net_load_kw))).curve(d3.curveMonotoneX))

  const netP = svg.append("path").datum(data).attr("class","pduck-net")
    .attr("fill","none").attr("stroke","#e53935").attr("stroke-width",2.5).attr("stroke-dasharray","6,3")
    .attr("d", d3.line().x(d=>x(d.hour)).y(d=>y(d.avg_net_load_kw)).curve(d3.curveMonotoneX))
  const loadP = svg.append("path").datum(data).attr("class","pduck-load")
    .attr("fill","none").attr("stroke","#37474f").attr("stroke-width",2.5)
    .attr("d", d3.line().x(d=>x(d.hour)).y(d=>y(d.avg_load_kw)).curve(d3.curveMonotoneX))
  const solarP = svg.append("path").datum(data).attr("class","pduck-solar")
    .attr("fill","none").attr("stroke","#fbc02d").attr("stroke-width",2.5)
    .attr("d", d3.line().x(d=>x(d.hour)).y(d=>y(d.avg_solar_kw)).curve(d3.curveMonotoneX))

  animatePath(netP, 0)
  animatePath(loadP, 300)
  animatePath(solarP, 600)

  svg.selectAll(".hover-bar").data(data).enter().append("rect")
    .attr("class","hover-bar")
    .attr("x",d=>x(d.hour)-width/24/2).attr("y",0).attr("width",width/24).attr("height",height)
    .attr("fill","transparent")
    .on("mouseover",(event,d)=>showTooltip(`<strong>Hour ${d.hour}:00</strong><br>Load: ${fmtKw(d.avg_load_kw)}<br>Solar: ${fmtKw(d.avg_solar_kw)}<br>Net Load: ${fmtKw(d.avg_net_load_kw)}`))
    .on("mousemove",moveTooltip).on("mouseout",hideTooltip)

  // Legend right
  const legendItems2 = [
    {color:"#37474f", label:"Load",     dash:null},
    {color:"#fbc02d", label:"Solar",    dash:null},
    {color:"#e53935", label:"Net Load", dash:"6,3"}
  ]
  legendItems2.forEach((item, i) => {
    const g = svg.append("g").attr("transform",`translate(${width + 8}, ${i * 22})`)
    g.append("line").attr("x1",0).attr("x2",20).attr("y1",8).attr("y2",8)
      .attr("stroke",item.color).attr("stroke-width",2.5).attr("stroke-dasharray",item.dash||"none")
    g.append("text").attr("x",26).attr("y",12).style("font-size","12px").style("fill","#444")
      .style("font-family","Poppins,sans-serif").text(item.label)
  })
  const numDays2 = allData.timeData?.["well_designed"]?.["daily"]?.length + 1 || 360
  const scenLabel = paradoxScenario === "bad_design" ? "unadvised" : paradoxScenario === "optimized" ? "well_designed" : "no_solar"
  const sn2 = document.getElementById("paradox-source-note")
  if (sn2) sn2.textContent = `Each point is the average power (kW) at that hour, computed across ${numDays2} simulated days · ${scenLabel} scenario`
}

// ─────────────────────────────────────────────
//  PARADOX — 24H CLOCK
// ─────────────────────────────────────────────
function initParadoxClock() {
  const data = allData.duckData["well_designed"]
  if (!data) return

  const peakSolarHour = data.reduce((max, d) => d.avg_solar_kw > max.avg_solar_kw ? d : max, data[0]).hour
  const peakLoadHour  = data.reduce((max, d) => d.avg_load_kw  > max.avg_load_kw  ? d : max, data[0]).hour
  const gapHours      = Math.abs(peakLoadHour - peakSolarHour)

  // Scale: hour → degrees (0h at top = 0deg, clockwise)
  const twenty4 = d3.scaleLinear().domain([0, 24]).range([0, 360])
  const rad = Math.PI / 180

  const clockRadius  = 160
  const margin       = 50
  const w            = (clockRadius + margin) * 2
  const h            = (clockRadius + margin) * 2 + 64
  const cx           = w / 2
  const cy           = clockRadius + margin

  const innerLabelR  = clockRadius - 30   // big 0h/6h/12h/18h inside
  const outerLabelR  = clockRadius + 22   // all hour numbers outside
  const needleLen    = -(clockRadius - 68)

  const svg = d3.select("#paradoxClock").append("svg")
    .attr("width", w).attr("height", h)

  const face = svg.append("g").attr("transform", `translate(${cx},${cy})`)

  // ── Background circle ──────────────────────
  face.append("circle").attr("r", clockRadius)
    .attr("fill","#fff").attr("stroke","#dde8e2").attr("stroke-width", 2)

  // ── Gap arc ────────────────────────────────
  const solarArcDeg = twenty4(peakSolarHour)
  const loadArcDeg  = twenty4(peakLoadHour)
  face.append("path")
    .attr("d", d3.arc()
      .innerRadius(0).outerRadius(clockRadius - 4)
      .startAngle(solarArcDeg * rad)
      .endAngle(loadArcDeg * rad)())
    .attr("fill","#fff9c4").attr("opacity", 0.85)

  // ── Tick marks INSIDE ring ─────────────────
  face.selectAll(".hour-tick")
    .data(d3.range(0, 24))
    .enter().append("line")
    .attr("class","hour-tick")
    .attr("x1", 0).attr("x2", 0)
    .attr("y1", clockRadius)
    .attr("y2", d => d % 6 === 0 ? clockRadius - 14 : clockRadius - 7)
    .attr("stroke", d => d % 6 === 0 ? "#4a6358" : "#b0c8c0")
    .attr("stroke-width", d => d % 6 === 0 ? 2 : 1)
    .attr("transform", d => `rotate(${twenty4(d)})`)

  // ── All hour labels INSIDE ─────────────────
  face.selectAll(".inner-num")
    .data(d3.range(0, 24))
    .enter().append("text")
    .attr("class","inner-num")
    .attr("text-anchor","middle")
    .attr("x", d =>  innerLabelR * Math.sin(twenty4(d) * rad))
    .attr("y", d => -innerLabelR * Math.cos(twenty4(d) * rad) + 4)
    .style("font-size", d => d % 6 === 0 ? "12px" : "9px")
    .style("font-weight", d => d % 6 === 0 ? "700" : "400")
    .style("fill", d => d % 6 === 0 ? "#2c7a55" : "#9ab0a8")
    .style("font-family","Poppins,sans-serif")
    .text(d => `${d}h`)



  // ── Center pivot ───────────────────────────
  face.append("circle").attr("r", 7).attr("fill","#1e2b24")

  // ── Center text ────────────────────────────
  face.append("text").attr("x", -38).attr("y", -18)
    .attr("text-anchor","middle")
    .style("font-size","30px").style("font-weight","800")
    .style("fill","#1e2b24").style("font-family","Poppins,sans-serif")
    .text(`${gapHours}h`)
  face.append("text").attr("x", -38).attr("y", 12)
    .attr("text-anchor","middle")
    .style("font-size","11px").style("fill","#7c8f86")
    .style("font-family","Poppins,sans-serif")
    .text("gap")

  // ── Needle function (rotate approach like Observable) ──
  function drawNeedle(hour, color, animDelay) {
    const deg = twenty4(hour)
    const needle = face.append("line")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", 0).attr("y2", 0)   // start collapsed
      .attr("stroke", color).attr("stroke-width", 3.5)
      .attr("stroke-linecap","round")
      .attr("transform","rotate(0)")

    const dot = face.append("circle")
      .attr("cx", 0).attr("cy", 0).attr("r", 9)
      .attr("fill", color).attr("stroke","#fff").attr("stroke-width", 2)
      .attr("transform","rotate(0)")

    needle.transition().delay(animDelay).duration(900)
      .ease(d3.easeElastic.period(0.5))
      .attr("y2", needleLen)
      .attr("transform", `rotate(${deg})`)

    dot.transition().delay(animDelay).duration(900)
      .ease(d3.easeElastic.period(0.5))
      .attr("cy", needleLen)
      .attr("transform", `rotate(${deg})`)
  }

  // ── Legend ────────────────────────────────
  // Two items centered under the clock, with enough gap between them
  const legendY  = cy + clockRadius + 38
  const itemW    = 160   // width budget per item
  const totalW   = itemW * 2
  const startX   = cx - totalW / 2
  const items = [
    { color:"#fbc02d", label:`Solar peak  ${peakSolarHour}:00h` },
    { color:"#e53935", label:`Demand peak  ${peakLoadHour}:00h` }
  ]
  items.forEach(({color, label}, i) => {
    const lx = startX + i * itemW
    svg.append("circle").attr("cx", lx + 7).attr("cy", legendY).attr("r", 7).attr("fill", color)
    svg.append("text").attr("x", lx + 20).attr("y", legendY)
      .attr("dominant-baseline","middle")
      .style("font-size","12px").style("font-weight","600")
      .style("fill","#4a6358").style("font-family","Poppins,sans-serif")
      .text(label)
  })

  // ── Animate on scroll ──────────────────────
  let animated = false
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !animated) {
      animated = true
      drawNeedle(peakSolarHour, "#fbc02d", 0)
      drawNeedle(peakLoadHour,  "#e53935", 400)
    }
  }, { threshold: 0.4 })
  observer.observe(document.getElementById("paradoxClock"))
}

// ─────────────────────────────────────────────
//  1. DUCK CURVE
// ─────────────────────────────────────────────
function initDuckCurve() {
  // #duckCurve was removed from HTML in narrative redesign — nothing to do
  if (!document.querySelector("#duckCurve")) return
}

function animatePath(path, delay) {
  const len = path.node().getTotalLength()
  const origDash = path.attr("stroke-dasharray")
  path
    .attr("stroke-dasharray", `${len} ${len}`)
    .attr("stroke-dashoffset", len)
    .transition()
    .delay(delay || 0)
    .duration(1300)
    .ease(d3.easeQuadInOut)
    .attr("stroke-dashoffset", 0)
    .on("end", () => {
      // restore original dash pattern (e.g. "6,3" for net load)
      if (origDash && origDash !== "none") {
        path.attr("stroke-dasharray", origDash)
      } else {
        path.attr("stroke-dasharray", null)
      }
      path.attr("stroke-dashoffset", null)
    })
}

function applyDuckLineFilter(value) {
  const svg = d3.select("#duckCurve svg g")
  if (svg.empty()) return
  // path classes: duck-load, duck-solar, duck-net
  const show = {
    load:  value === "all" || value === "load",
    solar: value === "all" || value === "solar",
    net:   value === "all" || value === "net"
  }
  svg.selectAll(".duck-load").transition().duration(300).attr("opacity", show.load  ? 1 : 0)
  svg.selectAll(".duck-solar").transition().duration(300).attr("opacity", show.solar ? 1 : 0)
  svg.selectAll(".duck-net").transition().duration(300).attr("opacity", show.net   ? 1 : 0)
}

function updateDuckDropdown(scenario) {
  const sel = document.getElementById("duckLineDropdown")
  if (!sel) return
  if (scenario === "no_solar") {
    sel.innerHTML = `
      <option value="all">All Lines</option>
      <option value="load">Grid Load</option>
    `
  } else {
    sel.innerHTML = `
      <option value="all">All Lines</option>
      <option value="load">Load</option>
      <option value="solar">Solar Generation</option>
      <option value="net">Net Load (Duck)</option>
    `
  }
  sel.value = "all"
}

function renderNoSolarDuck() {
  const data = allData.duckData["well_designed"]
  d3.select("#duckCurve").selectAll("*").remove()

  const container = document.querySelector("#duckCurve")
  const totalW = container ? container.clientWidth - 80 : 720
  const margin = { top: 60, right: 180, bottom: 50, left: 70 }
  const width  = totalW - margin.left - margin.right
  const height = 380

  const svgEl = d3.select("#duckCurve").append("svg")
    .attr("width",  width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  const svg = svgEl.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

  svgEl.append("text")
    .attr("x", margin.left + width / 2).attr("y", 28)
    .attr("text-anchor","middle").style("font-size","15px").style("font-weight","600")
    .style("fill","#1e2b24").style("font-family","Poppins,sans-serif")
    .text("Daily Load Profile — No Solar")

  const x = d3.scaleLinear().domain([0, 23]).range([0, width])
  const yMax = d3.max(data, d => d.avg_load_kw) * 1.2
  const y = d3.scaleLinear().domain([0, yMax]).range([height, 0])

  svg.append("g").attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(24).tickFormat(h => `${h}h`))
    .selectAll("text").style("font-size", "11px")
  svg.append("g")
    .call(d3.axisLeft(y).ticks(6).tickFormat(d => `${d.toFixed(1)} kW`))
    .selectAll("text").style("font-size", "11px")

  svg.append("text")
    .attr("x", width / 2).attr("y", height + 48)
    .attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86")
    .style("font-family","Poppins,sans-serif").text("Time of Day")

  svg.append("text")
    .attr("transform","rotate(-90)")
    .attr("x", -height / 2).attr("y", -52)
    .attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86")
    .style("font-family","Poppins,sans-serif").text("Power (kW)")

  updateDuckDropdown("no_solar")

  const line = d3.line().x(d => x(d.hour)).y(d => y(d.avg_load_kw)).curve(d3.curveMonotoneX)
  const area = d3.area().x(d => x(d.hour)).y0(height).y1(d => y(d.avg_load_kw)).curve(d3.curveMonotoneX)

  svg.append("path").datum(data).attr("class", "duck-load")
    .attr("fill", "#fce4e4").attr("opacity", 0.6).attr("d", area)
  const linePath = svg.append("path").datum(data).attr("class", "duck-load")
    .attr("fill", "none").attr("stroke", "#e53935").attr("stroke-width", 2.5).attr("d", line)
  animatePath(linePath, 0)

  svg.selectAll(".hover-bar").data(data).enter().append("rect")
    .attr("class", "hover-bar")
    .attr("x", d => x(d.hour) - (width / 24 / 2))
    .attr("y", 0).attr("width", width / 24).attr("height", height)
    .attr("fill", "transparent")
    .on("mouseover", (event, d) => showTooltip(
      `<strong>Hour ${d.hour}:00</strong><br>Load: ${fmtKw(d.avg_load_kw)}<br><em style="color:#aaa">No solar — 100% grid</em>`
    ))
    .on("mousemove", moveTooltip).on("mouseout", hideTooltip)

  // Legend right
  const lgD = svg.append("g").attr("transform",`translate(${width + 8}, 0)`)
  lgD.append("line").attr("x1",0).attr("x2",20).attr("y1",8).attr("y2",8).attr("stroke","#e53935").attr("stroke-width",2.5)
  lgD.append("text").attr("x",26).attr("y",12).style("font-size","12px").style("fill","#444")
    .style("font-family","Poppins,sans-serif").text("Grid Load")
  // Update source note
  const sn3 = document.getElementById("duck-source-note")
  if (sn3) sn3.textContent = "360-day aggregated avg · no_solar scenario"
}

function drawDuckCurve(data) {
  d3.select("#duckCurve").selectAll("*").remove()
  updateDuckDropdown("solar")

  const container = document.querySelector("#duckCurve")
  const totalW = container ? container.clientWidth - 80 : 720
  const margin = { top: 60, right: 180, bottom: 50, left: 70 }
  const width  = totalW - margin.left - margin.right
  const height = 380

  const svgEl = d3.select("#duckCurve").append("svg")
    .attr("width",  width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  const svg = svgEl.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

  const duckTitle = currentDuckScenario === "unadvised"
    ? "Duck Curve — Unadvised Solar System"
    : "Duck Curve — Well Designed Solar System"
  svgEl.append("text")
    .attr("x", margin.left + width / 2).attr("y", 28)
    .attr("text-anchor","middle").style("font-size","15px").style("font-weight","600")
    .style("fill","#1e2b24").style("font-family","Poppins,sans-serif")
    .text(duckTitle)

  const x = d3.scaleLinear().domain([0, 23]).range([0, width])
  const yMin = d3.min(data, d => d.avg_net_load_kw)
  const yMax = d3.max(data, d => Math.max(d.avg_load_kw, d.avg_solar_kw))
  const y = d3.scaleLinear().domain([yMin * 1.15, yMax * 1.1]).range([height, 0])

  svg.append("line")
    .attr("x1",0).attr("x2",width).attr("y1",y(0)).attr("y2",y(0))
    .attr("stroke","#ccc").attr("stroke-dasharray","4,3")

  svg.append("g").attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(24).tickFormat(h => `${h}h`))
    .selectAll("text").style("font-size","11px")
  svg.append("g")
    .call(d3.axisLeft(y).ticks(6).tickFormat(d => `${d.toFixed(1)} kW`))
    .selectAll("text").style("font-size","11px")

  svg.append("text")
    .attr("x", width / 2).attr("y", height + 48)
    .attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86")
    .style("font-family","Poppins,sans-serif").text("Time of Day")

  svg.append("text")
    .attr("transform","rotate(-90)")
    .attr("x", -height / 2).attr("y", -54)
    .attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86")
    .style("font-family","Poppins,sans-serif").text("Power (kW)")

  // Surplus fill (solar > load) — interpolate zero-crossings so edges meet y=0 cleanly
  const surplusPoints = []
  for (let i = 0; i < data.length; i++) {
    const cur  = data[i]
    const prev = data[i - 1]
    // Entering negative territory: insert interpolated crossing point before cur
    if (prev && prev.avg_net_load_kw >= 0 && cur.avg_net_load_kw < 0) {
      const t = prev.avg_net_load_kw / (prev.avg_net_load_kw - cur.avg_net_load_kw)
      surplusPoints.push({ hour: prev.hour + t * (cur.hour - prev.hour), avg_net_load_kw: 0 })
    }
    if (cur.avg_net_load_kw < 0) surplusPoints.push(cur)
    // Leaving negative territory: insert interpolated crossing point after cur
    const next = data[i + 1]
    if (next && cur.avg_net_load_kw < 0 && next.avg_net_load_kw >= 0) {
      const t = cur.avg_net_load_kw / (cur.avg_net_load_kw - next.avg_net_load_kw)
      surplusPoints.push({ hour: cur.hour + t * (next.hour - cur.hour), avg_net_load_kw: 0 })
    }
  }
  const surplusArea = d3.area()
    .x(d => x(d.hour)).y0(y(0)).y1(d => y(d.avg_net_load_kw))
    .curve(d3.curveLinear)
  svg.append("path").datum(surplusPoints)
    .attr("class","duck-net duck-solar")
    .attr("fill","#c8f0d8").attr("opacity",0.6).attr("d",surplusArea)

  // Deficit fill
  const deficitArea = d3.area()
    .x(d => x(d.hour)).y0(d => y(0)).y1(d => y(Math.max(0, d.avg_net_load_kw)))
    .curve(d3.curveMonotoneX)
  svg.append("path").datum(data)
    .attr("class","duck-net")
    .attr("fill","#fce4e4").attr("opacity",0.4).attr("d",deficitArea)

  // Net load line (the duck)
  const netLine = d3.line()
    .x(d => x(d.hour)).y(d => y(d.avg_net_load_kw))
    .curve(d3.curveMonotoneX)
  const netPath = svg.append("path").datum(data)
    .attr("class","duck-net")
    .attr("fill","none").attr("stroke","#e53935").attr("stroke-width",2.5)
    .attr("stroke-dasharray","6,3").attr("d",netLine)
  animatePath(netPath, 0)

  // Load line
  const loadLine = d3.line()
    .x(d => x(d.hour)).y(d => y(d.avg_load_kw))
    .curve(d3.curveMonotoneX)
  const loadPath = svg.append("path").datum(data)
    .attr("class","duck-load")
    .attr("fill","none").attr("stroke","#37474f").attr("stroke-width",2.5).attr("d",loadLine)
  animatePath(loadPath, 300)

  // Solar line
  const solarLine = d3.line()
    .x(d => x(d.hour)).y(d => y(d.avg_solar_kw))
    .curve(d3.curveMonotoneX)
  const solarPath = svg.append("path").datum(data)
    .attr("class","duck-solar")
    .attr("fill","none").attr("stroke","#fbc02d").attr("stroke-width",2.5).attr("d",solarLine)
  animatePath(solarPath, 600)

  // Hover overlay
  svg.selectAll(".hover-bar").data(data).enter().append("rect")
    .attr("class","hover-bar")
    .attr("x", d => x(d.hour) - (width / 24 / 2))
    .attr("y",0).attr("width", width / 24).attr("height",height)
    .attr("fill","transparent")
    .on("mouseover", (event, d) => showTooltip(`
      <strong>Hour ${d.hour}:00</strong><br>
      Load: ${fmtKw(d.avg_load_kw)}<br>
      Solar: ${fmtKw(d.avg_solar_kw)}<br>
      Net Load: ${fmtKw(d.avg_net_load_kw)}<br>
      Battery SoC: ${fmt(d.avg_battery_soc)}%
    `))
    .on("mousemove", moveTooltip).on("mouseout", hideTooltip)

  // Update source note
  const sn4 = document.getElementById("duck-source-note")
  if (sn4) sn4.textContent = `360-day aggregated avg · ${currentDuckScenario} scenario`
  // Legend right
  const legendItems4 = [
    { color: "#37474f", label: "Load",     dash: null },
    { color: "#fbc02d", label: "Solar",    dash: null },
    { color: "#e53935", label: "Net Load", dash: "6,3" }
  ]
  legendItems4.forEach((item, i) => {
    const g = svg.append("g").attr("transform",`translate(${width + 8}, ${i * 22})`)
    g.append("line").attr("x1",0).attr("x2",20).attr("y1",8).attr("y2",8)
      .attr("stroke",item.color).attr("stroke-width",2.5).attr("stroke-dasharray",item.dash||"none")
    g.append("text").attr("x",26).attr("y",12).style("font-size","12px").style("fill","#444")
      .style("font-family","Poppins,sans-serif").text(item.label)
  })
}

// ─────────────────────────────────────────────
//  2. HOUSE SCATTER PLOT
// ─────────────────────────────────────────────
function initHouseScatter() {
  const toggleContainer = document.querySelector("#scatterToggleContainer")
  if (toggleContainer && !toggleContainer.querySelector(".scatter-toggle")) {
    const toggle = document.createElement("div")
    toggle.className = "scenario-toggle scatter-toggle"
    toggle.style.marginBottom = "16px"
    toggle.innerHTML = `
      <button class="scenario-btn active" data-scatter="well_designed">Well Designed</button>
      <button class="scenario-btn" data-scatter="unadvised">Unadvised</button>
    `
    toggleContainer.appendChild(toggle)
    toggle.querySelectorAll(".scenario-btn").forEach(btn => {
      btn.addEventListener("click", function() {
        toggle.querySelectorAll(".scenario-btn").forEach(b => b.classList.remove("active"))
        this.classList.add("active")
        currentScatterScenario = this.getAttribute("data-scatter")
        drawHouseScatter(allData.houseData[currentScatterScenario])
      })
    })
  }
  drawHouseScatter(allData.houseData["well_designed"])
}

function drawHouseScatter(data) {
  d3.select("#houseScatter").selectAll("svg").remove()

  const container = document.querySelector("#houseScatter")
  const totalW = container ? container.clientWidth - 80 : 720
  const margin = { top: 30, right: 160, bottom: 60, left: 70 }
  const width  = totalW - margin.left - margin.right
  const height = 380

  const svg = d3.select("#houseScatter")
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total_solar_kwh) * 1.05]).range([0, width])
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total_load_kwh) * 1.05]).range([height, 0])

  const colorMap = { low:"#64b5f6", middle:"#81c784", high:"#ffb74d", luxury:"#ba68c8" }
  const shapeMap = {
    studio_1_bed: d3.symbolCircle,
    small_family: d3.symbolSquare,
    large_family: d3.symbolTriangle
  }

  // Chart title
  svg.append("text").attr("x",width/2).attr("y",-8)
    .attr("text-anchor","middle").style("font-size","14px").style("font-weight","600")
    .style("fill","#1e2b24").style("font-family","Poppins,sans-serif")
    .text("Solar Generation vs Energy Consumption per Household")

  svg.append("g").attr("transform",`translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d => `${(d/1000).toFixed(0)}k`))
    .selectAll("text").style("font-size","11px")
  svg.append("g")
    .call(d3.axisLeft(y).ticks(6).tickFormat(d => `${(d/1000).toFixed(0)}k`))
    .selectAll("text").style("font-size","11px")

  svg.append("text").attr("x",width/2).attr("y",height+45)
    .attr("text-anchor","middle").style("font-size","12px").style("fill","#666")
    .text("Solar Generated (kWh)")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-55)
    .attr("text-anchor","middle").style("font-size","12px").style("fill","#666")
    .text("Energy Consumed (kWh)")

  const maxVal = Math.max(d3.max(data,d=>d.total_solar_kwh), d3.max(data,d=>d.total_load_kwh))
  svg.append("line")
    .attr("x1",x(0)).attr("y1",y(0)).attr("x2",x(maxVal)).attr("y2",y(maxVal))
    .attr("stroke","#bbb").attr("stroke-dasharray","5,4").attr("stroke-width",1.5)
  svg.append("text").attr("x",x(maxVal*0.72)).attr("y",y(maxVal*0.72)-8)
    .style("font-size","11px").style("fill","#aaa").text("Break-even")

  data.forEach((d, i) => {
    const symbolGen = d3.symbol().type(shapeMap[d.household_type]||d3.symbolCircle).size(90)
    const tx = x(d.total_solar_kwh)
    const ty = y(d.total_load_kwh)
    const point = svg.append("path").attr("d", symbolGen)
      .attr("transform", `translate(${x(0)},${y(0)})`)  // start at origin
      .attr("fill", colorMap[d.wealth_level]||"#aaa")
      .attr("stroke","white").attr("stroke-width",1.5)
      .attr("opacity", 0)
      .on("mouseover", event => showTooltip(`
        <strong>${d.id}</strong><br>
        Type: ${d.household_type.replace(/_/g," ")}<br>
        Wealth: ${d.wealth_level}<br>
        Solar: ${fmtKwh(d.total_solar_kwh)}<br>
        Load: ${fmtKwh(d.total_load_kwh)}<br>
        Self-sufficiency: ${fmt(d.self_sufficiency_percent)}%<br>
        Net cost: $${fmt(d.net_cost,2)}
      `))
      .on("mousemove", moveTooltip).on("mouseout", hideTooltip)

    // Store target for animation
    point.node()._tx = tx
    point.node()._ty = ty
    point.node()._i  = i
  })

  // Scroll-triggered animation
  const svgNode = d3.select("#houseScatter svg").node()
  const observer = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return
    observer.disconnect()
    d3.select("#houseScatter svg g").selectAll("path[fill]")
      .filter(function() { return this._tx !== undefined })
      .each(function() {
        const node = d3.select(this)
        const delay = this._i * 40
        node.transition().delay(delay).duration(600)
          .ease(d3.easeCubicOut)
          .attr("transform", `translate(${this._tx},${this._ty})`)
          .attr("opacity", 0.85)
      })
  }, { threshold: 0.3 })
  if (svgNode) observer.observe(svgNode)

  const legendW = svg.append("g").attr("transform",`translate(${width+20},0)`)
  legendW.append("text").attr("x",0).attr("y",0)
    .style("font-size","12px").style("font-weight","600").style("fill","#444").text("Wealth")
  Object.entries(colorMap).forEach(([k,c],i) => {
    legendW.append("circle").attr("cx",6).attr("cy",18+i*20).attr("r",6).attr("fill",c)
    legendW.append("text").attr("x",18).attr("y",23+i*20)
      .style("font-size","11px").style("fill","#555").text(k.charAt(0).toUpperCase()+k.slice(1))
  })

  const legendT = svg.append("g").attr("transform",`translate(${width+20},110)`)
  legendT.append("text").attr("x",0).attr("y",0)
    .style("font-size","12px").style("font-weight","600").style("fill","#444").text("Type")
  Object.entries(shapeMap).forEach(([k,sym],i) => {
    const gen = d3.symbol().type(sym).size(60)
    legendT.append("path").attr("d",gen).attr("transform",`translate(8,${18+i*20})`).attr("fill","#888")
    legendT.append("text").attr("x",20).attr("y",23+i*20)
      .style("font-size","11px").style("fill","#555")
      .text(k.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()))
  })
}

// ─────────────────────────────────────────────
//  3. ENERGY BALANCE — timeseries (#timeseries)
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
//  BULLET CHART (#bulletChart)
// ─────────────────────────────────────────────
function initBulletChart() {
  const container = document.querySelector("#bulletChart")
  if (!container) return

  const scenarios = allData.overviewData.scenarios
  const ns = scenarios.find(s => s.scenario === "no_solar")
  const uv = scenarios.find(s => s.scenario === "unadvised")
  const wd = scenarios.find(s => s.scenario === "well_designed")
  if (!ns || !uv || !wd) return

  const numHousesBullet = allData.houseData?.["well_designed"]?.length || 24
  const divisorBullet   = solutionMode === "average" ? numHousesBullet : 1

  const data = [
    { label: "No Solar",      value: ns.total_net_cost / divisorBullet },
    { label: "Unadvised",     value: uv.total_net_cost / divisorBullet },
    { label: "Well Designed", value: wd.total_net_cost / divisorBullet }
  ]

  // Bar color — thresholds scale with mode
  const thr1 = solutionMode === "average" ? 1000 / numHousesBullet : 1000
  function barColor(v) {
    if (v < 0)    return "#2c7a55"
    if (v <= thr1) return "#ffb74d"
    return "#e57373"
  }

  const totalW = container.clientWidth - 80
  const margin = { top: 40, right: 120, bottom: 50, left: 130 }
  const width  = totalW - margin.left - margin.right
  const barH   = 42
  const gap    = 28
  const height = data.length * (barH + gap) - gap

  // Domain: pad a bit around min/max
  const minVal = Math.min((wd.total_net_cost / divisorBullet) * 1.3, -200 / divisorBullet)
  const maxVal = Math.max((ns.total_net_cost / divisorBullet) * 1.15, 200 / divisorBullet)

  const x = d3.scaleLinear().domain([minVal, maxVal]).range([0, width])

  const svg = d3.select("#bulletChart")
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  // Chart title
  const numDays    = allData.timeData?.["well_designed"]?.["daily"]?.length + 1 || 360
  const titleSuffix = solutionMode === "average" ? "Per Household Avg" : `All ${numHousesBullet} Households`

  svg.append("text")
    .attr("x", width / 2).attr("y", -20)
    .attr("text-anchor","middle")
    .style("font-size","13px").style("font-weight","600")
    .style("fill","#2c2c2c").style("font-family","Poppins,sans-serif")
    .text(`Net Cost over ${numDays} Days — ${titleSuffix}`)

  // Qualitative ranges (background bands)
  const ranges = [
    { x1: x(minVal),  x2: x(0),    color: "#e8f5e9", label: "Earns money" },
    { x1: x(0),       x2: x(thr1), color: "#fff8e1", label: "Pays little" },
    { x1: x(thr1),    x2: x(maxVal), color: "#ffebee", label: "High cost"  }
  ]

  data.forEach((d, i) => {
    const y = i * (barH + gap)

    // Background ranges
    ranges.forEach(r => {
      svg.append("rect")
        .attr("x", r.x1).attr("y", y)
        .attr("width", r.x2 - r.x1).attr("height", barH)
        .attr("fill", r.color).attr("rx", 3)
    })

    // Main bar — animate from x(0) outward
    const barX    = d.value >= 0 ? x(0) : x(d.value)
    const barW    = Math.abs(x(d.value) - x(0))

    svg.append("rect")
      .attr("x", d.value >= 0 ? x(0) : x(0))
      .attr("y", y + barH * 0.2)
      .attr("width", 0)
      .attr("height", barH * 0.6)
      .attr("fill", barColor(d.value)).attr("rx", 2)
      .transition().duration(700).delay(i * 150)
      .attr("x", barX)
      .attr("width", barW)

    // Value label
    svg.append("text")
      .attr("x", d.value >= 0 ? x(d.value) + 8 : x(d.value) - 8)
      .attr("y", y + barH / 2 + 5)
      .attr("text-anchor", d.value >= 0 ? "start" : "end")
      .style("font-size","13px").style("font-weight","600")
      .style("fill", barColor(d.value)).style("font-family","Poppins,sans-serif")
      .style("opacity", 0)
      .transition().duration(400).delay(i * 150 + 600)
      .style("opacity", 1)
      .text(d.value < 0 ? `-$${fmt(Math.abs(d.value), 0)}` : `$${fmt(d.value, 0)}`)

    // Row label
    svg.append("text")
      .attr("x", -10).attr("y", y + barH / 2 + 5)
      .attr("text-anchor","end")
      .style("font-size","12px").style("fill","#444")
      .style("font-family","Poppins,sans-serif")
      .text(d.label)
  })

  // Break-even line at x=0
  svg.append("line")
    .attr("x1", x(0)).attr("x2", x(0))
    .attr("y1", -8).attr("y2", height + 8)
    .attr("stroke","#333").attr("stroke-width", 2)
    .attr("stroke-dasharray","4,3")

  svg.append("text")
    .attr("x", x(0)).attr("y", -12)
    .attr("text-anchor","middle")
    .style("font-size","10px").style("fill","#555")
    .style("font-family","Poppins,sans-serif")
    .text("break-even")

  // X axis
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d => `$${d3.format(",.0f")(d)}`))
    .selectAll("text").style("font-size","10px")

  svg.append("text")
    .attr("x", width / 2).attr("y", height + 42)
    .attr("text-anchor","middle")
    .style("font-size","12px").style("fill","#666")
    .style("font-family","Poppins,sans-serif")
    .text(solutionMode === "average" ? "Net Cost per Household (USD)" : "Annual Net Cost (USD)")

  // Range legend — right side
  const rangeMeta = [
    { label: "Earns money", color: "#e8f5e9", tc: "#2c7a55" },
    { label: "Pays little", color: "#fff8e1", tc: "#f57f17" },
    { label: "High cost",   color: "#ffebee", tc: "#c62828" }
  ]
  const leg = svg.append("g").attr("transform", `translate(${width + 12}, 0)`)
  rangeMeta.forEach((r, i) => {
    leg.append("rect").attr("x", 0).attr("y", i * 22).attr("width", 12).attr("height", 12).attr("rx", 2).attr("fill", r.color).attr("stroke", "#ccc").attr("stroke-width", 0.5)
    leg.append("text").attr("x", 16).attr("y", i * 22 + 10).style("font-size","11px").style("fill", r.tc).style("font-family","Poppins,sans-serif").text(r.label)
  })
}

// ─────────────────────────────────────────────
//  CO2 BULLET CHART (#co2BulletChart)
// ─────────────────────────────────────────────
function initCo2BulletChart() {
  const container = document.querySelector("#co2BulletChart")
  if (!container) return

  const scenarios = allData.overviewData.scenarios
  const ns = scenarios.find(s => s.scenario === "no_solar")
  const uv = scenarios.find(s => s.scenario === "unadvised")
  const wd = scenarios.find(s => s.scenario === "well_designed")
  if (!ns || !uv || !wd) return

  const numHousesCo2 = allData.houseData?.["well_designed"]?.length || 24
  const divisorCo2   = solutionMode === "average" ? numHousesCo2 : 1

  // CO2 emitted = baseline - avoided (for solar scenarios)
  const nsEmissions = ns.co2_baseline_kg / divisorCo2
  const uvEmissions = (ns.co2_baseline_kg - uv.co2_avoided_kg) / divisorCo2
  const wdEmissions = (ns.co2_baseline_kg - wd.co2_avoided_kg) / divisorCo2

  const data = [
    { label: "No Solar",      value: nsEmissions },
    { label: "Unadvised",     value: uvEmissions },
    { label: "Well Designed", value: wdEmissions }
  ]

  // Thresholds scale with mode
  const thr20 = 20000 / divisorCo2
  const thr70 = 70000 / divisorCo2

  function barColor(v) {
    if (v < 0)      return "#2c7a55"
    if (v < thr20)  return "#2c7a55"
    if (v < thr70)  return "#ffb74d"
    return "#e57373"
  }

  const totalW = container.clientWidth - 80
  const margin = { top: 40, right: 120, bottom: 50, left: 130 }
  const width  = totalW - margin.left - margin.right
  const barH   = 42
  const gap    = 28
  const height = data.length * (barH + gap) - gap

  const minVal = Math.min(wdEmissions * 1.3, -5000 / divisorCo2)
  const maxVal = nsEmissions * 1.1
  const x = d3.scaleLinear().domain([minVal, maxVal]).range([0, width])

  const ranges = [
    { x1: x(minVal), x2: x(0),      color: "#e8f5e9" },
    { x1: x(0),      x2: x(thr20),  color: "#e8f5e9" },
    { x1: x(thr20),  x2: x(thr70),  color: "#fff8e1" },
    { x1: x(thr70),  x2: x(maxVal), color: "#ffebee" }
  ]

  const svg = d3.select("#co2BulletChart")
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  const numDaysCo2   = allData.timeData?.["well_designed"]?.["daily"]?.length + 1 || 360
  const titleSuffixCo2 = solutionMode === "average" ? "Per Household Avg" : `All ${numHousesCo2} Households`

  svg.append("text")
    .attr("x", width / 2).attr("y", -20)
    .attr("text-anchor","middle")
    .style("font-size","13px").style("font-weight","600")
    .style("fill","#2c2c2c").style("font-family","Poppins,sans-serif")
    .text(`CO₂ Emissions over ${numDaysCo2} Days — ${titleSuffixCo2}`)

  data.forEach((d, i) => {
    const y = i * (barH + gap)

    ranges.forEach(r => {
      svg.append("rect")
        .attr("x", r.x1).attr("y", y)
        .attr("width", r.x2 - r.x1).attr("height", barH)
        .attr("fill", r.color).attr("rx", 3)
    })

    svg.append("rect")
      .attr("x", x(0))
      .attr("y", y + barH * 0.2)
      .attr("width", 0)
      .attr("height", barH * 0.6)
      .attr("fill", barColor(d.value)).attr("rx", 2)
      .transition().duration(700).delay(i * 150)
      .attr("x", d.value >= 0 ? x(0) : x(d.value))
      .attr("width", Math.abs(x(d.value) - x(0)))

    svg.append("text")
      .attr("x", d.value >= 0 ? x(d.value) + 8 : x(d.value) - 8)
      .attr("y", y + barH / 2 + 5)
      .attr("text-anchor", d.value >= 0 ? "start" : "end")
      .style("font-size","13px").style("font-weight","600")
      .style("fill", barColor(d.value)).style("font-family","Poppins,sans-serif")
      .style("opacity", 0)
      .transition().duration(400).delay(i * 150 + 600)
      .style("opacity", 1)
      .text(d.value < 0
        ? `-${d3.format(",.0f")(Math.round(Math.abs(d.value) / 1000))}k kg`
        : `${d3.format(",.0f")(Math.round(d.value / 1000))}k kg`)

    svg.append("text")
      .attr("x", -10).attr("y", y + barH / 2 + 5)
      .attr("text-anchor","end")
      .style("font-size","12px").style("fill","#444")
      .style("font-family","Poppins,sans-serif")
      .text(d.label)
  })

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d3.format(",.0f")(d/1000)}k`))
    .selectAll("text").style("font-size","10px")

  // Break-even line at 0
  svg.append("line")
    .attr("x1", x(0)).attr("x2", x(0))
    .attr("y1", 0).attr("y2", height + 8)
    .attr("stroke","#333").attr("stroke-width", 2)
    .attr("stroke-dasharray","4,3")

  svg.append("text")
    .attr("x", x(0)).attr("y", -4)
    .attr("text-anchor","middle")
    .style("font-size","10px").style("fill","#555")
    .style("font-family","Poppins,sans-serif")
    .text("net zero")

  svg.append("text")
    .attr("x", width / 2).attr("y", height + 42)
    .attr("text-anchor","middle")
    .style("font-size","12px").style("fill","#666")
    .style("font-family","Poppins,sans-serif")
    .text(solutionMode === "average" ? "CO₂ Emissions per Household (kg)" : "Annual CO₂ Emissions (kg)")

  const rangeMeta = [
    { label: "Low emissions", color: "#e8f5e9", tc: "#2c7a55" },
    { label: "Moderate",      color: "#fff8e1", tc: "#f57f17" },
    { label: "High emissions", color: "#ffebee", tc: "#c62828" }
  ]
  const leg = svg.append("g").attr("transform", `translate(${width + 12}, 0)`)
  rangeMeta.forEach((r, i) => {
    leg.append("rect").attr("x", 0).attr("y", i * 22).attr("width", 12).attr("height", 12)
      .attr("rx", 2).attr("fill", r.color).attr("stroke","#ccc").attr("stroke-width", 0.5)
    leg.append("text").attr("x", 16).attr("y", i * 22 + 10)
      .style("font-size","11px").style("fill", r.tc)
      .style("font-family","Poppins,sans-serif").text(r.label)
  })
}

// ─────────────────────────────────────────────
//  CO2 EQUIVALENCIES (#co2Equivalencies)
// ─────────────────────────────────────────────
function initCo2Equivalencies() {
  const container = document.querySelector("#co2Equivalencies")
  if (!container) return

  const wd = allData.overviewData.scenarios.find(s => s.scenario === "well_designed")
  if (!wd) return

  const numHousesEq  = allData.houseData?.["well_designed"]?.length || 24
  const divisorEq    = solutionMode === "average" ? numHousesEq : 1
  const co2Avoided   = wd.co2_avoided_kg / divisorEq

  const labelEl = document.getElementById("co2AvoidedLabel")
  if (labelEl) {
    const rounded = solutionMode === "average"
      ? d3.format(",.0f")(Math.round(co2Avoided))
      : d3.format(",.0f")(Math.round(co2Avoided / 1000) * 1000)
    labelEl.textContent = rounded
  }

  // Update section title to reflect mode
  const titleEl = document.getElementById("co2EquivTitle")
  if (titleEl) {
    const rounded = solutionMode === "average"
      ? d3.format(",.0f")(Math.round(co2Avoided))
      : d3.format(",.0f")(Math.round(co2Avoided / 1000) * 1000)
    const suffix = solutionMode === "average" ? " kg per household" : " kg of CO₂"
    titleEl.innerHTML = `<span class="material-icons section-icon" style="font-size:20px;vertical-align:middle;margin-right:6px;">forest</span>What ${rounded}${suffix} Actually Means`
  }

  const equivalencies = [
    {
      icon: "park",
      value: Math.round(co2Avoided / 21),
      unit: "trees",
      label: "planted & growing for a year",
      color: "#2c7a55"
    },
    {
      icon: "directions_car",
      value: Math.round(co2Avoided / 0.243),
      unit: "km",
      label: "not driven by a gasoline car",
      color: "#1565c0"
    },
    {
      icon: "home",
      value: Math.max(1, Math.round(co2Avoided / 4798)),
      unit: "homes",
      label: "powered for an entire year",
      color: "#6a1b9a"
    }
  ]

  equivalencies.forEach(eq => {
    const card = document.createElement("div")
    card.style.cssText = `
      flex:1; min-width:180px; background:#fff; border-radius:14px;
      padding:24px 20px; text-align:center;
      box-shadow:0 2px 12px rgba(0,0,0,0.06);
    `
    card.innerHTML = `
      <span class="material-icons" style="font-size:36px;color:${eq.color};margin-bottom:8px;display:block;">${eq.icon}</span>
      <div style="font-size:28px;font-weight:700;color:${eq.color};font-family:Poppins,sans-serif;line-height:1.1;">
        ${d3.format(",.0f")(eq.value)}
      </div>
      <div style="font-size:14px;font-weight:600;color:#333;font-family:Poppins,sans-serif;margin:4px 0 2px;">${eq.unit}</div>
      <div style="font-size:11px;color:#888;font-family:Poppins,sans-serif;">${eq.label}</div>
    `
    container.appendChild(card)
  })
}

// ─────────────────────────────────────────────
function initEnergyBalance() {
  const container = document.querySelector("#timeseries")
  if (!container.querySelector(".ts-scenario-toggle")) {
    const toggle = document.createElement("div")
    toggle.className = "scenario-toggle ts-scenario-toggle"
    toggle.style.marginBottom = "12px"
    toggle.innerHTML = `
      <button class="scenario-btn active" data-ts-scenario="well_designed">Well Designed</button>
      <button class="scenario-btn" data-ts-scenario="unadvised">Unadvised</button>
    `
    container.prepend(toggle)
    toggle.querySelectorAll(".scenario-btn").forEach(btn => {
      btn.addEventListener("click", function() {
        toggle.querySelectorAll(".scenario-btn").forEach(b => b.classList.remove("active"))
        this.classList.add("active")
        currentTimeScenario = this.getAttribute("data-ts-scenario")
        drawEnergyBalance(currentTimeGranularity, currentTimeScenario)
      })
    })
  }
  drawEnergyBalance("monthly", "well_designed")
}

function drawEnergyBalance(granularity, scenario) {
  d3.select("#timeseries").selectAll("svg").remove()

  const raw = allData.timeData[scenario][granularity]
  if (!raw || raw.length === 0) return

  const container = document.querySelector("#timeseries")
  const totalW = container ? container.clientWidth - 80 : 720
  const margin = { top: 30, right: 160, bottom: 80, left: 70 }
  const width  = totalW - margin.left - margin.right
  const height = 340

  const svg = d3.select("#timeseries")
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  const labels = raw.map((d, i) => {
    if (granularity === "daily")     return d.date ? d.date.slice(5) : `D${i+1}`
    if (granularity === "weekly")    return `W${d.week || i+1}`
    if (granularity === "monthly")   return d.month_name || d.month || `M${i+1}`
    if (granularity === "quarterly") return d.quarter || `Q${i+1}`
    return `${i+1}`
  })

  const x = d3.scaleBand().domain(labels).range([0, width]).padding(0.25)
  const yMax = d3.max(raw, d => Math.max(d.solar_generated_kwh, d.load_consumed_kwh)) * 1.1
  const y = d3.scaleLinear().domain([0, yMax]).range([height, 0])

  svg.append("g").attr("transform",`translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text").attr("transform","rotate(-40)").style("text-anchor","end").style("font-size","11px")
  svg.append("g")
    .call(d3.axisLeft(y).ticks(6).tickFormat(d => `${(d/1000).toFixed(0)}k`))
    .selectAll("text").style("font-size","11px")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-55)
    .attr("text-anchor","middle").style("font-size","12px").style("fill","#666").text("Energy (kWh)")

  const bw = x.bandwidth()

  svg.selectAll(".bar-solar").data(raw).enter().append("rect")
    .attr("class","bar-solar")
    .attr("x",(d,i) => x(labels[i])).attr("y",d => y(d.solar_generated_kwh))
    .attr("width",bw/2).attr("height",d => height-y(d.solar_generated_kwh))
    .attr("fill","#fbc02d").attr("rx",3)
    .on("mouseover",(event,d) => showTooltip(`Solar: ${fmtKwh(d.solar_generated_kwh)}`))
    .on("mousemove",moveTooltip).on("mouseout",hideTooltip)

  svg.selectAll(".bar-load").data(raw).enter().append("rect")
    .attr("class","bar-load")
    .attr("x",(d,i) => x(labels[i])+bw/2).attr("y",d => y(d.load_consumed_kwh))
    .attr("width",bw/2).attr("height",d => height-y(d.load_consumed_kwh))
    .attr("fill","#2c7a55").attr("rx",3)
    .on("mouseover",(event,d) => showTooltip(`
      Load: ${fmtKwh(d.load_consumed_kwh)}<br>
      Imported: ${fmtKwh(d.grid_imported_kwh)}<br>
      Exported: ${fmtKwh(d.grid_exported_kwh)}<br>
      Self-suff: ${fmt(d.self_sufficiency_avg)}%
    `))
    .on("mousemove",moveTooltip).on("mouseout",hideTooltip)

  const leg = svg.append("g").attr("transform",`translate(${width+20},0)`)
  ;[{color:"#fbc02d",label:"Solar Generated"},{color:"#2c7a55",label:"Load Consumed"}]
    .forEach((item,i) => {
      leg.append("rect").attr("x",0).attr("y",i*22).attr("width",14).attr("height",14).attr("rx",3).attr("fill",item.color)
      leg.append("text").attr("x",20).attr("y",i*22+11).style("font-size","12px").style("fill","#444").text(item.label)
    })
}

// ─────────────────────────────────────────────
//  4. BY GROUP LOLLIPOP CHART (#energyBalance)
// ─────────────────────────────────────────────
let currentGroupMode = "totals"  // "totals" | "averages"

function initByGroupChart() {
  // Wire external controls
  d3.selectAll("#grpGroupToggle [data-group]").on("click", function() {
    d3.selectAll("#grpGroupToggle .scenario-btn").classed("active", false)
    d3.select(this).classed("active", true)
    currentGroupKey = this.getAttribute("data-group")
    drawByGroupChart(currentGroupKey, currentGroupScenario)
  })
  d3.selectAll("#grpScenToggle [data-grp-scenario]").on("click", function() {
    d3.selectAll("#grpScenToggle .scenario-btn").classed("active", false)
    d3.select(this).classed("active", true)
    currentGroupScenario = this.getAttribute("data-grp-scenario")
    drawByGroupChart(currentGroupKey, currentGroupScenario)
  })
  d3.selectAll("#grpModeToggle [data-grp-mode]").on("click", function() {
    d3.selectAll("#grpModeToggle .scenario-btn").classed("active", false)
    d3.select(this).classed("active", true)
    currentGroupMode = this.getAttribute("data-grp-mode")
    drawByGroupChart(currentGroupKey, currentGroupScenario)
  })
  drawByGroupChart("by_type", "well_designed")
}

function drawByGroupChart(groupKey, scenario) {
  d3.select("#energyBalance").selectAll("*").remove()

  const raw = allData.groupData[scenario][groupKey]
  if (!raw || raw.length === 0) return

  const labelKey = groupKey === "by_type" ? "household_type" : "wealth_level"
  const isAvg = currentGroupMode === "averages"

  const metrics = ["total_solar_kwh","total_load_kwh","total_imported_kwh","total_exported_kwh"]
  const colors  = ["#fbc02d","#2c7a55","#e57373","#64b5f6"]
  const metricLabels = ["Solar","Load","Imported","Exported"]

  const data = raw.map(d => {
    const factor = isAvg ? d.count : 1
    const row = { label: d[labelKey], count: d.count,
      avg_self_sufficiency: d.avg_self_sufficiency,
      total_net_cost: d.total_net_cost }
    metrics.forEach(m => { row[m] = d[m] / factor })
    return row
  })

  const container = document.querySelector("#energyBalance")
  const totalW = container ? container.clientWidth - 80 : 720
  const margin = { top: 40, right: 160, bottom: 70, left: 75 }
  const width  = totalW - margin.left - margin.right
  const height = 340

  const xLabel = groupKey === "by_type" ? "Household Type" : "Wealth Level"
  const yLabel = isAvg ? "Energy (kWh / household)" : "Energy (kWh)"
  const chartTitle = scenario === "well_designed"
    ? `Energy breakdown by ${groupKey === "by_type" ? "household type" : "wealth level"} — Well Designed`
    : `Energy breakdown by ${groupKey === "by_type" ? "household type" : "wealth level"} — Unadvised`

  // ── Scales ────────────────────────────────────
  const groups = data.map(d => d.label)
  const x0 = d3.scaleBand().domain(groups).range([0, width]).paddingInner(0.35)
  const x1 = d3.scaleBand().domain(metrics).range([0, x0.bandwidth()]).padding(0.15)
  const yMax = d3.max(data, d => d3.max(metrics, m => d[m])) * 1.12
  const y = d3.scaleLinear().domain([0, yMax]).range([height, 0])

  // ── SVG ───────────────────────────────────────
  const svg = d3.select("#energyBalance")
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  // Chart title
  svg.append("text")
    .attr("x", width / 2).attr("y", -14)
    .attr("text-anchor","middle")
    .style("font-size","13px").style("font-weight","600").style("fill","#2c2c2c")
    .style("font-family","Poppins,sans-serif")
    .text(chartTitle)

  // X axis
  svg.append("g").attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x0).tickFormat(d => d.replace(/_/g," ")))
    .selectAll("text").style("text-anchor","middle").style("font-size","11px")

  // X axis label
  svg.append("text")
    .attr("x", width / 2).attr("y", height + 52)
    .attr("text-anchor","middle")
    .style("font-size","12px").style("fill","#666").style("font-family","Poppins,sans-serif")
    .text(xLabel)

  // Y axis
  svg.append("g")
    .call(d3.axisLeft(y).ticks(6).tickFormat(d => `${(d/1000).toFixed(0)}k`))
    .selectAll("text").style("font-size","11px")

  // Y axis label
  svg.append("text").attr("transform","rotate(-90)")
    .attr("x", -height/2).attr("y", -62)
    .attr("text-anchor","middle").style("font-size","12px").style("fill","#666")
    .attr("class","hh-axis-label").text(yLabel)

  // ── Lollipops ─────────────────────────────────
  const lollipopR = Math.max(5, Math.min(9, x1.bandwidth() * 0.45))

  const groupSel = svg.selectAll(".lollipop-group")
    .data(data).enter().append("g")
    .attr("class","lollipop-group")
    .attr("transform", d => `translate(${x0(d.label)},0)`)

  metrics.forEach((metric, mi) => {
    const cx = x1(metric) + x1.bandwidth() / 2

    groupSel.append("line")
      .attr("x1", cx).attr("x2", cx)
      .attr("y1", height).attr("y2", height)
      .attr("stroke", colors[mi]).attr("stroke-width", 2).attr("stroke-opacity", 0.7)
      .transition().duration(600).delay((_, i) => i * 60 + mi * 20)
      .attr("y2", d => y(d[metric]))

    groupSel.append("circle")
      .attr("cx", cx).attr("cy", height)
      .attr("r", lollipopR)
      .attr("fill", colors[mi]).attr("stroke","#fff").attr("stroke-width",1.5)
      .transition().duration(600).delay((_, i) => i * 60 + mi * 20)
      .attr("cy", d => y(d[metric]))

    groupSel.append("circle")
      .attr("cx", cx).attr("cy", d => y(d[metric]))
      .attr("r", lollipopR + 6).attr("fill","transparent")
      .on("mouseover", (event, d) => showTooltip(`
        <strong>${d.label.replace(/_/g," ")}</strong><br>
        ${metricLabels[mi]}: <strong>${fmtKwh(d[metric])}</strong>${isAvg?" / household":""}<br>
        Self-suff: ${fmt(d.avg_self_sufficiency)}%<br>
        Net cost: $${fmt(d.total_net_cost / (isAvg ? d.count : 1), 2)}${isAvg?" / household":""}
      `))
      .on("mousemove", moveTooltip).on("mouseout", hideTooltip)
  })

  // ── Note ──────────────────────────────────────
  const countPerGroup = data[0]?.count ?? "?"
  const noteEl = document.getElementById("energyBalance-note")
  if (noteEl) {
    const groupDesc = groupKey === "by_type" ? "household type" : "wealth level"
    noteEl.textContent = `kWh totals over 360 simulated days · Each ${groupDesc} group contains ${countPerGroup} households · Averages mode divides totals by household count`
  }

  // ── Legend ────────────────────────────────────
  const leg = svg.append("g").attr("transform", `translate(${width + 20}, 0)`)
  metricLabels.forEach((label, i) => {
    leg.append("circle").attr("cx", 7).attr("cy", i * 26 + 7).attr("r", 7).attr("fill", colors[i])
    leg.append("text").attr("x", 20).attr("y", i * 26 + 12)
      .style("font-size","12px").style("fill","#444").text(label)
  })
}

// ─────────────────────────────────────────────
//  WIRE: DUCK CURVE SCENARIO BUTTONS
// ─────────────────────────────────────────────
function wireScenarioToggle() {
  const scenarioMap = {
    "no_solar":   null,
    "bad_design": "unadvised",
    "optimized":  "well_designed"
  }
  d3.selectAll(".scenario-btn[data-scenario]").on("click", function() {
    const btnScenario = this.getAttribute("data-scenario")
    const jsonKey = scenarioMap[btnScenario]
    d3.selectAll(".scenario-btn[data-scenario]").classed("active", false)
    d3.select(this).classed("active", true)
    d3.select("#duckCurve").selectAll("*").remove()
    if (!jsonKey) { renderNoSolarDuck(); return }
    currentDuckScenario = jsonKey
    drawDuckCurve(allData.duckData[jsonKey])
  })
}

// ─────────────────────────────────────────────
//  WIRE: TIME FILTER BUTTONS
// ─────────────────────────────────────────────
function wireSolutionModeToggle() {
  d3.selectAll("#solutionModeToggle [data-solution-mode]").on("click", function() {
    d3.selectAll("#solutionModeToggle .scenario-btn").classed("active", false)
    d3.select(this).classed("active", true)
    solutionMode = this.getAttribute("data-solution-mode")
    updateSolutionMode()
  })
}

function updateSolutionMode() {
  const scenarios = allData.overviewData.scenarios
  const wd = scenarios.find(s => s.scenario === "well_designed")
  const ns = scenarios.find(s => s.scenario === "no_solar")
  if (!wd || !ns) return

  const numHouses = allData.houseData?.["well_designed"]?.length || 24
  const numDays   = allData.timeData?.["well_designed"]?.["daily"]?.length + 1 || 360
  const divisor   = solutionMode === "average" ? numHouses : 1
  const suffix    = solutionMode === "average" ? " / household" : ""

  // ── KPI cards ──
  const savingsEl = document.querySelector("#impact-savings")
  const co2El     = document.querySelector("#impact-co2")
  const ssEl      = document.querySelector("#impact-ss")
  if (savingsEl) savingsEl.textContent = "$" + fmt(wd.cost_savings_vs_no_solar / divisor, 0)
  if (co2El)     co2El.textContent     = fmt(wd.co2_avoided_kg / divisor, 0) + " kg"
  if (ssEl)      ssEl.textContent      = fmt(wd.avg_self_sufficiency, 1) + "%"

  const savingsCard = savingsEl?.closest(".impact-card")?.querySelector("p")
  const co2Card     = co2El?.closest(".impact-card")?.querySelector("p")
  if (savingsCard) savingsCard.textContent = `Savings vs No Solar over ${numDays} days${suffix}`
  if (co2Card)     co2Card.textContent     = `CO₂ Avoided over ${numDays} days (kg)${suffix}`

  // ── Bullet charts ──
  d3.select("#bulletChart").selectAll("*").remove()
  d3.select("#co2BulletChart").selectAll("*").remove()
  initBulletChart()
  initCo2BulletChart()

  // ── Equivalencies ──
  d3.select("#co2Equivalencies").selectAll("*").remove()
  initCo2Equivalencies()
}

function wireTimeBtns() {
  const m = { Day:"daily", Week:"weekly", Month:"monthly", Quarter:"quarterly", Year:"yearly" }
  d3.selectAll("#mistakeTimeFilter .time-btn").on("click", function() {
    d3.selectAll("#mistakeTimeFilter .time-btn").classed("active", false)
    d3.select(this).classed("active", true)
    mistakeTimeGranularity = m[this.textContent.trim()] || "monthly"
    drawMistakeTimeseries(mistakeTimeGranularity)
  })
  d3.selectAll("#solutionTimeFilter .time-btn").on("click", function() {
    d3.selectAll("#solutionTimeFilter .time-btn").classed("active", false)
    d3.select(this).classed("active", true)
    currentTimeGranularity = m[this.textContent.trim()] || "monthly"
    drawEnergyBalance(currentTimeGranularity, "well_designed")
  })
}

// ─────────────────────────────────────────────
//  SELF-SUFFICIENCY GAUGES
// ─────────────────────────────────────────────
function initSelfSufficiencyGauges() {
  const container = document.querySelector("#selfSufficiencyGauges")
  if (!container) return
  const scenarios = [
    { label: "Unadvised System",     key: "unadvised",     color: "#e57373" },
    { label: "Well Designed System", key: "well_designed", color: "#2c7a55" }
  ]
  scenarios.forEach(s => {
    const sc = allData.overviewData.scenarios.find(x => x.scenario === s.key)
    if (!sc) return
    const wrapper = document.createElement("div")
    wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;"
    container.appendChild(wrapper)
    drawGauge(wrapper, s.label, sc.avg_self_sufficiency, sc.total_net_cost, sc.co2_avoided_kg, s.color)
  })
}

function drawGauge(wrapper, label, pct, netCost, co2, color) {
  const outerR = 140, innerR = 96
  const W = outerR * 2        // 280
  const H = outerR + 55       // arc height + label + grid dependent text

  const svgEl = d3.select(wrapper).append("svg")
    .attr("width", W).attr("height", H)
    .style("overflow", "visible").style("display", "block")

  const gradId = "gg-" + Math.random().toString(36).slice(2, 7)
  const grad = svgEl.append("defs").append("linearGradient")
    .attr("id", gradId).attr("x1","0%").attr("y1","0%").attr("x2","100%").attr("y2","0%")
  ;[
    { offset:"0%",   color:"#ef5350" },
    { offset:"40%",  color:"#ffa726" },
    { offset:"70%",  color:"#d4e157" },
    { offset:"100%", color:"#2c7a55" }
  ].forEach(s => grad.append("stop").attr("offset", s.offset).attr("stop-color", s.color))

  // Pivot at BOTTOM of SVG so arc opens UPWARD (classic speedometer)
  const cx = outerR, cy = outerR

  const arcGen = d3.arc()
    .innerRadius(innerR).outerRadius(outerR)
    .startAngle(-Math.PI / 2).endAngle(Math.PI / 2)
  svgEl.append("path")
    .attr("d", arcGen())
    .attr("fill", `url(#${gradId})`)
    .attr("transform", `translate(${cx},${cy})`)

  const g = svgEl.append("g").attr("transform", `translate(${cx},${cy})`)

  // pctToAngle: 0%=left(π), 50%=top(π/2), 100%=right(0)
  // We negate y coords so positive sin → points UP on screen
  const pctToAngle = p => Math.PI - (p / 100) * Math.PI
  const aX = a => Math.cos(a)
  const aY = a => -Math.sin(a)

  // Tick marks along outer edge of arc
  ;[0, 25, 50, 75, 100].forEach(v => {
    const a = pctToAngle(v), x = aX(a), y = aY(a)
    g.append("line")
      .attr("x1",(outerR+4)*x).attr("y1",(outerR+4)*y)
      .attr("x2",(outerR+16)*x).attr("y2",(outerR+16)*y)
      .attr("stroke","#bbb").attr("stroke-width",1.5)
    g.append("text")
      .attr("x",(outerR+28)*x).attr("y",(outerR+28)*y+4)
      .attr("text-anchor","middle").style("font-size","10px").style("fill","#999")
      .style("font-family","Poppins,sans-serif").text(v+"%")
  })

  // Slim line needle with base circle
  const needleLen = outerR * 0.76
  const needleLine = g.append("line")
    .attr("x1", 0).attr("y1", 0)
    .attr("x2", 0).attr("y2", 0)
    .attr("stroke", "#1e2b24").attr("stroke-width", 3)
    .attr("stroke-linecap", "round").attr("opacity", 0.9)
  const tailLen = outerR * 0.18
  const tailLine = g.append("line")
    .attr("x1", 0).attr("y1", 0)
    .attr("x2", 0).attr("y2", 0)
    .attr("stroke", "#1e2b24").attr("stroke-width", 3)
    .attr("stroke-linecap", "round").attr("opacity", 0.6)
  g.append("circle").attr("r", 10).attr("fill", "#1e2b24").attr("stroke", "white").attr("stroke-width", 2.5)

  const pctText = g.append("text").attr("y", -outerR * 0.35).attr("text-anchor","middle")
    .style("font-size","36px").style("font-weight","800")
    .style("fill",color).style("font-family","Poppins,sans-serif").text("0%")

  // Animation function — called by IntersectionObserver when gauge enters viewport
  function animateGauge() {
    needleLine.transition().delay(300).duration(1400).ease(d3.easeElastic.period(0.6))
      .attrTween("x2", () => { const i = d3.interpolateNumber(0, pct/100); return t => needleLen * aX(pctToAngle(i(t)*100)) })
      .attrTween("y2", () => { const i = d3.interpolateNumber(0, pct/100); return t => needleLen * aY(pctToAngle(i(t)*100)) })
    tailLine.transition().delay(300).duration(1400).ease(d3.easeElastic.period(0.6))
      .attrTween("x2", () => { const i = d3.interpolateNumber(0, pct/100); return t => -tailLen * aX(pctToAngle(i(t)*100)) })
      .attrTween("y2", () => { const i = d3.interpolateNumber(0, pct/100); return t => -tailLen * aY(pctToAngle(i(t)*100)) })
    pctText.transition().duration(1400).ease(d3.easeCubicOut)
      .tween("text", () => {
        const interp = d3.interpolateNumber(0, pct)
        return t => { pctText.text(fmt(interp(t), 1) + "%") }
      })
  }

  // Trigger animation when gauge scrolls into view (fires once)
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateGauge()
        observer.disconnect()
      }
    })
  }, { threshold: 0.4 })
  observer.observe(wrapper)

  // Scenario label below pivot
  svgEl.append("text").attr("x",cx).attr("y", cy + 22).attr("text-anchor","middle")
    .style("font-size","13px").style("font-weight","700")
    .style("fill",color).style("font-family","Poppins,sans-serif").text(label)

  // Grid dependent note — inside SVG, below the scenario label
  svgEl.append("text").attr("x",cx).attr("y", cy + 40).attr("text-anchor","middle")
    .style("font-size","11px").style("fill","#aaa").style("font-family","Poppins,sans-serif")
    .text(`${fmt(100 - pct, 1)}% grid dependent`)
}

// ─────────────────────────────────────────────
//  BATTERY SOC COMPARISON
// ─────────────────────────────────────────────
function initBatterySocChart() {
  if (!document.querySelector("#batterySocChart")) return
  drawBatterySocChart()
}

function drawBatterySocChart() {
  const container = document.querySelector("#batterySocChart")
  d3.select("#batterySocChart").selectAll("svg, .bsoc-legend").remove()
  const wd = allData.duckData["well_designed"]
  const uv = allData.duckData["unadvised"]
  const totalW = container.clientWidth - 80 || 720
  const margin = { top:60, right:160, bottom:55, left:70 }
  const width = totalW - margin.left - margin.right, height = 300
  const svgEl = d3.select("#batterySocChart").append("svg")
    .attr("width", width+margin.left+margin.right).attr("height", height+margin.top+margin.bottom)
  const svg = svgEl.append("g").attr("transform",`translate(${margin.left},${margin.top})`)

  svgEl.append("text").attr("x",margin.left+width/2).attr("y",28).attr("text-anchor","middle")
    .style("font-size","15px").style("font-weight","600").style("fill","#1e2b24").style("font-family","Poppins,sans-serif")
    .text("Battery State of Charge Throughout the Day")

  const x = d3.scaleLinear().domain([0,23]).range([0,width])
  const y = d3.scaleLinear().domain([0,100]).range([height,0])

  svg.append("rect").attr("x",x(7)).attr("y",0).attr("width",x(17)-x(7)).attr("height",height).attr("fill","#fffde7").attr("opacity",0.5)
  svg.append("text").attr("x",x(12)).attr("y",-10).attr("text-anchor","middle").style("font-size","10px").style("fill","#f9a825").style("font-family","Poppins,sans-serif").text("☀ Solar charging")
  svg.append("rect").attr("x",x(18)).attr("y",0).attr("width",x(20)-x(18)).attr("height",height).attr("fill","#fce4e4").attr("opacity",0.6)
  svg.append("text").attr("x",x(19)).attr("y",-10).attr("text-anchor","middle").style("font-size","10px").style("fill","#e53935").style("font-family","Poppins,sans-serif").text("⚡ Peak demand")

  svg.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x).ticks(24).tickFormat(h=>`${h}h`)).selectAll("text").style("font-size","11px")
  svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d=>`${d}%`)).selectAll("text").style("font-size","11px")
  svg.append("text").attr("x",width/2).attr("y",height+46).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").text("Time of Day")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-54).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").text("Battery SoC (%)")

  const area = d3.area().x(d=>x(d.hour)).y0(height).y1(d=>y(d.avg_battery_soc)).curve(d3.curveMonotoneX)
  const line = d3.line().x(d=>x(d.hour)).y(d=>y(d.avg_battery_soc)).curve(d3.curveMonotoneX)
  svg.append("path").datum(wd).attr("fill","#2c7a55").attr("opacity",0.1).attr("d",area)
  svg.append("path").datum(uv).attr("fill","#e57373").attr("opacity",0.1).attr("d",area)
  const wdPath = svg.append("path").datum(wd).attr("fill","none").attr("stroke","#2c7a55").attr("stroke-width",3).attr("d",line)
  const uvPath = svg.append("path").datum(uv).attr("fill","none").attr("stroke","#e57373").attr("stroke-width",3).attr("d",line)
  animatePath(wdPath,0); animatePath(uvPath,400)

  const wdAt18 = wd.find(d=>d.hour===18), uvAt18 = uv.find(d=>d.hour===18)
  ;[{d:wdAt18,c:"#2c7a55",dy:-14},{d:uvAt18,c:"#e57373",dy:-16}].forEach(({d,c,dy})=>{
    svg.append("circle").attr("cx",x(d.hour)).attr("cy",y(d.avg_battery_soc)).attr("r",5).attr("fill",c).attr("stroke","white").attr("stroke-width",2).style("opacity",0).transition().delay(1200).duration(300).style("opacity",1)
    svg.append("text").attr("x",x(d.hour)+8).attr("y",y(d.avg_battery_soc)+dy).style("font-size","11px").style("font-weight","700").style("fill",c).style("font-family","Poppins,sans-serif").text(`${fmt(d.avg_battery_soc,0)}%`).style("opacity",0).transition().delay(1200).duration(300).style("opacity",1)
  })

  const crossV = svg.append("line").attr("y1",0).attr("y2",height).attr("stroke","#999").attr("stroke-width",1).attr("stroke-dasharray","3,3").style("opacity",0)
  svg.append("rect").attr("width",width).attr("height",height).attr("fill","transparent")
    .on("mousemove", function(event) {
      const hour = Math.round(x.invert(d3.pointer(event)[0]))
      if (hour < 0 || hour > 23) return
      const w = wd.find(d=>d.hour===hour), u = uv.find(d=>d.hour===hour)
      if (!w || !u) return
      crossV.attr("x1",x(hour)).attr("x2",x(hour)).style("opacity",1)
      showTooltip(`<strong>${hour}:00h</strong><br><span style="color:#2c7a55">●</span> Well Designed: <strong>${fmt(w.avg_battery_soc,1)}%</strong><br><span style="color:#e57373">●</span> Unadvised: <strong>${fmt(u.avg_battery_soc,1)}%</strong><br><span style="color:#999;font-size:11px">Δ ${fmt(w.avg_battery_soc-u.avg_battery_soc,1)} pp</span>`)
      moveTooltip(event)
    })
    .on("mouseout", () => { crossV.style("opacity",0); hideTooltip() })

  // Legend — idéntico al duck curve: svg group, translate(width+8, i*22)
  ;[
    { label:"Well Designed", color:"#2c7a55", i:0 },
    { label:"Unadvised",     color:"#e57373", i:1 }
  ].forEach(({label, color, i}) => {
    const g = svg.append("g").attr("transform",`translate(${width + 8}, ${i * 22})`)
    g.append("line").attr("x1",0).attr("x2",20).attr("y1",8).attr("y2",8)
      .attr("stroke",color).attr("stroke-width",2.5)
    g.append("text").attr("x",26).attr("y",12).style("font-size","12px").style("fill","#444")
      .style("font-family","Poppins,sans-serif").text(label)
  })
}


// ─────────────────────────────────────────────
//  MISTAKE TIMESERIES — Grid Import: WD vs Unadvised
// ─────────────────────────────────────────────
let mistakeTimeGranularity = "monthly"
let mistakeMetric = "import"

function initMistakeTimeseries() {
  // Wire metric tabs
  document.querySelectorAll("#mistakeMetricTabs .metric-tab").forEach(btn => {
    btn.addEventListener("click", function() {
      document.querySelectorAll("#mistakeMetricTabs .metric-tab").forEach(b => b.classList.remove("active"))
      this.classList.add("active")
      mistakeMetric = this.dataset.metric
      updateMistakeNote()
      drawMistakeTimeseries(mistakeTimeGranularity)
    })
  })
  drawMistakeTimeseries("monthly")
}

function drawMistakeTimeseries(granularity) {
  d3.select("#mistakeTimeseries").selectAll("svg").remove()

  const metric = mistakeMetric
  const field  = metric === "import"    ? "grid_imported_kwh"
               : metric === "export"    ? "grid_exported_kwh"
               : metric === "generated" ? "solar_generated_kwh"
               :                          "load_consumed_kwh"
  const yLabel = metric === "import"    ? "Grid Imported (kWh)"
               : metric === "export"    ? "Grid Exported (kWh)"
               : metric === "generated" ? "Solar Generated (kWh)"
               :                          "Load Consumed (kWh)"
  const showNs = metric === "import"
  if (granularity === "yearly") {
    const wdDaily = allData.timeData["well_designed"]["daily"]
    const uvDaily = allData.timeData["unadvised"]["daily"]
    const sumWd = wdDaily.reduce((s,d) => s + d[field], 0)
    const sumUv = uvDaily.reduce((s,d) => s + d[field], 0)
    const sumNs = showNs ? uvDaily.reduce((s,d) => s + d.load_consumed_kwh, 0) : 0

    const container = document.querySelector("#mistakeTimeseries")
    const totalW = container.clientWidth - 80 || 720
    const margin = { top:40, right:160, bottom:60, left:75 }
    const width  = totalW - margin.left - margin.right
    const height = 300

    const svgEl = d3.select("#mistakeTimeseries").append("svg")
      .attr("width", width+margin.left+margin.right)
      .attr("height", height+margin.top+margin.bottom)
    const svg = svgEl.append("g").attr("transform",`translate(${margin.left},${margin.top})`)

    const titleStr = metric === "import"    ? "Grid Energy Imported — Three Scenarios Compared"
                   : metric === "export"    ? "Grid Energy Exported — Well Designed vs Unadvised"
                   : metric === "generated" ? "Solar Generated — Well Designed vs Unadvised"
                   :                          "Load Consumed — Well Designed vs Unadvised"
    svgEl.append("text").attr("x", margin.left+width/2).attr("y", 22)
      .attr("text-anchor","middle").style("font-size","14px").style("font-weight","600")
      .style("fill","#1e2b24").style("font-family","Poppins,sans-serif")
      .text(titleStr)

    const yMax = (showNs ? sumNs : Math.max(sumWd, sumUv)) * 1.15
    const y = d3.scaleLinear().domain([0, yMax]).range([height, 0])
    const yFmt = d => `${(d/1000).toFixed(0)}k`

    const barKeys = showNs ? ["ns","uv","wd"] : ["uv","wd"]
    const x0 = d3.scaleBand().domain(["Year 2024"]).range([0, width]).padding(0.5)
    const x1 = d3.scaleBand().domain(barKeys).range([0, x0.bandwidth()]).padding(0.1)

    svg.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x0)).selectAll("text").style("font-size","13px").style("font-weight","600")
    svg.append("text").attr("x",width/2).attr("y",height+46).attr("text-anchor","middle")
      .style("font-size","12px").style("fill","#7c8f86").style("font-family","Poppins,sans-serif").text("Year")
    svg.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(yFmt)).selectAll("text").style("font-size","11px")
    svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-58)
      .attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86")
      .style("font-family","Poppins,sans-serif").text(yLabel)
    svg.append("g").call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(""))
      .selectAll("line").style("stroke","#f0f0f0")
    svg.select(".domain").remove()

    const allBars = showNs
      ? [{key:"ns",val:sumNs,color:"#90a4ae",label:"No Solar"},{key:"uv",val:sumUv,color:"#e57373",label:"Unadvised"},{key:"wd",val:sumWd,color:"#2c7a55",label:"Well Designed"}]
      : [{key:"uv",val:sumUv,color:"#e57373",label:"Unadvised"},{key:"wd",val:sumWd,color:"#2c7a55",label:"Well Designed"}]

    allBars.forEach(({key,val,color,label}, i) => {
      const barX = x0("Year 2024") + x1(key)
      const bw = x1.bandwidth()
      svg.append("rect").attr("x",barX).attr("y",height).attr("width",bw).attr("height",0)
        .attr("fill",color).attr("rx",4)
        .on("mouseover", e => showTooltip(`<span style="color:${color}">●</span> <strong>${label}</strong><br>Annual ${metric}: <strong>${fmtKwh(val)}</strong>`))
        .on("mousemove", moveTooltip).on("mouseout", hideTooltip)
        .transition().delay(i * 80).duration(600).ease(d3.easeCubicOut)
        .attr("y", y(val)).attr("height", height - y(val))
      svg.append("text").attr("x", barX + bw/2).attr("y", y(val) - 6)
        .attr("text-anchor","middle").style("font-size","12px").style("font-weight","700")
        .style("fill",color).style("font-family","Poppins,sans-serif")
        .attr("opacity",0)
        .transition().delay(i * 80 + 500).duration(200)
        .attr("opacity",1)
        .text(fmtKwh(val))
    })

    allBars.forEach(({label,color},i) => {
      const g = svg.append("g").attr("transform",`translate(${width+8},${i*22})`)
      g.append("line").attr("x1",0).attr("x2",20).attr("y1",8).attr("y2",8).attr("stroke",color).attr("stroke-width",3)
      g.append("text").attr("x",26).attr("y",12).style("font-size","12px").style("fill","#444").style("font-family","Poppins,sans-serif").text(label)
    })
    return
  }

  const wd  = allData.timeData["well_designed"][granularity]
  const uv  = allData.timeData["unadvised"][granularity]
  if (!wd || !uv || wd.length === 0) return
  // no_solar: sin paneles ni batería → grid_imported = load_consumed (100% de la red)
  const ns  = showNs ? uv.map(d => ({ ...d, [field]: d.load_consumed_kwh })) : []

  const container = document.querySelector("#mistakeTimeseries")
  const totalW = container.clientWidth - 80 || 720
  const margin = { top:40, right:160, bottom:granularity==="daily"?50:80, left:75 }
  const width  = totalW - margin.left - margin.right
  const height = 300

  const svgEl = d3.select("#mistakeTimeseries").append("svg")
    .attr("width", width+margin.left+margin.right)
    .attr("height", height+margin.top+margin.bottom)
  const svg = svgEl.append("g").attr("transform",`translate(${margin.left},${margin.top})`)

  // Title
  const titleStr2 = metric === "import"    ? "Grid Energy Imported — Three Scenarios Compared"
                  : metric === "export"    ? "Grid Energy Exported — Well Designed vs Unadvised"
                  : metric === "generated" ? "Solar Generated — Well Designed vs Unadvised"
                  :                          "Load Consumed — Well Designed vs Unadvised"
  svgEl.append("text")
    .attr("x", margin.left + width/2).attr("y", 22)
    .attr("text-anchor","middle").style("font-size","14px").style("font-weight","600")
    .style("fill","#1e2b24").style("font-family","Poppins,sans-serif")
    .text(titleStr2)

  // Labels
  const label = (d, i) => {
    if (granularity==="daily")     return d.date || `D${i+1}`
    if (granularity==="weekly")    return `W${d.week||i+1}`
    if (granularity==="monthly")   return d.month_name ? d.month_name.replace(" 2024","") : `M${i+1}`
    if (granularity==="quarterly") return `Q${d.quarter_num||i+1}`
    return `${i+1}`
  }
  const labels = wd.map(label)

  const allForMax = showNs ? [...wd,...uv,...ns] : [...wd,...uv]
  const yMax = d3.max(allForMax, d => d[field]) * 1.15
  const y = d3.scaleLinear().domain([0, yMax]).range([height, 0])
  const yFmt = d => yMax >= 5000 ? `${(d/1000).toFixed(0)}k` : yMax >= 1000 ? `${(d/1000).toFixed(1)}k` : `${d.toFixed(0)}`

  // Axes Y
  svg.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(yFmt)).selectAll("text").style("font-size","11px")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-58)
    .attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86")
    .style("font-family","Poppins,sans-serif").text(yLabel)

  // X axis label
  const xLabel = { daily:"Day", weekly:"Week", monthly:"Month", quarterly:"Quarter", yearly:"Year" }[granularity]
  svg.append("text").attr("x", width/2).attr("y", height + (granularity==="monthly" ? 72 : 42))
    .attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86")
    .style("font-family","Poppins,sans-serif").text(xLabel)

  // Gridlines
  svg.append("g").call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(""))
    .selectAll("line").style("stroke","#f0f0f0").style("stroke-width","1")
  svg.select(".domain").remove()

  if (granularity === "daily" || granularity === "weekly") {
    // ── LINE CHART for daily (359 pts) and weekly (52 pts) ──
    const xDomain = granularity === "daily"
      ? wd.map(d => new Date(d.date))
      : wd.map((d,i) => i)

    const x = granularity === "daily"
      ? d3.scaleTime().domain(d3.extent(wd, d => new Date(d.date))).range([0, width])
      : d3.scaleLinear().domain([0, wd.length-1]).range([0, width])

    const xAxis = granularity === "daily"
      ? d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b %-d"))
      : d3.axisBottom(x).ticks(13).tickFormat(i => `W${Math.round(i)+1}`)

    svg.append("g").attr("transform",`translate(0,${height})`).call(xAxis)
      .selectAll("text").style("font-size","11px")

    const xVal = granularity === "daily"
      ? d => x(new Date(d.date))
      : (d,i) => x(i)

    const lineGen = scenario => d3.line()
      .x((d,i) => xVal(d,i))
      .y(d => y(d[field]))
      .curve(d3.curveMonotoneX)

    const uvLine = svg.append("path").datum(uv).attr("fill","none").attr("stroke","#e57373").attr("stroke-width",2).attr("d", lineGen("uv")(uv))
    if (showNs) {
      const nsLine = svg.append("path").datum(ns).attr("fill","none").attr("stroke","#90a4ae").attr("stroke-width",2).attr("stroke-dasharray","5,3").attr("d", lineGen("ns")(ns))
      animatePath(nsLine, 150)
    }
    const wdLine = svg.append("path").datum(wd).attr("fill","none").attr("stroke","#2c7a55").attr("stroke-width",2).attr("d", lineGen("wd")(wd))
    animatePath(uvLine, 0); animatePath(wdLine, 300)

    // hover crosshair
    const crossV = svg.append("line").attr("y1",0).attr("y2",height).attr("stroke","#ccc").attr("stroke-width",1).attr("stroke-dasharray","3,3").style("opacity",0)
    svg.append("rect").attr("width",width).attr("height",height).attr("fill","transparent")
      .on("mousemove", function(event) {
        const mx = d3.pointer(event)[0]
        let w, u, n
        if (granularity === "daily") {
          const date = x.invert(mx)
          const idx = Math.min(d3.bisector(d=>new Date(d.date)).left(wd, date), wd.length-1)
          w = wd[idx]; u = uv[idx]; n = showNs ? ns[idx] : null
        } else {
          const idx = Math.min(Math.round(x.invert(mx)), wd.length-1)
          w = wd[Math.max(0,idx)]; u = uv[Math.max(0,idx)]; n = showNs ? ns[Math.max(0,idx)] : null
        }
        if (!w || !u) return
        crossV.attr("x1",mx).attr("x2",mx).style("opacity",1)
        const lbl = granularity==="daily" ? w.date : `Week ${w.week}`
        const nsRow = showNs && n ? `<span style="color:#90a4ae">●</span> No Solar: <strong>${fmtKwh(n[field])}</strong><br>` : ""
        showTooltip(`<strong>${lbl}</strong><br>${nsRow}<span style="color:#e57373">●</span> Unadvised: <strong>${fmtKwh(u[field])}</strong><br><span style="color:#2c7a55">●</span> Well Designed: <strong>${fmtKwh(w[field])}</strong>`)
        moveTooltip(event)
      })
      .on("mouseout", () => { crossV.style("opacity",0); hideTooltip() })

  } else {
    // ── GROUPED BAR CHART for month/quarter ──
    const barDomain = showNs ? ["ns","uv","wd"] : ["uv","wd"]
    const x0 = d3.scaleBand().domain(labels).range([0, width]).padding(0.25)
    const x1 = d3.scaleBand().domain(barDomain).range([0, x0.bandwidth()]).padding(0.05)

    svg.append("g").attr("transform",`translate(0,${height})`)
      .call(d3.axisBottom(x0))
      .selectAll("text")
      .attr("transform", granularity==="monthly" ? "rotate(-35)" : "rotate(0)")
      .style("text-anchor", granularity==="monthly" ? "end" : "middle")
      .style("font-size","11px")

    // Helper: animate bars growing from bottom
    const animateBar = (sel, delay) => sel
      .attr("y", height).attr("height", 0)
      .transition().delay((d,i) => i * 20 + delay).duration(500).ease(d3.easeCubicOut)
      .attr("y", d => y(d[field]))
      .attr("height", d => height - y(d[field]))

    // NS bars (No Solar) — only for import
    if (showNs) {
      animateBar(
        svg.selectAll(".bar-ns").data(ns).enter().append("rect").attr("class","bar-ns")
          .attr("x",(d,i) => x0(labels[i]) + x1("ns"))
          .attr("width", x1.bandwidth())
          .attr("fill","#90a4ae").attr("rx",3)
          .on("mouseover",(e,d) => showTooltip(`<span style="color:#90a4ae">●</span> <strong>No Solar</strong><br>Imported: ${fmtKwh(d[field])}`))
          .on("mousemove", moveTooltip).on("mouseout", hideTooltip),
        0)
    }

    // WD bars
    animateBar(
      svg.selectAll(".bar-wd").data(wd).enter().append("rect").attr("class","bar-wd")
        .attr("x",(d,i) => x0(labels[i]) + x1("wd"))
        .attr("width", x1.bandwidth())
        .attr("fill","#2c7a55").attr("rx",3)
        .on("mouseover",(e,d) => showTooltip(`<span style="color:#2c7a55">●</span> <strong>Well Designed</strong><br>${metric==="import"?"Imported":"Exported"}: ${fmtKwh(d[field])}<br>Self-suff: ${fmt(d.self_sufficiency_avg)}%`))
        .on("mousemove", moveTooltip).on("mouseout", hideTooltip),
      50)

    // UV bars
    animateBar(
      svg.selectAll(".bar-uv").data(uv).enter().append("rect").attr("class","bar-uv")
        .attr("x",(d,i) => x0(labels[i]) + x1("uv"))
        .attr("width", x1.bandwidth())
        .attr("fill","#e57373").attr("rx",3)
        .on("mouseover",(e,d) => showTooltip(`<span style="color:#e57373">●</span> <strong>Unadvised</strong><br>${metric==="import"?"Imported":"Exported"}: ${fmtKwh(d[field])}<br>Self-suff: ${fmt(d.self_sufficiency_avg)}%`))
        .on("mousemove", moveTooltip).on("mouseout", hideTooltip),
      100)
  }

  // Legend
  const legendItems = showNs
    ? [{ label:"No Solar", color:"#90a4ae", dashed:true }, { label:"Unadvised", color:"#e57373", dashed:false }, { label:"Well Designed", color:"#2c7a55", dashed:false }]
    : [{ label:"Unadvised", color:"#e57373", dashed:false }, { label:"Well Designed", color:"#2c7a55", dashed:false }]

  legendItems.forEach(({ label, color, dashed }, i) => {
    const g = svg.append("g").attr("transform",`translate(${width+8}, ${i*22})`)
    g.append("line").attr("x1",0).attr("x2",20).attr("y1",8).attr("y2",8)
      .attr("stroke",color).attr("stroke-width",3)
      .attr("stroke-dasharray", dashed ? "5,3" : null)
    g.append("text").attr("x",26).attr("y",12).style("font-size","12px").style("fill","#444")
      .style("font-family","Poppins,sans-serif").text(label)
  })
}