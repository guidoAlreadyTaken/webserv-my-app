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
/**
 * @api {post} /users Create a usern
 * @apiName CreateUser
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription Registers a new user.
 *
 * @apiUse UserInRequestBody
 * @apiUse UserInResponseBody
 * @apiUse UserValidationError
 * @apiSuccess (Response body) {String} id A unique identifier for the user generated by the server
 *
 * @apiExample Example
 *     POST /users HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *        "address": {
 *            "road": "Rue du Vent",
 *            "number": 34,
 *            "city": "Lausanne"
 *         },
 *        "lastname": "Doe",
 *        "firstname": "John",
 *        "honorific": "Mr",
 *        "age": 23
 *      }
 *
 * @apiSuccessExample 201 Created
 *     HTTP/1.1 201 Created
 *     Content-Type: application/json
 *     Location: https://evening-meadow-25867.herokuapp.com/api/people/58b2926f5e1def0123e97bc0
 *
 *      {
 *        "address": {
 *            "road": "Rue du Vent",
 *            "number": 34,
 *            "city": "Lausanne"
 *         },
 *        "lastname": "Doe",
 *        "firstname": "John",
 *        "honorific": "Mr",
 *        "age": 23,
 *        "id": "5a968469babc74186ca57389"
 *      }
 */
