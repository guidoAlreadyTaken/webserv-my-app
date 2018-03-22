var express = require('express');
var router = express.Router();
var debug = require('debug')('my-app:server');
var config = require('../config');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var User = require('../models/user');
var Issue = require('../models/issue');
var utils = require('./utils');



/* POST new user */
// TEST OK
router.post('/', utils.requireJson, function(req, res, next) {
	//res.send(req.savedUser);
  new User(req.body).save(function(err, savedUser) {
    if (err) {
      return next(err);
    }

    debug(`Created user "${savedUser.username}"`);

    res
      .status(201)
      .set('Location', `${config.baseUrl}/users/${savedUser._id}`)
      .send(savedUser);
  });

});


/* GET all users or specific user. */
// TEST OK
router.get('/', function(req, res, next) {
  //res.send(req.user);
  const countQuery = queryUser(req);
  countQuery.count(function(err, total) {
    if (err) {
      return next(err);
    }

    let query = queryUser(req);

    query = utils.paginate('/users', query, total, req, res);

    query.sort('lastname').exec(function(err, user) {
      if (err) {
        return next(err);
      }

      
      countIssuesCreatedBy(user, function(err, results) {
        if (err) {
          return next(err);
        }

        res.send(serializeUser(user, results));
      });
      
    });
  });
});

// Give a specific user
// TEST OK
router.get('/:id', loadUserFromParamsMiddleware, function(req, res, next) {
  countIssuesCreatedBy([ req.user ], function(err, results) {
    if (err) {
      return next(err);
    }

    res.send(serializeUser([ req.user ], results)[0]);
  });

});



/* Update partially a specific user */
// TEST OK
router.patch('/:id',utils.requireJson, loadUserFromParamsMiddleware, function(req, res, next) {
	//res.send(req.userUpdated);
  // Update properties present in the request body
  if (req.body.username !== undefined) {
    req.user.username = req.body.username;
  }
  if (req.body.lastname !== undefined) {
    req.user.lastname = req.body.lastname;
  }
  if (req.body.firstname !== undefined) {
    req.user.firstname = req.body.firstname;
  }
  if (req.body.honorific !== undefined) {
    req.user.honorific = req.body.honorific;
  }
  if (req.body.age !== undefined) {
    req.user.age = req.body.age;
  }
  if (req.body.address !== undefined) {
    if (req.body.address.road !== undefined) {
      req.user.address.road = req.body.address.road;
    }
  }
  if (req.body.address !== undefined) {
    if (req.body.address.number !== undefined) {
      req.user.address.number = req.body.address.number;
    }
  }
  if (req.body.address !== undefined) {
    if (req.body.address.city !== undefined) {
      req.user.address.city = req.body.address.city;
    }
  }


  req.user.save(function(err, savedUser) {
    if (err) {
      return next(err);
    }

    debug(`Updated user "${savedUser.username}"`);
    res.send(savedUser);
  });
});

// modify a user
// TEST OK
router.put('/:id', utils.requireJson, loadUserFromParamsMiddleware, function(req, res, next) {

  // Update all properties (regardless of whether they are in the request body or not)
  req.user.username = req.body.username;
  req.user.lastname = req.body.lastname;
  req.user.firstname = req.body.firstname;
  req.user.honorific = req.body.honorific;
  req.user.age = req.body.age;
  req.user.address.road = req.body.address.road;
  req.user.address.number = req.body.address.number;
  req.user.address.city = req.body.address.city;

  req.user.save(function(err, savedUser) {
    if (err) {
      return next(err);
    }

    debug(`Updated user "${savedUser.username}"`);
    res.send(savedUser);
  });
});

/* DELETE a user */ 
// TEST OK
router.delete('/:id', loadUserFromParamsMiddleware, function(req, res, next) {
	//res.send(req.userDeleted);
  // Check if a issue exists before deleting
  Issue.findOne({ creator: req.user._id }).exec(function(err, issue) {
    if (err) {
      return next(err);
    } else if (issue) {
      // Do not delete if any issue is created by this user
      return res.status(409).type('text').send(`Cannot delete user ${req.user.username} because issues are linked to him`)
    }

    req.user.remove(function(err) {
      if (err) {
        return next(err);
      }

      debug(`Deleted user "${req.user.username}"`);
      res.sendStatus(204);
    });
  });
});


