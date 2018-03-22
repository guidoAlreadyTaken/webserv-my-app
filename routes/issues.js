var config = require('../config');
var debug = require('debug')('my-app:server');
var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var ObjectId = mongoose.Types.ObjectId;
var User = require('../models/user');
var Issue = require('../models/issue');
var utils = require('./utils');


/* POST new issue */
// TEST OK
router.post('/', utils.requireJson, function(req, res, next) {
  new Issue(req.body).save(function(err, savedIssue) {
    if (err) {
      return next(err);
    }

    debug(`Created Issue "${savedIssue.title}"`);

    res
      .status(201)
      .set('Location', `${config.baseUrl}/issues/${savedIssue._id}`)
      .send(savedIssue);
  });
});


/* GET all issues */
// TEST OK
router.get('/', function(req, res, next) {

  // Count total issues matching the URL query parameters
  const countQuery = queryIssues(req);
  countQuery.count(function(err, total) {
    if (err) {
      return next(err);
    }

    // Prepare the initial database query from the URL query parameters
    let query = queryIssues(req);

    // Paginate
    query = utils.paginate('/issues', query, total, req, res);

    // Populate the creator if indicated in the "include" URL query parameter
    if (utils.responseShouldInclude(req, 'creator')) {
      query = query.populate('creator');
    }

    // Execute the query
    query.sort({ title: 1 }).exec(function(err, issues) {
      if (err) {
        return next(err);
      }

      res.send(issues);
    });
  });
});


/* GET a specific issue */
// TEST OK
router.get('/:id', loadIssueFromParamsMiddleware, function(req, res, next) {
  res.send(req.issue);
});

/* UPDATE partially a specific Issue */
// TEST OK
router.patch('/:id', utils.requireJson, loadIssueFromParamsMiddleware, function(req, res, next) {

  // Update only properties present in the request body
  if (req.body.title !== undefined) {
    req.issue.title = req.body.title;
  }
  if (req.body.updated !== undefined) {
    req.issue.updated = req.body.updated;
  }
  if (req.body.description !== undefined) {
    req.issue.description = req.body.description;
  }
  if (req.body.statement !== undefined) {
    req.issue.statement = req.body.statement;
  }
  if (req.body.importance !== undefined) {
    req.issue.importance = req.body.importance;
  }

  req.issue.save(function(err, savedIssue) {
    if (err) {
      return next(err);
    }

    debug(`Updated issue "${savedIssue.title}"`);
    res.send(savedIssue);
  });
});


/* UPDATE specific Issue */
// TEST OK
router.patch('/:id', utils.requireJson, loadIssueFromParamsMiddleware, function(req, res, next) {

  // Update all properties present in the request body
 
  req.issue.title = req.body.title;
  req.issue.updated = req.body.updated;
  req.issue.description = req.body.description;
  req.issue.statement = req.body.statement;
  req.issue.importance = req.body.importance;

  req.issue.save(function(err, savedIssue) {
    if (err) {
      return next(err);
    }

    debug(`Updated issue "${savedIssue.title}"`);
    res.send(savedIssue);
  });
});

/* DELETE specific Issue */
// TSET OK
router.delete('/:id', loadIssueFromParamsMiddleware, function(req, res, next) {
  req.issue.remove(function(err) {
    if (err) {
      return next(err);
    }

    debug(`Deleted issue "${req.issue.title}"`);
    res.sendStatus(204);
  });
});


// FONCTIONS

/**
 * Returns a Mongoose query that will retrieve issues filtered with the URL query parameters.
 */
function queryIssues(req) {

  let query = Issue.find();

  if (Array.isArray(req.query.creator)) {
    const creators = req.query.creator.filter(ObjectId.isValid);
    query = query.where('creator').in(creators);
  } else if (ObjectId.isValid(req.query.creator)) {
    query = query.where('creator').equals(req.query.creator);
  }

  if (!isNaN(req.query.statement)) {
    query = query.where('statement').equals(req.query.statement);
  }

  if (!isNaN(req.query.stateIsDone)) {
    query = query.where('statement').equals(req.issue.statement = 'Done');
  }

  if (!isNaN(req.query.stateIsToDo)) {
    query = query.where('statement').equals(req.issue.statement = 'to do');
  }

  if (!isNaN(req.query.stateIsInProgress)) {
    query = query.where('statement').equals(req.issue.statement = 'In progress');
  }

  return query;
}

/**
 * Middleware that loads the issue corresponding to the ID in the URL path.
 * Responds with 404 Not Found if the ID is not valid or the issue doesn't exist.
 */
function loadIssueFromParamsMiddleware(req, res, next) {

  const issueId = req.params.id;
  if (!ObjectId.isValid(issueId)) {
    return issueNotFound(res, issueId);
  }

  let query = Issue.findById(issueId)

  // Populate the creator if indicated in the "include" URL query parameter
  if (utils.responseShouldInclude(req, 'creator')) {
    query = query.populate('creator');
  }

  query.exec(function(err, issue) {
    if (err) {
      return next(err);
    } else if (!issue) {
      return issueNotFound(res, issueId);
    }

    req.issue = issue;
    next();
  });
}

/**
 * Responds with 404 Not Found and a message indicating that the issue with the specified ID was not found.
 */
function issueNotFound(res, issueId) {
  return res.status(404).type('text').send(`No issue found with ID ${issueId}`);
}


module.exports = router;