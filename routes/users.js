var express = require('express');
var router = express.Router();
const User = require('../models/user');

/* GET users listing. */
router.get('/', loadUserList, function(req, res, next) {
  res.send(usersList);
});


/* POST new user */
router.post('/', createNewUser, function(req, res, next) {
	res.send(savedUser);
});

/* GET specific user */
router.get('/:username', loadUserFromParams, function(req, res, next) {
	res.send(req.user);
});


// FONCTIONS

function loadUserList(req, res, next) {
	User.find().sort('lastname').exec(function(err, usersList) {
  	if (err) {
  		return next(err);
  	}

  	req.usersList = usersList;
  	next();
  });
}

function createNewUser(req, res, next) {
	// Create a new document from the JSON in request body
	const newUser = new User(req.body);

	// Sauver dans la BD le new document
	newUser.save(function(err, savedUser) {
		if (err) {
			return next(err);
		}

		// Envoi du document sauver
		req.savedUser = savedUser;
		next();
	});
}

function loadUserFromParams(req, res, next) {
	User.findOne(req.params.username).exec(function(err, user) {
		if (err) {
			return next(err);
		} else if (!user) {
			return res.status(404).send('No user found with name '+ req.params.lastname);
		}

		req.user = user;
		next();
	});

}




module.exports = router;
