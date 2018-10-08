'use strict';

var utils = require('../../common/utils.js');
var req = undefined;
var res = undefined;


module.exports = function (request, response) {
	req = request;
	res = response;
	console.log('query',req.query);

	res.send(utils.get_location_ip());

};