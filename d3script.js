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

		const margin = { top: 20, right: 0, bottom: 20, left: 40 }
		
		const height = 500 - margin.top - margin.bottom
		const width = 1120 - margin.left - margin.right

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

		// country heading
		const countryTitle = svg
			.append('text')
			.attr('class', 'country-title')
			.attr('x', 200)
			.attr('y', 30)

		const yScale = d3.scaleLinear()
			.domain(d3.extent(data, d => d.total_litres_of_pure_alcohol))
			.range([height - margin.bottom, margin.top])

		const fillDrinkScale = d3.scaleOrdinal()
			.domain(dataDrinks)
			.range(['#FDBF6F', '#E7298A', '#00BEFF'])
			.unknown(['gray'])

	// pie setup
		const pieRadius = 120

		const pieChart = d3.pie()
			.value(d => d.number)
			.sort(null)

		const arc = d3.arc()
			.innerRadius(0.6 * pieRadius)
			.outerRadius(0.8 * pieRadius)

		const outerArc = d3.arc()
			.innerRadius(0.9 * pieRadius)
			.outerRadius(0.9 * pieRadius)

		const pieG = svg
				.append('g')
				.attr('class', 'pie-g')
				.attr('transform', `translate(${width - 200}, 140)`)

	// other g's
		pieG.append('g')
			.attr('class', 'labels')
		pieG.append('g')
			.attr('class', 'lines')
		pieG.append('g')
			.attr('class', 'slices')

	// histogram setup
		const numBins = 14
		
		const histoChart = d3.histogram()
			.domain(yScale.domain())
			.thresholds(yScale.ticks(numBins))
			.value(d => d.total_litres_of_pure_alcohol)

		const histoData = histoChart(data)


	// calculate radius for dots
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
				.attr('class', 'stack-g')
				.attr('transform', d => `translate(0, ${yScale(d.x0)})`)

	// enhance bin content data and draw dots from it

		const getTopDrink = (entry) => {
			if (dataDrinks.map(drink => entry[drink]).some(val => val > 0)) {
				return dataDrinks.reduce((a, b) => entry[a] > entry[b] ? a : b)
			}
			return 'none'
		}

		stackG
			.selectAll('g.country-g')
			.data(d => d.map((entry, i) => {
				return {
					xPos: i,
					topDrink: getTopDrink(entry),
					radius: maxR,
					...entry 
				}
			}))
			.enter()
			.append('g')
				.attr('class', 'country-g')
				.style('opacity', 0)
				.transition('dotAppear')
				.delay((d, i) => 10 * i)
				.style('opacity', 1)
				.each(drawDots)
		
		function drawDots(d, i) {
			d3.select(this) // the corresponding country-g element
				.append('circle')
				.attr('class', 'country-circle')
				.attr('cx', d => d.xPos * d.radius * 2 + d.radius)
				.attr('cy', d => 0)
				.attr('r', d => d.radius - 5)
				.style('fill', d => fillDrinkScale(d.topDrink))
				.on('mouseenter', d => {
					d3.select('.country-g.active')
						.classed('active', false)
						.transition()
						.duration(50)
						.style('stroke-width', 'none')
						.style('stroke-width', '0')

					d3.select(this)
						.classed('active', true)
						.transition()
						.duration(400)
						.ease(d3.easeBackOut.overshoot(15))
						.style('stroke', 'white')
						.style('stroke-width', '4')
					countryTitle
						.text(d.country)

					updatePie(d)
				})
		}

		function updatePie(d) {
			const drinkData = dataDrinks.map(drink => { 
				return {
					name: drink, 
					number: d[drink] 
				}
			})

			// add 'no drinks' string to be shown as label if all categories have a value of 0 
			if (!drinkData.some(drink => drink.number > 0)) { 
				drinkData.forEach(entry => {
					entry.number = 'no drinks'
				})
			}

			const newPieData = pieChart(drinkData)

			const path = pieG.select('.slices')
				.selectAll('path')
				.data(newPieData, d => d.data.name)

			path
				.transition('tween')
				.duration(600)
				.attrTween('d', function(d) {
					this._current = this._current || d
			        const interpolate = d3.interpolate(this._current, d)
			        this._current = interpolate(0)
			        return (t) => arc(interpolate(t))
		    	})

			path
				.enter()
				.append('path')
					.attr('d', function(d) {
						this._current = d
						return arc(d)
					})
					.style('stroke', 'white')
					.style('stroke-width', '2')
					.style('fill', (d,i) => fillDrinkScale(d.data.name))
					.style('opacity', 0)
					.transition('pieAppear')
					.duration(400)
					.style('opacity', 1)

			path
				.exit()
				.remove()

			
			// draw labels for pie
			
			const labels = { 
				beer_servings: 'beer', 
				wine_servings: 'wine',
				spirit_servings: 'spirit',
				none: 'no drinks'
			}

			const text = svg
			.select('.labels').selectAll('text')
			.data(newPieData, d => d.data.name)

			text.enter()
				.append('text')
				.attr('dy', '.35em')
				.merge(text)
				.text(d => d.data.number)
				.style('opacity', 0)
				.transition().delay(140).duration(600)
				.attrTween('transform', function(d) {
					this._current = this._current || d
					const interpolate = d3.interpolate(this._current, d)
					this._current = interpolate(0)
					return (t) => {
						const d2 = interpolate(t)
						const pos = outerArc.centroid(d2)
						pos[0] = pieRadius * (midAngle(d2) < Math.PI ? 1 : -1)
						return 'translate('+ pos +')'
					}
				})
				.styleTween('text-anchor', function(d) {
					this._current = this._current || d
					const interpolate = d3.interpolate(this._current, d)
					this._current = interpolate(0)
					return (t) => {
						const d2 = interpolate(t)
						return midAngle(d2) < Math.PI ? 'start' : 'end'
					}
				})
				.transition().duration(130).style('opacity', 1)
			
			function midAngle(d) {
				return d.startAngle + (d.endAngle - d.startAngle)/2
			}

			text
				.exit()
				.remove()


			// lines connecting text to pie slice

			const polyline = pieG.select('.lines')
				.selectAll('polyline')
				.data(newPieData, d => d.data.name)
			
			polyline.enter()
				.append('polyline')
				.style('fill', 'none')
				.style('stroke', 'black')
				.merge(polyline)
				.style('opacity', 0)
				.transition().delay(140).duration(600)
				.attrTween('points', function(d) {
					this._current = this._current || d
					const interpolate = d3.interpolate(this._current, d)
					this._current = interpolate(0)
					return (t) => {
						const d2 = interpolate(t)
						const pos = outerArc.centroid(d2)
						pos[0] = pieRadius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1)
						return [arc.centroid(d2), outerArc.centroid(d2), pos]
					}			
				})
				.transition()
				.duration(130)
				.style('opacity', 1)
			
			polyline
				.exit()
				.remove()
		}


		// draw axis

		const yAxis = d3.axisLeft()
			.scale(yScale)
			.ticks(numBins)
			.tickPadding(9)

		svg
			.append('g')
				.attr('id', 'yAxisG')
				.attr('transform', `translate( -5, 0)`)
				.call(yAxis)

		// show random initial data point
		debugger
		const countries = document.getElementsByClassName('country-circle');
        const randomCountry = countries[Math.floor(Math.random() * countries.length)];
        const mouseenterEvent = new Event('mouseenter');
        randomCountry.dispatchEvent(mouseenterEvent);
	}
}