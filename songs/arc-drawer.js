// eslint-disable-next-line no-unused-vars
const arcDrawer = {
	polarToCartesian(centerX, centerY, radius, angleInDegrees){
		const angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;

		return {
			x: centerX + (radius * Math.cos(angleInRadians)),
			y: centerY + (radius * Math.sin(angleInRadians))
		};
	},

	describeArc(x, y, radius, startAngle, endAngle, fill){
		const start = this.polarToCartesian(x, y, radius, endAngle);
		const end = this.polarToCartesian(x, y, radius, startAngle);

		const arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

		let d = [
			"M", start.x, start.y, 
			"A", radius, radius, 0, arcSweep, 0, end.x, end.y
		];

		if(fill){
			d = [...d, 
				"L", x,y,
				"L", start.x, start.y
			];
		}

		return d.join(" ");       
	},
};