router.post('/', utils.requireJson, function(req, res, next) {
  // crée le new user depuis request et envoie réponse au client
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


/* GET all users */
// TEST OK
/**
 * @api {get} /users List users
 * @apiName RetrieveUser
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription Retrieves a paginated list of user sorted by name (in alphabetical order).
 *
 * @apiUse UserInResponseBody
 * @apiUse Pagination
 *
 *
 * @apiExample Example
 *     GET /users HTTP/1.1
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: &lt;http://localhost:3000/users
 *
 *     [
 *      {
 *        "address": {
 *            "road": "Rue du Vent",
 *            "number": 34,
 *            "city": "Lausanne"
 *         },
 *        "lastname": "Doe",
 *        "firstname": "John",
 *        "honorific": "Mr",
 *        "age": 23,
 *        "id": "5a968469babc74186ca57389"
 *      }
 *     ]
 */

router.get('/', function(req, res, next) {
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

      countIssuesCreatededBy(user, function(err, results) {
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
/**
 * @api {get} /users/:id Retrieve a user
 * @apiName RetrieveUser
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription Retrieves one user.
 *
 * @apiUse UserIdInUrlPath
 * @apiUse UserInResponseBody
 * @apiUse UserNotFoundError
 *
 * @apiExample Example
 *     GET /users/5a968469babc74186ca57389 HTTP/1.1
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: &lt;http://localhost:3000/users/5a968469babc74186ca57389
 *
 *      {
 *        "address": {
 *            "road": "Rue du Vent",
 *            "number": 34,
 *            "city": "Lausanne"
 *         },
 *        "lastname": "Doe",
 *        "firstname": "John",
 *        "honorific": "Mr",
 *        "age": 23,
 *        "id": "5a968469babc74186ca57389"
 *      }
 */
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
/**
 * @api {patch} /users/:id Partially update a user
 * @apiName PartiallyUpdateuser
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription Partially updates a user's data (only the properties found in the request body will be updated).
 * All properties are optional.
 *
 * @apiUse UserIdInUrlPath
 * @apiUse UserInRequestBody
 * @apiUse UserInResponseBody
 * @apiUse UserNotFoundError
 * @apiUse UserValidationError
 *
 * @apiExample Example
 *     PATCH /users/5a968469babc74186ca57389 HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "lastname": "Merx",
 *       "firstname": "Eddie"
 *     }
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: &lt;http://localhost:3000/users/5a968469babc74186ca57389
 *
 *      {
 *        "address": {
 *            "road": "Rue du Vent",
 *            "number": 34,
 *            "city": "Lausanne"
 *         },
 *        "lastname": "Merx",
 *        "firstname": "Eddie",
 *        "honorific": "Mr",
 *        "age": 23,
 *        "id": "5a968469babc74186ca57389"
 *      }
 */
router.patch('/:id',utils.requireJson, loadUserFromParamsMiddleware, function(req, res, next) {
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
/**
 * @api {put} /usres/:id Update a user
 * @apiName UpdateUser
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription Replaces all the user's data (the request body must represent a full, valid user).
 *
 * @apiUse UserIdInUrlPath
 * @apiUse UserInRequestBody
 * @apiUse UserInResponseBody
 * @apiUse UserNotFoundError
 * @apiUse UserValidationError
 *
 * @apiExample Example
 *     PUT /users/5a968469babc74186ca57389 HTTP/1.1
 *     Content-Type: application/json
 *
 *      {
 *        "address": {
 *            "road": "Ch. du Levant",
 *            "number": 4,
 *            "city": "Aigle"
 *         },
 *        "lastname": "Merxou",
 *        "firstname": "Edditte",
 *        "honorific": "Ms",
 *        "age": 65
 *      }
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *
 *      {
 *        "address": {
 *            "road": "Ch. du Levant",
 *            "number": 4,
 *            "city": "Aigle"
 *         },
 *        "lastname": "Merxou",
 *        "firstname": "Edditte",
 *        "honorific": "Ms",
 *        "age": 65,
 *        "id": "5a968469babc74186ca57389"
 *      }
 */
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
/**
 * @api {delete} /users/:id Delete a user
 * @apiName DeleteUser
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription Permanently deletes a user.
 *
 * @apiUse UserIdInUrlPath
 * @apiUse UserNotFoundError
 *
 * @apiExample Example
 *     DELETE /users/5a968469babc74186ca57389 HTTP/1.1
 *
 * @apiSuccessExample 204 No Content
 *     HTTP/1.1 204 No Content
 */
router.delete('/:id', loadUserFromParamsMiddleware, function(req, res, next) {
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

/**
 * Given an array of user, performs an aggregation to count the issueses created by those user.
 * The callback will receive the result in the following format:
 *
 *     [
 *       {
 *         _id: "PERSON-ID-1",
 *         issuesCount: 12
 *       },
 *       {
 *         _id: "PERSON-ID-2",
 *         issuessCount: 38
 *       }
 *     ]
 */
function countIssuesCreatedBy(user, callback) {

  // Do not perform the aggregation query if there are no user to retrieve issues for
  if (user.length <= 0) {
    return callback(undefined, []);
  }

  // Aggregate issues count by creator (i.e. user ID)
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
        issuesCount: {
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

/**
 * @apiDefine UserIdInUrlPath
 * @apiParam (URL path parameters) {String} id The unique identifier of the user to retrieve
 */

/**
 * @apiDefine UserInRequestBody
 * @apiParam (Request body) {String="Mr","Ms","Mrs","DR"} honorific The title of the user
 */

/**
 * @apiDefine UserInResponseBody
 * @apiSuccess (Response body) {String} id The unique identifier of the user
 * @apiSuccess (Response body) {String} lastname The name of the user
 * @apiSuccess (Response body) {String} firstname The firstname of the user
 * @apiSuccess (Response body) {String} honorific The honorific of the user
 * @apiSuccess (Response body) {String} age The age of the user not the age of his dog, be cairefoule!!! -> made by OSS117jokemaker
 * @apiSuccess (Response body) {String} road The address road of the user
 * @apiSuccess (Response body) {String} city The adrees city of the user
 * @apiSuccess (Response body) {String} number The address number of the user

 */

/**
 * @apiDefine UserNotFoundError
 *
 * @apiError {Object} 404/NotFound No user was found corresponding to the ID in the URL path
 *
 * @apiErrorExample {json} 404 Not Found
 *     HTTP/1.1 404 Not Found
 *     Content-Type: text/plain
 *
 *     No person found with ID 58b2926f5e1daccqaqcef0123e97bc0
 */

/**
 * @apiDefine UserValidationError
 *
 * @apiError {Object} 422/UnprocessableEntity Some of the user's properties are invalid
 *
 * @apiErrorExample {json} 422 Unprocessable Entity
 *     HTTP/1.1 422 Unprocessable Entity
 *     Content-Type: application/json
 *
 *     {
 *       "message": "User validation failed",
 *       "errors": {
 *         "honorific": {
 *           "kind": "enum",
 *           "message": "`foo` is not a valid enum value for path `honorific`.",
 *           "name": "ValidatorError",
 *           "path": "honorific",
 *           "properties": {
 *             "enumValues": [
 *               "Ms",
 *               "Mr",
                 "Ms",
                 "Dr"
 *             ],
 *             "message": "`{VALUE}` is not a valid enum value for path `{PATH}`.",
 *             "path": "honorific",
 *             "type": "enum",
 *             "value": "foo"
 *           },
 *           "value": "foo"
 *         }
 *       }
 *     }
 */


module.exports = router;

