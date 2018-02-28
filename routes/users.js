var express = require('express');
var router = express.Router();
const User = require('../models/user');

/* GET users listing. */
router.get('/userlist', function(req, res, next) {
  User.find().sort('lastname').exec(function(err, users) {
  	if (err) {
  		return next(err);
  	}

  	res.send(users);
  });

});

/* GET a specific user */

router.get('/user', function (req, res, next) {
  var userLastName = req.params.lastname;
  var userFirstName = req.params.firstname;
  // trouver chaque personne avec le nom baer
  var query = User.findOne({'lastname' : 'baer'});

  // selectionne 'nom', 'prénom et 'age'
  query.select('lastname firstname age');

  // execution de la query
  query.execute(function (err, person) {
  	if (err) {
  		return next(err);
  	}
  	res.send(User.lastname, User.firstname, User.age);
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
