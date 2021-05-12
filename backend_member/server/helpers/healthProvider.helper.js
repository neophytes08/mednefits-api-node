const getHealthProviderHolidayPeakLists = async () => {
	let holidays = [
		{
			month:  "jan",
	        day_number:  1,
	        day_week:  "tue",
	        description:  "New Year’s Day"
		},
		{
			month: "feb",
	        day_number: 5,
	        day_week: "tue",
	        description: "Chinese New Year"
		},
		{
			month: "feb",
	        day_number: 6,
	        day_week: "wed",
	        description: "Chinese New Year"
		},
		{
			month: "apr",
	        day_number: 19,
	        day_week: "fri",
	        description: "Labour Day"
		},
		{
			month: "may",
	        day_number: 1,
	        day_week: "wed",
	        description: "Good Friday"
		},
		{
			month: "may",
	        day_number: 19,
	        day_week: "sun",
	        description: "Vesak Day"
		},
		{
			month: "jun",
	        day_number: 5,
	        day_week: "wed",
	        description: "Hari Raya Puasa"
		},
		{
			month: "aug",
	        day_number: 9,
	        day_week: "fri",
	        description: "National Day"
		},
		{
			month: "aug",
	        day_number: 11,
	        day_week: "sun",
	        description: "Hari Raya Haji"
		},
		{
			month: "oct",
	        day_number: 27,
	        day_week: "sun",
	        description: "Deepavali"
		},
		{
			month: "dec",
	        day_number: 25,
	        day_week: "wed",
	        description: "Christmas Day"
		}
	];

	return holidays;
}

module.exports = {
	getHealthProviderHolidayPeakLists
}