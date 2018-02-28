var express = require('express');
var router = express.Router();
const User = require('../models/user');

/* GET users listing. */
router.get('/', function(req, res, next) {
  User.find().sort('lastname').exec(function(err, users) {
  	if (err) {
  		return next(err);
  	}

  	res.send(users);
  });
});

/* GET a specific user */
router.get('/:lastname/:firstname', function (req, res, next) {
  User.find('lastname', 'firstname').exec(function(err, user) {
  	if (err) {
  		return next('No user with that name');
  	}
  	res.send(user);
  });
});

/* POST new user */
router.post('/', function(req, res, next) {
	// Create a new document from the JSON in request body
	const newUser = new User(req.body);

	// Sauver dans la BD le new document
	newUser.save(function(err, savedUser) {
		if (err) {
			return next(err);
		}

		// Envoi du document sauver
		res.send(savedUser);
	});
});



module.exports = router;
