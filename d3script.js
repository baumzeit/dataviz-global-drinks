window.onload = function() {

	d3.csv('./data/drinks_global_data.csv')
		.then(data => {
			visualizeData(data)
		})

	function visualizeData(data) {
		delete data.columns

		data.forEach(entry => { 
            Object.keys(entry).forEach(key => {
                if (key !== 'country') {
                    entry[key] = parseInt(entry[key])
                }
            })
		}) 

		const dataDrinks = ['beer_servings', 'wine_servings', 'spirit_servings']

		const margin = { top: 20, right: 0, bottom: 20, left: 40 };
		
		const height = 500 - margin.top - margin.bottom;
		const width = 1120 - margin.left - margin.right;

		const minMeanMax = data => key => {
			if (typeof data[0][key] === 'number') {
				return { 
					key: key,
					min: d3.min(data, d => d[key]),
					mean: d3.mean(data, d => d[key]),
					max: d3.max(data, d => d[key]) 
				}
			}
			return `key '${key}' not of type number`
		}

		const basicStats = minMeanMax(data)
		const dataStats = Object.keys(data[0]).map(basicStats)
		
		const svg = d3.select('#dataviz')
			.append('svg')
				.attr('width', width + margin.left + margin.right)
				.attr('height', height + margin.top + margin.bottom)
			.append('g')
				.attr('transform', `translate(${margin.left}, ${margin.top})`)

		//tooltip
		const tooltip = d3.select("body")
		  .append("div")
		    .attr("class", "tooltip")
		    .style("opacity", 0);

		const yScale = d3.scaleLinear()
			.domain(d3.extent(data, d => d.total_litres_of_pure_alcohol))
			.range([height - margin.bottom, margin.top])

		const fillDrinkScale = d3.scaleOrdinal()
			.domain(dataDrinks)
			.range(['#FDBF6F', '#E7298A', '#00BEFF'])

	// pie setup
		const pieChart = d3.pie()
			.value(d => d.number)

		const newArc = d3.arc()
			.innerRadius(20)
			.outerRadius(80)

		const pieG = svg
				.append('g')
				.attr('class', 'pieG')
				.attr('transform', `translate(${width - 300}, 100)`)

	// histogram setup
		const numBins = 14
		
		const histoChart = d3.histogram()
			.domain(yScale.domain())
			.thresholds(yScale.ticks(numBins))
			.value(d => d.total_litres_of_pure_alcohol)

		const histoData = histoChart(data)


	// calculate radius
		const calcMaxR = (histoData) => {
			const maxBin = d3.max(histoData, bin => bin.length)
			const numBins = histoData.length

			const xMaxR = (width / maxBin) / 2
			const yMaxR = (height / numBins) / 2

			return Math.min(xMaxR, yMaxR)
		}

		const maxR = calcMaxR(histoData)
		

	// draw histogram bins
		const stackG = svg
			.selectAll('g.stack')
			.data(histoData)
			.enter()
				.append('g')
				.attr('class', 'stackG')
				.attr('transform', d => `translate(0, ${yScale(d.x0)})`)

	// enhance bin content data and draw dots from it
		stackG
			.selectAll('g.countryG')
			.data(d => d.map((entry, i) => {
				return {
					xPos: i,
					topDrink: dataDrinks.reduce((a, b) => entry[a] > entry[b] ? a : b),
					radius: maxR,
					...entry 
				}
			}))
			.enter()
			.append('g')
				.attr('class', 'countryG')
				.style('opacity', 0)
				.transition('dotAppear')
				.delay((d, i) => 20 * i)
				.style('opacity', 1)
				.each(drawDots)
		
		function drawDots(d, i) {
			d3.select(this) // the corresponding countryG element
				.append('circle')
				.attr('class', 'country-circle')
				.attr('cx', d => d.xPos * d.radius * 2 + d.radius)
				.attr('cy', d => 0)
				.attr('r', d => d.radius - 5)
				.style('fill', d => fillDrinkScale(d.topDrink))
				.on('mouseenter', d => {
					d3.select(this)
						.transition()
						.duration(400)
						.ease(d3.easeBackOut.overshoot(15))
						.style('stroke', 'white')
						.style('stroke-width', '4')
					updatePie(d)
				})
				.on('mouseleave', d => {
					d3.select(this)
						.transition()
						.duration(50)
						.style('stroke-width', 'none')
						.style('stroke-width', '0')
				})
		}

		function updatePie(d) {
			const newPieData = pieChart(dataDrinks.map(drink => { 
				return {
					name: drink, 
					number: d[drink] 
				}
			}))

			const pie = pieG
				.selectAll('path')
				.data(newPieData)

			pie
				.enter()
				.append('path')
				.merge(pie)
				.attr('d', newArc)
				.style('fill', (d,i) => fillDrinkScale(d.data.name))
				.style('stroke', 'white')
				.style('stroke-width', '2')

			// pie
			// 	.exit().remove()
		}


		const yAxis = d3.axisLeft()
			.scale(yScale)
			.ticks(numBins)
			.tickPadding(9)

		svg
			.append('g')
				.attr('id', 'yAxisG')
				.attr('transform', `translate( -5, 0)`)
				.call(yAxis)
	}
}