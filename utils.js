// eslint-disable-next-line no-unused-vars
const utils = {
	escape(unsafe){
		if(!unsafe)
			return unsafe;

		return unsafe
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	},

	formatLength(length){
		const totalSeconds = length / 1000;

		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor(totalSeconds / 60 % 3600);
		const seconds = Math.floor(totalSeconds % 60);

		let result = "";
		if(hours > 0)
			result += hours + ":";
		if(minutes > 0)
			result += minutes.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false }) + ":";

		result += seconds.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false });

		return result;
	},
};