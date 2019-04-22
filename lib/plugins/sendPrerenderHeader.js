module.exports = {
	tabCreated: (req, res, next) => {

		let headers = {
			'X-Prerender': '1',
			'isBot': 'true'
		};

		headers = Object.assign(headers, req.headers);

		req.prerender.tab.Network.setExtraHTTPHeaders({
			headers
		});

		next();
	}
};