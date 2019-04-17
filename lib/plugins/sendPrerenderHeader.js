module.exports = {
	tabCreated: (req, res, next) => {

		req.prerender.tab.Network.setExtraHTTPHeaders({
			headers: {
				'X-Prerender': '1',
				'isBot': 'true'
			}
		});

		next();
	}
}