// FONCTIONS

/**
 * Returns a Mongoose query that will retrieve people filtered with the URL query parameters.
 */
function queryUser(req) {

  let query = User.find();

  if (typeof(req.query.honorific) == 'string') {
    query = query.where('honorific').equals(req.query.honorific);
  }

  return query;
}

/**
 * Middleware that loads the user corresponding to the ID in the URL path.
 * Responds with 404 Not Found if the ID is not valid or the user doesn't exist.
 */
function loadUserFromParamsMiddleware(req, res, next) {
  const userId = req.params.id;
  if (!ObjectId.isValid(userId)) {
    return userNotFound(res, userId);
  }

  User.findById(req.params.id, function(err, user) {
    if (err) {
      return next(err);
    } else if (!user) {
      return userNotFound(res, userId);
    }

    req.user = user;
    next();
  });
}

/**
 * Responds with 404 Not Found and a message indicating that the user with the specified ID was not found.
 */
function userNotFound(res, userId) {
  return res.status(404).type('text').send(`No user found with ID ${userId}`);
}

function countIssuesCreatedBy(user, callback) {

  // Do not perform the aggregation query if there are no user to retrieve issues for
  if (user.length <= 0) {
    return callback(undefined, []);
  }

  // Aggregate issueses count by creator (i.e. user ID)
  Issue.aggregate([
    {
      $match: { // Select only issues created by the user we are interested in
        creator: {
          $in: user.map(user => user._id)
        }
      }
    },
    {
      $group: { // Count issues by creator
        _id: '$creator',
        IssuesCount: {
          $sum: 1
        }
      }
    }
  ], callback);
}

/**
 * Serializes an array of user to JSON and adds to each user object the
 * aggregated number of issues they created (returned by `countIssuesCreatedBy`).
 */

function serializeUser(user, issueCountsAggregation = []) {

  const userJson = user.map(user => user.toJSON());

  issueCountsAggregation.forEach(function(aggregationResult) {
    var user = userJson.find(user => user.id == aggregationResult._id.toString());
    user.createdIssuesCount = aggregationResult.issuesCount;
  });

  return userJson;
}


module.exports = router;

/*
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
*/

/*
function loadUserFromQuery(req, res, next) {
	// query de base trouve tout le monde
	var query = User.find();

	// filtre sur les query de l'URL
	// si pas de query specific sort tous les users
	if (Object.keys(req.query).length === 0) { // sort que les user sans username
		query = query.sort('lastname');
	// si y'a une query sur le username sortir le user spécifique
	} if (req.query.username !=={}) {
		query = query.where('username').equals(req.query.username);
	// si y'a une query sur l'ID sortir le user via l'id --- MARCHE PAS
	} if (req.query.id !=={}) {
		query = query.where('_id').equals(req.query.id);
	} else if (req.query.username === {}) { //sort pas le msg d'erreur
		return res.send('Please enter a username to search a user!');
	}

	query.exec(function(err, user) {
		if (err) {
			return next(err);
		} else if (!user) {
			return res.status(404).send('No user found with name '+ query);
		}
		req.user = user;
		next();
	});

}


// marche pas rien s'update
function updateUserFromQuery(req, res, next) {
	var query = User.update();

	if (req.query.id !=={}) {
		query = query.where('_id').equals(req.query.id);

	}else {
		return res.status(404).send("User ID invalid");
	}

	query.exec(function(err, userUpdated) {
		if (err) {
			return res.status(500).send(err);
		} 
		req.userUpdated = userUpdated;
		next();
	});

}

function deleteUserFromQuery(req, res, next) {
	var query = User.remove();

	if (req.query.id !=={}) {
		query = query.where('_id').equals(req.query.id);
	} else {
		return res.send('No user with that ID');
	}

	query.exec(function(err, deletedUser) {
		if (err) {
			return res.status(500).send(err);
		}
		req.userDeleted = console.log('User deleted!');
		next();
	});
}
*/


